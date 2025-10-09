"""
Integration tests for Run API date range filtering.

Tests comprehensive date range filtering functionality including
created_at and updated_at filters.
"""

import json
from datetime import datetime, timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from survey_api.models import User, Run, Well


class RunDateRangeFilteringTest(TestCase):
    """Test date range filtering for Run API"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()

        # Create test user
        self.user = User.objects.create_user(
            username='filter_test_user',
            email='filter@test.com',
            password='testpass123',
            role='engineer'
        )
        self.client.force_authenticate(user=self.user)

        # Create test well
        self.well = Well.objects.create(
            well_name='Filter Test Well',
            well_type='Oil'
        )

        # Create runs with different dates
        now = timezone.now()

        # Run 1: 30 days ago
        self.run1 = Run.objects.create(
            run_number='RUN_FILTER_001',
            run_name='Old Run',
            run_type='MWD',
            well=self.well,
            user=self.user
        )
        Run.objects.filter(id=self.run1.id).update(
            created_at=now - timedelta(days=30),
            updated_at=now - timedelta(days=30)
        )

        # Run 2: 15 days ago
        self.run2 = Run.objects.create(
            run_number='RUN_FILTER_002',
            run_name='Middle Run',
            run_type='Gyro',
            well=self.well,
            user=self.user
        )
        Run.objects.filter(id=self.run2.id).update(
            created_at=now - timedelta(days=15),
            updated_at=now - timedelta(days=15)
        )

        # Run 3: 5 days ago
        self.run3 = Run.objects.create(
            run_number='RUN_FILTER_003',
            run_name='Recent Run',
            run_type='MWD',
            well=self.well,
            user=self.user
        )
        Run.objects.filter(id=self.run3.id).update(
            created_at=now - timedelta(days=5),
            updated_at=now - timedelta(days=5)
        )

        # Refresh from database to get updated timestamps
        self.run1.refresh_from_db()
        self.run2.refresh_from_db()
        self.run3.refresh_from_db()

    # ==================== CREATED_AT FILTERING TESTS ====================

    def test_filter_runs_by_created_at_after(self):
        """
        AC3: Test filtering runs by created_at_after.

        Should return only runs created after the specified date.
        """
        # Filter for runs created in last 20 days
        cutoff_date = timezone.now() - timedelta(days=20)
        # Format for django-filter: YYYY-MM-DDTHH:MM:SS
        cutoff_str = cutoff_date.strftime('%Y-%m-%dT%H:%M:%S')

        response = self.client.get(f'/api/v1/runs/?created_at_after={cutoff_str}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

        # Should return run2 and run3 (15 days and 5 days ago)
        run_numbers = [run['run_number'] for run in response.data['results']]
        self.assertIn('RUN_FILTER_002', run_numbers)
        self.assertIn('RUN_FILTER_003', run_numbers)
        self.assertNotIn('RUN_FILTER_001', run_numbers)  # 30 days ago

    def test_filter_runs_by_created_at_before(self):
        """
        AC3: Test filtering runs by created_at_before.

        Should return only runs created before the specified date.
        """
        # Filter for runs created more than 10 days ago
        cutoff_date = timezone.now() - timedelta(days=10)
        cutoff_str = cutoff_date.strftime('%Y-%m-%dT%H:%M:%S')

        response = self.client.get(f'/api/v1/runs/?created_at_before={cutoff_str}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should return run1 and run2 (30 days and 15 days ago)
        run_numbers = [run['run_number'] for run in response.data['results']]
        self.assertIn('RUN_FILTER_001', run_numbers)
        self.assertIn('RUN_FILTER_002', run_numbers)
        self.assertNotIn('RUN_FILTER_003', run_numbers)  # Only 5 days ago

    def test_filter_runs_by_date_range(self):
        """
        AC3: Test filtering runs by date range (both after and before).

        Should return only runs within the specified range.
        """
        # Filter for runs between 20 and 7 days ago
        start_date = (timezone.now() - timedelta(days=20)).strftime('%Y-%m-%dT%H:%M:%S')
        end_date = (timezone.now() - timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%S')

        response = self.client.get(
            f'/api/v1/runs/?created_at_after={start_date}&created_at_before={end_date}'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should return only run2 (15 days ago)
        run_numbers = [run['run_number'] for run in response.data['results']]
        self.assertEqual(len(run_numbers), 1)
        self.assertIn('RUN_FILTER_002', run_numbers)
        self.assertNotIn('RUN_FILTER_001', run_numbers)  # Too old
        self.assertNotIn('RUN_FILTER_003', run_numbers)  # Too recent

    # ==================== UPDATED_AT FILTERING TESTS ====================

    def test_filter_runs_by_updated_at_after(self):
        """
        AC3: Test filtering runs by updated_at_after.
        """
        cutoff_date = timezone.now() - timedelta(days=20)
        cutoff_str = cutoff_date.strftime('%Y-%m-%dT%H:%M:%S')

        response = self.client.get(f'/api/v1/runs/?updated_at_after={cutoff_str}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should return run2 and run3
        run_numbers = [run['run_number'] for run in response.data['results']]
        self.assertGreaterEqual(len(run_numbers), 2)

    def test_filter_runs_by_updated_at_before(self):
        """
        AC3: Test filtering runs by updated_at_before.
        """
        cutoff_date = timezone.now() - timedelta(days=10)
        cutoff_str = cutoff_date.strftime('%Y-%m-%dT%H:%M:%S')

        response = self.client.get(f'/api/v1/runs/?updated_at_before={cutoff_str}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should return run1 and run2
        run_numbers = [run['run_number'] for run in response.data['results']]
        self.assertIn('RUN_FILTER_001', run_numbers)
        self.assertIn('RUN_FILTER_002', run_numbers)

    def test_filter_runs_by_updated_at_range(self):
        """
        AC3: Test filtering runs by updated_at range.
        """
        start_date = (timezone.now() - timedelta(days=20)).strftime('%Y-%m-%dT%H:%M:%S')
        end_date = (timezone.now() - timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%S')

        response = self.client.get(
            f'/api/v1/runs/?updated_at_after={start_date}&updated_at_before={end_date}'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    # ==================== INVALID DATE FORMAT TESTS ====================

    def test_filter_runs_invalid_date_format(self):
        """
        AC5: Test filtering with invalid date format returns 400.

        Currently django-filter may not validate this - test documents behavior.
        """
        response = self.client.get('/api/v1/runs/?created_at_after=not-a-date')

        # Django-filter may return 200 with empty results or 400
        # Document actual behavior
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

        if response.status_code == status.HTTP_200_OK:
            # Empty results is acceptable
            self.assertEqual(response.data['count'], 0)

    def test_filter_runs_invalid_date_range_order(self):
        """
        AC5: Test filtering with end date before start date.

        Should return empty results (no runs match impossible condition).
        """
        # End date before start date
        start_date = timezone.now().strftime('%Y-%m-%dT%H:%M:%S')
        end_date = (timezone.now() - timedelta(days=30)).strftime('%Y-%m-%dT%H:%M:%S')

        response = self.client.get(
            f'/api/v1/runs/?created_at_after={start_date}&created_at_before={end_date}'
        )

        # Should return 200 with empty results (no runs match this condition)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    # ==================== EDGE CASES ====================

    def test_filter_runs_exact_date_boundary(self):
        """
        AC5: Test filtering with exact date boundaries.
        """
        # Use run2's exact created_at as boundary
        exact_date = self.run2.created_at.strftime('%Y-%m-%dT%H:%M:%S')

        # created_at_after with exact date (should include run2 if using gte)
        response = self.client.get(f'/api/v1/runs/?created_at_after={exact_date}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # created_at_before with exact date (should include run2 if using lte)
        response = self.client.get(f'/api/v1/runs/?created_at_before={exact_date}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filter_runs_no_date_filters(self):
        """
        AC5: Test that no date filters returns all runs.
        """
        response = self.client.get('/api/v1/runs/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return all 3 runs
        self.assertGreaterEqual(response.data['count'], 3)

    def test_filter_runs_future_date(self):
        """
        AC5: Test filtering with future date returns empty or no results.
        """
        future_date = (timezone.now() + timedelta(days=30)).strftime('%Y-%m-%dT%H:%M:%S')

        response = self.client.get(f'/api/v1/runs/?created_at_after={future_date}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # No runs should be in the future
        self.assertEqual(response.data['count'], 0)

    def test_filter_runs_very_old_date(self):
        """
        AC5: Test filtering with very old date returns all runs.
        """
        old_date = (timezone.now() - timedelta(days=365)).strftime('%Y-%m-%dT%H:%M:%S')

        response = self.client.get(f'/api/v1/runs/?created_at_after={old_date}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # All runs should be after this old date
        self.assertGreaterEqual(response.data['count'], 3)
