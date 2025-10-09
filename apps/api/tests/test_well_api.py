"""
Integration tests for Well Management API endpoints (Story 2.2).

Tests all 10 acceptance criteria:
AC1: GET /api/v1/wells/ - List wells with pagination
AC2: POST /api/v1/wells/ - Create a new well
AC3: GET /api/v1/wells/{id}/ - Retrieve well with runs
AC4: PUT /api/v1/wells/{id}/ - Full update
AC5: PATCH /api/v1/wells/{id}/ - Partial update
AC6: DELETE /api/v1/wells/{id}/ - Hard delete
AC7: Filtering by well_type
AC8: Search by well_name
AC9: Proper HTTP status codes
AC10: Role-based permissions
"""

import json
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from survey_api.models import User, Well, Run
from datetime import datetime


class WellAPITestCase(TestCase):
    """Test case for Well Management API"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()

        # Create test users with different roles
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpass123',
            role='admin'
        )

        self.engineer_user = User.objects.create_user(
            username='engineer_test',
            email='engineer@test.com',
            password='testpass123',
            role='engineer'
        )

        self.viewer_user = User.objects.create_user(
            username='viewer_test',
            email='viewer@test.com',
            password='testpass123',
            role='viewer'
        )

        # Create test wells
        self.well1 = Well.objects.create(
            well_name='Well Alpha',
            well_type='Oil'
        )

        self.well2 = Well.objects.create(
            well_name='Well Beta',
            well_type='Gas'
        )

        self.well3 = Well.objects.create(
            well_name='Well Gamma',
            well_type='Water'
        )

        # Create test runs associated with wells
        self.run1 = Run.objects.create(
            run_number='RUN001',
            run_name='Test Run 1',
            run_type='MWD',
            well=self.well1,
            user=self.engineer_user
        )

        self.run2 = Run.objects.create(
            run_number='RUN002',
            run_name='Test Run 2',
            run_type='Gyro',
            well=self.well1,
            user=self.engineer_user
        )

        self.run3 = Run.objects.create(
            run_number='RUN003',
            run_name='Test Run 3',
            run_type='MWD',
            well=self.well2,
            user=self.admin_user
        )

        # Authenticate as admin by default
        self.client.force_authenticate(user=self.admin_user)

    # ==================== AUTHENTICATION TESTS ====================

    def test_list_wells_unauthenticated(self):
        """Test that unauthenticated requests are rejected"""
        # Create new client without authentication
        unauthenticated_client = APIClient()
        response = unauthenticated_client.get('/api/v1/wells/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_well_unauthenticated(self):
        """Test that unauthenticated create requests are rejected"""
        # Create new client without authentication
        unauthenticated_client = APIClient()
        data = {'well_name': 'New Well', 'well_type': 'Oil'}
        response = unauthenticated_client.post('/api/v1/wells/',
                                               data=json.dumps(data),
                                               content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ==================== AUTHORIZATION/PERMISSION TESTS ====================

    def test_viewer_can_list_wells(self):
        """AC10: Viewers can read wells"""
        self.client.force_authenticate(user=self.viewer_user)
        response = self.client.get('/api/v1/wells/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    def test_viewer_can_retrieve_well(self):
        """AC10: Viewers can retrieve well details"""
        self.client.force_authenticate(user=self.viewer_user)
        response = self.client.get(f'/api/v1/wells/{self.well1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['well_name'], 'Well Alpha')

    def test_viewer_cannot_create_well(self):
        """AC10: Viewers cannot create wells"""
        self.client.force_authenticate(user=self.viewer_user)
        data = {'well_name': 'New Well', 'well_type': 'Oil'}
        response = self.client.post('/api/v1/wells/',
                                    data=json.dumps(data),
                                    content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_cannot_update_well(self):
        """AC10: Viewers cannot update wells"""
        self.client.force_authenticate(user=self.viewer_user)
        data = {'well_name': 'Updated Well'}
        response = self.client.patch(f'/api/v1/wells/{self.well1.id}/',
                                     data=json.dumps(data),
                                     content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_cannot_delete_well(self):
        """AC10: Viewers cannot delete wells"""
        self.client.force_authenticate(user=self.viewer_user)
        response = self.client.delete(f'/api/v1/wells/{self.well1.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_engineer_can_create_well(self):
        """AC10: Engineers can create wells"""
        self.client.force_authenticate(user=self.engineer_user)
        data = {
            'well_name': 'Engineer Well',
            'well_type': 'Gas'
        }
        response = self.client.post('/api/v1/wells/',
                                    data=json.dumps(data),
                                    content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['well_name'], 'Engineer Well')

    def test_admin_can_delete_well(self):
        """AC10: Admins can delete wells"""
        # Create a well to delete
        well_to_delete = Well.objects.create(
            well_name='Delete Me',
            well_type='Other'
        )

        response = self.client.delete(f'/api/v1/wells/{well_to_delete.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify hard delete
        self.assertFalse(Well.objects.filter(id=well_to_delete.id).exists())

    # ==================== LIST WELLS TESTS (AC1) ====================

    def test_list_wells_success(self):
        """AC1: GET /api/v1/wells/ returns paginated list"""
        response = self.client.get('/api/v1/wells/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertEqual(response.data['count'], 3)
        self.assertEqual(len(response.data['results']), 3)

    def test_list_wells_structure(self):
        """AC1: List response includes id, well_name, well_type, runs_count"""
        response = self.client.get('/api/v1/wells/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        well_data = response.data['results'][0]

        # Check required fields (WellListSerializer)
        self.assertIn('id', well_data)
        self.assertIn('well_name', well_data)
        self.assertIn('well_type', well_data)
        self.assertIn('created_at', well_data)
        self.assertIn('updated_at', well_data)
        self.assertIn('runs_count', well_data)

        # Should NOT include nested runs in list view
        self.assertNotIn('runs', well_data)

    def test_list_wells_runs_count(self):
        """AC1: List response includes accurate runs_count"""
        response = self.client.get('/api/v1/wells/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Find well1 in results
        well1_data = next((w for w in response.data['results'] if w['id'] == str(self.well1.id)), None)
        self.assertIsNotNone(well1_data)
        self.assertEqual(well1_data['runs_count'], 2)  # well1 has 2 runs

        # Find well2 in results
        well2_data = next((w for w in response.data['results'] if w['id'] == str(self.well2.id)), None)
        self.assertIsNotNone(well2_data)
        self.assertEqual(well2_data['runs_count'], 1)  # well2 has 1 run

        # Find well3 in results
        well3_data = next((w for w in response.data['results'] if w['id'] == str(self.well3.id)), None)
        self.assertIsNotNone(well3_data)
        self.assertEqual(well3_data['runs_count'], 0)  # well3 has 0 runs

    def test_list_wells_pagination(self):
        """AC1: List supports pagination"""
        # Create additional wells to test pagination
        for i in range(25):
            Well.objects.create(
                well_name=f'Well {i}',
                well_type='Oil'
            )

        response = self.client.get('/api/v1/wells/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('next', response.data)
        self.assertEqual(len(response.data['results']), 20)  # Default page size

    def test_list_wells_ordering(self):
        """AC1: List orders by created_at descending by default"""
        response = self.client.get('/api/v1/wells/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']

        # Verify descending order by created_at
        for i in range(len(results) - 1):
            current = datetime.fromisoformat(results[i]['created_at'].replace('Z', '+00:00'))
            next_item = datetime.fromisoformat(results[i + 1]['created_at'].replace('Z', '+00:00'))
            self.assertGreaterEqual(current, next_item)

    # ==================== CREATE WELL TESTS (AC2) ====================

    def test_create_well_success(self):
        """AC2: POST /api/v1/wells/ creates a new well"""
        data = {
            'well_name': 'New Well',
            'well_type': 'Oil'
        }
        response = self.client.post('/api/v1/wells/',
                                    data=json.dumps(data),
                                    content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['well_name'], 'New Well')
        self.assertEqual(response.data['well_type'], 'Oil')
        self.assertIn('id', response.data)
        self.assertIn('created_at', response.data)

        # Verify well was created in database
        self.assertTrue(Well.objects.filter(well_name='New Well').exists())

    def test_create_well_all_types(self):
        """AC2: Can create wells with all valid types"""
        valid_types = ['Oil', 'Gas', 'Water', 'Other']

        for well_type in valid_types:
            data = {
                'well_name': f'Well {well_type}',
                'well_type': well_type
            }
            response = self.client.post('/api/v1/wells/',
                                        data=json.dumps(data),
                                        content_type='application/json')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(response.data['well_type'], well_type)

    def test_create_well_duplicate_name(self):
        """AC2: Cannot create well with duplicate name"""
        data = {
            'well_name': 'Well Alpha',  # Duplicate
            'well_type': 'Oil'
        }
        response = self.client.post('/api/v1/wells/',
                                    data=json.dumps(data),
                                    content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('well_name', error_data)

    def test_create_well_invalid_type(self):
        """AC2: Cannot create well with invalid type"""
        data = {
            'well_name': 'Invalid Well',
            'well_type': 'InvalidType'
        }
        response = self.client.post('/api/v1/wells/',
                                    data=json.dumps(data),
                                    content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('well_type', error_data)

    def test_create_well_missing_required_fields(self):
        """AC2: Cannot create well without required fields"""
        data = {}
        response = self.client.post('/api/v1/wells/',
                                    data=json.dumps(data),
                                    content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('well_name', error_data)
        self.assertIn('well_type', error_data)

    def test_create_well_empty_name(self):
        """AC2: Cannot create well with empty name"""
        data = {
            'well_name': '   ',
            'well_type': 'Oil'
        }
        response = self.client.post('/api/v1/wells/',
                                    data=json.dumps(data),
                                    content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('well_name', error_data)

    def test_create_well_name_too_long(self):
        """AC2: Cannot create well with name > 255 characters"""
        data = {
            'well_name': 'A' * 256,
            'well_type': 'Oil'
        }
        response = self.client.post('/api/v1/wells/',
                                    data=json.dumps(data),
                                    content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('well_name', error_data)

    # ==================== RETRIEVE WELL TESTS (AC3) ====================

    def test_retrieve_well_success(self):
        """AC3: GET /api/v1/wells/{id}/ retrieves specific well"""
        response = self.client.get(f'/api/v1/wells/{self.well1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.well1.id))
        self.assertEqual(response.data['well_name'], 'Well Alpha')
        self.assertEqual(response.data['well_type'], 'Oil')

    def test_retrieve_well_includes_runs(self):
        """AC3: Retrieve includes nested runs list"""
        response = self.client.get(f'/api/v1/wells/{self.well1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('runs', response.data)
        self.assertIn('runs_count', response.data)
        self.assertEqual(response.data['runs_count'], 2)
        self.assertEqual(len(response.data['runs']), 2)

        # Check run structure (RunSummarySerializer)
        run_data = response.data['runs'][0]
        self.assertIn('id', run_data)
        self.assertIn('run_number', run_data)
        self.assertIn('run_name', run_data)
        self.assertIn('run_type', run_data)
        self.assertIn('created_at', run_data)

    def test_retrieve_well_not_found(self):
        """AC3: Returns 404 for non-existent well"""
        from uuid import uuid4
        fake_id = uuid4()
        response = self.client.get(f'/api/v1/wells/{fake_id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    # ==================== UPDATE WELL TESTS (AC4, AC5) ====================

    def test_update_well_full_success(self):
        """AC4: PUT /api/v1/wells/{id}/ fully updates well"""
        data = {
            'well_name': 'Updated Well Alpha',
            'well_type': 'Gas'
        }
        response = self.client.put(f'/api/v1/wells/{self.well1.id}/',
                                   data=json.dumps(data),
                                   content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['well_name'], 'Updated Well Alpha')
        self.assertEqual(response.data['well_type'], 'Gas')

        # Verify in database
        self.well1.refresh_from_db()
        self.assertEqual(self.well1.well_name, 'Updated Well Alpha')
        self.assertEqual(self.well1.well_type, 'Gas')

    def test_update_well_partial_success(self):
        """AC5: PATCH /api/v1/wells/{id}/ partially updates well"""
        data = {'well_name': 'Patched Well Alpha'}
        response = self.client.patch(f'/api/v1/wells/{self.well1.id}/',
                                     data=json.dumps(data),
                                     content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['well_name'], 'Patched Well Alpha')
        self.assertEqual(response.data['well_type'], 'Oil')  # Unchanged

        # Verify in database
        self.well1.refresh_from_db()
        self.assertEqual(self.well1.well_name, 'Patched Well Alpha')
        self.assertEqual(self.well1.well_type, 'Oil')

    def test_update_well_duplicate_name(self):
        """AC4: Cannot update well to duplicate name"""
        data = {
            'well_name': 'Well Beta',  # Already exists
            'well_type': 'Oil'
        }
        response = self.client.put(f'/api/v1/wells/{self.well1.id}/',
                                   data=json.dumps(data),
                                   content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('well_name', error_data)

    def test_update_well_invalid_type(self):
        """AC4: Cannot update well with invalid type"""
        data = {
            'well_name': 'Updated Well',
            'well_type': 'InvalidType'
        }
        response = self.client.put(f'/api/v1/wells/{self.well1.id}/',
                                   data=json.dumps(data),
                                   content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_data = response.data.get('details', response.data)
        self.assertIn('well_type', error_data)

    def test_update_well_not_found(self):
        """AC4: Returns 404 when updating non-existent well"""
        from uuid import uuid4
        fake_id = uuid4()
        data = {'well_name': 'Updated Well', 'well_type': 'Oil'}
        response = self.client.put(f'/api/v1/wells/{fake_id}/',
                                   data=json.dumps(data),
                                   content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ==================== DELETE WELL TESTS (AC6) ====================

    def test_delete_well_success(self):
        """AC6: DELETE /api/v1/wells/{id}/ hard deletes well"""
        well_id = self.well3.id

        response = self.client.delete(f'/api/v1/wells/{well_id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify hard delete - well should not exist
        self.assertFalse(Well.objects.filter(id=well_id).exists())

    def test_delete_well_with_runs_cascade(self):
        """AC6: Deleting well sets runs' well field to NULL (CASCADE SET_NULL)"""
        well_id = self.well1.id
        run1_id = self.run1.id
        run2_id = self.run2.id

        response = self.client.delete(f'/api/v1/wells/{well_id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify well is deleted
        self.assertFalse(Well.objects.filter(id=well_id).exists())

        # Verify runs still exist but well field is NULL
        self.run1.refresh_from_db()
        self.run2.refresh_from_db()
        self.assertIsNone(self.run1.well)
        self.assertIsNone(self.run2.well)

    def test_delete_well_not_found(self):
        """AC6: Returns 404 when deleting non-existent well"""
        from uuid import uuid4
        fake_id = uuid4()
        response = self.client.delete(f'/api/v1/wells/{fake_id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ==================== FILTERING TESTS (AC7) ====================

    def test_filter_by_well_type_oil(self):
        """AC7: Filter by well_type=Oil"""
        response = self.client.get('/api/v1/wells/?well_type=Oil')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertTrue(all(w['well_type'] == 'Oil' for w in results))
        self.assertEqual(len(results), 1)  # Only well1

    def test_filter_by_well_type_gas(self):
        """AC7: Filter by well_type=Gas"""
        response = self.client.get('/api/v1/wells/?well_type=Gas')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertTrue(all(w['well_type'] == 'Gas' for w in results))
        self.assertEqual(len(results), 1)  # Only well2

    def test_filter_by_well_type_water(self):
        """AC7: Filter by well_type=Water"""
        response = self.client.get('/api/v1/wells/?well_type=Water')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertTrue(all(w['well_type'] == 'Water' for w in results))
        self.assertEqual(len(results), 1)  # Only well3

    # ==================== SEARCH TESTS (AC8) ====================

    def test_search_by_well_name(self):
        """AC8: Search by well_name"""
        response = self.client.get('/api/v1/wells/?search=Alpha')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['well_name'], 'Well Alpha')

    def test_search_case_insensitive(self):
        """AC8: Search is case-insensitive"""
        response = self.client.get('/api/v1/wells/?search=alpha')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['well_name'], 'Well Alpha')

    def test_search_partial_match(self):
        """AC8: Search supports partial matching"""
        response = self.client.get('/api/v1/wells/?search=Well')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(len(results), 3)  # All wells contain 'Well'

    def test_search_no_results(self):
        """AC8: Search returns empty list when no matches"""
        response = self.client.get('/api/v1/wells/?search=NonExistent')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(len(results), 0)

    # ==================== STATISTICS ENDPOINT TESTS ====================

    def test_statistics_endpoint_success(self):
        """Test GET /api/v1/wells/statistics/"""
        response = self.client.get('/api/v1/wells/statistics/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_wells', response.data)
        self.assertIn('wells_by_type', response.data)
        self.assertIn('wells_with_runs', response.data)
        self.assertIn('wells_without_runs', response.data)

        self.assertEqual(response.data['total_wells'], 3)
        self.assertEqual(response.data['wells_with_runs'], 2)  # well1, well2
        self.assertEqual(response.data['wells_without_runs'], 1)  # well3

    def test_statistics_viewer_access(self):
        """Test viewers can access statistics"""
        self.client.force_authenticate(user=self.viewer_user)
        response = self.client.get('/api/v1/wells/statistics/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ==================== STATUS CODE TESTS (AC9) ====================

    def test_proper_status_codes(self):
        """AC9: Verify proper HTTP status codes for all operations"""
        # 200 OK for list
        response = self.client.get('/api/v1/wells/')
        self.assertEqual(response.status_code, 200)

        # 201 Created for create
        data = {'well_name': 'Status Test Well', 'well_type': 'Oil'}
        response = self.client.post('/api/v1/wells/',
                                    data=json.dumps(data),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 201)

        # 200 OK for retrieve
        response = self.client.get(f'/api/v1/wells/{self.well1.id}/')
        self.assertEqual(response.status_code, 200)

        # 200 OK for update
        data = {'well_name': 'Updated', 'well_type': 'Gas'}
        response = self.client.put(f'/api/v1/wells/{self.well1.id}/',
                                   data=json.dumps(data),
                                   content_type='application/json')
        self.assertEqual(response.status_code, 200)

        # 204 No Content for delete
        response = self.client.delete(f'/api/v1/wells/{self.well1.id}/')
        self.assertEqual(response.status_code, 204)

        # 404 Not Found for deleted well
        response = self.client.get(f'/api/v1/wells/{self.well1.id}/')
        self.assertEqual(response.status_code, 404)
