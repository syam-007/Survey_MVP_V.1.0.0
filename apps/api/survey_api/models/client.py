"""
Client master data model.

Represents clients in survey operations.
"""
import uuid
from django.db import models
from django.conf import settings


class Client(models.Model):
    """
    Client master data model.

    Stores information about clients.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    client_name = models.CharField(
        max_length=255,
        unique=True,
        help_text='Client name'
    )

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_clients'
    )

    class Meta:
        db_table = 'clients'
        ordering = ['client_name']
        indexes = [
            models.Index(fields=['client_name'], name='idx_clients_name'),
        ]

    def __str__(self):
        """String representation of the client."""
        return self.client_name
