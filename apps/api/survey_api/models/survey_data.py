"""
SurveyData model for storing parsed survey measurements from uploaded files.
"""
import uuid
import logging
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


class SurveyData(models.Model):
    """
    Store raw parsed survey measurements from uploaded Excel/CSV files.

    This model holds the actual survey data arrays (MD, Inc, Azi, etc.)
    extracted from uploaded files, along with validation status.
    """

    VALIDATION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('valid', 'Valid'),
        ('invalid', 'Invalid'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    survey_file = models.OneToOneField(
        'SurveyFile',
        on_delete=models.CASCADE,
        related_name='survey_data'
    )

    md_data = models.JSONField(
        help_text="Measured Depth array"
    )

    inc_data = models.JSONField(
        help_text="Inclination array (degrees)"
    )

    azi_data = models.JSONField(
        help_text="Azimuth array (degrees)"
    )

    wt_data = models.JSONField(
        null=True,
        blank=True,
        help_text="w(t) for GTL surveys"
    )

    gt_data = models.JSONField(
        null=True,
        blank=True,
        help_text="g(t) for GTL surveys"
    )

    row_count = models.IntegerField(
        help_text="Number of survey stations"
    )

    validation_status = models.CharField(
        max_length=50,
        choices=VALIDATION_STATUS_CHOICES,
        default='pending'
    )

    validation_errors = models.JSONField(
        null=True,
        blank=True,
        help_text="Array of validation error messages"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'survey_data'
        verbose_name = 'Survey Data'
        verbose_name_plural = 'Survey Data'
        indexes = [
            models.Index(fields=['survey_file'], name='idx_survey_data_file_id'),
            models.Index(fields=['validation_status'], name='idx_survey_data_validation'),
        ]

    def __str__(self):
        return f"SurveyData for {self.survey_file.file_name} ({self.validation_status})"


@receiver(post_save, sender=SurveyData)
def trigger_calculation(sender, instance, created, **kwargs):
    """
    Automatically trigger calculation after SurveyData is created.

    Triggers if:
    - SurveyData was just created (not updated)
    - Has valid MD, Inc, Azi data
    - validation_status is NOT 'pending_qa' (GTL surveys awaiting QA approval)

    Note: validation_status may be 'invalid' due to non-blocking warnings,
    but calculations should still be triggered as long as core data exists.

    IMPORTANT: For GTL surveys, SurveyData is created during upload with validation_status='pending_qa'.
    Calculation should NOT run at this stage because:
    1. Data doesn't include tie-on point yet (only raw survey stations)
    2. QA approval may filter out some stations
    3. Final calculation happens after QA approval with complete data (including tie-on)

    DECISION: Using synchronous processing for Epic 4
    Benchmark shows < 3 seconds for 10,000 points
    If performance degrades, consider Celery in future epic
    """
    if created:
        # Skip calculation for GTL surveys pending QA approval
        if instance.validation_status == 'pending_qa':
            logger.info(f"Skipping auto-calculation for SurveyData {instance.id} (pending_qa status - GTL awaiting approval)")
            return

        from survey_api.services.survey_calculation_service import SurveyCalculationService

        try:
            logger.info(f"Auto-triggering calculation for SurveyData: {instance.id}")
            # Trigger calculation (synchronous for Epic 4)
            SurveyCalculationService.calculate(str(instance.id))
            logger.info(f"Calculation completed for SurveyData: {instance.id}")
        except Exception as e:
            logger.error(f"Auto-calculation failed for SurveyData {instance.id}: {str(e)}")
            # Don't raise - allow upload to succeed even if calculation fails
