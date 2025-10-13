"""
Tests for Survey Serializers.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from survey_api.models import Run, Survey
from survey_api.serializers import (
    SurveySerializer,
    CreateSurveySerializer,
    UpdateSurveySerializer
)

User = get_user_model()


class SurveySerializerTest(TestCase):
    """Test cases for SurveySerializer"""

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
        self.survey = Survey.objects.create(
            run=self.run,
            survey_type='Type 1 - GTL',
            status='pending'
        )

    def test_survey_serializer_fields(self):
        """Test SurveySerializer includes all fields"""
        serializer = SurveySerializer(instance=self.survey)
        data = serializer.data

        expected_fields = [
            'id', 'run', 'survey_type', 'file_path', 'status',
            'required_columns', 'created_at', 'updated_at'
        ]
        for field in expected_fields:
            self.assertIn(field, data)

    def test_survey_serializer_read_only_fields(self):
        """Test read-only fields are not writable"""
        serializer = SurveySerializer()
        read_only_fields = ['id', 'created_at', 'updated_at']
        for field in read_only_fields:
            self.assertTrue(serializer.fields[field].read_only)

    def test_required_columns_type1_gtl(self):
        """Test required_columns for Type 1 - GTL"""
        survey = Survey.objects.create(
            run=Run.objects.create(
                run_number='RUN002',
                run_name='Test Run 2',
                run_type='GTL',
                user=self.user
            ),
            survey_type='Type 1 - GTL',
            status='pending'
        )
        serializer = SurveySerializer(instance=survey)
        self.assertEqual(
            serializer.data['required_columns'],
            ['MD', 'Inc', 'Azi', 'w(t)', 'g(t)']
        )

    def test_required_columns_type2_gyro(self):
        """Test required_columns for Type 2 - Gyro"""
        survey = Survey.objects.create(
            run=Run.objects.create(
                run_number='RUN003',
                run_name='Test Run 3',
                run_type='Gyro',
                user=self.user
            ),
            survey_type='Type 2 - Gyro',
            status='pending'
        )
        serializer = SurveySerializer(instance=survey)
        self.assertEqual(
            serializer.data['required_columns'],
            ['MD', 'Inc', 'Azi']
        )

    def test_required_columns_type3_mwd(self):
        """Test required_columns for Type 3 - MWD"""
        survey = Survey.objects.create(
            run=Run.objects.create(
                run_number='RUN004',
                run_name='Test Run 4',
                run_type='MWD',
                user=self.user
            ),
            survey_type='Type 3 - MWD',
            status='pending'
        )
        serializer = SurveySerializer(instance=survey)
        self.assertEqual(
            serializer.data['required_columns'],
            ['MD', 'Inc', 'Azi']
        )

    def test_required_columns_type4_unknown(self):
        """Test required_columns for Type 4 - Unknown"""
        survey = Survey.objects.create(
            run=Run.objects.create(
                run_number='RUN005',
                run_name='Test Run 5',
                run_type='Unknown',
                user=self.user
            ),
            survey_type='Type 4 - Unknown',
            status='pending'
        )
        serializer = SurveySerializer(instance=survey)
        self.assertEqual(
            serializer.data['required_columns'],
            ['MD', 'Inc', 'Azi']
        )


class CreateSurveySerializerTest(TestCase):
    """Test cases for CreateSurveySerializer"""

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

    def test_create_survey_valid(self):
        """Test creating survey with valid data"""
        data = {
            'run': self.run.id,
            'survey_type': 'Type 1 - GTL',
            'status': 'pending'
        }
        serializer = CreateSurveySerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_create_survey_with_file_path(self):
        """Test creating survey with file_path"""
        data = {
            'run': self.run.id,
            'survey_type': 'Type 2 - Gyro',
            'file_path': '/uploads/survey_file.xlsx',
            'status': 'uploaded'
        }
        serializer = CreateSurveySerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        survey = serializer.save()
        self.assertEqual(survey.file_path, '/uploads/survey_file.xlsx')

    def test_create_survey_minimal_fields(self):
        """Test creating survey with minimal required fields"""
        data = {
            'run': self.run.id,
            'survey_type': 'Type 1 - GTL'
            # status should default to 'pending'
        }
        serializer = CreateSurveySerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        survey = serializer.save()
        self.assertEqual(survey.status, 'pending')


class UpdateSurveySerializerTest(TestCase):
    """Test cases for UpdateSurveySerializer"""

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
        self.survey = Survey.objects.create(
            run=self.run,
            survey_type='Type 1 - GTL',
            status='pending'
        )

    def test_update_survey_status(self):
        """Test updating survey status"""
        data = {'status': 'uploaded'}
        serializer = UpdateSurveySerializer(
            instance=self.survey,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_survey = serializer.save()
        self.assertEqual(updated_survey.status, 'uploaded')

    def test_update_survey_type(self):
        """Test updating survey type"""
        data = {'survey_type': 'Type 2 - Gyro'}
        serializer = UpdateSurveySerializer(
            instance=self.survey,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_survey = serializer.save()
        self.assertEqual(updated_survey.survey_type, 'Type 2 - Gyro')

    def test_update_file_path(self):
        """Test updating file_path"""
        data = {'file_path': '/uploads/new_file.xlsx'}
        serializer = UpdateSurveySerializer(
            instance=self.survey,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_survey = serializer.save()
        self.assertEqual(updated_survey.file_path, '/uploads/new_file.xlsx')

    def test_update_multiple_fields(self):
        """Test updating multiple fields at once"""
        data = {
            'survey_type': 'Type 3 - MWD',
            'status': 'validated',
            'file_path': '/uploads/validated_file.xlsx'
        }
        serializer = UpdateSurveySerializer(
            instance=self.survey,
            data=data,
            partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_survey = serializer.save()
        self.assertEqual(updated_survey.survey_type, 'Type 3 - MWD')
        self.assertEqual(updated_survey.status, 'validated')
        self.assertEqual(updated_survey.file_path, '/uploads/validated_file.xlsx')

    def test_run_not_in_update_serializer(self):
        """Test that run field is not included in update serializer"""
        serializer = UpdateSurveySerializer()
        self.assertNotIn('run', serializer.fields)
