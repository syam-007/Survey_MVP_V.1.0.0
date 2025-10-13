"""
ViewSet for Depth model API endpoints.

Provides CRUD operations for depths with proper authentication, permissions,
and filtering.
"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from survey_api.models import Depth
from survey_api.serializers import (
    DepthSerializer,
    CreateDepthSerializer,
    UpdateDepthSerializer,
)


class DepthViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Depth model CRUD operations.

    Provides:
    - list: GET /api/v1/depths/ - List all depths (with filtering, pagination)
    - create: POST /api/v1/depths/ - Create a new depth
    - retrieve: GET /api/v1/depths/{id}/ - Get a single depth
    - update: PUT /api/v1/depths/{id}/ - Update a depth
    - partial_update: PATCH /api/v1/depths/{id}/ - Partial update
    - destroy: DELETE /api/v1/depths/{id}/ - Delete a depth

    Permissions:
    - All authenticated users can access all operations

    Filtering:
    - Filter by run: ?run={run_id}
    - Filter by well: ?well={well_id}

    Validation:
    - elevation_reference must be one of: KB, RT, GL, MSL, DF, RKB
    - Exactly one of run or well must be set (not both, not neither)
    - All fields except run/well can be updated
    """

    permission_classes = [IsAuthenticated]
    queryset = Depth.objects.select_related('run', 'well').all()
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['run', 'well']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']  # Default ordering

    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action.
        - Use CreateDepthSerializer for create action
        - Use UpdateDepthSerializer for update/partial_update actions
        - Use DepthSerializer for read actions
        """
        if self.action == 'create':
            return CreateDepthSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateDepthSerializer
        return DepthSerializer

    def get_queryset(self):
        """
        Get queryset with optimized queries using select_related.
        Filter by run or well if query parameters provided.
        """
        queryset = Depth.objects.select_related('run', 'well').all()

        # Filter by run if provided
        run_id = self.request.query_params.get('run', None)
        if run_id is not None:
            queryset = queryset.filter(run_id=run_id)

        # Filter by well if provided
        well_id = self.request.query_params.get('well', None)
        if well_id is not None:
            queryset = queryset.filter(well_id=well_id)

        return queryset

    def create(self, request, *args, **kwargs):
        """
        Create a new depth.

        Request Body Example:
        {
            "run": "uuid-of-run",  // optional, exactly one of run/well required
            "well": "uuid-of-well",  // optional, exactly one of run/well required
            "elevation_reference": "KB",
            "reference_datum": "WGS84",
            "reference_height": 1500.500,
            "reference_elevation": 985.250
        }

        Response includes all depth data with timestamps.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Return full depth data
        depth = serializer.instance
        response_serializer = DepthSerializer(depth)
        headers = self.get_success_headers(response_serializer.data)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    def update(self, request, *args, **kwargs):
        """
        Update a depth.

        Note: run and well associations cannot be changed after creation.

        Request Body Example:
        {
            "elevation_reference": "RT",
            "reference_datum": "NAD83",
            "reference_height": 1550.000,
            "reference_elevation": 1000.000
        }
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Return full depth data
        response_serializer = DepthSerializer(serializer.instance)
        return Response(response_serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """
        Partially update a depth.

        Same as update but allows updating only specific fields.
        """
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a single depth with all data.

        Response Example:
        {
            "id": "uuid",
            "run": "run-uuid",
            "well": null,
            "elevation_reference": "KB",
            "reference_datum": "WGS84",
            "reference_height": 1500.500,
            "reference_elevation": 985.250,
            "created_at": "2024-01-15T10:30:00Z",
            "updated_at": "2024-01-15T10:30:00Z"
        }
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def list(self, request, *args, **kwargs):
        """
        List depths with filtering and pagination.

        Query Parameters:
        - run: Filter by run ID
        - well: Filter by well ID

        Example: GET /api/v1/depths/?run=uuid-of-run
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Delete a depth.

        Note: Depth is cascade-deleted when associated Run or Well is deleted.
        """
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
