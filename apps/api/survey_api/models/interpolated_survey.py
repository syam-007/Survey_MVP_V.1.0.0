"""
InterpolatedSurvey model for storing interpolated survey data.

This model stores survey data interpolated at various resolutions,
allowing smooth trajectory visualization and analysis.
"""
import uuid
from django.db import models


class InterpolatedSurvey(models.Model):
    """
    Stores interpolated survey data at a specific resolution.

    Supports multiple interpolations per calculated survey at different resolutions.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    calculated_survey = models.ForeignKey(
        'CalculatedSurvey',
        on_delete=models.CASCADE,
        related_name='interpolations',
        help_text="Parent calculated survey"
    )

    # Interpolation configuration
    resolution = models.IntegerField(
        help_text="Interpolation resolution (spacing between points in meters)"
    )

    # Interpolated data arrays (JSON format)
    md_interpolated = models.JSONField(
        help_text="Interpolated Measured Depth (meters)"
    )
    inc_interpolated = models.JSONField(
        help_text="Interpolated Inclination (degrees)"
    )
    azi_interpolated = models.JSONField(
        help_text="Interpolated Azimuth (degrees)"
    )
    easting_interpolated = models.JSONField(
        help_text="Interpolated Easting / X coordinate (meters)"
    )
    northing_interpolated = models.JSONField(
        help_text="Interpolated Northing / Y coordinate (meters)"
    )
    tvd_interpolated = models.JSONField(
        help_text="Interpolated True Vertical Depth (meters)"
    )
    dls_interpolated = models.JSONField(
        help_text="Interpolated Dog Leg Severity (degrees/30m)"
    )
    vertical_section_interpolated = models.JSONField(
        null=True,
        blank=True,
        help_text="Interpolated Vertical Section (meters)"
    )
    closure_distance_interpolated = models.JSONField(
        null=True,
        blank=True,
        help_text="Interpolated Closure Distance from first point (meters)"
    )
    closure_direction_interpolated = models.JSONField(
        null=True,
        blank=True,
        help_text="Interpolated Closure Direction from first point (degrees)"
    )

    # Interpolation metadata
    interpolation_status = models.CharField(
        max_length=50,
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('error', 'Error'),
        ],
        default='pending',
        help_text="Current interpolation status"
    )
    point_count = models.IntegerField(
        help_text="Number of interpolated points generated"
    )
    interpolation_duration = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text="Interpolation processing time in seconds"
    )
    error_message = models.TextField(
        null=True,
        blank=True,
        help_text="Error message if interpolation failed"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'interpolated_surveys'
        unique_together = [['calculated_survey', 'resolution']]
        indexes = [
            models.Index(fields=['calculated_survey'], name='idx_interp_survey_calc_id'),
            models.Index(fields=['resolution'], name='idx_interp_survey_resolution'),
            models.Index(fields=['interpolation_status'], name='idx_interp_survey_status'),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"InterpolatedSurvey {self.id} (resolution={self.resolution}m, points={self.point_count})"

    def __repr__(self):
        return (
            f"<InterpolatedSurvey id={self.id} "
            f"calculated_survey={self.calculated_survey_id} "
            f"resolution={self.resolution} "
            f"status={self.interpolation_status}>"
        )
