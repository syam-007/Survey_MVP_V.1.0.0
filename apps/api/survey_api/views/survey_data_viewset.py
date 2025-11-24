"""
SurveyData detail viewset for retrieving uploaded survey data with calculations.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import FileResponse
from django.db import transaction
from io import BytesIO
import logging

from survey_api.models import SurveyData, CalculatedSurvey, QualityCheck
from survey_api.services.survey_calculation_report_service import generate_survey_calculation_report
from survey_api.services.survey_calculation_service import SurveyCalculationService
from survey_api.services.qa_service import QAService

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_survey_data_detail(request, survey_data_id):
    """
    Get complete survey data including raw data and calculated results.

    Args:
        survey_data_id: UUID of the SurveyData

    Returns:
        200 OK: Complete survey data with calculations
        404 Not Found: Survey not found
    """
    try:
        survey_data = SurveyData.objects.select_related('survey_file').get(id=survey_data_id)

        # Try to get calculated survey data
        try:
            calculated = CalculatedSurvey.objects.get(survey_data=survey_data)
            has_calculations = True
        except CalculatedSurvey.DoesNotExist:
            calculated = None
            has_calculations = False
            logger.warning(f"No calculations found for SurveyData {survey_data_id}")

        # Try to get QA data (GTL surveys only)
        try:
            quality_check = QualityCheck.objects.get(survey_data=survey_data)
            has_qa_data = True
        except QualityCheck.DoesNotExist:
            quality_check = None
            has_qa_data = False

        # Build response (flatten structure to match frontend expectations)
        response_data = {
            'id': str(survey_data.id),
            'created_at': survey_data.created_at.isoformat(),
            'validation_status': survey_data.validation_status,
            'validation_errors': survey_data.validation_errors,

            # Survey file info
            'survey_file': {
                'id': str(survey_data.survey_file.id),
                'file_name': survey_data.survey_file.file_name,
                'file_size': survey_data.survey_file.file_size,
                'survey_type': survey_data.survey_file.survey_type,
            },

            # Raw survey data
            'survey_data': {
                'md_data': survey_data.md_data,
                'inc_data': survey_data.inc_data,
                'azi_data': survey_data.azi_data,
                'wt_data': survey_data.wt_data,
                'gt_data': survey_data.gt_data,
                'row_count': survey_data.row_count,
            },
        }

        # Add calculated coordinates at root level (for frontend compatibility)
        if has_calculations:
            response_data['id'] = str(calculated.id)  # Use calculated survey ID as the main ID
            response_data['northing'] = calculated.northing
            response_data['easting'] = calculated.easting
            response_data['tvd'] = calculated.tvd
            response_data['dls'] = calculated.dls
            response_data['build_rate'] = calculated.build_rate
            response_data['turn_rate'] = calculated.turn_rate
            response_data['vertical_section'] = calculated.vertical_section
            response_data['closure_distance'] = calculated.closure_distance
            response_data['closure_direction'] = calculated.closure_direction
            response_data['vertical_section_azimuth'] = float(calculated.vertical_section_azimuth) if calculated.vertical_section_azimuth else None
            response_data['calculation_duration'] = float(calculated.calculation_duration) if calculated.calculation_duration else None
            response_data['calculation_status'] = calculated.calculation_status
            response_data['survey_data_id'] = str(survey_data.id)  # Keep survey data ID for reference
        else:
            response_data['northing'] = []
            response_data['easting'] = []
            response_data['tvd'] = []
            response_data['dls'] = []
            response_data['vertical_section'] = []
            response_data['closure_distance'] = []
            response_data['closure_direction'] = []
            response_data['calculation_status'] = 'pending'

        # Add QA data if available (GTL surveys)
        if has_qa_data:
            # Get location G(t) and W(t) from run
            run = survey_data.survey_file.run
            location = run.well.location if hasattr(run, 'well') and run.well and hasattr(run.well, 'location') else None
            location_g_t = float(location.g_t) if location and location.g_t else 0.0
            location_w_t = float(location.w_t) if location and location.w_t else 0.0

            # Build station-level QA data
            stations = []
            for i in range(len(quality_check.md_data)):
                stations.append({
                    'index': i,
                    'md': quality_check.md_data[i],
                    'inc': quality_check.inc_data[i],
                    'azi': quality_check.azi_data[i],
                    'g_t': quality_check.gt_data[i],
                    'w_t': quality_check.wt_data[i],
                    'g_t_difference': quality_check.g_t_difference_data[i],
                    'w_t_difference': quality_check.w_t_difference_data[i],
                    'g_t_status': quality_check.g_t_status_data[i],
                    'w_t_status': quality_check.w_t_status_data[i],
                    'overall_status': quality_check.overall_status_data[i],
                })

            # Prepare summary with all fields
            summary = {
                'total_stations': len(quality_check.md_data),
                'pass_count': int(quality_check.pass_count),
                'remove_count': int(quality_check.remove_count),
                'g_t_score': f"{float(quality_check.total_g_t_difference_pass):.2f} / {float(quality_check.total_g_t_difference):.2f}",
                'w_t_score': f"{float(quality_check.total_w_t_difference_pass):.2f} / {float(quality_check.total_w_t_difference):.2f}",
                'g_t_percentage': float(quality_check.g_t_percentage),
                'w_t_percentage': float(quality_check.w_t_percentage),
                'location_g_t': location_g_t,
                'location_w_t': location_w_t,
            }

            # Add scoring fields
            # If scores are saved in DB (after approval), use them
            # Otherwise, calculate them on-the-fly (for pending QAs)
            if quality_check.delta_wt_score is not None:
                summary['delta_wt_score'] = float(quality_check.delta_wt_score)
                summary['delta_wt_percentage'] = float(quality_check.delta_wt_percentage)
                summary['delta_gt_score'] = float(quality_check.delta_gt_score)
                summary['delta_gt_percentage'] = float(quality_check.delta_gt_percentage)
                summary['w_t_score_points'] = float(quality_check.w_t_score_points)
                summary['g_t_score_points'] = float(quality_check.g_t_score_points)
                summary['max_score'] = float(quality_check.max_score)
                summary['total_rows'] = int(quality_check.total_rows)
            else:
                # Calculate scores on-the-fly for pending QAs
                try:
                    qa_results = QAService.calculate_qa_metrics(
                        md_data=quality_check.md_data,
                        inc_data=quality_check.inc_data,
                        azi_data=quality_check.azi_data,
                        gt_data=quality_check.gt_data,
                        wt_data=quality_check.wt_data,
                        location_g_t=location_g_t,
                        location_w_t=location_w_t
                    )
                    summary['delta_wt_score'] = qa_results['delta_wt_score']
                    summary['delta_wt_percentage'] = qa_results['delta_wt_percentage']
                    summary['delta_gt_score'] = qa_results['delta_gt_score']
                    summary['delta_gt_percentage'] = qa_results['delta_gt_percentage']
                    summary['w_t_score_points'] = qa_results['w_t_score_points']
                    summary['g_t_score_points'] = qa_results['g_t_score_points']
                    summary['max_score'] = qa_results['max_score']
                    summary['total_rows'] = qa_results['total_rows']
                except Exception as e:
                    logger.error(f"Error calculating QA scores on-the-fly: {e}")

            response_data['qa_data'] = {
                'qa_id': str(quality_check.id),
                'file_name': quality_check.file_name,
                'status': quality_check.status,  # Include QA approval status (pending/approved/rejected)
                'summary': summary,
                'stations': stations,
            }
        else:
            response_data['qa_data'] = None

        return Response(response_data, status=status.HTTP_200_OK)

    except SurveyData.DoesNotExist:
        return Response(
            {'error': 'Survey data not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.exception(f"Error retrieving survey data: {e}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_survey_report_view(request, survey_data_id):
    """
    Generate PDF report for survey data with calculated or interpolated results.

    Query Parameters:
        data_source: 'calculated' or 'interpolated' (default: 'calculated')
        resolution: Interpolation resolution in meters (required if data_source='interpolated', default: 5)

    Args:
        survey_data_id: UUID of the SurveyData

    Returns:
        200 OK: PDF file
        404 Not Found: Survey not found
        500 Internal Server Error: Report generation failed
    """
    try:
        from survey_api.services.interpolated_report_service import generate_interpolated_survey_report

        survey_data = SurveyData.objects.select_related('survey_file__run__well').get(id=survey_data_id)

        # Get query parameters
        data_source = request.GET.get('data_source', 'calculated')
        resolution = int(request.GET.get('resolution', 5))

        # Generate PDF report based on data source
        if data_source == 'interpolated':
            # Get calculated survey ID
            calculated_survey = CalculatedSurvey.objects.get(survey_data_id=survey_data_id)
            pdf_bytes = generate_interpolated_survey_report(str(calculated_survey.id), resolution)
            filename_prefix = f"interpolated_survey_report_r{resolution}m"
        else:
            # Default to calculated report
            pdf_bytes = generate_survey_calculation_report(survey_data_id)
            filename_prefix = "survey_calculation_report"

        # Create response with PDF
        response = FileResponse(
            BytesIO(pdf_bytes),
            content_type='application/pdf'
        )

        # Set filename for download
        filename = f"{filename_prefix}_{survey_data.survey_file.file_name.rsplit('.', 1)[0]}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        return response

    except SurveyData.DoesNotExist:
        return Response(
            {'error': 'Survey data not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.exception(f"Error generating survey report: {e}")
        return Response(
            {'error': f'Report generation failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_qa_and_calculate(request, survey_data_id):
    """
    Approve QA for a GTL survey and trigger calculation.

    Args:
        survey_data_id: UUID of the SurveyData
        indices_to_keep: List of indices to keep (optional in request body)

    Returns:
        200 OK: QA approved and calculation triggered
        404 Not Found: Survey not found or QA not found
        500 Internal Server Error: Calculation failed
    """
    from survey_api.services.qa_service import QAService

    try:
        survey_data = SurveyData.objects.select_related('survey_file__run__tieon', 'survey_file__run__well__location').get(id=survey_data_id)

        # Get associated QualityCheck
        try:
            quality_check = QualityCheck.objects.get(survey_data=survey_data)
        except QualityCheck.DoesNotExist:
            return Response(
                {'error': 'No QA data found for this survey'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get indices to keep from request (optional)
        indices_to_keep = request.data.get('indices_to_keep')

        with transaction.atomic():
            # If pending_qa status, we need to filter data and add tie-on
            if survey_data.validation_status == 'pending_qa':
                # Filter data based on indices
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

                # Get tie-on data and prepend it
                run = survey_data.survey_file.run
                tie_on = run.tieon

                # Get location for G(T) and W(T) values
                location = run.well.location if hasattr(run, 'well') and run.well and hasattr(run.well, 'location') else None
                location_g_t = float(location.g_t or 0) if location else 0
                location_w_t = float(location.w_t or 0) if location else 0

                md_data_with_tieon = [float(tie_on.md)] + filtered_data['md_data']
                inc_data_with_tieon = [float(tie_on.inc)] + filtered_data['inc_data']
                azi_data_with_tieon = [float(tie_on.azi)] + filtered_data['azi_data']
                gt_data_with_tieon = [location_g_t] + filtered_data['gt_data']
                wt_data_with_tieon = [location_w_t] + filtered_data['wt_data']

                # Update SurveyData with tie-on data
                survey_data.md_data = md_data_with_tieon
                survey_data.inc_data = inc_data_with_tieon
                survey_data.azi_data = azi_data_with_tieon
                survey_data.gt_data = gt_data_with_tieon
                survey_data.wt_data = wt_data_with_tieon
                survey_data.row_count = len(md_data_with_tieon)
                survey_data.validation_status = 'valid'
                survey_data.save()

                # Recalculate QA metrics on filtered data to get final scores
                location = run.well.location if hasattr(run, 'well') and run.well and hasattr(run.well, 'location') else None
                if location:
                    location_g_t = float(location.g_t or 0)
                    location_w_t = float(location.w_t or 0)

                    qa_results_filtered = QAService.calculate_qa_metrics(
                        md_data=filtered_data['md_data'],
                        inc_data=filtered_data['inc_data'],
                        azi_data=filtered_data['azi_data'],
                        gt_data=filtered_data['gt_data'],
                        wt_data=filtered_data['wt_data'],
                        location_g_t=location_g_t,
                        location_w_t=location_w_t
                    )

                    # Update QualityCheck with filtered data and scores
                    quality_check.md_data = filtered_data['md_data']
                    quality_check.inc_data = filtered_data['inc_data']
                    quality_check.azi_data = filtered_data['azi_data']
                    quality_check.gt_data = filtered_data['gt_data']
                    quality_check.wt_data = filtered_data['wt_data']
                    quality_check.g_t_difference_data = qa_results_filtered['g_t_difference_data']
                    quality_check.w_t_difference_data = qa_results_filtered['w_t_difference_data']
                    quality_check.g_t_status_data = qa_results_filtered['g_t_status_data']
                    quality_check.w_t_status_data = qa_results_filtered['w_t_status_data']
                    quality_check.overall_status_data = qa_results_filtered['overall_status_data']
                    quality_check.pass_count = qa_results_filtered['pass_count']
                    quality_check.remove_count = qa_results_filtered['remove_count']
                    quality_check.delta_wt_score = qa_results_filtered['delta_wt_score']
                    quality_check.delta_wt_percentage = qa_results_filtered['delta_wt_percentage']
                    quality_check.delta_gt_score = qa_results_filtered['delta_gt_score']
                    quality_check.delta_gt_percentage = qa_results_filtered['delta_gt_percentage']
                    quality_check.w_t_score_points = qa_results_filtered['w_t_score_points']
                    quality_check.g_t_score_points = qa_results_filtered['g_t_score_points']
                    quality_check.max_score = qa_results_filtered['max_score']
                    quality_check.total_rows = qa_results_filtered['total_rows']

                    logger.info(
                        f"Updated QualityCheck with filtered data: "
                        f"Delta W(t): {quality_check.delta_wt_percentage}%, "
                        f"Delta G(t): {quality_check.delta_gt_percentage}%, "
                        f"Stations: {quality_check.total_rows}"
                    )

            # Update QualityCheck status to approved
            quality_check.status = 'approved'
            quality_check.save()

            # Update SurveyFile processing_status
            survey_data.survey_file.processing_status = 'completed'
            survey_data.survey_file.save()

            logger.info(f"QA approved for SurveyData {survey_data_id}")

            # Delete existing CalculatedSurvey if it exists to force recalculation
            # This is important when BHC settings or other run parameters have changed
            # The cascade delete will also remove associated InterpolatedSurveys
            try:
                existing_calculated = CalculatedSurvey.objects.get(survey_data=survey_data)
                logger.info(f"Deleting existing CalculatedSurvey ID: {existing_calculated.id} to force recalculation")
                existing_calculated.delete()
            except CalculatedSurvey.DoesNotExist:
                logger.info("No existing CalculatedSurvey found - will create new")

            # Trigger survey calculation
            try:
                calculated_survey = SurveyCalculationService.calculate(str(survey_data.id))
                logger.info(f"Survey calculation completed - CalculatedSurvey ID: {calculated_survey.id}")
            except Exception as calc_error:
                logger.exception(f"Error during survey calculation: {calc_error}")
                return Response(
                    {'error': f'Survey calculation failed: {str(calc_error)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return Response({
                'success': True,
                'message': 'QA approved and survey calculation completed',
                'calculated_survey_id': str(calculated_survey.id)
            }, status=status.HTTP_200_OK)

    except SurveyData.DoesNotExist:
        return Response(
            {'error': 'Survey data not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.exception(f"Error approving QA: {e}")
        return Response(
            {'error': f'QA approval failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
