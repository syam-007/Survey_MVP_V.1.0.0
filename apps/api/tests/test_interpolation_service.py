"""
Tests for interpolation service and welleng interpolation.
"""
import time
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from unittest.mock import patch

from survey_api.models import (
    Well, Run, Location, Depth, TieOn,
    SurveyFile, SurveyData, CalculatedSurvey, InterpolatedSurvey
)
from survey_api.models.survey_data import trigger_calculation
from survey_api.services.welleng_service import WellengService
from survey_api.services.interpolation_service import InterpolationService
from survey_api.exceptions import WellengCalculationError, InsufficientDataError

User = get_user_model()


class WellengInterpolationTest(TestCase):
    """Test cases for WellengService interpolation method."""

    def setUp(self):
        """Set up test data."""
        self.basic_calculated_data = {
            'md': [0.0, 100.0, 200.0, 300.0],
            'inc': [0.0, 5.0, 10.0, 15.0],
            'azi': [0.0, 45.0, 90.0, 135.0],
            'easting': [0.0, 3.9, 15.5, 34.9],
            'northing': [0.0, 3.9, 15.5, 34.9],
            'tvd': [0.0, 99.9, 199.6, 298.9]
        }

    def test_interpolate_survey_basic(self):
        """Test basic interpolation with default resolution."""
        result = WellengService.interpolate_survey(
            calculated_data=self.basic_calculated_data,
            resolution=10
        )

        self.assertEqual(result['status'], 'success')
        self.assertIn('md', result)
        self.assertIn('inc', result)
        self.assertIn('azi', result)
        self.assertIn('easting', result)
        self.assertIn('northing', result)
        self.assertIn('tvd', result)
        self.assertIn('dls', result)
        self.assertIn('point_count', result)

        # Verify interpolation increased point count
        original_count = len(self.basic_calculated_data['md'])
        interpolated_count = result['point_count']
        self.assertGreater(interpolated_count, original_count)

        # Verify all arrays have same length
        self.assertEqual(len(result['md']), result['point_count'])
        self.assertEqual(len(result['inc']), result['point_count'])
        self.assertEqual(len(result['azi']), result['point_count'])
        self.assertEqual(len(result['easting']), result['point_count'])
        self.assertEqual(len(result['northing']), result['point_count'])
        self.assertEqual(len(result['tvd']), result['point_count'])
        self.assertEqual(len(result['dls']), result['point_count'])

    def test_interpolate_custom_resolution(self):
        """Test interpolation with custom resolutions."""
        # Test with resolution = 50m (should have fewer points)
        result_50 = WellengService.interpolate_survey(
            calculated_data=self.basic_calculated_data,
            resolution=50
        )

        # Test with resolution = 5m (should have more points)
        result_5 = WellengService.interpolate_survey(
            calculated_data=self.basic_calculated_data,
            resolution=5
        )

        self.assertGreater(result_5['point_count'], result_50['point_count'])
        self.assertEqual(result_50['status'], 'success')
        self.assertEqual(result_5['status'], 'success')

    def test_interpolate_invalid_resolution(self):
        """Test error handling for invalid resolution."""
        # Resolution too small
        with self.assertRaises(WellengCalculationError) as context:
            WellengService.interpolate_survey(
                calculated_data=self.basic_calculated_data,
                resolution=0
            )
        self.assertIn('resolution', str(context.exception).lower())

        # Resolution too large
        with self.assertRaises(WellengCalculationError) as context:
            WellengService.interpolate_survey(
                calculated_data=self.basic_calculated_data,
                resolution=101
            )
        self.assertIn('resolution', str(context.exception).lower())

    def test_interpolate_insufficient_data(self):
        """Test error handling for insufficient data points."""
        insufficient_data = {
            'md': [0.0],
            'inc': [0.0],
            'azi': [0.0],
            'easting': [0.0],
            'northing': [0.0],
            'tvd': [0.0]
        }

        with self.assertRaises(WellengCalculationError) as context:
            WellengService.interpolate_survey(
                calculated_data=insufficient_data,
                resolution=10
            )
        self.assertIn('insufficient', str(context.exception).lower())

    def test_interpolate_missing_fields(self):
        """Test error handling for missing required fields."""
        incomplete_data = {
            'md': [0.0, 100.0],
            'inc': [0.0, 10.0],
            # Missing azi, easting, northing, tvd
        }

        with self.assertRaises(WellengCalculationError) as context:
            WellengService.interpolate_survey(
                calculated_data=incomplete_data,
                resolution=10
            )
        self.assertIn('missing', str(context.exception).lower())

    def test_interpolate_resolution_too_large_for_range(self):
        """Test error when resolution is larger than MD range."""
        short_range_data = {
            'md': [0.0, 5.0],
            'inc': [0.0, 5.0],
            'azi': [0.0, 45.0],
            'easting': [0.0, 0.4],
            'northing': [0.0, 0.4],
            'tvd': [0.0, 5.0]
        }

        with self.assertRaises(WellengCalculationError) as context:
            WellengService.interpolate_survey(
                calculated_data=short_range_data,
                resolution=100  # Larger than 5m range
            )
        self.assertIn('too large', str(context.exception).lower())


class InterpolationServiceTest(TestCase):
    """Test cases for InterpolationService."""

    def setUp(self):
        """Set up test data."""
        # Disconnect post_save signal to prevent automatic calculation during test setup
        post_save.disconnect(trigger_calculation, sender=SurveyData)

        # Create user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        # Create well
        self.well = Well.objects.create(
            well_name='Test Well',
            well_type='Oil'
        )

        # Create run with location, depth, tieon
        self.run = Run.objects.create(
            user=self.user,
            well=self.well,
            run_number='RUN-001',
            run_name='Test Run 001',
            run_type='MWD'
        )

        self.location = Location.objects.create(
            run=self.run,
            latitude=29.5,
            longitude=-95.5,
            geodetic_system='WGS84'
        )

        self.depth = Depth.objects.create(
            run=self.run,
            elevation_reference='KB',
            reference_datum='WGS84'
        )

        self.tieon = TieOn.objects.create(
            run=self.run,
            md=0.0,
            inc=0.0,
            azi=0.0,
            tvd=0.0,
            latitude=0.0,
            departure=0.0,
            well_type='Vertical',
            hole_section='Surface Casing',
            survey_tool_type='MWD',
            survey_interval_from=0.0,
            survey_interval_to=1000.0
        )

        # Create survey file
        self.survey_file = SurveyFile.objects.create(
            run=self.run,
            file_name='test.csv',
            file_path='/tmp/test.csv',
            file_size=1024,
            survey_type='MWD',
            processing_status='completed'
        )

        # Create survey data
        self.survey_data = SurveyData.objects.create(
            survey_file=self.survey_file,
            md_data=[0.0, 100.0, 200.0, 300.0],
            inc_data=[0.0, 5.0, 10.0, 15.0],
            azi_data=[0.0, 45.0, 90.0, 135.0],
            row_count=4,
            validation_status='valid'
        )

        # Create calculated survey
        self.calc_survey = CalculatedSurvey.objects.create(
            survey_data=self.survey_data,
            easting=[0.0, 3.9, 15.5, 34.9],
            northing=[0.0, 3.9, 15.5, 34.9],
            tvd=[0.0, 99.9, 199.6, 298.9],
            dls=[0.0, 2.87, 2.87, 2.87],
            build_rate=[0.0, 2.87, 2.87, 2.87],
            turn_rate=[0.0, 0.0, 0.0, 0.0],
            calculation_status='calculated',
            calculation_duration=0.123,
            calculation_context={}
        )

    def tearDown(self):
        """Reconnect signal after tests."""
        # Reconnect post_save signal for SurveyData
        post_save.connect(trigger_calculation, sender=SurveyData)

    def test_interpolate_default_resolution(self):
        """Test interpolation with default resolution."""
        interp_survey = InterpolationService.interpolate(
            calculated_survey_id=str(self.calc_survey.id),
            resolution=10
        )

        self.assertIsNotNone(interp_survey)
        self.assertEqual(interp_survey.resolution, 10)
        self.assertEqual(interp_survey.interpolation_status, 'completed')
        self.assertGreater(interp_survey.point_count, 4)
        self.assertIsNotNone(interp_survey.interpolation_duration)

    def test_interpolate_custom_resolution(self):
        """Test interpolation with custom resolutions."""
        # Create interpolation at resolution = 20
        interp_20 = InterpolationService.interpolate(
            calculated_survey_id=str(self.calc_survey.id),
            resolution=20
        )

        # Create interpolation at resolution = 5
        interp_5 = InterpolationService.interpolate(
            calculated_survey_id=str(self.calc_survey.id),
            resolution=5
        )

        self.assertEqual(interp_20.resolution, 20)
        self.assertEqual(interp_5.resolution, 5)
        self.assertGreater(interp_5.point_count, interp_20.point_count)

    def test_interpolate_duplicate_resolution(self):
        """Test that duplicate resolution returns existing interpolation."""
        # Create first interpolation
        interp_1 = InterpolationService.interpolate(
            calculated_survey_id=str(self.calc_survey.id),
            resolution=15
        )

        # Try to create again with same resolution
        interp_2 = InterpolationService.interpolate(
            calculated_survey_id=str(self.calc_survey.id),
            resolution=15
        )

        # Should return the same instance
        self.assertEqual(interp_1.id, interp_2.id)
        self.assertEqual(InterpolatedSurvey.objects.filter(resolution=15).count(), 1)

    def test_interpolate_calculated_survey_not_found(self):
        """Test error when calculated survey not found."""
        with self.assertRaises(InsufficientDataError) as context:
            InterpolationService.interpolate(
                calculated_survey_id='00000000-0000-0000-0000-000000000000',
                resolution=10
            )
        self.assertIn('not found', str(context.exception).lower())

    def test_interpolate_invalid_status(self):
        """Test error when calculated survey not in valid state."""
        # Create a new survey file and survey data for this test
        survey_file_error = SurveyFile.objects.create(
            run=self.run,
            file_name='test_error.csv',
            file_path='/tmp/test_error.csv',
            file_size=1024,
            survey_type='MWD',
            processing_status='completed'
        )

        survey_data_error = SurveyData.objects.create(
            survey_file=survey_file_error,
            md_data=[0.0, 100.0],
            inc_data=[0.0, 5.0],
            azi_data=[0.0, 45.0],
            row_count=2,
            validation_status='valid'
        )

        # Create calculated survey with error status
        calc_survey_error = CalculatedSurvey.objects.create(
            survey_data=survey_data_error,
            easting=[],
            northing=[],
            tvd=[],
            dls=[],
            build_rate=[],
            turn_rate=[],
            calculation_status='error',
            calculation_duration=None,
            calculation_context={},
            error_message='Test error'
        )

        with self.assertRaises(InsufficientDataError) as context:
            InterpolationService.interpolate(
                calculated_survey_id=str(calc_survey_error.id),
                resolution=10
            )
        self.assertIn('status', str(context.exception).lower())

    def test_list_interpolations(self):
        """Test listing all interpolations for a calculated survey."""
        # Create multiple interpolations
        InterpolationService.interpolate(str(self.calc_survey.id), 10)
        InterpolationService.interpolate(str(self.calc_survey.id), 20)
        InterpolationService.interpolate(str(self.calc_survey.id), 30)

        # List all
        interpolations = InterpolationService.list_interpolations(str(self.calc_survey.id))

        self.assertEqual(interpolations.count(), 3)
        resolutions = [i.resolution for i in interpolations]
        self.assertEqual(resolutions, [10, 20, 30])

    def test_get_interpolation_specific_resolution(self):
        """Test retrieving specific interpolation by resolution."""
        # Create interpolation
        InterpolationService.interpolate(str(self.calc_survey.id), 25)

        # Retrieve it
        interp = InterpolationService.get_interpolation(
            str(self.calc_survey.id),
            resolution=25
        )

        self.assertIsNotNone(interp)
        self.assertEqual(interp.resolution, 25)

    def test_get_interpolation_default(self):
        """Test retrieving default resolution interpolation."""
        # Create default resolution (10)
        InterpolationService.interpolate(str(self.calc_survey.id), 10)

        # Retrieve default (no resolution specified)
        interp = InterpolationService.get_interpolation(str(self.calc_survey.id))

        self.assertIsNotNone(interp)
        self.assertEqual(interp.resolution, 10)

    def test_interpolation_performance(self):
        """Test interpolation performance for large dataset."""
        # Create new survey file for performance test
        survey_file_large = SurveyFile.objects.create(
            run=self.run,
            file_name='test_large.csv',
            file_path='/tmp/test_large.csv',
            file_size=10240,
            survey_type='MWD',
            processing_status='completed'
        )

        # Create larger dataset
        num_points = 100
        md_data = [i * 10.0 for i in range(num_points)]
        inc_data = [i * 0.5 for i in range(num_points)]
        azi_data = [i * 1.0 for i in range(num_points)]

        survey_data_large = SurveyData.objects.create(
            survey_file=survey_file_large,
            md_data=md_data,
            inc_data=inc_data,
            azi_data=azi_data,
            row_count=num_points,
            validation_status='valid'
        )

        calc_survey_large = CalculatedSurvey.objects.create(
            survey_data=survey_data_large,
            easting=[i * 1.0 for i in range(num_points)],
            northing=[i * 1.0 for i in range(num_points)],
            tvd=[i * 9.99 for i in range(num_points)],
            dls=[2.87] * num_points,
            build_rate=[2.87] * num_points,
            turn_rate=[0.0] * num_points,
            calculation_status='calculated',
            calculation_duration=0.5,
            calculation_context={}
        )

        start_time = time.time()
        interp_survey = InterpolationService.interpolate(
            calculated_survey_id=str(calc_survey_large.id),
            resolution=10
        )
        duration = time.time() - start_time

        self.assertEqual(interp_survey.interpolation_status, 'completed')
        self.assertLess(duration, 2.0, f"Interpolation took {duration:.3f}s, expected < 2s")
        print(f"Performance: Interpolated {interp_survey.point_count} points in {duration:.3f}s")
