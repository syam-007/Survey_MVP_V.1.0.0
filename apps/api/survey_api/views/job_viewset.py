"""
ViewSets for Job and Master Data models.

Provides CRUD operations for:
- Customer
- Client
- Rig
- Service
- Well (enhanced)
- Job
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse

from survey_api.models import Customer, Client, Rig, Service, Well, Job
from survey_api.serializers.job_serializers import (
    CustomerSerializer,
    CustomerListSerializer,
    CreateCustomerSerializer,
    ClientSerializer,
    ClientListSerializer,
    CreateClientSerializer,
    RigSerializer,
    RigListSerializer,
    CreateRigSerializer,
    ServiceSerializer,
    ServiceListSerializer,
    CreateServiceSerializer,
    WellSerializer,
    WellListSerializer,
    CreateWellSerializer,
    JobSerializer,
    JobListSerializer,
    CreateJobSerializer,
    UpdateJobSerializer,
)


class CustomerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Customer operations.

    Provides:
    - List customers with filtering
    - Create customer
    - Retrieve customer details
    - Update customer
    - Delete customer
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = []
    search_fields = ['customer_name']
    ordering_fields = ['customer_name', 'created_at', 'updated_at']
    ordering = ['customer_name']

    def get_queryset(self):
        """Get queryset."""
        return Customer.objects.all()

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return CustomerListSerializer
        elif self.action == 'create':
            return CreateCustomerSerializer
        elif self.action in ['update', 'partial_update']:
            return CreateCustomerSerializer
        return CustomerSerializer

    @action(detail=True, methods=['get'])
    def jobs(self, request, pk=None):
        """Get all jobs for a customer."""
        customer = self.get_object()
        jobs = customer.jobs.all()
        serializer = JobListSerializer(jobs, many=True)
        return Response(serializer.data)


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Client operations.

    Provides:
    - List clients with filtering
    - Create client
    - Retrieve client details
    - Update client
    - Delete client
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = []
    search_fields = ['client_name']
    ordering_fields = ['client_name', 'created_at', 'updated_at']
    ordering = ['client_name']

    def get_queryset(self):
        """Get queryset."""
        return Client.objects.all()

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return ClientListSerializer
        elif self.action == 'create':
            return CreateClientSerializer
        elif self.action in ['update', 'partial_update']:
            return CreateClientSerializer
        return ClientSerializer

    @action(detail=True, methods=['get'])
    def jobs(self, request, pk=None):
        """Get all jobs for a client."""
        client = self.get_object()
        jobs = client.jobs.all()
        serializer = JobListSerializer(jobs, many=True)
        return Response(serializer.data)


class RigViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Rig operations.

    Provides:
    - List rigs with filtering
    - Create rig
    - Retrieve rig details
    - Update rig
    - Delete rig
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = []
    search_fields = ['rig_id', 'rig_number']
    ordering_fields = ['rig_id', 'rig_number', 'created_at', 'updated_at']
    ordering = ['rig_id']

    def get_queryset(self):
        """Get queryset."""
        return Rig.objects.all()

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return RigListSerializer
        elif self.action == 'create':
            return CreateRigSerializer
        elif self.action in ['update', 'partial_update']:
            return CreateRigSerializer
        return RigSerializer

    @action(detail=True, methods=['get'])
    def jobs(self, request, pk=None):
        """Get all jobs for a rig."""
        rig = self.get_object()
        jobs = rig.jobs.all()
        serializer = JobListSerializer(jobs, many=True)
        return Response(serializer.data)


class ServiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Service operations.

    Provides:
    - List services with filtering
    - Create service
    - Retrieve service details
    - Update service
    - Delete service
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = []
    search_fields = ['service_name']
    ordering_fields = ['service_name', 'created_at', 'updated_at']
    ordering = ['service_name']

    def get_queryset(self):
        """Get queryset."""
        return Service.objects.all()

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return ServiceListSerializer
        elif self.action == 'create':
            return CreateServiceSerializer
        elif self.action in ['update', 'partial_update']:
            return CreateServiceSerializer
        return ServiceSerializer

    @action(detail=True, methods=['get'])
    def jobs(self, request, pk=None):
        """Get all jobs for a service."""
        service = self.get_object()
        jobs = service.jobs.all()
        serializer = JobListSerializer(jobs, many=True)
        return Response(serializer.data)


class WellViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Well operations.

    Provides:
    - List wells with filtering
    - Create well
    - Retrieve well details with location
    - Update well
    - Delete well
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = []
    search_fields = ['well_name', 'well_id']
    ordering_fields = ['well_name', 'well_id', 'created_at', 'updated_at']
    ordering = ['well_name']

    def get_queryset(self):
        """Get queryset with annotations and related objects."""
        return Well.objects.select_related('location').annotate(
            job_count=Count('jobs', distinct=True)
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return WellListSerializer
        elif self.action == 'create':
            return CreateWellSerializer
        elif self.action in ['update', 'partial_update']:
            return CreateWellSerializer
        return WellSerializer

    @action(detail=True, methods=['get'])
    def jobs(self, request, pk=None):
        """Get all jobs for a well."""
        well = self.get_object()
        jobs = well.jobs.all()
        serializer = JobListSerializer(jobs, many=True)
        return Response(serializer.data)


class JobViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Job operations.

    Provides:
    - List jobs with filtering by customer, client, well, rig, service, status
    - Create job
    - Retrieve job details with all related data and runs
    - Update job
    - Delete job
    - Get runs for a job
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'client', 'well', 'rig', 'service', 'status']
    search_fields = ['job_number', 'description']
    ordering_fields = ['job_number', 'start_date', 'end_date', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Get queryset with related objects and annotations."""
        queryset = Job.objects.select_related(
            'customer',
            'client',
            'well',
            'well__location',
            'rig',
            'service',
            'created_by'
        ).prefetch_related(
            'runs'
        ).annotate(
            run_count=Count('runs', distinct=True)
        )

        # Filter by user's jobs if not admin
        user = self.request.user
        if not user.is_staff:
            queryset = queryset.filter(created_by=user)

        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return JobListSerializer
        elif self.action == 'create':
            return CreateJobSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateJobSerializer
        return JobSerializer

    def perform_create(self, serializer):
        """Set created_by to current user when creating job."""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def runs(self, request, pk=None):
        """Get all runs for a job."""
        from survey_api.serializers.run_serializer import RunSerializer

        job = self.get_object()
        runs = job.runs.all().select_related(
            'well',
            'user',
            'location',
            'depth',
            'tieon'
        ).prefetch_related(
            'survey_files'
        ).order_by('-created_at')

        # Pagination
        page = self.paginate_queryset(runs)
        if page is not None:
            serializer = RunSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = RunSerializer(runs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """Change job status."""
        job = self.get_object()
        new_status = request.data.get('status')

        if not new_status:
            return Response(
                {'error': 'Status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_statuses = [choice[0] for choice in Job.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        job.status = new_status
        job.save(update_fields=['status', 'updated_at'])

        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get job statistics."""
        queryset = self.get_queryset()

        stats = {
            'total_jobs': queryset.count(),
            'active_jobs': queryset.filter(status='active').count(),
            'completed_jobs': queryset.filter(status='completed').count(),
            'planned_jobs': queryset.filter(status='planned').count(),
            'cancelled_jobs': queryset.filter(status='cancelled').count(),
            'by_customer': list(
                queryset.values('customer__customer_name')
                .annotate(count=Count('id'))
                .order_by('-count')[:5]
            ),
            'by_well': list(
                queryset.values('well__well_name')
                .annotate(count=Count('id'))
                .order_by('-count')[:5]
            ),
        }

        return Response(stats)

    @action(detail=True, methods=['get'])
    def prejob_report(self, request, pk=None):
        """Generate and download Pre-Survey Data Sheet (Prejob Report) PDF."""
        from survey_api.services.prejob_report_service import PrejobReportService

        job = self.get_object()

        try:
            # Generate PDF
            pdf_bytes = PrejobReportService.generate_prejob_report(job)

            # Create response with PDF
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Prejob_Report_{job.job_number}.pdf"'

            return response

        except Exception as e:
            return Response(
                {'error': f'Failed to generate prejob report: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def soe_report(self, request, pk=None):
        """Generate and download SOE (Sequence of Events) Report PDF."""
        from survey_api.services.soe_report_service import SOEReportService

        job = self.get_object()

        try:
            # Generate PDF
            pdf_buffer = SOEReportService.generate_soe_report(str(job.id))

            # Create response with PDF
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="SOE_Report_{job.job_number}.pdf"'

            return response

        except Exception as e:
            return Response(
                {'error': f'Failed to generate SOE report: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
