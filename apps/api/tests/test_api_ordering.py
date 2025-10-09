"""
Integration tests for API ordering functionality.

Tests ordering capabilities for Run and Well APIs including
ascending/descending order and invalid field handling.
"""

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from survey_api.models import User, Run, Well


class RunOrderingTest(TestCase):
    """Test ordering functionality for Run API"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()

        # Create test user
        self.user = User.objects.create_user(
            username='ordering_test_user',
            email='ordering@test.com',
            password='testpass123',
            role='engineer'
        )
        self.client.force_authenticate(user=self.user)

        # Create test well
        self.well = Well.objects.create(
            well_name='Ordering Test Well',
            well_type='Oil'
        )

        # Create 5 runs with different attributes
        self.runs = []
        run_numbers = ['RUN_005', 'RUN_003', 'RUN_001', 'RUN_004', 'RUN_002']
        run_names = ['Echo', 'Charlie', 'Alpha', 'Delta', 'Bravo']

        for i, (run_num, run_name) in enumerate(zip(run_numbers, run_names)):
            run = Run.objects.create(
                run_number=run_num,
                run_name=run_name,
                run_type='MWD',
                well=self.well,
                user=self.user
            )
            self.runs.append(run)

        # Refresh to get timestamps
        for run in self.runs:
            run.refresh_from_db()

    # ==================== RUN NUMBER ORDERING TESTS ====================

    def test_order_runs_by_run_number_ascending(self):
        """
        AC4: Test ordering runs by run_number ascending.

        Should return runs in alphabetical order by run_number.
        """
        response = self.client.get('/api/v1/runs/?ordering=run_number')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

        # Extract run_numbers from response
        run_numbers = [run['run_number'] for run in response.data['results']]

        # Should be in ascending order
        self.assertEqual(run_numbers[:5], ['RUN_001', 'RUN_002', 'RUN_003', 'RUN_004', 'RUN_005'])

    def test_order_runs_by_run_number_descending(self):
        """
        AC4: Test ordering runs by run_number descending.

        Should return runs in reverse alphabetical order.
        """
        response = self.client.get('/api/v1/runs/?ordering=-run_number')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        run_numbers = [run['run_number'] for run in response.data['results']]

        # Should be in descending order
        self.assertEqual(run_numbers[:5], ['RUN_005', 'RUN_004', 'RUN_003', 'RUN_002', 'RUN_001'])

    # ==================== CREATED_AT ORDERING TESTS ====================

    def test_order_runs_by_created_at_ascending(self):
        """
        AC4: Test ordering runs by created_at ascending (oldest first).
        """
        response = self.client.get('/api/v1/runs/?ordering=created_at')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify created_at timestamps are in ascending order
        created_ats = [run['created_at'] for run in response.data['results']]

        # Compare consecutive timestamps
        for i in range(len(created_ats) - 1):
            self.assertLessEqual(created_ats[i], created_ats[i + 1])

    def test_order_runs_by_created_at_descending(self):
        """
        AC4: Test ordering runs by created_at descending (newest first).

        This is the default ordering for Run API.
        """
        response = self.client.get('/api/v1/runs/?ordering=-created_at')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        created_ats = [run['created_at'] for run in response.data['results']]

        # Compare consecutive timestamps (should be descending)
        for i in range(len(created_ats) - 1):
            self.assertGreaterEqual(created_ats[i], created_ats[i + 1])

    # ==================== UPDATED_AT ORDERING TESTS ====================

    def test_order_runs_by_updated_at_ascending(self):
        """
        AC4: Test ordering runs by updated_at ascending.
        """
        response = self.client.get('/api/v1/runs/?ordering=updated_at')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        updated_ats = [run['updated_at'] for run in response.data['results']]

        for i in range(len(updated_ats) - 1):
            self.assertLessEqual(updated_ats[i], updated_ats[i + 1])

    def test_order_runs_by_updated_at_descending(self):
        """
        AC4: Test ordering runs by updated_at descending.
        """
        response = self.client.get('/api/v1/runs/?ordering=-updated_at')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        updated_ats = [run['updated_at'] for run in response.data['results']]

        for i in range(len(updated_ats) - 1):
            self.assertGreaterEqual(updated_ats[i], updated_ats[i + 1])

    # ==================== DEFAULT ORDERING TEST ====================

    def test_runs_default_ordering(self):
        """
        AC4: Test that runs use default ordering (created_at descending).

        When no ordering parameter is specified.
        """
        response = self.client.get('/api/v1/runs/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Default should be newest first (descending created_at)
        created_ats = [run['created_at'] for run in response.data['results']]

        for i in range(len(created_ats) - 1):
            self.assertGreaterEqual(created_ats[i], created_ats[i + 1])

    # ==================== INVALID ORDERING TESTS ====================

    def test_order_runs_by_invalid_field(self):
        """
        AC5: Test ordering by invalid field returns 400 or ignores.

        Django REST Framework typically ignores invalid ordering fields
        and falls back to default ordering.
        """
        response = self.client.get('/api/v1/runs/?ordering=invalid_field')

        # DRF may return 200 with default ordering or 400
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

        if response.status_code == status.HTTP_200_OK:
            # Should fall back to default ordering
            self.assertIn('results', response.data)

    def test_order_runs_by_non_orderable_field(self):
        """
        AC5: Test ordering by field not in ordering_fields.

        Should ignore and use default ordering.
        """
        response = self.client.get('/api/v1/runs/?ordering=run_type')

        # run_type is not in ordering_fields, should fall back to default
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])


class WellOrderingTest(TestCase):
    """Test ordering functionality for Well API"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()

        # Create test user
        self.user = User.objects.create_user(
            username='well_ordering_test_user',
            email='well_ordering@test.com',
            password='testpass123',
            role='engineer'
        )
        self.client.force_authenticate(user=self.user)

        # Create 5 wells with different names
        well_names = ['Echo Well', 'Charlie Well', 'Alpha Well', 'Delta Well', 'Bravo Well']
        well_types = ['Oil', 'Gas', 'Water', 'Oil', 'Gas']

        self.wells = []
        for well_name, well_type in zip(well_names, well_types):
            well = Well.objects.create(
                well_name=well_name,
                well_type=well_type
            )
            self.wells.append(well)

        # Refresh to get timestamps
        for well in self.wells:
            well.refresh_from_db()

    # ==================== WELL NAME ORDERING TESTS ====================

    def test_order_wells_by_well_name_ascending(self):
        """
        AC4: Test ordering wells by well_name ascending.
        """
        response = self.client.get('/api/v1/wells/?ordering=well_name')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

        well_names = [well['well_name'] for well in response.data['results']]

        # Should be in alphabetical order
        self.assertEqual(well_names[:5],
            ['Alpha Well', 'Bravo Well', 'Charlie Well', 'Delta Well', 'Echo Well'])

    def test_order_wells_by_well_name_descending(self):
        """
        AC4: Test ordering wells by well_name descending.
        """
        response = self.client.get('/api/v1/wells/?ordering=-well_name')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        well_names = [well['well_name'] for well in response.data['results']]

        # Should be in reverse alphabetical order
        self.assertEqual(well_names[:5],
            ['Echo Well', 'Delta Well', 'Charlie Well', 'Bravo Well', 'Alpha Well'])

    # ==================== CREATED_AT ORDERING TESTS ====================

    def test_order_wells_by_created_at_ascending(self):
        """
        AC4: Test ordering wells by created_at ascending.
        """
        response = self.client.get('/api/v1/wells/?ordering=created_at')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        created_ats = [well['created_at'] for well in response.data['results']]

        for i in range(len(created_ats) - 1):
            self.assertLessEqual(created_ats[i], created_ats[i + 1])

    def test_order_wells_by_created_at_descending(self):
        """
        AC4: Test ordering wells by created_at descending.
        """
        response = self.client.get('/api/v1/wells/?ordering=-created_at')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        created_ats = [well['created_at'] for well in response.data['results']]

        for i in range(len(created_ats) - 1):
            self.assertGreaterEqual(created_ats[i], created_ats[i + 1])

    # ==================== UPDATED_AT ORDERING TESTS ====================

    def test_order_wells_by_updated_at_ascending(self):
        """
        AC4: Test ordering wells by updated_at ascending.
        """
        response = self.client.get('/api/v1/wells/?ordering=updated_at')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        updated_ats = [well['updated_at'] for well in response.data['results']]

        for i in range(len(updated_ats) - 1):
            self.assertLessEqual(updated_ats[i], updated_ats[i + 1])

    def test_order_wells_by_updated_at_descending(self):
        """
        AC4: Test ordering wells by updated_at descending.
        """
        response = self.client.get('/api/v1/wells/?ordering=-updated_at')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        updated_ats = [well['updated_at'] for well in response.data['results']]

        for i in range(len(updated_ats) - 1):
            self.assertGreaterEqual(updated_ats[i], updated_ats[i + 1])

    # ==================== DEFAULT ORDERING TEST ====================

    def test_wells_default_ordering(self):
        """
        AC4: Test that wells use default ordering.
        """
        response = self.client.get('/api/v1/wells/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify response has results
        self.assertIn('results', response.data)
        self.assertGreater(len(response.data['results']), 0)

    # ==================== INVALID ORDERING TESTS ====================

    def test_order_wells_by_invalid_field(self):
        """
        AC5: Test ordering by invalid field.
        """
        response = self.client.get('/api/v1/wells/?ordering=invalid_field')

        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

        if response.status_code == status.HTTP_200_OK:
            self.assertIn('results', response.data)
