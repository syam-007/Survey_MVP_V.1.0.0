"""
ViewSet for Run model API endpoints.

Provides CRUD operations for runs with proper authentication, permissions,
filtering, pagination, and soft delete functionality.
"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from survey_api.models import Run
from survey_api.serializers.run_serializer import RunSerializer, RunCreateSerializer
from survey_api.permissions import IsAdminOrEngineer, IsOwnerOrReadOnly
from survey_api.services.run_service import RunService
from survey_api.filters import RunFilter
from survey_api.pagination import StandardResultsSetPagination
from survey_api.exceptions import RunNotFoundError, UnauthorizedError


class RunViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Run model CRUD operations.

    Provides:
    - list: GET /api/v1/runs/ - List all runs (with filtering, search, pagination)
    - create: POST /api/v1/runs/ - Create a new run (admin/engineer only)
    - retrieve: GET /api/v1/runs/{id}/ - Get a single run
    - update: PUT /api/v1/runs/{id}/ - Update a run (admin or owner only)
    - partial_update: PATCH /api/v1/runs/{id}/ - Partial update (admin or owner only)
    - destroy: DELETE /api/v1/runs/{id}/ - Soft delete a run (admin or owner only)

    Permissions:
    - All authenticated users can list and retrieve
    - Admin and engineers can create
    - Admin can update/delete any run
    - Engineers can only update/delete their own runs
    - Viewers have read-only access
    """

    permission_classes = [IsAuthenticated, IsAdminOrEngineer]
    pagination_class = StandardResultsSetPagination
    filterset_class = RunFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['run_number', 'run_name']
    ordering_fields = ['created_at', 'updated_at', 'run_number']
    ordering = ['-created_at']  # Default ordering

    def get_queryset(self):
        """
        Get queryset with optimized queries using select_related and prefetch_related.
        Uses RunService for business logic.
        """
        return RunService.list_runs(self.request.user)

    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action.
        - Use RunCreateSerializer for create action (no nested objects)
        - Use RunSerializer for read actions (with nested objects)
        """
        if self.action == 'create':
            return RunCreateSerializer
        return RunSerializer

    def get_permissions(self):
        """
        Override to apply object-level permissions for update/delete.
        """
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminOrEngineer(), IsOwnerOrReadOnly()]
        return super().get_permissions()

    def perform_create(self, serializer):
        """
        Create a new run using RunService.
        Sets the authenticated user as the owner.
        """
        data = serializer.validated_data
        run = RunService.create_run(data, self.request.user)
        serializer.instance = run

    def perform_update(self, serializer):
        """
        Update a run using RunService.
        Checks ownership permissions (admin or owner only).
        """
        try:
            data = serializer.validated_data
            run = RunService.update_run(
                self.kwargs['pk'],
                data,
                self.request.user
            )
            serializer.instance = run
        except PermissionError as e:
            raise UnauthorizedError(str(e))
        except Run.DoesNotExist:
            raise RunNotFoundError("Run not found")

    def perform_destroy(self, instance):
        """
        Soft delete a run using RunService.
        Sets deleted=True and deleted_at=now instead of actually deleting.
        """
        try:
            RunService.delete_run(instance.id, self.request.user)
        except PermissionError as e:
            raise UnauthorizedError(str(e))
        except Run.DoesNotExist:
            raise RunNotFoundError("Run not found")

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a single run with all related data.
        """
        try:
            instance = RunService.get_run(kwargs['pk'], request.user)
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Run.DoesNotExist:
            raise RunNotFoundError("Run not found")

    def list(self, request, *args, **kwargs):
        """
        List runs with filtering, search, and pagination.
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
