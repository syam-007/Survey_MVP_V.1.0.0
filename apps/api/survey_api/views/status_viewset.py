"""
Status viewset for survey processing status.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import logging

from survey_api.models import SurveyData

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_survey_status(request, survey_data_id):
    """
    Get processing status for a survey.

    Args:
        survey_data_id: UUID of the SurveyData

    Returns:
        200 OK: Status information
        404 Not Found: Survey not found
    """
    try:
        survey_data = SurveyData.objects.get(id=survey_data_id)

        # For now, we'll return 'complete' status since processing is synchronous
        # In the future, this could track async processing stages
        response_data = {
            'id': str(survey_data.id),
            'status': 'complete',
            'validation_status': survey_data.validation_status,
            'row_count': survey_data.row_count,
            'message': 'Survey processing complete'
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except SurveyData.DoesNotExist:
        return Response(
            {'error': 'Survey not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.exception(f"Error retrieving survey status: {e}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
