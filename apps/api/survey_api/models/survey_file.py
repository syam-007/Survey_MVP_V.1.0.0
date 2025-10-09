from django.db import models
import uuid


class SurveyFile(models.Model):
    """
    Represents uploaded survey data files with processing status.

    Tracks file metadata, processing state, and calculated survey results.
    Each file belongs to a run and can have multiple calculations.
    """

    SURVEY_TYPE_CHOICES = [
        ('GTL', 'GTL'),
        ('Gyro', 'Gyro'),
        ('MWD', 'MWD'),
        ('Unknown', 'Unknown'),
    ]

    PROCESSING_STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.ForeignKey(
        'Run',
        on_delete=models.CASCADE,
        related_name='survey_files'
    )
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField()
    survey_type = models.CharField(max_length=50, choices=SURVEY_TYPE_CHOICES)
    processing_status = models.CharField(
        max_length=50,
        choices=PROCESSING_STATUS_CHOICES,
        default='uploaded'
    )
    calculated_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'survey_files'
        verbose_name = 'Survey File'
        verbose_name_plural = 'Survey Files'
        indexes = [
            models.Index(fields=['run'], name='idx_survey_files_run_id'),
            models.Index(fields=['processing_status'], name='idx_survey_files_status'),
        ]

    def __str__(self):
        return f"{self.file_name} ({self.processing_status})"
