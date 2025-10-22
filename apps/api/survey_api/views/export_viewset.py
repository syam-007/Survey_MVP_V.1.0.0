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
