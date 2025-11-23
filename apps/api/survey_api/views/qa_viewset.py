"""
Quality Assurance viewset for GTL survey uploads.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.db import transaction
from datetime import datetime
import logging
import os

from survey_api.models import Run, QualityCheck, SurveyFile, SurveyData
from survey_api.services.file_parser_service import FileParserService, FileParsingError
from survey_api.services.qa_service import QAService
from survey_api.services.survey_calculation_service import SurveyCalculationService
from survey_api.serializers import FileUploadSerializer

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_gtl_for_qa(request):
    """
    Upload GTL survey file and return QA results for review.

    Does NOT save survey data to database yet. Returns QA metrics
    for user review before final save.

    Accepts multipart/form-data with:
    - file: Survey data file (.xlsx or .csv, max 50MB)
    - run_id: UUID of the Run
    - survey_type: Must be 'Type 1 - GTL'

    Returns:
        201 Created: QA results ready for review
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

    # Validate that this is a GTL survey
    if survey_type != 'Type 1 - GTL':
        return Response(
            {
                "error": "Invalid survey type",
                "details": "This endpoint only accepts GTL (Type 1) surveys"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    logger.info(
        f"Processing GTL QA upload: {uploaded_file.name}, Run ID: {run_id}"
    )

    try:
        # Get the Run with location
        try:
            run = Run.objects.select_related('tieon', 'well__location').get(id=run_id)
        except Run.DoesNotExist:
            return Response(
                {"error": f"Run with id {run_id} does not exist"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Validate Run has TieOn data
        if not hasattr(run, 'tieon') or run.tieon is None:
            return Response(
                {
                    "error": "Tie-on data required",
                    "details": [
                        f"Run '{run.run_name}' does not have tie-on information. "
                        "Please create tie-on data before uploading survey files."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get location data for QA calculations
        location = None
        if hasattr(run, 'well') and run.well and hasattr(run.well, 'location'):
            location = run.well.location

        if not location:
            return Response(
                {
                    "error": "Location data required",
                    "details": [
                        f"Run '{run.run_name}' does not have location information. "
                        "Location data is required for GTL QA calculations."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{uploaded_file.name}"

        # Save file to temporary storage
        file_path = default_storage.save(
            f"survey_files/qa_temp/{unique_filename}",
            ContentFile(uploaded_file.read())
        )
        full_file_path = default_storage.path(file_path)

        logger.info(f"File saved to temporary location: {full_file_path}")

        # Parse the file
        try:
            parsed_data = FileParserService.parse_survey_file(
                full_file_path,
                survey_type
            )
            logger.info(f"Successfully parsed file with {parsed_data['row_count']} rows")
        except FileParsingError as e:
            logger.error(f"File parsing error: {e}")
            # Clean up temporary file
            if default_storage.exists(file_path):
                default_storage.delete(file_path)

            return Response(
                {
                    "error": "File parsing failed",
                    "details": [str(e)]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract data arrays
        md_data = parsed_data['md_data']
        inc_data = parsed_data['inc_data']
        azi_data = parsed_data['azi_data']
        gt_data = parsed_data['gt_data']
        wt_data = parsed_data['wt_data']

        # Get location G(t) and W(t) values (already rounded to 1 decimal place in database)
        location_g_t = float(location.g_t or 0)
        location_w_t = float(location.w_t or 0)

        logger.info(f"Using location G(t)={location_g_t}, W(t)={location_w_t} for QA")

        # Calculate QA metrics
        qa_results = QAService.calculate_qa_metrics(
            md_data=md_data,
            inc_data=inc_data,
            azi_data=azi_data,
            gt_data=gt_data,
            wt_data=wt_data,
            location_g_t=location_g_t,
            location_w_t=location_w_t
        )

        # Create SurveyFile and SurveyData with pending_qa status
        # This allows us to navigate to Survey Results page with a survey_data_id
        with transaction.atomic():
            # Create SurveyFile record
            survey_file = SurveyFile.objects.create(
                run=run,
                file_name=uploaded_file.name,
                file_path=file_path,
                file_size=uploaded_file.size,
                survey_type='GTL',
                processing_status='pending_qa'  # Special status for QA review
            )

            # Create SurveyData record with pending_qa status (without tie-on data)
            survey_data = SurveyData.objects.create(
                survey_file=survey_file,
                md_data=md_data,
                inc_data=inc_data,
                azi_data=azi_data,
                wt_data=wt_data,
                gt_data=gt_data,
                row_count=len(md_data),
                validation_status='pending_qa',  # Special status indicating QA review needed
                validation_errors=None
            )

            # Create QualityCheck record linked to SurveyData
            quality_check = QualityCheck.objects.create(
                run=run,
                survey_data=survey_data,
                file_name=uploaded_file.name,
                md_data=md_data,
                inc_data=inc_data,
                azi_data=azi_data,
                gt_data=gt_data,
                wt_data=wt_data,
                g_t_difference_data=qa_results['g_t_difference_data'],
                w_t_difference_data=qa_results['w_t_difference_data'],
                g_t_status_data=qa_results['g_t_status_data'],
                w_t_status_data=qa_results['w_t_status_data'],
                overall_status_data=qa_results['overall_status_data'],
                total_g_t_difference=qa_results['total_g_t_difference'],
                total_w_t_difference=qa_results['total_w_t_difference'],
                total_g_t_difference_pass=qa_results['total_g_t_difference_pass'],
                total_w_t_difference_pass=qa_results['total_w_t_difference_pass'],
                g_t_percentage=qa_results['g_t_percentage'],
                w_t_percentage=qa_results['w_t_percentage'],
                pass_count=qa_results['pass_count'],
                remove_count=qa_results['remove_count'],
                status='pending'
            )

        logger.info(f"Created SurveyData {survey_data.id} with pending_qa status for QA review")

        # Prepare response with QA data for frontend review
        stations = []
        for i in range(len(md_data)):
            stations.append({
                'index': i,
                'md': md_data[i],
                'inc': inc_data[i],
                'azi': azi_data[i],
                'g_t': gt_data[i],
                'w_t': wt_data[i],
                'g_t_difference': qa_results['g_t_difference_data'][i],
                'w_t_difference': qa_results['w_t_difference_data'][i],
                'g_t_status': qa_results['g_t_status_data'][i],
                'w_t_status': qa_results['w_t_status_data'][i],
                'overall_status': qa_results['overall_status_data'][i],
            })

        response_data = {
            "qa_id": str(quality_check.id),
            "survey_data_id": str(survey_data.id),  # Include survey_data_id for navigation
            "run_id": str(run_id),
            "file_name": uploaded_file.name,
            "summary": {
                "total_stations": len(md_data),
                "pass_count": qa_results['pass_count'],
                "remove_count": qa_results['remove_count'],
                "g_t_score": f"{qa_results['total_g_t_difference_pass']:.2f} / {qa_results['total_g_t_difference']:.2f}",
                "w_t_score": f"{qa_results['total_w_t_difference_pass']:.2f} / {qa_results['total_w_t_difference']:.2f}",
                "g_t_percentage": round(qa_results['g_t_percentage'], 2),
                "w_t_percentage": round(qa_results['w_t_percentage'], 2),
                "location_g_t": location_g_t,
                "location_w_t": location_w_t,
                "delta_wt_score": qa_results['delta_wt_score'],
                "delta_wt_percentage": qa_results['delta_wt_percentage'],
                "delta_gt_score": qa_results['delta_gt_score'],
                "delta_gt_percentage": qa_results['delta_gt_percentage'],
                "w_t_score_points": qa_results['w_t_score_points'],
                "g_t_score_points": qa_results['g_t_score_points'],
                "max_score": qa_results['max_score'],
                "total_rows": qa_results['total_rows'],
            },
            "stations": stations,
            "message": "QA review required. Navigate to Survey Results page to review and approve."
        }

        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.exception(f"Unexpected error during GTL QA upload: {e}")
        return Response(
            {
                "error": "Internal server error",
                "details": [str(e)]
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_qa_approved(request, qa_id):
    """
    Save GTL survey data to database after QA approval.

    Accepts JSON with:
    - indices_to_keep: List of station indices to keep (optional)
      If not provided, all PASS stations are kept.

    Returns:
        201 Created: Survey data saved successfully
        404 Not Found: QA record not found
        400 Bad Request: Invalid request
        500 Internal Server Error: Processing error
    """
    try:
        # Get QualityCheck record
        try:
            quality_check = QualityCheck.objects.select_related('run__tieon').get(id=qa_id)
        except QualityCheck.DoesNotExist:
            return Response(
                {"error": f"QA record with id {qa_id} does not exist"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get indices to keep from request (optional)
        indices_to_keep = request.data.get('indices_to_keep')

        # If indices provided, filter by indices
        # Otherwise, filter to keep only PASS stations
        if indices_to_keep is not None:
            filtered_data = QAService.filter_stations_by_indices(
                md_data=quality_check.md_data,
                inc_data=quality_check.inc_data,
                azi_data=quality_check.azi_data,
                gt_data=quality_check.gt_data,
                wt_data=quality_check.wt_data,
                indices_to_keep=indices_to_keep
            )
        else:
            # Keep only PASS stations
            filtered_data = QAService.filter_stations_by_status(
                md_data=quality_check.md_data,
                inc_data=quality_check.inc_data,
                azi_data=quality_check.azi_data,
                gt_data=quality_check.gt_data,
                wt_data=quality_check.wt_data,
                overall_status_data=quality_check.overall_status_data,
                include_status='PASS'
            )

        run = quality_check.run
        tie_on = run.tieon

        # Get location data for score calculation
        location = None
        if hasattr(run, 'well') and run.well and hasattr(run.well, 'location'):
            location = run.well.location

        # Calculate scores on the filtered data before approval
        if location:
            location_g_t = float(location.g_t or 0)
            location_w_t = float(location.w_t or 0)

            # Recalculate QA metrics on filtered data to get scores
            qa_results_filtered = QAService.calculate_qa_metrics(
                md_data=filtered_data['md_data'],
                inc_data=filtered_data['inc_data'],
                azi_data=filtered_data['azi_data'],
                gt_data=filtered_data['gt_data'],
                wt_data=filtered_data['wt_data'],
                location_g_t=location_g_t,
                location_w_t=location_w_t
            )

            # Update QualityCheck with scores (saved to database)
            quality_check.delta_wt_score = qa_results_filtered['delta_wt_score']
            quality_check.delta_wt_percentage = qa_results_filtered['delta_wt_percentage']
            quality_check.delta_gt_score = qa_results_filtered['delta_gt_score']
            quality_check.delta_gt_percentage = qa_results_filtered['delta_gt_percentage']
            quality_check.w_t_score_points = qa_results_filtered['w_t_score_points']
            quality_check.g_t_score_points = qa_results_filtered['g_t_score_points']
            quality_check.max_score = qa_results_filtered['max_score']
            quality_check.total_rows = qa_results_filtered['total_rows']

            logger.info(
                f"Calculated scores for approval: "
                f"Delta W(t): {quality_check.delta_wt_percentage}%, "
                f"Delta G(t): {quality_check.delta_gt_percentage}%"
            )

        # Prepend tie-on values
        # Use location G(T) and W(T) for tie-on row (TieOn model doesn't have these)
        tieon_g_t = location_g_t if location else 0
        tieon_w_t = location_w_t if location else 0

        # CRITICAL FIX: Use ORIGINAL unfiltered data for SurveyData (like Gyro does)
        # This ensures all stations get calculated coordinates, matching Gyro behavior
        # The filtered_data is only for QA score calculation above, not for trajectory calculations
        md_data_with_tieon = [float(tie_on.md)] + quality_check.md_data
        inc_data_with_tieon = [float(tie_on.inc)] + quality_check.inc_data
        azi_data_with_tieon = [float(tie_on.azi)] + quality_check.azi_data
        gt_data_with_tieon = [tieon_g_t] + quality_check.gt_data
        wt_data_with_tieon = [tieon_w_t] + quality_check.wt_data

        row_count_with_tieon = len(md_data_with_tieon)

        logger.info(f"[GTL QA FIX - save_qa_approved] Using ORIGINAL unfiltered data for SurveyData (like Gyro)")
        logger.info(f"[GTL QA FIX - save_qa_approved] Total stations with tie-on: {row_count_with_tieon}")
        logger.info(f"[GTL QA FIX - save_qa_approved] MD range: {md_data_with_tieon[0]:.2f} to {md_data_with_tieon[-1]:.2f}")

        # Create SurveyFile and SurveyData in transaction
        with transaction.atomic():
            # Create SurveyFile record
            survey_file = SurveyFile.objects.create(
                run=run,
                file_name=quality_check.file_name,
                file_path=f"qa_approved/{quality_check.file_name}",
                file_size=0,  # File not stored, already processed
                survey_type='GTL',
                processing_status='completed'
            )

            # Create SurveyData record
            survey_data = SurveyData.objects.create(
                survey_file=survey_file,
                md_data=md_data_with_tieon,
                inc_data=inc_data_with_tieon,
                azi_data=azi_data_with_tieon,
                wt_data=wt_data_with_tieon,
                gt_data=gt_data_with_tieon,
                row_count=row_count_with_tieon,
                validation_status='valid',
                validation_errors=None
            )

            # Update QualityCheck status and link to SurveyData
            quality_check.status = 'approved'
            quality_check.survey_data = survey_data
            quality_check.save()

        logger.info(f"Successfully saved QA-approved survey: SurveyData {survey_data.id}")

        # IMPORTANT: Post-save signal won't fire until AFTER transaction commits
        # Since SurveyData creation is inside transaction.atomic(), we must manually trigger calculation
        logger.info(f"[GTL QA FIX - save_qa_approved] Transaction committed, SurveyData saved with {len(survey_data.md_data)} stations")

        # Trigger survey calculation manually after transaction completes
        calculated_survey = None
        calculation_error = None
        try:
            from survey_api.services.survey_calculation_service import SurveyCalculationService
            logger.info(f"[GTL QA FIX - save_qa_approved] Manually triggering calculation for SurveyData {survey_data.id}")
            calculated_survey = SurveyCalculationService.calculate(str(survey_data.id))
            logger.info(f"[GTL QA FIX - save_qa_approved] ✓ Calculation completed: {calculated_survey.id}")
            logger.info(f"[GTL QA FIX - save_qa_approved] ✓ Calculated {len(calculated_survey.northing)} coordinate points")
        except Exception as e:
            calculation_error = str(e)
            logger.error(f"[GTL QA FIX - save_qa_approved] ✗ Calculation failed: {calculation_error}")
            logger.exception(e)

        response_data = {
            "id": str(survey_data.id),
            "survey_file": {
                "id": str(survey_file.id),
                "file_name": survey_file.file_name,
                "survey_type": survey_file.survey_type,
            },
            "survey_data": {
                "id": str(survey_data.id),
                "row_count": survey_data.row_count,
                "validation_status": survey_data.validation_status,
            },
            "message": "Survey data saved and calculation completed" if calculated_survey else "Survey data saved but calculation failed"
        }

        # Add calculated_survey info if successful
        if calculated_survey:
            response_data["calculated_survey"] = {
                "id": str(calculated_survey.id),
                "calculation_status": calculated_survey.calculation_status,
            }
        elif calculation_error:
            response_data["calculation_error"] = calculation_error

        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.exception(f"Unexpected error saving QA-approved survey: {e}")
        return Response(
            {
                "error": "Internal server error",
                "details": [str(e)]
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_qa_record(request, qa_id):
    """
    Delete a QA record (reject QA review).

    Returns:
        204 No Content: QA record deleted
        404 Not Found: QA record not found
    """
    try:
        quality_check = QualityCheck.objects.get(id=qa_id)
        quality_check.status = 'rejected'
        quality_check.save()

        logger.info(f"QA record {qa_id} marked as rejected")

        return Response(status=status.HTTP_204_NO_CONTENT)

    except QualityCheck.DoesNotExist:
        return Response(
            {"error": f"QA record with id {qa_id} does not exist"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_gtl_qa_temp(request, temp_qa_id):
    """
    Approve temporary GTL QA data and save to database with survey calculation.

    This endpoint is called after user reviews QA results in the frontend.
    It loads the temporary QA data, filters stations based on user selections,
    creates all database records, and triggers survey calculation.

    Args:
        temp_qa_id: UUID of the temporary QA session

    Request body:
        - indices_to_keep: List of station indices to keep (optional)
          If not provided, all PASS stations are kept.

    Returns:
        201 Created: Survey saved and calculation triggered
        404 Not Found: Temporary QA data not found
        500 Internal Server Error: Processing error
    """
    import json
    import uuid

    try:
        # Load temporary metadata
        temp_metadata_path = f"survey_files/qa_temp/{temp_qa_id}_metadata.json"

        if not default_storage.exists(temp_metadata_path):
            return Response(
                {"error": "Temporary QA data not found or expired"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Read metadata
        with default_storage.open(temp_metadata_path, 'r') as f:
            temp_metadata = json.load(f)

        # Extract data from metadata
        run_id = temp_metadata['run_id']
        file_path = temp_metadata['file_path']
        file_name = temp_metadata['file_name']
        file_size = temp_metadata['file_size']
        md_data = temp_metadata['md_data']
        inc_data = temp_metadata['inc_data']
        azi_data = temp_metadata['azi_data']
        gt_data = temp_metadata['gt_data']
        wt_data = temp_metadata['wt_data']
        qa_results = temp_metadata['qa_results']
        location_g_t = temp_metadata['location_g_t']
        location_w_t = temp_metadata['location_w_t']

        logger.info(f"Loaded temporary QA data for approval: {temp_qa_id}")

        # Get indices to keep from request
        indices_to_keep = request.data.get('indices_to_keep')

        # Filter data based on indices
        if indices_to_keep is not None:
            filtered_data = QAService.filter_stations_by_indices(
                md_data=md_data,
                inc_data=inc_data,
                azi_data=azi_data,
                gt_data=gt_data,
                wt_data=wt_data,
                indices_to_keep=indices_to_keep
            )
        else:
            # Keep only PASS stations
            logger.info(f"[GTL QA] Original data: {len(md_data)} stations, MD range: {md_data[0]:.2f} to {md_data[-1]:.2f}")
            logger.info(f"[GTL QA] PASS count: {qa_results['pass_count']}, REMOVE count: {qa_results['remove_count']}")

            filtered_data = QAService.filter_stations_by_status(
                md_data=md_data,
                inc_data=inc_data,
                azi_data=azi_data,
                gt_data=gt_data,
                wt_data=wt_data,
                overall_status_data=qa_results['overall_status_data'],
                include_status='PASS'
            )

            logger.info(f"[GTL QA] After filtering: {len(filtered_data['md_data'])} stations kept")
            logger.info(f"[GTL QA] Filtered MD range: {filtered_data['md_data'][0]:.2f} to {filtered_data['md_data'][-1]:.2f}")
            logger.info(f"[GTL QA] Last 3 MDs in filtered data: {filtered_data['md_data'][-3:]}")

        # Get Run object
        try:
            run = Run.objects.select_related('tieon').get(id=run_id)
        except Run.DoesNotExist:
            return Response(
                {"error": f"Run with id {run_id} does not exist"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Recalculate QA metrics on filtered data to get final scores
        qa_results_filtered = QAService.calculate_qa_metrics(
            md_data=filtered_data['md_data'],
            inc_data=filtered_data['inc_data'],
            azi_data=filtered_data['azi_data'],
            gt_data=filtered_data['gt_data'],
            wt_data=filtered_data['wt_data'],
            location_g_t=location_g_t,
            location_w_t=location_w_t
        )

        # Prepend tie-on values to ORIGINAL unfiltered data (for calculation - like Gyro)
        # Use location G(T) and W(T) for tie-on row (TieOn model doesn't have these)
        tie_on = run.tieon
        # CRITICAL FIX: Use ORIGINAL unfiltered data for SurveyData (like Gyro does)
        # This ensures all stations get calculated coordinates, matching Gyro behavior
        md_data_with_tieon = [float(tie_on.md)] + md_data  # Original unfiltered
        inc_data_with_tieon = [float(tie_on.inc)] + inc_data  # Original unfiltered
        azi_data_with_tieon = [float(tie_on.azi)] + azi_data  # Original unfiltered
        gt_data_with_tieon = [location_g_t] + gt_data  # Original unfiltered
        wt_data_with_tieon = [location_w_t] + wt_data  # Original unfiltered

        logger.info(f"[GTL QA FIX] Using ORIGINAL unfiltered data for SurveyData (like Gyro)")
        logger.info(f"[GTL QA FIX] Total stations with tie-on: {len(md_data_with_tieon)}")
        logger.info(f"[GTL QA FIX] MD range: {md_data_with_tieon[0]:.2f} to {md_data_with_tieon[-1]:.2f}")

        # Create database records
        with transaction.atomic():
            # Create SurveyFile
            survey_file = SurveyFile.objects.create(
                run=run,
                file_name=file_name,
                file_path=file_path,
                file_size=file_size,
                survey_type='GTL',
                processing_status='completed'
            )

            # Create SurveyData with ORIGINAL unfiltered data (like Gyro)
            # This triggers automatic calculation via post-save signal
            # All stations will get coordinates calculated
            survey_data = SurveyData.objects.create(
                survey_file=survey_file,
                md_data=md_data_with_tieon,
                inc_data=inc_data_with_tieon,
                azi_data=azi_data_with_tieon,
                wt_data=wt_data_with_tieon,
                gt_data=gt_data_with_tieon,
                row_count=len(md_data_with_tieon),
                validation_status='valid',
                validation_errors=None
            )

            # Create QualityCheck record
            quality_check = QualityCheck.objects.create(
                run=run,
                survey_data=survey_data,
                file_name=file_name,
                md_data=filtered_data['md_data'],
                inc_data=filtered_data['inc_data'],
                azi_data=filtered_data['azi_data'],
                gt_data=filtered_data['gt_data'],
                wt_data=filtered_data['wt_data'],
                g_t_difference_data=qa_results_filtered['g_t_difference_data'],
                w_t_difference_data=qa_results_filtered['w_t_difference_data'],
                g_t_status_data=qa_results_filtered['g_t_status_data'],
                w_t_status_data=qa_results_filtered['w_t_status_data'],
                overall_status_data=qa_results_filtered['overall_status_data'],
                total_g_t_difference=qa_results_filtered['total_g_t_difference'],
                total_w_t_difference=qa_results_filtered['total_w_t_difference'],
                total_g_t_difference_pass=qa_results_filtered['total_g_t_difference_pass'],
                total_w_t_difference_pass=qa_results_filtered['total_w_t_difference_pass'],
                g_t_percentage=qa_results_filtered['g_t_percentage'],
                w_t_percentage=qa_results_filtered['w_t_percentage'],
                pass_count=qa_results_filtered['pass_count'],
                remove_count=qa_results_filtered['remove_count'],
                # Save scores to database
                delta_wt_score=qa_results_filtered['delta_wt_score'],
                delta_wt_percentage=qa_results_filtered['delta_wt_percentage'],
                delta_gt_score=qa_results_filtered['delta_gt_score'],
                delta_gt_percentage=qa_results_filtered['delta_gt_percentage'],
                w_t_score_points=qa_results_filtered['w_t_score_points'],
                g_t_score_points=qa_results_filtered['g_t_score_points'],
                max_score=qa_results_filtered['max_score'],
                total_rows=qa_results_filtered['total_rows'],
                status='approved'
            )

        logger.info(f"Created SurveyFile {survey_file.id}, SurveyData {survey_data.id}, QualityCheck {quality_check.id}")

        # IMPORTANT: Post-save signal won't fire until AFTER transaction commits
        # Since SurveyData creation is inside transaction.atomic(), we must manually trigger calculation
        # This ensures calculation uses the ORIGINAL unfiltered data we just saved
        logger.info(f"[GTL QA FIX] Transaction committed, SurveyData saved with {len(survey_data.md_data)} stations")

        # Trigger survey calculation manually after transaction completes
        calculated_survey = None
        calculation_error = None
        try:
            from survey_api.services.survey_calculation_service import SurveyCalculationService
            logger.info(f"[GTL QA FIX] Manually triggering calculation for SurveyData {survey_data.id}")
            calculated_survey = SurveyCalculationService.calculate(str(survey_data.id))
            logger.info(f"[GTL QA FIX] ✓ Calculation completed: {calculated_survey.id}")
            logger.info(f"[GTL QA FIX] ✓ Calculated {len(calculated_survey.northing)} coordinate points")
            logger.info(f"[GTL QA FIX] ✓ Last 3 Northings: {calculated_survey.northing[-3:]}")
            logger.info(f"[GTL QA FIX] ✓ Last 3 TVDs: {calculated_survey.tvd[-3:]}")
        except Exception as e:
            calculation_error = str(e)
            logger.error(f"[GTL QA FIX] ✗ Calculation failed: {calculation_error}")
            logger.exception(e)

        # Clean up temporary files
        try:
            if default_storage.exists(temp_metadata_path):
                default_storage.delete(temp_metadata_path)
            # Note: The actual survey file is kept and linked to SurveyFile record
        except Exception as cleanup_error:
            logger.warning(f"Failed to clean up temporary files: {cleanup_error}")

        response_data = {
            "success": True,
            "message": "QA approved, survey saved and calculation completed" if calculated_survey else "QA approved, survey saved but calculation failed",
            "survey_data_id": str(survey_data.id),
            "calculated_survey_id": str(calculated_survey.id) if calculated_survey else None
        }

        if calculation_error:
            response_data["calculation_error"] = calculation_error

        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.exception(f"Error approving temporary GTL QA: {e}")
        return Response(
            {
                "error": "Internal server error",
                "details": [str(e)]
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_qc_report(request, qa_id):
    """
    Generate and download QC report PDF for an approved QA check.

    Args:
        qa_id: UUID of the QualityCheck record

    Returns:
        200 OK: PDF file
        404 Not Found: QA record not found
        400 Bad Request: QA not approved yet
        500 Internal Server Error: Report generation error
    """
    from django.http import FileResponse
    from survey_api.services.qc_report_service import QCReportService

    try:
        # Verify QA exists and is approved
        try:
            qa_check = QualityCheck.objects.get(id=qa_id)
        except QualityCheck.DoesNotExist:
            return Response(
                {"error": f"QA record with id {qa_id} does not exist"},
                status=status.HTTP_404_NOT_FOUND
            )

        if qa_check.status != 'approved':
            return Response(
                {"error": "QA must be approved before generating report"},
                status=status.HTTP_400_BAD_REQUEST
            )

        logger.info(f"Generating QC report for QA {qa_id}")

        # Generate PDF
        pdf_buffer = QCReportService.generate_qc_report(qa_id)

        # Create filename
        filename = f"QC_Report_{qa_check.file_name.replace('.xlsx', '').replace('.csv', '')}.pdf"

        # Return PDF as file response
        response = FileResponse(
            pdf_buffer,
            content_type='application/pdf',
            as_attachment=True,
            filename=filename
        )

        logger.info(f"QC report generated successfully: {filename}")
        return response

    except Exception as e:
        logger.exception(f"Error generating QC report: {e}")
        return Response(
            {
                "error": "Failed to generate QC report",
                "details": [str(e)]
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
