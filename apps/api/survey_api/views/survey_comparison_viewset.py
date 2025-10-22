"""
ViewSet for survey comparison API endpoints.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from survey_api.services.comparison_service import SurveyComparisonService
from survey_api.models import Survey


class SurveyComparisonViewSet(viewsets.ViewSet):
    """
    ViewSet for survey comparison operations.

    Provides endpoints to compare two surveys and visualize deltas.
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='compare')
    def compare_surveys(self, request):
        """
        Compare two surveys and return delta calculations.

        POST /api/v1/survey-comparisons/compare/

        Request Body:
        {
            "reference_survey_id": "uuid",
            "comparative_survey_id": "uuid",
            "step": 10.0,  // optional, default 10.0
            "start_xyz": [0, 0, 0]  // optional, default [0, 0, 0]
        }

        Response:
        {
            "comparison_points": [
                {
                    "md": 0.0,
                    "reference": {
                        "inc": 0.0,
                        "azi": 0.0,
                        "north": 0.0,
                        "east": 0.0,
                        "tvd": 0.0
                    },
                    "comparative": {
                        "inc": 0.0,
                        "azi": 0.0,
                        "north": 0.0,
                        "east": 0.0,
                        "tvd": 0.0
                    },
                    "deltas": {
                        "inc": 0.0,
                        "azi": 0.0,
                        "north": 0.0,
                        "east": 0.0,
                        "tvd": 0.0,
                        "displacement": 0.0
                    }
                },
                ...
            ],
            "summary": {
                "total_points": 100,
                "md_range": {"min": 0.0, "max": 1000.0},
                "max_deltas": {...},
                "avg_displacement": 1.23,
                "max_displacement": 5.67,
                "max_displacement_md": 500.0
            }
        }
        """
        try:
            # Extract request data
            ref_survey_id = request.data.get('reference_survey_id')
            cmp_survey_id = request.data.get('comparative_survey_id')
            step = request.data.get('step', 10.0)
            start_xyz = request.data.get('start_xyz', [0, 0, 0])

            if not ref_survey_id or not cmp_survey_id:
                return Response(
                    {'error': 'Both reference_survey_id and comparative_survey_id are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Fetch surveys from database
            try:
                ref_survey = Survey.objects.get(id=ref_survey_id)
                cmp_survey = Survey.objects.get(id=cmp_survey_id)
            except Survey.DoesNotExist as e:
                return Response(
                    {'error': f'Survey not found: {str(e)}'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get survey data from related InterpolatedSurvey or SurveyData
            # First try to get interpolated surveys
            ref_interpolated = ref_survey.interpolated_surveys.filter(
                survey_type='actual'
            ).first()
            cmp_interpolated = cmp_survey.interpolated_surveys.filter(
                survey_type='actual'
            ).first()

            if not ref_interpolated or not cmp_interpolated:
                return Response(
                    {'error': 'Both surveys must have interpolated data. Please run interpolation first.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Extract survey station data
            ref_stations = ref_interpolated.interpolated_stations.all().order_by('md')
            cmp_stations = cmp_interpolated.interpolated_stations.all().order_by('md')

            if not ref_stations.exists() or not cmp_stations.exists():
                return Response(
                    {'error': 'Survey stations not found for one or both surveys'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Prepare data for comparison
            reference_data = {
                'md': [s.md for s in ref_stations],
                'inc': [s.inc for s in ref_stations],
                'azi': [s.azi for s in ref_stations],
            }

            comparative_data = {
                'md': [s.md for s in cmp_stations],
                'inc': [s.inc for s in cmp_stations],
                'azi': [s.azi for s in cmp_stations],
            }

            # Perform comparison
            result = SurveyComparisonService.compare_surveys(
                reference_data=reference_data,
                comparative_data=comparative_data,
                step=float(step),
                start_xyz=start_xyz
            )

            return Response(result, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'An unexpected error occurred: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='3d-path')
    def get_3d_path(self, request):
        """
        Get 3D path data for visualization.

        POST /api/v1/survey-comparisons/3d-path/

        Request Body: Same as compare_surveys

        Response:
        {
            "reference": {
                "north": [...],
                "east": [...],
                "tvd": [...]
            },
            "comparative": {
                "north": [...],
                "east": [...],
                "tvd": [...]
            }
        }
        """
        # First get comparison result
        comparison_response = self.compare_surveys(request)

        if comparison_response.status_code != status.HTTP_200_OK:
            return comparison_response

        comparison_result = comparison_response.data

        # Extract 3D path data
        path_data = SurveyComparisonService.get_3d_path_data(comparison_result)

        return Response(path_data, status=status.HTTP_200_OK)
