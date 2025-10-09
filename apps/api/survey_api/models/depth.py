from django.db import models
import uuid


class Depth(models.Model):
    """
    Represents depth and elevation reference data for a survey run.

    Includes elevation reference points, datum information,
    and height/elevation measurements.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.OneToOneField(
        'Run',
        on_delete=models.CASCADE,
        related_name='depth'
    )
    elevation_reference = models.CharField(max_length=100, null=True, blank=True)
    reference_datum = models.CharField(max_length=100, null=True, blank=True)
    reference_height = models.DecimalField(
        max_digits=10, decimal_places=3, null=True, blank=True
    )
    reference_elevation = models.DecimalField(
        max_digits=10, decimal_places=3, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'depths'
        verbose_name = 'Depth'
        verbose_name_plural = 'Depths'

    def __str__(self):
        return f"Depth for {self.run.run_number}"
