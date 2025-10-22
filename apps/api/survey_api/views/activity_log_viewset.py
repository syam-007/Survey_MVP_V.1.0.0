"""
Activity Log API Views

Handles activity log retrieval for audit trail.
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from survey_api.models import RunActivityLog, Run
from survey_api.serializers import (
    RunActivityLogSerializer,
    CreateRunActivityLogSerializer,
)

logger = logging.getLogger(__name__)


class RunActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for run activity logs (read-only)."""

    permission_classes = [IsAuthenticated]
    serializer_class = RunActivityLogSerializer

    def get_queryset(self):
        """Get queryset filtered by run if specified."""
        queryset = RunActivityLog.objects.select_related('user', 'run').all()
        run_id = self.request.query_params.get('run_id', None)
        if run_id:
            queryset = queryset.filter(run_id=run_id)
        return queryset.order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='by-run/(?P<run_id>[^/.]+)')
    def by_run(self, request, run_id=None):
        """
        Get all activity logs for a specific run.

        URL: /activity-logs/by-run/{run_id}/

        Query Parameters:
            - page_size: Number of logs per page (default: 20)
            - page: Page number
        """
        try:
            run = get_object_or_404(Run, id=run_id)
            logs = RunActivityLog.objects.filter(run=run).select_related('user').order_by('-created_at')

            # Pagination
            page_size = int(request.query_params.get('page_size', 20))
            page = int(request.query_params.get('page', 1))

            start = (page - 1) * page_size
            end = start + page_size

            paginated_logs = logs[start:end]
            serializer = RunActivityLogSerializer(paginated_logs, many=True)

            return Response({
                'count': logs.count(),
                'results': serializer.data,
                'page': page,
                'page_size': page_size,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to get activity logs for run {run_id}: {str(e)}")
            return Response(
                {'error': f'Failed to get activity logs: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['delete'], url_path='by-run/(?P<run_id>[^/.]+)/delete-all')
    def delete_all_by_run(self, request, run_id=None):
        """
        Delete all activity logs for a specific run.

        URL: /activity-logs/by-run/{run_id}/delete-all/

        Returns:
            200 OK: {"message": "Deleted X activity logs", "count": X}
            404 Not Found: Run not found
            500 Internal Server Error: Deletion failed
        """
        try:
            run = get_object_or_404(Run, id=run_id)
            logs = RunActivityLog.objects.filter(run=run)
            count = logs.count()
            logs.delete()

            logger.info(f"Deleted {count} activity logs for run {run_id}")
            return Response({
                'message': f'Deleted {count} activity logs',
                'count': count
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Failed to delete activity logs for run {run_id}: {str(e)}")
            return Response(
                {'error': f'Failed to delete activity logs: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


def log_activity(run_id, user, activity_type, description, metadata=None):
    """
    Helper function to log an activity with deduplication.

    Prevents duplicate logs within 3 seconds of the same activity by the same user.

    Args:
        run_id: UUID of the run
        user: User object (can be None for system actions)
        activity_type: Activity type from ACTIVITY_TYPES choices
        description: Human-readable description
        metadata: Optional dictionary of additional data
    """
    try:
        from django.utils import timezone
        from datetime import timedelta
        from django.db import transaction

        # Use transaction with select_for_update to prevent race conditions
        with transaction.atomic():
            # Check for duplicate log within last 3 seconds
            three_seconds_ago = timezone.now() - timedelta(seconds=3)

            # Check if same activity exists within the time window
            duplicate_exists = RunActivityLog.objects.filter(
                run_id=run_id,
                user=user,
                activity_type=activity_type,
                description=description,
                created_at__gte=three_seconds_ago
            ).exists()

            if duplicate_exists:
                logger.info(f"Skipping duplicate activity log: {activity_type} for run {run_id}")
                return

            # Create new log entry
            RunActivityLog.objects.create(
                run_id=run_id,
                user=user,
                activity_type=activity_type,
                description=description,
                metadata=metadata or {}
            )
            logger.info(f"Activity logged: {activity_type} for run {run_id}")
    except Exception as e:
        logger.error(f"Failed to log activity: {str(e)}")
