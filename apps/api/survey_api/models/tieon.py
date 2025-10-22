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

    # Master data relationships
    hole_section_master = models.ForeignKey(
        'HoleSectionMaster',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tieons',
        help_text='Selected hole section from master data'
    )

    survey_run_in_type = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        choices=[
            ('casing', 'Casing'),
            ('drill_pipe', 'Drill Pipe'),
            ('tubing', 'Tubing'),
        ],
        help_text='Survey run-in type (casing or drill pipe)'
    )

    survey_run_in = models.ForeignKey(
        'SurveyRunInMaster',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tieons',
        help_text='Selected survey run-in from master data'
    )

    minimum_id = models.ForeignKey(
        'MinimumIdMaster',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tieons',
        help_text='Selected minimum ID from master data'
    )

    # Expected inclination for auto-setting well type
    expected_inclination = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(Decimal('0.00')),
            MaxValueValidator(Decimal('180.00'))
        ],
        help_text='Expected inclination (<=5° = Vertical, >5° = Deviated)'
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
