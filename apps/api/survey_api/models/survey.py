"""
Survey model for storing survey type and metadata.
"""
import uuid
from django.db import models


class Survey(models.Model):
    """
    Survey model storing survey type and processing status information.
    A survey is associated with exactly one Run (OneToOne relationship).
    """

    SURVEY_TYPE_CHOICES = [
        ('Type 1 - GTL', 'Type 1 - GTL'),
        ('Type 2 - Gyro', 'Type 2 - Gyro'),
        ('Type 3 - MWD', 'Type 3 - MWD'),
        ('Type 4 - Unknown', 'Type 4 - Unknown'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('uploaded', 'Uploaded'),
        ('validated', 'Validated'),
        ('calculated', 'Calculated'),
        ('error', 'Error'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    run = models.OneToOneField('Run', on_delete=models.CASCADE, related_name='survey')

    survey_type = models.CharField(
        max_length=50,
        choices=SURVEY_TYPE_CHOICES,
        blank=True,
        null=True,
        help_text='Survey type - optional, can be determined from uploaded file'
    )
    file_path = models.CharField(max_length=500, blank=True, null=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'surveys'
        indexes = [
            models.Index(fields=['run'], name='idx_surveys_run_id'),
            models.Index(fields=['survey_type'], name='idx_surveys_survey_type'),
            models.Index(fields=['status'], name='idx_surveys_status'),
        ]

    def __str__(self):
        return f'Survey ({self.survey_type}) for Run {self.run.run_number}'
