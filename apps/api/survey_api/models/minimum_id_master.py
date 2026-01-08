"""
MinimumIdMaster Model
Stores master data for minimum ID values
"""
from django.db import models


class MinimumIdMaster(models.Model):
    minimum_id_name = models.CharField(
        max_length=50,
        # REMOVE unique=True here
        help_text='Minimum ID value (e.g., "6.000")'
    )
    size_numeric = models.DecimalField(
        max_digits=10, 
        decimal_places=4
    )
    survey_run_in = models.ForeignKey(
        'SurveyRunInMaster',
        on_delete=models.CASCADE,
        related_name='minimum_ids'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'minimum_id_master'
        ordering = ['size_numeric']
        # This ensures you can't add the SAME ID twice for the SAME casing
        constraints = [
            models.UniqueConstraint(
                fields=['minimum_id_name', 'survey_run_in'], 
                name='unique_id_per_runin'
            )
        ]

    def __str__(self):
        return f"{self.minimum_id_name} (for {self.survey_run_in.run_in_name})"
