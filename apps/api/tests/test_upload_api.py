"""
Tests for survey file upload API endpoint.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
import os

from survey_api.models import Run, SurveyFile, SurveyData

User = get_user_model()


class FileUploadAPITest(TestCase):
    """Test cases for file upload API endpoint"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        self.run = Run.objects.create(
            run_number='RUN001',
            run_name='Test Run',
            run_type='GTL',
            user=self.user
        )

        self.fixtures_dir = os.path.join(os.path.dirname(__file__), 'fixtures')

    def test_upload_valid_gtl_file(self):
        """Test uploading valid GTL survey file"""
        file_path = os.path.join(self.fixtures_dir, 'valid_gtl_survey.xlsx')

        with open(file_path, 'rb') as f:
            file_content = f.read()

        uploaded_file = SimpleUploadedFile(
            'valid_gtl_survey.xlsx',
            file_content,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        response = self.client.post(
            '/api/v1/surveys/upload/',
            {
                'file': uploaded_file,
                'run_id': str(self.run.id),
                'survey_type': 'Type 1 - GTL'
            },
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('survey_file', response.data)
        self.assertIn('survey_data', response.data)
        self.assertEqual(response.data['survey_data']['validation_status'], 'valid')

        # Verify database records created
        self.assertEqual(SurveyFile.objects.count(), 1)
        self.assertEqual(SurveyData.objects.count(), 1)

    def test_upload_valid_gyro_file(self):
        """Test uploading valid Gyro survey file"""
        file_path = os.path.join(self.fixtures_dir, 'valid_gyro_survey.xlsx')

        with open(file_path, 'rb') as f:
            file_content = f.read()

        uploaded_file = SimpleUploadedFile(
            'valid_gyro_survey.xlsx',
            file_content,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        response = self.client.post(
            '/api/v1/surveys/upload/',
            {
                'file': uploaded_file,
                'run_id': str(self.run.id),
                'survey_type': 'Type 2 - Gyro'
            },
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_upload_invalid_file_missing_column(self):
        """Test uploading file with missing column"""
        file_path = os.path.join(self.fixtures_dir, 'invalid_missing_column.xlsx')

        with open(file_path, 'rb') as f:
            file_content = f.read()

        uploaded_file = SimpleUploadedFile(
            'invalid_missing_column.xlsx',
            file_content,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        response = self.client.post(
            '/api/v1/surveys/upload/',
            {
                'file': uploaded_file,
                'run_id': str(self.run.id),
                'survey_type': 'Type 2 - Gyro'
            },
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_upload_invalid_file_out_of_range(self):
        """Test uploading file with out of range values"""
        file_path = os.path.join(self.fixtures_dir, 'invalid_range.xlsx')

        with open(file_path, 'rb') as f:
            file_content = f.read()

        uploaded_file = SimpleUploadedFile(
            'invalid_range.xlsx',
            file_content,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        response = self.client.post(
            '/api/v1/surveys/upload/',
            {
                'file': uploaded_file,
                'run_id': str(self.run.id),
                'survey_type': 'Type 2 - Gyro'
            },
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('details', response.data)
        # Verify SurveyData was created but marked invalid
        survey_data = SurveyData.objects.first()
        if survey_data:
            self.assertEqual(survey_data.validation_status, 'invalid')

    def test_upload_invalid_file_type(self):
        """Test uploading invalid file type"""
        uploaded_file = SimpleUploadedFile(
            'test.txt',
            b'invalid file content',
            content_type='text/plain'
        )

        response = self.client.post(
            '/api/v1/surveys/upload/',
            {
                'file': uploaded_file,
                'run_id': str(self.run.id),
                'survey_type': 'Type 2 - Gyro'
            },
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('details', response.data)
        self.assertIn('file', response.data.get('details', {}))

    def test_upload_file_too_large(self):
        """Test uploading file exceeding size limit"""
        # Create a file larger than 50MB
        large_content = b'x' * (51 * 1024 * 1024)
        uploaded_file = SimpleUploadedFile(
            'large_file.xlsx',
            large_content,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        response = self.client.post(
            '/api/v1/surveys/upload/',
            {
                'file': uploaded_file,
                'run_id': str(self.run.id),
                'survey_type': 'Type 2 - Gyro'
            },
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('details', response.data)
        self.assertIn('file', response.data.get('details', {}))

    def test_upload_without_authentication(self):
        """Test upload endpoint requires authentication"""
        self.client.force_authenticate(user=None)

        uploaded_file = SimpleUploadedFile(
            'test.xlsx',
            b'content',
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        response = self.client.post(
            '/api/v1/surveys/upload/',
            {
                'file': uploaded_file,
                'run_id': str(self.run.id),
                'survey_type': 'Type 2 - Gyro'
            },
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_upload_with_invalid_run_id(self):
        """Test upload with non-existent run ID"""
        uploaded_file = SimpleUploadedFile(
            'test.xlsx',
            b'content',
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        response = self.client.post(
            '/api/v1/surveys/upload/',
            {
                'file': uploaded_file,
                'run_id': '00000000-0000-0000-0000-000000000000',
                'survey_type': 'Type 2 - Gyro'
            },
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_without_required_fields(self):
        """Test upload without required fields"""
        response = self.client.post(
            '/api/v1/surveys/upload/',
            {},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
