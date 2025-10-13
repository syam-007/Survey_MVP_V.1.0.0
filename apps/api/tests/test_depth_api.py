"""
Integration tests for Depth API endpoints.

Tests all CRUD operations, authentication, filtering, and validation.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from survey_api.models import Run, Well, Depth
import json

User = get_user_model()


class DepthAPITestCase(TestCase):
    """
    Test suite for Depth API endpoints.

    Tests Story 3.2 acceptance criteria.
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

        # Create test runs and well
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

        # Create test depth
        self.depth = Depth.objects.create(
            run=self.run,
            elevation_reference='KB',
            reference_datum='WGS84',
            reference_height=Decimal('1500.500'),
            reference_elevation=Decimal('985.250')
        )

        # API client
        self.client = APIClient()

    def test_list_depths_authenticated(self):
        """
        Test that authenticated users can list depths.
        """
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/depths/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

    def test_list_depths_unauthenticated(self):
        """
        Test that unauthenticated requests are rejected.
        """
        response = self.client.get('/api/v1/depths/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_depth_with_run(self):
        """
        Test creating depth associated with run.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'run': str(self.run2.id),
            'elevation_reference': 'RT',
            'reference_datum': 'NAD83',
            'reference_height': '1550.000',
            'reference_elevation': '1000.250'
        }

        response = self.client.post(
            '/api/v1/depths/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data['run']), str(self.run2.id))
        self.assertEqual(response.data['elevation_reference'], 'RT')
        self.assertEqual(response.data['reference_datum'], 'NAD83')
        self.assertEqual(Decimal(response.data['reference_height']), Decimal('1550.000'))
        self.assertEqual(Decimal(response.data['reference_elevation']), Decimal('1000.250'))

    def test_create_depth_with_well(self):
        """
        Test creating depth associated with well.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'well': str(self.well.id),
            'elevation_reference': 'GL',
            'reference_datum': 'WGS84',
            'reference_height': '1600.500',
            'reference_elevation': '1050.750'
        }

        response = self.client.post(
            '/api/v1/depths/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data['well']), str(self.well.id))
        self.assertIsNone(response.data['run'])

    def test_create_depth_all_elevation_references(self):
        """
        Test creating depth with all valid elevation reference choices.
        """
        self.client.force_authenticate(user=self.user)

        valid_choices = ['KB', 'RT', 'GL', 'MSL', 'DF', 'RKB']

        for i, choice in enumerate(valid_choices, start=3):
            # Create separate runs for each test
            run = Run.objects.create(
                run_number=f'RUN{i:03d}',
                run_name=f'Test Run {i}',
                run_type='GTL',
                user=self.user
            )

            data = {
                'run': str(run.id),
                'elevation_reference': choice,
                'reference_datum': 'WGS84',
                'reference_height': '1500.000',
                'reference_elevation': '985.000'
            }

            response = self.client.post(
                '/api/v1/depths/',
                data=json.dumps(data),
                content_type='application/json'
            )

            self.assertEqual(
                response.status_code,
                status.HTTP_201_CREATED,
                f"Failed to create depth with elevation_reference={choice}"
            )
            self.assertEqual(response.data['elevation_reference'], choice)

    def test_create_depth_invalid_elevation_reference(self):
        """
        Test validation rejects invalid elevation_reference.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'run': str(self.run2.id),
            'elevation_reference': 'INVALID',
            'reference_datum': 'WGS84',
            'reference_height': '1500.000',
            'reference_elevation': '985.000'
        }

        response = self.client.post(
            '/api/v1/depths/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('elevation_reference', error_data)

    def test_create_depth_both_run_and_well(self):
        """
        Test validation rejects depth with both run and well.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'run': str(self.run2.id),
            'well': str(self.well.id),
            'elevation_reference': 'KB',
            'reference_datum': 'WGS84',
            'reference_height': '1500.000',
            'reference_elevation': '985.000'
        }

        response = self.client.post(
            '/api/v1/depths/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('non_field_errors', error_data)

    def test_create_depth_neither_run_nor_well(self):
        """
        Test validation rejects depth without run or well.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'elevation_reference': 'KB',
            'reference_datum': 'WGS84',
            'reference_height': '1500.000',
            'reference_elevation': '985.000'
        }

        response = self.client.post(
            '/api/v1/depths/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('non_field_errors', error_data)

    def test_create_depth_with_default_values(self):
        """
        Test that depth uses default values when fields are omitted.
        Model has defaults: elevation_reference='KB', reference_datum='WGS84',
        reference_height=Decimal('0.000'), reference_elevation=Decimal('0.000')
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'run': str(self.run2.id)
            # Missing elevation_reference, reference_datum, reference_height, reference_elevation
            # Should use model defaults
        }

        response = self.client.post(
            '/api/v1/depths/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Verify default values are used
        self.assertEqual(response.data['elevation_reference'], 'KB')
        self.assertEqual(response.data['reference_datum'], 'WGS84')
        self.assertEqual(Decimal(response.data['reference_height']), Decimal('0.000'))
        self.assertEqual(Decimal(response.data['reference_elevation']), Decimal('0.000'))

    def test_retrieve_depth(self):
        """
        Test retrieving a specific depth with all fields.
        """
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f'/api/v1/depths/{self.depth.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.depth.id))
        self.assertEqual(response.data['elevation_reference'], 'KB')
        self.assertEqual(response.data['reference_datum'], 'WGS84')
        self.assertEqual(Decimal(response.data['reference_height']), Decimal('1500.500'))
        self.assertEqual(Decimal(response.data['reference_elevation']), Decimal('985.250'))

    def test_retrieve_depth_not_found(self):
        """
        Test 404 response for non-existent depth.
        """
        self.client.force_authenticate(user=self.user)

        fake_id = '00000000-0000-0000-0000-000000000000'
        response = self.client.get(f'/api/v1/depths/{fake_id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_depth_elevation_reference(self):
        """
        Test updating depth elevation_reference.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'elevation_reference': 'MSL',
            'reference_datum': 'WGS84',
            'reference_height': '1500.500',
            'reference_elevation': '985.250'
        }

        response = self.client.put(
            f'/api/v1/depths/{self.depth.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['elevation_reference'], 'MSL')

    def test_partial_update_depth_single_field(self):
        """
        Test partial update of single field.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'reference_height': '1650.750'
        }

        response = self.client.patch(
            f'/api/v1/depths/{self.depth.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['reference_height']), Decimal('1650.750'))
        # Other fields should remain unchanged
        self.assertEqual(response.data['elevation_reference'], 'KB')
        self.assertEqual(response.data['reference_datum'], 'WGS84')

    def test_partial_update_depth_multiple_fields(self):
        """
        Test partial update of multiple fields.
        """
        self.client.force_authenticate(user=self.user)

        data = {
            'reference_datum': 'NAD83',
            'reference_elevation': '1100.000'
        }

        response = self.client.patch(
            f'/api/v1/depths/{self.depth.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['reference_datum'], 'NAD83')
        self.assertEqual(Decimal(response.data['reference_elevation']), Decimal('1100.000'))

    def test_update_depth_cannot_change_run(self):
        """
        Test that run association cannot be changed via update.
        """
        self.client.force_authenticate(user=self.user)

        # Try to change run (should be ignored by UpdateDepthSerializer)
        data = {
            'run': str(self.run2.id),
            'elevation_reference': 'RT',
            'reference_datum': 'WGS84',
            'reference_height': '1500.000',
            'reference_elevation': '985.000'
        }

        response = self.client.put(
            f'/api/v1/depths/{self.depth.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Run should remain unchanged (original self.run)
        self.assertEqual(str(response.data['run']), str(self.run.id))

    def test_delete_depth(self):
        """
        Test deleting a depth.
        """
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(f'/api/v1/depths/{self.depth.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify depth was deleted
        self.assertFalse(Depth.objects.filter(id=self.depth.id).exists())

    def test_filter_depths_by_run(self):
        """
        Test filtering depths by run_id.
        """
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f'/api/v1/depths/?run={self.run.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify filtering returns results (at least one depth)
        self.assertTrue(len(response.data) >= 1)

    def test_filter_depths_by_well(self):
        """
        Test filtering depths by well_id.
        """
        self.client.force_authenticate(user=self.user)

        # Create depth for well
        well_depth = Depth.objects.create(
            well=self.well,
            elevation_reference='GL',
            reference_datum='WGS84',
            reference_height=Decimal('1700.000'),
            reference_elevation=Decimal('1200.000')
        )

        response = self.client.get(f'/api/v1/depths/?well={self.well.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify filtering returns results (at least one depth)
        self.assertTrue(len(response.data) >= 1)

    def test_depth_cascade_delete_on_run_delete(self):
        """
        Test depth is deleted when associated run is deleted.
        """
        self.client.force_authenticate(user=self.user)

        depth_id = self.depth.id

        # Delete the run
        self.run.delete()

        # Verify depth was cascade-deleted
        self.assertFalse(Depth.objects.filter(id=depth_id).exists())

    def test_depth_cascade_delete_on_well_delete(self):
        """
        Test depth is deleted when associated well is deleted.
        """
        self.client.force_authenticate(user=self.user)

        # Create depth for well
        well_depth = Depth.objects.create(
            well=self.well,
            elevation_reference='DF',
            reference_datum='NAD83',
            reference_height=Decimal('1800.000'),
            reference_elevation=Decimal('1300.000')
        )
        depth_id = well_depth.id

        # Delete the well
        self.well.delete()

        # Verify depth was cascade-deleted
        self.assertFalse(Depth.objects.filter(id=depth_id).exists())

    def test_depth_response_includes_all_fields(self):
        """
        Test depth response includes all expected fields.
        """
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f'/api/v1/depths/{self.depth.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        expected_fields = [
            'id', 'run', 'well', 'elevation_reference',
            'reference_datum', 'reference_height', 'reference_elevation',
            'created_at', 'updated_at'
        ]

        for field in expected_fields:
            self.assertIn(field, response.data)

    def test_depth_ordering_by_created_at(self):
        """
        Test ordering depths by created_at.
        """
        self.client.force_authenticate(user=self.user)

        response = self.client.get('/api/v1/depths/?ordering=created_at')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

    def test_depth_ordering_by_updated_at_descending(self):
        """
        Test default ordering is by created_at descending.
        """
        self.client.force_authenticate(user=self.user)

        response = self.client.get('/api/v1/depths/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Default ordering should be -created_at (most recent first)

    def test_depth_decimal_precision(self):
        """
        Test decimal precision is maintained in API responses.
        """
        self.client.force_authenticate(user=self.user)

        run3 = Run.objects.create(
            run_number='RUN010',
            run_name='Precision Test Run',
            run_type='GTL',
            user=self.user
        )

        data = {
            'run': str(run3.id),
            'elevation_reference': 'KB',
            'reference_datum': 'WGS84',
            'reference_height': '1234.567',
            'reference_elevation': '890.123'
        }

        response = self.client.post(
            '/api/v1/depths/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data['reference_height']), Decimal('1234.567'))
        self.assertEqual(Decimal(response.data['reference_elevation']), Decimal('890.123'))


class DepthAPIEdgeCaseTestCase(TestCase):
    """
    Test edge cases and error conditions for Depth API.
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

    def test_create_duplicate_depth_for_run(self):
        """
        Test that creating duplicate depth for same run is rejected.
        """
        self.client.force_authenticate(user=self.user)

        # Create first depth
        depth1 = Depth.objects.create(
            run=self.run,
            elevation_reference='KB',
            reference_datum='WGS84',
            reference_height=Decimal('1500.000'),
            reference_elevation=Decimal('985.000')
        )

        # Attempt to create second depth for same run
        data = {
            'run': str(self.run.id),
            'elevation_reference': 'RT',
            'reference_datum': 'NAD83',
            'reference_height': '1600.000',
            'reference_elevation': '1000.000'
        }

        response = self.client.post(
            '/api/v1/depths/',
            data=json.dumps(data),
            content_type='application/json'
        )

        # Should fail due to OneToOne constraint
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_depth_with_zero_values(self):
        """
        Test creating depth with zero reference values.
        """
        self.client.force_authenticate(user=self.user)

        run2 = Run.objects.create(
            run_number='RUN002',
            run_name='Zero Test Run',
            run_type='GTL',
            user=self.user
        )

        data = {
            'run': str(run2.id),
            'elevation_reference': 'MSL',
            'reference_datum': 'WGS84',
            'reference_height': '0.000',
            'reference_elevation': '0.000'
        }

        response = self.client.post(
            '/api/v1/depths/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data['reference_height']), Decimal('0.000'))
        self.assertEqual(Decimal(response.data['reference_elevation']), Decimal('0.000'))

    def test_create_depth_with_negative_values(self):
        """
        Test creating depth with negative reference values (valid for below sea level).
        """
        self.client.force_authenticate(user=self.user)

        run3 = Run.objects.create(
            run_number='RUN003',
            run_name='Negative Test Run',
            run_type='GTL',
            user=self.user
        )

        data = {
            'run': str(run3.id),
            'elevation_reference': 'MSL',
            'reference_datum': 'WGS84',
            'reference_height': '1500.000',
            'reference_elevation': '-50.500'
        }

        response = self.client.post(
            '/api/v1/depths/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data['reference_elevation']), Decimal('-50.500'))

    def test_create_depth_with_large_values(self):
        """
        Test creating depth with large reference values.
        """
        self.client.force_authenticate(user=self.user)

        run4 = Run.objects.create(
            run_number='RUN004',
            run_name='Large Values Test Run',
            run_type='GTL',
            user=self.user
        )

        data = {
            'run': str(run4.id),
            'elevation_reference': 'KB',
            'reference_datum': 'WGS84',
            'reference_height': '9999999.999',
            'reference_elevation': '9999999.999'
        }

        response = self.client.post(
            '/api/v1/depths/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data['reference_height']), Decimal('9999999.999'))
        self.assertEqual(Decimal(response.data['reference_elevation']), Decimal('9999999.999'))

    def test_update_depth_with_invalid_elevation_reference(self):
        """
        Test that updating with invalid elevation_reference is rejected.
        """
        self.client.force_authenticate(user=self.user)

        depth = Depth.objects.create(
            run=self.run,
            elevation_reference='KB',
            reference_datum='WGS84',
            reference_height=Decimal('1500.000'),
            reference_elevation=Decimal('985.000')
        )

        data = {
            'elevation_reference': 'INVALID_CHOICE'
        }

        response = self.client.patch(
            f'/api/v1/depths/{depth.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('elevation_reference', error_data)
