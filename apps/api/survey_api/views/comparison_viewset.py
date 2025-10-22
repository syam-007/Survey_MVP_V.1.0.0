"""
Comparison API ViewSet

Handles CRUD operations for survey comparisons.
"""
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404

from django.http import HttpResponse

from survey_api.models import ComparisonResult, SurveyData, Run
from survey_api.serializers import (
    ComparisonResultSerializer,
    ComparisonResultListSerializer,
    CreateComparisonSerializer
)
from survey_api.services.delta_calculation_service import DeltaCalculationService
from survey_api.services.excel_export_service import ExcelExportService
from survey_api.permissions import IsComparisonOwner
from survey_api.views.activity_log_viewset import log_activity

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_comparison(request):
    """
    Create a new survey comparison.

    Request Body:
        {
            "run_id": "uuid",
            "primary_survey_id": "uuid",
            "reference_survey_id": "uuid",
            "ratio_factor": 10  // Optional, default=10, range 1-100
        }

    Response:
        201 Created: ComparisonResult object with full delta data
        400 Bad Request: Validation errors or calculation failed
        403 Forbidden: User doesn't own the run
        404 Not Found: Survey or run not found
        500 Internal Server Error: Unexpected error
    """
    try:
        # Validate input
        serializer = CreateComparisonSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Validation failed', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data
        run_id = data['run_id']
        primary_survey_id = data['primary_survey_id']
        reference_survey_id = data['reference_survey_id']
        ratio_factor = data.get('ratio_factor', 5)

        # Verify run exists and user has access
        run = get_object_or_404(Run, id=run_id)
        if run.user != request.user:
            return Response(
                {'error': 'You do not have permission to create comparisons for this run'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verify surveys exist
        primary_survey = get_object_or_404(SurveyData, id=primary_survey_id)
        reference_survey = get_object_or_404(SurveyData, id=reference_survey_id)

        # Check if comparison already exists
        existing = ComparisonResult.objects.filter(
            primary_survey=primary_survey,
            reference_survey=reference_survey,
            ratio_factor=ratio_factor
        ).first()

        if existing:
            logger.info(f"Comparison already exists: {existing.id}, returning existing")
            result_serializer = ComparisonResultSerializer(existing)
            return Response(result_serializer.data, status=status.HTTP_200_OK)

        # Calculate deltas
        logger.info(f"Calculating deltas for comparison: primary={primary_survey_id}, ref={reference_survey_id}")

        delta_results = DeltaCalculationService.calculate_deltas(
            comparison_survey_id=str(primary_survey_id),
            reference_survey_id=str(reference_survey_id),
            ratio_factor=ratio_factor
        )

        # Create ComparisonResult
        comparison = ComparisonResult.objects.create(
            run=run,
            primary_survey=primary_survey,
            reference_survey=reference_survey,
            ratio_factor=ratio_factor,
            md_data=delta_results['md_aligned'],
            # Delta arrays
            delta_x=delta_results['delta_x'],
            delta_y=delta_results['delta_y'],
            delta_z=delta_results['delta_z'],
            delta_horizontal=delta_results['delta_horizontal'],
            delta_total=delta_results['delta_total'],
            delta_inc=delta_results['delta_inc'],
            delta_azi=delta_results['delta_azi'],
            # Reference survey full data
            reference_inc=delta_results.get('reference_inc'),
            reference_azi=delta_results.get('reference_azi'),
            reference_northing=delta_results.get('reference_northing'),
            reference_easting=delta_results.get('reference_easting'),
            reference_tvd=delta_results.get('reference_tvd'),
            # Comparison survey full data
            comparison_inc=delta_results.get('comparison_inc'),
            comparison_azi=delta_results.get('comparison_azi'),
            comparison_northing=delta_results.get('comparison_northing'),
            comparison_easting=delta_results.get('comparison_easting'),
            comparison_tvd=delta_results.get('comparison_tvd'),
            # Metadata
            statistics=delta_results['statistics'],
            created_by=request.user
        )

        logger.info(f"Comparison created: {comparison.id}")

        # Log activity
        try:
            log_activity(
                run_id=run.id,
                user=request.user,
                activity_type='comparison_created',
                description=f'Created comparison between {primary_survey.survey_file.file_name} and {reference_survey.survey_file.file_name}',
                metadata={
                    'comparison_id': str(comparison.id),
                    'primary_survey_id': str(primary_survey_id),
                    'reference_survey_id': str(reference_survey_id),
                    'ratio_factor': ratio_factor,
                    'num_stations': len(delta_results['md_aligned'])
                }
            )
        except Exception as log_error:
            logger.warning(f"Failed to log comparison creation: {str(log_error)}")

        # Serialize and return
        result_serializer = ComparisonResultSerializer(comparison)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)

    except Run.DoesNotExist:
        return Response(
            {'error': 'Run not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except SurveyData.DoesNotExist:
        return Response(
            {'error': 'Survey not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Comparison creation failed: {type(e).__name__}: {str(e)}")
        return Response(
            {'error': f'Failed to create comparison: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_comparison_detail(request, comparison_id):
    """
    Retrieve a comparison by ID.

    URL Parameters:
        comparison_id: UUID of the comparison

    Response:
        200 OK: ComparisonResult object with full delta data
        403 Forbidden: User doesn't own comparison
        404 Not Found: Comparison not found
    """
    try:
        comparison = get_object_or_404(
            ComparisonResult.objects.select_related(
                'run',
                'primary_survey',
                'reference_survey',
                'created_by'
            ),
            id=comparison_id
        )

        # Check permission
        if comparison.created_by != request.user:
            return Response(
                {'error': 'You do not have permission to access this comparison'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ComparisonResultSerializer(comparison)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except ComparisonResult.DoesNotExist:
        return Response(
            {'error': 'Comparison not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_comparisons(request):
    """
    List all comparisons for a run.

    Query Parameters:
        run_id (required): UUID of run
        page: Page number (default=1)
        page_size: Results per page (default=10, max=100)
        primary_survey_id: Filter by primary survey (optional)
        reference_survey_id: Filter by reference survey (optional)

    Response:
        200 OK: Paginated list of comparisons (lightweight, excludes delta arrays)
        400 Bad Request: Missing run_id parameter
        403 Forbidden: User doesn't own run
    """
    run_id = request.query_params.get('run_id')
    if not run_id:
        return Response(
            {'error': 'run_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Verify run exists and user has access
        run = get_object_or_404(Run, id=run_id)
        if run.user != request.user:
            return Response(
                {'error': 'You do not have permission to access this run'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Filter by run and user
        comparisons = ComparisonResult.objects.filter(
            run_id=run_id,
            created_by=request.user
        ).select_related(
            'primary_survey',
            'reference_survey'
        ).order_by('-created_at')

        # Optional filters
        primary_survey_id = request.query_params.get('primary_survey_id')
        if primary_survey_id:
            comparisons = comparisons.filter(primary_survey_id=primary_survey_id)

        reference_survey_id = request.query_params.get('reference_survey_id')
        if reference_survey_id:
            comparisons = comparisons.filter(reference_survey_id=reference_survey_id)

        # Pagination
        page_num = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 10)), 100)

        paginator = Paginator(comparisons, page_size)
        page = paginator.get_page(page_num)

        serializer = ComparisonResultListSerializer(page.object_list, many=True)

        return Response({
            'count': paginator.count,
            'total_pages': paginator.num_pages,
            'current_page': page_num,
            'page_size': page_size,
            'next': page.has_next(),
            'previous': page.has_previous(),
            'results': serializer.data
        }, status=status.HTTP_200_OK)

    except Run.DoesNotExist:
        return Response(
            {'error': 'Run not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Failed to list comparisons: {str(e)}")
        return Response(
            {'error': f'Failed to retrieve comparisons: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_comparison(request, comparison_id):
    """
    Delete a comparison.

    URL Parameters:
        comparison_id: UUID of the comparison

    Response:
        204 No Content: Comparison deleted successfully
        403 Forbidden: User doesn't own comparison
        404 Not Found: Comparison not found
    """
    try:
        comparison = get_object_or_404(ComparisonResult, id=comparison_id)

        # Check permission
        if comparison.created_by != request.user:
            return Response(
                {'error': 'You do not have permission to delete this comparison'},
                status=status.HTTP_403_FORBIDDEN
            )

        comparison.delete()
        logger.info(f"Comparison deleted: {comparison_id} by user {request.user.username}")

        return Response(status=status.HTTP_204_NO_CONTENT)

    except ComparisonResult.DoesNotExist:
        return Response(
            {'error': 'Comparison not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_comparison(request, comparison_id):
    """
    Export comparison results to Excel or CSV.

    URL Parameters:
        comparison_id: UUID of the comparison

    Query Parameters:
        format: 'excel' or 'csv' (default: 'excel')

    Response:
        200 OK: File download (Excel or CSV)
        400 Bad Request: Invalid format
        403 Forbidden: User doesn't own comparison
        404 Not Found: Comparison not found
        500 Internal Server Error: Export failed
    """
    try:
        # Check if comparison exists and user has access
        try:
            comparison = ComparisonResult.objects.get(id=comparison_id)
        except ComparisonResult.DoesNotExist:
            return Response(
                {'error': 'Comparison not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check permission
        if comparison.created_by != request.user:
            return Response(
                {'error': 'You do not have permission to export this comparison'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get export format
        export_format = request.query_params.get('format', 'excel').lower()
        if export_format not in ['excel', 'csv']:
            return Response(
                {'error': 'Invalid format. Must be "excel" or "csv"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        logger.info(f"Exporting comparison {comparison_id} in {export_format} format for user {request.user.username}")

        # Generate export file
        file_buffer, filename, content_type = ExcelExportService.export_comparison_results(
            comparison_id=str(comparison_id),
            format=export_format
        )

        # Create HTTP response
        response = HttpResponse(
            file_buffer.read(),
            content_type=content_type
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        logger.info(f"Comparison export completed: {filename}")
        return response

    except Exception as e:
        logger.error(f"Comparison export failed: {type(e).__name__}: {str(e)}")
        return Response(
            {'error': f'Export failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

