"""
Location model for storing geographic positioning data for runs and wells.
"""
import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError


class Location(models.Model):
    """
    Location model storing geographic coordinates and calculated values.

    A location can be associated with either a Run or a Well (but not both).
    Calculated fields (easting, northing, grid_correction, g_t, w_t) are
    computed automatically from input coordinates.
    """

    # Choices for north_reference field
    NORTH_REFERENCE_CHOICES = [
        ('True North', 'True North'),
        ('Grid North', 'Grid North'),
        ('Magnetic North', 'Magnetic North'),
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
        related_name='location'
    )

    well = models.OneToOneField(
        'Well',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='location'
    )

    # Input coordinates
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        validators=[
            MinValueValidator(Decimal('-90.0')),
            MaxValueValidator(Decimal('90.0'))
        ],
        help_text='Latitude in decimal degrees (-90 to 90)'
    )

    longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        validators=[
            MinValueValidator(Decimal('-180.0')),
            MaxValueValidator(Decimal('180.0'))
        ],
        help_text='Longitude in decimal degrees (-180 to 180)'
    )

    # Calculated UTM coordinates
    easting = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        null=True,
        blank=True,
        help_text='UTM Easting coordinate (calculated)'
    )

    northing = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        null=True,
        blank=True,
        help_text='UTM Northing coordinate (calculated)'
    )

    # Geodetic system information
    geodetic_system = models.CharField(
        max_length=100,
        default='WGS84',
        help_text='Geodetic datum system (e.g., WGS84, NAD83)'
    )

    map_zone = models.CharField(
        max_length=50,
        default='15N',
        help_text='UTM zone or map zone identifier'
    )

    north_reference = models.CharField(
        max_length=50,
        choices=NORTH_REFERENCE_CHOICES,
        default='True North',
        help_text='Reference north type'
    )

    central_meridian = models.DecimalField(
        max_digits=8,
        decimal_places=3,
        default=Decimal('0.0'),
        help_text='Central meridian for grid calculations'
    )

    # Calculated fields
    grid_correction = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        null=True,
        blank=True,
        help_text='Grid correction angle (calculated)'
    )

    g_t = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        help_text='Grid convergence at point (calculated)'
    )

    max_g_t = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        help_text='Maximum grid convergence (calculated)'
    )

    w_t = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        help_text='Scale factor at point (calculated)'
    )

    max_w_t = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        help_text='Maximum scale factor (calculated)'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'locations'
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(run__isnull=False, well__isnull=True) |
                    models.Q(run__isnull=True, well__isnull=False)
                ),
                name='location_run_or_well_check'
            )
        ]
        indexes = [
            models.Index(fields=['run'], name='idx_locations_run_id'),
            models.Index(fields=['well'], name='idx_locations_well_id'),
        ]

    def clean(self):
        """
        Validate that exactly one of run or well is set.
        """
        if self.run and self.well:
            raise ValidationError(
                'Location must be associated with either a run or a well, not both'
            )
        if not self.run and not self.well:
            raise ValidationError(
                'Location must be associated with either a run or a well'
            )

    def save(self, *args, **kwargs):
        """
        Override save to run full_clean validation.
        """
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        """
        String representation of the location.
        """
        if self.run:
            return f"Location for Run {self.run.run_number}"
        elif self.well:
            return f"Location for Well {self.well.well_name}"
        return f"Location {self.id}"
