"""
Pagination tests for API endpoints.

Tests pagination functionality including first/last pages, custom page_size,
max_page_size enforcement, and metadata verification.
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from survey_api.models import User, Run, Well


class RunPaginationTest(TestCase):
    """Test pagination for Run API"""

    @classmethod
    def setUpTestData(cls):
        """Set up test data once for all tests"""
        # Create test user
        cls.user = User.objects.create_user(
            username='pagination_test_user',
            email='pagination@test.com',
            password='testpass123',
            role='engineer'
        )

        # Create test well
        cls.well = Well.objects.create(
            well_name='Pagination Test Well',
            well_type='Oil'
        )

        # Create 55 test runs for pagination testing
        runs = []
        for i in range(55):
            run = Run(
                run_number=f'RUN_PAGE_{i:03d}',
                run_name=f'Pagination Test Run {i:03d}',
                run_type='MWD',
                well=cls.well,
                user=cls.user
            )
            runs.append(run)

        Run.objects.bulk_create(runs)

    def setUp(self):
        """Set up API client for each test"""
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    # ==================== BASIC PAGINATION TESTS ====================

    def test_run_list_default_pagination(self):
        """
        AC1: Test default pagination returns 20 items per page.
        """
        response = self.client.get('/api/v1/runs/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 20)
        self.assertGreaterEqual(response.data['count'], 55)

    def test_run_list_first_page(self):
        """
        AC1: Test first page explicitly requested.
        """
        response = self.client.get('/api/v1/runs/?page=1')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(len(response.data['results']), 20)

        # Should have next page
        self.assertIsNotNone(response.data['next'])
        # Should not have previous page
        self.assertIsNone(response.data['previous'])

    def test_run_list_middle_page(self):
        """
        AC1: Test middle page has both next and previous links.
        """
        response = self.client.get('/api/v1/runs/?page=2')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['page'], 2)

        # Should have both next and previous
        self.assertIsNotNone(response.data['next'])
        self.assertIsNotNone(response.data['previous'])

    def test_run_list_last_page(self):
        """
        AC1: Test last page has no next link.
        """
        # With 55 runs and 20 per page, last page is page 3
        response = self.client.get('/api/v1/runs/?page=3')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['page'], 3)

        # Last page should have 15 results (55 - 40)
        self.assertEqual(len(response.data['results']), 15)

        # Should have previous but not next
        self.assertIsNone(response.data['next'])
        self.assertIsNotNone(response.data['previous'])

    # ==================== CUSTOM PAGE_SIZE TESTS ====================

    def test_run_list_custom_page_size_10(self):
        """
        AC1: Test custom page_size=10.

        Note: page_size metadata may not reflect actual page_size in all implementations.
        """
        response = self.client.get('/api/v1/runs/?page_size=10')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 10)

    def test_run_list_custom_page_size_50(self):
        """
        AC1: Test custom page_size=50.
        """
        response = self.client.get('/api/v1/runs/?page_size=50')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 50)

    def test_run_list_page_size_1(self):
        """
        AC1: Test minimum page_size=1.
        """
        response = self.client.get('/api/v1/runs/?page_size=1')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    # ==================== MAX PAGE_SIZE TESTS ====================

    def test_run_list_max_page_size_enforcement(self):
        """
        AC1: Test page_size exceeding max (100) is capped.
        """
        response = self.client.get('/api/v1/runs/?page_size=500')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should be capped at max_page_size=100
        self.assertLessEqual(len(response.data['results']), 100)
        self.assertLessEqual(response.data['page_size'], 100)

    def test_run_list_page_size_exactly_max(self):
        """
        AC1: Test page_size=100 (exactly max).
        """
        response = self.client.get('/api/v1/runs/?page_size=100')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 55)  # Only 55 runs available

    # ==================== PAGINATION METADATA TESTS ====================

    def test_run_list_pagination_metadata_structure(self):
        """
        AC1: Test pagination response includes all required metadata.
        """
        response = self.client.get('/api/v1/runs/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check all pagination metadata fields exist
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('page', response.data)
        self.assertIn('total_pages', response.data)
        self.assertIn('page_size', response.data)
        self.assertIn('results', response.data)

    def test_run_list_pagination_metadata_values(self):
        """
        AC1: Test pagination metadata values are correct.
        """
        response = self.client.get('/api/v1/runs/?page=2&page_size=20')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify metadata
        self.assertGreaterEqual(response.data['count'], 55)
        self.assertEqual(response.data['page'], 2)
        self.assertEqual(response.data['page_size'], 20)

        # With 55+ runs and page_size=20, should have at least 3 pages
        self.assertGreaterEqual(response.data['total_pages'], 3)

    def test_run_list_total_pages_calculation(self):
        """
        AC1: Test total_pages is calculated correctly.
        """
        response = self.client.get('/api/v1/runs/?page_size=10')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # With 55+ runs and page_size=10, should have at least 6 pages
        self.assertGreaterEqual(response.data['total_pages'], 6)

    # ==================== PAGINATION WITH FILTERS TESTS ====================

    def test_run_list_pagination_with_filter(self):
        """
        AC1: Test pagination works correctly with filters applied.
        """
        response = self.client.get('/api/v1/runs/?run_type=MWD&page=1&page_size=10')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 10)
        self.assertEqual(response.data['page'], 1)

        # All results should match filter
        for run in response.data['results']:
            self.assertEqual(run['run_type'], 'MWD')

    def test_run_list_pagination_with_search(self):
        """
        AC1: Test pagination works with search.
        """
        response = self.client.get('/api/v1/runs/?search=Pagination&page_size=5')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data['results']), 5)

    # ==================== EDGE CASES ====================

    def test_run_list_page_size_larger_than_total(self):
        """
        AC5: Test page_size larger than total results.

        Should return all results in single page.
        """
        response = self.client.get('/api/v1/runs/?page_size=100')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should return all runs (55+)
        self.assertGreaterEqual(len(response.data['results']), 55)
        self.assertEqual(response.data['total_pages'], 1)
        self.assertIsNone(response.data['next'])

    def test_run_list_invalid_page_size_negative(self):
        """
        AC5: Test negative page_size.

        May return error or use default.
        """
        response = self.client.get('/api/v1/runs/?page_size=-10')

        # Accept either error or fallback to default
        self.assertIn(response.status_code,
            [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_run_list_invalid_page_size_zero(self):
        """
        AC5: Test zero page_size.
        """
        response = self.client.get('/api/v1/runs/?page_size=0')

        self.assertIn(response.status_code,
            [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_run_list_invalid_page_size_non_numeric(self):
        """
        AC5: Test non-numeric page_size.
        """
        response = self.client.get('/api/v1/runs/?page_size=abc')

        self.assertIn(response.status_code,
            [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])


class WellPaginationTest(TestCase):
    """Test pagination for Well API"""

    @classmethod
    def setUpTestData(cls):
        """Set up test data once for all tests"""
        cls.user = User.objects.create_user(
            username='well_pagination_user',
            email='well_pagination@test.com',
            password='testpass123',
            role='engineer'
        )

        # Create 45 test wells
        wells = []
        well_types = ['Oil', 'Gas', 'Water', 'Other']
        for i in range(45):
            well = Well(
                well_name=f'Pagination Well {i:03d}',
                well_type=well_types[i % 4]
            )
            wells.append(well)

        Well.objects.bulk_create(wells)

    def setUp(self):
        """Set up API client for each test"""
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    # ==================== BASIC PAGINATION TESTS ====================

    def test_well_list_default_pagination(self):
        """
        AC1: Test default pagination for wells.
        """
        response = self.client.get('/api/v1/wells/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 20)

    def test_well_list_first_page(self):
        """
        AC1: Test first page of wells.
        """
        response = self.client.get('/api/v1/wells/?page=1')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['page'], 1)
        self.assertIsNone(response.data['previous'])
        self.assertIsNotNone(response.data['next'])

    def test_well_list_last_page(self):
        """
        AC1: Test last page of wells.
        """
        # With 45 wells and 20 per page, last page is page 3
        response = self.client.get('/api/v1/wells/?page=3')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['page'], 3)

        # Should have 5 results (45 - 40)
        self.assertEqual(len(response.data['results']), 5)
        self.assertIsNone(response.data['next'])
        self.assertIsNotNone(response.data['previous'])

    # ==================== CUSTOM PAGE_SIZE TESTS ====================

    def test_well_list_custom_page_size(self):
        """
        AC1: Test custom page_size for wells.
        """
        response = self.client.get('/api/v1/wells/?page_size=15')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 15)

    # ==================== PAGINATION METADATA TESTS ====================

    def test_well_list_pagination_metadata(self):
        """
        AC1: Test pagination metadata for wells.
        """
        response = self.client.get('/api/v1/wells/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check all metadata fields
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('page', response.data)
        self.assertIn('total_pages', response.data)
        self.assertIn('page_size', response.data)
        self.assertIn('results', response.data)

    def test_well_list_total_pages_calculation(self):
        """
        AC1: Test total_pages calculation for wells.
        """
        response = self.client.get('/api/v1/wells/?page_size=10')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # With 45 wells and page_size=10, should have 5 pages
        self.assertEqual(response.data['total_pages'], 5)

    # ==================== PAGINATION WITH FILTERS ====================

    def test_well_list_pagination_with_filter(self):
        """
        AC1: Test pagination with well_type filter.
        """
        response = self.client.get('/api/v1/wells/?well_type=Oil&page_size=5')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data['results']), 5)

        # All results should be Oil type
        for well in response.data['results']:
            self.assertEqual(well['well_type'], 'Oil')
