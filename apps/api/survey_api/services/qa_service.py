"""
Quality Assurance service for GTL survey validation.
"""
import logging
from typing import Dict, List, Any
from decimal import Decimal

logger = logging.getLogger(__name__)


class QAService:
    """Service for performing QA calculations on GTL survey data."""

    @staticmethod
    def calculate_qa_metrics(
        md_data: List[float],
        inc_data: List[float],
        azi_data: List[float],
        gt_data: List[float],
        wt_data: List[float],
        location_g_t: float,
        location_w_t: float
    ) -> Dict[str, Any]:
        """
        Calculate QA metrics for GTL survey data.

        Compares uploaded G(t) and W(t) values against calculated values
        from the well location to determine quality status for each station.

        Args:
            md_data: Measured Depth array
            inc_data: Inclination array
            azi_data: Azimuth array
            gt_data: G(t) values from uploaded file
            wt_data: W(t) values from uploaded file
            location_g_t: Calculated G(t) from well location
            location_w_t: Calculated W(t) from well location

        Returns:
            Dictionary containing:
                - g_t_difference_data: List of G(t) differences
                - w_t_difference_data: List of W(t) differences
                - g_t_status_data: List of G(t) status (high/good/low/n/c)
                - w_t_status_data: List of W(t) status (high/good/low/n/c)
                - overall_status_data: List of overall status (PASS/REMOVE)
                - total_g_t_difference: Total G(t) difference
                - total_w_t_difference: Total W(t) difference
                - total_g_t_difference_pass: Total G(t) difference for PASS stations
                - total_w_t_difference_pass: Total W(t) difference for PASS stations
                - g_t_percentage: G(t) quality percentage
                - w_t_percentage: W(t) quality percentage
                - pass_count: Number of PASS stations
                - remove_count: Number of REMOVE stations

        Raises:
            ValueError: If data arrays have different lengths
        """
        try:
            logger.info(f"Starting QA calculation for {len(md_data)} stations")

            # Validate array lengths
            if not (len(md_data) == len(inc_data) == len(azi_data) == len(gt_data) == len(wt_data)):
                raise ValueError(
                    f"Array length mismatch: MD={len(md_data)}, INC={len(inc_data)}, "
                    f"AZI={len(azi_data)}, G(t)={len(gt_data)}, W(t)={len(wt_data)}"
                )

            # Initialize result arrays
            g_t_difference_data = []
            w_t_difference_data = []
            g_t_status_data = []
            w_t_status_data = []
            overall_status_data = []

            # Initialize totals
            total_g_t_difference = 0.0
            total_w_t_difference = 0.0
            total_g_t_difference_pass = 0.0
            total_w_t_difference_pass = 0.0
            pass_count = 0
            remove_count = 0

            # Process each station
            for i in range(len(md_data)):
                g_t = gt_data[i]
                w_t = wt_data[i]

                # Skip if G(t) or W(t) is None
                if g_t is None or w_t is None:
                    logger.warning(f"Station {i} has None G(t) or W(t), skipping")
                    g_t_difference_data.append(0.0)
                    w_t_difference_data.append(0.0)
                    g_t_status_data.append('n/c')
                    w_t_status_data.append('n/c')
                    overall_status_data.append('REMOVE')
                    remove_count += 1
                    continue

                # Calculate differences (Location value - File value)
                g_t_difference = round(location_g_t - g_t, 2)
                w_t_difference = round(location_w_t - w_t, 2)

                total_g_t_difference += g_t_difference
                total_w_t_difference += w_t_difference

                # Determine G(t) status based on difference ranges
                if -1 <= g_t_difference <= 1:
                    g_t_status = "high"
                elif -3 <= g_t_difference <= 3:
                    g_t_status = "good"
                elif -10 <= g_t_difference <= 10:
                    g_t_status = "low"
                else:
                    g_t_status = "n/c"

                # Determine W(t) status based on difference ranges
                if -1 <= w_t_difference <= 1:
                    w_t_status = "high"
                elif -5 <= w_t_difference <= 5:
                    w_t_status = "good"
                elif -10 <= w_t_difference <= 10:
                    w_t_status = "low"
                else:
                    w_t_status = "n/c"

                # Determine overall status
                # PASS if both G(t) and W(t) are good, low, or high
                # REMOVE if either is n/c
                if g_t_status in ["good", "low", "high"] and w_t_status in ["good", "low", "high"]:
                    overall_status = "PASS"
                    total_g_t_difference_pass += g_t_difference
                    total_w_t_difference_pass += w_t_difference
                    pass_count += 1
                else:
                    overall_status = "REMOVE"
                    remove_count += 1

                # Append to result arrays
                g_t_difference_data.append(g_t_difference)
                w_t_difference_data.append(w_t_difference)
                g_t_status_data.append(g_t_status)
                w_t_status_data.append(w_t_status)
                overall_status_data.append(overall_status)

            # Calculate percentages
            g_t_percentage = (
                (total_g_t_difference_pass / total_g_t_difference * 100)
                if total_g_t_difference != 0 else 0
            )
            w_t_percentage = (
                (total_w_t_difference_pass / total_w_t_difference * 100)
                if total_w_t_difference != 0 else 0
            )

            # Calculate Delta W(t) and Delta G(t) scores
            # Scoring rules: high=1.5, good=1.2, low=1.0, n/c=0.0
            total_rows = len(md_data)
            max_score = total_rows * 1.5

            # Calculate W(t) score based on W(t) status
            w_t_score_points = 0.0
            for status in w_t_status_data:
                if status == "high":
                    w_t_score_points += 1.5
                elif status == "good":
                    w_t_score_points += 1.2
                elif status == "low":
                    w_t_score_points += 1.0
                # n/c adds 0.0

            # Calculate G(t) score based on G(t) status
            g_t_score_points = 0.0
            for status in g_t_status_data:
                if status == "high":
                    g_t_score_points += 1.5
                elif status == "good":
                    g_t_score_points += 1.2
                elif status == "low":
                    g_t_score_points += 1.0
                # n/c adds 0.0

            # Calculate normalized scores (0-1 range)
            delta_wt_score = w_t_score_points / max_score if max_score > 0 else 0
            delta_gt_score = g_t_score_points / max_score if max_score > 0 else 0

            # Calculate percentages (0-100 range)
            delta_wt_percentage = delta_wt_score * 100
            delta_gt_percentage = delta_gt_score * 100

            logger.info(
                f"QA calculation complete: {pass_count} PASS, {remove_count} REMOVE, "
                f"G(t) quality: {g_t_percentage:.2f}%, W(t) quality: {w_t_percentage:.2f}%, "
                f"Delta W(t) score: {delta_wt_score:.4f} ({delta_wt_percentage:.2f}%), "
                f"Delta G(t) score: {delta_gt_score:.4f} ({delta_gt_percentage:.2f}%)"
            )

            return {
                'g_t_difference_data': g_t_difference_data,
                'w_t_difference_data': w_t_difference_data,
                'g_t_status_data': g_t_status_data,
                'w_t_status_data': w_t_status_data,
                'overall_status_data': overall_status_data,
                'total_g_t_difference': total_g_t_difference,
                'total_w_t_difference': total_w_t_difference,
                'total_g_t_difference_pass': total_g_t_difference_pass,
                'total_w_t_difference_pass': total_w_t_difference_pass,
                'g_t_percentage': g_t_percentage,
                'w_t_percentage': w_t_percentage,
                'pass_count': pass_count,
                'remove_count': remove_count,
                'delta_wt_score': round(delta_wt_score, 4),
                'delta_wt_percentage': round(delta_wt_percentage, 2),
                'delta_gt_score': round(delta_gt_score, 4),
                'delta_gt_percentage': round(delta_gt_percentage, 2),
                'w_t_score_points': round(w_t_score_points, 2),
                'g_t_score_points': round(g_t_score_points, 2),
                'max_score': max_score,
                'total_rows': total_rows,
            }

        except Exception as e:
            logger.error(f"Error in QA calculation: {str(e)}")
            raise

    @staticmethod
    def filter_stations_by_status(
        md_data: List[float],
        inc_data: List[float],
        azi_data: List[float],
        gt_data: List[float],
        wt_data: List[float],
        overall_status_data: List[str],
        include_status: str = 'PASS'
    ) -> Dict[str, List[float]]:
        """
        Filter survey data to include only stations with specified status.

        CRITICAL: The final station (last MD) is ALWAYS included regardless of QA status,
        as it represents the final depth which is essential for trajectory calculations.

        Args:
            md_data: Measured Depth array
            inc_data: Inclination array
            azi_data: Azimuth array
            gt_data: G(t) array
            wt_data: W(t) array
            overall_status_data: Overall status array
            include_status: Status to include ('PASS' or 'REMOVE')

        Returns:
            Dictionary with filtered arrays
        """
        filtered_md = []
        filtered_inc = []
        filtered_azi = []
        filtered_gt = []
        filtered_wt = []

        last_index = len(md_data) - 1

        for i in range(len(md_data)):
            # CRITICAL FIX: Always include the last station (final depth) regardless of QA status
            # The final depth is the target/planned depth and must be in the calculated trajectory
            if overall_status_data[i] == include_status or i == last_index:
                filtered_md.append(md_data[i])
                filtered_inc.append(inc_data[i])
                filtered_azi.append(azi_data[i])
                filtered_gt.append(gt_data[i])
                filtered_wt.append(wt_data[i])

        logger.info(
            f"Filtered {len(filtered_md)} stations with status '{include_status}' "
            f"from {len(md_data)} total stations (final depth always included)"
        )

        return {
            'md_data': filtered_md,
            'inc_data': filtered_inc,
            'azi_data': filtered_azi,
            'gt_data': filtered_gt,
            'wt_data': filtered_wt,
        }

    @staticmethod
    def filter_stations_by_indices(
        md_data: List[float],
        inc_data: List[float],
        azi_data: List[float],
        gt_data: List[float],
        wt_data: List[float],
        indices_to_keep: List[int]
    ) -> Dict[str, List[float]]:
        """
        Filter survey data to include only stations at specified indices.

        Args:
            md_data: Measured Depth array
            inc_data: Inclination array
            azi_data: Azimuth array
            gt_data: G(t) array
            wt_data: W(t) array
            indices_to_keep: List of indices to keep

        Returns:
            Dictionary with filtered arrays
        """
        filtered_md = [md_data[i] for i in indices_to_keep if i < len(md_data)]
        filtered_inc = [inc_data[i] for i in indices_to_keep if i < len(inc_data)]
        filtered_azi = [azi_data[i] for i in indices_to_keep if i < len(azi_data)]
        filtered_gt = [gt_data[i] for i in indices_to_keep if i < len(gt_data)]
        filtered_wt = [wt_data[i] for i in indices_to_keep if i < len(wt_data)]

        logger.info(
            f"Filtered to {len(filtered_md)} stations from {len(md_data)} total stations"
        )

        return {
            'md_data': filtered_md,
            'inc_data': filtered_inc,
            'azi_data': filtered_azi,
            'gt_data': filtered_gt,
            'wt_data': filtered_wt,
        }
