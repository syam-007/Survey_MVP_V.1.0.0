from django.db import models
import uuid


class SurveyCalculation(models.Model):
    """
    Represents calculation results for survey data processing.

    Stores calculation type, input parameters, results, and processing status.
    Each calculation belongs to a survey file.
    """

    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    survey_file = models.ForeignKey(
        'SurveyFile',
        on_delete=models.CASCADE,
        related_name='calculations'
    )
    calculation_type = models.CharField(max_length=100)
    parameters = models.JSONField(null=True, blank=True)
    results = models.JSONField()
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='processing'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'survey_calculations'
        verbose_name = 'Survey Calculation'
        verbose_name_plural = 'Survey Calculations'
        indexes = [
            models.Index(fields=['survey_file'], name='idx_survey_calc_file_id'),
        ]

    def __str__(self):
        return f"{self.calculation_type} ({self.status})"
