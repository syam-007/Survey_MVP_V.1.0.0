"""
Calculation status API viewset.

Provides endpoints for retrieving calculation status and results.
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from survey_api.models import SurveyData, CalculatedSurvey, InterpolatedSurvey
from survey_api.serializers import (
    CalculationStatusSerializer,
    CalculatedSurveySerializer,
    InterpolatedSurveySerializer,
    InterpolationRequestSerializer,
    InterpolationResponseSerializer,
)
from survey_api.services.interpolation_service import InterpolationService
from survey_api.exceptions import WellengCalculationError, InsufficientDataError

logger = logging.getLogger(__name__)


class CalculationViewSet(viewsets.ViewSet):
    """
    ViewSet for calculation status and results.

    Endpoints:
    - GET /api/v1/surveys/{survey_id}/status/ - Get calculation status
    - GET /api/v1/surveys/{survey_id}/results/ - Get full calculation results
    """

    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'], url_path='status')
    def get_calculation_status(self, request, pk=None):
        """
        Get calculation status for a survey.

        Returns simplified status information including:
        - calculation_status: pending/processing/calculated/error
        - calculation_duration: time taken (seconds)
        - error_message: error details if failed

        Args:
            pk: SurveyData UUID

        Returns:
            200 OK with status data
            404 Not Found if survey doesn't exist
        """
        # Get SurveyData
        survey_data = get_object_or_404(
            SurveyData.objects.select_related('survey_file__run'),
            id=pk
        )

        # Check if user owns this survey's run
        if survey_data.survey_file.run.user != request.user:
            return Response(
                {'error': 'PermissionDenied', 'message': 'You do not have permission to view this survey.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Try to get CalculatedSurvey
        try:
            calculated_survey = CalculatedSurvey.objects.get(survey_data=survey_data)
            serializer = CalculationStatusSerializer(calculated_survey)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except CalculatedSurvey.DoesNotExist:
            # No calculation record yet - check validation status
            if survey_data.validation_status == 'valid':
                # Valid data but no calculation yet (might be processing)
                return Response(
                    {
                        'survey_id': str(survey_data.id),
                        'calculation_status': 'pending',
                        'calculation_duration': None,
                        'error_message': None,
                        'created_at': survey_data.created_at,
                    },
                    status=status.HTTP_200_OK
                )
            else:
                # Invalid data - cannot calculate
                return Response(
                    {
                        'survey_id': str(survey_data.id),
                        'calculation_status': 'error',
                        'calculation_duration': None,
                        'error_message': f'Survey validation failed: {survey_data.validation_status}',
                        'created_at': survey_data.created_at,
                    },
                    status=status.HTTP_200_OK
                )

    @action(detail=True, methods=['get'], url_path='results')
    def get_calculation_results(self, request, pk=None):
        """
        Get full calculation results for a survey.

        Returns complete position arrays and trajectory metrics.

        Args:
            pk: SurveyData UUID

        Returns:
            200 OK with full results
            404 Not Found if calculation doesn't exist
        """
        # Get SurveyData
        survey_data = get_object_or_404(
            SurveyData.objects.select_related('survey_file__run'),
            id=pk
        )

        # Check if user owns this survey's run
        if survey_data.survey_file.run.user != request.user:
            return Response(
                {'error': 'PermissionDenied', 'message': 'You do not have permission to view this survey.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get CalculatedSurvey
        calculated_survey = get_object_or_404(
            CalculatedSurvey,
            survey_data=survey_data
        )

        serializer = CalculatedSurveySerializer(calculated_survey)
        return Response(serializer.data, status=status.HTTP_200_OK)

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
        Get interpolation data - ALWAYS RECALCULATES fresh data with BHC support.
        Does NOT return saved interpolation from database.

        This ensures BHC recalculation works correctly and users always see current data.

        GET /api/v1/calculations/{calculated_survey_id}/interpolation/{resolution}/?start_md=X&end_md=Y

        Query Parameters:
            - start_md: Optional start MD for custom range
            - end_md: Optional end MD for custom range

        Response:
        {
            "id": "uuid" (if saved) or null,
            "resolution": 20,
            "point_count": 750,
            "md_interpolated": [...],
            "is_saved": true/false,
            "calculation_timestamp": "...",
            "bhc_enabled": true/false,
            ...
        }
        """
        import datetime
        request_time = datetime.datetime.now().isoformat()
        print(f"\n{'#'*80}")
        print(f"### GET INTERPOLATION ENDPOINT CALLED (CalculationViewSet) ###")
        print(f"### Request Time: {request_time}")
        print(f"### CalculatedSurvey ID: {pk}")
        print(f"### Resolution: {resolution}")
        print(f"### This endpoint ALWAYS recalculates - NO CACHED DATA")
        print(f"{'#'*80}\n")

        try:
            # Extract query parameters
            start_md = request.query_params.get('start_md')
            end_md = request.query_params.get('end_md')
            start_md_value = float(start_md) if start_md else None
            end_md_value = float(end_md) if end_md else None

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

            # Get BHC status from calculation context
            bhc_enabled = calc_survey.calculation_context.get('bhc_enabled', False) if calc_survey.calculation_context else False
            vertical_section_azimuth = float(calc_survey.vertical_section_azimuth) if calc_survey.vertical_section_azimuth is not None else None

            print(f"\n{'='*80}")
            print(f"[INTERPOLATION SETUP] BHC enabled: {bhc_enabled}")
            print(f"[INTERPOLATION SETUP] Vertical section azimuth from DB: {vertical_section_azimuth}°")
            print(f"{'='*80}\n")

            # Prepare data for interpolation
            from survey_api.services.welleng_service import WellengService
            survey_data = calc_survey.survey_data
            calculated_data = {
                'md': survey_data.md_data,
                'inc': survey_data.inc_data,
                'azi': survey_data.azi_data,
                'easting': calc_survey.easting,
                'northing': calc_survey.northing,
                'tvd': calc_survey.tvd,
            }

            # Implement BHC iterative calculation for interpolation
            if bhc_enabled:
                print(f"[INTERPOLATION BHC] Performing iterative BHC interpolation")
                print(f"[INTERPOLATION BHC] Step 1: Initial interpolation with proposal_direction = 0°\n")

                # Step 1: Initial interpolation
                initial_result = WellengService.interpolate_survey(
                    calculated_data,
                    int(resolution),
                    start_md=start_md_value,
                    end_md=end_md_value,
                    vertical_section_azimuth=0.0
                )

                # Step 2: Get closure direction from last point
                interpolated_closure_direction_last = initial_result['closure_direction'][-1]

                print(f"\n[INTERPOLATION BHC] Step 2: Got closure direction = {interpolated_closure_direction_last:.6f}°")
                print(f"[INTERPOLATION BHC] Step 3: Recalculating with that direction\n")

                # Step 3: Recalculate with closure direction
                result = WellengService.interpolate_survey(
                    calculated_data,
                    int(resolution),
                    start_md=start_md_value,
                    end_md=end_md_value,
                    vertical_section_azimuth=interpolated_closure_direction_last
                )

                print(f"[INTERPOLATION BHC] Completed - converged to {interpolated_closure_direction_last:.6f}°\n")
            else:
                # Non-BHC: single pass
                result = WellengService.interpolate_survey(
                    calculated_data,
                    int(resolution),
                    start_md=start_md_value,
                    end_md=end_md_value,
                    vertical_section_azimuth=vertical_section_azimuth
                )

            # Check if saved in database
            saved_interpolation = InterpolatedSurvey.objects.filter(
                calculated_survey_id=pk,
                resolution=int(resolution)
            ).first()

            # Prepare response
            calculation_timestamp = datetime.datetime.now().isoformat()
            response_data = {
                'id': str(saved_interpolation.id) if saved_interpolation else None,
                'calculated_survey': str(pk),
                'resolution': int(resolution),
                'md_interpolated': result['md'],
                'inc_interpolated': result['inc'],
                'azi_interpolated': result['azi'],
                'easting_interpolated': result['easting'],
                'northing_interpolated': result['northing'],
                'tvd_interpolated': result['tvd'],
                'dls_interpolated': result['dls'],
                'vertical_section_interpolated': result.get('vertical_section', []),
                'closure_distance_interpolated': result.get('closure_distance', []),
                'closure_direction_interpolated': result.get('closure_direction', []),
                'point_count': result['point_count'],
                'interpolation_status': 'completed',
                'is_saved': saved_interpolation is not None,
                'calculation_timestamp': calculation_timestamp,
                'bhc_enabled': bhc_enabled,
            }

            print(f"[INTERPOLATION RESPONSE] Calculation timestamp: {calculation_timestamp}")
            print(f"[INTERPOLATION RESPONSE] BHC enabled: {bhc_enabled}")
            print(f"[INTERPOLATION RESPONSE] Last closure direction: {result['closure_direction'][-1]:.6f}°\n")

            # Add cache-control headers
            response = Response(response_data, status=status.HTTP_200_OK)
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            return response

        except InsufficientDataError as e:
            logger.error(f"InsufficientDataError: {str(e)}")
            return Response(
                {'error': 'InsufficientDataError', 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except WellengCalculationError as e:
            logger.error(f"WellengCalculationError: {str(e)}")
            return Response(
                {'error': 'WellengCalculationError', 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            logger.error(f"Error retrieving interpolation: {type(e).__name__}: {str(e)}")
            return Response(
                {'error': 'InternalServerError', 'message': 'An unexpected error occurred'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='interpolation/(?P<resolution>[0-9]+)/save')
    def save_interpolation(self, request, pk=None, resolution=None):
        """
        Save interpolation to database.

        This endpoint explicitly saves interpolation data to database.
        User must click "Save to Database" button to persist the data.

        POST /api/v1/calculations/{calculated_survey_id}/interpolation/{resolution}/save/
        Query Parameters:
        - start_md: Optional start MD for custom range
        - end_md: Optional end MD for custom range

        Response:
        {
            "id": "uuid",
            "resolution": 20,
            "point_count": 750,
            "status": "completed",
            "interpolation_duration": 1.234,
            "message": "Interpolation saved to database successfully",
            "is_saved": true
        }
        """
        try:
            # Extract query parameters for custom MD range
            start_md = request.query_params.get('start_md')
            end_md = request.query_params.get('end_md')

            # Convert to float if provided
            start_md = float(start_md) if start_md is not None else None
            end_md = float(end_md) if end_md is not None else None

            # Get calculated survey and check user ownership
            calc_survey = get_object_or_404(
                CalculatedSurvey.objects.select_related('survey_data__survey_file__run'),
                id=pk
            )

            # Check user ownership
            if calc_survey.survey_data.survey_file.run.user != request.user:
                return Response(
                    {'error': 'PermissionDenied', 'message': 'You do not have permission to save this interpolation'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if calculated survey is in valid state
            if calc_survey.calculation_status != 'calculated':
                return Response(
                    {
                        'error': 'InvalidState',
                        'message': f"Cannot save interpolation: survey calculation status is '{calc_survey.calculation_status}', expected 'calculated'"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if interpolation already exists
            existing = InterpolatedSurvey.objects.filter(
                calculated_survey_id=pk,
                resolution=int(resolution)
            ).first()

            if existing:
                logger.info(f"Interpolation already saved for resolution {resolution}m")
                return Response(
                    {
                        'id': str(existing.id),
                        'resolution': existing.resolution,
                        'point_count': existing.point_count,
                        'status': existing.interpolation_status,
                        'interpolation_duration': existing.interpolation_duration,
                        'message': 'Interpolation already exists in database',
                        'is_saved': True,
                        'created_at': existing.created_at,
                    },
                    status=status.HTTP_200_OK
                )

            logger.info(f"User {request.user.username} saving interpolation for CalculatedSurvey {pk} at resolution={resolution}m")

            # Use InterpolationService to calculate and save
            interp_survey = InterpolationService.interpolate(
                calculated_survey_id=str(pk),
                resolution=int(resolution),
                start_md=start_md,
                end_md=end_md
            )

            # Prepare response
            response_data = {
                'id': str(interp_survey.id),
                'resolution': interp_survey.resolution,
                'point_count': interp_survey.point_count,
                'status': interp_survey.interpolation_status,
                'interpolation_duration': interp_survey.interpolation_duration,
                'message': 'Interpolation saved to database successfully',
                'is_saved': True,
                'created_at': interp_survey.created_at,
            }

            return Response(response_data, status=status.HTTP_201_CREATED)

        except InsufficientDataError as e:
            logger.error(f"InsufficientDataError during save: {str(e)}")
            return Response(
                {'error': 'InsufficientDataError', 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except WellengCalculationError as e:
            logger.error(f"WellengCalculationError during save: {str(e)}")
            return Response(
                {'error': 'WellengCalculationError', 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            logger.error(f"Unexpected error saving interpolation: {type(e).__name__}: {str(e)}")
            return Response(
                {'error': 'InternalServerError', 'message': 'An unexpected error occurred while saving interpolation'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
