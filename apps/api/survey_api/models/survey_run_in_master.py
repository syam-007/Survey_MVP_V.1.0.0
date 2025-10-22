"""
SurveyRunInMaster Model
Stores master data for survey run-in values
"""
from django.db import models


class SurveyRunInMaster(models.Model):
    """
    Master data for survey run-in values
    """
    RUN_IN_TYPE_CHOICES = [
        ('casing', 'Casing'),
        ('drill_pipe', 'Drill Pipe'),
        ('tubing', 'Tubing'),
    ]

    run_in_name = models.CharField(
        max_length=50,
        unique=True,
        help_text='Survey run-in value (e.g., "7\\" Casing", "4 1/2\\" Drillpipe")'
    )
    run_in_type = models.CharField(
        max_length=20,
        choices=RUN_IN_TYPE_CHOICES,
        help_text='Type: casing, drill_pipe, or tubing'
    )
    size_numeric = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        help_text='Numeric representation for size comparison (e.g., 7.0 for "7\\" Casing")'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'survey_run_in_master'
        ordering = ['run_in_type', 'size_numeric']
        verbose_name = 'Survey Run-In Master'
        verbose_name_plural = 'Survey Run-In Masters'

    def __str__(self):
        return self.run_in_name
