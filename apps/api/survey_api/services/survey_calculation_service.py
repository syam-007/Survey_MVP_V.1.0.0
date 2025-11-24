"""
Survey Calculation Orchestration Service

Coordinates the full calculation workflow:
1. Retrieve survey data and run context (location, depth, tie-on)
2. Call welleng service to perform calculations
3. Store results in CalculatedSurvey model
4. Update calculation status and handle errors
"""
import time
import logging
from typing import Dict, Optional
from django.db import transaction

from survey_api.models import SurveyData, CalculatedSurvey, SurveyFile
from survey_api.services.welleng_service import WellengService
from survey_api.exceptions import WellengCalculationError, InsufficientDataError

logger = logging.getLogger(__name__)


class SurveyCalculationService:
    """Orchestrates survey trajectory calculations using welleng."""

    @staticmethod
    def calculate(survey_data_id: str) -> CalculatedSurvey:
        """
        Calculate survey trajectory for given survey data.

        Workflow:
        1. Retrieve SurveyData with related run context (location, depth, tie-on)
        2. Extract calculation context
        3. Update processing status to 'processing'
        4. Call WellengService to perform calculation
        5. Create CalculatedSurvey record with results
        6. Update status to 'calculated' on success or 'error' on failure

        Args:
            survey_data_id: UUID of SurveyData record

        Returns:
            CalculatedSurvey instance with results

        Raises:
            SurveyData.DoesNotExist: If survey data not found
            InsufficientDataError: If required context data missing
            WellengCalculationError: If calculation fails

        Performance:
            Uses select_related to avoid N+1 queries.
            Target: < 3 seconds for 10,000 points.

        Decision:
            DECISION: Using synchronous processing for Epic 4
            Benchmark shows < 3 seconds for 10,000 points
            If performance degrades, consider Celery in future epic
        """
        try:
            logger.info(f"Starting calculation for SurveyData: {survey_data_id}")

            # Retrieve SurveyData with all related context using select_related
            survey_data = SurveyData.objects.select_related(
                'survey_file__run__location',
                'survey_file__run__depth',
                'survey_file__run__tieon',
                'survey_file__run'
            ).get(id=survey_data_id)

            logger.debug(f"Retrieved SurveyData for Run: {survey_data.survey_file.run.run_number}")

            # Extract calculation context from run's related models
            context = SurveyCalculationService._get_calculation_context(survey_data)

            # Update SurveyFile processing_status to 'processing'
            survey_file = survey_data.survey_file
            survey_file.processing_status = 'processing'
            survey_file.save(update_fields=['processing_status'])

            logger.info("Processing status updated to 'processing'")

            # Start timing calculation
            start_time = time.time()

            # Implement BHC (Bottom Hole Convergence) iterative calculation
            bhc_enabled = context.get('bhc_enabled', False)
            proposal_direction = context.get('proposal_direction')
            updated_proposal_direction = None  # Track updated value for BHC

            if bhc_enabled:
                logger.info("BHC enabled - performing iterative calculation")

                # Initial calculation with proposal_direction = 0
                initial_proposal_direction = 0.0
                logger.info(f"BHC Step 1: Initial calculation with proposal_direction = {initial_proposal_direction}°")

                result = WellengService.calculate_survey(
                    md=survey_data.md_data,
                    inc=survey_data.inc_data,
                    azi=survey_data.azi_data,
                    tie_on_data=context['tieon'],
                    location_data=context['location'],
                    survey_type=context['survey_type'],
                    vertical_section_azimuth=initial_proposal_direction
                )

                # Get closure direction from last row
                closure_direction_last = result['closure_direction'][-1]
                logger.info(f"BHC Step 2: Closure direction from last point = {closure_direction_last:.6f}°")

                # Recalculate with proposal_direction = closure_direction
                logger.info(f"BHC Step 3: Recalculating with proposal_direction = {closure_direction_last:.6f}°")

                result = WellengService.calculate_survey(
                    md=survey_data.md_data,
                    inc=survey_data.inc_data,
                    azi=survey_data.azi_data,
                    tie_on_data=context['tieon'],
                    location_data=context['location'],
                    survey_type=context['survey_type'],
                    vertical_section_azimuth=closure_direction_last
                )

                # Store the updated proposal direction for BHC
                updated_proposal_direction = closure_direction_last
                logger.info(f"BHC calculation completed - converged to {closure_direction_last:.6f}°")

                print(f"\n{'='*80}")
                print(f"[BHC CALCULATION] Converged closure direction: {closure_direction_last:.6f}°")
                print(f"[BHC CALCULATION] This will be stored as vertical_section_azimuth in CalculatedSurvey")
                print(f"[BHC CALCULATION] Result vertical_section_azimuth: {result.get('vertical_section_azimuth')}°")
                print(f"{'='*80}\n")
            else:
                # Normal calculation (non-BHC)
                # Call WellengService to perform calculation
                result = WellengService.calculate_survey(
                    md=survey_data.md_data,
                    inc=survey_data.inc_data,
                    azi=survey_data.azi_data,
                    tie_on_data=context['tieon'],
                    location_data=context['location'],
                    survey_type=context['survey_type'],
                    vertical_section_azimuth=proposal_direction
                )

            # Calculate duration
            calculation_duration = time.time() - start_time

            logger.info(f"Calculation completed in {calculation_duration:.3f} seconds")

            # DIAGNOSTIC: Log what we received from welleng
            logger.info(f"[CALC RECEIVED] Received result from welleng with:")
            logger.info(f"[CALC RECEIVED]   Northing length: {len(result['northing'])}")
            logger.info(f"[CALC RECEIVED]   Easting length: {len(result['easting'])}")
            logger.info(f"[CALC RECEIVED]   TVD length: {len(result['tvd'])}")
            logger.info(f"[CALC RECEIVED]   Last 3 Northing values: {result['northing'][-3:]}")
            logger.info(f"[CALC RECEIVED]   Last 3 Easting values: {result['easting'][-3:]}")
            logger.info(f"[CALC RECEIVED]   Last 3 TVD values: {result['tvd'][-3:]}")

            # FORCE OUTPUT: Using print() to ensure visibility
            print("\n" + "="*80)
            print("[CALC RECEIVED] Received result from welleng with:")
            print(f"[CALC RECEIVED]   Northing length: {len(result['northing'])}")
            print(f"[CALC RECEIVED]   Easting length: {len(result['easting'])}")
            print(f"[CALC RECEIVED]   TVD length: {len(result['tvd'])}")
            print(f"[CALC RECEIVED]   Last 3 Northing values: {result['northing'][-3:]}")
            print(f"[CALC RECEIVED]   Last 3 Easting values: {result['easting'][-3:]}")
            print(f"[CALC RECEIVED]   Last 3 TVD values: {result['tvd'][-3:]}")
            print("="*80 + "\n")

            # Create CalculatedSurvey record with results
            with transaction.atomic():
                logger.info(f"[CALC SAVE] About to save to CalculatedSurvey:")
                logger.info(f"[CALC SAVE]   Northing length: {len(result['northing'])}")
                logger.info(f"[CALC SAVE]   Easting length: {len(result['easting'])}")
                logger.info(f"[CALC SAVE]   TVD length: {len(result['tvd'])}")

                print("\n" + "="*80)
                print("[CALC SAVE] About to save to CalculatedSurvey:")
                print(f"[CALC SAVE]   Northing length: {len(result['northing'])}")
                print(f"[CALC SAVE]   Easting length: {len(result['easting'])}")
                print(f"[CALC SAVE]   TVD length: {len(result['tvd'])}")
                print("="*80 + "\n")

                calculated_survey = CalculatedSurvey.objects.create(
                    survey_data=survey_data,
                    easting=result['easting'],
                    northing=result['northing'],
                    tvd=result['tvd'],
                    dls=result['dls'],
                    build_rate=result['build_rate'],
                    turn_rate=result['turn_rate'],
                    vertical_section=result.get('vertical_section'),
                    closure_distance=result.get('closure_distance'),
                    closure_direction=result.get('closure_direction'),
                    vertical_section_azimuth=result.get('vertical_section_azimuth'),
                    calculation_status='calculated',
                    calculation_duration=round(calculation_duration, 3),
                    calculation_context=context,
                    error_message=None
                )

                logger.info(f"[CALC SAVED] After saving to database:")
                logger.info(f"[CALC SAVED]   Northing length: {len(calculated_survey.northing)}")
                logger.info(f"[CALC SAVED]   Easting length: {len(calculated_survey.easting)}")
                logger.info(f"[CALC SAVED]   TVD length: {len(calculated_survey.tvd)}")

                # Log the vertical_section_azimuth that was saved (important for BHC)
                print(f"\n{'='*80}")
                print(f"[CALC SAVED] CalculatedSurvey created with ID: {calculated_survey.id}")
                print(f"[CALC SAVED] Stored vertical_section_azimuth: {calculated_survey.vertical_section_azimuth}°")
                print(f"[CALC SAVED] BHC enabled: {context.get('bhc_enabled', False)}")
                if context.get('bhc_enabled'):
                    print(f"[CALC SAVED] This azimuth is the BHC converged closure direction")
                print(f"{'='*80}\n")
                logger.info(f"[CALC SAVED]   Last 3 Northing values: {calculated_survey.northing[-3:]}")
                logger.info(f"[CALC SAVED]   Last 3 Easting values: {calculated_survey.easting[-3:]}")
                logger.info(f"[CALC SAVED]   Last 3 TVD values: {calculated_survey.tvd[-3:]}")

                print("\n" + "="*80)
                print("[CALC SAVED] After saving to database:")
                print(f"[CALC SAVED]   Northing length: {len(calculated_survey.northing)}")
                print(f"[CALC SAVED]   Easting length: {len(calculated_survey.easting)}")
                print(f"[CALC SAVED]   TVD length: {len(calculated_survey.tvd)}")
                print(f"[CALC SAVED]   Last 3 Northing values: {calculated_survey.northing[-3:]}")
                print(f"[CALC SAVED]   Last 3 Easting values: {calculated_survey.easting[-3:]}")
                print(f"[CALC SAVED]   Last 3 TVD values: {calculated_survey.tvd[-3:]}")
                print("="*80 + "\n")

                # Update SurveyFile processing_status to 'completed'
                survey_file.processing_status = 'completed'
                survey_file.save(update_fields=['processing_status'])

                # If BHC was enabled, update Run's proposal_direction with the converged value
                if bhc_enabled and updated_proposal_direction is not None:
                    run = survey_data.survey_file.run
                    run.proposal_direction = updated_proposal_direction
                    run.save(update_fields=['proposal_direction'])
                    logger.info(f"Updated Run {run.run_number} proposal_direction to {updated_proposal_direction:.6f}° (BHC result)")

            logger.info(f"CalculatedSurvey created: {calculated_survey.id}")

            # NOTE: Automatic interpolation has been disabled
            # Interpolation is now calculated on-demand when user requests it
            # User must explicitly save interpolation to database via "Save to Database" button
            # This ensures interpolation always starts from tie-on point with latest logic

            return calculated_survey

        except SurveyData.DoesNotExist:
            logger.error(f"SurveyData not found: {survey_data_id}")
            raise

        except InsufficientDataError as e:
            logger.error(f"Insufficient data for calculation: {str(e)}")

            # Create CalculatedSurvey with error status
            calculated_survey = CalculatedSurvey.objects.create(
                survey_data=survey_data,
                easting=[],
                northing=[],
                tvd=[],
                dls=[],
                build_rate=[],
                turn_rate=[],
                vertical_section=[],
                closure_distance=[],
                closure_direction=[],
                vertical_section_azimuth=None,
                calculation_status='error',
                calculation_duration=None,
                calculation_context=context if 'context' in locals() else {},
                error_message=str(e)
            )

            # Update SurveyFile to 'failed'
            survey_file.processing_status = 'failed'
            survey_file.save(update_fields=['processing_status'])

            logger.warning(f"Calculation failed with InsufficientDataError: {calculated_survey.id}")
            return calculated_survey

        except WellengCalculationError as e:
            logger.error(f"Welleng calculation error: {str(e)}")

            # Create CalculatedSurvey with error status
            calculated_survey = CalculatedSurvey.objects.create(
                survey_data=survey_data,
                easting=[],
                northing=[],
                tvd=[],
                dls=[],
                build_rate=[],
                turn_rate=[],
                vertical_section=[],
                closure_distance=[],
                closure_direction=[],
                vertical_section_azimuth=None,
                calculation_status='error',
                calculation_duration=None,
                calculation_context=context if 'context' in locals() else {},
                error_message=str(e)
            )

            # Update SurveyFile to 'failed'
            survey_file.processing_status = 'failed'
            survey_file.save(update_fields=['processing_status'])

            logger.warning(f"Calculation failed with WellengCalculationError: {calculated_survey.id}")
            return calculated_survey

        except Exception as e:
            logger.error(f"Unexpected error in calculation: {type(e).__name__}: {str(e)}")

            # Try to create error record if possible
            try:
                calculated_survey = CalculatedSurvey.objects.create(
                    survey_data=survey_data,
                    easting=[],
                    northing=[],
                    tvd=[],
                    dls=[],
                    build_rate=[],
                    turn_rate=[],
                    vertical_section=[],
                    closure_distance=[],
                    closure_direction=[],
                    vertical_section_azimuth=None,
                    calculation_status='error',
                    calculation_duration=None,
                    calculation_context=context if 'context' in locals() else {},
                    error_message=f"Unexpected error: {str(e)}"
                )

                survey_file.processing_status = 'failed'
                survey_file.save(update_fields=['processing_status'])

                return calculated_survey
            except:
                # If we can't even create error record, re-raise original exception
                raise

    @staticmethod
    def _get_calculation_context(survey_data: SurveyData) -> Dict:
        """
        Extract all context needed for welleng calculation from Epic 3 models.

        Args:
            survey_data: SurveyData instance with select_related run context

        Returns:
            Dictionary containing:
                - location: dict with latitude, longitude, easting, northing, geodetic_system, etc.
                - tieon: dict with md, inc, azi, tvd, northing, easting
                - depth: dict with elevation_reference, reference_datum, reference_height, reference_elevation
                - survey_type: str

        Raises:
            InsufficientDataError: If required context data is missing
        """
        run = survey_data.survey_file.run

        # Extract location data (use defaults if not provided)
        has_location = hasattr(run, 'location') and run.location is not None
        if has_location:
            location_data = {
                'latitude': float(run.location.latitude) if run.location.latitude else 0.0,
                'longitude': float(run.location.longitude) if run.location.longitude else 0.0,
                'easting': float(run.location.easting) if run.location.easting else 0.0,
                'northing': float(run.location.northing) if run.location.northing else 0.0,
                'geodetic_system': run.location.geodetic_system or 'WGS84',
                'map_zone': run.location.map_zone or '',
                'north_reference': run.location.north_reference or 'True North',
            }
            logger.debug("Using provided location data")
        else:
            location_data = {
                'latitude': 0.0,
                'longitude': 0.0,
                'easting': 0.0,
                'northing': 0.0,
                'geodetic_system': 'WGS84',
                'map_zone': '',
                'north_reference': 'True North',
            }
            logger.warning("No location data found - using default values (0, 0)")

        # Extract tie-on data (REQUIRED - do not use defaults)
        # Note: TieOn model fields are named 'latitude' and 'departure' but represent Northing and Easting
        has_tieon = hasattr(run, 'tieon') and run.tieon is not None
        if has_tieon:
            tieon_data = {
                'md': float(run.tieon.md) if run.tieon.md else 0.0,
                'inc': float(run.tieon.inc) if run.tieon.inc else 0.0,
                'azi': float(run.tieon.azi) if run.tieon.azi else 0.0,
                'tvd': float(run.tieon.tvd) if run.tieon.tvd else 0.0,
                'northing': float(run.tieon.latitude) if run.tieon.latitude else 0.0,  # Field named 'latitude' is Northing
                'easting': float(run.tieon.departure) if run.tieon.departure else 0.0,  # Field named 'departure' is Easting
            }
            logger.debug("Using provided tie-on data")
        else:
            # CRITICAL: Tie-on data is REQUIRED for calculations
            # Do not proceed with default values as this will produce incorrect results
            error_msg = (
                f"Tie-on data is required for Run {run.run_number}. "
                "Please create tie-on information before uploading survey files."
            )
            logger.error(error_msg)
            raise InsufficientDataError(error_msg)

        # Extract depth data (use defaults if not provided)
        has_depth = hasattr(run, 'depth') and run.depth is not None
        if has_depth:
            depth_data = {
                'elevation_reference': run.depth.elevation_reference or 'KB',
                'reference_datum': run.depth.reference_datum or 'WGS84',
                'reference_height': float(run.depth.reference_height) if run.depth.reference_height else 0.0,
                'reference_elevation': float(run.depth.reference_elevation) if run.depth.reference_elevation else 0.0,
            }
            logger.debug("Using provided depth data")
        else:
            depth_data = {
                'elevation_reference': 'KB',
                'reference_datum': 'WGS84',
                'reference_height': 0.0,
                'reference_elevation': 0.0,
            }
            logger.warning("No depth data found - using default values (KB, 0.0)")

        # Get survey type
        survey_type = survey_data.survey_file.survey_type

        logger.debug(f"Extracted calculation context for {survey_type} survey")

        # Get BHC and proposal direction from run
        bhc_enabled = run.bhc_enabled if hasattr(run, 'bhc_enabled') else False
        proposal_direction = float(run.proposal_direction) if hasattr(run, 'proposal_direction') and run.proposal_direction is not None else None

        return {
            'location': location_data,
            'tieon': tieon_data,
            'depth': depth_data,
            'survey_type': survey_type,
            'bhc_enabled': bhc_enabled,
            'proposal_direction': proposal_direction,
        }
