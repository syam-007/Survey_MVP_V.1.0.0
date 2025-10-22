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

    SURVEY_ROLE_CHOICES = [
        ('primary', 'Primary Survey'),
        ('reference', 'Reference Survey'),
        ('comparison', 'Comparison Survey'),
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

    # Survey role and reference tracking
    survey_role = models.CharField(
        max_length=20,
        choices=SURVEY_ROLE_CHOICES,
        default='primary',
        help_text="Role of this survey: primary (actual), reference (planned/baseline), or comparison"
    )
    reference_for_survey = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reference_surveys',
        help_text="Primary survey this is a reference for (if survey_role='reference')"
    )

    calculated_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'survey_files'
        verbose_name = 'Survey File'
        verbose_name_plural = 'Survey Files'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['run'], name='idx_survey_files_run_id'),
            models.Index(fields=['processing_status'], name='idx_survey_files_status'),
            models.Index(fields=['run', 'survey_role'], name='idx_survey_files_run_role'),
            models.Index(fields=['reference_for_survey'], name='idx_survey_files_ref_for'),
        ]

    def __str__(self):
        return f"{self.file_name} ({self.processing_status})"
