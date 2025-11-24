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
        Get interpolation data - ALWAYS RECALCULATES fresh data.
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
            ...
        }
        """
        import datetime
        request_time = datetime.datetime.now().isoformat()
        print(f"\n{'#'*80}")
        print(f"### GET INTERPOLATION ENDPOINT CALLED ###")
        print(f"### Request Time: {request_time}")
        print(f"### CalculatedSurvey ID: {pk}")
        print(f"### Resolution: {resolution}")
        print(f"### This endpoint ALWAYS recalculates - NO CACHED DATA")
        print(f"{'#'*80}\n")

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

            # Get optional custom range parameters
            start_md = request.query_params.get('start_md')
            end_md = request.query_params.get('end_md')

            start_md_value = float(start_md) if start_md else None
            end_md_value = float(end_md) if end_md else None

            logger.info(
                f"Triggering fresh interpolation for CalculatedSurvey {pk} "
                f"at resolution={resolution}m (start_md={start_md_value}, end_md={end_md_value})"
            )

            # ALWAYS trigger fresh interpolation calculation (don't use saved data)
            # This ensures BHC recalculation works correctly
            from survey_api.services.welleng_service import WellengService

            # Prepare data for interpolation
            survey_data = calc_survey.survey_data
            calculated_data = {
                'md': survey_data.md_data,
                'inc': survey_data.inc_data,
                'azi': survey_data.azi_data,
                'easting': calc_survey.easting,
                'northing': calc_survey.northing,
                'tvd': calc_survey.tvd,
            }

            # Get vertical section azimuth from calculated survey (important for BHC)
            print(f"\n{'='*80}")
            print(f"[INTERPOLATION SETUP] Retrieving vertical_section_azimuth from CalculatedSurvey")
            print(f"[INTERPOLATION SETUP] CalculatedSurvey ID: {calc_survey.id}")
            print(f"[INTERPOLATION SETUP] Raw vertical_section_azimuth from DB: {calc_survey.vertical_section_azimuth}")
            print(f"[INTERPOLATION SETUP] Type: {type(calc_survey.vertical_section_azimuth)}")

            vertical_section_azimuth = float(calc_survey.vertical_section_azimuth) if calc_survey.vertical_section_azimuth is not None else None

            print(f"[INTERPOLATION SETUP] Converted to float: {vertical_section_azimuth}")

            # Get calculation context to check BHC status
            bhc_enabled = calc_survey.calculation_context.get('bhc_enabled', False) if calc_survey.calculation_context else False
            proposal_direction = calc_survey.calculation_context.get('proposal_direction') if calc_survey.calculation_context else None

            print(f"[INTERPOLATION SETUP] BHC enabled: {bhc_enabled}")
            print(f"[INTERPOLATION SETUP] Proposal direction from context: {proposal_direction}")
            print(f"[INTERPOLATION SETUP] Vertical section azimuth to use: {vertical_section_azimuth}°")

            if bhc_enabled:
                print(f"[INTERPOLATION SETUP] BHC is ENABLED - this azimuth is the BHC converged closure direction")
                # Get the final closure direction from calculated survey for comparison
                if calc_survey.closure_direction and len(calc_survey.closure_direction) > 0:
                    final_closure = calc_survey.closure_direction[-1]
                    print(f"[INTERPOLATION SETUP] Final closure direction from calculated: {final_closure}°")
                    print(f"[INTERPOLATION SETUP] Match check: vertical_section_azimuth ({vertical_section_azimuth}) vs final_closure ({final_closure})")
            else:
                print(f"[INTERPOLATION SETUP] BHC is DISABLED - using standard proposal direction")

            print(f"{'='*80}\n")

            logger.info(
                f"Interpolation setup: BHC enabled={bhc_enabled}, "
                f"vertical_section_azimuth={vertical_section_azimuth}° from CalculatedSurvey"
            )

            # Implement BHC iterative calculation for interpolation (same as calculation)
            if bhc_enabled:
                print(f"\n{'='*80}")
                print(f"[INTERPOLATION BHC] BHC is ENABLED - performing iterative interpolation")
                print(f"[INTERPOLATION BHC] Step 1: Initial interpolation with proposal_direction = 0°")
                print(f"{'='*80}\n")

                # Step 1: Initial interpolation with proposal_direction = 0
                initial_result = WellengService.interpolate_survey(
                    calculated_data,
                    int(resolution),
                    start_md=start_md_value,
                    end_md=end_md_value,
                    vertical_section_azimuth=0.0
                )

                # Get closure direction from last interpolated point
                interpolated_closure_direction_last = initial_result['closure_direction'][-1]

                print(f"\n{'='*80}")
                print(f"[INTERPOLATION BHC] Step 2: Got closure direction from last interpolated point = {interpolated_closure_direction_last:.6f}°")
                print(f"[INTERPOLATION BHC] Step 3: Recalculating interpolation with proposal_direction = {interpolated_closure_direction_last:.6f}°")
                print(f"{'='*80}\n")

                # Step 2: Recalculate interpolation with closure_direction as vertical_section_azimuth
                result = WellengService.interpolate_survey(
                    calculated_data,
                    int(resolution),
                    start_md=start_md_value,
                    end_md=end_md_value,
                    vertical_section_azimuth=interpolated_closure_direction_last
                )

                print(f"\n{'='*80}")
                print(f"[INTERPOLATION BHC] BHC interpolation completed - converged to {interpolated_closure_direction_last:.6f}°")
                print(f"[INTERPOLATION BHC] Final interpolated closure direction: {result['closure_direction'][-1]:.6f}°")
                print(f"{'='*80}\n")

            else:
                # Non-BHC: Use the vertical_section_azimuth from calculated survey (or None)
                print(f"[INTERPOLATION] Non-BHC mode - using vertical_section_azimuth={vertical_section_azimuth}°")
                result = WellengService.interpolate_survey(
                    calculated_data,
                    int(resolution),
                    start_md=start_md_value,
                    end_md=end_md_value,
                    vertical_section_azimuth=vertical_section_azimuth
                )

            # Check if this interpolation is saved in database
            saved_interpolation = InterpolatedSurvey.objects.filter(
                calculated_survey_id=pk,
                resolution=int(resolution)
            ).first()

            # Prepare response with fresh calculated data
            import datetime
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
                'created_at': saved_interpolation.created_at if saved_interpolation else None,
                'calculation_timestamp': calculation_timestamp,  # Timestamp to verify fresh calculation
                'bhc_enabled': bhc_enabled,  # Include BHC status in response
            }

            print(f"\n{'='*80}")
            print(f"[INTERPOLATION RESPONSE] Returning fresh calculated data")
            print(f"[INTERPOLATION RESPONSE] Calculation timestamp: {calculation_timestamp}")
            print(f"[INTERPOLATION RESPONSE] BHC enabled: {bhc_enabled}")
            print(f"[INTERPOLATION RESPONSE] Point count: {result['point_count']}")
            print(f"[INTERPOLATION RESPONSE] First MD: {result['md'][0]}")
            print(f"[INTERPOLATION RESPONSE] Last MD: {result['md'][-1]}")
            print(f"[INTERPOLATION RESPONSE] Last closure direction: {result['closure_direction'][-1]:.6f}°")
            print(f"[INTERPOLATION RESPONSE] Last vertical section: {result['vertical_section'][-1]:.2f}")
            print(f"[INTERPOLATION RESPONSE] Is saved in DB: {saved_interpolation is not None}")
            print(f"{'='*80}\n")

            # Create response with cache-control headers to prevent caching
            response = Response(response_data, status=status.HTTP_200_OK)
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            return response

        except Exception as e:
            logger.error(f"Error calculating interpolation: {type(e).__name__}: {str(e)}")
            return Response(
                {'error': 'InternalServerError', 'message': f'Interpolation calculation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
