"""
Delta Calculation Service

Calculates position and angular deltas between two survey datasets.
Handles MD alignment, interpolation, and statistical analysis.
"""
import numpy as np
from typing import Dict, List, Tuple
import logging
import time

from survey_api.models import SurveyData, CalculatedSurvey, InterpolatedSurvey
from survey_api.exceptions import InsufficientOverlapError, InvalidSurveyDataError, DeltaCalculationError

logger = logging.getLogger(__name__)


class DeltaCalculationService:
    """Service for calculating survey deltas and statistics."""

    @staticmethod
    def calculate_deltas(
        comparison_survey_id: str,
        reference_survey_id: str,
        ratio_factor: int = 10
    ) -> Dict:
        """
        Calculate all deltas between comparison and reference surveys.

        Args:
            comparison_survey_id: UUID of comparison SurveyData
            reference_survey_id: UUID of reference SurveyData
            ratio_factor: Scaling factor for visualization (1-100)

        Returns:
            Dictionary containing:
                - md_aligned: List[float] - Common MD stations
                - delta_x: List[float] - Easting deltas
                - delta_y: List[float] - Northing deltas
                - delta_z: List[float] - TVD deltas
                - delta_horizontal: List[float] - Horizontal displacement
                - delta_total: List[float] - Total 3D displacement
                - delta_inc: List[float] - Inclination deltas
                - delta_azi: List[float] - Azimuth deltas
                - statistics: Dict - Statistical summary
                - ratio_factor: int - Applied ratio factor

        Raises:
            InsufficientOverlapError: If surveys don't overlap
            InvalidSurveyDataError: If survey data is invalid
            DeltaCalculationError: If calculation fails
        """
        start_time = time.time()

        try:
            logger.info(f"Calculating deltas: comparison={comparison_survey_id}, reference={reference_survey_id}")

            # Load surveys
            comp_survey = SurveyData.objects.select_related('calculated_survey').get(id=comparison_survey_id)
            ref_survey = SurveyData.objects.select_related('calculated_survey').get(id=reference_survey_id)

            # Validate compatibility
            DeltaCalculationService._validate_survey_compatibility(comp_survey, ref_survey)

            # Get calculated data
            comp_calc = comp_survey.calculated_survey
            ref_calc = ref_survey.calculated_survey

            # Align surveys by MD using ratio_factor as interpolation step
            aligned_data = DeltaCalculationService._align_surveys_by_md(
                comp_survey, comp_calc,
                ref_survey, ref_calc,
                step=ratio_factor
            )

            md_aligned = aligned_data['md']
            comp_aligned = aligned_data['comparison']
            ref_aligned = aligned_data['reference']

            # Calculate position deltas
            delta_x = DeltaCalculationService._calculate_position_delta(
                comp_aligned['easting'], ref_aligned['easting']
            )
            delta_y = DeltaCalculationService._calculate_position_delta(
                comp_aligned['northing'], ref_aligned['northing']
            )
            delta_z = DeltaCalculationService._calculate_position_delta(
                comp_aligned['tvd'], ref_aligned['tvd']
            )

            # Calculate composite deltas
            delta_horizontal = DeltaCalculationService._calculate_horizontal_delta(delta_x, delta_y)
            delta_total = DeltaCalculationService._calculate_total_delta(delta_x, delta_y, delta_z)

            # Calculate angular deltas
            delta_inc = DeltaCalculationService._calculate_inclination_delta(
                comp_aligned['inc'], ref_aligned['inc']
            )
            delta_azi = DeltaCalculationService._calculate_azimuth_delta(
                comp_aligned['azi'], ref_aligned['azi']
            )

            # Calculate statistics
            statistics = DeltaCalculationService._calculate_statistics(
                md_aligned, delta_x, delta_y, delta_z,
                delta_horizontal, delta_total,
                delta_inc, delta_azi
            )

            elapsed_time = time.time() - start_time
            logger.info(f"Delta calculation completed: {len(md_aligned)} aligned stations in {elapsed_time:.2f}s")

            return {
                'md_aligned': md_aligned.tolist(),
                # Delta arrays
                'delta_x': delta_x.tolist(),
                'delta_y': delta_y.tolist(),
                'delta_z': delta_z.tolist(),
                'delta_horizontal': delta_horizontal.tolist(),
                'delta_total': delta_total.tolist(),
                'delta_inc': delta_inc.tolist(),
                'delta_azi': delta_azi.tolist(),
                # Reference survey full data
                'reference_inc': ref_aligned['inc'].tolist(),
                'reference_azi': ref_aligned['azi'].tolist(),
                'reference_northing': ref_aligned['northing'].tolist(),
                'reference_easting': ref_aligned['easting'].tolist(),
                'reference_tvd': ref_aligned['tvd'].tolist(),
                # Comparison survey full data
                'comparison_inc': comp_aligned['inc'].tolist(),
                'comparison_azi': comp_aligned['azi'].tolist(),
                'comparison_northing': comp_aligned['northing'].tolist(),
                'comparison_easting': comp_aligned['easting'].tolist(),
                'comparison_tvd': comp_aligned['tvd'].tolist(),
                # Metadata
                'statistics': statistics,
                'ratio_factor': ratio_factor,
                'calculation_duration': elapsed_time
            }

        except (SurveyData.DoesNotExist, CalculatedSurvey.DoesNotExist) as e:
            logger.error(f"Survey not found: {str(e)}")
            raise InvalidSurveyDataError(f"Survey not found: {str(e)}")

        except Exception as e:
            logger.error(f"Delta calculation failed: {type(e).__name__}: {str(e)}")
            raise DeltaCalculationError(f"Failed to calculate deltas: {str(e)}")

    @staticmethod
    def _validate_survey_compatibility(comp_survey: SurveyData, ref_survey: SurveyData):
        """Validate that surveys are compatible for comparison."""
        # Check calculated status
        if not hasattr(comp_survey, 'calculated_survey'):
            raise InvalidSurveyDataError("Comparison survey has not been calculated")
        if not hasattr(ref_survey, 'calculated_survey'):
            raise InvalidSurveyDataError("Reference survey has not been calculated")

        if comp_survey.calculated_survey.calculation_status != 'calculated':
            raise InvalidSurveyDataError("Comparison survey calculation failed or incomplete")
        if ref_survey.calculated_survey.calculation_status != 'calculated':
            raise InvalidSurveyDataError("Reference survey calculation failed or incomplete")

        # Check data availability
        comp_calc = comp_survey.calculated_survey
        ref_calc = ref_survey.calculated_survey

        if not comp_calc.easting or len(comp_calc.easting) < 2:
            raise InvalidSurveyDataError("Comparison survey has insufficient data points")
        if not ref_calc.easting or len(ref_calc.easting) < 2:
            raise InvalidSurveyDataError("Reference survey has insufficient data points")

    @staticmethod
    def _align_surveys_by_md(
        comp_survey: SurveyData, comp_calc: CalculatedSurvey,
        ref_survey: SurveyData, ref_calc: CalculatedSurvey,
        step: int = 1
    ) -> Dict:
        """
        Align surveys to common MD stations via interpolation.

        Args:
            comp_survey: Comparison SurveyData instance
            comp_calc: Calculated survey for comparison
            ref_survey: Reference SurveyData instance
            ref_calc: Calculated survey for reference
            step: Interpolation step size in meters (default: 1)

        Returns:
            Dict with:
                - md: np.array - Common MD stations
                - comparison: Dict[str, np.array] - Interpolated comparison data
                - reference: Dict[str, np.array] - Interpolated reference data
        """
        # Get MD arrays
        comp_md = np.array(comp_survey.md_data, dtype=float)
        ref_md = np.array(ref_survey.md_data, dtype=float)

        # Find common MD range
        md_min = max(comp_md.min(), ref_md.min())
        md_max = min(comp_md.max(), ref_md.max())

        if md_min >= md_max:
            raise InsufficientOverlapError(
                f"Surveys do not overlap. Comparison MD range: [{comp_md.min()}, {comp_md.max()}], "
                f"Reference MD range: [{ref_md.min()}, {ref_md.max()}]"
            )

        logger.debug(f"Common MD range: [{md_min:.2f}, {md_max:.2f}]")

        # Create uniform MD stations using provided step size (ratio_factor)
        md_aligned = np.arange(md_min, md_max + step, step, dtype=float)
        md_aligned = np.unique(np.sort(md_aligned))

        logger.debug(f"Created {len(md_aligned)} aligned MD stations with step={step}")

        # Interpolate comparison survey
        comp_inc = np.array(comp_survey.inc_data, dtype=float)
        comp_azi = np.array(comp_survey.azi_data, dtype=float)
        comp_easting = np.array(comp_calc.easting, dtype=float)
        comp_northing = np.array(comp_calc.northing, dtype=float)
        comp_tvd = np.array(comp_calc.tvd, dtype=float)

        comp_aligned = {
            'inc': np.interp(md_aligned, comp_md, comp_inc),
            'azi': np.interp(md_aligned, comp_md, comp_azi),
            'easting': np.interp(md_aligned, comp_md, comp_easting),
            'northing': np.interp(md_aligned, comp_md, comp_northing),
            'tvd': np.interp(md_aligned, comp_md, comp_tvd),
        }

        # Interpolate reference survey
        ref_inc = np.array(ref_survey.inc_data, dtype=float)
        ref_azi = np.array(ref_survey.azi_data, dtype=float)
        ref_easting = np.array(ref_calc.easting, dtype=float)
        ref_northing = np.array(ref_calc.northing, dtype=float)
        ref_tvd = np.array(ref_calc.tvd, dtype=float)

        ref_aligned = {
            'inc': np.interp(md_aligned, ref_md, ref_inc),
            'azi': np.interp(md_aligned, ref_md, ref_azi),
            'easting': np.interp(md_aligned, ref_md, ref_easting),
            'northing': np.interp(md_aligned, ref_md, ref_northing),
            'tvd': np.interp(md_aligned, ref_md, ref_tvd),
        }

        return {
            'md': md_aligned,
            'comparison': comp_aligned,
            'reference': ref_aligned
        }

    @staticmethod
    def _calculate_position_delta(comp_array: np.ndarray, ref_array: np.ndarray) -> np.ndarray:
        """Calculate position delta: Comparison - Reference."""
        return comp_array - ref_array

    @staticmethod
    def _calculate_horizontal_delta(delta_x: np.ndarray, delta_y: np.ndarray) -> np.ndarray:
        """Calculate horizontal displacement: √(ΔX² + ΔY²)."""
        return np.sqrt(delta_x**2 + delta_y**2)

    @staticmethod
    def _calculate_total_delta(delta_x: np.ndarray, delta_y: np.ndarray, delta_z: np.ndarray) -> np.ndarray:
        """Calculate total 3D displacement: √(ΔX² + ΔY² + ΔZ²)."""
        return np.sqrt(delta_x**2 + delta_y**2 + delta_z**2)

    @staticmethod
    def _calculate_inclination_delta(comp_inc: np.ndarray, ref_inc: np.ndarray) -> np.ndarray:
        """Calculate inclination delta (simple subtraction)."""
        return comp_inc - ref_inc

    @staticmethod
    def _calculate_azimuth_delta(comp_azi: np.ndarray, ref_azi: np.ndarray) -> np.ndarray:
        """
        Calculate azimuth delta with 0/360 wraparound handling.

        Returns shortest angular distance.
        Example: 355° to 5° = +10° (not -350°)
        """
        # Calculate raw difference
        delta = comp_azi - ref_azi

        # Handle wraparound: ((delta + 180) % 360) - 180
        # This ensures result is in range [-180, +180]
        delta_wrapped = ((delta + 180) % 360) - 180

        return delta_wrapped

    @staticmethod
    def _calculate_statistics(
        md: np.ndarray,
        delta_x: np.ndarray,
        delta_y: np.ndarray,
        delta_z: np.ndarray,
        delta_horizontal: np.ndarray,
        delta_total: np.ndarray,
        delta_inc: np.ndarray,
        delta_azi: np.ndarray
    ) -> Dict:
        """Calculate statistical summary of deltas."""

        # Find indices of maximum deviations
        idx_max_horizontal = np.argmax(np.abs(delta_horizontal))
        idx_max_total = np.argmax(np.abs(delta_total))

        # Calculate quarter point indices
        n = len(md)
        idx_25 = n // 4
        idx_50 = n // 2
        idx_75 = (3 * n) // 4

        # Calculate statistics
        statistics = {
            # Maximum deviations
            'max_delta_x': float(np.max(np.abs(delta_x))),
            'max_delta_y': float(np.max(np.abs(delta_y))),
            'max_delta_z': float(np.max(np.abs(delta_z))),
            'max_delta_horizontal': float(np.max(delta_horizontal)),
            'max_delta_total': float(np.max(delta_total)),

            # Average deviations
            'avg_delta_horizontal': float(np.mean(delta_horizontal)),
            'avg_delta_total': float(np.mean(delta_total)),
            'avg_delta_x': float(np.mean(np.abs(delta_x))),
            'avg_delta_y': float(np.mean(np.abs(delta_y))),
            'avg_delta_z': float(np.mean(np.abs(delta_z))),

            # Standard deviations
            'std_delta_horizontal': float(np.std(delta_horizontal)),
            'std_delta_total': float(np.std(delta_total)),

            # MD at maximum deviations
            'md_at_max_horizontal': float(md[idx_max_horizontal]),
            'md_at_max_total': float(md[idx_max_total]),

            # Deviation at key depths
            'deviation_at_start': {
                'md': float(md[0]),
                'delta_horizontal': float(delta_horizontal[0]),
                'delta_total': float(delta_total[0]),
                'delta_x': float(delta_x[0]),
                'delta_y': float(delta_y[0]),
                'delta_z': float(delta_z[0]),
            },
            'deviation_at_25_percent': {
                'md': float(md[idx_25]),
                'delta_horizontal': float(delta_horizontal[idx_25]),
                'delta_total': float(delta_total[idx_25]),
            },
            'deviation_at_50_percent': {
                'md': float(md[idx_50]),
                'delta_horizontal': float(delta_horizontal[idx_50]),
                'delta_total': float(delta_total[idx_50]),
            },
            'deviation_at_75_percent': {
                'md': float(md[idx_75]),
                'delta_horizontal': float(delta_horizontal[idx_75]),
                'delta_total': float(delta_total[idx_75]),
            },
            'deviation_at_end': {
                'md': float(md[-1]),
                'delta_horizontal': float(delta_horizontal[-1]),
                'delta_total': float(delta_total[-1]),
                'delta_x': float(delta_x[-1]),
                'delta_y': float(delta_y[-1]),
                'delta_z': float(delta_z[-1]),
            },

            # Angular statistics
            'max_delta_inc': float(np.max(np.abs(delta_inc))),
            'max_delta_azi': float(np.max(np.abs(delta_azi))),
            'avg_delta_inc': float(np.mean(np.abs(delta_inc))),
            'avg_delta_azi': float(np.mean(np.abs(delta_azi))),
            'std_delta_inc': float(np.std(delta_inc)),
            'std_delta_azi': float(np.std(delta_azi)),

            # Data point count
            'point_count': int(n),
        }

        return statistics

    @staticmethod
    def apply_ratio_factor(deltas: np.ndarray, ratio_factor: int) -> np.ndarray:
        """
        Apply ratio factor to deltas for visualization scaling.

        Args:
            deltas: Array of delta values
            ratio_factor: Scaling factor (1-100)

        Returns:
            Scaled delta array
        """
        return deltas * ratio_factor
