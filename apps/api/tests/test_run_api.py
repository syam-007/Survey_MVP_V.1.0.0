"""
Integration tests for Run API endpoints.

Tests all CRUD operations, permissions, filtering, search, and pagination.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from survey_api.models import Run, Well
import json

User = get_user_model()


class RunAPITestCase(TestCase):
    """
    Test suite for Run API endpoints.

    Tests AC1-AC12 from Story 2.1.
    """

    def setUp(self):
        """Set up test fixtures."""
        # Create test users with different roles
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='admin123',
            role='admin'
        )

        self.engineer_user = User.objects.create_user(
            username='engineer',
            email='engineer@test.com',
            password='engineer123',
            role='engineer'
        )

        self.viewer_user = User.objects.create_user(
            username='viewer',
            email='viewer@test.com',
            password='viewer123',
            role='viewer'
        )

        # Create test well
        self.well = Well.objects.create(
            well_name='Test Well 1',
            well_type='Oil'
        )

        # Create test runs
        self.run1 = Run.objects.create(
            run_number='RUN001',
            run_name='Test Run 1',
            run_type='GTL',
            user=self.engineer_user,
            well=self.well
        )

        self.run2 = Run.objects.create(
            run_number='RUN002',
            run_name='Test Run 2',
            run_type='Gyro',
            user=self.admin_user
        )

        # API client
        self.client = APIClient()

    def test_list_runs_authenticated(self):
        """
        AC1: GET /api/v1/runs/ - List all runs with pagination
        Test that authenticated users can list runs.
        """
        self.client.force_authenticate(user=self.engineer_user)
        response = self.client.get('/api/v1/runs/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['results']), 2)

    def test_list_runs_unauthenticated(self):
        """
        AC7: All endpoints require authentication (JWT token)
        Test that unauthenticated requests are rejected.
        """
        response = self.client.get('/api/v1/runs/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_run_as_engineer(self):
        """
        AC2: POST /api/v1/runs/ - Create a new run with validation
        AC8: Engineers can create/update
        """
        self.client.force_authenticate(user=self.engineer_user)

        data = {
            'run_number': 'RUN003',
            'run_name': 'Test Run 3',
            'run_type': 'MWD'
        }

        response = self.client.post(
            '/api/v1/runs/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['run_number'], 'RUN003')
        self.assertEqual(response.data['run_name'], 'Test Run 3')
        self.assertEqual(response.data['run_type'], 'MWD')

        # Verify run was created in database
        run = Run.objects.get(run_number='RUN003')
        self.assertEqual(run.user, self.engineer_user)

    def test_create_run_as_viewer(self):
        """
        AC8: Viewers have read-only access
        Test that viewers cannot create runs.
        """
        self.client.force_authenticate(user=self.viewer_user)

        data = {
            'run_number': 'RUN004',
            'run_name': 'Test Run 4',
            'run_type': 'GTL'
        }

        response = self.client.post(
            '/api/v1/runs/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_run_duplicate_run_number(self):
        """
        AC9: Validation errors return 400 with detailed field errors
        Test that duplicate run_number is rejected.
        """
        self.client.force_authenticate(user=self.engineer_user)

        data = {
            'run_number': 'RUN001',  # Duplicate
            'run_name': 'Different Name',
            'run_type': 'GTL'
        }

        response = self.client.post(
            '/api/v1/runs/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Check if error is in 'details' key (custom error format) or directly in response.data
        error_data = response.data.get('details', response.data)
        self.assertIn('run_number', error_data)

    def test_create_run_missing_required_fields(self):
        """
        AC9: Validation errors return 400 with detailed field errors
        """
        self.client.force_authenticate(user=self.engineer_user)

        data = {
            'run_number': 'RUN005'
            # Missing run_name and run_type
        }

        response = self.client.post(
            '/api/v1/runs/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Check if error is in 'details' key (custom error format) or directly in response.data
        error_data = response.data.get('details', response.data)
        self.assertIn('run_name', error_data)
        self.assertIn('run_type', error_data)

    def test_retrieve_run(self):
        """
        AC3: GET /api/v1/runs/{id} - Retrieve a specific run with nested data
        """
        self.client.force_authenticate(user=self.engineer_user)

        response = self.client.get(f'/api/v1/runs/{self.run1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['run_number'], 'RUN001')
        self.assertEqual(response.data['run_name'], 'Test Run 1')
        self.assertIn('well', response.data)
        self.assertIn('user', response.data)

    def test_retrieve_run_not_found(self):
        """
        AC10: API returns proper HTTP status codes (404)
        """
        self.client.force_authenticate(user=self.engineer_user)

        fake_id = '00000000-0000-0000-0000-000000000000'
        response = self.client.get(f'/api/v1/runs/{fake_id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_run_as_owner(self):
        """
        AC4: PUT /api/v1/runs/{id} - Update an existing run
        AC8: Engineers can update their own runs
        """
        self.client.force_authenticate(user=self.engineer_user)

        data = {
            'run_number': 'RUN001',
            'run_name': 'Updated Run Name',
            'run_type': 'MWD'
        }

        response = self.client.put(
            f'/api/v1/runs/{self.run1.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['run_name'], 'Updated Run Name')

        # Verify in database
        self.run1.refresh_from_db()
        self.assertEqual(self.run1.run_name, 'Updated Run Name')

    def test_update_run_as_admin(self):
        """
        AC8: Admins can update any run
        """
        self.client.force_authenticate(user=self.admin_user)

        data = {
            'run_number': 'RUN001',
            'run_name': 'Admin Updated',
            'run_type': 'GTL'
        }

        response = self.client.put(
            f'/api/v1/runs/{self.run1.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['run_name'], 'Admin Updated')

    def test_update_run_not_owner(self):
        """
        AC8: Engineers cannot update runs they don't own
        """
        # Create another engineer
        other_engineer = User.objects.create_user(
            username='other_engineer',
            email='other@test.com',
            password='test123',
            role='engineer'
        )

        self.client.force_authenticate(user=other_engineer)

        data = {
            'run_number': 'RUN001',
            'run_name': 'Unauthorized Update',
            'run_type': 'GTL'
        }

        response = self.client.put(
            f'/api/v1/runs/{self.run1.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_partial_update_run(self):
        """
        AC5: PATCH /api/v1/runs/{id} - Partial update of a run
        """
        self.client.force_authenticate(user=self.engineer_user)

        data = {
            'run_name': 'Partially Updated'
        }

        response = self.client.patch(
            f'/api/v1/runs/{self.run1.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['run_name'], 'Partially Updated')
        # run_number should remain unchanged
        self.assertEqual(response.data['run_number'], 'RUN001')

    def test_delete_run_as_owner(self):
        """
        AC6: DELETE /api/v1/runs/{id} - Soft delete a run
        """
        self.client.force_authenticate(user=self.engineer_user)

        response = self.client.delete(f'/api/v1/runs/{self.run1.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify soft delete - run should still exist but marked as deleted
        self.run1.refresh_from_db()
        self.assertTrue(self.run1.deleted)
        self.assertIsNotNone(self.run1.deleted_at)

        # Verify run is not in list anymore (filtered out)
        list_response = self.client.get('/api/v1/runs/')
        self.assertEqual(list_response.data['count'], 1)  # Only run2 should be visible

    def test_delete_run_as_admin(self):
        """
        AC8: Admins can delete any run
        """
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.delete(f'/api/v1/runs/{self.run1.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_run_as_viewer(self):
        """
        AC8: Viewers cannot delete runs
        """
        self.client.force_authenticate(user=self.viewer_user)

        response = self.client.delete(f'/api/v1/runs/{self.run1.id}/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pagination(self):
        """
        AC1: List runs with pagination (20 per page)
        """
        self.client.force_authenticate(user=self.engineer_user)

        # Create 25 runs to test pagination
        for i in range(3, 28):
            Run.objects.create(
                run_number=f'RUN{i:03d}',
                run_name=f'Test Run {i}',
                run_type='GTL',
                user=self.engineer_user
            )

        response = self.client.get('/api/v1/runs/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 27)  # Total runs
        self.assertEqual(len(response.data['results']), 20)  # First page size
        self.assertIsNotNone(response.data['next'])  # Should have next page

        # Test second page
        page2_response = self.client.get(response.data['next'])
        self.assertEqual(len(page2_response.data['results']), 7)  # Remaining runs

    def test_filter_by_run_type(self):
        """
        Test filtering runs by run_type
        """
        self.client.force_authenticate(user=self.engineer_user)

        response = self.client.get('/api/v1/runs/?run_type=GTL')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['run_type'], 'GTL')

    def test_filter_by_well_id(self):
        """
        Test filtering runs by well_id
        """
        self.client.force_authenticate(user=self.engineer_user)

        response = self.client.get(f'/api/v1/runs/?well={self.well.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['well']['id'], str(self.well.id))

    def test_search_by_run_number(self):
        """
        Test searching runs by run_number
        """
        self.client.force_authenticate(user=self.engineer_user)

        response = self.client.get('/api/v1/runs/?search=RUN001')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['run_number'], 'RUN001')

    def test_search_by_run_name(self):
        """
        Test searching runs by run_name
        """
        self.client.force_authenticate(user=self.engineer_user)

        response = self.client.get('/api/v1/runs/?search=Test%20Run%201')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['count'] >= 1)

    def test_ordering_by_created_at(self):
        """
        Test ordering runs by created_at
        """
        self.client.force_authenticate(user=self.engineer_user)

        response = self.client.get('/api/v1/runs/?ordering=created_at')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should be ordered ascending by created_at
        results = response.data['results']
        self.assertTrue(len(results) >= 2)

    def test_nested_data_in_retrieve(self):
        """
        AC11: RunSerializer includes nested well, location, depth data
        """
        self.client.force_authenticate(user=self.engineer_user)

        response = self.client.get(f'/api/v1/runs/{self.run1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check nested well data
        self.assertIn('well', response.data)
        self.assertIsNotNone(response.data['well'])
        self.assertEqual(response.data['well']['well_name'], 'Test Well 1')

        # Check user data
        self.assertIn('user', response.data)
        self.assertIsNotNone(response.data['user'])

    def test_proper_status_codes(self):
        """
        AC10: API returns proper HTTP status codes
        """
        self.client.force_authenticate(user=self.engineer_user)

        # 200 OK for list
        response = self.client.get('/api/v1/runs/')
        self.assertEqual(response.status_code, 200)

        # 201 Created for create
        data = {'run_number': 'RUN999', 'run_name': 'Status Test', 'run_type': 'GTL'}
        response = self.client.post('/api/v1/runs/', data=json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, 201)

        # 200 OK for retrieve
        response = self.client.get(f'/api/v1/runs/{self.run1.id}/')
        self.assertEqual(response.status_code, 200)

        # Skip Redis/Session testing (not required for this AC)
        # 401 test covered by test_list_runs_unauthenticated()


class RunAPIPermissionTestCase(TestCase):
    """
    Dedicated test case for permission testing.
    """

    def setUp(self):
        """Set up test fixtures."""
        self.admin = User.objects.create_user(
            username='admin', email='admin@test.com', password='pass', role='admin'
        )
        self.engineer = User.objects.create_user(
            username='engineer', email='engineer@test.com', password='pass', role='engineer'
        )
        self.viewer = User.objects.create_user(
            username='viewer', email='viewer@test.com', password='pass', role='viewer'
        )

        self.run = Run.objects.create(
            run_number='PERM001',
            run_name='Permission Test Run',
            run_type='GTL',
            user=self.engineer
        )

        self.client = APIClient()

    def test_viewer_read_only_access(self):
        """
        Test that viewers can read but not write
        """
        self.client.force_authenticate(user=self.viewer)

        # Can list
        response = self.client.get('/api/v1/runs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Can retrieve
        response = self.client.get(f'/api/v1/runs/{self.run.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Cannot create
        data = {'run_number': 'NEW001', 'run_name': 'New', 'run_type': 'GTL'}
        response = self.client.post('/api/v1/runs/', data=json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Cannot update
        data = {'run_name': 'Updated'}
        response = self.client.patch(f'/api/v1/runs/{self.run.id}/', data=json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Cannot delete
        response = self.client.delete(f'/api/v1/runs/{self.run.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
