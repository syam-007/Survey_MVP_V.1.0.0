"""
Run Activity Log Model

Tracks all actions performed on a run for audit trail.
"""
from django.db import models
from django.conf import settings
import uuid


class RunActivityLog(models.Model):
    """
    Model to track all activities/actions performed on a run.

    Provides complete audit trail of who did what and when.
    """

    # Activity types
    ACTIVITY_TYPES = [
        # Run activities
        ('run_created', 'Run Created'),
        ('run_updated', 'Run Updated'),
        ('run_deleted', 'Run Deleted'),

        # Survey activities
        ('survey_uploaded', 'Survey Uploaded'),
        ('survey_deleted', 'Survey Deleted'),
        ('survey_calculated', 'Survey Calculated'),
        ('survey_interpolated', 'Survey Interpolated'),
        ('survey_viewed', 'Survey Viewed'),

        # Comparison activities
        ('comparison_created', 'Comparison Created'),
        ('comparison_viewed', 'Comparison Viewed'),
        ('comparison_deleted', 'Comparison Deleted'),
        ('comparison_exported', 'Comparison Exported'),

        # Adjustment activities
        ('adjustment_applied', 'Adjustment Applied'),
        ('adjustment_reset', 'Adjustment Reset'),
        ('adjustment_undone', 'Adjustment Undone'),
        ('adjustment_redone', 'Adjustment Redone'),

        # Extrapolation activities
        ('extrapolation_calculated', 'Extrapolation Calculated'),
        ('extrapolation_saved', 'Extrapolation Saved'),
        ('extrapolation_deleted', 'Extrapolation Deleted'),

        # Duplicate survey activities
        ('duplicate_survey_calculated', 'Duplicate Survey Calculated'),
        ('duplicate_survey_exported', 'Duplicate Survey Exported'),

        # Reference survey activities
        ('reference_survey_uploaded', 'Reference Survey Uploaded'),
        ('reference_survey_deleted', 'Reference Survey Deleted'),

        # Tie-on activities
        ('tieon_created', 'Tie-on Created'),
        ('tieon_updated', 'Tie-on Updated'),
        ('tieon_deleted', 'Tie-on Deleted'),

        # Export activities
        ('data_exported', 'Data Exported'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(
        'Run',
        on_delete=models.CASCADE,
        related_name='activity_logs'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='run_activities'
    )
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    description = models.TextField()

    # Optional metadata as JSON
    metadata = models.JSONField(default=dict, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'run_activity_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['run', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['activity_type', '-created_at']),
        ]

    def __str__(self):
        user_name = self.user.get_full_name() if self.user else 'System'
        return f"{user_name} - {self.get_activity_type_display()} - {self.created_at}"

    @property
    def user_name(self):
        """Get user's full name or username"""
        if not self.user:
            return 'System'
        return self.user.get_full_name() or self.user.username

    @property
    def user_email(self):
        """Get user's email"""
        if not self.user:
            return None
        return self.user.email
