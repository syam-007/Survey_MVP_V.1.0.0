"""
ViewSet for Location model API endpoints.

Provides CRUD operations for locations with proper authentication, permissions,
filtering, and automatic coordinate calculations.
"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from survey_api.models import Location
from survey_api.serializers import (
    LocationSerializer,
    CreateLocationSerializer,
    UpdateLocationSerializer,
)
from survey_api.services.location_service import LocationService


class LocationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Location model CRUD operations.

    Provides:
    - list: GET /api/v1/locations/ - List all locations (with filtering, pagination)
    - create: POST /api/v1/locations/ - Create a new location with automatic calculations
    - retrieve: GET /api/v1/locations/{id}/ - Get a single location
    - update: PUT /api/v1/locations/{id}/ - Update a location with recalculation
    - partial_update: PATCH /api/v1/locations/{id}/ - Partial update with recalculation
    - destroy: DELETE /api/v1/locations/{id}/ - Delete a location

    Permissions:
    - All authenticated users can access all operations

    Filtering:
    - Filter by run: ?run={run_id}
    - Filter by well: ?well={well_id}

    Calculated Fields:
    - easting, northing, grid_correction, g_t, max_g_t, w_t, max_w_t
    - Automatically computed from latitude, longitude, and geodetic parameters
    - Recalculated on update if any coordinate-related fields change
    """

    permission_classes = [IsAuthenticated]
    queryset = Location.objects.select_related('run', 'well').all()
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['run', 'well']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']  # Default ordering

    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action.
        - Use CreateLocationSerializer for create action
        - Use UpdateLocationSerializer for update/partial_update actions
        - Use LocationSerializer for read actions
        """
        if self.action == 'create':
            return CreateLocationSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateLocationSerializer
        return LocationSerializer

    def get_queryset(self):
        """
        Get queryset with optimized queries using select_related.
        Filter by run or well if query parameters provided.
        """
        queryset = Location.objects.select_related('run', 'well').all()

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
        Create a new location with automatic coordinate calculations.

        Request Body Example:
        {
            "run": "uuid-of-run",  // optional, exactly one of run/well required
            "well": "uuid-of-well",  // optional, exactly one of run/well required
            "latitude": 45.5231,
            "longitude": -122.6765,
            "geodetic_system": "WGS84",
            "map_zone": "15N",
            "north_reference": "True North",
            "central_meridian": -93.0
        }

        Response includes calculated fields:
        - easting, northing (UTM coordinates)
        - grid_correction
        - g_t, max_g_t (grid convergence)
        - w_t, max_w_t (scale factors)
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Return full location data with calculated fields
        location = serializer.instance
        response_serializer = LocationSerializer(location)
        headers = self.get_success_headers(response_serializer.data)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    def update(self, request, *args, **kwargs):
        """
        Update a location with automatic recalculation of derived fields.

        If latitude, longitude, central_meridian, geodetic_system, or map_zone
        are updated, all calculated fields are automatically recalculated.

        Request Body Example:
        {
            "latitude": 45.5500,
            "longitude": -122.7000,
            "central_meridian": -93.0
        }
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Return full location data with calculated fields
        response_serializer = LocationSerializer(serializer.instance)
        return Response(response_serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """
        Partially update a location with automatic recalculation.

        Same as update but allows updating only specific fields.
        """
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a single location with all data including calculated fields.

        Response Example:
        {
            "id": "uuid",
            "run": "run-uuid",
            "well": null,
            "latitude": 45.5231,
            "longitude": -122.6765,
            "easting": 529157.345,
            "northing": 5040123.678,
            "geodetic_system": "WGS84",
            "map_zone": "15N",
            "north_reference": "True North",
            "central_meridian": -93.0,
            "grid_correction": 0.123456,
            "g_t": 0.00123456,
            "max_g_t": 0.00148147,
            "w_t": 0.9996,
            "max_w_t": 1.0004,
            "created_at": "2024-01-15T10:30:00Z",
            "updated_at": "2024-01-15T10:30:00Z"
        }
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def list(self, request, *args, **kwargs):
        """
        List locations with filtering and pagination.

        Query Parameters:
        - run: Filter by run ID
        - well: Filter by well ID

        Example: GET /api/v1/locations/?run=uuid-of-run
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
        Delete a location.

        Note: Location is cascade-deleted when associated Run or Well is deleted.
        """
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
