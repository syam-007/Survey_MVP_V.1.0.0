"""
TieOn ViewSet for handling tie-on CRUD operations.
"""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from survey_api.models import TieOn
from survey_api.serializers import (
    TieOnSerializer,
    CreateTieOnSerializer,
    UpdateTieOnSerializer,
)


class TieOnViewSet(viewsets.ModelViewSet):
    """
    ViewSet for TieOn model CRUD operations.

    Provides:
    - list: GET /api/v1/tieons/
      Returns list of tie-ons with optional filtering by run.

      Query Parameters:
      - run: Filter by run ID

      Example Response:
      [
        {
          "id": "uuid",
          "run": "run-uuid",
          "md": 1000.500,
          "inc": 45.25,
          "azi": 180.75,
          "tvd": 950.300,
          "latitude": 29.760427,
          "departure": -95.369803,
          "well_type": "Deviated",
          "hole_section": "Production Casing",
          "casing_selected": true,
          "drillpipe_selected": false,
          "survey_tool_type": "MWD",
          "survey_interval_from": 1000.000,
          "survey_interval_to": 5000.000,
          "survey_interval_length": 4000.000,
          "created_at": "2025-10-12T10:30:00Z",
          "updated_at": "2025-10-12T10:30:00Z"
        }
      ]

    - create: POST /api/v1/tieons/
      Creates a new tie-on for a run.

      Required Fields:
      - run: UUID of the run
      - md: Measured depth (decimal)
      - inc: Inclination, 0-180 degrees (decimal)
      - azi: Azimuth, 0-360 degrees (decimal)
      - tvd: True Vertical Depth (decimal)
      - latitude: Latitude coordinate (decimal)
      - departure: Departure coordinate (decimal)
      - well_type: Type of well (string)
      - hole_section: One of: Surface Casing, Intermediate Casing, Production Casing, Liner, Open Hole
      - survey_tool_type: One of: MWD, LWD, Wireline Gyro, Steering Tool, Other
      - survey_interval_from: Survey interval from depth (decimal)
      - survey_interval_to: Survey interval to depth (decimal, must be > from)

      Optional Fields:
      - casing_selected: Boolean, defaults to false
      - drillpipe_selected: Boolean, defaults to false

      Example Request:
      {
        "run": "uuid-string",
        "md": 1000.500,
        "inc": 45.25,
        "azi": 180.75,
        "tvd": 950.300,
        "latitude": 29.760427,
        "departure": -95.369803,
        "well_type": "Deviated",
        "hole_section": "Production Casing",
        "casing_selected": true,
        "drillpipe_selected": false,
        "survey_tool_type": "MWD",
        "survey_interval_from": 1000.000,
        "survey_interval_to": 5000.000
      }

      Validation Rules:
      - Inclination: Must be between 0 and 180 degrees (inclusive)
      - Azimuth: Must be between 0 and 360 degrees (exclusive upper bound)
      - Survey Interval: from must be less than to
      - Survey Interval Length: Auto-calculated as (to - from)
      - Run: Only one tie-on per run (OneToOne constraint)

    - retrieve: GET /api/v1/tieons/{id}/
      Returns a single tie-on by ID.

    - update: PUT /api/v1/tieons/{id}/
      Updates all fields of a tie-on (except run, which cannot be changed).

    - partial_update: PATCH /api/v1/tieons/{id}/
      Partially updates tie-on fields.

      Example Request:
      {
        "casing_selected": false,
        "drillpipe_selected": true
      }

    - destroy: DELETE /api/v1/tieons/{id}/
      Deletes a tie-on.
    """

    permission_classes = [IsAuthenticated]
    queryset = TieOn.objects.select_related('run').all()
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['run']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action.
        """
        if self.action == 'create':
            return CreateTieOnSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateTieOnSerializer
        return TieOnSerializer

    def get_queryset(self):
        """
        Optionally filter tie-ons by query parameters.
        """
        queryset = TieOn.objects.select_related('run').all()

        run_id = self.request.query_params.get('run', None)
        if run_id is not None:
            queryset = queryset.filter(run_id=run_id)

        return queryset
