"""
Depth model for storing elevation and reference datum data for runs and wells.
"""
import uuid
from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError


class Depth(models.Model):
    """
    Depth model storing elevation reference and datum information.

    A depth can be associated with either a Run or a Well (but not both).
    Used for survey calculations requiring elevation and reference data.
    """

    # Choices for elevation_reference field
    ELEVATION_REFERENCE_CHOICES = [
        ('KB', 'Kelly Bushing'),
        ('RT', 'Rotary Table'),
        ('GL', 'Ground Level'),
        ('MSL', 'Mean Sea Level'),
        ('DF', 'Derrick Floor'),
        ('RKB', 'Rotary Kelly Bushing'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    # Foreign keys - exactly one must be set
    run = models.OneToOneField(
        'Run',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='depth'
    )

    well = models.OneToOneField(
        'Well',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='depth'
    )

    # Elevation reference information
    elevation_reference = models.CharField(
        max_length=100,
        choices=ELEVATION_REFERENCE_CHOICES,
        default='KB',
        help_text='Elevation reference point (KB, RT, GL, MSL, etc.)'
    )

    reference_datum = models.CharField(
        max_length=100,
        default='WGS84',
        help_text='Reference datum (e.g., WGS84, NAVD88)'
    )

    reference_height = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=Decimal('0.000'),
        help_text='Reference height in feet or meters'
    )

    reference_elevation = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=Decimal('0.000'),
        help_text='Reference elevation in feet or meters'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'depths'
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(run__isnull=False, well__isnull=True) |
                    models.Q(run__isnull=True, well__isnull=False)
                ),
                name='depth_run_or_well_check'
            )
        ]
        indexes = [
            models.Index(fields=['run'], name='idx_depths_run_id'),
            models.Index(fields=['well'], name='idx_depths_well_id'),
        ]

    def clean(self):
        """
        Validate that exactly one of run or well is set.
        """
        if self.run and self.well:
            raise ValidationError(
                'Depth must be associated with either a run or a well, not both'
            )
        if not self.run and not self.well:
            raise ValidationError(
                'Depth must be associated with either a run or a well'
            )

    def save(self, *args, **kwargs):
        """
        Override save to run full_clean validation.
        """
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        """
        String representation of the depth.
        """
        if self.run:
            return f"Depth for Run {self.run.run_number}"
        elif self.well:
            return f"Depth for Well {self.well.well_name}"
        return f"Depth {self.id}"
