"""
Survey comparison service using welleng library.

This service handles:
- Interpolation of reference and comparative surveys
- Calculation of deltas (INC, AZI, position)
- 3D displacement calculations
"""
import numpy as np
import welleng as we
from typing import Dict, List, Tuple, Any
import logging

logger = logging.getLogger(__name__)


class SurveyComparisonService:
    """
    Service for comparing two surveys and calculating deltas.

    Uses welleng library for survey calculations and interpolation.
    """

    @staticmethod
    def manual_interpolation(
        ref_md: List[float],
        ref_inc: List[float],
        ref_azi: List[float],
        cmp_md: List[float],
        cmp_inc: List[float],
        cmp_azi: List[float],
        step: float
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Manually interpolate both surveys to common MD points.

        Args:
            ref_md: Reference survey MD values
            ref_inc: Reference survey inclination values
            ref_azi: Reference survey azimuth values
            cmp_md: Comparative survey MD values
            cmp_inc: Comparative survey inclination values
            cmp_azi: Comparative survey azimuth values
            step: Interpolation step size

        Returns:
            Tuple of (md_common, inc_ref, azi_ref, inc_cmp, azi_cmp)
        """
        # Find common MD range
        md_min = max(min(ref_md), min(cmp_md))
        md_max = min(max(ref_md), max(cmp_md))

        # Create common MD array
        md_common = np.arange(md_min, md_max + step, step)
        md_common = np.unique(np.sort(md_common))

        # Interpolate reference survey
        inc_ref = np.interp(md_common, ref_md, ref_inc)
        azi_ref = np.interp(md_common, ref_md, ref_azi)

        # Interpolate comparative survey
        inc_cmp = np.interp(md_common, cmp_md, cmp_inc)
        azi_cmp = np.interp(md_common, cmp_md, cmp_azi)

        logger.info(
            f"Interpolated surveys: {len(md_common)} points from "
            f"MD {md_common[0]:.2f} to {md_common[-1]:.2f}"
        )

        return md_common, inc_ref, azi_ref, inc_cmp, azi_cmp

    @staticmethod
    def create_welleng_survey(
        md: np.ndarray,
        inc: np.ndarray,
        azi: np.ndarray,
        start_xyz: List[float] = None
    ) -> we.survey.Survey:
        """
        Create a welleng Survey object from MD, INC, AZI arrays.

        Args:
            md: Measured depth array
            inc: Inclination array (degrees)
            azi: Azimuth array (degrees)
            start_xyz: Starting coordinates [x, y, z]. Default [0, 0, 0]

        Returns:
            welleng Survey object with calculated positions
        """
        if start_xyz is None:
            start_xyz = [0, 0, 0]

        survey = we.survey.Survey(
            md=md,
            inc=inc,
            azi=azi,
            start_xyz=start_xyz
        )

        logger.info(f"Created welleng survey with {len(md)} stations")

        return survey

    @classmethod
    def compare_surveys(
        cls,
        reference_data: Dict[str, List[float]],
        comparative_data: Dict[str, List[float]],
        step: float = 10.0,
        start_xyz: List[float] = None
    ) -> Dict[str, Any]:
        """
        Compare two surveys and calculate deltas.

        Args:
            reference_data: Dict with keys 'md', 'inc', 'azi' containing reference survey data
            comparative_data: Dict with keys 'md', 'inc', 'azi' containing comparative survey data
            step: Interpolation step size (default 10.0)
            start_xyz: Starting coordinates [x, y, z]. Default [0, 0, 0]

        Returns:
            Dictionary containing:
            - comparison_points: List of dicts with MD, positions, and deltas
            - summary: Overall comparison statistics
        """
        try:
            logger.info("Starting survey comparison")

            # Extract data
            ref_md = np.array(reference_data['md'])
            ref_inc = np.array(reference_data['inc'])
            ref_azi = np.array(reference_data['azi'])

            cmp_md = np.array(comparative_data['md'])
            cmp_inc = np.array(comparative_data['inc'])
            cmp_azi = np.array(comparative_data['azi'])

            # Interpolate to common MD points
            md_common, inc_ref, azi_ref, inc_cmp, azi_cmp = cls.manual_interpolation(
                ref_md, ref_inc, ref_azi,
                cmp_md, cmp_inc, cmp_azi,
                step
            )

            # Create welleng surveys
            survey_ref = cls.create_welleng_survey(md_common, inc_ref, azi_ref, start_xyz)
            survey_cmp = cls.create_welleng_survey(md_common, inc_cmp, azi_cmp, start_xyz)

            # Calculate deltas
            delta_inc = survey_ref.inc_deg - survey_cmp.inc_deg
            delta_azi = ((survey_ref.azi_grid_deg - survey_cmp.azi_grid_deg) + 180) % 360 - 180

            # Position deltas
            delta_north = survey_ref.n - survey_cmp.n
            delta_east = survey_ref.e - survey_cmp.e
            delta_tvd = survey_ref.tvd - survey_cmp.tvd

            # 3D displacement
            displacement = np.sqrt(delta_north**2 + delta_east**2 + delta_tvd**2)

            # Build comparison points
            comparison_points = []
            for i in range(len(md_common)):
                point = {
                    'md': float(md_common[i]),
                    'reference': {
                        'inc': float(survey_ref.inc_deg[i]),
                        'azi': float(survey_ref.azi_grid_deg[i]),
                        'north': float(survey_ref.n[i]),
                        'east': float(survey_ref.e[i]),
                        'tvd': float(survey_ref.tvd[i]),
                    },
                    'comparative': {
                        'inc': float(survey_cmp.inc_deg[i]),
                        'azi': float(survey_cmp.azi_grid_deg[i]),
                        'north': float(survey_cmp.n[i]),
                        'east': float(survey_cmp.e[i]),
                        'tvd': float(survey_cmp.tvd[i]),
                    },
                    'deltas': {
                        'inc': float(delta_inc[i]),
                        'azi': float(abs(delta_azi[i])),
                        'north': float(delta_north[i]),
                        'east': float(delta_east[i]),
                        'tvd': float(delta_tvd[i]),
                        'displacement': float(displacement[i]),
                    }
                }
                comparison_points.append(point)

            # Calculate summary statistics
            summary = {
                'total_points': len(md_common),
                'md_range': {
                    'min': float(md_common[0]),
                    'max': float(md_common[-1]),
                },
                'max_deltas': {
                    'inc': float(np.max(np.abs(delta_inc))),
                    'azi': float(np.max(np.abs(delta_azi))),
                    'north': float(np.max(np.abs(delta_north))),
                    'east': float(np.max(np.abs(delta_east))),
                    'tvd': float(np.max(np.abs(delta_tvd))),
                    'displacement': float(np.max(displacement)),
                },
                'avg_displacement': float(np.mean(displacement)),
                'max_displacement': float(np.max(displacement)),
                'max_displacement_md': float(md_common[np.argmax(displacement)]),
            }

            logger.info(
                f"Comparison complete: {len(md_common)} points, "
                f"max displacement: {summary['max_displacement']:.3f}"
            )

            return {
                'comparison_points': comparison_points,
                'summary': summary,
            }

        except Exception as e:
            logger.error(f"Error in compare_surveys: {str(e)}")
            raise ValueError(f"Failed to compare surveys: {str(e)}")

    @classmethod
    def get_3d_path_data(
        cls,
        comparison_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract 3D path data for visualization from comparison result.

        Args:
            comparison_result: Result from compare_surveys()

        Returns:
            Dictionary with reference and comparative 3D paths
        """
        points = comparison_result['comparison_points']

        reference_path = {
            'north': [p['reference']['north'] for p in points],
            'east': [p['reference']['east'] for p in points],
            'tvd': [p['reference']['tvd'] for p in points],
        }

        comparative_path = {
            'north': [p['comparative']['north'] for p in points],
            'east': [p['comparative']['east'] for p in points],
            'tvd': [p['comparative']['tvd'] for p in points],
        }

        return {
            'reference': reference_path,
            'comparative': comparative_path,
        }
