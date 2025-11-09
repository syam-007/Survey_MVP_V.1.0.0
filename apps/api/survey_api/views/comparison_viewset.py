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
def compare_surveys_temp(request):
    """
    Compare two survey files temporarily without saving to database.

    Request Body:
        {
            "file1_id": "uuid",  // Survey file ID
            "file2_id": "uuid",  // Survey file ID
            "resolution": 5      // Optional, interpolation resolution in meters (default: 5, range: 1-100)
        }

    Response:
        200 OK: Comparison results (not saved to database)
        400 Bad Request: Validation errors
        404 Not Found: Survey file not found
        500 Internal Server Error: Calculation failed
    """
    try:
        file1_id = request.data.get('file1_id')
        file2_id = request.data.get('file2_id')
        resolution = request.data.get('resolution', 5)  # Default to 5 meters

        if not file1_id or not file2_id:
            return Response(
                {'error': 'Both file1_id and file2_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate resolution
        try:
            resolution = float(resolution)
            if resolution < 1 or resolution > 100:
                return Response(
                    {'error': 'Resolution must be between 1 and 100 meters'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid resolution value'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get survey data for both files
        from survey_api.models import SurveyFile
        survey_file1 = get_object_or_404(SurveyFile, id=file1_id)
        survey_file2 = get_object_or_404(SurveyFile, id=file2_id)

        # Get the survey data (assuming there's one survey data per file)
        survey_data1 = SurveyData.objects.filter(survey_file=survey_file1).first()
        survey_data2 = SurveyData.objects.filter(survey_file=survey_file2).first()

        if not survey_data1 or not survey_data2:
            return Response(
                {'error': 'Survey data not found for one or both files'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Calculate deltas without saving
        logger.info(f"Temporary comparison: {file1_id} vs {file2_id} with resolution {resolution}m")

        delta_results = DeltaCalculationService.calculate_deltas(
            comparison_survey_id=str(survey_data1.id),
            reference_survey_id=str(survey_data2.id),
            ratio_factor=resolution  # Use user-defined resolution
        )

        # Log activity for temporary comparison
        try:
            # Get the run from the first survey file
            run = survey_file1.run
            if run:
                description = (
                    f'Comparison Performed (Temporary)\n'
                    f'Primary Survey: {survey_file1.file_name}\n'
                    f'Reference Survey: {survey_file2.file_name}\n'
                    f'Resolution: {resolution}m, Stations: {len(delta_results["md_aligned"])}'
                )

                log_activity(
                    run_id=run.id,
                    user=request.user,
                    activity_type='comparison_created',
                    description=description,
                    metadata={
                        'comparison_type': 'temporary',
                        'primary_file_id': str(file1_id),
                        'reference_file_id': str(file2_id),
                        'primary_file_name': survey_file1.file_name,
                        'reference_file_name': survey_file2.file_name,
                        'resolution': resolution,
                        'num_stations': len(delta_results['md_aligned'])
                    }
                )
        except Exception as log_error:
            logger.warning(f"Failed to log temporary comparison: {str(log_error)}")

        # Format results for display
        md_data = delta_results['md_aligned']
        results = []

        for i in range(len(md_data)):
            results.append({
                'depth': float(md_data[i]),
                'inclination1': float(delta_results.get('comparison_inc', [])[i]) if i < len(delta_results.get('comparison_inc', [])) else 0,
                'azimuth1': float(delta_results.get('comparison_azi', [])[i]) if i < len(delta_results.get('comparison_azi', [])) else 0,
                'inclination2': float(delta_results.get('reference_inc', [])[i]) if i < len(delta_results.get('reference_inc', [])) else 0,
                'azimuth2': float(delta_results.get('reference_azi', [])[i]) if i < len(delta_results.get('reference_azi', [])) else 0,
                'inc_diff': float(delta_results['delta_inc'][i]) if i < len(delta_results['delta_inc']) else 0,
                'azi_diff': float(delta_results['delta_azi'][i]) if i < len(delta_results['delta_azi']) else 0,
                'delta_horizontal': float(delta_results['delta_horizontal'][i]) if i < len(delta_results['delta_horizontal']) else 0,
                'delta_vertical': float(delta_results['delta_z'][i]) if i < len(delta_results['delta_z']) else 0,
                # Comparison survey coordinates
                'comparison_north': float(delta_results.get('comparison_northing', [])[i]) if i < len(delta_results.get('comparison_northing', [])) else 0,
                'comparison_east': float(delta_results.get('comparison_easting', [])[i]) if i < len(delta_results.get('comparison_easting', [])) else 0,
                'comparison_tvd': float(delta_results.get('comparison_tvd', [])[i]) if i < len(delta_results.get('comparison_tvd', [])) else 0,
                # Reference survey coordinates
                'reference_north': float(delta_results.get('reference_northing', [])[i]) if i < len(delta_results.get('reference_northing', [])) else 0,
                'reference_east': float(delta_results.get('reference_easting', [])[i]) if i < len(delta_results.get('reference_easting', [])) else 0,
                'reference_tvd': float(delta_results.get('reference_tvd', [])[i]) if i < len(delta_results.get('reference_tvd', [])) else 0,
                # Deltas
                'delta_north': float(delta_results.get('delta_y', [])[i]) if i < len(delta_results.get('delta_y', [])) else 0,
                'delta_east': float(delta_results.get('delta_x', [])[i]) if i < len(delta_results.get('delta_x', [])) else 0,
                'delta_tvd': float(delta_results.get('delta_z', [])[i]) if i < len(delta_results.get('delta_z', [])) else 0,
                # Total displacement
                'displacement': float(delta_results.get('delta_total', [])[i]) if i < len(delta_results.get('delta_total', [])) else 0,
            })

        return Response({
            'results': results,
            'statistics': delta_results.get('statistics', {}),
            'file1_name': survey_file1.file_name,
            'file2_name': survey_file2.file_name,
            # Add coordinate arrays for 3D plot
            'comparison_easting': delta_results.get('comparison_easting', []),
            'comparison_northing': delta_results.get('comparison_northing', []),
            'comparison_tvd': delta_results.get('comparison_tvd', []),
            'reference_easting': delta_results.get('reference_easting', []),
            'reference_northing': delta_results.get('reference_northing', []),
            'reference_tvd': delta_results.get('reference_tvd', []),
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Temporary comparison failed: {type(e).__name__}: {str(e)}")

        # Check for specific error types and provide user-friendly messages
        error_message = str(e)

        # Handle data inconsistency errors
        if 'data inconsistency' in error_message.lower() or 'length' in error_message.lower():
            return Response(
                {
                    'error': 'Survey Data Inconsistency',
                    'message': 'One or both survey files have incomplete or inconsistent data. Some rows may be missing coordinate values (Easting, Northing, or TVD) while having MD (Measured Depth) values.',
                    'details': error_message,
                    'suggestion': 'Please check your Excel files and ensure all rows have complete data for MD, Inc, Azi, Easting, Northing, and TVD columns.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Handle other errors
        return Response(
            {
                'error': 'Comparison Failed',
                'message': 'An error occurred while comparing the surveys.',
                'details': error_message
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


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

        # Log activity with detailed information
        try:
            # Get file names from surveys
            primary_file_name = primary_survey.survey_file.file_name if primary_survey.survey_file else 'Unknown'
            reference_file_name = reference_survey.survey_file.file_name if reference_survey.survey_file else 'Unknown'

            # Create detailed description
            description = (
                f'Comparison Created - Run: {run.run_number}\n'
                f'Primary Survey: {primary_file_name}\n'
                f'Reference Survey: {reference_file_name}\n'
                f'Resolution: {ratio_factor}m, Stations: {len(delta_results["md_aligned"])}'
            )

            log_activity(
                run_id=run.id,
                user=request.user,
                activity_type='comparison_created',
                description=description,
                metadata={
                    'comparison_id': str(comparison.id),
                    'primary_survey_id': str(primary_survey_id),
                    'reference_survey_id': str(reference_survey_id),
                    'primary_file_name': primary_file_name,
                    'reference_file_name': reference_file_name,
                    'ratio_factor': ratio_factor,
                    'num_stations': len(delta_results['md_aligned']),
                    'run_number': run.run_number,
                    'run_name': run.run_name
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

        # Log activity
        try:
            primary_file_name = comparison.primary_survey.survey_file.file_name if comparison.primary_survey.survey_file else 'Unknown'
            reference_file_name = comparison.reference_survey.survey_file.file_name if comparison.reference_survey.survey_file else 'Unknown'

            description = (
                f'Comparison Viewed\n'
                f'Primary Survey: {primary_file_name}\n'
                f'Reference Survey: {reference_file_name}'
            )

            log_activity(
                run_id=comparison.run.id,
                user=request.user,
                activity_type='comparison_viewed',
                description=description,
                metadata={
                    'comparison_id': str(comparison_id),
                    'primary_file_name': primary_file_name,
                    'reference_file_name': reference_file_name
                }
            )
        except Exception as log_error:
            logger.warning(f"Failed to log comparison view: {str(log_error)}")

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

        # Log activity before deleting
        try:
            primary_file_name = comparison.primary_survey.survey_file.file_name if comparison.primary_survey.survey_file else 'Unknown'
            reference_file_name = comparison.reference_survey.survey_file.file_name if comparison.reference_survey.survey_file else 'Unknown'

            description = (
                f'Comparison Deleted\n'
                f'Primary Survey: {primary_file_name}\n'
                f'Reference Survey: {reference_file_name}'
            )

            log_activity(
                run_id=comparison.run.id,
                user=request.user,
                activity_type='comparison_deleted',
                description=description,
                metadata={
                    'comparison_id': str(comparison_id),
                    'primary_file_name': primary_file_name,
                    'reference_file_name': reference_file_name
                }
            )
        except Exception as log_error:
            logger.warning(f"Failed to log comparison deletion: {str(log_error)}")

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

        # Log activity
        try:
            primary_file_name = comparison.primary_survey.survey_file.file_name if comparison.primary_survey.survey_file else 'Unknown'
            reference_file_name = comparison.reference_survey.survey_file.file_name if comparison.reference_survey.survey_file else 'Unknown'

            description = (
                f'Comparison Exported ({export_format.upper()})\n'
                f'Primary Survey: {primary_file_name}\n'
                f'Reference Survey: {reference_file_name}\n'
                f'File: {filename}'
            )

            log_activity(
                run_id=comparison.run.id,
                user=request.user,
                activity_type='comparison_exported',
                description=description,
                metadata={
                    'comparison_id': str(comparison_id),
                    'primary_file_name': primary_file_name,
                    'reference_file_name': reference_file_name,
                    'export_format': export_format,
                    'filename': filename
                }
            )
        except Exception as log_error:
            logger.warning(f"Failed to log comparison export: {str(log_error)}")

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

