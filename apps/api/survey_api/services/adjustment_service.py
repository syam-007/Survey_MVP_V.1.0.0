"""
Curve Adjustment Service

Handles offset calculations, cumulative adjustments, and recalculation
of survey data (INC/AZI) from adjusted wellbore paths.
"""
import logging
import numpy as np
from typing import Dict, List, Tuple
from survey_api.models import CurveAdjustment, ComparisonResult

logger = logging.getLogger(__name__)


class AdjustmentService:
    """Service for managing curve adjustments and calculations."""

    @staticmethod
    def apply_offset(
        comparison_id: str,
        md_start: float,
        md_end: float,
        x_offset: float,
        y_offset: float,
        z_offset: float,
        user
    ) -> Dict:
        """
        Apply offsets to comparative survey within specified MD range.

        Args:
            comparison_id: UUID of comparison
            md_start: Starting MD for offset
            md_end: Ending MD for offset
            x_offset: Easting offset in meters
            y_offset: Northing offset in meters
            z_offset: TVD offset in meters
            user: User applying the adjustment

        Returns:
            Dict with adjusted coordinates and adjustment metadata
        """
        try:
            # Get comparison
            comparison = ComparisonResult.objects.get(id=comparison_id)

            # Get current adjustment or use original comparison data
            current_adj = CurveAdjustment.objects.filter(
                comparison=comparison,
                is_current=True
            ).order_by('-adjustment_sequence').first()

            if current_adj:
                # Start from current adjusted state
                base_md = np.array(current_adj.md_data)
                base_north = np.array(current_adj.north_adjusted)
                base_east = np.array(current_adj.east_adjusted)
                base_tvd = np.array(current_adj.tvd_adjusted)
                sequence = current_adj.adjustment_sequence + 1
            else:
                # Start from original comparison survey
                base_md = np.array(comparison.md_data)
                base_north = np.array(comparison.comparison_northing)
                base_east = np.array(comparison.comparison_easting)
                base_tvd = np.array(comparison.comparison_tvd)
                sequence = 1

            # Apply offsets within MD range
            adjusted_north = base_north.copy()
            adjusted_east = base_east.copy()
            adjusted_tvd = base_tvd.copy()

            mask = (base_md >= md_start) & (base_md <= md_end)
            adjusted_east[mask] += x_offset
            adjusted_north[mask] += y_offset
            adjusted_tvd[mask] += z_offset

            # Mark previous adjustment as not current
            if current_adj:
                current_adj.is_current = False
                current_adj.save()

            # Create new adjustment record
            new_adjustment = CurveAdjustment.objects.create(
                comparison=comparison,
                md_start=md_start,
                md_end=md_end,
                x_offset=x_offset,
                y_offset=y_offset,
                z_offset=z_offset,
                md_data=base_md.tolist(),
                north_adjusted=adjusted_north.tolist(),
                east_adjusted=adjusted_east.tolist(),
                tvd_adjusted=adjusted_tvd.tolist(),
                adjustment_sequence=sequence,
                is_current=True,
                created_by=user
            )

            logger.info(f"Applied adjustment {new_adjustment.id} to comparison {comparison_id}")

            return {
                'adjustment_id': str(new_adjustment.id),
                'sequence': sequence,
                'md_data': base_md.tolist(),
                'north_adjusted': adjusted_north.tolist(),
                'east_adjusted': adjusted_east.tolist(),
                'tvd_adjusted': adjusted_tvd.tolist(),
                'points_affected': int(np.sum(mask))
            }

        except ComparisonResult.DoesNotExist:
            raise ValueError(f"Comparison {comparison_id} not found")
        except Exception as e:
            logger.error(f"Failed to apply offset: {str(e)}")
            raise

    @staticmethod
    def undo_adjustment(comparison_id: str) -> Dict:
        """
        Undo the last adjustment and restore previous state.

        Args:
            comparison_id: UUID of comparison

        Returns:
            Dict with restored coordinates or None if no history
        """
        try:
            comparison = ComparisonResult.objects.get(id=comparison_id)

            # Get current adjustment
            current_adj = CurveAdjustment.objects.filter(
                comparison=comparison,
                is_current=True
            ).first()

            if not current_adj or current_adj.adjustment_sequence == 1:
                # No adjustment to undo, return original data
                return {
                    'md_data': comparison.md_data,
                    'north_adjusted': comparison.comparison_northing,
                    'east_adjusted': comparison.comparison_easting,
                    'tvd_adjusted': comparison.comparison_tvd,
                    'sequence': 0,
                    'message': 'No adjustment to undo, showing original data'
                }

            # Mark current as not current
            current_adj.is_current = False
            current_adj.save()

            # Get previous adjustment
            previous_adj = CurveAdjustment.objects.filter(
                comparison=comparison,
                adjustment_sequence=current_adj.adjustment_sequence - 1
            ).first()

            if previous_adj:
                previous_adj.is_current = True
                previous_adj.save()

                return {
                    'adjustment_id': str(previous_adj.id),
                    'sequence': previous_adj.adjustment_sequence,
                    'md_data': previous_adj.md_data,
                    'north_adjusted': previous_adj.north_adjusted,
                    'east_adjusted': previous_adj.east_adjusted,
                    'tvd_adjusted': previous_adj.tvd_adjusted
                }
            else:
                # Return original comparison data
                return {
                    'md_data': comparison.md_data,
                    'north_adjusted': comparison.comparison_northing,
                    'east_adjusted': comparison.comparison_easting,
                    'tvd_adjusted': comparison.comparison_tvd,
                    'sequence': 0
                }

        except ComparisonResult.DoesNotExist:
            raise ValueError(f"Comparison {comparison_id} not found")

    @staticmethod
    def redo_adjustment(comparison_id: str) -> Dict:
        """
        Redo the next adjustment in history.

        Args:
            comparison_id: UUID of comparison

        Returns:
            Dict with restored coordinates or None if no forward history
        """
        try:
            comparison = ComparisonResult.objects.get(id=comparison_id)

            # Get current adjustment
            current_adj = CurveAdjustment.objects.filter(
                comparison=comparison,
                is_current=True
            ).first()

            current_sequence = current_adj.adjustment_sequence if current_adj else 0

            # Get next adjustment
            next_adj = CurveAdjustment.objects.filter(
                comparison=comparison,
                adjustment_sequence=current_sequence + 1
            ).first()

            if not next_adj:
                return {
                    'message': 'No forward state to redo',
                    'sequence': current_sequence
                }

            # Mark current as not current
            if current_adj:
                current_adj.is_current = False
                current_adj.save()

            # Mark next as current
            next_adj.is_current = True
            next_adj.save()

            return {
                'adjustment_id': str(next_adj.id),
                'sequence': next_adj.adjustment_sequence,
                'md_data': next_adj.md_data,
                'north_adjusted': next_adj.north_adjusted,
                'east_adjusted': next_adj.east_adjusted,
                'tvd_adjusted': next_adj.tvd_adjusted
            }

        except ComparisonResult.DoesNotExist:
            raise ValueError(f"Comparison {comparison_id} not found")

    @staticmethod
    def reset_adjustments(comparison_id: str) -> Dict:
        """
        Reset all adjustments and return to original comparison data.

        Args:
            comparison_id: UUID of comparison

        Returns:
            Dict with original comparison coordinates
        """
        try:
            comparison = ComparisonResult.objects.get(id=comparison_id)

            # Mark all adjustments as not current
            CurveAdjustment.objects.filter(
                comparison=comparison
            ).update(is_current=False)

            logger.info(f"Reset all adjustments for comparison {comparison_id}")

            return {
                'md_data': comparison.md_data,
                'north_adjusted': comparison.comparison_northing,
                'east_adjusted': comparison.comparison_easting,
                'tvd_adjusted': comparison.comparison_tvd,
                'sequence': 0,
                'message': 'All adjustments reset to original'
            }

        except ComparisonResult.DoesNotExist:
            raise ValueError(f"Comparison {comparison_id} not found")

    @staticmethod
    def recalculate_inc_azi(comparison_id: str) -> Dict:
        """
        Recalculate INC and AZI from adjusted wellbore path.

        Uses gradient-based calculation from adjusted coordinates.

        Args:
            comparison_id: UUID of comparison

        Returns:
            Dict with recalculated INC and AZI arrays
        """
        try:
            comparison = ComparisonResult.objects.get(id=comparison_id)

            # Get current adjustment
            current_adj = CurveAdjustment.objects.filter(
                comparison=comparison,
                is_current=True
            ).first()

            if not current_adj:
                raise ValueError("No adjusted survey found. Apply offsets first.")

            # Get adjusted coordinates
            md_vals = np.array(current_adj.md_data)
            north_adj = np.array(current_adj.north_adjusted)
            east_adj = np.array(current_adj.east_adjusted)
            tvd_adj = np.array(current_adj.tvd_adjusted)

            # Calculate gradients relative to MD
            dN = np.gradient(north_adj, md_vals)
            dE = np.gradient(east_adj, md_vals)
            dTVD = np.gradient(tvd_adj, md_vals)

            # Compute INC (inclination)
            # INC = arctan(sqrt(dN^2 + dE^2) / dTVD)
            inc_recalc = np.degrees(np.arctan2(np.sqrt(dN**2 + dE**2), dTVD))

            # Compute AZI (azimuth)
            # AZI = arctan2(dE, dN) converted to 0-360 range
            azi_recalc = (np.degrees(np.arctan2(dE, dN)) + 360) % 360

            # Update adjustment with recalculated values
            current_adj.inc_recalculated = inc_recalc.tolist()
            current_adj.azi_recalculated = azi_recalc.tolist()
            current_adj.save()

            logger.info(f"Recalculated INC/AZI for adjustment {current_adj.id}")

            return {
                'adjustment_id': str(current_adj.id),
                'sequence': current_adj.adjustment_sequence,
                'md_data': md_vals.tolist(),
                'north_adjusted': north_adj.tolist(),
                'east_adjusted': east_adj.tolist(),
                'tvd_adjusted': tvd_adj.tolist(),
                'inc_recalculated': inc_recalc.tolist(),
                'azi_recalculated': azi_recalc.tolist(),
                'has_adjustment': True
            }

        except ComparisonResult.DoesNotExist:
            raise ValueError(f"Comparison {comparison_id} not found")

    @staticmethod
    def get_current_adjustment(comparison_id: str) -> Dict:
        """
        Get the current adjustment state for a comparison.

        Args:
            comparison_id: UUID of comparison

        Returns:
            Dict with current adjustment data or original comparison data
        """
        try:
            comparison = ComparisonResult.objects.get(id=comparison_id)

            current_adj = CurveAdjustment.objects.filter(
                comparison=comparison,
                is_current=True
            ).first()

            if current_adj:
                result = {
                    'adjustment_id': str(current_adj.id),
                    'sequence': current_adj.adjustment_sequence,
                    'md_data': current_adj.md_data,
                    'north_adjusted': current_adj.north_adjusted,
                    'east_adjusted': current_adj.east_adjusted,
                    'tvd_adjusted': current_adj.tvd_adjusted,
                    'has_adjustment': True
                }

                if current_adj.inc_recalculated:
                    result['inc_recalculated'] = current_adj.inc_recalculated
                    result['azi_recalculated'] = current_adj.azi_recalculated

                return result
            else:
                return {
                    'md_data': comparison.md_data,
                    'north_adjusted': comparison.comparison_northing,
                    'east_adjusted': comparison.comparison_easting,
                    'tvd_adjusted': comparison.comparison_tvd,
                    'sequence': 0,
                    'has_adjustment': False
                }

        except ComparisonResult.DoesNotExist:
            raise ValueError(f"Comparison {comparison_id} not found")
