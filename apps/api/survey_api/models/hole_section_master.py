"""
HoleSectionMaster Model
Stores master data for hole sections with section types
"""
from django.db import models


class HoleSectionMaster(models.Model):
    """
    Master data for hole sections
    """
    SECTION_TYPE_CHOICES = [
        ('casing', 'Casing'),
        ('drill_pipe', 'Drill Pipe'),
        ('tubing', 'Tubing'),
    ]

    hole_section_name = models.CharField(
        max_length=50,
        unique=True,
        help_text='Hole section size (e.g., "12 1/4", "17 1/2")'
    )
    section_type = models.CharField(
        max_length=20,
        choices=SECTION_TYPE_CHOICES,
        help_text='Type of section: casing, drill_pipe, or tubing'
    )
    size_numeric = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        help_text='Numeric representation for size comparison (e.g., 12.25 for "12 1/4")'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'hole_section_master'
        ordering = ['size_numeric']
        verbose_name = 'Hole Section Master'
        verbose_name_plural = 'Hole Section Masters'

    def __str__(self):
        return f"{self.hole_section_name} ({self.get_section_type_display()})"
