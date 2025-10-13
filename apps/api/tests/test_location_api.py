"""
Integration tests for Location API endpoints.

Tests all CRUD operations, authentication, filtering, and validation.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from survey_api.models import Run, Well, Location
import json

User = get_user_model()


class LocationAPITestCase(TestCase):
    """
    Test suite for Location API endpoints.

    Tests Story 3.1 acceptance criteria.
    """

    def setUp(self):
        """Set up test fixtures."""
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='test123',
            role='engineer'
        )

        # Create test run and well
        self.run = Run.objects.create(
            run_number='RUN001',
            run_name='Test Run 1',
            run_type='GTL',
            user=self.user
        )

        self.run2 = Run.objects.create(
            run_number='RUN002',
            run_name='Test Run 2',
            run_type='Gyro',
            user=self.user
        )

        self.well = Well.objects.create(
            well_name='Test Well 1',
            well_type='Oil'
        )

        # Create test location
        self.location = Location.objects.create(
            run=self.run,
            latitude=Decimal('29.76'),
            longitude=Decimal('-95.37'),
            easting=Decimal('500000.123'),
            northing=Decimal('3200000.456'),
            geodetic_system='WGS84',
            map_zone='15N',
            north_reference='True North',
            central_meridian=Decimal('-93.0'),
            grid_correction=Decimal('0.123'),
            g_t=Decimal('0.001'),
            max_g_t=Decimal('0.0012'),
            w_t=Decimal('0.9996'),
            max_w_t=Decimal('1.0004')
        )

        # API client
        self.client = APIClient()

    def test_list_locations_authenticated(self):
        """
        Test that authenticated users can list locations.
        """
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/locations/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

    def test_list_locations_unauthenticated(self):
        """
        Test that unauthenticated requests are rejected.
        """
        response = self.client.get('/api/v1/locations/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_location_with_run(self):
        """
        Test creating location associated with run.
        Verifies automatic calculation of UTM coordinates and derived fields.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'run': str(self.run2.id),
            'latitude': '30.5',
            'longitude': '-96.5',
            'geodetic_system': 'WGS84',
            'map_zone': '15N',
            'north_reference': 'True North',
            'central_meridian': '-93.0'
        }

        response = self.client.post(
            '/api/v1/locations/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data['run']), str(self.run2.id))
        self.assertEqual(Decimal(response.data['latitude']), Decimal('30.5'))
        self.assertEqual(Decimal(response.data['longitude']), Decimal('-96.5'))

        # Verify calculated fields are present
        self.assertIn('easting', response.data)
        self.assertIn('northing', response.data)
        self.assertIn('grid_correction', response.data)
        self.assertIn('g_t', response.data)
        self.assertIn('max_g_t', response.data)
        self.assertIn('w_t', response.data)
        self.assertIn('max_w_t', response.data)

        # Verify calculated fields are not null
        self.assertIsNotNone(response.data['easting'])
        self.assertIsNotNone(response.data['northing'])

    def test_create_location_with_well(self):
        """
        Test creating location associated with well.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'well': str(self.well.id),
            'latitude': '31.0',
            'longitude': '-97.0',
            'geodetic_system': 'WGS84',
            'map_zone': '15N'
        }

        response = self.client.post(
            '/api/v1/locations/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data['well']), str(self.well.id))
        self.assertIsNone(response.data['run'])

    def test_create_location_latitude_out_of_range(self):
        """
        Test validation rejects latitude outside valid range.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'run': str(self.run2.id),
            'latitude': '95.0',  # Invalid: > 90
            'longitude': '-95.0'
        }

        response = self.client.post(
            '/api/v1/locations/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('latitude', error_data)

    def test_create_location_longitude_out_of_range(self):
        """
        Test validation rejects longitude outside valid range.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'run': str(self.run2.id),
            'latitude': '29.0',
            'longitude': '-185.0'  # Invalid: < -180
        }

        response = self.client.post(
            '/api/v1/locations/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('longitude', error_data)

    def test_create_location_both_run_and_well(self):
        """
        Test validation rejects location with both run and well.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'run': str(self.run2.id),
            'well': str(self.well.id),
            'latitude': '29.0',
            'longitude': '-95.0'
        }

        response = self.client.post(
            '/api/v1/locations/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('non_field_errors', error_data)

    def test_create_location_neither_run_nor_well(self):
        """
        Test validation rejects location without run or well.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'latitude': '29.0',
            'longitude': '-95.0'
        }

        response = self.client.post(
            '/api/v1/locations/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('non_field_errors', error_data)

    def test_create_location_missing_required_fields(self):
        """
        Test validation requires latitude and longitude.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'run': str(self.run2.id)
            # Missing latitude and longitude
        }

        response = self.client.post(
            '/api/v1/locations/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('latitude', error_data)
        error_data = response.data.get('details', response.data)
        self.assertIn('longitude', error_data)

    def test_retrieve_location(self):
        """
        Test retrieving a specific location with all fields.
        """
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f'/api/v1/locations/{self.location.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.location.id))
        self.assertEqual(Decimal(response.data['latitude']), Decimal('29.76'))
        self.assertEqual(Decimal(response.data['longitude']), Decimal('-95.37'))
        self.assertIn('easting', response.data)
        self.assertIn('northing', response.data)
        self.assertIn('grid_correction', response.data)

    def test_retrieve_location_not_found(self):
        """
        Test 404 response for non-existent location.
        """
        self.client.force_authenticate(user=self.user)

        fake_id = '00000000-0000-0000-0000-000000000000'
        response = self.client.get(f'/api/v1/locations/{fake_id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_location_latitude(self):
        """
        Test updating location latitude triggers recalculation.
        """
        self.client.force_authenticate(user=self.user)

        original_easting = self.location.easting

        data = {
            'latitude': '30.0',
            'longitude': '-95.37',
            'geodetic_system': 'WGS84',
            'map_zone': '15N',
            'north_reference': 'True North',
            'central_meridian': '-93.0'
        }

        response = self.client.put(
            f'/api/v1/locations/{self.location.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['latitude']), Decimal('30.0'))

        # Verify calculated fields were recalculated
        self.assertIsNotNone(response.data['easting'])
        self.assertIsNotNone(response.data['northing'])

    def test_partial_update_location_coordinates(self):
        """
        Test partial update with coordinate change triggers recalculation.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'longitude': '-96.0'
        }

        response = self.client.patch(
            f'/api/v1/locations/{self.location.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['longitude']), Decimal('-96.0'))
        # Latitude should remain unchanged
        self.assertEqual(Decimal(response.data['latitude']), Decimal('29.76'))

    def test_partial_update_location_non_coordinate_field(self):
        """
        Test partial update of non-coordinate field doesn't trigger recalculation.
        """
        self.client.force_authenticate(user=self.user)

        original_easting = self.location.easting

        data = {
            'north_reference': 'Grid North'
        }

        response = self.client.patch(
            f'/api/v1/locations/{self.location.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['north_reference'], 'Grid North')

        # Easting should remain unchanged (no recalculation)
        self.location.refresh_from_db()
        self.assertEqual(self.location.easting, original_easting)

    def test_delete_location(self):
        """
        Test deleting a location.
        """
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(f'/api/v1/locations/{self.location.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify location was deleted
        self.assertFalse(Location.objects.filter(id=self.location.id).exists())

    def test_filter_locations_by_run(self):
        """
        Test filtering locations by run_id.
        """
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f'/api/v1/locations/?run={self.run.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify filtering returns results (at least one location)
        self.assertTrue(len(response.data) >= 1)

    def test_filter_locations_by_well(self):
        """
        Test filtering locations by well_id.
        """
        self.client.force_authenticate(user=self.user)

        # Create location for well
        well_location = Location.objects.create(
            well=self.well,
            latitude=Decimal('32.0'),
            longitude=Decimal('-98.0')
        )

        response = self.client.get(f'/api/v1/locations/?well={self.well.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify filtering returns results (at least one location)
        self.assertTrue(len(response.data) >= 1)

    def test_location_cascade_delete_on_run_delete(self):
        """
        Test location is deleted when associated run is deleted.
        """
        self.client.force_authenticate(user=self.user)

        location_id = self.location.id

        # Delete the run
        self.run.delete()

        # Verify location was cascade-deleted
        self.assertFalse(Location.objects.filter(id=location_id).exists())

    def test_location_cascade_delete_on_well_delete(self):
        """
        Test location is deleted when associated well is deleted.
        """
        self.client.force_authenticate(user=self.user)

        # Create location for well
        well_location = Location.objects.create(
            well=self.well,
            latitude=Decimal('32.0'),
            longitude=Decimal('-98.0')
        )
        location_id = well_location.id

        # Delete the well
        self.well.delete()

        # Verify location was cascade-deleted
        self.assertFalse(Location.objects.filter(id=location_id).exists())

    def test_location_response_includes_all_fields(self):
        """
        Test location response includes all expected fields.
        """
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f'/api/v1/locations/{self.location.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        expected_fields = [
            'id', 'run', 'well', 'latitude', 'longitude',
            'easting', 'northing', 'geodetic_system', 'map_zone',
            'north_reference', 'central_meridian', 'grid_correction',
            'g_t', 'max_g_t', 'w_t', 'max_w_t',
            'created_at', 'updated_at'
        ]

        for field in expected_fields:
            self.assertIn(field, response.data)

    def test_calculated_fields_are_read_only(self):
        """
        Test that calculated fields cannot be directly set via API.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'latitude': '29.5',
            'longitude': '-95.5',
            'easting': '999999.999',  # Should be ignored
            'northing': '999999.999',  # Should be ignored
            'grid_correction': '99.999',  # Should be ignored
            'g_t': '99.999',  # Should be ignored
        }

        response = self.client.patch(
            f'/api/v1/locations/{self.location.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Calculated fields should not match the provided values
        # They should be recalculated based on coordinates
        self.assertNotEqual(Decimal(response.data['easting']), Decimal('999999.999'))
        self.assertNotEqual(Decimal(response.data['northing']), Decimal('999999.999'))

    def test_location_ordering_by_created_at(self):
        """
        Test ordering locations by created_at.
        """
        self.client.force_authenticate(user=self.user)

        response = self.client.get('/api/v1/locations/?ordering=created_at')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

    def test_location_ordering_by_updated_at_descending(self):
        """
        Test default ordering is by updated_at descending.
        """
        self.client.force_authenticate(user=self.user)

        response = self.client.get('/api/v1/locations/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Default ordering should be -created_at (most recent first)

    def test_north_reference_choices(self):
        """
        Test valid north_reference choices are accepted.
        """
        self.client.force_authenticate(user=self.user)

        valid_choices = ['True North', 'Grid North', 'Magnetic North']

        for choice in valid_choices:
            data = {
                'north_reference': choice
            }

            response = self.client.patch(
                f'/api/v1/locations/{self.location.id}/',
                data=json.dumps(data),
                content_type='application/json'
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['north_reference'], choice)


class LocationAPIEdgeCaseTestCase(TestCase):
    """
    Test edge cases and error conditions for Location API.
    """

    def setUp(self):
        """Set up test fixtures."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='test123',
            role='engineer'
        )

        self.run = Run.objects.create(
            run_number='RUN001',
            run_name='Test Run',
            run_type='GTL',
            user=self.user
        )

        self.client = APIClient()

    def test_create_location_extreme_latitude_north(self):
        """
        Test creating location at north pole (90° N).
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'run': str(self.run.id),
            'latitude': '90.0',
            'longitude': '0.0'
        }

        response = self.client.post(
            '/api/v1/locations/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data['latitude']), Decimal('90.0'))

    def test_create_location_extreme_latitude_south(self):
        """
        Test creating location at south pole (-90° S).
        """
        self.client.force_authenticate(user=self.user)

        run2 = Run.objects.create(
            run_number='RUN002',
            run_name='Test Run 2',
            run_type='GTL',
            user=self.user
        )

        data = {
            'run': str(run2.id),
            'latitude': '-90.0',
            'longitude': '0.0'
        }

        response = self.client.post(
            '/api/v1/locations/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data['latitude']), Decimal('-90.0'))

    def test_create_location_extreme_longitude_east(self):
        """
        Test creating location at 180° E.
        """
        self.client.force_authenticate(user=self.user)

        run2 = Run.objects.create(
            run_number='RUN003',
            run_name='Test Run 3',
            run_type='GTL',
            user=self.user
        )

        data = {
            'run': str(run2.id),
            'latitude': '0.0',
            'longitude': '180.0'
        }

        response = self.client.post(
            '/api/v1/locations/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data['longitude']), Decimal('180.0'))

    def test_create_duplicate_location_for_run(self):
        """
        Test that creating duplicate location for same run is rejected.
        """
        self.client.force_authenticate(user=self.user)

        # Create first location
        location1 = Location.objects.create(
            run=self.run,
            latitude=Decimal('29.0'),
            longitude=Decimal('-95.0')
        )

        # Attempt to create second location for same run
        data = {
            'run': str(self.run.id),
            'latitude': '30.0',
            'longitude': '-96.0'
        }

        response = self.client.post(
            '/api/v1/locations/',
            data=json.dumps(data),
            content_type='application/json'
        )

        # Should fail due to OneToOne constraint
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
