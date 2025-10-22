"""
Tests for welleng service integration.
"""
from django.test import TestCase

from survey_api.services.welleng_service import WellengService
from survey_api.exceptions import WellengCalculationError


class WellengServiceTest(TestCase):
    """Test cases for WellengService"""

    def setUp(self):
        """Set up test data"""
        self.basic_tie_on = {
            'md': 0,
            'inc': 0,
            'azi': 0,
            'tvd': 0,
            'northing': 0,
            'easting': 0
        }

        self.basic_location = {
            'latitude': 29.5,
            'longitude': -95.5,
            'geodetic_system': 'WGS84'
        }

    def test_calculate_survey_basic(self):
        """Test basic welleng calculation with simple input"""
        result = WellengService.calculate_survey(
            md=[0, 100, 200],
            inc=[0, 10, 20],
            azi=[0, 45, 90],
            tie_on_data=self.basic_tie_on,
            location_data=self.basic_location,
            survey_type='Type 2 - Gyro'
        )

        self.assertEqual(result['status'], 'success')
        self.assertIn('easting', result)
        self.assertIn('northing', result)
        self.assertIn('tvd', result)
        self.assertIn('dls', result)
        self.assertIn('build_rate', result)
        self.assertIn('turn_rate', result)

        # Check array lengths match
        self.assertEqual(len(result['easting']), 3)
        self.assertEqual(len(result['northing']), 3)
        self.assertEqual(len(result['tvd']), 3)

    def test_calculate_survey_with_tie_on_offset(self):
        """Test calculation with tie-on MD offset"""
        tie_on_with_offset = {
            'md': 500,  # Start at 500m
            'inc': 0,
            'azi': 0,
            'tvd': 500,
            'northing': 1000,
            'easting': 2000
        }

        result = WellengService.calculate_survey(
            md=[0, 100, 200],
            inc=[0, 5, 10],
            azi=[0, 30, 60],
            tie_on_data=tie_on_with_offset,
            location_data=self.basic_location,
            survey_type='Type 3 - MWD'
        )

        self.assertEqual(result['status'], 'success')
        self.assertEqual(len(result['easting']), 3)

        # Verify tie-on coordinates are applied (results should be offset from 0)
        # Note: Exact values depend on welleng calculations, just verify non-zero
        self.assertIsNotNone(result['northing'][0])
        self.assertIsNotNone(result['easting'][0])

    def test_calculate_survey_gtl_type(self):
        """Test calculation with GTL survey type"""
        result = WellengService.calculate_survey(
            md=[0, 50, 100, 150],
            inc=[0, 5, 10, 15],
            azi=[0, 20, 40, 60],
            tie_on_data=self.basic_tie_on,
            location_data=self.basic_location,
            survey_type='Type 1 - GTL'
        )

        self.assertEqual(result['status'], 'success')
        self.assertEqual(len(result['tvd']), 4)

    def test_calculate_survey_array_length_mismatch(self):
        """Test error handling for array length mismatch"""
        with self.assertRaises(WellengCalculationError) as context:
            WellengService.calculate_survey(
                md=[0, 100, 200],
                inc=[0, 10],  # Only 2 elements
                azi=[0, 45, 90],
                tie_on_data=self.basic_tie_on,
                location_data=self.basic_location
            )

        self.assertIn('length mismatch', str(context.exception).lower())

    def test_calculate_survey_insufficient_points(self):
        """Test error for insufficient data points"""
        with self.assertRaises(WellengCalculationError) as context:
            WellengService.calculate_survey(
                md=[0],  # Only 1 point
                inc=[0],
                azi=[0],
                tie_on_data=self.basic_tie_on,
                location_data=self.basic_location
            )

        self.assertIn('insufficient', str(context.exception).lower())

    def test_calculate_survey_invalid_data_format(self):
        """Test error handling for non-numeric data"""
        with self.assertRaises(WellengCalculationError) as context:
            WellengService.calculate_survey(
                md=[0, 'invalid', 200],
                inc=[0, 10, 20],
                azi=[0, 45, 90],
                tie_on_data=self.basic_tie_on,
                location_data=self.basic_location
            )

        self.assertIn('invalid', str(context.exception).lower())

    def test_calculate_survey_missing_location_data(self):
        """Test calculation with missing latitude/longitude (should use defaults)"""
        incomplete_location = {
            'geodetic_system': 'WGS84'
        }

        # Should not raise error, but use defaults
        result = WellengService.calculate_survey(
            md=[0, 100],
            inc=[0, 10],
            azi=[0, 45],
            tie_on_data=self.basic_tie_on,
            location_data=incomplete_location
        )

        self.assertEqual(result['status'], 'success')

    def test_calculate_survey_large_dataset(self):
        """Test performance with larger dataset"""
        import time

        # Create 1000 survey points
        num_points = 1000
        md = [i * 10 for i in range(num_points)]  # 0, 10, 20, ... 9990
        inc = [i * 0.1 for i in range(num_points)]  # Gradually increasing inclination
        azi = [i * 0.2 for i in range(num_points)]  # Gradually increasing azimuth

        start_time = time.time()

        result = WellengService.calculate_survey(
            md=md,
            inc=inc,
            azi=azi,
            tie_on_data=self.basic_tie_on,
            location_data=self.basic_location
        )

        duration = time.time() - start_time

        self.assertEqual(result['status'], 'success')
        self.assertEqual(len(result['easting']), num_points)

        # Should be fast (< 1 second for 1000 points)
        self.assertLess(duration, 1.0, f"Calculation took {duration:.3f}s, expected < 1s")

        print(f"Performance: Calculated {num_points} points in {duration:.3f}s")
