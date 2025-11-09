"""
Well master data model.

Represents wells used in survey operations.
"""
import uuid
from django.db import models
from django.conf import settings


class Well(models.Model):
    """
    Well master data model.

    Represents wells where survey operations are conducted.
    Multiple jobs can reference the same well.
    Location is associated via OneToOne relationship (defined in Location model).
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    well_name = models.CharField(
        max_length=255,
        unique=True,
        help_text='Unique well name'
    )

    well_id = models.CharField(
        max_length=100,
        unique=True,
        help_text='Official well identifier/API number'
    )

    # Note: Location is linked via reverse OneToOne relationship
    # Access via well.location (defined in Location model)

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_wells'
    )

    class Meta:
        db_table = 'wells'
        ordering = ['well_name']
        verbose_name = 'Well'
        verbose_name_plural = 'Wells'
        indexes = [
            models.Index(fields=['well_name'], name='idx_wells_name'),
            models.Index(fields=['well_id'], name='idx_wells_well_id'),
        ]

    def __str__(self):
        """String representation of the well."""
        return f"{self.well_id} - {self.well_name}"

    @property
    def has_location(self):
        """Check if well has location data."""
        return hasattr(self, 'location') and self.location is not None
