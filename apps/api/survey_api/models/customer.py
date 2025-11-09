"""
Customer master data model.

Represents customers who commission survey jobs.
"""
import uuid
from django.db import models
from django.conf import settings


class Customer(models.Model):
    """
    Customer master data model.

    Stores information about customers who commission survey jobs.
    A customer can have multiple clients.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    customer_name = models.CharField(
        max_length=255,
        unique=True,
        help_text='Unique customer name'
    )

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_customers'
    )

    class Meta:
        db_table = 'customers'
        ordering = ['customer_name']
        indexes = [
            models.Index(fields=['customer_name'], name='idx_customers_name'),
        ]

    def __str__(self):
        """String representation of the customer."""
        return self.customer_name
