"""
ViewSet for Well CRUD operations.

Provides REST API endpoints for managing wells with associated runs.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from survey_api.models import Well
from survey_api.serializers.well_serializer import WellSerializer, WellListSerializer
from survey_api.services.well_service import WellService
from survey_api.permissions import IsAdminOrEngineer, IsViewerOrAbove
from survey_api.pagination import StandardResultsSetPagination
from django.core.exceptions import ValidationError


class WellViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Well model CRUD operations.

    Endpoints:
    - GET /api/v1/wells/ - List all wells (paginated)
    - POST /api/v1/wells/ - Create a new well
    - GET /api/v1/wells/{id}/ - Retrieve a specific well with runs
    - PUT /api/v1/wells/{id}/ - Update a well
    - PATCH /api/v1/wells/{id}/ - Partially update a well
    - DELETE /api/v1/wells/{id}/ - Hard delete a well (CASCADE to SET_NULL on runs)
    - GET /api/v1/wells/statistics/ - Get well statistics

    Permissions:
    - List/Retrieve: Authenticated users (all roles)
    - Create/Update/Delete: Admin or Engineer only

    Features:
    - Pagination (20 items per page)
    - Search by well_name, well_id
    - Ordering by created_at, updated_at, well_name, well_id
    - Hard delete (not soft delete like Run)
    """

    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['well_name', 'well_id']
    filterset_fields = []
    ordering_fields = ['created_at', 'updated_at', 'well_name', 'well_id']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Get queryset with optimizations.

        Uses WellService to apply prefetch_related and annotate.
        """
        filters = {}

        # Extract filter parameters from request
        search = self.request.query_params.get('search', None)
        if search:
            filters['search'] = search

        return WellService.list_wells(filters)

    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.

        - List: WellListSerializer (lightweight, no nested runs)
        - Retrieve/Create/Update: WellSerializer (includes nested runs)
        """
        if self.action == 'list':
            return WellListSerializer
        return WellSerializer

    def get_permissions(self):
        """
        Set permissions based on action.

        - Safe methods (GET): All authenticated users
        - Unsafe methods (POST, PUT, PATCH, DELETE): Admin or Engineer only
        """
        if self.action in ['list', 'retrieve', 'statistics']:
            permission_classes = [IsAuthenticated, IsViewerOrAbove]
        else:
            permission_classes = [IsAuthenticated, IsAdminOrEngineer]
        return [permission() for permission in permission_classes]

    def list(self, request, *args, **kwargs):
        """
        List all wells.

        Returns paginated list of wells with runs_count.
        Uses WellListSerializer for performance (no nested runs).
        """
        try:
            queryset = self.filter_queryset(self.get_queryset())

            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': 'Failed to retrieve wells', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a single well by ID.

        Returns full well details with nested runs.
        Uses WellSerializer with RunSummarySerializer.
        """
        from django.http import Http404

        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Http404:
            return Response(
                {'error': 'Well not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Well.DoesNotExist:
            return Response(
                {'error': 'Well not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': 'Failed to retrieve well', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        """
        Create a new well.

        Uses WellService.create_well for business logic.
        Validates well_id and well_name uniqueness.
        """
        from rest_framework.exceptions import ValidationError as DRFValidationError

        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            # Use service layer for creation
            well = WellService.create_well(serializer.validated_data)

            # Serialize the created well
            response_serializer = self.get_serializer(well)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            # Django ValidationError
            error_detail = e.message_dict if hasattr(e, 'message_dict') else {'error': str(e)}
            return Response(
                {'error': 'Validation failed', 'details': error_detail},
                status=status.HTTP_400_BAD_REQUEST
            )
        except DRFValidationError as e:
            # DRF ValidationError from serializer
            return Response(
                {'error': 'Validation failed', 'details': e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': 'Failed to create well', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        """
        Update a well (PUT - full update).

        Uses WellService.update_well for business logic.
        """
        from rest_framework.exceptions import ValidationError as DRFValidationError
        from django.http import Http404

        try:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()

            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)

            # Use service layer for update
            well = WellService.update_well(instance.id, serializer.validated_data)

            # Serialize the updated well
            response_serializer = self.get_serializer(well)
            return Response(response_serializer.data)
        except Http404:
            return Response(
                {'error': 'Well not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Well.DoesNotExist:
            return Response(
                {'error': 'Well not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValidationError as e:
            # Django ValidationError
            error_detail = e.message_dict if hasattr(e, 'message_dict') else {'error': str(e)}
            return Response(
                {'error': 'Validation failed', 'details': error_detail},
                status=status.HTTP_400_BAD_REQUEST
            )
        except DRFValidationError as e:
            # DRF ValidationError from serializer
            return Response(
                {'error': 'Validation failed', 'details': e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': 'Failed to update well', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def partial_update(self, request, *args, **kwargs):
        """
        Partially update a well (PATCH).
        """
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """
        Hard delete a well.

        IMPORTANT: This is a hard delete (not soft delete like Run).
        Associated runs will have their well field set to NULL (CASCADE SET_NULL).

        Uses WellService.delete_well for business logic.
        """
        from django.http import Http404

        try:
            instance = self.get_object()
            result = WellService.delete_well(instance.id)

            return Response(
                {
                    'message': 'Well deleted successfully',
                    'well_id': result['well_id'],
                    'affected_runs': result['affected_runs']
                },
                status=status.HTTP_204_NO_CONTENT
            )
        except Http404:
            return Response(
                {'error': 'Well not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Well.DoesNotExist:
            return Response(
                {'error': 'Well not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': 'Failed to delete well', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsAdminOrEngineer])
    def create_with_location(self, request):
        """
        Create a new well with location in a single atomic transaction.

        Custom endpoint: POST /api/v1/wells/create_with_location/

        Request body should include:
        - well_id: Unique well identifier
        - well_name: Well name
        - location: Location data (nested object with lat/lon, easting/northing, etc.)

        Returns the created well with location.
        """
        from rest_framework.exceptions import ValidationError as DRFValidationError
        from django.db import transaction
        from survey_api.serializers.location_serializers import CreateLocationSerializer

        try:
            with transaction.atomic():
                # Extract well and location data
                well_data = {
                    'well_id': request.data.get('well_id'),
                    'well_name': request.data.get('well_name'),
                }
                location_data = request.data.get('location', {})

                # Validate well data
                well_serializer = self.get_serializer(data=well_data)
                well_serializer.is_valid(raise_exception=True)

                # Create well
                well = WellService.create_well(well_serializer.validated_data)

                # Add well ID to location data
                location_data['well'] = well.id

                # Validate and create location
                location_serializer = CreateLocationSerializer(data=location_data)
                location_serializer.is_valid(raise_exception=True)
                location_serializer.save()

                # Return the created well with location
                response_serializer = self.get_serializer(well)
                return Response(
                    response_serializer.data,
                    status=status.HTTP_201_CREATED
                )
        except ValidationError as e:
            # Django ValidationError
            error_detail = e.message_dict if hasattr(e, 'message_dict') else {'error': str(e)}
            return Response(
                {'error': 'Validation failed', 'details': error_detail},
                status=status.HTTP_400_BAD_REQUEST
            )
        except DRFValidationError as e:
            # DRF ValidationError from serializer
            return Response(
                {'error': 'Validation failed', 'details': e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': 'Failed to create well with location', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsViewerOrAbove])
    def statistics(self, request):
        """
        Get well statistics.

        Custom endpoint: GET /api/v1/wells/statistics/

        Returns:
        - total_wells: Total number of wells
        - wells_with_runs: Number of wells that have at least one run
        - wells_without_runs: Number of wells with no runs
        """
        try:
            stats = WellService.get_well_statistics()
            return Response(stats, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': 'Failed to retrieve statistics', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
