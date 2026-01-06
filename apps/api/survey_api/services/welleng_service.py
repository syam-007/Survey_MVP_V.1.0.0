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
        """
        try:
            from welleng.survey import Survey, SurveyHeader

            logger.info(f"Starting welleng calculation for {len(md)} survey points")

            if not (len(md) == len(inc) == len(azi)):
                raise WellengCalculationError(
                    f"Array length mismatch: MD={len(md)}, Inc={len(inc)}, Azi={len(azi)}. "
                    "All arrays must have the same length."
                )

            if len(md) < 2:
                raise WellengCalculationError(
                    "Insufficient data points. At least 2 survey points are required for calculations."
                )

            md_array = np.array(md, dtype=float)
            inc_array = np.array(inc, dtype=float)
            azi_array = np.array(azi, dtype=float)

            logger.debug(f"MD range: {md_array.min():.2f} to {md_array.max():.2f}, points: {len(md_array)}")

            latitude = location_data.get('latitude')
            longitude = location_data.get('longitude')
            geodetic_system = location_data.get('geodetic_system', 'WGS84')

            if latitude is None or longitude is None:
                logger.warning("Missing latitude/longitude, using defaults (0, 0)")
                latitude = 0.0
                longitude = 0.0

            header = SurveyHeader(
                name=f"{survey_type}_survey",
                latitude=float(latitude),
                longitude=float(longitude),
                deg=True
            )

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
                deg=True
            )

            logger.debug("Welleng Survey object created successfully")

            northing_array = survey.n
            easting_array = survey.e
            tvd_array = survey.tvd

            logger.info(f"ARRAY LENGTHS AFTER SURVEY CREATION:")
            logger.info(f"  MD: {len(md_array)}")
            logger.info(f"  Northing: {len(northing_array)}")
            logger.info(f"  Easting: {len(easting_array)}")
            logger.info(f"  TVD: {len(tvd_array)}")

            logger.info(f"LAST 3 MD VALUES: {md_array[-3:].tolist()}")
            logger.info(f"LAST 3 NORTHING VALUES: {northing_array[-3:].tolist()}")
            logger.info(f"LAST 3 EASTING VALUES: {easting_array[-3:].tolist()}")
            logger.info(f"LAST 3 TVD VALUES: {tvd_array[-3:].tolist()}")

            logger.debug(f"Positions calculated: {len(northing_array)} points")

            dls_array = survey.dls
            build_rate_array = survey.build_rate
            turn_rate_array = survey.turn_rate

            if len(dls_array) < len(md_array):
                logger.info(f"Padding DLS array: {len(dls_array)} -> {len(md_array)}")
                dls_array = np.append(dls_array, np.nan)
                build_rate_array = np.append(build_rate_array, np.nan)
                turn_rate_array = np.append(turn_rate_array, np.nan)

            if vertical_section_azimuth is None:
                vertical_section_azimuth = float(tie_on_data.get('azi', 0.0))

            logger.debug(f"Setting vertical section azimuth to {vertical_section_azimuth} degrees")
            print(f"\n[WELLENG CALC] Setting vertical section with azimuth: {vertical_section_azimuth}°")
            survey.set_vertical_section(vertical_section_azimuth, deg=True)
            vertical_section_array = survey.vertical_section

            print(f"[WELLENG CALC] Vertical section calculated successfully")
            print(f"[WELLENG CALC] Vertical section array length: {len(vertical_section_array)}")
            print(f"[WELLENG CALC] First 3 vertical section values: {vertical_section_array[:min(3, len(vertical_section_array))]}")
            print(f"[WELLENG CALC] Last 3 vertical section values: {vertical_section_array[-min(3, len(vertical_section_array)):]}")
            print(f"[WELLENG CALC] Vertical section range: {vertical_section_array[0]:.2f} to {vertical_section_array[-1]:.2f}\n")

            closure_distance_list = []
            closure_direction_list = []

            for i in range(len(northing_array)):
                delta_n = northing_array[i] - northing_array[0]
                delta_e = easting_array[i] - easting_array[0]

                distance = np.sqrt(delta_n ** 2 + delta_e ** 2)
                direction = np.degrees(np.arctan2(delta_e, delta_n)) % 360

                closure_distance_list.append(float(distance))
                closure_direction_list.append(float(direction))

            logger.debug(
                f"Final closure: Distance={closure_distance_list[-1]:.2f}m, "
                f"Direction={closure_direction_list[-1]:.2f}°"
            )

            northing = [None if np.isnan(x) else round(float(x), 2) for x in northing_array]
            easting = [None if np.isnan(x) else round(float(x), 2) for x in easting_array]
            tvd = [None if np.isnan(x) else float(x) for x in tvd_array]
            dls = [None if np.isnan(x) else float(x) for x in dls_array]
            build_rate = [None if np.isnan(x) else float(x) for x in build_rate_array]
            turn_rate = [None if np.isnan(x) else float(x) for x in turn_rate_array]
            vertical_section = [None if np.isnan(x) else float(x) for x in vertical_section_array]

            logger.info(f"Welleng calculation completed successfully for {len(md)} points")

            logger.info(f"AFTER NaN CONVERSION - LAST 3 VALUES:")
            logger.info(f"  MD: {md[-3:]}")
            logger.info(f"  Northing: {northing[-3:]}")
            logger.info(f"  Easting: {easting[-3:]}")
            logger.info(f"  TVD: {tvd[-3:]}")

            array_lengths = {
                'md': len(md),
                'easting': len(easting),
                'northing': len(northing),
                'tvd': len(tvd),
                'dls': len(dls),
                'build_rate': len(build_rate),
                'turn_rate': len(turn_rate),
                'vertical_section': len(vertical_section),
                'closure_distance': len(closure_distance_list),
                'closure_direction': len(closure_direction_list),
            }

            logger.info(f"Array lengths: {array_lengths}")

            if len(set(array_lengths.values())) > 1:
                logger.error(f"ARRAY LENGTH MISMATCH DETECTED! Arrays: {array_lengths}")
                logger.error(f"Input MD range: {md[0]} to {md[-1]}")
                logger.error(f"Expected length: {len(md)}")

            result_dict = {
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

            logger.info(f"[WELLENG RETURN] Returning result with:")
            logger.info(f"[WELLENG RETURN]   Northing length: {len(result_dict['northing'])}")
            logger.info(f"[WELLENG RETURN]   Easting length: {len(result_dict['easting'])}")
            logger.info(f"[WELLENG RETURN]   TVD length: {len(result_dict['tvd'])}")
            logger.info(f"[WELLENG RETURN]   Last 3 Northing values: {result_dict['northing'][-3:]}")
            logger.info(f"[WELLENG RETURN]   Last 3 Easting values: {result_dict['easting'][-3:]}")
            logger.info(f"[WELLENG RETURN]   Last 3 TVD values: {result_dict['tvd'][-3:]}")

            print("\n" + "="*80)
            print("[WELLENG RETURN] Returning result with:")
            print(f"[WELLENG RETURN]   Northing length: {len(result_dict['northing'])}")
            print(f"[WELLENG RETURN]   Easting length: {len(result_dict['easting'])}")
            print(f"[WELLENG RETURN]   TVD length: {len(result_dict['tvd'])}")
            print(f"[WELLENG RETURN]   Last 3 Northing values: {result_dict['northing'][-3:]}")
            print(f"[WELLENG RETURN]   Last 3 Easting values: {result_dict['easting'][-3:]}")
            print(f"[WELLENG RETURN]   Last 3 TVD values: {result_dict['tvd'][-3:]}")
            print("="*80 + "\n")

            return result_dict

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
    def _interp_inc_azi_circular(
        md: np.ndarray,
        inc: np.ndarray,
        azi: np.ndarray,
        md_new: np.ndarray,
        kind: str = "linear"
    ) -> (np.ndarray, np.ndarray):
        """
        Interpolate inclination and azimuth vs MD.

        - Inclination: standard 1D interpolation.
        - Azimuth: unwrap in radians -> interpolate -> wrap back to [0, 360).
          This performs shortest-path angular interpolation and avoids 0/360 issues
          WITHOUT the chord/atan2 artifacts you saw with cos/sin LERP.
        """
        from scipy.interpolate import interp1d

        # Ensure sorted by MD
        order = np.argsort(md)
        md_s = md[order]
        inc_s = inc[order]
        azi_s = azi[order]

        # Inclination (not circular)
        f_inc = interp1d(md_s, inc_s, kind=kind, bounds_error=False, fill_value="extrapolate")
        inc_new = f_inc(md_new)

        # Azimuth (circular): unwrap -> interpolate -> wrap
        azi_rad = np.deg2rad(azi_s)

        # Unwrap so interpolation follows the shortest angular path between stations
        azi_unwrapped = np.unwrap(azi_rad, discont=np.pi)

        f_azi = interp1d(md_s, azi_unwrapped, kind=kind, bounds_error=False, fill_value="extrapolate")
        azi_new_unwrapped = f_azi(md_new)

        azi_new_deg = np.mod(np.rad2deg(azi_new_unwrapped), 360.0)

        return inc_new, azi_new_deg

    @staticmethod
    def interpolate_survey(
        calculated_data: Dict,
        resolution: int = 5,
        start_md: Optional[float] = None,
        end_md: Optional[float] = None,
        vertical_section_azimuth: Optional[float] = None
    ) -> Dict:
        """
        Interpolate calculated survey to specified resolution using welleng's interpolate_survey.
        """
        try:
            from welleng.survey import Survey, SurveyHeader

            logger.info(f"Starting welleng interpolation with resolution={resolution}m")

            if resolution < 1 or resolution > 100:
                raise WellengCalculationError(
                    f"Invalid resolution: {resolution}. Must be between 1 and 100 meters."
                )

            md = np.array(calculated_data['md'], dtype=float)
            inc = np.array(calculated_data['inc'], dtype=float)
            azi = np.array(calculated_data['azi'], dtype=float)
            easting = np.array(calculated_data['easting'], dtype=float)
            northing = np.array(calculated_data['northing'], dtype=float)
            tvd = np.array(calculated_data['tvd'], dtype=float)

            if len(md) < 2:
                raise WellengCalculationError(
                    "Insufficient data points for interpolation. At least 2 points required."
                )

            logger.debug(f"Original survey: {len(md)} points, MD range: {md[0]:.2f} to {md[-1]:.2f}")

            tie_on_md = float(md[0])
            survey_final_md = float(md[-1])

            interpolation_start_md = start_md if start_md is not None else tie_on_md
            interpolation_end_md = end_md if end_md is not None else survey_final_md

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

            interpolated_md_list = [tie_on_md]
            current_md = interpolation_start_md
            epsilon = 0.001

            while current_md < interpolation_end_md + epsilon:
                if abs(current_md - tie_on_md) > 0.01 and current_md <= interpolation_end_md + epsilon:
                    interpolated_md_list.append(float(current_md))
                current_md += resolution

            if len(interpolated_md_list) > 1 and abs(interpolated_md_list[-1] - interpolation_end_md) < 0.01:
                interpolated_md_list[-1] = float(interpolation_end_md)
            elif len(interpolated_md_list) == 0 or abs(interpolated_md_list[-1] - interpolation_end_md) > 0.01:
                interpolated_md_list.append(float(interpolation_end_md))

            interpolated_md = np.array(interpolated_md_list, dtype=float)

            print(f"[INTERPOLATION] Generated {len(interpolated_md)} points from {interpolated_md[0]:.2f}m to {interpolated_md[-1]:.2f}m")
            print(f"[INTERPOLATION] First 3 MD values: {interpolated_md[:min(3, len(interpolated_md))]}")
            print(f"[INTERPOLATION] Last 3 MD values: {interpolated_md[-min(3, len(interpolated_md)):]}")
            print(f"[INTERPOLATION] ENDPOINT CHECK: Expected={interpolation_end_md:.2f}m, Got={interpolated_md[-1]:.2f}m, Match={abs(interpolated_md[-1] - interpolation_end_md) < 0.01}")

            # ------------------------------------------------------------------
            # UPDATED LOGIC:
            #   - Inclination interpolated normally
            #   - Azimuth interpolated using circular unit-vector method (cos/sin)
            #     to avoid wrap artifacts at 0/360.
            # ------------------------------------------------------------------
            inc_interpolated, azi_interpolated = WellengService._interp_inc_azi_circular(
                md=md,
                inc=inc,
                azi=azi,
                md_new=interpolated_md,
                kind="linear"
            )

            print(
                f"[INTERPOLATION] Interpolated first point: "
                f"MD={interpolated_md[0]:.2f}, INC={inc_interpolated[0]:.2f}, AZI={azi_interpolated[0]:.2f}"
            )

            header = SurveyHeader(
                name="interpolated_survey",
                latitude=0.0,
                longitude=0.0,
                deg=True
            )

            interpolated_survey = Survey(
                md=interpolated_md,
                inc=inc_interpolated,
                azi=azi_interpolated,
                header=header,
                start_nev=[
                    northing[0],
                    easting[0],
                    tvd[0]
                ],
                deg=True
            )

            print(f"[INTERPOLATION] Survey object created with {len(interpolated_survey.md)} points")
            print(f"[INTERPOLATION] First calculated point: N={interpolated_survey.n[0]:.2f}, E={interpolated_survey.e[0]:.2f}, TVD={interpolated_survey.tvd[0]:.2f}")

            if vertical_section_azimuth is None:
                vertical_section_azimuth = float(interpolated_survey.azi_grid_deg[0])
                logger.debug(f"No vertical section azimuth provided, using first point azimuth: {vertical_section_azimuth}°")
                print(f"[WELLENG INTERP] No vertical section azimuth provided, using first point: {vertical_section_azimuth}°")
            else:
                logger.debug(f"Using provided vertical section azimuth: {vertical_section_azimuth}° (BHC converged value)")
                print(f"\n{'='*80}")
                print(f"[WELLENG INTERP] Using PROVIDED vertical section azimuth: {vertical_section_azimuth}°")
                print(f"[WELLENG INTERP] This is the BHC converged closure direction")
                print(f"[WELLENG INTERP] Setting vertical section with this azimuth...")
                print(f"{'='*80}\n")

            interpolated_survey.set_vertical_section(vertical_section_azimuth, deg=True)
            print(f"[WELLENG INTERP] Vertical section set successfully with azimuth={vertical_section_azimuth}°")

            vertical_section_array = interpolated_survey.vertical_section
            print(f"[WELLENG INTERP] Vertical section array length: {len(vertical_section_array)}")
            print(f"[WELLENG INTERP] First 3 vertical section values: {vertical_section_array[:min(3, len(vertical_section_array))]}")
            print(f"[WELLENG INTERP] Last 3 vertical section values: {vertical_section_array[-min(3, len(vertical_section_array)):]}")
            print(f"[WELLENG INTERP] Vertical section range: {vertical_section_array[0]:.2f} to {vertical_section_array[-1]:.2f}")

            closure_distance_list = []
            closure_direction_list = []

            first_northing = interpolated_survey.n[0]
            first_easting = interpolated_survey.e[0]

            for i in range(len(interpolated_survey.n)):
                delta_n = interpolated_survey.n[i] - first_northing
                delta_e = interpolated_survey.e[i] - first_easting

                distance = np.sqrt(delta_n ** 2 + delta_e ** 2)
                direction = np.degrees(np.arctan2(delta_e, delta_n)) % 360 if distance > 0 else 0.0

                closure_distance_list.append(float(distance))
                closure_direction_list.append(float(direction))

            logger.debug(
                f"Final interpolated closure: Distance={closure_distance_list[-1]:.2f}m, "
                f"Direction={closure_direction_list[-1]:.2f}°"
            )

            dls_array = interpolated_survey.dls
            if len(dls_array) < len(interpolated_survey.md):
                logger.info(f"Padding interpolated DLS array: {len(dls_array)} -> {len(interpolated_survey.md)}")
                dls_array = np.append(dls_array, np.nan)

            md_list = [None if np.isnan(x) else float(x) for x in interpolated_survey.md]
            inc_list = [None if np.isnan(x) else float(x) for x in interpolated_survey.inc_deg]
            azi_list = [None if np.isnan(x) else float(x) for x in interpolated_survey.azi_grid_deg]
            easting_list = [None if np.isnan(x) else round(float(x), 2) for x in interpolated_survey.e]
            northing_list = [None if np.isnan(x) else round(float(x), 2) for x in interpolated_survey.n]
            tvd_list = [None if np.isnan(x) else float(x) for x in interpolated_survey.tvd]
            dls_list = [None if np.isnan(x) else float(x) for x in dls_array]
            vertical_section_list = [None if np.isnan(x) else float(x) for x in interpolated_survey.vertical_section]

            print(f"[INTERPOLATION] Completed: {len(md_list)} points, returning first MD={md_list[0]}, last MD={md_list[-1]}")
            logger.info(f"Interpolation completed: {len(md_list)} points with vertical section and closure")

            array_lengths = {
                'md': len(md_list),
                'inc': len(inc_list),
                'azi': len(azi_list),
                'easting': len(easting_list),
                'northing': len(northing_list),
                'tvd': len(tvd_list),
                'dls': len(dls_list),
                'vertical_section': len(vertical_section_list),
                'closure_distance': len(closure_distance_list),
                'closure_direction': len(closure_direction_list),
            }

            logger.info(f"Interpolation array lengths: {array_lengths}")

            if len(set(array_lengths.values())) > 1:
                logger.error(f"INTERPOLATION ARRAY LENGTH MISMATCH! Arrays: {array_lengths}")
                logger.error(f"Interpolated MD range: {md_list[0]} to {md_list[-1]}")

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
