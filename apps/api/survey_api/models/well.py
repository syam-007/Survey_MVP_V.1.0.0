from django.db import models
import uuid


class Well(models.Model):
    """
    Represents a well with location and depth information.

    Wells can have multiple survey runs associated with them.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    well_id = models.CharField(max_length=100, unique=True, null=True, blank=True, help_text='Unique well identifier')
    well_name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'wells'
        verbose_name = 'Well'
        verbose_name_plural = 'Wells'

    def __str__(self):
        return f"{self.well_id} - {self.well_name}"
