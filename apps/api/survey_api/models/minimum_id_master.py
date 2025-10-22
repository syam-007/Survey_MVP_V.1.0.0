"""
MinimumIdMaster Model
Stores master data for minimum ID values
"""
from django.db import models


class MinimumIdMaster(models.Model):
    """
    Master data for minimum ID (Inner Diameter) values
    """
    minimum_id_name = models.CharField(
        max_length=50,
        unique=True,
        help_text='Minimum ID value (e.g., "6.5", "8.835")'
    )
    size_numeric = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        help_text='Numeric representation of the ID'
    )
    survey_run_in = models.ForeignKey(
        'SurveyRunInMaster',
        on_delete=models.CASCADE,
        related_name='minimum_ids',
        help_text='Associated survey run-in'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'minimum_id_master'
        ordering = ['size_numeric']
        verbose_name = 'Minimum ID Master'
        verbose_name_plural = 'Minimum ID Masters'

    def __str__(self):
        return f"{self.minimum_id_name} (for {self.survey_run_in.run_in_name})"
