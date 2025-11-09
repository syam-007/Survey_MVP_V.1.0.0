"""
Welleng integration service for survey calculations.

This service wraps the welleng library to calculate survey trajectories,
converting uploaded survey data into position coordinates and trajectory metrics.
"""
import numpy as np
from typing import Dict, List, Optional
import logging

from survey_api.exceptions import WellengCalculationError

logger = logging.getLogger(__name__)


class WellengService:
    """Service for performing welleng calculations on survey data."""

    @staticmethod
    def calculate_survey(
        md: List[float],
        inc: List[float],
        azi: List[float],
        tie_on_data: Dict,
        location_data: Dict,
        survey_type: str = 'MWD',
        vertical_section_azimuth: float = None
    ) -> Dict:
        """
        Calculate survey trajectory using welleng library.

        Args:
            md: Measured Depth array (meters)
            inc: Inclination array (degrees)
            azi: Azimuth array (degrees)
            tie_on_data: Tie-on information (md, inc, azi, tvd, northing, easting)
            location_data: Location data for coordinate system (latitude, longitude, geodetic_system)
            survey_type: Survey tool type ('Type 1 - GTL', 'Type 2 - Gyro', 'Type 3 - MWD', 'Type 4 - Unknown')
            vertical_section_azimuth: Azimuth for vertical section calculation (degrees), if None will use tie-on azimuth

        Returns:
            Dictionary containing:
                - easting: List[float] - X coordinates (meters)
                - northing: List[float] - Y coordinates (meters)
                - tvd: List[float] - True Vertical Depth (meters)
                - dls: List[float] - Dog Leg Severity (degrees/30m)
                - build_rate: List[float] - Build Rate (degrees/30m)
                - turn_rate: List[float] - Turn Rate (degrees/30m)
                - vertical_section: List[float] - Vertical Section coordinates (meters)
                - closure_distance: List[float] - Closure distance from first point (meters)
                - closure_direction: List[float] - Closure direction from first point (degrees)
                - vertical_section_azimuth: float - Azimuth used for vertical section
                - status: str - 'success'

        Raises:
            WellengCalculationError: If calculation fails

        Performance:
            Uses NumPy arrays for vectorized operations.
            Target: < 3 seconds for 10,000 points.
        """
        try:
            # Import welleng here to avoid circular imports and allow module to load even if welleng not installed
            from welleng.survey import Survey, SurveyHeader

            logger.info(f"Starting welleng calculation for {len(md)} survey points")

            # Validate input arrays have same length
            if not (len(md) == len(inc) == len(azi)):
                raise WellengCalculationError(
                    f"Array length mismatch: MD={len(md)}, Inc={len(inc)}, Azi={len(azi)}. "
                    "All arrays must have the same length."
                )

            # Validate minimum data points
            if len(md) < 2:
                raise WellengCalculationError(
                    "Insufficient data points. At least 2 survey points are required for calculations."
                )

            # Convert to numpy arrays
            # Note: tie-on point is already prepended in the data by upload_viewset
            md_array = np.array(md, dtype=float)
            inc_array = np.array(inc, dtype=float)
            azi_array = np.array(azi, dtype=float)

            logger.debug(f"MD range: {md_array.min():.2f} to {md_array.max():.2f}, points: {len(md_array)}")

            # Extract location data with defaults
            latitude = location_data.get('latitude')
            longitude = location_data.get('longitude')
            geodetic_system = location_data.get('geodetic_system', 'WGS84')

            if latitude is None or longitude is None:
                logger.warning("Missing latitude/longitude, using defaults (0, 0)")
                latitude = 0.0
                longitude = 0.0

            # Create welleng SurveyHeader
            header = SurveyHeader(
                name=f"{survey_type}_survey",
                latitude=float(latitude),
                longitude=float(longitude),
                deg=True
            )

            # Create welleng Survey object
            survey = Survey(
                md=md_array,
                inc=inc_array,
                azi=azi_array,
                header=header,
                start_nev=[
                    tie_on_data.get('northing', 0),  # North
                    tie_on_data.get('easting', 0),   # East
                    tie_on_data.get('tvd', 0)        # Vertical (TVD)
                ],
                deg=True  # Input angles are in degrees
            )

            logger.debug("Welleng Survey object created successfully")

            # Extract calculated positions from survey object
            # Welleng Survey computes these automatically on init
            northing_array = survey.n
            easting_array = survey.e
            tvd_array = survey.tvd

            logger.debug(f"Positions calculated: {len(northing_array)} points")

            # Calculate trajectory metrics
            dls_array = survey.dls
            build_rate_array = survey.build_rate
            turn_rate_array = survey.turn_rate

            # Calculate Vertical Section
            # Use provided azimuth or default to tie-on azimuth
            if vertical_section_azimuth is None:
                vertical_section_azimuth = float(tie_on_data.get('azi', 0.0))

            logger.debug(f"Setting vertical section azimuth to {vertical_section_azimuth} degrees")
            survey.set_vertical_section(vertical_section_azimuth, deg=True)
            vertical_section_array = survey.vertical_section

            # Calculate Closure Distance and Direction
            # Closure is calculated relative to the first point (tie-on position)
            closure_distance_list = []
            closure_direction_list = []

            for i in range(len(northing_array)):
                # Calculate delta from first point
                delta_n = northing_array[i] - northing_array[0]
                delta_e = easting_array[i] - easting_array[0]

                # Closure distance using Pythagorean theorem
                distance = np.sqrt(delta_n ** 2 + delta_e ** 2)

                # Closure direction using atan2 (returns angle in radians, convert to degrees)
                # atan2(delta_e, delta_n) gives angle from North (0°) clockwise
                direction = np.degrees(np.arctan2(delta_e, delta_n)) % 360

                closure_distance_list.append(float(distance))
                closure_direction_list.append(float(direction))

            logger.debug(f"Final closure: Distance={closure_distance_list[-1]:.2f}m, Direction={closure_direction_list[-1]:.2f}°")

            # Replace NaN values with None for JSON compatibility
            # PostgreSQL JSONB doesn't support NaN, so convert to None (null in JSON)
            # Round northing and easting to 2 decimal places for consistency
            northing = [None if np.isnan(x) else round(float(x), 2) for x in northing_array]
            easting = [None if np.isnan(x) else round(float(x), 2) for x in easting_array]
            tvd = [None if np.isnan(x) else float(x) for x in tvd_array]
            dls = [None if np.isnan(x) else float(x) for x in dls_array]
            build_rate = [None if np.isnan(x) else float(x) for x in build_rate_array]
            turn_rate = [None if np.isnan(x) else float(x) for x in turn_rate_array]
            vertical_section = [None if np.isnan(x) else float(x) for x in vertical_section_array]

            logger.info(f"Welleng calculation completed successfully for {len(md)} points")

            # Return results
            return {
                'easting': easting,
                'northing': northing,
                'tvd': tvd,
                'dls': dls,
                'build_rate': build_rate,
                'turn_rate': turn_rate,
                'vertical_section': vertical_section,
                'closure_distance': closure_distance_list,
                'closure_direction': closure_direction_list,
                'vertical_section_azimuth': float(vertical_section_azimuth),
                'status': 'success'
            }

        except ImportError as e:
            logger.error(f"Welleng library not installed: {str(e)}")
            raise WellengCalculationError(
                "Welleng library is not installed. Please install welleng to perform calculations."
            )

        except ValueError as e:
            logger.error(f"Welleng calculation failed (ValueError): {str(e)}")
            raise WellengCalculationError(
                "Invalid survey data format. Check that all values are numeric and within valid ranges."
            )

        except IndexError as e:
            logger.error(f"Welleng calculation failed (IndexError): {str(e)}")
            raise WellengCalculationError(
                "Array indexing error. Ensure MD, Inc, and Azi arrays have the same length."
            )

        except RuntimeError as e:
            logger.error(f"Welleng calculation failed (RuntimeError): {str(e)}")
            raise WellengCalculationError(
                f"Welleng calculation failed: {str(e)}. Check tie-on and location data for correctness."
            )

        except Exception as e:
            logger.error(f"Unexpected error in welleng calculation: {type(e).__name__}: {str(e)}")
            raise WellengCalculationError(
                f"Survey calculation failed: {str(e)}"
            )

    @staticmethod
    def interpolate_survey(
        calculated_data: Dict,
        resolution: int = 5,
        start_md: Optional[float] = None,
        end_md: Optional[float] = None
    ) -> Dict:
        """
        Interpolate calculated survey to specified resolution using welleng's interpolate_survey.

        Args:
            calculated_data: Dictionary with arrays:
                - md: List[float] - Measured Depth
                - inc: List[float] - Inclination (degrees)
                - azi: List[float] - Azimuth (degrees)
                - easting: List[float] - Easting coordinates
                - northing: List[float] - Northing coordinates
                - tvd: List[float] - True Vertical Depth
            resolution: Interpolation step size in meters (default: 5)
            start_md: Optional start MD for custom range (default: tie-on MD)
            end_md: Optional end MD for custom range (default: final MD)

        Returns:
            Dictionary containing:
                - md: List[float] - Interpolated Measured Depth
                - inc: List[float] - Interpolated Inclination
                - azi: List[float] - Interpolated Azimuth
                - easting: List[float] - Interpolated Easting
                - northing: List[float] - Interpolated Northing
                - tvd: List[float] - Interpolated TVD
                - dls: List[float] - Interpolated DLS (recalculated)
                - vertical_section: List[float] - Interpolated Vertical Section
                - closure_distance: List[float] - Interpolated Closure Distance
                - closure_direction: List[float] - Interpolated Closure Direction
                - point_count: int - Number of interpolated points
                - status: str - 'success'

        Raises:
            WellengCalculationError: If interpolation fails

        Performance:
            Uses welleng's interpolate_survey function.
            Target: < 2 seconds for typical datasets.
        """
        try:
            from welleng.survey import Survey, SurveyHeader, interpolate_survey

            logger.info(f"Starting welleng interpolation with resolution={resolution}m")

            # Validate resolution
            if resolution < 1 or resolution > 100:
                raise WellengCalculationError(
                    f"Invalid resolution: {resolution}. Must be between 1 and 100 meters."
                )

            # Convert to numpy arrays
            md = np.array(calculated_data['md'], dtype=float)
            inc = np.array(calculated_data['inc'], dtype=float)
            azi = np.array(calculated_data['azi'], dtype=float)
            easting = np.array(calculated_data['easting'], dtype=float)
            northing = np.array(calculated_data['northing'], dtype=float)
            tvd = np.array(calculated_data['tvd'], dtype=float)

            # Validate sufficient data points
            if len(md) < 2:
                raise WellengCalculationError(
                    "Insufficient data points for interpolation. At least 2 points required."
                )

            logger.debug(f"Original survey: {len(md)} points, MD range: {md[0]:.2f} to {md[-1]:.2f}")

            # Get tie-on MD (first point) and final MD from survey data
            tie_on_md = float(md[0])
            survey_final_md = float(md[-1])

            # Use custom start/end MD if provided, otherwise use defaults
            interpolation_start_md = start_md if start_md is not None else tie_on_md
            interpolation_end_md = end_md if end_md is not None else survey_final_md

            # Validate custom range
            if interpolation_start_md < tie_on_md:
                raise WellengCalculationError(
                    f"Start MD ({interpolation_start_md:.2f}m) cannot be less than tie-on MD ({tie_on_md:.2f}m)"
                )
            if interpolation_end_md > survey_final_md:
                raise WellengCalculationError(
                    f"End MD ({interpolation_end_md:.2f}m) cannot exceed survey final MD ({survey_final_md:.2f}m)"
                )
            if interpolation_start_md >= interpolation_end_md:
                raise WellengCalculationError(
                    f"Start MD ({interpolation_start_md:.2f}m) must be less than end MD ({interpolation_end_md:.2f}m)"
                )

            print(f"[INTERPOLATION] Tie-on MD: {tie_on_md:.2f}m, Final MD: {survey_final_md:.2f}m")
            print(f"[INTERPOLATION] Custom Range: Start={interpolation_start_md:.2f}m, End={interpolation_end_md:.2f}m, Resolution: {resolution}m")

            # Create interpolated MD array
            # ALWAYS start with the tie-on point, then continue with interpolated points from start_md
            interpolated_md_list = [tie_on_md]

            # Generate interpolated points from start_md to end_md with given resolution
            # Use numpy arange for better precision and to ensure endpoint is included
            num_points = int((interpolation_end_md - interpolation_start_md) / resolution) + 1
            generated_points = np.linspace(interpolation_start_md, interpolation_end_md, num_points)

            # Add generated points, skipping any that are too close to tie-on
            for current_md in generated_points:
                # Only add if not duplicate of tie-on point
                if abs(current_md - tie_on_md) > 0.01:
                    interpolated_md_list.append(float(current_md))

            interpolated_md = np.array(interpolated_md_list)

            print(f"[INTERPOLATION] Generated {len(interpolated_md)} points from {interpolated_md[0]:.2f}m to {interpolated_md[-1]:.2f}m")
            print(f"[INTERPOLATION] First 3 MD values: {interpolated_md[:min(3, len(interpolated_md))]}")

            # Interpolate Inc and Azi directly from original calculated data to our exact MD points
            from scipy.interpolate import interp1d

            # Create interpolation functions from ORIGINAL calculated data
            inc_interp_func = interp1d(md, inc, kind='linear', fill_value='extrapolate')
            azi_interp_func = interp1d(md, azi, kind='linear', fill_value='extrapolate')

            # Interpolate inc and azi at our exact MD values
            inc_interpolated = inc_interp_func(interpolated_md)
            azi_interpolated = azi_interp_func(interpolated_md)

            print(f"[INTERPOLATION] Interpolated first point: MD={interpolated_md[0]:.2f}, INC={inc_interpolated[0]:.2f}, AZI={azi_interpolated[0]:.2f}")

            # Create header for welleng Survey
            header = SurveyHeader(
                name="interpolated_survey",
                latitude=0.0,
                longitude=0.0,
                deg=True
            )

            # Create Survey object with interpolated MD, Inc, Azi values
            # This will calculate positions (n, e, tvd) automatically
            interpolated_survey = Survey(
                md=interpolated_md,
                inc=inc_interpolated,
                azi=azi_interpolated,
                header=header,
                start_nev=[
                    northing[0],  # Start from tie-on position
                    easting[0],
                    tvd[0]
                ],
                deg=True
            )

            print(f"[INTERPOLATION] Survey object created with {len(interpolated_survey.md)} points")
            print(f"[INTERPOLATION] First calculated point: N={interpolated_survey.n[0]:.2f}, E={interpolated_survey.e[0]:.2f}, TVD={interpolated_survey.tvd[0]:.2f}")

            # Calculate Vertical Section using interpolated survey
            # Use the azimuth from the first interpolated point (grid azimuth)
            vertical_section_azimuth = float(interpolated_survey.azi_grid_deg[0])
            logger.debug(f"Setting vertical section azimuth to {vertical_section_azimuth} degrees")
            interpolated_survey.set_vertical_section(vertical_section_azimuth, deg=True)

            # Calculate Closure Distance and Direction
            closure_distance_list = []
            closure_direction_list = []

            first_northing = interpolated_survey.n[0]
            first_easting = interpolated_survey.e[0]

            for i in range(len(interpolated_survey.n)):
                # Calculate delta from first point
                delta_n = interpolated_survey.n[i] - first_northing
                delta_e = interpolated_survey.e[i] - first_easting

                # Closure distance
                distance = np.sqrt(delta_n ** 2 + delta_e ** 2)

                # Closure direction
                if distance > 0:
                    direction = np.degrees(np.arctan2(delta_e, delta_n)) % 360
                else:
                    direction = 0.0

                closure_distance_list.append(float(distance))
                closure_direction_list.append(float(direction))

            logger.debug(f"Final interpolated closure: Distance={closure_distance_list[-1]:.2f}m, Direction={closure_direction_list[-1]:.2f}°")

            # Convert to lists and handle NaN
            # Round northing and easting to 2 decimal places for consistency
            md_list = [None if np.isnan(x) else float(x) for x in interpolated_survey.md]
            inc_list = [None if np.isnan(x) else float(x) for x in interpolated_survey.inc_deg]
            azi_list = [None if np.isnan(x) else float(x) for x in interpolated_survey.azi_grid_deg]
            easting_list = [None if np.isnan(x) else round(float(x), 2) for x in interpolated_survey.e]
            northing_list = [None if np.isnan(x) else round(float(x), 2) for x in interpolated_survey.n]
            tvd_list = [None if np.isnan(x) else float(x) for x in interpolated_survey.tvd]
            dls_list = [None if np.isnan(x) else float(x) for x in interpolated_survey.dls]
            vertical_section_list = [None if np.isnan(x) else float(x) for x in interpolated_survey.vertical_section]

            print(f"[INTERPOLATION] Completed: {len(md_list)} points, returning first MD={md_list[0]}")
            logger.info(f"Interpolation completed: {len(md_list)} points with vertical section and closure")

            return {
                'md': md_list,
                'inc': inc_list,
                'azi': azi_list,
                'easting': easting_list,
                'northing': northing_list,
                'tvd': tvd_list,
                'dls': dls_list,
                'vertical_section': vertical_section_list,
                'closure_distance': closure_distance_list,
                'closure_direction': closure_direction_list,
                'point_count': len(md_list),
                'status': 'success'
            }

        except ImportError as e:
            logger.error(f"Welleng library not installed: {str(e)}")
            raise WellengCalculationError(
                "Welleng library is not installed. Please install welleng to perform interpolation."
            )

        except ValueError as e:
            logger.error(f"Welleng interpolation failed (ValueError): {str(e)}")
            raise WellengCalculationError(
                f"Invalid data format for interpolation: {str(e)}"
            )

        except KeyError as e:
            logger.error(f"Welleng interpolation failed (KeyError): {str(e)}")
            raise WellengCalculationError(
                f"Missing required data field: {str(e)}. Expected keys: md, inc, azi, easting, northing, tvd"
            )

        except Exception as e:
            logger.error(f"Unexpected error in welleng interpolation: {type(e).__name__}: {str(e)}")
            raise WellengCalculationError(
                f"Survey interpolation failed: {str(e)}"
            )
