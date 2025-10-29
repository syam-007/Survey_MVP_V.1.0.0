"""
Service for interpolating calculated survey data.

This service orchestrates the interpolation workflow, managing
InterpolatedSurvey records and coordinating with WellengService.
"""
import time
import logging
from typing import Optional
from django.db import IntegrityError

from survey_api.models import CalculatedSurvey, InterpolatedSurvey
from survey_api.services.welleng_service import WellengService
from survey_api.exceptions import InsufficientDataError, WellengCalculationError

logger = logging.getLogger(__name__)


class InterpolationService:
    """Service for interpolating survey trajectories at various resolutions."""

    DEFAULT_RESOLUTION = 5  # meters

    @staticmethod
    def interpolate(
        calculated_survey_id: str,
        resolution: int = DEFAULT_RESOLUTION,
        start_md: Optional[float] = None,
        end_md: Optional[float] = None
    ) -> InterpolatedSurvey:
        """
        Interpolate calculated survey at specified resolution.

        Args:
            calculated_survey_id: UUID of CalculatedSurvey
            resolution: Interpolation step size (1-100 meters)
            start_md: Optional start MD for custom range
            end_md: Optional end MD for custom range

        Returns:
            InterpolatedSurvey instance (existing or newly created)

        Raises:
            InsufficientDataError: If CalculatedSurvey not found
            WellengCalculationError: If interpolation fails
        """
        try:
            logger.info(f"Starting interpolation for CalculatedSurvey {calculated_survey_id} at resolution={resolution}m")

            # Get calculated survey with related data
            calc_survey = CalculatedSurvey.objects.select_related('survey_data').get(
                id=calculated_survey_id
            )

            # Validate calculated survey is in completed state
            if calc_survey.calculation_status != 'calculated':
                raise InsufficientDataError(
                    f"Cannot interpolate: CalculatedSurvey status is '{calc_survey.calculation_status}', expected 'calculated'"
                )

            # Check if interpolation already exists for this resolution
            existing = InterpolatedSurvey.objects.filter(
                calculated_survey=calc_survey,
                resolution=resolution
            ).first()

            if existing:
                logger.info(f"Returning existing interpolation (id={existing.id}) for resolution {resolution}m")
                return existing

            # Prepare data for welleng interpolation
            survey_data = calc_survey.survey_data
            calculated_data = {
                'md': survey_data.md_data,
                'inc': survey_data.inc_data,
                'azi': survey_data.azi_data,
                'easting': calc_survey.easting,
                'northing': calc_survey.northing,
                'tvd': calc_survey.tvd,
            }

            logger.debug(f"Prepared data: {len(survey_data.md_data)} original points")

            # Measure interpolation time
            start_time = time.time()

            try:
                # Call welleng interpolation
                result = WellengService.interpolate_survey(
                    calculated_data,
                    resolution,
                    start_md=start_md,
                    end_md=end_md
                )

                duration = time.time() - start_time

                # Create InterpolatedSurvey record
                interp_survey = InterpolatedSurvey.objects.create(
                    calculated_survey=calc_survey,
                    resolution=resolution,
                    md_interpolated=result['md'],
                    inc_interpolated=result['inc'],
                    azi_interpolated=result['azi'],
                    easting_interpolated=result['easting'],
                    northing_interpolated=result['northing'],
                    tvd_interpolated=result['tvd'],
                    dls_interpolated=result['dls'],
                    vertical_section_interpolated=result.get('vertical_section', []),
                    closure_distance_interpolated=result.get('closure_distance', []),
                    closure_direction_interpolated=result.get('closure_direction', []),
                    point_count=result['point_count'],
                    interpolation_status='completed',
                    interpolation_duration=round(duration, 3)
                )

                logger.info(
                    f"Interpolation completed successfully: "
                    f"{interp_survey.point_count} points in {duration:.3f}s "
                    f"(id={interp_survey.id})"
                )

                return interp_survey

            except WellengCalculationError as e:
                # Interpolation failed - create error record
                duration = time.time() - start_time

                error_survey = InterpolatedSurvey.objects.create(
                    calculated_survey=calc_survey,
                    resolution=resolution,
                    md_interpolated=[],
                    inc_interpolated=[],
                    azi_interpolated=[],
                    easting_interpolated=[],
                    northing_interpolated=[],
                    tvd_interpolated=[],
                    dls_interpolated=[],
                    point_count=0,
                    interpolation_status='error',
                    interpolation_duration=round(duration, 3),
                    error_message=str(e)
                )

                logger.error(f"Interpolation failed: {str(e)}")
                raise

        except CalculatedSurvey.DoesNotExist:
            logger.error(f"CalculatedSurvey not found: {calculated_survey_id}")
            raise InsufficientDataError(
                f"CalculatedSurvey with id {calculated_survey_id} not found"
            )

        except IntegrityError as e:
            # Handle race condition where another process created the interpolation
            logger.warning(f"IntegrityError during interpolation creation: {str(e)}")
            existing = InterpolatedSurvey.objects.filter(
                calculated_survey=calc_survey,
                resolution=resolution
            ).first()
            if existing:
                logger.info(f"Returning existing interpolation created by another process")
                return existing
            else:
                raise

        except Exception as e:
            logger.error(f"Unexpected error in interpolation service: {type(e).__name__}: {str(e)}")
            raise

    @staticmethod
    def calculate_interpolation_data(
        calculated_survey_id: str,
        resolution: int = DEFAULT_RESOLUTION,
        start_md: Optional[float] = None,
        end_md: Optional[float] = None
    ) -> dict:
        """
        Calculate interpolation data without saving to database.

        This is used for on-demand calculation where user wants to preview
        results before explicitly saving to database.

        Args:
            calculated_survey_id: UUID of CalculatedSurvey
            resolution: Interpolation step size (1-100 meters)
            start_md: Optional start MD for custom range
            end_md: Optional end MD for custom range

        Returns:
            Dictionary with interpolation results

        Raises:
            InsufficientDataError: If CalculatedSurvey not found
            WellengCalculationError: If interpolation fails
        """
        try:
            logger.info(f"Calculating interpolation data (not saving) for CalculatedSurvey {calculated_survey_id} at resolution={resolution}m")

            # Get calculated survey with related data
            calc_survey = CalculatedSurvey.objects.select_related('survey_data').get(
                id=calculated_survey_id
            )

            # Validate calculated survey is in completed state
            if calc_survey.calculation_status != 'calculated':
                raise InsufficientDataError(
                    f"Cannot interpolate: CalculatedSurvey status is '{calc_survey.calculation_status}', expected 'calculated'"
                )

            # Prepare data for welleng interpolation
            survey_data = calc_survey.survey_data
            calculated_data = {
                'md': survey_data.md_data,
                'inc': survey_data.inc_data,
                'azi': survey_data.azi_data,
                'easting': calc_survey.easting,
                'northing': calc_survey.northing,
                'tvd': calc_survey.tvd,
            }

            logger.debug(f"Prepared data: {len(survey_data.md_data)} original points")

            # Measure interpolation time
            start_time = time.time()

            # Call welleng interpolation
            result = WellengService.interpolate_survey(
                calculated_data,
                resolution,
                start_md=start_md,
                end_md=end_md
            )

            duration = time.time() - start_time

            # Add metadata to result
            result['resolution'] = resolution
            result['interpolation_duration'] = round(duration, 3)
            result['calculated_survey_id'] = str(calculated_survey_id)
            result['is_saved'] = False  # Flag to indicate this is not saved

            logger.info(
                f"Interpolation calculated (not saved): "
                f"{result['point_count']} points in {duration:.3f}s"
            )

            return result

        except CalculatedSurvey.DoesNotExist:
            logger.error(f"CalculatedSurvey not found: {calculated_survey_id}")
            raise InsufficientDataError(
                f"CalculatedSurvey with id {calculated_survey_id} not found"
            )
        except Exception as e:
            logger.error(f"Unexpected error calculating interpolation: {type(e).__name__}: {str(e)}")
            raise

    @staticmethod
    def get_interpolation(
        calculated_survey_id: str,
        resolution: Optional[int] = None
    ) -> Optional[InterpolatedSurvey]:
        """
        Retrieve existing interpolation for a calculated survey.

        Args:
            calculated_survey_id: UUID of CalculatedSurvey
            resolution: Specific resolution to retrieve (optional)

        Returns:
            InterpolatedSurvey instance or None if not found
        """
        try:
            query = InterpolatedSurvey.objects.filter(
                calculated_survey_id=calculated_survey_id
            )

            if resolution is not None:
                query = query.filter(resolution=resolution)
            else:
                # Return default resolution (5m) if it exists
                query = query.filter(resolution=InterpolationService.DEFAULT_RESOLUTION)

            return query.first()

        except Exception as e:
            logger.error(f"Error retrieving interpolation: {type(e).__name__}: {str(e)}")
            return None

    @staticmethod
    def list_interpolations(calculated_survey_id: str):
        """
        List all interpolations for a calculated survey.

        Args:
            calculated_survey_id: UUID of CalculatedSurvey

        Returns:
            QuerySet of InterpolatedSurvey instances
        """
        return InterpolatedSurvey.objects.filter(
            calculated_survey_id=calculated_survey_id
        ).order_by('resolution')
