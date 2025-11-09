"""
Curve Adjustment API Views

Handles adjustment operations: apply offsets, undo, redo, reset, recalculate.
"""
import logging
import numpy as np
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from survey_api.services.adjustment_service import AdjustmentService
from survey_api.serializers import (
    ApplyOffsetSerializer,
    AdjustmentStateSerializer
)
from survey_api.models import SurveyFile, SurveyData

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_offset(request, comparison_id):
    """
    Apply offsets to comparative survey within specified MD range.

    Request Body:
        {
            "md_start": 0.0,
            "md_end": 1000.0,
            "x_offset": 1.5,
            "y_offset": -2.0,
            "z_offset": 0.5
        }

    Response:
        200 OK: Adjusted survey data
        400 Bad Request: Validation error
        404 Not Found: Comparison not found
        500 Internal Server Error: Adjustment failed
    """
    try:
        # Validate input
        serializer = ApplyOffsetSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Validation failed', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data

        # Apply offset
        result = AdjustmentService.apply_offset(
            comparison_id=str(comparison_id),
            md_start=data['md_start'],
            md_end=data['md_end'],
            x_offset=data['x_offset'],
            y_offset=data['y_offset'],
            z_offset=data['z_offset'],
            user=request.user
        )

        # Log activity for saved adjustment
        try:
            from survey_api.views.activity_log_viewset import log_activity
            from survey_api.models import ComparisonResult

            comparison = ComparisonResult.objects.select_related(
                'run',
                'primary_survey__survey_file',
                'reference_survey__survey_file'
            ).get(id=comparison_id)

            description = (
                f'Adjustment Applied (Saved)\n'
                f'Primary Survey: {comparison.primary_survey.survey_file.file_name}\n'
                f'Reference Survey: {comparison.reference_survey.survey_file.file_name}\n'
                f'MD Range: {data["md_start"]:.2f}m - {data["md_end"]:.2f}m\n'
                f'Offsets - X: {data["x_offset"]:.2f}m, Y: {data["y_offset"]:.2f}m, Z: {data["z_offset"]:.2f}m'
            )

            log_activity(
                run_id=comparison.run.id,
                user=request.user,
                activity_type='adjustment_applied',
                description=description,
                metadata={
                    'adjustment_type': 'saved',
                    'comparison_id': str(comparison_id),
                    'md_start': data['md_start'],
                    'md_end': data['md_end'],
                    'x_offset': data['x_offset'],
                    'y_offset': data['y_offset'],
                    'z_offset': data['z_offset']
                }
            )
        except Exception as log_error:
            logger.warning(f"Failed to log adjustment: {str(log_error)}")

        response_serializer = AdjustmentStateSerializer(result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Apply offset failed: {type(e).__name__}: {str(e)}")
        return Response(
            {'error': f'Failed to apply offset: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def undo_adjustment(request, comparison_id):
    """
    Undo the last adjustment and restore previous state.

    Response:
        200 OK: Previous state restored
        404 Not Found: Comparison not found
        500 Internal Server Error: Undo failed
    """
    try:
        result = AdjustmentService.undo_adjustment(str(comparison_id))

        # Log activity
        try:
            from survey_api.views.activity_log_viewset import log_activity
            from survey_api.models import ComparisonResult

            comparison = ComparisonResult.objects.select_related('run').get(id=comparison_id)

            log_activity(
                run_id=comparison.run.id,
                user=request.user,
                activity_type='adjustment_undone',
                description='Adjustment Undone - Restored previous state',
                metadata={
                    'comparison_id': str(comparison_id)
                }
            )
        except Exception as log_error:
            logger.warning(f"Failed to log undo: {str(log_error)}")

        response_serializer = AdjustmentStateSerializer(result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Undo adjustment failed: {type(e).__name__}: {str(e)}")
        return Response(
            {'error': f'Failed to undo adjustment: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def redo_adjustment(request, comparison_id):
    """
    Redo the next adjustment in history.

    Response:
        200 OK: Next state restored
        404 Not Found: Comparison not found or no forward history
        500 Internal Server Error: Redo failed
    """
    try:
        result = AdjustmentService.redo_adjustment(str(comparison_id))

        # Log activity
        try:
            from survey_api.views.activity_log_viewset import log_activity
            from survey_api.models import ComparisonResult

            comparison = ComparisonResult.objects.select_related('run').get(id=comparison_id)

            log_activity(
                run_id=comparison.run.id,
                user=request.user,
                activity_type='adjustment_redone',
                description='Adjustment Redone - Restored next state',
                metadata={
                    'comparison_id': str(comparison_id)
                }
            )
        except Exception as log_error:
            logger.warning(f"Failed to log redo: {str(log_error)}")

        response_serializer = AdjustmentStateSerializer(result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Redo adjustment failed: {type(e).__name__}: {str(e)}")
        return Response(
            {'error': f'Failed to redo adjustment: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_adjustments(request, comparison_id):
    """
    Reset all adjustments and return to original comparison data.

    Response:
        200 OK: All adjustments reset
        404 Not Found: Comparison not found
        500 Internal Server Error: Reset failed
    """
    try:
        result = AdjustmentService.reset_adjustments(str(comparison_id))

        # Log activity
        try:
            from survey_api.views.activity_log_viewset import log_activity
            from survey_api.models import ComparisonResult

            comparison = ComparisonResult.objects.select_related(
                'run',
                'primary_survey__survey_file',
                'reference_survey__survey_file'
            ).get(id=comparison_id)

            description = (
                f'Adjustments Reset\n'
                f'Primary Survey: {comparison.primary_survey.survey_file.file_name}\n'
                f'Reference Survey: {comparison.reference_survey.survey_file.file_name}\n'
                f'All adjustments removed, restored to original comparison'
            )

            log_activity(
                run_id=comparison.run.id,
                user=request.user,
                activity_type='adjustment_reset',
                description=description,
                metadata={
                    'comparison_id': str(comparison_id)
                }
            )
        except Exception as log_error:
            logger.warning(f"Failed to log reset: {str(log_error)}")

        response_serializer = AdjustmentStateSerializer(result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Reset adjustments failed: {type(e).__name__}: {str(e)}")
        return Response(
            {'error': f'Failed to reset adjustments: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recalculate_inc_azi(request, comparison_id):
    """
    Recalculate INC and AZI from adjusted wellbore path.

    Response:
        200 OK: Recalculated INC and AZI data
        404 Not Found: Comparison or adjustment not found
        500 Internal Server Error: Recalculation failed
    """
    try:
        result = AdjustmentService.recalculate_inc_azi(str(comparison_id))
        response_serializer = AdjustmentStateSerializer(result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Recalculate INC/AZI failed: {type(e).__name__}: {str(e)}")
        return Response(
            {'error': f'Failed to recalculate INC/AZI: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_adjustment(request, comparison_id):
    """
    Get the current adjustment state for a comparison.

    Response:
        200 OK: Current adjustment state
        404 Not Found: Comparison not found
        500 Internal Server Error: Retrieval failed
    """
    try:
        result = AdjustmentService.get_current_adjustment(str(comparison_id))
        response_serializer = AdjustmentStateSerializer(result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Get current adjustment failed: {type(e).__name__}: {str(e)}")
        return Response(
            {'error': f'Failed to get current adjustment: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def adjust_surveys_temp(request):
    """
    Apply adjustment to survey files temporarily without saving to database.
    Compares reference survey with adjusted comparison survey using proper coordinate calculation.

    Request Body:
        {
            "file1_id": "uuid",      // Reference survey file ID
            "file2_id": "uuid",      // Comparison survey file ID to adjust
            "md_start": 0.0,         // Starting MD for adjustment
            "md_end": 1000.0,        // Ending MD for adjustment
            "x_offset": 1.5,         // Easting offset in meters
            "y_offset": -2.0,        // Northing offset in meters
            "z_offset": 0.5          // TVD offset in meters
        }

    Response:
        200 OK: Adjusted survey results (not saved to database)
        400 Bad Request: Validation errors
        404 Not Found: Survey file not found
        500 Internal Server Error: Calculation failed
    """
    try:
        from survey_api.services.delta_calculation_service import DeltaCalculationService
        from survey_api.services.welleng_service import WellengService

        file1_id = request.data.get('file1_id')  # Reference
        file2_id = request.data.get('file2_id')  # Comparison to be adjusted
        md_start = float(request.data.get('md_start', 0))
        md_end = float(request.data.get('md_end', 99999))
        x_offset = float(request.data.get('x_offset', 0))
        y_offset = float(request.data.get('y_offset', 0))
        z_offset = float(request.data.get('z_offset', 0))

        if not file1_id or not file2_id:
            return Response(
                {'error': 'Both file1_id (reference) and file2_id (comparison) are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get reference survey - Load with proper select_related
        survey_file1 = get_object_or_404(SurveyFile, id=file1_id)
        survey_data1 = SurveyData.objects.filter(survey_file=survey_file1).select_related(
            'calculated_survey',
            'survey_file__run__tieon',
            'survey_file__run__well__location'
        ).first()

        if not survey_data1:
            return Response(
                {'error': 'Reference survey data not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get comparison survey - Load with proper select_related
        survey_file2 = get_object_or_404(SurveyFile, id=file2_id)
        survey_data2 = SurveyData.objects.filter(survey_file=survey_file2).select_related(
            'calculated_survey',
            'survey_file__run__tieon',
            'survey_file__run__well__location'
        ).first()

        if not survey_data2:
            return Response(
                {'error': 'Comparison survey data not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Ensure coordinates are calculated (handles GTL surveys properly)
        calc_survey1 = DeltaCalculationService._ensure_coordinates_calculated(survey_data1)
        calc_survey2 = DeltaCalculationService._ensure_coordinates_calculated(survey_data2)

        # Get reference coordinates
        ref_md_array = np.array(survey_data1.md_data, dtype=float)
        ref_inc_array = np.array(survey_data1.inc_data, dtype=float)
        ref_azi_array = np.array(survey_data1.azi_data, dtype=float)
        ref_north_array = np.array(calc_survey1.northing, dtype=float)
        ref_east_array = np.array(calc_survey1.easting, dtype=float)
        ref_tvd_array = np.array(calc_survey1.tvd, dtype=float)

        # Get comparison coordinates
        comp_md_array = np.array(survey_data2.md_data, dtype=float)
        comp_inc_array = np.array(survey_data2.inc_data, dtype=float)
        comp_azi_array = np.array(survey_data2.azi_data, dtype=float)
        comp_north_array = np.array(calc_survey2.northing, dtype=float)
        comp_east_array = np.array(calc_survey2.easting, dtype=float)
        comp_tvd_array = np.array(calc_survey2.tvd, dtype=float)

        # Find common MD range (like Streamlit manual_interpolation)
        md_min = max(ref_md_array.min(), comp_md_array.min())
        md_max = min(ref_md_array.max(), comp_md_array.max())

        logger.info(f"Common MD range: {md_min} to {md_max}")

        # Apply adjustments to comparison survey within specified MD range
        adjusted_north = comp_north_array.copy()
        adjusted_east = comp_east_array.copy()
        adjusted_tvd = comp_tvd_array.copy()

        # Apply offsets only within MD window
        mask = (comp_md_array >= md_start) & (comp_md_array <= md_end)
        adjusted_east[mask] += x_offset
        adjusted_north[mask] += y_offset
        adjusted_tvd[mask] += z_offset

        points_affected = int(np.sum(mask))

        logger.info(f"Temporary adjustment: file1={file1_id}, file2={file2_id}, affected {points_affected} points")

        # Log activity for temporary adjustment
        try:
            from survey_api.views.activity_log_viewset import log_activity

            # Get the run from the comparison survey file
            run = survey_file2.run
            if run:
                description = (
                    f'Adjustment Applied (Temporary)\n'
                    f'Reference Survey: {survey_file1.file_name}\n'
                    f'Adjusted Survey: {survey_file2.file_name}\n'
                    f'MD Range: {md_start:.2f}m - {md_end:.2f}m\n'
                    f'Offsets - X: {x_offset:.2f}m, Y: {y_offset:.2f}m, Z: {z_offset:.2f}m\n'
                    f'Points Affected: {points_affected}/{len(comp_md_array)}'
                )

                log_activity(
                    run_id=run.id,
                    user=request.user,
                    activity_type='adjustment_applied',
                    description=description,
                    metadata={
                        'adjustment_type': 'temporary',
                        'reference_file_id': str(file1_id),
                        'comparison_file_id': str(file2_id),
                        'reference_file_name': survey_file1.file_name,
                        'comparison_file_name': survey_file2.file_name,
                        'md_start': md_start,
                        'md_end': md_end,
                        'x_offset': x_offset,
                        'y_offset': y_offset,
                        'z_offset': z_offset,
                        'points_affected': points_affected,
                        'total_points': len(comp_md_array)
                    }
                )
        except Exception as log_error:
            logger.warning(f"Failed to log adjustment: {str(log_error)}")

        # Interpolate reference survey to match comparison MDs
        ref_north_interp = np.interp(comp_md_array, ref_md_array, ref_north_array)
        ref_east_interp = np.interp(comp_md_array, ref_md_array, ref_east_array)
        ref_tvd_interp = np.interp(comp_md_array, ref_md_array, ref_tvd_array)

        # Calculate deltas (reference - adjusted comparison, matching Streamlit: dx = survey_ref.n - survey_cmp.n)
        delta_north = ref_north_interp - adjusted_north
        delta_east = ref_east_interp - adjusted_east
        delta_tvd = ref_tvd_interp - adjusted_tvd
        delta_horizontal = np.sqrt(delta_east**2 + delta_north**2)
        delta_total = np.sqrt(delta_east**2 + delta_north**2 + delta_tvd**2)

        # Format results for display
        results = []
        for i in range(len(comp_md_array)):
            results.append({
                'depth': float(comp_md_array[i]),
                'inclination': float(comp_inc_array[i]),
                'azimuth': float(comp_azi_array[i]),
                # Reference coordinates
                'reference_north': float(ref_north_interp[i]),
                'reference_east': float(ref_east_interp[i]),
                'reference_tvd': float(ref_tvd_interp[i]),
                # Adjusted comparison coordinates
                'adjusted_north': float(adjusted_north[i]),
                'adjusted_east': float(adjusted_east[i]),
                'adjusted_tvd': float(adjusted_tvd[i]),
                # Deltas
                'delta_north': float(delta_north[i]),
                'delta_east': float(delta_east[i]),
                'delta_tvd': float(delta_tvd[i]),
                'delta_horizontal': float(delta_horizontal[i]),
                'delta_total': float(delta_total[i]),
            })

        # Calculate statistics
        statistics = {
            'max_delta_north': float(np.max(np.abs(delta_north))),
            'max_delta_east': float(np.max(np.abs(delta_east))),
            'max_delta_tvd': float(np.max(np.abs(delta_tvd))),
            'max_delta_horizontal': float(np.max(delta_horizontal)),
            'max_delta_total': float(np.max(delta_total)),
            'avg_delta_horizontal': float(np.mean(delta_horizontal)),
            'avg_delta_total': float(np.mean(delta_total)),
            'points_affected': points_affected,
            'total_points': len(comp_md_array),
            'md_range': {'min': float(md_min), 'max': float(md_max)},
        }

        return Response({
            'results': results,
            'statistics': statistics,
            'file1_name': survey_file1.file_name,
            'file2_name': survey_file2.file_name,
            'adjustment_params': {
                'md_start': md_start,
                'md_end': md_end,
                'x_offset': x_offset,
                'y_offset': y_offset,
                'z_offset': z_offset,
            },
            # Coordinate arrays for 3D plot
            'reference_easting': ref_east_array.tolist(),
            'reference_northing': ref_north_array.tolist(),
            'reference_tvd': ref_tvd_array.tolist(),
            'adjusted_easting': adjusted_east.tolist(),
            'adjusted_northing': adjusted_north.tolist(),
            'adjusted_tvd': adjusted_tvd.tolist(),
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Temporary adjustment failed: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return Response(
            {
                'error': 'Adjustment Failed',
                'message': 'An error occurred while adjusting the survey.',
                'details': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
