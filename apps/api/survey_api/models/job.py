"""
Job model - top-level entity grouping multiple runs.

Represents a single operational job/project with associated master data.
"""
import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class Job(models.Model):
    """
    Job model - top-level entity grouping multiple runs.

    A job represents a single operational project that can have multiple survey runs.
    Each job is associated with a customer, client, well, rig, and service.
    Job number is auto-generated starting from OM1001.
    """

    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('on_hold', 'On Hold'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    job_number = models.CharField(
        max_length=100,
        unique=True,
        editable=False,
        help_text='Auto-generated unique job identifier (e.g., OM1001)'
    )

    # Master data references
    customer = models.ForeignKey(
        'Customer',
        on_delete=models.PROTECT,  # Prevent deletion if jobs exist
        related_name='jobs',
        help_text='Customer for this job'
    )

    client = models.ForeignKey(
        'Client',
        on_delete=models.PROTECT,
        related_name='jobs',
        help_text='Client for this job'
    )

    well = models.ForeignKey(
        'Well',
        on_delete=models.PROTECT,
        related_name='jobs',
        help_text='Well for this job'
    )

    rig = models.ForeignKey(
        'Rig',
        on_delete=models.PROTECT,
        related_name='jobs',
        help_text='Rig for this job'
    )

    service = models.ForeignKey(
        'Service',
        on_delete=models.PROTECT,
        related_name='jobs',
        help_text='Service for this job'
    )

    # Job metadata
    start_date = models.DateField(
        null=True,
        blank=True,
        help_text='Auto-populated from first run upload date'
    )

    end_date = models.DateField(
        null=True,
        blank=True,
        help_text='Auto-populated from last run upload date'
    )

    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='planned',
        help_text='Current job status'
    )

    description = models.TextField(
        null=True,
        blank=True,
        help_text='Job description'
    )

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_jobs'
    )

    class Meta:
        db_table = 'jobs'
        ordering = ['-created_at']
        verbose_name = 'Job'
        verbose_name_plural = 'Jobs'
        indexes = [
            models.Index(fields=['job_number'], name='idx_jobs_job_number'),
            models.Index(fields=['customer'], name='idx_jobs_customer_id'),
            models.Index(fields=['client'], name='idx_jobs_client_id'),
            models.Index(fields=['well'], name='idx_jobs_well_id'),
            models.Index(fields=['rig'], name='idx_jobs_rig_id'),
            models.Index(fields=['service'], name='idx_jobs_service_id'),
            models.Index(fields=['status'], name='idx_jobs_status'),
            models.Index(fields=['start_date'], name='idx_jobs_start_date'),
        ]

    @staticmethod
    def generate_job_number():
        """
        Generate the next job number in sequence (OM1001, OM1002, etc.).
        """
        # Get the latest job number
        latest_job = Job.objects.filter(
            job_number__startswith='OM'
        ).order_by('-job_number').first()

        if latest_job and latest_job.job_number:
            # Extract the numeric part and increment
            try:
                last_number = int(latest_job.job_number[2:])  # Remove 'OM' prefix
                next_number = last_number + 1
            except (ValueError, IndexError):
                next_number = 1001
        else:
            next_number = 1001

        return f'OM{next_number}'

    def clean(self):
        """
        Validate job data.
        """
        super().clean()

        # Validate date range
        if self.start_date and self.end_date:
            if self.end_date < self.start_date:
                raise ValidationError({
                    'end_date': 'End date cannot be before start date'
                })

    def save(self, *args, **kwargs):
        """
        Override save to auto-generate job number and run validation.
        """
        # Auto-generate job number if not set
        if not self.job_number:
            self.job_number = self.generate_job_number()

        self.full_clean()
        super().save(*args, **kwargs)

    def update_dates_from_runs(self):
        """
        Update start_date and end_date based on associated runs' survey file upload dates.
        """
        from django.db.models import Min, Max

        # Get min and max upload dates from survey files across all runs
        dates = self.runs.filter(
            survey_files__isnull=False
        ).aggregate(
            earliest=Min('survey_files__upload_date'),
            latest=Max('survey_files__upload_date')
        )

        if dates['earliest']:
            self.start_date = dates['earliest'].date()
        if dates['latest']:
            self.end_date = dates['latest'].date()

        self.save()

    def __str__(self):
        """String representation of the job."""
        return self.job_number

    @property
    def location(self):
        """Access well's location through the well relationship."""
        return self.well.location if (self.well and hasattr(self.well, 'location')) else None

    @property
    def duration_days(self):
        """Calculate job duration in days."""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days
        return None

    @property
    def is_active(self):
        """Check if job is currently active."""
        return self.status == 'active'
