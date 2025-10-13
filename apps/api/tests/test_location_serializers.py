"""
Tests for Location Serializers.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from survey_api.models import Run, Well, Location
from survey_api.serializers import (
    LocationSerializer,
    CreateLocationSerializer,
    UpdateLocationSerializer
)

User = get_user_model()


class LocationSerializerTest(TestCase):
    """Test cases for LocationSerializer"""

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
        self.location = Location.objects.create(
            run=self.run,
            latitude=Decimal('29.76'),
            longitude=Decimal('-95.37'),
            easting=Decimal('500000.123'),
            northing=Decimal('3200000.456'),
            grid_correction=Decimal('0.123'),
            g_t=Decimal('0.001'),
            max_g_t=Decimal('0.0012'),
            w_t=Decimal('0.9996'),
            max_w_t=Decimal('1.0004')
        )

    def test_location_serializer_fields(self):
        """Test LocationSerializer includes all fields"""
        serializer = LocationSerializer(instance=self.location)
        data = serializer.data

        # Check all expected fields are present
        expected_fields = [
            'id', 'run', 'well', 'latitude', 'longitude',
            'easting', 'northing', 'geodetic_system', 'map_zone',
            'north_reference', 'central_meridian', 'grid_correction',
            'g_t', 'max_g_t', 'w_t', 'max_w_t',
            'created_at', 'updated_at'
        ]
        for field in expected_fields:
            self.assertIn(field, data)

    def test_location_serializer_read_only_fields(self):
        """Test read-only fields are not writable"""
        serializer = LocationSerializer()
        read_only_fields = [
            'id', 'easting', 'northing', 'grid_correction',
            'g_t', 'max_g_t', 'w_t', 'max_w_t',
            'created_at', 'updated_at'
        ]
        for field in read_only_fields:
            self.assertTrue(serializer.fields[field].read_only)

    def test_location_serializer_serialization(self):
        """Test location serialization produces correct data"""
        serializer = LocationSerializer(instance=self.location)
        data = serializer.data

        self.assertEqual(str(data['id']), str(self.location.id))
        self.assertEqual(str(data['run']), str(self.run.id))
        self.assertIsNone(data['well'])
        self.assertEqual(Decimal(data['latitude']), Decimal('29.76'))
        self.assertEqual(Decimal(data['longitude']), Decimal('-95.37'))


class CreateLocationSerializerTest(TestCase):
    """Test cases for CreateLocationSerializer"""

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

    def test_create_location_with_run(self):
        """Test creating location associated with run"""
        data = {
            'run': self.run.id,
            'latitude': Decimal('29.76'),
            'longitude': Decimal('-95.37'),
            'geodetic_system': 'WGS84',
            'map_zone': '15N',
            'north_reference': 'True North',
            'central_meridian': Decimal('-93.0')
        }

        serializer = CreateLocationSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_create_location_with_well(self):
        """Test creating location associated with well"""
        data = {
            'well': self.well.id,
            'latitude': Decimal('30.0'),
            'longitude': Decimal('-96.0'),
            'geodetic_system': 'WGS84',
            'map_zone': '15N',
            'north_reference': 'True North',
            'central_meridian': Decimal('-93.0')
        }

        serializer = CreateLocationSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_create_location_latitude_validation_min(self):
        """Test latitude minimum validation"""
        data = {
            'run': self.run.id,
            'latitude': Decimal('-91.0'),  # Invalid
            'longitude': Decimal('-95.0')
        }

        serializer = CreateLocationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('latitude', serializer.errors)

    def test_create_location_latitude_validation_max(self):
        """Test latitude maximum validation"""
        data = {
            'run': self.run.id,
            'latitude': Decimal('91.0'),  # Invalid
            'longitude': Decimal('-95.0')
        }

        serializer = CreateLocationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('latitude', serializer.errors)

    def test_create_location_latitude_validation_valid_extremes(self):
        """Test latitude validation at valid extremes"""
        # North pole
        data_north = {
            'run': self.run.id,
            'latitude': Decimal('90.0'),
            'longitude': Decimal('0.0')
        }
        serializer_north = CreateLocationSerializer(data=data_north)
        self.assertTrue(serializer_north.is_valid(), serializer_north.errors)

        # South pole (need different run)
        run2 = Run.objects.create(
            run_number='RUN002',
            run_name='Test Run 2',
            run_type='GTL',
            user=self.user
        )
        data_south = {
            'run': run2.id,
            'latitude': Decimal('-90.0'),
            'longitude': Decimal('0.0')
        }
        serializer_south = CreateLocationSerializer(data=data_south)
        self.assertTrue(serializer_south.is_valid(), serializer_south.errors)

    def test_create_location_longitude_validation_min(self):
        """Test longitude minimum validation"""
        data = {
            'run': self.run.id,
            'latitude': Decimal('29.0'),
            'longitude': Decimal('-181.0')  # Invalid
        }

        serializer = CreateLocationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('longitude', serializer.errors)

    def test_create_location_longitude_validation_max(self):
        """Test longitude maximum validation"""
        data = {
            'run': self.run.id,
            'latitude': Decimal('29.0'),
            'longitude': Decimal('181.0')  # Invalid
        }

        serializer = CreateLocationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('longitude', serializer.errors)

    def test_create_location_longitude_validation_valid_extremes(self):
        """Test longitude validation at valid extremes"""
        # East extreme
        data_east = {
            'run': self.run.id,
            'latitude': Decimal('0.0'),
            'longitude': Decimal('180.0')
        }
        serializer_east = CreateLocationSerializer(data=data_east)
        self.assertTrue(serializer_east.is_valid(), serializer_east.errors)

        # West extreme (need different run)
        run2 = Run.objects.create(
            run_number='RUN002',
            run_name='Test Run 2',
            run_type='GTL',
            user=self.user
        )
        data_west = {
            'run': run2.id,
            'latitude': Decimal('0.0'),
            'longitude': Decimal('-180.0')
        }
        serializer_west = CreateLocationSerializer(data=data_west)
        self.assertTrue(serializer_west.is_valid(), serializer_west.errors)

    def test_create_location_run_xor_well_validation_both(self):
        """Test validation fails when both run and well are provided"""
        data = {
            'run': self.run.id,
            'well': self.well.id,
            'latitude': Decimal('29.0'),
            'longitude': Decimal('-95.0')
        }

        serializer = CreateLocationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
        self.assertIn('not both', str(serializer.errors))

    def test_create_location_run_xor_well_validation_neither(self):
        """Test validation fails when neither run nor well is provided"""
        data = {
            'latitude': Decimal('29.0'),
            'longitude': Decimal('-95.0')
        }

        serializer = CreateLocationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
        self.assertIn('either a run or a well', str(serializer.errors))

    def test_create_location_saves_with_calculations(self):
        """Test that create method triggers calculations"""
        data = {
            'run': self.run.id,
            'latitude': Decimal('29.76'),
            'longitude': Decimal('-95.37'),
            'geodetic_system': 'WGS84',
            'map_zone': '15N',
            'north_reference': 'True North',
            'central_meridian': Decimal('-93.0')
        }

        serializer = CreateLocationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        location = serializer.save()

        # Verify location was created
        self.assertIsNotNone(location.id)
        self.assertEqual(location.run, self.run)

        # Verify calculated fields are present
        self.assertIsNotNone(location.easting)
        self.assertIsNotNone(location.northing)
        self.assertIsNotNone(location.grid_correction)


class UpdateLocationSerializerTest(TestCase):
    """Test cases for UpdateLocationSerializer"""

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
        self.location = Location.objects.create(
            run=self.run,
            latitude=Decimal('29.76'),
            longitude=Decimal('-95.37'),
            easting=Decimal('500000.0'),
            northing=Decimal('3200000.0'),
            grid_correction=Decimal('0.1'),
            g_t=Decimal('0.001'),
            max_g_t=Decimal('0.0012'),
            w_t=Decimal('0.9996'),
            max_w_t=Decimal('1.0004')
        )

    def test_update_location_latitude(self):
        """Test updating latitude triggers recalculation"""
        data = {
            'latitude': Decimal('30.0')
        }

        serializer = UpdateLocationSerializer(
            instance=self.location,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_location = serializer.save()

        # Latitude should be updated
        self.assertEqual(updated_location.latitude, Decimal('30.0'))

        # Calculated fields should be recalculated
        # (values will be different from original)
        self.assertIsNotNone(updated_location.easting)
        self.assertIsNotNone(updated_location.northing)

    def test_update_location_longitude(self):
        """Test updating longitude triggers recalculation"""
        data = {
            'longitude': Decimal('-96.0')
        }

        serializer = UpdateLocationSerializer(
            instance=self.location,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_location = serializer.save()

        # Longitude should be updated
        self.assertEqual(updated_location.longitude, Decimal('-96.0'))

    def test_update_location_non_coordinate_field(self):
        """Test updating non-coordinate field doesn't trigger recalculation"""
        original_easting = self.location.easting
        original_northing = self.location.northing

        data = {
            'north_reference': 'Grid North'
        }

        serializer = UpdateLocationSerializer(
            instance=self.location,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_location = serializer.save()

        # north_reference should be updated
        self.assertEqual(updated_location.north_reference, 'Grid North')

        # Calculated fields should remain unchanged
        self.assertEqual(updated_location.easting, original_easting)
        self.assertEqual(updated_location.northing, original_northing)

    def test_update_location_latitude_validation(self):
        """Test latitude validation on update"""
        data = {
            'latitude': Decimal('95.0')  # Invalid
        }

        serializer = UpdateLocationSerializer(
            instance=self.location,
            data=data,
            partial=True
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('latitude', serializer.errors)

    def test_update_location_longitude_validation(self):
        """Test longitude validation on update"""
        data = {
            'longitude': Decimal('185.0')  # Invalid
        }

        serializer = UpdateLocationSerializer(
            instance=self.location,
            data=data,
            partial=True
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('longitude', serializer.errors)

    def test_update_location_multiple_fields(self):
        """Test updating multiple fields at once"""
        data = {
            'latitude': Decimal('31.0'),
            'longitude': Decimal('-97.0'),
            'geodetic_system': 'NAD83',
            'north_reference': 'Magnetic North'
        }

        serializer = UpdateLocationSerializer(
            instance=self.location,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_location = serializer.save()

        # All fields should be updated
        self.assertEqual(updated_location.latitude, Decimal('31.0'))
        self.assertEqual(updated_location.longitude, Decimal('-97.0'))
        self.assertEqual(updated_location.geodetic_system, 'NAD83')
        self.assertEqual(updated_location.north_reference, 'Magnetic North')

        # Calculated fields should be recalculated
        self.assertIsNotNone(updated_location.easting)
        self.assertIsNotNone(updated_location.northing)
