"""
TieOn model for storing survey starting point and hole section details.
"""
import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError


class TieOn(models.Model):
    """
    TieOn model storing survey starting point information and hole section details.
    A tie-on is associated with exactly one Run (OneToOne relationship).
    """

    # Hole Section choices
    HOLE_SECTION_CHOICES = [
        ('Surface Casing', 'Surface Casing'),
        ('Intermediate Casing', 'Intermediate Casing'),
        ('Production Casing', 'Production Casing'),
        ('Liner', 'Liner'),
        ('Open Hole', 'Open Hole'),
    ]

    # Survey Tool Type choices
    SURVEY_TOOL_TYPE_CHOICES = [
        ('MWD', 'MWD'),
        ('LWD', 'LWD'),
        ('Wireline Gyro', 'Wireline Gyro'),
        ('Steering Tool', 'Steering Tool'),
        ('Other', 'Other'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    run = models.OneToOneField(
        'Run',
        on_delete=models.CASCADE,
        related_name='tieon'
    )

    # Survey starting point data
    md = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        help_text='Measured Depth'
    )

    inc = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal('0.00')),
            MaxValueValidator(Decimal('180.00'))
        ],
        help_text='Inclination (0-180 degrees)'
    )

    azi = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal('0.00')),
            MaxValueValidator(Decimal('360.00'))
        ],
        help_text='Azimuth (0-360 degrees)'
    )

    tvd = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        help_text='True Vertical Depth'
    )

    latitude = models.DecimalField(
        max_digits=12,
        decimal_places=6,
        help_text='Latitude coordinate (+N/-S)'
    )

    departure = models.DecimalField(
        max_digits=12,
        decimal_places=6,
        help_text='Departure coordinate (+E/-W)'
    )

    well_type = models.CharField(
        max_length=100,
        help_text='Type of well'
    )

    # Survey details
    hole_section = models.CharField(
        max_length=100,
        choices=HOLE_SECTION_CHOICES,
        help_text='Hole section type'
    )

    casing_selected = models.BooleanField(
        default=False,
        help_text='Casing checkbox selection'
    )

    drillpipe_selected = models.BooleanField(
        default=False,
        help_text='Drillpipe checkbox selection'
    )

    survey_tool_type = models.CharField(
        max_length=100,
        choices=SURVEY_TOOL_TYPE_CHOICES,
        help_text='Survey tool type'
    )

    # Survey interval
    survey_interval_from = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        help_text='Survey interval from depth'
    )

    survey_interval_to = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        help_text='Survey interval to depth'
    )

    survey_interval_length = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        help_text='Auto-calculated survey interval length (to - from)'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tieons'
        indexes = [
            models.Index(fields=['run'], name='idx_tieons_run_id'),
        ]

    def __str__(self):
        return f'TieOn for Run {self.run.run_number} - MD: {self.md}'

    def clean(self):
        """
        Validate business rules.
        """
        super().clean()

        # Validate survey interval: from < to
        if self.survey_interval_from and self.survey_interval_to:
            if self.survey_interval_from >= self.survey_interval_to:
                raise ValidationError({
                    'survey_interval_from': "Survey interval 'from' must be less than 'to'"
                })

    def save(self, *args, **kwargs):
        """
        Auto-calculate survey_interval_length before saving.
        """
        # Calculate survey interval length
        if self.survey_interval_from and self.survey_interval_to:
            self.survey_interval_length = self.survey_interval_to - self.survey_interval_from

        # Run full_clean for validation
        self.full_clean()

        super().save(*args, **kwargs)
