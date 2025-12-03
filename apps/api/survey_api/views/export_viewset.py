"""
API endpoints for exporting survey data to Excel and CSV formats.
"""
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse

from survey_api.services.excel_export_service import ExcelExportService

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_calculated_survey(request, calculated_survey_id):
    """
    Export calculated survey to Excel or CSV.

    Query Parameters:
        - format: 'excel' (default) or 'csv'

    Returns:
        File download (Excel or CSV)

    Examples:
        GET /api/surveys/export/calculated/<uuid>/?format=excel
        GET /api/surveys/export/calculated/<uuid>/?format=csv
    """
    format_param = request.query_params.get('format', 'excel')

    if format_param not in ['excel', 'csv']:
        return Response(
            {"error": f"Invalid format '{format_param}'. Must be 'excel' or 'csv'."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        buffer, filename, content_type = ExcelExportService.export_calculated_survey(
            str(calculated_survey_id),
            format=format_param
        )

        # Create streaming response
        response = HttpResponse(buffer.read(), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        logger.info(f"Successfully exported calculated survey {calculated_survey_id} as {format_param}")
        return response

    except Exception as e:
        logger.exception(f"Failed to export calculated survey {calculated_survey_id}: {e}")
        return Response(
            {"error": f"Failed to export survey data: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_interpolated_survey(request, interpolated_survey_id):
    """
    Export interpolated survey to Excel or CSV.

    Query Parameters:
        - format: 'excel' (default) or 'csv'

    Returns:
        File download (Excel or CSV)

    Examples:
        GET /api/surveys/export/interpolated/<uuid>/?format=excel
        GET /api/surveys/export/interpolated/<uuid>/?format=csv
    """
    format_param = request.query_params.get('format', 'excel')

    if format_param not in ['excel', 'csv']:
        return Response(
            {"error": f"Invalid format '{format_param}'. Must be 'excel' or 'csv'."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        buffer, filename, content_type = ExcelExportService.export_interpolated_survey(
            str(interpolated_survey_id),
            format=format_param
        )

        # Create streaming response
        response = HttpResponse(buffer.read(), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        logger.info(f"Successfully exported interpolated survey {interpolated_survey_id} as {format_param}")
        return response

    except Exception as e:
        logger.exception(f"Failed to export interpolated survey {interpolated_survey_id}: {e}")
        return Response(
            {"error": f"Failed to export survey data: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_fresh_interpolation(request, calculated_survey_id):
    """
    Export freshly calculated interpolation data to Excel or CSV.

    This endpoint ALWAYS recalculates interpolation data on-the-fly (never uses saved data).
    This ensures the export matches exactly what the user sees in the interpolation table.

    Query Parameters:
        - format: 'excel' (default) or 'csv'
        - resolution: Interpolation resolution in meters (required)
        - start_md: Optional start MD for custom range
        - end_md: Optional end MD for custom range

    Returns:
        File download (Excel or CSV)

    Examples:
        GET /api/surveys/export/fresh-interpolation/<uuid>/?format=excel&resolution=10
        GET /api/surveys/export/fresh-interpolation/<uuid>/?format=csv&resolution=20&start_md=100&end_md=5000
    """
    format_param = request.query_params.get('format', 'excel')
    resolution_param = request.query_params.get('resolution')
    start_md = request.query_params.get('start_md')
    end_md = request.query_params.get('end_md')

    # Validate format
    if format_param not in ['excel', 'csv']:
        return Response(
            {"error": f"Invalid format '{format_param}'. Must be 'excel' or 'csv'."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate resolution is provided
    if not resolution_param:
        return Response(
            {"error": "Resolution parameter is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        resolution = int(resolution_param)
        start_md_value = float(start_md) if start_md else None
        end_md_value = float(end_md) if end_md else None

        logger.info(
            f"Exporting fresh interpolation for CalculatedSurvey {calculated_survey_id} "
            f"at resolution={resolution}m (start_md={start_md_value}, end_md={end_md_value})"
        )

        # Use ExcelExportService to generate fresh interpolation export
        buffer, filename, content_type = ExcelExportService.export_fresh_interpolation(
            str(calculated_survey_id),
            resolution=resolution,
            start_md=start_md_value,
            end_md=end_md_value,
            format=format_param
        )

        # Create streaming response
        response = HttpResponse(buffer.read(), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        logger.info(f"Successfully exported fresh interpolation for {calculated_survey_id} as {format_param}")
        return response

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return Response(
            {"error": f"Invalid parameters: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.exception(f"Failed to export fresh interpolation for {calculated_survey_id}: {e}")
        return Response(
            {"error": f"Failed to export interpolation data: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
