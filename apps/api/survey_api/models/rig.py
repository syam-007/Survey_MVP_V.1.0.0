"""
Rig master data model.

Represents drilling rigs used in survey operations.
"""
import uuid
from django.db import models
from django.conf import settings


class Rig(models.Model):
    """
    Rig master data model.

    Stores information about drilling rigs used in survey operations.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    rig_id = models.CharField(
        max_length=100,
        help_text='Rig identifier'
    )

    rig_number = models.CharField(
        max_length=100,
        unique=True,
        help_text='Unique rig number'
    )

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_rigs'
    )

    class Meta:
        db_table = 'rigs'
        ordering = ['rig_id']
        indexes = [
            models.Index(fields=['rig_id'], name='idx_rigs_id'),
            models.Index(fields=['rig_number'], name='idx_rigs_number'),
        ]

    def __str__(self):
        """String representation of the rig."""
        return f"{self.rig_id} - {self.rig_number}"
