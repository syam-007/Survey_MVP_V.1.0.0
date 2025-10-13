"""
Tests for Survey model.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from survey_api.models import Run, Survey

User = get_user_model()


class SurveyModelTest(TestCase):
    """Test cases for Survey model"""

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

    def test_survey_creation(self):
        """Test successful survey creation"""
        survey = Survey.objects.create(
            run=self.run,
            survey_type='Type 1 - GTL',
            status='pending'
        )
        self.assertIsNotNone(survey.id)
        self.assertEqual(survey.run, self.run)
        self.assertEqual(survey.survey_type, 'Type 1 - GTL')
        self.assertEqual(survey.status, 'pending')
        self.assertIsNone(survey.file_path)
        self.assertIsNotNone(survey.created_at)
        self.assertIsNotNone(survey.updated_at)

    def test_survey_str(self):
        """Test survey string representation"""
        survey = Survey.objects.create(
            run=self.run,
            survey_type='Type 2 - Gyro',
            status='pending'
        )
        self.assertEqual(str(survey), f'Survey (Type 2 - Gyro) for Run {self.run.run_number}')

    def test_survey_type_choices(self):
        """Test all valid survey type choices"""
        valid_types = ['Type 1 - GTL', 'Type 2 - Gyro', 'Type 3 - MWD', 'Type 4 - Unknown']

        for i, survey_type in enumerate(valid_types, start=2):
            run = Run.objects.create(
                run_number=f'RUN{i:03d}',
                run_name=f'Test Run {i}',
                run_type='GTL',
                user=self.user
            )
            survey = Survey.objects.create(
                run=run,
                survey_type=survey_type,
                status='pending'
            )
            self.assertEqual(survey.survey_type, survey_type)

    def test_status_choices(self):
        """Test all valid status choices"""
        valid_statuses = ['pending', 'uploaded', 'validated', 'calculated', 'error']

        for i, status in enumerate(valid_statuses, start=5):
            run = Run.objects.create(
                run_number=f'RUN{i:03d}',
                run_name=f'Test Run {i}',
                run_type='GTL',
                user=self.user
            )
            survey = Survey.objects.create(
                run=run,
                survey_type='Type 1 - GTL',
                status=status
            )
            self.assertEqual(survey.status, status)

    def test_default_status(self):
        """Test that default status is 'pending'"""
        survey = Survey.objects.create(
            run=self.run,
            survey_type='Type 1 - GTL'
        )
        self.assertEqual(survey.status, 'pending')

    def test_file_path_nullable(self):
        """Test that file_path can be null/blank"""
        survey = Survey.objects.create(
            run=self.run,
            survey_type='Type 1 - GTL',
            file_path=None
        )
        self.assertIsNone(survey.file_path)

        # Test with blank string
        run2 = Run.objects.create(
            run_number='RUN010',
            run_name='Test Run 2',
            run_type='GTL',
            user=self.user
        )
        survey2 = Survey.objects.create(
            run=run2,
            survey_type='Type 1 - GTL',
            file_path=''
        )
        self.assertEqual(survey2.file_path, '')

    def test_cascade_delete_on_run_delete(self):
        """Test survey is deleted when run is deleted"""
        survey = Survey.objects.create(
            run=self.run,
            survey_type='Type 1 - GTL',
            status='pending'
        )
        survey_id = survey.id

        # Delete the run
        self.run.delete()

        # Verify survey was cascade-deleted
        self.assertFalse(Survey.objects.filter(id=survey_id).exists())

    def test_onetoone_constraint(self):
        """Test OneToOne constraint prevents duplicate surveys for same run"""
        # Create first survey
        Survey.objects.create(
            run=self.run,
            survey_type='Type 1 - GTL',
            status='pending'
        )

        # Attempt to create second survey for same run
        with self.assertRaises(Exception):  # Will raise IntegrityError
            Survey.objects.create(
                run=self.run,
                survey_type='Type 2 - Gyro',
                status='pending'
            )
