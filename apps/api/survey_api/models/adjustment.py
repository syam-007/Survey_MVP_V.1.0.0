"""
Curve Adjustment Model

Stores adjustments applied to comparative surveys for curve matching.
Supports undo/redo history and recalculation of adjusted surveys.
"""
import uuid
from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.contrib.auth import get_user_model

User = get_user_model()


class CurveAdjustment(models.Model):
    """
    Stores curve adjustment data for a comparison.

    Allows users to apply offsets to comparative survey coordinates
    within specified MD ranges, with full undo/redo history.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Link to comparison result
    comparison = models.ForeignKey(
        'ComparisonResult',
        on_delete=models.CASCADE,
        related_name='adjustments'
    )

    # MD range for adjustment
    md_start = models.FloatField(
        help_text="Starting measured depth for offset application"
    )
    md_end = models.FloatField(
        help_text="Ending measured depth for offset application"
    )

    # Offset values
    x_offset = models.FloatField(
        default=0.0,
        help_text="Easting (X) offset in meters"
    )
    y_offset = models.FloatField(
        default=0.0,
        help_text="Northing (Y) offset in meters"
    )
    z_offset = models.FloatField(
        default=0.0,
        help_text="TVD (Z) offset in meters"
    )

    # Adjusted survey coordinates (after all cumulative adjustments)
    md_data = ArrayField(
        models.FloatField(),
        help_text="Measured depth array"
    )
    north_adjusted = ArrayField(
        models.FloatField(),
        help_text="Adjusted northing coordinates"
    )
    east_adjusted = ArrayField(
        models.FloatField(),
        help_text="Adjusted easting coordinates"
    )
    tvd_adjusted = ArrayField(
        models.FloatField(),
        help_text="Adjusted TVD coordinates"
    )

    # Recalculated survey data (optional)
    inc_recalculated = ArrayField(
        models.FloatField(),
        null=True,
        blank=True,
        help_text="Recalculated inclination from adjusted path"
    )
    azi_recalculated = ArrayField(
        models.FloatField(),
        null=True,
        blank=True,
        help_text="Recalculated azimuth from adjusted path"
    )

    # History tracking for undo/redo
    adjustment_sequence = models.IntegerField(
        default=0,
        help_text="Sequence number for undo/redo operations"
    )
    is_current = models.BooleanField(
        default=True,
        help_text="Whether this is the current active adjustment"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        db_table = 'curve_adjustments'
        ordering = ['adjustment_sequence']
        indexes = [
            models.Index(fields=['comparison', 'is_current']),
            models.Index(fields=['comparison', 'adjustment_sequence']),
        ]

    def __str__(self):
        return (f"Adjustment {self.adjustment_sequence} for Comparison {self.comparison.id}: "
                f"MD [{self.md_start:.1f}-{self.md_end:.1f}], "
                f"Offsets (X:{self.x_offset:.1f}, Y:{self.y_offset:.1f}, Z:{self.z_offset:.1f})")
