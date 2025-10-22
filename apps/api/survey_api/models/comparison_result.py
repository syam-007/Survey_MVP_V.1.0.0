"""
ComparisonResult Model

Stores survey comparison data including position/angular deltas and statistics.
"""
import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

from survey_api.models.run import Run
from survey_api.models.survey_data import SurveyData


class ComparisonResult(models.Model):
    """
    Stores the results of comparing two surveys (primary vs reference).

    Includes position deltas, angular deltas, and statistical summary.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relationships
    run = models.ForeignKey(
        Run,
        on_delete=models.CASCADE,
        related_name='comparisons',
        help_text="Run that contains both surveys"
    )

    primary_survey = models.ForeignKey(
        SurveyData,
        on_delete=models.CASCADE,
        related_name='comparisons_as_primary',
        help_text="Primary (comparison) survey"
    )

    reference_survey = models.ForeignKey(
        SurveyData,
        on_delete=models.CASCADE,
        related_name='comparisons_as_reference',
        help_text="Reference (baseline) survey"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comparisons',
        help_text="User who created this comparison"
    )

    # Comparison parameters
    ratio_factor = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Interpolation step size in meters (default: 5m)"
    )

    # Delta data (JSON arrays)
    md_data = models.JSONField(
        help_text="Aligned MD stations (array of floats)"
    )

    delta_x = models.JSONField(
        help_text="Easting deltas: ΔX = X_primary - X_reference (array of floats)"
    )

    delta_y = models.JSONField(
        help_text="Northing deltas: ΔY = Y_primary - Y_reference (array of floats)"
    )

    delta_z = models.JSONField(
        help_text="TVD deltas: ΔZ = TVD_primary - TVD_reference (array of floats)"
    )

    delta_horizontal = models.JSONField(
        help_text="Horizontal displacement: √(ΔX² + ΔY²) (array of floats)"
    )

    delta_total = models.JSONField(
        help_text="Total 3D displacement: √(ΔX² + ΔY² + ΔZ²) (array of floats)"
    )

    delta_inc = models.JSONField(
        help_text="Inclination deltas: ΔInc = Inc_primary - Inc_reference (array of floats)"
    )

    delta_azi = models.JSONField(
        help_text="Azimuth deltas with wraparound handling (array of floats)"
    )

    # Reference survey full data
    reference_inc = models.JSONField(
        help_text="Reference survey inclination values (array of floats)",
        null=True,
        blank=True
    )
    reference_azi = models.JSONField(
        help_text="Reference survey azimuth values (array of floats)",
        null=True,
        blank=True
    )
    reference_northing = models.JSONField(
        help_text="Reference survey northing coordinates (array of floats)",
        null=True,
        blank=True
    )
    reference_easting = models.JSONField(
        help_text="Reference survey easting coordinates (array of floats)",
        null=True,
        blank=True
    )
    reference_tvd = models.JSONField(
        help_text="Reference survey TVD values (array of floats)",
        null=True,
        blank=True
    )

    # Comparison survey full data
    comparison_inc = models.JSONField(
        help_text="Comparison survey inclination values (array of floats)",
        null=True,
        blank=True
    )
    comparison_azi = models.JSONField(
        help_text="Comparison survey azimuth values (array of floats)",
        null=True,
        blank=True
    )
    comparison_northing = models.JSONField(
        help_text="Comparison survey northing coordinates (array of floats)",
        null=True,
        blank=True
    )
    comparison_easting = models.JSONField(
        help_text="Comparison survey easting coordinates (array of floats)",
        null=True,
        blank=True
    )
    comparison_tvd = models.JSONField(
        help_text="Comparison survey TVD values (array of floats)",
        null=True,
        blank=True
    )

    # Statistical summary
    statistics = models.JSONField(
        help_text="Statistical summary of deltas (max, avg, std, etc.)"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comparison_results'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['run'], name='idx_comparison_run'),
            models.Index(fields=['primary_survey'], name='idx_comparison_primary'),
            models.Index(fields=['reference_survey'], name='idx_comparison_ref'),
            models.Index(fields=['created_by'], name='idx_comparison_user'),
        ]
        unique_together = [('primary_survey', 'reference_survey', 'ratio_factor')]

    def __str__(self):
        return (
            f"Comparison {self.id}: "
            f"Primary {self.primary_survey_id} vs Reference {self.reference_survey_id}"
        )

    def get_max_deviation(self) -> float:
        """Get maximum total deviation."""
        return self.statistics.get('max_delta_total', 0.0)

    def get_deviation_at_md(self, md: float) -> dict:
        """
        Get deviation values at specific MD.

        Args:
            md: Measured depth

        Returns:
            Dict with delta values at nearest MD station
        """
        import numpy as np

        md_array = np.array(self.md_data)

        # Find nearest MD station
        idx = np.argmin(np.abs(md_array - md))

        return {
            'md': self.md_data[idx],
            'delta_x': self.delta_x[idx],
            'delta_y': self.delta_y[idx],
            'delta_z': self.delta_z[idx],
            'delta_horizontal': self.delta_horizontal[idx],
            'delta_total': self.delta_total[idx],
            'delta_inc': self.delta_inc[idx],
            'delta_azi': self.delta_azi[idx],
        }
