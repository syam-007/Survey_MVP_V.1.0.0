"""
Extrapolation Service

Handles survey extrapolation using welleng library.
"""
import logging
import numpy as np
import welleng as we
from typing import Dict, List, Tuple
from survey_api.models import Extrapolation, SurveyData, Run

logger = logging.getLogger(__name__)


class ExtrapolationService:
    """Service for extrapolating survey data beyond the last measured point."""

    @staticmethod
    def calculate_extrapolation(
        survey_data_id: str,
        run_id: str,
        extrapolation_length: float = 200.0,
        extrapolation_step: float = 10.0,
        interpolation_step: float = 10.0,
        extrapolation_method: str = 'Constant',
    ) -> Dict:
        """
        Calculate extrapolation without saving to database.

        Args:
            survey_data_id: UUID of the survey data
            run_id: UUID of the run
            extrapolation_length: How far to extrapolate (meters)
            extrapolation_step: Distance between extrapolated points (meters)
            interpolation_step: Distance between interpolated points (meters)
            extrapolation_method: Method to use (Constant, Linear Trend, Curve Fit)

        Returns:
            Dictionary with extrapolation data (not saved to database)
        """
        try:
            # Get survey data and run
            survey_data = SurveyData.objects.get(id=survey_data_id)
            run = Run.objects.get(id=run_id)

            # Extract original survey data
            original_md = survey_data.md_data
            original_inc = survey_data.inc_data
            original_azi = survey_data.azi_data

            logger.info(f"Calculating extrapolation: {len(original_md)} points, MD range: {original_md[0]}-{original_md[-1]}")

            # Create original welleng survey
            survey_original = we.survey.Survey(
                md=original_md,
                inc=original_inc,
                azi=original_azi
            )

            # Interpolate survey
            survey_interp = survey_original.interpolate_survey(step=interpolation_step)

            # Perform extrapolation
            survey_extrap, extrap_mds = ExtrapolationService._extrapolate_welleng_survey(
                survey_interp,
                extrapolation_length,
                extrapolation_step,
                extrapolation_method
            )

            # Prepare data for response
            # Original data
            original_north = survey_original.n.tolist()
            original_east = survey_original.e.tolist()
            original_tvd = survey_original.tvd.tolist()

            # Interpolated data (excluding original MDs)
            interp_mds_set = set(original_md)
            interpolated_indices = [i for i, md in enumerate(survey_interp.md) if md not in interp_mds_set]

            interpolated_md = [survey_interp.md[i] for i in interpolated_indices]
            interpolated_inc = [survey_interp.inc_deg[i] for i in interpolated_indices]
            interpolated_azi = [survey_interp.azi_grid_deg[i] for i in interpolated_indices]
            interpolated_north = [survey_interp.n[i] for i in interpolated_indices]
            interpolated_east = [survey_interp.e[i] for i in interpolated_indices]
            interpolated_tvd = [survey_interp.tvd[i] for i in interpolated_indices]

            # Extrapolated data
            extrap_start_idx = len(survey_interp.md)
            extrapolated_md = survey_extrap.md[extrap_start_idx:].tolist()
            extrapolated_inc = survey_extrap.inc_deg[extrap_start_idx:].tolist()
            extrapolated_azi = survey_extrap.azi_grid_deg[extrap_start_idx:].tolist()
            extrapolated_north = survey_extrap.n[extrap_start_idx:].tolist()
            extrapolated_east = survey_extrap.e[extrap_start_idx:].tolist()
            extrapolated_tvd = survey_extrap.tvd[extrap_start_idx:].tolist()

            # Combined data
            combined_md = survey_extrap.md.tolist()
            combined_inc = survey_extrap.inc_deg.tolist()
            combined_azi = survey_extrap.azi_grid_deg.tolist()
            combined_north = survey_extrap.n.tolist()
            combined_east = survey_extrap.e.tolist()
            combined_tvd = survey_extrap.tvd.tolist()

            # Calculate statistics
            final_md = combined_md[-1]
            final_tvd = combined_tvd[-1]
            final_horizontal_displacement = np.sqrt(combined_east[-1]**2 + combined_north[-1]**2)

            # Return data dictionary (not saved)
            return {
                'survey_data_id': survey_data_id,
                'run_id': run_id,
                'survey_file_name': survey_data.survey_file.file_name,
                'extrapolation_length': extrapolation_length,
                'extrapolation_step': extrapolation_step,
                'interpolation_step': interpolation_step,
                'extrapolation_method': extrapolation_method,
                # Original data
                'original_md': original_md,
                'original_inc': original_inc,
                'original_azi': original_azi,
                'original_north': original_north,
                'original_east': original_east,
                'original_tvd': original_tvd,
                # Interpolated data
                'interpolated_md': interpolated_md,
                'interpolated_inc': interpolated_inc,
                'interpolated_azi': interpolated_azi,
                'interpolated_north': interpolated_north,
                'interpolated_east': interpolated_east,
                'interpolated_tvd': interpolated_tvd,
                # Extrapolated data
                'extrapolated_md': extrapolated_md,
                'extrapolated_inc': extrapolated_inc,
                'extrapolated_azi': extrapolated_azi,
                'extrapolated_north': extrapolated_north,
                'extrapolated_east': extrapolated_east,
                'extrapolated_tvd': extrapolated_tvd,
                # Combined data
                'combined_md': combined_md,
                'combined_inc': combined_inc,
                'combined_azi': combined_azi,
                'combined_north': combined_north,
                'combined_east': combined_east,
                'combined_tvd': combined_tvd,
                # Statistics
                'original_point_count': len(original_md),
                'interpolated_point_count': len(interpolated_md),
                'extrapolated_point_count': len(extrapolated_md),
                'final_md': final_md,
                'final_tvd': final_tvd,
                'final_horizontal_displacement': final_horizontal_displacement,
            }

        except SurveyData.DoesNotExist:
            raise ValueError(f"Survey data {survey_data_id} not found")
        except Run.DoesNotExist:
            raise ValueError(f"Run {run_id} not found")
        except Exception as e:
            logger.error(f"Extrapolation calculation failed: {str(e)}")
            raise

    @staticmethod
    def extrapolate_survey(
        survey_data_id: str,
        run_id: str,
        extrapolation_length: float = 200.0,
        extrapolation_step: float = 10.0,
        interpolation_step: float = 10.0,
        extrapolation_method: str = 'Constant',
        user=None
    ) -> Extrapolation:
        """
        Extrapolate survey data beyond the last measured point.

        Args:
            survey_data_id: UUID of the survey data
            run_id: UUID of the run
            extrapolation_length: How far to extrapolate (meters)
            extrapolation_step: Distance between extrapolated points (meters)
            interpolation_step: Distance between interpolated points (meters)
            extrapolation_method: Method to use (Constant, Linear Trend, Curve Fit)
            user: User performing the extrapolation

        Returns:
            Extrapolation object with all data
        """
        try:
            # Get survey data and run
            survey_data = SurveyData.objects.get(id=survey_data_id)
            run = Run.objects.get(id=run_id)

            # Extract original survey data
            original_md = survey_data.md_data
            original_inc = survey_data.inc_data
            original_azi = survey_data.azi_data

            logger.info(f"Original survey: {len(original_md)} points, MD range: {original_md[0]}-{original_md[-1]}")

            # Create original welleng survey
            survey_original = we.survey.Survey(
                md=original_md,
                inc=original_inc,
                azi=original_azi
            )

            # Interpolate survey
            survey_interp = survey_original.interpolate_survey(step=interpolation_step)

            # Perform extrapolation
            survey_extrap, extrap_mds = ExtrapolationService._extrapolate_welleng_survey(
                survey_interp,
                extrapolation_length,
                extrapolation_step,
                extrapolation_method
            )

            # Prepare data for storage
            # Original data
            original_north = survey_original.n.tolist()
            original_east = survey_original.e.tolist()
            original_tvd = survey_original.tvd.tolist()

            # Interpolated data (excluding original MDs)
            interp_mds_set = set(original_md)
            interpolated_indices = [i for i, md in enumerate(survey_interp.md) if md not in interp_mds_set]

            interpolated_md = [survey_interp.md[i] for i in interpolated_indices]
            interpolated_inc = [survey_interp.inc_deg[i] for i in interpolated_indices]
            interpolated_azi = [survey_interp.azi_grid_deg[i] for i in interpolated_indices]
            interpolated_north = [survey_interp.n[i] for i in interpolated_indices]
            interpolated_east = [survey_interp.e[i] for i in interpolated_indices]
            interpolated_tvd = [survey_interp.tvd[i] for i in interpolated_indices]

            # Extrapolated data
            extrap_start_idx = len(survey_interp.md)
            extrapolated_md = survey_extrap.md[extrap_start_idx:].tolist()
            extrapolated_inc = survey_extrap.inc_deg[extrap_start_idx:].tolist()
            extrapolated_azi = survey_extrap.azi_grid_deg[extrap_start_idx:].tolist()
            extrapolated_north = survey_extrap.n[extrap_start_idx:].tolist()
            extrapolated_east = survey_extrap.e[extrap_start_idx:].tolist()
            extrapolated_tvd = survey_extrap.tvd[extrap_start_idx:].tolist()

            # Combined data
            combined_md = survey_extrap.md.tolist()
            combined_inc = survey_extrap.inc_deg.tolist()
            combined_azi = survey_extrap.azi_grid_deg.tolist()
            combined_north = survey_extrap.n.tolist()
            combined_east = survey_extrap.e.tolist()
            combined_tvd = survey_extrap.tvd.tolist()

            # Calculate statistics
            final_md = combined_md[-1]
            final_tvd = combined_tvd[-1]
            final_horizontal_displacement = np.sqrt(combined_east[-1]**2 + combined_north[-1]**2)

            # Create Extrapolation object
            extrapolation = Extrapolation.objects.create(
                survey_data=survey_data,
                run=run,
                created_by=user,
                extrapolation_length=extrapolation_length,
                extrapolation_step=extrapolation_step,
                interpolation_step=interpolation_step,
                extrapolation_method=extrapolation_method,
                # Original data
                original_md=original_md,
                original_inc=original_inc,
                original_azi=original_azi,
                original_north=original_north,
                original_east=original_east,
                original_tvd=original_tvd,
                # Interpolated data
                interpolated_md=interpolated_md,
                interpolated_inc=interpolated_inc,
                interpolated_azi=interpolated_azi,
                interpolated_north=interpolated_north,
                interpolated_east=interpolated_east,
                interpolated_tvd=interpolated_tvd,
                # Extrapolated data
                extrapolated_md=extrapolated_md,
                extrapolated_inc=extrapolated_inc,
                extrapolated_azi=extrapolated_azi,
                extrapolated_north=extrapolated_north,
                extrapolated_east=extrapolated_east,
                extrapolated_tvd=extrapolated_tvd,
                # Combined data
                combined_md=combined_md,
                combined_inc=combined_inc,
                combined_azi=combined_azi,
                combined_north=combined_north,
                combined_east=combined_east,
                combined_tvd=combined_tvd,
                # Statistics
                original_point_count=len(original_md),
                interpolated_point_count=len(interpolated_md),
                extrapolated_point_count=len(extrapolated_md),
                final_md=final_md,
                final_tvd=final_tvd,
                final_horizontal_displacement=final_horizontal_displacement,
            )

            logger.info(f"Extrapolation created: {extrapolation.id}")
            return extrapolation

        except SurveyData.DoesNotExist:
            raise ValueError(f"Survey data {survey_data_id} not found")
        except Run.DoesNotExist:
            raise ValueError(f"Run {run_id} not found")
        except Exception as e:
            logger.error(f"Extrapolation failed: {str(e)}")
            raise

    @staticmethod
    def _extrapolate_welleng_survey(
        survey: we.survey.Survey,
        length: float,
        step: float,
        method: str
    ) -> Tuple[we.survey.Survey, np.ndarray]:
        """
        Extrapolate a welleng survey.

        Args:
            survey: Welleng survey object
            length: Extrapolation length in meters
            step: Step size for extrapolation
            method: Extrapolation method (Constant, Linear Trend, Curve Fit)

        Returns:
            Tuple of (extrapolated_survey, extrapolation_mds)
        """
        if length <= 0:
            return survey, np.array([])

        last_md = survey.md[-1]
        extrapolation_mds = np.arange(last_md + step, last_md + length + step, step)

        if method == "Constant":
            # Use last values
            extrapolated_incs = [survey.inc_deg[-1]] * len(extrapolation_mds)
            extrapolated_azis = [survey.azi_grid_deg[-1]] * len(extrapolation_mds)

        elif method == "Linear Trend":
            # Use linear trend from last 5 points
            n_points = min(5, len(survey.inc_deg))
            if n_points > 1:
                inc_trend = np.polyfit(survey.md[-n_points:], survey.inc_deg[-n_points:], 1)
                azi_trend = np.polyfit(survey.md[-n_points:], survey.azi_grid_deg[-n_points:], 1)
                extrapolated_incs = np.polyval(inc_trend, extrapolation_mds)
                extrapolated_azis = np.polyval(azi_trend, extrapolation_mds)
            else:
                extrapolated_incs = [survey.inc_deg[-1]] * len(extrapolation_mds)
                extrapolated_azis = [survey.azi_grid_deg[-1]] * len(extrapolation_mds)

        elif method == "Curve Fit":
            # Use polynomial curve fitting from last 10 points
            n_points = min(10, len(survey.inc_deg))
            if n_points > 2:
                inc_fit = np.polyfit(survey.md[-n_points:], survey.inc_deg[-n_points:], 2)
                azi_fit = np.polyfit(survey.md[-n_points:], survey.azi_grid_deg[-n_points:], 2)
                extrapolated_incs = np.polyval(inc_fit, extrapolation_mds)
                extrapolated_azis = np.polyval(azi_fit, extrapolation_mds)
            else:
                extrapolated_incs = [survey.inc_deg[-1]] * len(extrapolation_mds)
                extrapolated_azis = [survey.azi_grid_deg[-1]] * len(extrapolation_mds)
        else:
            # Default to constant
            extrapolated_incs = [survey.inc_deg[-1]] * len(extrapolation_mds)
            extrapolated_azis = [survey.azi_grid_deg[-1]] * len(extrapolation_mds)

        # Combine data
        combined_md = np.concatenate([survey.md, extrapolation_mds])
        combined_inc = np.concatenate([survey.inc_deg, extrapolated_incs])
        combined_azi = np.concatenate([survey.azi_grid_deg, extrapolated_azis])

        # Create extrapolated survey
        extrapolated_survey = we.survey.Survey(
            md=combined_md.tolist(),
            inc=combined_inc.tolist(),
            azi=combined_azi.tolist()
        )

        return extrapolated_survey, extrapolation_mds
