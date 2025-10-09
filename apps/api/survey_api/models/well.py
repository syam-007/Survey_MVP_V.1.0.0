from django.db import models
import uuid


class Well(models.Model):
    """
    Represents a well with location and depth information.

    Wells can have multiple survey runs associated with them.
    """

    WELL_TYPE_CHOICES = [
        ('Oil', 'Oil'),
        ('Gas', 'Gas'),
        ('Water', 'Water'),
        ('Other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    well_name = models.CharField(max_length=255, unique=True)
    well_type = models.CharField(max_length=50, choices=WELL_TYPE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'wells'
        verbose_name = 'Well'
        verbose_name_plural = 'Wells'

    def __str__(self):
        return f"{self.well_name} ({self.well_type})"
