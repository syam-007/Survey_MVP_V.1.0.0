"""
File upload viewset for survey data.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from datetime import datetime
import logging
import os

from survey_api.serializers import FileUploadSerializer, SurveyDataSerializer
from survey_api.models import Run, SurveyFile, SurveyData, QualityCheck
from survey_api.services.file_parser_service import FileParserService, FileParsingError
from survey_api.services.qa_service import QAService
from survey_api.utils.survey_validators import SurveyFileValidator
from survey_api.exceptions import FileValidationError

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_survey_file(request):
    """
    Upload and process survey data file.

    Accepts multipart/form-data with:
    - file: Survey data file (.xlsx or .csv, max 50MB)
    - run_id: UUID of the Run
    - survey_type: Type of survey ('Type 1 - GTL', 'Type 2 - Gyro', etc.)

    Workflow:
    1. Validate file size and type
    2. Save file to storage
    3. Create SurveyFile record
    4. Parse file using pandas
    5. Validate parsed data
    6. Create SurveyData record with validation status
    7. Return response with file info and validation results

    Returns:
        201 Created: File uploaded successfully
        400 Bad Request: Validation failed
        404 Not Found: Run not found
        500 Internal Server Error: Processing error
    """
    # Validate request data
    serializer = FileUploadSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "error": "Invalid request data",
                "details": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get validated data
    uploaded_file = serializer.validated_data['file']
    run_id = serializer.validated_data['run_id']
    survey_type = serializer.validated_data['survey_type']

    logger.info(
        f"Processing file upload: {uploaded_file.name}, "
        f"Run ID: {run_id}, Survey Type: {survey_type}"
    )

    try:
        # Get the Run
        try:
            run = Run.objects.select_related('tieon').get(id=run_id)
        except Run.DoesNotExist:
            return Response(
                {"error": f"Run with id {run_id} does not exist"},
                status=status.HTTP_404_NOT_FOUND
            )

        # CRITICAL: Validate that Run has TieOn data before allowing file upload
        # TieOn is REQUIRED for accurate survey calculations
        if not hasattr(run, 'tieon') or run.tieon is None:
            logger.error(f"Upload rejected - Run {run_id} does not have tie-on data")
            return Response(
                {
                    "error": "Tie-on data required",
                    "details": [
                        f"Run '{run.run_name}' does not have tie-on information. "
                        "Please create tie-on data before uploading survey files. "
                        "Tie-on data is required for accurate survey trajectory calculations."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(uploaded_file.name)[1]
        unique_filename = f"{timestamp}_{uploaded_file.name}"

        # Save file to storage
        file_path = default_storage.save(
            f"survey_files/{unique_filename}",
            ContentFile(uploaded_file.read())
        )
        full_file_path = default_storage.path(file_path)

        logger.info(f"File saved to: {full_file_path}")

        # Create SurveyFile record
        survey_file = SurveyFile.objects.create(
            run=run,
            file_name=uploaded_file.name,
            file_path=file_path,
            file_size=uploaded_file.size,
            survey_type=_map_survey_type_to_file_type(survey_type),
            processing_status='uploaded'
        )

        logger.info(f"Created SurveyFile record: {survey_file.id}")

        # Parse the file
        try:
            parsed_data = FileParserService.parse_survey_file(
                full_file_path,
                survey_type
            )
            logger.info(f"Successfully parsed file with {parsed_data['row_count']} rows")
        except FileParsingError as e:
            logger.error(f"File parsing error: {e}")
            survey_file.processing_status = 'failed'
            survey_file.save()

            return Response(
                {
                    "error": "File parsing failed",
                    "details": [str(e)]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate the parsed data
        is_valid, validation_errors = SurveyFileValidator.validate_file(
            parsed_data,
            survey_type
        )

        # Prepend tie-on values to the survey data
        # This ensures the tie-on point appears as the first row in the results
        # Use actual tie-on MD, INC, and AZI values for accurate calculations
        tie_on = run.tieon
        md_data_with_tieon = [float(tie_on.md)] + parsed_data['md_data']
        inc_data_with_tieon = [float(tie_on.inc)] + parsed_data['inc_data']
        azi_data_with_tieon = [float(tie_on.azi)] + parsed_data['azi_data']

        # Update row count to include tie-on point
        row_count_with_tieon = len(md_data_with_tieon)

        logger.debug(f"Prepended tie-on point: MD={tie_on.md}, INC={tie_on.inc}, AZI={tie_on.azi}")
        logger.debug(f"Row count: {parsed_data['row_count']} -> {row_count_with_tieon} (including tie-on)")

        # Create SurveyData record with tie-on prepended
        survey_data = SurveyData.objects.create(
            survey_file=survey_file,
            md_data=md_data_with_tieon,
            inc_data=inc_data_with_tieon,
            azi_data=azi_data_with_tieon,
            wt_data=parsed_data.get('wt_data'),
            gt_data=parsed_data.get('gt_data'),
            row_count=row_count_with_tieon,
            validation_status='valid' if is_valid else 'invalid',
            validation_errors=validation_errors if not is_valid else None
        )

        # Update SurveyFile processing status
        # Set to completed regardless of validation (validation warnings, not errors)
        survey_file.processing_status = 'completed'
        survey_file.save()

        if is_valid:
            logger.info(f"File validation passed. Created SurveyData: {survey_data.id}")
        else:
            logger.warning(
                f"File validation failed with {len(validation_errors)} errors. "
                f"Created SurveyData: {survey_data.id} (Proceeding anyway)"
            )

        # Check if this is a GTL survey that requires QA
        qa_data = None
        is_gtl_survey = survey_type == 'Type 1 - GTL'

        if is_gtl_survey:
            logger.info(f"GTL survey detected - performing QA calculations")
            try:
                # Get location G(t) and W(t) from run's well location
                location = run.well.location if hasattr(run, 'well') and run.well and hasattr(run.well, 'location') else None
                if not location:
                    logger.error(f"Cannot perform QA - Location data not found for Run {run_id}")
                    return Response(
                        {
                            "error": "Location data required for GTL QA",
                            "details": ["GTL surveys require location G(t) and W(t) values for quality assurance"]
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                location_g_t = float(location.g_t) if location.g_t else 0.0
                location_w_t = float(location.w_t) if location.w_t else 0.0

                # Perform QA calculations (without tie-on prepended data)
                qa_metrics = QAService.calculate_qa_metrics(
                    md_data=parsed_data['md_data'],
                    inc_data=parsed_data['inc_data'],
                    azi_data=parsed_data['azi_data'],
                    gt_data=parsed_data.get('gt_data', []),
                    wt_data=parsed_data.get('wt_data', []),
                    location_g_t=location_g_t,
                    location_w_t=location_w_t
                )

                # Create QualityCheck record with pending status
                quality_check = QualityCheck.objects.create(
                    run=run,
                    survey_data=survey_data,
                    file_name=uploaded_file.name,
                    md_data=parsed_data['md_data'],
                    inc_data=parsed_data['inc_data'],
                    azi_data=parsed_data['azi_data'],
                    gt_data=parsed_data.get('gt_data', []),
                    wt_data=parsed_data.get('wt_data', []),
                    g_t_difference_data=qa_metrics['g_t_difference_data'],
                    w_t_difference_data=qa_metrics['w_t_difference_data'],
                    g_t_status_data=qa_metrics['g_t_status_data'],
                    w_t_status_data=qa_metrics['w_t_status_data'],
                    overall_status_data=qa_metrics['overall_status_data'],
                    total_g_t_difference=qa_metrics['total_g_t_difference'],
                    total_g_t_difference_pass=qa_metrics['total_g_t_difference_pass'],
                    total_w_t_difference=qa_metrics['total_w_t_difference'],
                    total_w_t_difference_pass=qa_metrics['total_w_t_difference_pass'],
                    g_t_percentage=qa_metrics['g_t_percentage'],
                    w_t_percentage=qa_metrics['w_t_percentage'],
                    pass_count=qa_metrics['pass_count'],
                    remove_count=qa_metrics['remove_count'],
                    status='pending'
                )

                logger.info(f"QA calculations completed - QualityCheck ID: {quality_check.id}")

                # Prepare QA data for response
                qa_data = {
                    "qa_required": True,
                    "qa_id": str(quality_check.id),
                    "summary": {
                        "total_stations": len(parsed_data['md_data']),
                        "pass_count": qa_metrics['pass_count'],
                        "remove_count": qa_metrics['remove_count'],
                        "g_t_percentage": float(qa_metrics['g_t_percentage']),
                        "w_t_percentage": float(qa_metrics['w_t_percentage'])
                    }
                }

            except Exception as e:
                logger.exception(f"Error performing QA calculations: {e}")
                # Don't fail the upload, just log the error
                qa_data = {"qa_required": False, "qa_error": str(e)}

        # Prepare response
        response_data = {
            "id": str(survey_data.id),
            "survey_file": {
                "id": str(survey_file.id),
                "file_name": survey_file.file_name,
                "file_size": survey_file.file_size,
                "survey_type": survey_file.survey_type,
                "processing_status": survey_file.processing_status,
            },
            "survey_data": {
                "id": str(survey_data.id),
                "row_count": survey_data.row_count,
                "validation_status": survey_data.validation_status,
            },
            "message": "File uploaded successfully" if is_valid else "File uploaded with validation warnings"
        }

        # Add QA data if this is a GTL survey
        if qa_data:
            response_data["qa_data"] = qa_data

        # Add validation warnings if any (but don't fail the request)
        if not is_valid:
            response_data["warnings"] = validation_errors
            logger.info(f"Returning success with validation warnings")

        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.exception(f"Unexpected error during file upload: {e}")
        return Response(
            {
                "error": "Internal server error",
                "details": [str(e)]
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_survey_file(request, file_id):
    """
    Delete a survey file and its associated data.

    Args:
        file_id: UUID of the SurveyFile to delete

    Returns:
        204 No Content: File deleted successfully
        404 Not Found: File not found
        500 Internal Server Error: Deletion error
    """
    try:
        # Get the survey file
        try:
            survey_file = SurveyFile.objects.get(id=file_id)
        except SurveyFile.DoesNotExist:
            return Response(
                {"error": f"Survey file with id {file_id} does not exist"},
                status=status.HTTP_404_NOT_FOUND
            )

        logger.info(f"Deleting survey file: {survey_file.file_name} (ID: {file_id})")

        # Delete physical file from storage
        try:
            if default_storage.exists(survey_file.file_path):
                default_storage.delete(survey_file.file_path)
                logger.info(f"Deleted physical file: {survey_file.file_path}")
        except Exception as e:
            logger.warning(f"Failed to delete physical file: {e}")
            # Continue with database deletion even if file deletion fails

        # Delete the survey file record (cascade will delete related SurveyData)
        survey_file.delete()
        logger.info(f"Successfully deleted survey file record: {file_id}")

        return Response(status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        logger.exception(f"Unexpected error during file deletion: {e}")
        return Response(
            {
                "error": "Internal server error",
                "details": [str(e)]
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _map_survey_type_to_file_type(survey_type: str) -> str:
    """
    Map survey type to SurveyFile survey_type field.

    Args:
        survey_type: Full survey type (e.g., 'Type 1 - GTL')

    Returns:
        Short survey type (e.g., 'GTL')
    """
    mapping = {
        'Type 1 - GTL': 'GTL',
        'Type 2 - Gyro': 'Gyro',
        'Type 3 - MWD': 'MWD',
        'Type 4 - Unknown': 'Unknown',
    }
    return mapping.get(survey_type, 'Unknown')
