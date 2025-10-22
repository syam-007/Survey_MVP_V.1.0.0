"""
Extrapolation API Views

Handles extrapolation operations: create, retrieve, list, delete.
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from survey_api.models import Extrapolation, Run
from survey_api.services.extrapolation_service import ExtrapolationService
from survey_api.serializers import (
    CreateExtrapolationSerializer,
    ExtrapolationSerializer,
    ExtrapolationListSerializer,
)
from survey_api.views.activity_log_viewset import log_activity

logger = logging.getLogger(__name__)


class ExtrapolationViewSet(viewsets.ModelViewSet):
    """ViewSet for extrapolation operations."""

    permission_classes = [IsAuthenticated]
    serializer_class = ExtrapolationSerializer

    def get_queryset(self):
        """Get queryset filtered by run if specified."""
        queryset = Extrapolation.objects.all()
        run_id = self.request.query_params.get('run_id', None)
        if run_id:
            queryset = queryset.filter(run_id=run_id)
        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        """Return appropriate serializer class based on action."""
        if self.action == 'list':
            return ExtrapolationListSerializer
        elif self.action == 'create':
            return CreateExtrapolationSerializer
        return ExtrapolationSerializer

    @action(detail=False, methods=['post'], url_path='calculate')
    def calculate(self, request):
        """
        Calculate extrapolation without saving to database.

        Request Body:
            {
                "survey_data_id": "uuid",
                "run_id": "uuid",
                "extrapolation_length": 200.0,
                "extrapolation_step": 10.0,
                "interpolation_step": 10.0,
                "extrapolation_method": "Constant"
            }

        Response:
            200 OK: Extrapolation data with all arrays (not saved)
            400 Bad Request: Validation error
            404 Not Found: Survey or Run not found
            500 Internal Server Error: Calculation failed
        """
        try:
            # Validate input
            serializer = CreateExtrapolationSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'error': 'Validation failed', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            data = serializer.validated_data

            # Calculate extrapolation without saving
            extrapolation_data = ExtrapolationService.calculate_extrapolation(
                survey_data_id=str(data['survey_data_id']),
                run_id=str(data['run_id']),
                extrapolation_length=data['extrapolation_length'],
                extrapolation_step=data['extrapolation_step'],
                interpolation_step=data['interpolation_step'],
                extrapolation_method=data['extrapolation_method'],
            )

            # Log activity
            try:
                log_activity(
                    run_id=data['run_id'],
                    user=request.user,
                    activity_type='extrapolation_calculated',
                    description=f'Calculated extrapolation with {data["extrapolation_method"]} method, length {data["extrapolation_length"]}m',
                    metadata={
                        'survey_data_id': str(data['survey_data_id']),
                        'extrapolation_length': data['extrapolation_length'],
                        'extrapolation_step': data['extrapolation_step'],
                        'interpolation_step': data['interpolation_step'],
                        'extrapolation_method': data['extrapolation_method'],
                        'num_stations': len(extrapolation_data.get('md', []))
                    }
                )
            except Exception as log_error:
                logger.warning(f"Failed to log extrapolation calculation: {str(log_error)}")

            return Response(extrapolation_data, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Extrapolation calculation failed: {type(e).__name__}: {str(e)}")
            return Response(
                {'error': f'Failed to calculate extrapolation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        """
        Save extrapolation to database.

        Request Body:
            {
                "survey_data_id": "uuid",
                "run_id": "uuid",
                "extrapolation_length": 200.0,
                "extrapolation_step": 10.0,
                "interpolation_step": 10.0,
                "extrapolation_method": "Constant",
                ... all data arrays ...
            }

        Response:
            201 Created: Extrapolation saved successfully
            400 Bad Request: Validation error
            404 Not Found: Survey or Run not found
            500 Internal Server Error: Save failed
        """
        try:
            # Validate input
            serializer = CreateExtrapolationSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'error': 'Validation failed', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            data = serializer.validated_data

            # Perform extrapolation and save
            extrapolation = ExtrapolationService.extrapolate_survey(
                survey_data_id=str(data['survey_data_id']),
                run_id=str(data['run_id']),
                extrapolation_length=data['extrapolation_length'],
                extrapolation_step=data['extrapolation_step'],
                interpolation_step=data['interpolation_step'],
                extrapolation_method=data['extrapolation_method'],
                user=request.user
            )

            # Log activity
            try:
                log_activity(
                    run_id=extrapolation.run.id,
                    user=request.user,
                    activity_type='extrapolation_saved',
                    description=f'Saved extrapolation with {extrapolation.extrapolation_method} method, length {extrapolation.extrapolation_length}m',
                    metadata={
                        'extrapolation_id': str(extrapolation.id),
                        'survey_data_id': str(extrapolation.survey_data.id),
                        'extrapolation_length': extrapolation.extrapolation_length,
                        'extrapolation_step': extrapolation.extrapolation_step,
                        'interpolation_step': extrapolation.interpolation_step,
                        'extrapolation_method': extrapolation.extrapolation_method
                    }
                )
            except Exception as log_error:
                logger.warning(f"Failed to log extrapolation save: {str(log_error)}")

            # Serialize response
            response_serializer = ExtrapolationSerializer(extrapolation)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Extrapolation failed: {type(e).__name__}: {str(e)}")
            return Response(
                {'error': f'Failed to perform extrapolation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='by-run/(?P<run_id>[^/.]+)')
    def by_run(self, request, run_id=None):
        """
        Get all extrapolations for a specific run.

        URL: /extrapolations/by-run/{run_id}/
        """
        try:
            run = get_object_or_404(Run, id=run_id)
            extrapolations = Extrapolation.objects.filter(run=run).order_by('-created_at')
            serializer = ExtrapolationListSerializer(extrapolations, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to get extrapolations for run {run_id}: {str(e)}")
            return Response(
                {'error': f'Failed to get extrapolations: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
