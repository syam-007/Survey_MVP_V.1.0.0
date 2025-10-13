"""
Tests for TieOn model.
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from survey_api.models import Well, Run, TieOn
from decimal import Decimal

User = get_user_model()


class TieOnModelTest(TestCase):
    """Test suite for TieOn model."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )

        self.well = Well.objects.create(
            well_name='TEST-WELL-001',
            well_type='Oil'
        )

        self.run = Run.objects.create(
            run_number='RUN-001',
            run_name='Test Run',
            run_type='GTL',
            well=self.well,
            user=self.user
        )

    def test_tieon_creation(self):
        """Test successful tie-on creation with valid data."""
        tieon = TieOn.objects.create(
            run=self.run,
            md=Decimal('1000.500'),
            inc=Decimal('45.25'),
            azi=Decimal('180.75'),
            tvd=Decimal('950.300'),
            latitude=Decimal('29.760427'),
            departure=Decimal('-95.369803'),
            well_type='Deviated',
            hole_section='Production Casing',
            casing_selected=True,
            drillpipe_selected=False,
            survey_tool_type='MWD',
            survey_interval_from=Decimal('1000.000'),
            survey_interval_to=Decimal('5000.000')
        )

        self.assertEqual(tieon.md, Decimal('1000.500'))
        self.assertEqual(tieon.inc, Decimal('45.25'))
        self.assertEqual(tieon.azi, Decimal('180.75'))
        self.assertEqual(tieon.well_type, 'Deviated')
        self.assertEqual(tieon.hole_section, 'Production Casing')
        self.assertEqual(tieon.survey_tool_type, 'MWD')
        self.assertTrue(tieon.casing_selected)
        self.assertFalse(tieon.drillpipe_selected)
        self.assertIsNotNone(tieon.id)
        self.assertIsNotNone(tieon.created_at)
        self.assertIsNotNone(tieon.updated_at)

    def test_survey_interval_length_calculation(self):
        """Test survey_interval_length is auto-calculated."""
        tieon = TieOn.objects.create(
            run=self.run,
            md=Decimal('1000.000'),
            inc=Decimal('0.00'),
            azi=Decimal('0.00'),
            tvd=Decimal('1000.000'),
            latitude=Decimal('0.000000'),
            departure=Decimal('0.000000'),
            well_type='Vertical',
            hole_section='Surface Casing',
            survey_tool_type='MWD',
            survey_interval_from=Decimal('1000.000'),
            survey_interval_to=Decimal('5000.000')
        )

        self.assertEqual(tieon.survey_interval_length, Decimal('4000.000'))

    def test_inclination_range_validation_min(self):
        """Test inclination validation fails for values < 0."""
        tieon = TieOn(
            run=self.run,
            md=Decimal('1000.000'),
            inc=Decimal('-1.00'),  # Invalid
            azi=Decimal('0.00'),
            tvd=Decimal('1000.000'),
            latitude=Decimal('0.000000'),
            departure=Decimal('0.000000'),
            well_type='Vertical',
            hole_section='Surface Casing',
            survey_tool_type='MWD',
            survey_interval_from=Decimal('1000.000'),
            survey_interval_to=Decimal('5000.000')
        )

        with self.assertRaises(ValidationError):
            tieon.save()

    def test_inclination_range_validation_max(self):
        """Test inclination validation fails for values > 180."""
        tieon = TieOn(
            run=self.run,
            md=Decimal('1000.000'),
            inc=Decimal('181.00'),  # Invalid
            azi=Decimal('0.00'),
            tvd=Decimal('1000.000'),
            latitude=Decimal('0.000000'),
            departure=Decimal('0.000000'),
            well_type='Vertical',
            hole_section='Surface Casing',
            survey_tool_type='MWD',
            survey_interval_from=Decimal('1000.000'),
            survey_interval_to=Decimal('5000.000')
        )

        with self.assertRaises(ValidationError):
            tieon.save()

    def test_azimuth_range_validation_min(self):
        """Test azimuth validation fails for values < 0."""
        tieon = TieOn(
            run=self.run,
            md=Decimal('1000.000'),
            inc=Decimal('0.00'),
            azi=Decimal('-1.00'),  # Invalid
            tvd=Decimal('1000.000'),
            latitude=Decimal('0.000000'),
            departure=Decimal('0.000000'),
            well_type='Vertical',
            hole_section='Surface Casing',
            survey_tool_type='MWD',
            survey_interval_from=Decimal('1000.000'),
            survey_interval_to=Decimal('5000.000')
        )

        with self.assertRaises(ValidationError):
            tieon.save()

    def test_azimuth_range_validation_max(self):
        """Test azimuth validation fails for values >= 360."""
        tieon = TieOn(
            run=self.run,
            md=Decimal('1000.000'),
            inc=Decimal('0.00'),
            azi=Decimal('361.00'),  # Invalid
            tvd=Decimal('1000.000'),
            latitude=Decimal('0.000000'),
            departure=Decimal('0.000000'),
            well_type='Vertical',
            hole_section='Surface Casing',
            survey_tool_type='MWD',
            survey_interval_from=Decimal('1000.000'),
            survey_interval_to=Decimal('5000.000')
        )

        with self.assertRaises(ValidationError):
            tieon.save()

    def test_survey_interval_validation(self):
        """Test survey interval validation: from < to."""
        tieon = TieOn(
            run=self.run,
            md=Decimal('1000.000'),
            inc=Decimal('0.00'),
            azi=Decimal('0.00'),
            tvd=Decimal('1000.000'),
            latitude=Decimal('0.000000'),
            departure=Decimal('0.000000'),
            well_type='Vertical',
            hole_section='Surface Casing',
            survey_tool_type='MWD',
            survey_interval_from=Decimal('5000.000'),  # Greater than 'to'
            survey_interval_to=Decimal('1000.000')
        )

        with self.assertRaises(ValidationError) as context:
            tieon.save()

        self.assertIn('survey_interval_from', str(context.exception))

    def test_cascade_delete_on_run_delete(self):
        """Test tie-on is deleted when run is deleted."""
        tieon = TieOn.objects.create(
            run=self.run,
            md=Decimal('1000.000'),
            inc=Decimal('0.00'),
            azi=Decimal('0.00'),
            tvd=Decimal('1000.000'),
            latitude=Decimal('0.000000'),
            departure=Decimal('0.000000'),
            well_type='Vertical',
            hole_section='Surface Casing',
            survey_tool_type='MWD',
            survey_interval_from=Decimal('1000.000'),
            survey_interval_to=Decimal('5000.000')
        )

        tieon_id = tieon.id
        self.run.delete()

        with self.assertRaises(TieOn.DoesNotExist):
            TieOn.objects.get(id=tieon_id)

    def test_onetoone_constraint(self):
        """Test OneToOne constraint: only one tie-on per run."""
        TieOn.objects.create(
            run=self.run,
            md=Decimal('1000.000'),
            inc=Decimal('0.00'),
            azi=Decimal('0.00'),
            tvd=Decimal('1000.000'),
            latitude=Decimal('0.000000'),
            departure=Decimal('0.000000'),
            well_type='Vertical',
            hole_section='Surface Casing',
            survey_tool_type='MWD',
            survey_interval_from=Decimal('1000.000'),
            survey_interval_to=Decimal('5000.000')
        )

        # Try to create a second tie-on for the same run
        with self.assertRaises(Exception):  # IntegrityError or ValidationError
            TieOn.objects.create(
                run=self.run,
                md=Decimal('2000.000'),
                inc=Decimal('10.00'),
                azi=Decimal('90.00'),
                tvd=Decimal('1900.000'),
                latitude=Decimal('1.000000'),
                departure=Decimal('1.000000'),
                well_type='Deviated',
                hole_section='Production Casing',
                survey_tool_type='LWD',
                survey_interval_from=Decimal('2000.000'),
                survey_interval_to=Decimal('6000.000')
            )

    def test_str_method(self):
        """Test __str__ method returns correct string representation."""
        tieon = TieOn.objects.create(
            run=self.run,
            md=Decimal('1000.500'),
            inc=Decimal('0.00'),
            azi=Decimal('0.00'),
            tvd=Decimal('1000.000'),
            latitude=Decimal('0.000000'),
            departure=Decimal('0.000000'),
            well_type='Vertical',
            hole_section='Surface Casing',
            survey_tool_type='MWD',
            survey_interval_from=Decimal('1000.000'),
            survey_interval_to=Decimal('5000.000')
        )

        expected = f'TieOn for Run {self.run.run_number} - MD: 1000.500'
        self.assertEqual(str(tieon), expected)

    def test_hole_section_choices(self):
        """Test hole_section accepts valid choices."""
        valid_choices = ['Surface Casing', 'Intermediate Casing', 'Production Casing', 'Liner', 'Open Hole']

        for choice in valid_choices:
            tieon = TieOn.objects.create(
                run=self.run,
                md=Decimal('1000.000'),
                inc=Decimal('0.00'),
                azi=Decimal('0.00'),
                tvd=Decimal('1000.000'),
                latitude=Decimal('0.000000'),
                departure=Decimal('0.000000'),
                well_type='Vertical',
                hole_section=choice,
                survey_tool_type='MWD',
                survey_interval_from=Decimal('1000.000'),
                survey_interval_to=Decimal('5000.000')
            )
            self.assertEqual(tieon.hole_section, choice)
            tieon.delete()

    def test_survey_tool_type_choices(self):
        """Test survey_tool_type accepts valid choices."""
        valid_choices = ['MWD', 'LWD', 'Wireline Gyro', 'Steering Tool', 'Other']

        for choice in valid_choices:
            tieon = TieOn.objects.create(
                run=self.run,
                md=Decimal('1000.000'),
                inc=Decimal('0.00'),
                azi=Decimal('0.00'),
                tvd=Decimal('1000.000'),
                latitude=Decimal('0.000000'),
                departure=Decimal('0.000000'),
                well_type='Vertical',
                hole_section='Surface Casing',
                survey_tool_type=choice,
                survey_interval_from=Decimal('1000.000'),
                survey_interval_to=Decimal('5000.000')
            )
            self.assertEqual(tieon.survey_tool_type, choice)
            tieon.delete()
