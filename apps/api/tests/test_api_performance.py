"""
Performance tests for API endpoints with large datasets.

Tests that list/filter/search operations execute within 500ms
for datasets with 10,000+ records.

NOTE: These tests are SLOW and should be run separately from regular tests.
Run with: python manage.py test apps.api.tests.test_api_performance --keepdb
"""

import time
from django.test import TestCase, tag
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from survey_api.models import Run, Well

User = get_user_model()


@tag('slow', 'performance')
class APIPerformanceTestCase(TestCase):
    """
    Performance test case for API endpoints.

    Tagged as 'slow' and 'performance' to allow selective execution.
    """

    @classmethod
    def setUpTestData(cls):
        """
        Set up test data once for all tests in this class.

        Creates:
        - 1 test user
        - 100 test wells
        - 10,000 test runs
        """
        print("\n" + "="*70)
        print("PERFORMANCE TEST SETUP - This will take a few minutes...")
        print("="*70)

        # Create test user
        cls.user = User.objects.create_user(
            username='perf_test_user',
            email='perf@test.com',
            password='testpass123',
            role='engineer'
        )

        # Create 100 wells for variety
        print("Creating 100 test wells...")
        wells = []
        well_types = ['Oil', 'Gas', 'Water', 'Other']
        for i in range(100):
            well = Well(
                well_name=f'Perf Test Well {i:04d}',
                well_type=well_types[i % 4]
            )
            wells.append(well)

        cls.wells = Well.objects.bulk_create(wells, batch_size=100)
        print(f"Created {len(cls.wells)} wells")

        # Create 10,000 runs in batches
        print("Creating 10,000 test runs (this may take 1-2 minutes)...")
        batch_size = 1000
        run_types = ['GTL', 'Gyro', 'MWD', 'Unknown']

        for batch_num in range(10):  # 10 batches of 1000
            runs = []
            start_idx = batch_num * batch_size

            for i in range(batch_size):
                run_num = start_idx + i
                run = Run(
                    run_number=f'PERF{run_num:06d}',
                    run_name=f'Performance Test Run {run_num:06d}',
                    run_type=run_types[run_num % 4],
                    well=cls.wells[run_num % 100],
                    user=cls.user
                )
                runs.append(run)

            Run.all_objects.bulk_create(runs, batch_size=batch_size)
            print(f"  Batch {batch_num + 1}/10 complete ({(batch_num + 1) * batch_size} runs)")

        cls.total_runs = Run.all_objects.count()
        print(f"Created {cls.total_runs} total runs")
        print("="*70)
        print("SETUP COMPLETE - Starting performance tests...")
        print("="*70 + "\n")

    def setUp(self):
        """Set up API client for each test"""
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    # ==================== RUN LIST PERFORMANCE TESTS ====================

    def test_run_list_performance_10k_records(self):
        """
        Test GET /api/v1/runs/ executes in <500ms with 10K records.

        AC2: Performance guarantee <500ms for 10K+ records
        """
        # Warm-up query (not timed)
        self.client.get('/api/v1/runs/')

        # Timed query
        start_time = time.time()
        response = self.client.get('/api/v1/runs/')
        execution_time = (time.time() - start_time) * 1000  # Convert to ms

        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)

        print(f"\n  Run List Execution Time: {execution_time:.2f}ms")
        print(f"  Returned: {len(response.data['results'])} runs (page 1)")
        print(f"  Total count: {response.data['count']}")

        # Assert performance requirement
        self.assertLess(
            execution_time,
            500,
            f"Run list query took {execution_time:.2f}ms, exceeds 500ms limit"
        )

    def test_run_list_with_filter_performance(self):
        """
        Test GET /api/v1/runs/?run_type=MWD executes in <500ms.

        AC2: Filtering performance with 10K records
        """
        # Warm-up
        self.client.get('/api/v1/runs/?run_type=MWD')

        # Timed query
        start_time = time.time()
        response = self.client.get('/api/v1/runs/?run_type=MWD')
        execution_time = (time.time() - start_time) * 1000

        self.assertEqual(response.status_code, 200)

        print(f"\n  Run List with Filter Execution Time: {execution_time:.2f}ms")
        print(f"  Filtered results: {response.data['count']}")

        self.assertLess(
            execution_time,
            500,
            f"Filtered run list took {execution_time:.2f}ms, exceeds 500ms limit"
        )

    def test_run_search_performance(self):
        """
        Test GET /api/v1/runs/?search=test executes in <500ms.

        AC2: Search performance with 10K records
        """
        # Warm-up
        self.client.get('/api/v1/runs/?search=Performance')

        # Timed query
        start_time = time.time()
        response = self.client.get('/api/v1/runs/?search=Performance')
        execution_time = (time.time() - start_time) * 1000

        self.assertEqual(response.status_code, 200)

        print(f"\n  Run Search Execution Time: {execution_time:.2f}ms")
        print(f"  Search results: {response.data['count']}")

        self.assertLess(
            execution_time,
            500,
            f"Run search took {execution_time:.2f}ms, exceeds 500ms limit"
        )

    # ==================== WELL LIST PERFORMANCE TESTS ====================

    def test_well_list_performance_100_records(self):
        """
        Test GET /api/v1/wells/ executes in <500ms.

        AC2: Well list performance with 100 wells
        """
        # Warm-up
        self.client.get('/api/v1/wells/')

        # Timed query
        start_time = time.time()
        response = self.client.get('/api/v1/wells/')
        execution_time = (time.time() - start_time) * 1000

        self.assertEqual(response.status_code, 200)

        print(f"\n  Well List Execution Time: {execution_time:.2f}ms")
        print(f"  Returned: {len(response.data['results'])} wells")
        print(f"  Total count: {response.data['count']}")

        self.assertLess(
            execution_time,
            500,
            f"Well list query took {execution_time:.2f}ms, exceeds 500ms limit"
        )

    def test_well_list_with_filter_performance(self):
        """
        Test GET /api/v1/wells/?well_type=Oil executes in <500ms.

        AC2: Well filtering performance
        """
        # Warm-up
        self.client.get('/api/v1/wells/?well_type=Oil')

        # Timed query
        start_time = time.time()
        response = self.client.get('/api/v1/wells/?well_type=Oil')
        execution_time = (time.time() - start_time) * 1000

        self.assertEqual(response.status_code, 200)

        print(f"\n  Well List with Filter Execution Time: {execution_time:.2f}ms")
        print(f"  Filtered results: {response.data['count']}")

        self.assertLess(
            execution_time,
            500,
            f"Filtered well list took {execution_time:.2f}ms, exceeds 500ms limit"
        )

    # ==================== QUERY COUNT VERIFICATION ====================

    def test_run_list_query_count(self):
        """
        Verify run list uses optimal number of queries.

        AC8: Query optimization with select_related/prefetch_related
        Should use ~2-3 queries regardless of result count.
        """
        with self.assertNumQueries(3):  # Main query + select_related + prefetch
            response = self.client.get('/api/v1/runs/')
            self.assertEqual(response.status_code, 200)

        print(f"\n  Run List Query Count: 3 queries (optimal)")

    def test_well_list_query_count(self):
        """
        Verify well list uses optimal number of queries.

        AC8: Query optimization
        Should use ~2 queries regardless of result count.
        """
        with self.assertNumQueries(2):  # Main query + prefetch_related
            response = self.client.get('/api/v1/wells/')
            self.assertEqual(response.status_code, 200)

        print(f"\n  Well List Query Count: 2 queries (optimal)")

    @classmethod
    def tearDownClass(cls):
        """Clean up after all tests"""
        print("\n" + "="*70)
        print("PERFORMANCE TESTS COMPLETE")
        print("="*70)
        super().tearDownClass()
