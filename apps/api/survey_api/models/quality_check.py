"""
Quality Check model for GTL survey QA.
"""
import uuid
from django.db import models
from django.contrib.postgres.fields import ArrayField


class QualityCheck(models.Model):
    """
    Quality Check model for storing GTL survey QA results.

    This model stores temporary QA results before the user approves
    and saves the survey data to the database.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    run = models.ForeignKey(
        'Run',
        on_delete=models.CASCADE,
        related_name='quality_checks'
    )

    survey_data = models.OneToOneField(
        'SurveyData',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quality_check',
        help_text='Link to approved SurveyData (set after QA approval)'
    )

    file_name = models.CharField(
        max_length=255,
        help_text='Original uploaded file name'
    )

    # QA Summary
    total_g_t_difference = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Total G(t) difference'
    )

    total_w_t_difference = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Total W(t) difference'
    )

    total_g_t_difference_pass = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Total G(t) difference for PASS stations'
    )

    total_w_t_difference_pass = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Total W(t) difference for PASS stations'
    )

    g_t_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text='G(t) quality percentage'
    )

    w_t_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text='W(t) quality percentage'
    )

    pass_count = models.IntegerField(
        help_text='Number of stations with PASS status'
    )

    remove_count = models.IntegerField(
        help_text='Number of stations with REMOVE status'
    )

    # Delta scoring fields (stored only after QA approval)
    delta_wt_score = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        null=True,
        blank=True,
        help_text='Delta W(t) score (normalized 0-1) - saved after approval'
    )

    delta_wt_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Delta W(t) percentage (0-100) - saved after approval'
    )

    delta_gt_score = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        null=True,
        blank=True,
        help_text='Delta G(t) score (normalized 0-1) - saved after approval'
    )

    delta_gt_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Delta G(t) percentage (0-100) - saved after approval'
    )

    w_t_score_points = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Total W(t) score points earned - saved after approval'
    )

    g_t_score_points = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Total G(t) score points earned - saved after approval'
    )

    max_score = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Maximum possible score (total_rows × 1.5) - saved after approval'
    )

    total_rows = models.IntegerField(
        null=True,
        blank=True,
        help_text='Total number of rows in the survey - saved after approval'
    )

    # Raw data arrays
    md_data = ArrayField(
        models.FloatField(),
        help_text='Measured Depth data'
    )

    inc_data = ArrayField(
        models.FloatField(),
        help_text='Inclination data'
    )

    azi_data = ArrayField(
        models.FloatField(),
        help_text='Azimuth data'
    )

    gt_data = ArrayField(
        models.FloatField(),
        help_text='G(t) data from file'
    )

    wt_data = ArrayField(
        models.FloatField(),
        help_text='W(t) data from file'
    )

    # QA results arrays
    g_t_difference_data = ArrayField(
        models.FloatField(),
        help_text='G(t) difference for each station'
    )

    w_t_difference_data = ArrayField(
        models.FloatField(),
        help_text='W(t) difference for each station'
    )

    g_t_status_data = ArrayField(
        models.CharField(max_length=10),
        help_text='G(t) status for each station (high/good/low/n/c)'
    )

    w_t_status_data = ArrayField(
        models.CharField(max_length=10),
        help_text='W(t) status for each station (high/good/low/n/c)'
    )

    overall_status_data = ArrayField(
        models.CharField(max_length=10),
        help_text='Overall status for each station (PASS/REMOVE)'
    )

    # Metadata
    status = models.CharField(
        max_length=20,
        default='pending',
        choices=[
            ('pending', 'Pending Review'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
        ],
        help_text='QA review status'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'quality_checks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['run', 'status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"QA Check {self.id} - {self.file_name} ({self.status})"
