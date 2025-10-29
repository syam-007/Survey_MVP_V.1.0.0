"""
Service layer for Run model business logic.

Handles all business logic for Run operations including CRUD operations,
permissions checking, and soft delete functionality.
"""

from django.utils import timezone
from django.db.models import Q
from survey_api.models import Run


class RunService:
    """Service class for Run model business logic"""

    @staticmethod
    def list_runs(user, filters=None):
        """
        List runs with related data.

        Args:
            user: The authenticated user
            filters: Optional dictionary of filters to apply

        Returns:
            QuerySet of Run objects with select_related
        """
        queryset = Run.objects.select_related(
            'well', 'location', 'depth', 'tieon', 'user'
        ).prefetch_related('survey_files')

        # Apply filters if provided
        if filters:
            if 'run_type' in filters:
                queryset = queryset.filter(run_type=filters['run_type'])
            if 'well' in filters:
                queryset = queryset.filter(well_id=filters['well'])
            if 'created_at__gte' in filters:
                queryset = queryset.filter(created_at__gte=filters['created_at__gte'])
            if 'created_at__lte' in filters:
                queryset = queryset.filter(created_at__lte=filters['created_at__lte'])
            if 'updated_at__gte' in filters:
                queryset = queryset.filter(updated_at__gte=filters['updated_at__gte'])
            if 'updated_at__lte' in filters:
                queryset = queryset.filter(updated_at__lte=filters['updated_at__lte'])

        return queryset

    @staticmethod
    def get_run(run_id, user):
        """
        Get a single run with related data.

        Args:
            run_id: UUID of the run
            user: The authenticated user

        Returns:
            Run object

        Raises:
            Run.DoesNotExist: If run not found or deleted
        """
        return Run.objects.select_related(
            'well', 'location', 'depth', 'tieon', 'user'
        ).prefetch_related('survey_files').get(id=run_id)

    @staticmethod
    def create_run(data, user):
        """
        Create a new run.

        Args:
            data: Dictionary of run data
            user: The authenticated user who will be set as owner

        Returns:
            Created Run object
        """
        import logging
        logger = logging.getLogger(__name__)

        try:
            logger.info(f"create_run called with data: {data}")
            logger.info(f"User: {user}, Type: {type(user)}, Has role: {hasattr(user, 'role')}")

            # Set the user as the owner
            data['user'] = user
            logger.info(f"Creating Run with: {data}")

            run = Run.objects.create(**data)
            logger.info(f"Run created successfully: {run.id}")
            return run
        except Exception as e:
            logger.error(f"Error creating run: {str(e)}", exc_info=True)
            raise

    @staticmethod
    def update_run(run_id, data, user):
        """
        Update an existing run.

        Args:
            run_id: UUID of the run to update
            data: Dictionary of fields to update
            user: The authenticated user

        Returns:
            Updated Run object

        Raises:
            Run.DoesNotExist: If run not found
            PermissionError: If user doesn't have permission to update
        """
        run = Run.objects.select_related('user').get(id=run_id)

        # Check permissions: admins can update any run, engineers can only update their own
        if user.role != 'admin' and run.user != user:
            raise PermissionError("You do not have permission to update this run")

        # Update fields
        for field, value in data.items():
            if field != 'user':  # Don't allow changing the owner
                setattr(run, field, value)

        run.save()
        return run

    @staticmethod
    def delete_run(run_id, user):
        """
        Soft delete a run (set deleted=True, deleted_at=now).

        Args:
            run_id: UUID of the run to delete
            user: The authenticated user

        Raises:
            Run.DoesNotExist: If run not found
            PermissionError: If user doesn't have permission to delete
        """
        # Use all_objects to get the run even if already deleted
        run = Run.all_objects.select_related('user').get(id=run_id)

        # Check if already deleted
        if run.deleted:
            return

        # Check permissions: admins can delete any run, engineers can only delete their own
        if user.role != 'admin' and run.user != user:
            raise PermissionError("You do not have permission to delete this run")

        # Soft delete
        run.deleted = True
        run.deleted_at = timezone.now()
        run.save()

    @staticmethod
    def search_runs(user, query):
        """
        Search runs by run_number or run_name.

        Args:
            user: The authenticated user
            query: Search string

        Returns:
            QuerySet of matching Run objects
        """
        return Run.objects.select_related(
            'well', 'location', 'depth', 'user'
        ).filter(
            Q(run_number__icontains=query) | Q(run_name__icontains=query)
        )
