"""
Tests for Depth Serializers.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from survey_api.models import Run, Well, Depth
from survey_api.serializers import (
    DepthSerializer,
    CreateDepthSerializer,
    UpdateDepthSerializer
)

User = get_user_model()


class DepthSerializerTest(TestCase):
    """Test cases for DepthSerializer"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.run = Run.objects.create(
            run_number='RUN001',
            run_name='Test Run',
            run_type='GTL',
            user=self.user
        )
        self.depth = Depth.objects.create(
            run=self.run,
            elevation_reference='KB',
            reference_datum='WGS84',
            reference_height=Decimal('1500.500'),
            reference_elevation=Decimal('985.250')
        )

    def test_depth_serializer_fields(self):
        """Test DepthSerializer includes all fields"""
        serializer = DepthSerializer(instance=self.depth)
        data = serializer.data

        # Check all expected fields are present
        expected_fields = [
            'id', 'run', 'well', 'elevation_reference',
            'reference_datum', 'reference_height', 'reference_elevation',
            'created_at', 'updated_at'
        ]
        for field in expected_fields:
            self.assertIn(field, data)

    def test_depth_serializer_read_only_fields(self):
        """Test read-only fields are not writable"""
        serializer = DepthSerializer()
        read_only_fields = ['id', 'created_at', 'updated_at']
        for field in read_only_fields:
            self.assertTrue(serializer.fields[field].read_only)

    def test_depth_serializer_serialization(self):
        """Test depth serialization produces correct data"""
        serializer = DepthSerializer(instance=self.depth)
        data = serializer.data

        self.assertEqual(str(data['id']), str(self.depth.id))
        self.assertEqual(str(data['run']), str(self.run.id))
        self.assertIsNone(data['well'])
        self.assertEqual(data['elevation_reference'], 'KB')
        self.assertEqual(data['reference_datum'], 'WGS84')
        self.assertEqual(Decimal(data['reference_height']), Decimal('1500.500'))
        self.assertEqual(Decimal(data['reference_elevation']), Decimal('985.250'))


class CreateDepthSerializerTest(TestCase):
    """Test cases for CreateDepthSerializer"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.run = Run.objects.create(
            run_number='RUN001',
            run_name='Test Run',
            run_type='GTL',
            user=self.user
        )
        self.well = Well.objects.create(
            well_name='Test Well',
            well_type='Oil'
        )

    def test_create_depth_with_run(self):
        """Test creating depth associated with run"""
        data = {
            'run': self.run.id,
            'elevation_reference': 'KB',
            'reference_datum': 'WGS84',
            'reference_height': Decimal('1500.500'),
            'reference_elevation': Decimal('985.250')
        }

        serializer = CreateDepthSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_create_depth_with_well(self):
        """Test creating depth associated with well"""
        data = {
            'well': self.well.id,
            'elevation_reference': 'RT',
            'reference_datum': 'NAD83',
            'reference_height': Decimal('1550.000'),
            'reference_elevation': Decimal('1000.000')
        }

        serializer = CreateDepthSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_create_depth_with_all_elevation_references(self):
        """Test creating depth with all valid elevation reference choices"""
        valid_choices = ['KB', 'RT', 'GL', 'MSL', 'DF', 'RKB']

        for i, choice in enumerate(valid_choices, start=2):
            # Create separate runs for each test to avoid OneToOne constraint
            run = Run.objects.create(
                run_number=f'RUN{i:03d}',
                run_name=f'Test Run {i}',
                run_type='GTL',
                user=self.user
            )

            data = {
                'run': run.id,
                'elevation_reference': choice,
                'reference_datum': 'WGS84',
                'reference_height': Decimal('1500.000'),
                'reference_elevation': Decimal('985.000')
            }

            serializer = CreateDepthSerializer(data=data)
            self.assertTrue(
                serializer.is_valid(),
                f"Validation failed for elevation_reference={choice}: {serializer.errors}"
            )
            depth = serializer.save()
            self.assertEqual(depth.elevation_reference, choice)

    def test_create_depth_invalid_elevation_reference(self):
        """Test validation fails with invalid elevation_reference"""
        data = {
            'run': self.run.id,
            'elevation_reference': 'INVALID',
            'reference_datum': 'WGS84',
            'reference_height': Decimal('1500.000'),
            'reference_elevation': Decimal('985.000')
        }

        serializer = CreateDepthSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('elevation_reference', serializer.errors)

    def test_create_depth_run_xor_well_validation_both(self):
        """Test validation fails when both run and well are provided"""
        data = {
            'run': self.run.id,
            'well': self.well.id,
            'elevation_reference': 'KB',
            'reference_datum': 'WGS84',
            'reference_height': Decimal('1500.000'),
            'reference_elevation': Decimal('985.000')
        }

        serializer = CreateDepthSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
        self.assertIn('not both', str(serializer.errors))

    def test_create_depth_run_xor_well_validation_neither(self):
        """Test validation fails when neither run nor well is provided"""
        data = {
            'elevation_reference': 'KB',
            'reference_datum': 'WGS84',
            'reference_height': Decimal('1500.000'),
            'reference_elevation': Decimal('985.000')
        }

        serializer = CreateDepthSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
        self.assertIn('either a run or a well', str(serializer.errors))

    def test_create_depth_minimal_required_fields(self):
        """Test creating depth with minimal required fields"""
        data = {
            'run': self.run.id,
            'elevation_reference': 'KB',
            'reference_datum': 'WGS84',
            'reference_height': Decimal('1500.000'),
            'reference_elevation': Decimal('985.000')
        }

        serializer = CreateDepthSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        depth = serializer.save()

        # Verify depth was created
        self.assertIsNotNone(depth.id)
        self.assertEqual(depth.run, self.run)
        self.assertEqual(depth.elevation_reference, 'KB')
        self.assertEqual(depth.reference_datum, 'WGS84')
        self.assertEqual(depth.reference_height, Decimal('1500.000'))
        self.assertEqual(depth.reference_elevation, Decimal('985.000'))

    def test_create_depth_decimal_field_precision(self):
        """Test decimal field precision is maintained"""
        data = {
            'run': self.run.id,
            'elevation_reference': 'KB',
            'reference_datum': 'WGS84',
            'reference_height': Decimal('1234.567'),
            'reference_elevation': Decimal('890.123')
        }

        serializer = CreateDepthSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        depth = serializer.save()

        # Verify precision is maintained (max_digits=10, decimal_places=3)
        self.assertEqual(depth.reference_height, Decimal('1234.567'))
        self.assertEqual(depth.reference_elevation, Decimal('890.123'))


class UpdateDepthSerializerTest(TestCase):
    """Test cases for UpdateDepthSerializer"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.run = Run.objects.create(
            run_number='RUN001',
            run_name='Test Run',
            run_type='GTL',
            user=self.user
        )
        self.depth = Depth.objects.create(
            run=self.run,
            elevation_reference='KB',
            reference_datum='WGS84',
            reference_height=Decimal('1500.500'),
            reference_elevation=Decimal('985.250')
        )

    def test_update_depth_elevation_reference(self):
        """Test updating elevation_reference"""
        data = {
            'elevation_reference': 'RT'
        }

        serializer = UpdateDepthSerializer(
            instance=self.depth,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_depth = serializer.save()

        # elevation_reference should be updated
        self.assertEqual(updated_depth.elevation_reference, 'RT')

    def test_update_depth_reference_datum(self):
        """Test updating reference_datum"""
        data = {
            'reference_datum': 'NAD83'
        }

        serializer = UpdateDepthSerializer(
            instance=self.depth,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_depth = serializer.save()

        # reference_datum should be updated
        self.assertEqual(updated_depth.reference_datum, 'NAD83')

    def test_update_depth_reference_height(self):
        """Test updating reference_height"""
        data = {
            'reference_height': Decimal('1600.000')
        }

        serializer = UpdateDepthSerializer(
            instance=self.depth,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_depth = serializer.save()

        # reference_height should be updated
        self.assertEqual(updated_depth.reference_height, Decimal('1600.000'))

    def test_update_depth_reference_elevation(self):
        """Test updating reference_elevation"""
        data = {
            'reference_elevation': Decimal('1050.500')
        }

        serializer = UpdateDepthSerializer(
            instance=self.depth,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_depth = serializer.save()

        # reference_elevation should be updated
        self.assertEqual(updated_depth.reference_elevation, Decimal('1050.500'))

    def test_update_depth_elevation_reference_validation(self):
        """Test elevation_reference validation on update"""
        data = {
            'elevation_reference': 'INVALID'
        }

        serializer = UpdateDepthSerializer(
            instance=self.depth,
            data=data,
            partial=True
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('elevation_reference', serializer.errors)

    def test_update_depth_multiple_fields(self):
        """Test updating multiple fields at once"""
        data = {
            'elevation_reference': 'GL',
            'reference_datum': 'NAD83',
            'reference_height': Decimal('1700.250'),
            'reference_elevation': Decimal('1100.750')
        }

        serializer = UpdateDepthSerializer(
            instance=self.depth,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_depth = serializer.save()

        # All fields should be updated
        self.assertEqual(updated_depth.elevation_reference, 'GL')
        self.assertEqual(updated_depth.reference_datum, 'NAD83')
        self.assertEqual(updated_depth.reference_height, Decimal('1700.250'))
        self.assertEqual(updated_depth.reference_elevation, Decimal('1100.750'))

    def test_update_depth_partial_update_support(self):
        """Test partial updates preserve unchanged fields"""
        original_datum = self.depth.reference_datum
        original_height = self.depth.reference_height
        original_elevation = self.depth.reference_elevation

        data = {
            'elevation_reference': 'MSL'
        }

        serializer = UpdateDepthSerializer(
            instance=self.depth,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_depth = serializer.save()

        # Only elevation_reference should change
        self.assertEqual(updated_depth.elevation_reference, 'MSL')

        # Other fields should remain unchanged
        self.assertEqual(updated_depth.reference_datum, original_datum)
        self.assertEqual(updated_depth.reference_height, original_height)
        self.assertEqual(updated_depth.reference_elevation, original_elevation)

    def test_update_depth_run_and_well_not_updateable(self):
        """Test that run and well fields are not included in update serializer"""
        serializer = UpdateDepthSerializer()

        # run and well should not be in the fields
        self.assertNotIn('run', serializer.fields)
        self.assertNotIn('well', serializer.fields)

    def test_update_depth_decimal_precision_maintained(self):
        """Test decimal precision is maintained on update"""
        data = {
            'reference_height': Decimal('2345.678'),
            'reference_elevation': Decimal('1234.567')
        }

        serializer = UpdateDepthSerializer(
            instance=self.depth,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_depth = serializer.save()

        # Verify precision is maintained
        self.assertEqual(updated_depth.reference_height, Decimal('2345.678'))
        self.assertEqual(updated_depth.reference_elevation, Decimal('1234.567'))
