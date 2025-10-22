"""
Reference Survey API Viewset.

Provides endpoints for uploading, listing, and retrieving reference surveys.
Reference surveys are used for comparison analysis against primary surveys.
"""
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from survey_api.models import Run, SurveyFile, SurveyData
from survey_api.serializers import ReferenceSurveySerializer
from survey_api.services.file_parser_service import FileParserService

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_reference_survey(request):
    """
    Upload a reference survey file for comparison.

    Applies current run's location, depth, and tie-on context.
    Automatically triggers calculation and interpolation at resolution=10.

    Parameters:
    - file: Survey data file (.xlsx or .csv)
    - run_id: UUID of the run
    - primary_survey_id: UUID of primary survey (optional)
    - survey_type: Type of survey (GTL, Gyro, MWD)

    Returns:
    - 201: Reference survey uploaded successfully
    - 400: Invalid request data
    - 404: Run or primary survey not found
    - 500: Internal server error
    """
    try:
        # Extract parameters
        file = request.FILES.get('file')
        run_id = request.data.get('run_id')
        primary_survey_id = request.data.get('primary_survey_id')  # Optional
        survey_type = request.data.get('survey_type')

        # Validate required parameters
        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not run_id:
            return Response(
                {'error': 'run_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not survey_type:
            return Response(
                {'error': 'survey_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get run and verify ownership
        run = get_object_or_404(Run, id=run_id)
        if run.user != request.user:
            return Response(
                {'error': 'You do not have permission to upload to this run'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get primary survey if provided
        primary_survey = None
        if primary_survey_id:
            primary_survey = get_object_or_404(
                SurveyFile,
                id=primary_survey_id,
                run=run,
                survey_role='primary'
            )

        # Save the file
        from django.core.files.storage import default_storage
        import os
        from datetime import datetime

        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"reference_{timestamp}_{file.name}"
        file_path = default_storage.save(f'survey_files/{filename}', file)

        # Create SurveyFile record
        survey_file = SurveyFile.objects.create(
            run=run,
            file_name=file.name,
            file_path=file_path,
            file_size=file.size,
            survey_type=survey_type,
            survey_role='reference',  # KEY: Mark as reference
            reference_for_survey=primary_survey,
            processing_status='uploaded'
        )

        logger.info(f"Reference survey file created: {survey_file.id} for run {run_id}")

        # Parse file and create SurveyData (triggers calculation via signal)
        try:
            survey_data = FileParserService.parse_and_create(survey_file)
            logger.info(f"Reference survey data parsed: {survey_data.id}")

            return Response({
                'message': 'Reference survey uploaded successfully',
                'survey_file_id': str(survey_file.id),
                'survey_data_id': str(survey_data.id),
                'processing_status': 'processing',
                'survey_role': 'reference',
                'primary_survey': str(primary_survey.id) if primary_survey else None
            }, status=status.HTTP_201_CREATED)

        except Exception as parse_error:
            # Update status to failed
            survey_file.processing_status = 'failed'
            survey_file.save()
            logger.error(f"Failed to parse reference survey: {str(parse_error)}")
            return Response(
                {'error': f'Failed to parse file: {str(parse_error)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    except Run.DoesNotExist:
        return Response(
            {'error': 'Run not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except SurveyFile.DoesNotExist:
        return Response(
            {'error': 'Primary survey not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Reference survey upload failed: {str(e)}")
        return Response(
            {'error': f'Upload failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_reference_surveys(request):
    """
    List all reference surveys for a run.

    Query Parameters:
    - run_id: UUID of the run (required)
    - primary_survey_id: UUID of primary survey (optional filter)
    - processing_status: Filter by processing status (optional)

    Returns:
    - 200: List of reference surveys
    - 400: Missing run_id parameter
    - 500: Internal server error
    """
    run_id = request.query_params.get('run_id')
    primary_survey_id = request.query_params.get('primary_survey_id')
    processing_status_filter = request.query_params.get('processing_status')

    if not run_id:
        return Response(
            {'error': 'run_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Get run and verify ownership
        run = get_object_or_404(Run, id=run_id)
        if run.user != request.user:
            return Response(
                {'error': 'You do not have permission to access this run'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Base query: all reference surveys for this run
        references = SurveyFile.objects.filter(
            run_id=run_id,
            survey_role='reference'
        ).select_related(
            'reference_for_survey'
        ).prefetch_related(
            'survey_data_set',
            'survey_data_set__calculated_survey'
        ).order_by('-created_at')

        # Optional filter by primary survey
        if primary_survey_id:
            references = references.filter(reference_for_survey_id=primary_survey_id)

        # Optional filter by processing status
        if processing_status_filter:
            references = references.filter(processing_status=processing_status_filter)

        # Serialize
        serializer = ReferenceSurveySerializer(references, many=True)

        return Response({
            'count': references.count(),
            'results': serializer.data
        }, status=status.HTTP_200_OK)

    except Run.DoesNotExist:
        return Response(
            {'error': 'Run not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Failed to list reference surveys: {str(e)}")
        return Response(
            {'error': f'Failed to retrieve references: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_reference_survey_detail(request, id):
    """
    Get detailed information about a specific reference survey.

    Parameters:
    - id: UUID of the reference survey file

    Returns:
    - 200: Reference survey details
    - 403: Permission denied
    - 404: Reference survey not found
    - 500: Internal server error
    """
    try:
        # Get reference survey
        reference = get_object_or_404(
            SurveyFile.objects.select_related(
                'run',
                'reference_for_survey'
            ).prefetch_related(
                'survey_data_set',
                'survey_data_set__calculated_survey'
            ),
            id=id,
            survey_role='reference'
        )

        # Verify ownership
        if reference.run.user != request.user:
            return Response(
                {'error': 'You do not have permission to access this reference survey'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Serialize
        serializer = ReferenceSurveySerializer(reference)

        return Response(serializer.data, status=status.HTTP_200_OK)

    except SurveyFile.DoesNotExist:
        return Response(
            {'error': 'Reference survey not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Failed to retrieve reference survey detail: {str(e)}")
        return Response(
            {'error': f'Failed to retrieve reference: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
