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

    # Input coordinates (Decimal Degrees)
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        validators=[
            MinValueValidator(Decimal('-90.0')),
            MaxValueValidator(Decimal('90.0'))
        ],
        null=True,
        blank=True,
        help_text='Latitude in decimal degrees (-90 to 90)'
    )

    longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        validators=[
            MinValueValidator(Decimal('-180.0')),
            MaxValueValidator(Decimal('180.0'))
        ],
        null=True,
        blank=True,
        help_text='Longitude in decimal degrees (-180 to 180)'
    )

    # Latitude in DMS (Degrees, Minutes, Seconds)
    latitude_degrees = models.IntegerField(
        null=True,
        blank=True,
        validators=[
            MinValueValidator(-90),
            MaxValueValidator(90)
        ],
        help_text='Latitude degrees component (-90 to 90)'
    )

    latitude_minutes = models.IntegerField(
        null=True,
        blank=True,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(59)
        ],
        help_text='Latitude minutes component (0 to 59)'
    )

    latitude_seconds = models.DecimalField(
        max_digits=5,
        decimal_places=3,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(Decimal('0.0')),
            MaxValueValidator(Decimal('59.999'))
        ],
        help_text='Latitude seconds component (0.0 to 59.999)'
    )

    # Longitude in DMS (Degrees, Minutes, Seconds)
    longitude_degrees = models.IntegerField(
        null=True,
        blank=True,
        validators=[
            MinValueValidator(-180),
            MaxValueValidator(180)
        ],
        help_text='Longitude degrees component (-180 to 180)'
    )

    longitude_minutes = models.IntegerField(
        null=True,
        blank=True,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(59)
        ],
        help_text='Longitude minutes component (0 to 59)'
    )

    longitude_seconds = models.DecimalField(
        max_digits=5,
        decimal_places=3,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(Decimal('0.0')),
            MaxValueValidator(Decimal('59.999'))
        ],
        help_text='Longitude seconds component (0.0 to 59.999)'
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
    geodetic_datum = models.CharField(
        max_length=100,
        default='PSD 93',
        help_text='Geodetic datum (e.g., PSD 93, WGS84, NAD83)'
    )

    geodetic_system = models.CharField(
        max_length=100,
        default='Universal Transverse Mercator',
        help_text='Geodetic system (e.g., Universal Transverse Mercator)'
    )

    map_zone = models.CharField(
        max_length=50,
        default='Zone 40N(54E to 60E)',
        help_text='UTM zone or map zone identifier'
    )

    north_reference = models.CharField(
        max_length=50,
        choices=NORTH_REFERENCE_CHOICES,
        default='Grid North',
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

    min_g_t = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        help_text='Minimum grid convergence (calculated)'
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

    min_w_t = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        help_text='Minimum scale factor (calculated)'
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

    @property
    def get_north_coordinate(self):
        """
        Calculate north coordinate (latitude) from DMS components.
        Formula: degrees + minutes/60 + seconds/3600
        Returns 8 decimal places precision.
        """
        if self.latitude_degrees is None:
            return None

        minutes = self.latitude_minutes or 0
        seconds = float(self.latitude_seconds or 0)

        north_coordinate = self.latitude_degrees + minutes / 60 + seconds / 3600
        return float(f"{north_coordinate:.8f}")

    @property
    def get_east_coordinate(self):
        """
        Calculate east coordinate (longitude) from DMS components.
        Formula: degrees + minutes/60 + seconds/3600
        Returns 8 decimal places precision.
        """
        if self.longitude_degrees is None:
            return None

        minutes = self.longitude_minutes or 0
        seconds = float(self.longitude_seconds or 0)

        east_coordinate = self.longitude_degrees + minutes / 60 + seconds / 3600
        return float(f"{east_coordinate:.8f}")
