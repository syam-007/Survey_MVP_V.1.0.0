"""
Integration tests for Survey API endpoints.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from survey_api.models import Run, Survey
import json

User = get_user_model()


class SurveyAPITestCase(TestCase):
    """Test suite for Survey API endpoints"""

    def setUp(self):
        """Set up test fixtures"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='test123',
            role='engineer'
        )

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

        self.survey = Survey.objects.create(
            run=self.run,
            survey_type='Type 1 - GTL',
            status='pending'
        )

        self.client = APIClient()

    def test_list_surveys_authenticated(self):
        """Test that authenticated users can list surveys"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/surveys/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

    def test_list_surveys_unauthenticated(self):
        """Test that unauthenticated requests are rejected"""
        response = self.client.get('/api/v1/surveys/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_survey(self):
        """Test creating survey"""
        self.client.force_authenticate(user=self.user)

        data = {
            'run': str(self.run2.id),
            'survey_type': 'Type 2 - Gyro',
            'status': 'pending'
        }

        response = self.client.post(
            '/api/v1/surveys/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['survey_type'], 'Type 2 - Gyro')
        # Note: CreateSurveySerializer doesn't include required_columns (only SurveySerializer does)

    def test_create_survey_all_types(self):
        """Test creating survey with all survey types"""
        self.client.force_authenticate(user=self.user)

        survey_types = [
            'Type 1 - GTL',
            'Type 2 - Gyro',
            'Type 3 - MWD',
            'Type 4 - Unknown'
        ]

        for i, survey_type in enumerate(survey_types, start=3):
            run = Run.objects.create(
                run_number=f'RUN{i:03d}',
                run_name=f'Test Run {i}',
                run_type='GTL',
                user=self.user
            )

            data = {
                'run': str(run.id),
                'survey_type': survey_type,
                'status': 'pending'
            }

            response = self.client.post(
                '/api/v1/surveys/',
                data=json.dumps(data),
                content_type='application/json'
            )

            self.assertEqual(
                response.status_code,
                status.HTTP_201_CREATED,
                f"Failed for {survey_type}"
            )
            self.assertEqual(response.data['survey_type'], survey_type)

    def test_retrieve_survey(self):
        """Test retrieving a specific survey"""
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f'/api/v1/surveys/{self.survey.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.survey.id))
        self.assertEqual(response.data['survey_type'], 'Type 1 - GTL')
        self.assertIn('required_columns', response.data)

    def test_retrieve_survey_not_found(self):
        """Test 404 response for non-existent survey"""
        self.client.force_authenticate(user=self.user)

        fake_id = '00000000-0000-0000-0000-000000000000'
        response = self.client.get(f'/api/v1/surveys/{fake_id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_survey(self):
        """Test updating survey"""
        self.client.force_authenticate(user=self.user)

        data = {
            'survey_type': 'Type 2 - Gyro',
            'file_path': '/uploads/file.xlsx',
            'status': 'uploaded'
        }

        response = self.client.put(
            f'/api/v1/surveys/{self.survey.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['survey_type'], 'Type 2 - Gyro')
        self.assertEqual(response.data['status'], 'uploaded')

    def test_partial_update_survey(self):
        """Test partial update of survey"""
        self.client.force_authenticate(user=self.user)

        data = {'status': 'validated'}

        response = self.client.patch(
            f'/api/v1/surveys/{self.survey.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'validated')
        self.assertEqual(response.data['survey_type'], 'Type 1 - GTL')

    def test_delete_survey(self):
        """Test deleting a survey"""
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(f'/api/v1/surveys/{self.survey.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Survey.objects.filter(id=self.survey.id).exists())

    def test_filter_surveys_by_run(self):
        """Test filtering surveys by run_id"""
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f'/api/v1/surveys/?run={self.run.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

    def test_filter_surveys_by_survey_type(self):
        """Test filtering surveys by survey_type"""
        self.client.force_authenticate(user=self.user)

        response = self.client.get('/api/v1/surveys/?survey_type=Type 1 - GTL')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

    def test_filter_surveys_by_status(self):
        """Test filtering surveys by status"""
        self.client.force_authenticate(user=self.user)

        response = self.client.get('/api/v1/surveys/?status=pending')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

    def test_required_columns_in_response(self):
        """Test required_columns field is returned for all survey types"""
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f'/api/v1/surveys/{self.survey.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('required_columns', response.data)
        self.assertEqual(
            response.data['required_columns'],
            ['MD', 'Inc', 'Azi', 'w(t)', 'g(t)']
        )

    def test_survey_response_includes_all_fields(self):
        """Test survey response includes all expected fields"""
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f'/api/v1/surveys/{self.survey.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        expected_fields = [
            'id', 'run', 'survey_type', 'file_path', 'status',
            'required_columns', 'created_at', 'updated_at'
        ]

        for field in expected_fields:
            self.assertIn(field, response.data)

    def test_survey_cascade_delete_on_run_delete(self):
        """Test survey is deleted when associated run is deleted"""
        self.client.force_authenticate(user=self.user)

        survey_id = self.survey.id

        # Delete the run
        self.run.delete()

        # Verify survey was cascade-deleted
        self.assertFalse(Survey.objects.filter(id=survey_id).exists())


class SurveyAPIEdgeCaseTestCase(TestCase):
    """Test edge cases for Survey API"""

    def setUp(self):
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

    def test_create_duplicate_survey_for_run(self):
        """Test creating duplicate survey for same run fails"""
        self.client.force_authenticate(user=self.user)

        # Create first survey
        Survey.objects.create(
            run=self.run,
            survey_type='Type 1 - GTL',
            status='pending'
        )

        # Attempt to create second survey for same run
        data = {
            'run': str(self.run.id),
            'survey_type': 'Type 2 - Gyro',
            'status': 'pending'
        }

        response = self.client.post(
            '/api/v1/surveys/',
            data=json.dumps(data),
            content_type='application/json'
        )

        # Should fail due to OneToOne constraint
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_status_transitions(self):
        """Test status transitions"""
        self.client.force_authenticate(user=self.user)

        survey = Survey.objects.create(
            run=self.run,
            survey_type='Type 1 - GTL',
            status='pending'
        )

        statuses = ['uploaded', 'validated', 'calculated']

        for status_value in statuses:
            data = {'status': status_value}
            response = self.client.patch(
                f'/api/v1/surveys/{survey.id}/',
                data=json.dumps(data),
                content_type='application/json'
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['status'], status_value)
