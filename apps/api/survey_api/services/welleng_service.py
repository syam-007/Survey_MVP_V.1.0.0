"""
Welleng integration service for survey calculations.

This service wraps the welleng library to calculate survey trajectories,
converting uploaded survey data into position coordinates and trajectory metrics.
"""
import numpy as np
from typing import Dict, List
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
            md_array = np.array(md, dtype=float)
            inc_array = np.array(inc, dtype=float)
            azi_array = np.array(azi, dtype=float)

            # Apply tie-on offset to MD
            tie_on_md = float(tie_on_data.get('md', 0))
            md_array = md_array + tie_on_md

            logger.debug(f"MD range after tie-on: {md_array.min():.2f} to {md_array.max():.2f}")

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
            northing = [None if np.isnan(x) else float(x) for x in northing_array]
            easting = [None if np.isnan(x) else float(x) for x in easting_array]
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
        resolution: int = 5
    ) -> Dict:
        """
        Interpolate calculated survey to specified resolution.

        Args:
            calculated_data: Dictionary with arrays:
                - md: List[float] - Measured Depth
                - inc: List[float] - Inclination (degrees)
                - azi: List[float] - Azimuth (degrees)
                - easting: List[float] - Easting coordinates
                - northing: List[float] - Northing coordinates
                - tvd: List[float] - True Vertical Depth
            resolution: Interpolation step size in meters (default: 5)

        Returns:
            Dictionary containing:
                - md: List[float] - Interpolated Measured Depth
                - inc: List[float] - Interpolated Inclination
                - azi: List[float] - Interpolated Azimuth
                - easting: List[float] - Interpolated Easting
                - northing: List[float] - Interpolated Northing
                - tvd: List[float] - Interpolated TVD
                - dls: List[float] - Interpolated DLS (recalculated)
                - point_count: int - Number of interpolated points
                - status: str - 'success'

        Raises:
            WellengCalculationError: If interpolation fails

        Performance:
            Uses NumPy's interp for fast linear interpolation.
            Target: < 2 seconds for typical datasets.
        """
        try:
            from welleng.survey import Survey, SurveyHeader

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

            # Create interpolation points
            md_min = float(md[0])
            md_max = float(md[-1])
            md_interpolated = np.arange(md_min, md_max, resolution)

            # Ensure we have at least 2 points for valid interpolation
            if len(md_interpolated) < 2:
                raise WellengCalculationError(
                    f"Resolution {resolution}m too large for MD range {md_min:.2f} to {md_max:.2f}m. "
                    f"Would produce {len(md_interpolated)} points, but at least 2 points required."
                )

            logger.debug(f"Interpolating {len(md)} points to {len(md_interpolated)} points")

            # Interpolate all fields using numpy.interp (fast linear interpolation)
            inc_interpolated = np.interp(md_interpolated, md, inc)
            azi_interpolated = np.interp(md_interpolated, md, azi)
            easting_interpolated = np.interp(md_interpolated, md, easting)
            northing_interpolated = np.interp(md_interpolated, md, northing)
            tvd_interpolated = np.interp(md_interpolated, md, tvd)

            # Recreate Survey object with interpolated data to calculate DLS, vertical section, closure
            # Use minimal header since we're only calculating trajectory metrics
            header = SurveyHeader(
                name="interpolated_survey",
                latitude=0.0,
                longitude=0.0,
                deg=True
            )

            # Create Survey with interpolated positions to maintain spatial accuracy
            interp_survey = Survey(
                md=md_interpolated,
                inc=inc_interpolated,
                azi=azi_interpolated,
                header=header,
                start_nev=[
                    northing_interpolated[0],  # Start from interpolated first point
                    easting_interpolated[0],
                    tvd_interpolated[0]
                ],
                deg=True
            )

            dls_interpolated = interp_survey.dls

            # Calculate Vertical Section
            # Use the azimuth from the first interpolated point for vertical section
            vertical_section_azimuth = float(azi_interpolated[0])
            logger.debug(f"Setting vertical section azimuth to {vertical_section_azimuth} degrees for interpolation")
            interp_survey.set_vertical_section(vertical_section_azimuth, deg=True)
            vertical_section_interpolated = interp_survey.vertical_section

            # Calculate Closure Distance and Direction
            # Closure is calculated relative to the first point
            closure_distance_list = []
            closure_direction_list = []

            for i in range(len(northing_interpolated)):
                # Calculate delta from first point
                delta_n = northing_interpolated[i] - northing_interpolated[0]
                delta_e = easting_interpolated[i] - easting_interpolated[0]

                # Closure distance using Pythagorean theorem
                distance = np.sqrt(delta_n ** 2 + delta_e ** 2)

                # Closure direction using atan2 (returns angle in radians, convert to degrees)
                # atan2(delta_e, delta_n) gives angle from North (0°) clockwise
                direction = np.degrees(np.arctan2(delta_e, delta_n)) % 360

                closure_distance_list.append(float(distance))
                closure_direction_list.append(float(direction))

            logger.debug(f"Final interpolated closure: Distance={closure_distance_list[-1]:.2f}m, Direction={closure_direction_list[-1]:.2f}°")

            # Replace NaN values with None for JSON compatibility
            # PostgreSQL JSONB doesn't support NaN, so convert to None (null in JSON)
            md_list = [None if np.isnan(x) else float(x) for x in md_interpolated]
            inc_list = [None if np.isnan(x) else float(x) for x in inc_interpolated]
            azi_list = [None if np.isnan(x) else float(x) for x in azi_interpolated]
            easting_list = [None if np.isnan(x) else float(x) for x in easting_interpolated]
            northing_list = [None if np.isnan(x) else float(x) for x in northing_interpolated]
            tvd_list = [None if np.isnan(x) else float(x) for x in tvd_interpolated]
            dls_list = [None if np.isnan(x) else float(x) for x in dls_interpolated]
            vertical_section_list = [None if np.isnan(x) else float(x) for x in vertical_section_interpolated]

            logger.info(f"Interpolation completed: {len(md_interpolated)} points with vertical section and closure")

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
                'point_count': len(md_interpolated),
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
