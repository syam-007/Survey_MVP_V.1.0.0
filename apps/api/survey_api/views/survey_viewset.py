"""
Survey ViewSet for handling survey CRUD operations.
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from survey_api.models import Survey
from survey_api.serializers import (
    SurveySerializer,
    CreateSurveySerializer,
    UpdateSurveySerializer,
)


class SurveyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Survey model CRUD operations.

    Provides:
    - list: GET /api/v1/surveys/
      Returns list of surveys with optional filtering by run, survey_type, or status.

      Query Parameters:
      - run: Filter by run ID
      - survey_type: Filter by survey type (Type 1 - GTL, Type 2 - Gyro, etc.)
      - status: Filter by status (pending, uploaded, validated, calculated, error)

      Example Response:
      [
        {
          "id": "uuid",
          "run": "run-uuid",
          "survey_type": "Type 1 - GTL",
          "file_path": null,
          "status": "pending",
          "required_columns": ["MD", "Inc", "Azi", "w(t)", "g(t)"],
          "created_at": "2025-10-12T10:30:00Z",
          "updated_at": "2025-10-12T10:30:00Z"
        }
      ]

    - create: POST /api/v1/surveys/
      Creates a new survey for a run.

      Required Fields:
      - run: UUID of the run
      - survey_type: One of the survey type choices

      Optional Fields:
      - file_path: Path to uploaded file (for future use)
      - status: Status of survey (defaults to 'pending')

      Example Request:
      {
        "run": "uuid-string",
        "survey_type": "Type 1 - GTL",
        "file_path": null,
        "status": "pending"
      }

      Survey Type Requirements:
      - Type 1 - GTL: Requires MD, Inc, Azi, w(t), g(t) columns
      - Type 2 - Gyro: Requires MD, Inc, Azi columns
      - Type 3 - MWD: Requires MD, Inc, Azi columns
      - Type 4 - Unknown: Requires MD, Inc, Azi columns

    - retrieve: GET /api/v1/surveys/{id}/
      Returns a single survey by ID.

    - update: PUT /api/v1/surveys/{id}/
      Updates all fields of a survey (except run, which cannot be changed).

    - partial_update: PATCH /api/v1/surveys/{id}/
      Partially updates survey fields.

      Example Request:
      {
        "status": "uploaded"
      }

    - destroy: DELETE /api/v1/surveys/{id}/
      Deletes a survey.
    """

    permission_classes = [IsAuthenticated]
    queryset = Survey.objects.select_related('run').all()
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['run', 'survey_type', 'status']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action.
        """
        if self.action == 'create':
            return CreateSurveySerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateSurveySerializer
        return SurveySerializer

    def get_queryset(self):
        """
        Optionally filter surveys by query parameters.
        """
        queryset = Survey.objects.select_related('run').all()

        run_id = self.request.query_params.get('run', None)
        if run_id is not None:
            queryset = queryset.filter(run_id=run_id)

        survey_type = self.request.query_params.get('survey_type', None)
        if survey_type is not None:
            queryset = queryset.filter(survey_type=survey_type)

        status = self.request.query_params.get('status', None)
        if status is not None:
            queryset = queryset.filter(status=status)

        return queryset
