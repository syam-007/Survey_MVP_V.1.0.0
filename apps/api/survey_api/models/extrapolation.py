"""
Extrapolation Model

Stores extrapolated survey data beyond the last measured point.
"""
from django.db import models
from django.conf import settings
import uuid


class Extrapolation(models.Model):
    """Model for storing extrapolated survey data."""

    EXTRAPOLATION_METHODS = [
        ('Constant', 'Constant - Use last values'),
        ('Linear Trend', 'Linear Trend - Follow trend'),
        ('Curve Fit', 'Curve Fit - Polynomial fitting'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Foreign keys
    survey_data = models.ForeignKey(
        'SurveyData',
        on_delete=models.CASCADE,
        related_name='extrapolations',
        help_text="Original survey data that was extrapolated"
    )
    run = models.ForeignKey(
        'Run',
        on_delete=models.CASCADE,
        related_name='extrapolations',
        help_text="Run this extrapolation belongs to"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='extrapolations'
    )

    # Extrapolation parameters
    extrapolation_length = models.FloatField(
        help_text="How far to extrapolate beyond last point (meters)"
    )
    extrapolation_step = models.FloatField(
        help_text="Distance between extrapolated points (meters)"
    )
    interpolation_step = models.FloatField(
        help_text="Distance between interpolated points (meters)"
    )
    extrapolation_method = models.CharField(
        max_length=20,
        choices=EXTRAPOLATION_METHODS,
        default='Constant'
    )

    # Original survey data (from SurveyData)
    original_md = models.JSONField(help_text="Original measured depths")
    original_inc = models.JSONField(help_text="Original inclinations")
    original_azi = models.JSONField(help_text="Original azimuths")
    original_north = models.JSONField(help_text="Original northing coordinates")
    original_east = models.JSONField(help_text="Original easting coordinates")
    original_tvd = models.JSONField(help_text="Original TVD")

    # Interpolated data
    interpolated_md = models.JSONField(help_text="Interpolated measured depths")
    interpolated_inc = models.JSONField(help_text="Interpolated inclinations")
    interpolated_azi = models.JSONField(help_text="Interpolated azimuths")
    interpolated_north = models.JSONField(help_text="Interpolated northing coordinates")
    interpolated_east = models.JSONField(help_text="Interpolated easting coordinates")
    interpolated_tvd = models.JSONField(help_text="Interpolated TVD")

    # Extrapolated data
    extrapolated_md = models.JSONField(help_text="Extrapolated measured depths")
    extrapolated_inc = models.JSONField(help_text="Extrapolated inclinations")
    extrapolated_azi = models.JSONField(help_text="Extrapolated azimuths")
    extrapolated_north = models.JSONField(help_text="Extrapolated northing coordinates")
    extrapolated_east = models.JSONField(help_text="Extrapolated easting coordinates")
    extrapolated_tvd = models.JSONField(help_text="Extrapolated TVD")

    # Combined data (original + interpolated + extrapolated)
    combined_md = models.JSONField(help_text="Combined measured depths")
    combined_inc = models.JSONField(help_text="Combined inclinations")
    combined_azi = models.JSONField(help_text="Combined azimuths")
    combined_north = models.JSONField(help_text="Combined northing coordinates")
    combined_east = models.JSONField(help_text="Combined easting coordinates")
    combined_tvd = models.JSONField(help_text="Combined TVD")

    # Statistics
    original_point_count = models.IntegerField(default=0)
    interpolated_point_count = models.IntegerField(default=0)
    extrapolated_point_count = models.IntegerField(default=0)
    final_md = models.FloatField(null=True, blank=True)
    final_tvd = models.FloatField(null=True, blank=True)
    final_horizontal_displacement = models.FloatField(null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'extrapolations'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['survey_data']),
            models.Index(fields=['run']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Extrapolation {self.id} - {self.extrapolation_method} ({self.extrapolation_length}m)"
