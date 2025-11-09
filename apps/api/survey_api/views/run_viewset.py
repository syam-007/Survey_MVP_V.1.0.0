"""
ViewSet for Run model API endpoints.

Provides CRUD operations for runs with proper authentication, permissions,
filtering, pagination, and soft delete functionality.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.http import HttpResponse

from survey_api.models import Run
from survey_api.serializers.run_serializer import RunSerializer, RunCreateSerializer
from survey_api.permissions import IsAdminOrEngineer, IsOwnerOrReadOnly
from survey_api.services.run_service import RunService
from survey_api.filters import RunFilter
from survey_api.pagination import StandardResultsSetPagination
from survey_api.exceptions import RunNotFoundError, UnauthorizedError
from survey_api.views.activity_log_viewset import log_activity


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
        import logging
        logger = logging.getLogger(__name__)

        try:
            logger.info(f"perform_create called with data: {serializer.validated_data}")
            logger.info(f"Request user: {self.request.user}, Role: {getattr(self.request.user, 'role', 'N/A')}")

            data = serializer.validated_data
            run = RunService.create_run(data, self.request.user)
            serializer.instance = run

            logger.info(f"Successfully created run: {run.id}")

            # Log activity
            try:
                log_activity(
                    run_id=run.id,
                    user=self.request.user,
                    activity_type='run_created',
                    description=f'Created run: {run.run_name}',
                    metadata={
                        'run_number': run.run_number,
                        'run_name': run.run_name,
                        'well_id': str(run.well.id) if run.well else None,
                        'well_name': run.well.well_name if run.well else None
                    }
                )
            except Exception as log_error:
                logger.warning(f"Failed to log run creation: {str(log_error)}")
        except Exception as e:
            logger.error(f"Error in perform_create: {str(e)}", exc_info=True)
            raise

    def perform_update(self, serializer):
        """
        Update a run using RunService.
        Checks ownership permissions (admin or owner only).
        """
        import logging
        logger = logging.getLogger(__name__)

        try:
            data = serializer.validated_data
            run = RunService.update_run(
                self.kwargs['pk'],
                data,
                self.request.user
            )
            serializer.instance = run

            # Log activity
            try:
                # Build change summary from validated data
                changes = []
                for field, value in data.items():
                    changes.append(f"{field}")

                log_activity(
                    run_id=run.id,
                    user=self.request.user,
                    activity_type='run_updated',
                    description=f'Updated run: {run.run_name}',
                    metadata={
                        'run_number': run.run_number,
                        'run_name': run.run_name,
                        'fields_updated': changes
                    }
                )
            except Exception as log_error:
                logger.warning(f"Failed to log run update: {str(log_error)}")
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

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def validate_unique(self, request):
        """
        Validate if run_number or run_name already exists.

        Query params:
        - run_number: Check if this run number exists
        - run_name: Check if this run name exists
        - exclude_id: Optional run ID to exclude from check (for updates)

        Returns:
        {
            "run_number_exists": boolean,
            "run_name_exists": boolean
        }
        """
        run_number = request.query_params.get('run_number', '').strip()
        run_name = request.query_params.get('run_name', '').strip()
        exclude_id = request.query_params.get('exclude_id')

        result = {
            'run_number_exists': False,
            'run_name_exists': False
        }

        if run_number:
            query = Run.objects.filter(run_number=run_number, deleted=False)
            if exclude_id:
                query = query.exclude(id=exclude_id)
            result['run_number_exists'] = query.exists()

        if run_name:
            query = Run.objects.filter(run_name=run_name, deleted=False)
            if exclude_id:
                query = query.exclude(id=exclude_id)
            result['run_name_exists'] = query.exists()

        return Response(result)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def service_ticket(self, request, pk=None):
        """Generate and download Service Ticket PDF for a run."""
        from survey_api.services.service_ticket_report_service import ServiceTicketReportService

        run = self.get_object()

        try:
            # Generate PDF
            pdf_buffer = ServiceTicketReportService.generate_service_ticket(run)

            # Create response with PDF
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Service_Ticket_{run.run_number}.pdf"'

            return response

        except Exception as e:
            return Response(
                {'error': f'Failed to generate service ticket: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def prejob_report(self, request, pk=None):
        """Generate and download Prejob Report PDF for a run."""
        from survey_api.services.prejob_report_service import PrejobReportService

        run = self.get_object()

        try:
            # Get the job associated with this run
            if not hasattr(run, 'job') or not run.job:
                return Response(
                    {'error': 'No job associated with this run'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Generate PDF - returns bytes directly
            pdf_bytes = PrejobReportService.generate_prejob_report(run.job, run)

            # Create response with PDF
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Prejob_Report_{run.run_number}.pdf"'

            return response

        except Exception as e:
            return Response(
                {'error': f'Failed to generate prejob report: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def customer_satisfaction(self, request, pk=None):
        """Generate and download Customer Satisfaction Report PDF for a run."""
        from survey_api.services.customer_satisfaction_report_service import CustomerSatisfactionReportService

        run = self.get_object()

        try:
            # Generate PDF
            pdf_buffer = CustomerSatisfactionReportService.generate_customer_satisfaction_report(run)

            # Create response with PDF
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Customer_Satisfaction_Report_{run.run_number}.pdf"'

            return response

        except Exception as e:
            return Response(
                {'error': f'Failed to generate customer satisfaction report: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
