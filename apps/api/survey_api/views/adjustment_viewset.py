"""
Curve Adjustment API Views

Handles adjustment operations: apply offsets, undo, redo, reset, recalculate.
"""
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from survey_api.services.adjustment_service import AdjustmentService
from survey_api.serializers import (
    ApplyOffsetSerializer,
    AdjustmentStateSerializer
)

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
