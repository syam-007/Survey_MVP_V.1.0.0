"""
Duplicate Survey Service

Handles duplicate survey calculations:
- Forward calculation (MD/INC/AZI → N/E/TVD)
- Inverse calculation (N/E/TVD → INC/AZI)
- Comparison of results
"""
import logging
import numpy as np
import welleng as we
import time
from typing import Dict, Tuple
from survey_api.models import SurveyData

logger = logging.getLogger(__name__)


class DuplicateSurveyService:
    """Service for duplicate survey calculations with forward and inverse methods."""

    @staticmethod
    def ensure_surface_point(md: np.ndarray, inc: np.ndarray, azi: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Ensure surface point (MD=0, INC=0, AZI=0) exists at the start.

        Args:
            md: Measured depth array
            inc: Inclination array
            azi: Azimuth array

        Returns:
            Tuple of (md, inc, azi) with surface point added if missing
        """
        if md[0] != 0:
            md = np.insert(md, 0, 0)
            inc = np.insert(inc, 0, 0)
            azi = np.insert(azi, 0, 0)
            logger.info("Added surface point at MD=0")
        return md, inc, azi

    @staticmethod
    def calculate_forward(md: np.ndarray, inc: np.ndarray, azi: np.ndarray) -> we.survey.Survey:
        """
        Calculate forward survey (MD/INC/AZI → positions).

        Args:
            md: Measured depth array
            inc: Inclination array (degrees)
            azi: Azimuth array (degrees)

        Returns:
            welleng Survey object with calculated positions
        """
        survey = we.survey.Survey(
            md=md,
            inc=inc,
            azi=azi,
            start_xyz=[0, 0, 0],
            unit='meters'
        )
        return survey

    @staticmethod
    def interpolate_survey(survey: we.survey.Survey, step: float = 10.0) -> we.survey.Survey:
        """
        Interpolate survey at regular intervals.

        Args:
            survey: welleng Survey object
            step: Interpolation step in meters

        Returns:
            Interpolated survey
        """
        return survey.interpolate_survey(step=step)

    @staticmethod
    def calculate_inverse(
        md: np.ndarray,
        north: np.ndarray,
        east: np.ndarray,
        tvd: np.ndarray,
        iterations: int = 100
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calculate inverse survey (positions → INC/AZI) using iterative optimization.

        Args:
            md: Measured depth array
            north: North coordinate array
            east: East coordinate array
            tvd: True vertical depth array
            iterations: Number of optimization iterations

        Returns:
            Tuple of (inclination, azimuth) arrays in degrees
        """
        # Initial guess: calculate inc/azi from consecutive points
        best_inc = np.zeros(len(md))
        best_azi = np.zeros(len(md))

        for i in range(1, len(md)):
            delta_n = north[i] - north[i-1]
            delta_e = east[i] - east[i-1]
            delta_tvd = tvd[i] - tvd[i-1]
            delta_md = md[i] - md[i-1]

            if delta_md > 0:
                # Calculate inclination
                inc_rad = np.arccos(delta_tvd / delta_md) if abs(delta_tvd / delta_md) <= 1 else 0
                best_inc[i] = np.degrees(inc_rad)

                # Calculate azimuth
                if abs(delta_n) > 1e-10 or abs(delta_e) > 1e-10:
                    azi_rad = np.arctan2(delta_e, delta_n)
                    best_azi[i] = np.degrees(azi_rad) % 360

        # Iterative optimization to minimize position error
        best_error = float('inf')

        for iteration in range(iterations):
            # Add random perturbations
            if iteration > 0:
                inc_try = best_inc + np.random.normal(0, 0.5, len(md))
                azi_try = best_azi + np.random.normal(0, 5, len(md))

                # Constrain values
                inc_try = np.clip(inc_try, 0, 180)
                azi_try = azi_try % 360
            else:
                inc_try = best_inc.copy()
                azi_try = best_azi.copy()

            try:
                # Calculate survey from trial inc/azi
                trial_survey = we.survey.Survey(
                    md=md,
                    inc=inc_try,
                    azi=azi_try,
                    start_xyz=[0, 0, 0],
                    unit='meters'
                )

                # Calculate position error
                error_n = np.sum((trial_survey.n - north) ** 2)
                error_e = np.sum((trial_survey.e - east) ** 2)
                error_tvd = np.sum((trial_survey.tvd - tvd) ** 2)
                total_error = np.sqrt(error_n + error_e + error_tvd)

                # Keep best result
                if total_error < best_error:
                    best_error = total_error
                    best_inc = inc_try.copy()
                    best_azi = azi_try.copy()

            except Exception as e:
                logger.debug(f"Iteration {iteration} failed: {str(e)}")
                continue

        logger.info(f"Inverse calculation converged with error: {best_error:.6f}m after {iterations} iterations")
        return best_inc, best_azi

    @staticmethod
    def calculate_duplicate_survey(
        survey_data_id: str,
        interpolation_step: float = 10.0
    ) -> Dict:
        """
        Calculate duplicate survey with forward, inverse, and comparison.

        Args:
            survey_data_id: UUID of the survey data
            interpolation_step: Step size for interpolation (meters)

        Returns:
            Dictionary with forward, inverse, and comparison results (not saved to database)
        """
        start_time = time.time()

        try:
            # Get survey data
            survey_data = SurveyData.objects.get(id=survey_data_id)

            # Extract original data
            original_md = np.array(survey_data.md_data)
            original_inc = np.array(survey_data.inc_data)
            original_azi = np.array(survey_data.azi_data)

            logger.info(f"Duplicate survey calculation: {len(original_md)} points, MD range: {original_md[0]}-{original_md[-1]}")

            # Ensure surface point
            md, inc, azi = DuplicateSurveyService.ensure_surface_point(
                original_md, original_inc, original_azi
            )

            # Forward calculation (MD/INC/AZI → positions)
            forward_start = time.time()
            survey_forward = DuplicateSurveyService.calculate_forward(md, inc, azi)

            # Interpolate survey
            survey_interp = DuplicateSurveyService.interpolate_survey(survey_forward, interpolation_step)
            forward_time = time.time() - forward_start

            # Extract interpolated data for inverse calculation
            interp_md = survey_interp.md
            interp_north = survey_interp.n
            interp_east = survey_interp.e
            interp_tvd = survey_interp.tvd
            interp_inc = survey_interp.inc_deg
            interp_azi = survey_interp.azi_grid_deg

            # Inverse calculation (positions → INC/AZI)
            inverse_start = time.time()
            inverse_inc, inverse_azi = DuplicateSurveyService.calculate_inverse(
                interp_md, interp_north, interp_east, interp_tvd, iterations=100
            )
            inverse_time = time.time() - inverse_start

            # Calculate inverse survey positions for comparison
            survey_inverse = DuplicateSurveyService.calculate_forward(
                interp_md, inverse_inc, inverse_azi
            )

            # Calculate comparison deltas
            delta_inc = interp_inc - inverse_inc
            delta_azi = interp_azi - inverse_azi

            # Handle azimuth wrap-around (e.g., 359° vs 1°)
            delta_azi = np.where(delta_azi > 180, delta_azi - 360, delta_azi)
            delta_azi = np.where(delta_azi < -180, delta_azi + 360, delta_azi)

            delta_north = interp_north - survey_inverse.n
            delta_east = interp_east - survey_inverse.e
            delta_tvd = interp_tvd - survey_inverse.tvd

            # Calculate limit values (delta/MD)
            limit_north = np.where(interp_md > 0, delta_north / interp_md, 0)
            limit_east = np.where(interp_md > 0, delta_east / interp_md, 0)
            limit_tvd = np.where(interp_md > 0, delta_tvd / interp_md, 0)

            total_time = time.time() - start_time

            # Return comprehensive results
            return {
                'survey_data_id': survey_data_id,
                'survey_file_name': survey_data.survey_file.file_name,
                'interpolation_step': interpolation_step,

                # Original data
                'original_md': original_md.tolist(),
                'original_inc': original_inc.tolist(),
                'original_azi': original_azi.tolist(),

                # Forward results (interpolated)
                'forward_md': interp_md.tolist(),
                'forward_inc': interp_inc.tolist(),
                'forward_azi': interp_azi.tolist(),
                'forward_north': interp_north.tolist(),
                'forward_east': interp_east.tolist(),
                'forward_tvd': interp_tvd.tolist(),

                # Inverse results
                'inverse_inc': inverse_inc.tolist(),
                'inverse_azi': inverse_azi.tolist(),
                'inverse_north': survey_inverse.n.tolist(),
                'inverse_east': survey_inverse.e.tolist(),
                'inverse_tvd': survey_inverse.tvd.tolist(),

                # Comparison deltas
                'delta_inc': delta_inc.tolist(),
                'delta_azi': delta_azi.tolist(),
                'delta_north': delta_north.tolist(),
                'delta_east': delta_east.tolist(),
                'delta_tvd': delta_tvd.tolist(),

                # Limit values
                'limit_north': limit_north.tolist(),
                'limit_east': limit_east.tolist(),
                'limit_tvd': limit_tvd.tolist(),

                # Statistics
                'point_count': len(interp_md),
                'max_delta_inc': float(np.max(np.abs(delta_inc))),
                'max_delta_azi': float(np.max(np.abs(delta_azi))),
                'max_delta_north': float(np.max(np.abs(delta_north))),
                'max_delta_east': float(np.max(np.abs(delta_east))),
                'max_delta_tvd': float(np.max(np.abs(delta_tvd))),

                # Processing time
                'forward_calculation_time': forward_time,
                'inverse_calculation_time': inverse_time,
                'total_calculation_time': total_time,
            }

        except SurveyData.DoesNotExist:
            raise ValueError(f"Survey data {survey_data_id} not found")
        except Exception as e:
            logger.error(f"Duplicate survey calculation failed: {str(e)}")
            raise
