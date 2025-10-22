"""
CalculatedSurvey Model

Stores welleng calculation results including positions and trajectory metrics.
"""
import uuid
from django.db import models


class CalculatedSurvey(models.Model):
    """
    Stores calculated survey trajectory results from welleng library.

    Contains position data (NEV coordinates) and trajectory metrics (DLS, build rate, turn rate).
    Linked to SurveyData via OneToOne relationship for calculation results.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    survey_data = models.OneToOneField(
        'SurveyData',
        on_delete=models.CASCADE,
        related_name='calculated_survey',
        help_text="Link to source survey data"
    )

    # Calculated position arrays (JSON format for efficiency)
    easting = models.JSONField(
        help_text="X coordinate / Easting (meters)"
    )

    northing = models.JSONField(
        help_text="Y coordinate / Northing (meters)"
    )

    tvd = models.JSONField(
        help_text="True Vertical Depth (meters)"
    )

    # Calculated trajectory metrics
    dls = models.JSONField(
        null=True,
        blank=True,
        help_text="Dog Leg Severity (degrees/30m)"
    )

    build_rate = models.JSONField(
        null=True,
        blank=True,
        help_text="Build Rate (degrees/30m)"
    )

    turn_rate = models.JSONField(
        null=True,
        blank=True,
        help_text="Turn Rate (degrees/30m)"
    )

    # Vertical Section and Closure calculations
    vertical_section = models.JSONField(
        null=True,
        blank=True,
        help_text="Vertical Section coordinate (meters)"
    )

    closure_distance = models.JSONField(
        null=True,
        blank=True,
        help_text="Closure Distance from first point (meters)"
    )

    closure_direction = models.JSONField(
        null=True,
        blank=True,
        help_text="Closure Direction from first point (degrees)"
    )

    vertical_section_azimuth = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Azimuth for vertical section calculation (degrees)"
    )

    # Calculation metadata
    calculation_status = models.CharField(
        max_length=50,
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('calculated', 'Calculated'),
            ('error', 'Error'),
        ],
        default='pending',
        help_text="Current status of calculation"
    )

    calculation_duration = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Calculation time in seconds"
    )

    error_message = models.TextField(
        null=True,
        blank=True,
        help_text="Error message if calculation failed"
    )

    # Context used for calculation (stored for audit trail)
    calculation_context = models.JSONField(
        help_text="Location, Depth, TieOn data used for calculation"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'calculated_surveys'
        indexes = [
            models.Index(fields=['survey_data'], name='idx_calc_survey_data_id'),
            models.Index(fields=['calculation_status'], name='idx_calc_survey_status'),
        ]
        verbose_name = 'Calculated Survey'
        verbose_name_plural = 'Calculated Surveys'

    def __str__(self):
        return f"CalculatedSurvey({self.survey_data.survey_file.run.run_number}) - {self.calculation_status}"
