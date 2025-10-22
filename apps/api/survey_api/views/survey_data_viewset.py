"""
SurveyData detail viewset for retrieving uploaded survey data with calculations.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import logging

from survey_api.models import SurveyData, CalculatedSurvey

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
