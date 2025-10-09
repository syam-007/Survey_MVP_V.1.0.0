"""
Filter combination tests for API endpoints.

Tests various combinations of filters, search, ordering, and pagination
to ensure they work together correctly.
"""

from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from survey_api.models import User, Run, Well


class RunFilterCombinationTest(TestCase):
    """Test filter combinations for Run API"""

    @classmethod
    def setUpTestData(cls):
        """Set up test data once for all tests"""
        # Create test user
        cls.user = User.objects.create_user(
            username='combo_test_user',
            email='combo@test.com',
            password='testpass123',
            role='engineer'
        )

        # Create multiple wells
        cls.well1 = Well.objects.create(well_name='Well Alpha', well_type='Oil')
        cls.well2 = Well.objects.create(well_name='Well Beta', well_type='Gas')

        # Create runs with varied attributes
        now = timezone.now()
        run_data = [
            ('RUN_COMBO_001', 'Alpha MWD Run', 'MWD', cls.well1, now - timedelta(days=30)),
            ('RUN_COMBO_002', 'Alpha Gyro Run', 'Gyro', cls.well1, now - timedelta(days=20)),
            ('RUN_COMBO_003', 'Beta MWD Run', 'MWD', cls.well2, now - timedelta(days=15)),
            ('RUN_COMBO_004', 'Beta GTL Run', 'GTL', cls.well2, now - timedelta(days=10)),
            ('RUN_COMBO_005', 'Alpha GTL Run', 'GTL', cls.well1, now - timedelta(days=5)),
        ]

        for run_number, run_name, run_type, well, created_at in run_data:
            run = Run.objects.create(
                run_number=run_number,
                run_name=run_name,
                run_type=run_type,
                well=well,
                user=cls.user
            )
            Run.objects.filter(id=run.id).update(
                created_at=created_at,
                updated_at=created_at
            )

    def setUp(self):
        """Set up API client for each test"""
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    # ==================== TYPE + WELL COMBINATIONS ====================

    def test_filter_run_type_and_well(self):
        """
        AC6: Test combining run_type and well filters.
        """
        response = self.client.get(
            f'/api/v1/runs/?run_type=MWD&well={self.well1.id}'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

        # Should only return RUN_COMBO_001 (Alpha MWD)
        run = response.data['results'][0]
        self.assertEqual(run['run_number'], 'RUN_COMBO_001')
        self.assertEqual(run['run_type'], 'MWD')

    def test_filter_run_type_and_well_no_match(self):
        """
        AC6: Test run_type + well filter with no matches.
        """
        response = self.client.get(
            f'/api/v1/runs/?run_type=Gyro&well={self.well2.id}'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    # ==================== FILTER + SEARCH COMBINATIONS ====================

    def test_filter_run_type_with_search(self):
        """
        AC6: Test combining run_type filter with search.
        """
        response = self.client.get('/api/v1/runs/?run_type=GTL&search=Alpha')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

        # Should only return RUN_COMBO_005 (Alpha GTL Run)
        run = response.data['results'][0]
        self.assertEqual(run['run_number'], 'RUN_COMBO_005')

    def test_filter_well_with_search(self):
        """
        AC6: Test combining well filter with search.
        """
        response = self.client.get(
            f'/api/v1/runs/?well={self.well1.id}&search=Gyro'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

        # Should return RUN_COMBO_002 (Alpha Gyro Run)
        run = response.data['results'][0]
        self.assertEqual(run['run_number'], 'RUN_COMBO_002')

    # ==================== FILTER + ORDERING COMBINATIONS ====================

    def test_filter_with_ordering_ascending(self):
        """
        AC6: Test filter with ascending order.
        """
        response = self.client.get(
            f'/api/v1/runs/?well={self.well1.id}&ordering=created_at'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 3)

        # Should be ordered oldest to newest
        run_numbers = [r['run_number'] for r in response.data['results']]
        self.assertEqual(run_numbers[:3], ['RUN_COMBO_001', 'RUN_COMBO_002', 'RUN_COMBO_005'])

    def test_filter_with_ordering_descending(self):
        """
        AC6: Test filter with descending order.
        """
        response = self.client.get(
            f'/api/v1/runs/?run_type=MWD&ordering=-created_at'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

        # Should be ordered newest to oldest
        run_numbers = [r['run_number'] for r in response.data['results']]
        self.assertEqual(run_numbers, ['RUN_COMBO_003', 'RUN_COMBO_001'])

    # ==================== FILTER + PAGINATION COMBINATIONS ====================

    def test_filter_with_custom_page_size(self):
        """
        AC6: Test filter with custom page_size.
        """
        response = self.client.get(
            f'/api/v1/runs/?well={self.well1.id}&page_size=2'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 3)
        self.assertEqual(len(response.data['results']), 2)

    def test_filter_with_pagination(self):
        """
        AC6: Test filter with page number.
        """
        response = self.client.get(
            f'/api/v1/runs/?well={self.well1.id}&page=1&page_size=2'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(len(response.data['results']), 2)

    # ==================== DATE RANGE + FILTER COMBINATIONS ====================

    def test_date_range_with_run_type(self):
        """
        AC6: Test date range filter with run_type.
        """
        start_date = (timezone.now() - timedelta(days=25)).strftime('%Y-%m-%dT%H:%M:%S')
        end_date = (timezone.now() - timedelta(days=8)).strftime('%Y-%m-%dT%H:%M:%S')

        response = self.client.get(
            f'/api/v1/runs/?run_type=MWD&created_at_after={start_date}&created_at_before={end_date}'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return RUN_COMBO_003 (MWD, 15 days ago)
        self.assertEqual(response.data['count'], 1)

    def test_date_range_with_well(self):
        """
        AC6: Test date range filter with well.
        """
        start_date = (timezone.now() - timedelta(days=18)).strftime('%Y-%m-%dT%H:%M:%S')

        response = self.client.get(
            f'/api/v1/runs/?well={self.well2.id}&created_at_after={start_date}'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return RUN_COMBO_003 and RUN_COMBO_004
        self.assertEqual(response.data['count'], 2)

    # ==================== SEARCH + ORDERING COMBINATIONS ====================

    def test_search_with_ordering(self):
        """
        AC6: Test search with ordering.
        """
        response = self.client.get('/api/v1/runs/?search=Beta&ordering=run_number')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

        # Should be ordered by run_number
        run_numbers = [r['run_number'] for r in response.data['results']]
        self.assertEqual(run_numbers, ['RUN_COMBO_003', 'RUN_COMBO_004'])

    # ==================== COMPLEX 4-WAY COMBINATIONS ====================

    def test_filter_search_ordering_pagination(self):
        """
        AC6: Test combining filter + search + ordering + pagination.
        """
        response = self.client.get(
            f'/api/v1/runs/?well={self.well1.id}&search=Run&ordering=-created_at&page_size=2'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 3)
        self.assertEqual(len(response.data['results']), 2)

        # Should return newest first (RUN_COMBO_005, RUN_COMBO_002)
        run_numbers = [r['run_number'] for r in response.data['results']]
        self.assertEqual(run_numbers, ['RUN_COMBO_005', 'RUN_COMBO_002'])

    def test_type_well_date_ordering(self):
        """
        AC6: Test run_type + well + date range + ordering.
        """
        start_date = (timezone.now() - timedelta(days=35)).strftime('%Y-%m-%dT%H:%M:%S')
        end_date = (timezone.now() - timedelta(days=18)).strftime('%Y-%m-%dT%H:%M:%S')

        response = self.client.get(
            f'/api/v1/runs/?run_type=MWD&well={self.well1.id}&'
            f'created_at_after={start_date}&created_at_before={end_date}&ordering=created_at'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return RUN_COMBO_001
        self.assertEqual(response.data['count'], 1)


class WellFilterCombinationTest(TestCase):
    """Test filter combinations for Well API"""

    @classmethod
    def setUpTestData(cls):
        """Set up test data once for all tests"""
        cls.user = User.objects.create_user(
            username='well_combo_user',
            email='wellcombo@test.com',
            password='testpass123',
            role='engineer'
        )

        # Create wells with varied attributes
        cls.well1 = Well.objects.create(well_name='Alpha Oil Well', well_type='Oil')
        cls.well2 = Well.objects.create(well_name='Beta Gas Well', well_type='Gas')
        cls.well3 = Well.objects.create(well_name='Alpha Water Well', well_type='Water')
        cls.well4 = Well.objects.create(well_name='Gamma Oil Well', well_type='Oil')

    def setUp(self):
        """Set up API client for each test"""
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    # ==================== FILTER + SEARCH COMBINATIONS ====================

    def test_filter_well_type_with_search(self):
        """
        AC6: Test combining well_type filter with search.
        """
        response = self.client.get('/api/v1/wells/?well_type=Oil&search=Alpha')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

        # Should return Alpha Oil Well
        well = response.data['results'][0]
        self.assertEqual(well['well_name'], 'Alpha Oil Well')

    def test_search_only_alphanumeric(self):
        """
        AC6: Test search with alphanumeric term.
        """
        response = self.client.get('/api/v1/wells/?search=Alpha')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

        # Should return both Alpha wells
        well_names = [w['well_name'] for w in response.data['results']]
        self.assertIn('Alpha Oil Well', well_names)
        self.assertIn('Alpha Water Well', well_names)

    # ==================== FILTER + ORDERING COMBINATIONS ====================

    def test_filter_with_ordering(self):
        """
        AC6: Test well_type filter with ordering.
        """
        response = self.client.get('/api/v1/wells/?well_type=Oil&ordering=well_name')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

        # Should be alphabetically ordered
        well_names = [w['well_name'] for w in response.data['results']]
        self.assertEqual(well_names, ['Alpha Oil Well', 'Gamma Oil Well'])

    # ==================== FILTER + PAGINATION COMBINATIONS ====================

    def test_filter_with_pagination(self):
        """
        AC6: Test well_type filter with pagination.
        """
        response = self.client.get('/api/v1/wells/?well_type=Oil&page_size=1')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['count'], 2)

    # ==================== COMPLEX COMBINATIONS ====================

    def test_filter_search_ordering(self):
        """
        AC6: Test well_type + search + ordering.
        """
        response = self.client.get(
            '/api/v1/wells/?well_type=Oil&search=Well&ordering=-well_name'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

        # Should be reverse alphabetically ordered
        well_names = [w['well_name'] for w in response.data['results']]
        self.assertEqual(well_names, ['Gamma Oil Well', 'Alpha Oil Well'])
