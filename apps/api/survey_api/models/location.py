from django.db import models
import uuid


class Location(models.Model):
    """
    Represents geographical location data for a survey run.

    Includes latitude/longitude coordinates, UTM coordinates,
    geodetic system information, and map references.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.OneToOneField(
        'Run',
        on_delete=models.CASCADE,
        related_name='location'
    )
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    easting = models.DecimalField(
        max_digits=12, decimal_places=3, null=True, blank=True
    )
    northing = models.DecimalField(
        max_digits=12, decimal_places=3, null=True, blank=True
    )
    geodetic_system = models.CharField(max_length=100, null=True, blank=True)
    map_zone = models.CharField(max_length=50, null=True, blank=True)
    north_reference = models.CharField(max_length=50, null=True, blank=True)
    central_meridian = models.DecimalField(
        max_digits=8, decimal_places=3, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'locations'
        verbose_name = 'Location'
        verbose_name_plural = 'Locations'

    def __str__(self):
        return f"Location for {self.run.run_number}"
