from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class RunManager(models.Manager):
    """Custom manager that filters out deleted runs"""

    def get_queryset(self):
        return super().get_queryset().filter(deleted=False)


class Run(models.Model):
    """
    Represents a survey run with associated metadata and configuration.

    Each run belongs to a user and optionally to a well. Runs contain
    vertical section information, configuration flags, and directional data.
    """

    SURVEY_TYPE_CHOICES = [
        ('GTL', 'GTL'),
        ('Gyro', 'Gyro'),
        ('MWD', 'MWD'),
        ('Unknown', 'Unknown'),
    ]

    RUN_TYPE_CHOICES = [
        ('Memory', 'Memory'),
        ('Surface Readout', 'Surface Readout'),
        ('Dummy', 'Dummy'),
        ('Test Stand', 'Test Stand'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run_number = models.CharField(max_length=100, unique=True)
    run_name = models.CharField(max_length=255, unique=True)
    survey_type = models.CharField(max_length=50, choices=SURVEY_TYPE_CHOICES)
    run_type = models.CharField(max_length=50, choices=RUN_TYPE_CHOICES, null=True, blank=True)
    vertical_section = models.JSONField(null=True, blank=True)
    bhc_enabled = models.BooleanField(default=False)
    proposal_direction = models.DecimalField(
        max_digits=10, decimal_places=6, null=True, blank=True
    )
    grid_correction = models.DecimalField(
        max_digits=10, decimal_places=6, default=0
    )
    well = models.ForeignKey(
        'Well',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='runs'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='runs'
    )
    deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Custom managers
    objects = RunManager()  # Default manager filters out deleted runs
    all_objects = models.Manager()  # Manager to access all runs including deleted

    class Meta:
        db_table = 'runs'
        verbose_name = 'Run'
        verbose_name_plural = 'Runs'
        indexes = [
            models.Index(fields=['well'], name='idx_runs_well_id'),
        ]

    def __str__(self):
        return f"{self.run_number} - {self.run_name}"
