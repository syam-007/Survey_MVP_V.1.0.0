"""
Service master data model.

Represents services provided in survey operations.
"""
import uuid
from django.db import models
from django.conf import settings


class Service(models.Model):
    """
    Service master data model.

    Stores information about services provided in survey operations.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    service_name = models.CharField(
        max_length=255,
        unique=True,
        help_text='Service name'
    )

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_services'
    )

    class Meta:
        db_table = 'services'
        ordering = ['service_name']
        indexes = [
            models.Index(fields=['service_name'], name='idx_services_name'),
        ]

    def __str__(self):
        """String representation of the service."""
        return self.service_name
