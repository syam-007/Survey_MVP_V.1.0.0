"""
Tests for TieOn serializers.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from survey_api.models import Well, Run, TieOn
from survey_api.serializers import (
    TieOnSerializer,
    CreateTieOnSerializer,
    UpdateTieOnSerializer,
)
from decimal import Decimal

User = get_user_model()


class TieOnSerializerTest(TestCase):
    """Test suite for TieOn serializers."""

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

        self.tieon = TieOn.objects.create(
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

    def test_tieon_serializer_with_valid_data(self):
        """Test TieOnSerializer with valid data."""
        serializer = TieOnSerializer(instance=self.tieon)
        data = serializer.data

        self.assertEqual(data['md'], '1000.500')
        self.assertEqual(data['inc'], '45.25')
        self.assertEqual(data['azi'], '180.75')
        self.assertEqual(data['tvd'], '950.300')
        self.assertEqual(data['latitude'], '29.760427')
        self.assertEqual(data['departure'], '-95.369803')
        self.assertEqual(data['well_type'], 'Deviated')
        self.assertEqual(data['hole_section'], 'Production Casing')
        self.assertEqual(data['casing_selected'], True)
        self.assertEqual(data['drillpipe_selected'], False)
        self.assertEqual(data['survey_tool_type'], 'MWD')
        self.assertEqual(data['survey_interval_from'], '1000.000')
        self.assertEqual(data['survey_interval_to'], '5000.000')
        self.assertEqual(data['survey_interval_length'], '4000.000')

    def test_tieon_serializer_includes_all_fields(self):
        """Test TieOnSerializer includes all expected fields."""
        serializer = TieOnSerializer(instance=self.tieon)
        data = serializer.data

        expected_fields = [
            'id', 'run', 'md', 'inc', 'azi', 'tvd', 'latitude', 'departure',
            'well_type', 'hole_section', 'casing_selected', 'drillpipe_selected',
            'survey_tool_type', 'survey_interval_from', 'survey_interval_to',
            'survey_interval_length', 'created_at', 'updated_at'
        ]

        for field in expected_fields:
            self.assertIn(field, data)

    def test_validation_invalid_inclination_greater_than_180(self):
        """Test validation fails for inclination > 180."""
        data = {
            'run': str(self.run.id),
            'md': '1000.000',
            'inc': '181.00',  # Invalid
            'azi': '0.00',
            'tvd': '1000.000',
            'latitude': '0.000000',
            'departure': '0.000000',
            'well_type': 'Vertical',
            'hole_section': 'Surface Casing',
            'survey_tool_type': 'MWD',
            'survey_interval_from': '1000.000',
            'survey_interval_to': '5000.000'
        }

        serializer = CreateTieOnSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('inc', serializer.errors)

    def test_validation_invalid_inclination_less_than_0(self):
        """Test validation fails for inclination < 0."""
        data = {
            'run': str(self.run.id),
            'md': '1000.000',
            'inc': '-1.00',  # Invalid
            'azi': '0.00',
            'tvd': '1000.000',
            'latitude': '0.000000',
            'departure': '0.000000',
            'well_type': 'Vertical',
            'hole_section': 'Surface Casing',
            'survey_tool_type': 'MWD',
            'survey_interval_from': '1000.000',
            'survey_interval_to': '5000.000'
        }

        serializer = CreateTieOnSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('inc', serializer.errors)

    def test_validation_invalid_azimuth_greater_than_360(self):
        """Test validation fails for azimuth >= 360."""
        data = {
            'run': str(self.run.id),
            'md': '1000.000',
            'inc': '0.00',
            'azi': '361.00',  # Invalid
            'tvd': '1000.000',
            'latitude': '0.000000',
            'departure': '0.000000',
            'well_type': 'Vertical',
            'hole_section': 'Surface Casing',
            'survey_tool_type': 'MWD',
            'survey_interval_from': '1000.000',
            'survey_interval_to': '5000.000'
        }

        serializer = CreateTieOnSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('azi', serializer.errors)

    def test_validation_invalid_azimuth_less_than_0(self):
        """Test validation fails for azimuth < 0."""
        data = {
            'run': str(self.run.id),
            'md': '1000.000',
            'inc': '0.00',
            'azi': '-1.00',  # Invalid
            'tvd': '1000.000',
            'latitude': '0.000000',
            'departure': '0.000000',
            'well_type': 'Vertical',
            'hole_section': 'Surface Casing',
            'survey_tool_type': 'MWD',
            'survey_interval_from': '1000.000',
            'survey_interval_to': '5000.000'
        }

        serializer = CreateTieOnSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('azi', serializer.errors)

    def test_validation_survey_interval_from_greater_than_to(self):
        """Test validation fails when survey_interval_from >= survey_interval_to."""
        # Create a new run for this test
        run2 = Run.objects.create(
            run_number='RUN-004',
            run_name='Test Run 4',
            run_type='GTL',
            well=self.well,
            user=self.user
        )

        data = {
            'run': str(run2.id),
            'md': '1000.000',
            'inc': '0.00',
            'azi': '0.00',
            'tvd': '1000.000',
            'latitude': '0.000000',
            'departure': '0.000000',
            'well_type': 'Vertical',
            'hole_section': 'Surface Casing',
            'survey_tool_type': 'MWD',
            'survey_interval_from': '5000.000',  # Greater than 'to'
            'survey_interval_to': '1000.000'
        }

        serializer = CreateTieOnSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('survey_interval_from', serializer.errors)

    def test_validation_missing_required_fields(self):
        """Test validation fails when required fields are missing."""
        data = {
            'run': str(self.run.id),
            # Missing md, inc, azi, tvd, etc.
        }

        serializer = CreateTieOnSerializer(data=data)
        self.assertFalse(serializer.is_valid())

        # Check that required fields are in errors
        required_fields = [
            'md', 'inc', 'azi', 'tvd', 'latitude', 'departure',
            'well_type', 'hole_section', 'survey_tool_type',
            'survey_interval_from', 'survey_interval_to'
        ]

        for field in required_fields:
            self.assertIn(field, serializer.errors)

    def test_create_tieon_serializer_with_minimal_required_fields(self):
        """Test CreateTieOnSerializer with minimal required fields."""
        # Create a second run for this test
        run2 = Run.objects.create(
            run_number='RUN-002',
            run_name='Test Run 2',
            run_type='MWD',
            well=self.well,
            user=self.user
        )

        data = {
            'run': str(run2.id),
            'md': '2000.000',
            'inc': '10.50',
            'azi': '90.00',
            'tvd': '1950.000',
            'latitude': '30.000000',
            'departure': '-96.000000',
            'well_type': 'Horizontal',
            'hole_section': 'Open Hole',
            'survey_tool_type': 'LWD',
            'survey_interval_from': '2000.000',
            'survey_interval_to': '6000.000'
        }

        serializer = CreateTieOnSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        tieon = serializer.save()
        self.assertIsNotNone(tieon.id)
        self.assertEqual(tieon.md, Decimal('2000.000'))
        self.assertEqual(tieon.inc, Decimal('10.50'))
        self.assertEqual(tieon.azi, Decimal('90.00'))
        self.assertEqual(tieon.survey_interval_length, Decimal('4000.000'))
        # Default values for optional boolean fields
        self.assertFalse(tieon.casing_selected)
        self.assertFalse(tieon.drillpipe_selected)

    def test_update_tieon_serializer_partial_update(self):
        """Test UpdateTieOnSerializer allows partial updates."""
        data = {
            'casing_selected': False,
            'drillpipe_selected': True
        }

        serializer = UpdateTieOnSerializer(instance=self.tieon, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        updated_tieon = serializer.save()
        self.assertFalse(updated_tieon.casing_selected)
        self.assertTrue(updated_tieon.drillpipe_selected)
        # Other fields remain unchanged
        self.assertEqual(updated_tieon.md, Decimal('1000.500'))

    def test_update_tieon_serializer_run_not_updateable(self):
        """Test that run field cannot be updated after creation."""
        # Create a second run
        run2 = Run.objects.create(
            run_number='RUN-003',
            run_name='Test Run 3',
            run_type='Gyro',
            well=self.well,
            user=self.user
        )

        # UpdateTieOnSerializer should not include 'run' field
        serializer = UpdateTieOnSerializer(instance=self.tieon)
        self.assertNotIn('run', serializer.fields)
