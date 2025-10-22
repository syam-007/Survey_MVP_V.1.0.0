"""
ViewSet for interpolation API endpoints.
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from survey_api.models import CalculatedSurvey, InterpolatedSurvey
from survey_api.services.interpolation_service import InterpolationService
from survey_api.serializers import (
    InterpolatedSurveySerializer,
    InterpolationRequestSerializer,
    InterpolationResponseSerializer,
)
from survey_api.exceptions import WellengCalculationError, InsufficientDataError

logger = logging.getLogger(__name__)


class InterpolationViewSet(viewsets.ViewSet):
    """ViewSet for survey interpolation endpoints."""

    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='interpolate')
    def trigger_interpolation(self, request, pk=None):
        """
        Trigger interpolation for a calculated survey at specified resolution.

        POST /api/v1/calculations/{calculated_survey_id}/interpolate/

        Request Body:
        {
            "resolution": 20  // Optional, defaults to 10
        }

        Response:
        {
            "interpolation_id": "uuid",
            "resolution": 20,
            "point_count": 750,
            "status": "completed",
            "interpolation_duration": 1.234,
            "message": "Interpolation completed successfully",
            "created_at": "2025-10-14T10:30:00Z"
        }
        """
        try:
            # Validate request data
            serializer = InterpolationRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'error': 'ValidationError', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            resolution = serializer.validated_data.get('resolution', 10)

            # Get calculated survey and check user ownership
            calc_survey = get_object_or_404(
                CalculatedSurvey.objects.select_related('survey_data__survey_file__run'),
                id=pk
            )

            # Check user ownership
            if calc_survey.survey_data.survey_file.run.user != request.user:
                return Response(
                    {'error': 'PermissionDenied', 'message': 'You do not have permission to interpolate this survey'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if calculated survey is in valid state
            if calc_survey.calculation_status != 'calculated':
                return Response(
                    {
                        'error': 'InvalidState',
                        'message': f"Cannot interpolate: survey calculation status is '{calc_survey.calculation_status}', expected 'calculated'"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            logger.info(f"User {request.user.username} triggering interpolation for CalculatedSurvey {pk} at resolution={resolution}m")

            # Trigger interpolation
            interp_survey = InterpolationService.interpolate(
                calculated_survey_id=str(pk),
                resolution=resolution
            )

            # Determine if this was newly created or existing
            is_existing = InterpolatedSurvey.objects.filter(
                calculated_survey=calc_survey,
                resolution=resolution
            ).count() > 0

            message = "Interpolation already exists for this resolution" if is_existing else "Interpolation completed successfully"

            # Prepare response
            response_data = {
                'interpolation_id': interp_survey.id,
                'resolution': interp_survey.resolution,
                'point_count': interp_survey.point_count,
                'status': interp_survey.interpolation_status,
                'interpolation_duration': interp_survey.interpolation_duration,
                'message': message,
                'created_at': interp_survey.created_at,
            }

            response_serializer = InterpolationResponseSerializer(response_data)

            # Return 200 if existing, 201 if created
            response_status = status.HTTP_200_OK if is_existing else status.HTTP_201_CREATED

            return Response(response_serializer.data, status=response_status)

        except InsufficientDataError as e:
            logger.error(f"InsufficientDataError during interpolation: {str(e)}")
            return Response(
                {'error': 'InsufficientDataError', 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except WellengCalculationError as e:
            logger.error(f"WellengCalculationError during interpolation: {str(e)}")
            return Response(
                {'error': 'WellengCalculationError', 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            logger.error(f"Unexpected error during interpolation: {type(e).__name__}: {str(e)}")
            return Response(
                {'error': 'InternalServerError', 'message': 'An unexpected error occurred during interpolation'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='interpolations')
    def list_interpolations(self, request, pk=None):
        """
        List all interpolations for a calculated survey.

        GET /api/v1/calculations/{calculated_survey_id}/interpolations/

        Response:
        [
            {
                "id": "uuid",
                "resolution": 10,
                "point_count": 375,
                "status": "completed",
                ...
            },
            ...
        ]
        """
        try:
            # Get calculated survey and check user ownership
            calc_survey = get_object_or_404(
                CalculatedSurvey.objects.select_related('survey_data__survey_file__run'),
                id=pk
            )

            # Check user ownership
            if calc_survey.survey_data.survey_file.run.user != request.user:
                return Response(
                    {'error': 'PermissionDenied', 'message': 'You do not have permission to access these interpolations'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get all interpolations
            interpolations = InterpolationService.list_interpolations(str(pk))

            serializer = InterpolatedSurveySerializer(interpolations, many=True)

            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error listing interpolations: {type(e).__name__}: {str(e)}")
            return Response(
                {'error': 'InternalServerError', 'message': 'An unexpected error occurred'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='interpolation/(?P<resolution>[0-9]+)')
    def get_interpolation(self, request, pk=None, resolution=None):
        """
        Get a specific interpolation by resolution.

        GET /api/v1/calculations/{calculated_survey_id}/interpolation/{resolution}/

        Response:
        {
            "id": "uuid",
            "resolution": 20,
            "point_count": 750,
            "md_interpolated": [...],
            ...
        }
        """
        try:
            # Get calculated survey and check user ownership
            calc_survey = get_object_or_404(
                CalculatedSurvey.objects.select_related('survey_data__survey_file__run'),
                id=pk
            )

            # Check user ownership
            if calc_survey.survey_data.survey_file.run.user != request.user:
                return Response(
                    {'error': 'PermissionDenied', 'message': 'You do not have permission to access this interpolation'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get specific interpolation
            interpolation = get_object_or_404(
                InterpolatedSurvey,
                calculated_survey_id=pk,
                resolution=int(resolution)
            )

            serializer = InterpolatedSurveySerializer(interpolation)

            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error retrieving interpolation: {type(e).__name__}: {str(e)}")
            return Response(
                {'error': 'InternalServerError', 'message': 'An unexpected error occurred'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
