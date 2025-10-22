"""
Tests for file parsing and validation services.
"""
from django.test import TestCase
import os

from survey_api.services.file_parser_service import FileParserService, FileParsingError
from survey_api.utils.survey_validators import SurveyFileValidator


class FileParserServiceTest(TestCase):
    """Test cases for FileParserService"""

    def setUp(self):
        self.fixtures_dir = os.path.join(os.path.dirname(__file__), 'fixtures')

    def test_parse_valid_gtl_excel(self):
        """Test parsing valid GTL survey Excel file"""
        file_path = os.path.join(self.fixtures_dir, 'valid_gtl_survey.xlsx')
        result = FileParserService.parse_survey_file(file_path, 'Type 1 - GTL')

        self.assertIsNotNone(result['md_data'])
        self.assertIsNotNone(result['inc_data'])
        self.assertIsNotNone(result['azi_data'])
        self.assertIsNotNone(result['wt_data'])
        self.assertIsNotNone(result['gt_data'])
        self.assertEqual(result['row_count'], 5)
        self.assertEqual(len(result['md_data']), 5)

    def test_parse_valid_gtl_csv(self):
        """Test parsing valid GTL survey CSV file"""
        file_path = os.path.join(self.fixtures_dir, 'valid_gtl_survey.csv')
        result = FileParserService.parse_survey_file(file_path, 'Type 1 - GTL')

        self.assertEqual(result['row_count'], 5)
        self.assertIsInstance(result['md_data'], list)
        self.assertIsInstance(result['inc_data'], list)

    def test_parse_valid_gyro_excel(self):
        """Test parsing valid Gyro survey Excel file"""
        file_path = os.path.join(self.fixtures_dir, 'valid_gyro_survey.xlsx')
        result = FileParserService.parse_survey_file(file_path, 'Type 2 - Gyro')

        self.assertIsNotNone(result['md_data'])
        self.assertIsNotNone(result['inc_data'])
        self.assertIsNotNone(result['azi_data'])
        self.assertIsNone(result['wt_data'])  # Gyro doesn't have w(t)
        self.assertIsNone(result['gt_data'])  # Gyro doesn't have g(t)
        self.assertEqual(result['row_count'], 5)

    def test_parse_missing_column(self):
        """Test parsing file with missing required column"""
        file_path = os.path.join(self.fixtures_dir, 'invalid_missing_column.xlsx')

        with self.assertRaises(FileParsingError) as context:
            FileParserService.parse_survey_file(file_path, 'Type 2 - Gyro')

        self.assertIn('Missing required column: Azi', str(context.exception))

    def test_parse_nonexistent_file(self):
        """Test parsing nonexistent file"""
        file_path = '/nonexistent/file.xlsx'

        with self.assertRaises(FileParsingError) as context:
            FileParserService.parse_survey_file(file_path, 'Type 2 - Gyro')

        self.assertIn('File not found', str(context.exception))

    def test_parse_unsupported_file_type(self):
        """Test parsing unsupported file type"""
        file_path = '/test/file.txt'

        with self.assertRaises(FileParsingError) as context:
            FileParserService.parse_survey_file(file_path, 'Type 2 - Gyro')

        self.assertIn('Unsupported file type', str(context.exception))


class SurveyFileValidatorTest(TestCase):
    """Test cases for SurveyFileValidator"""

    def test_validate_valid_gtl_data(self):
        """Test validation of valid GTL survey data"""
        parsed_data = {
            'md_data': [0, 100, 200, 300],
            'inc_data': [0, 5, 10, 15],
            'azi_data': [0, 45, 90, 135],
            'wt_data': [0.1, 0.2, 0.3, 0.4],
            'gt_data': [0.2, 0.3, 0.4, 0.5],
            'row_count': 4
        }

        is_valid, errors = SurveyFileValidator.validate_file(
            parsed_data,
            'Type 1 - GTL'
        )

        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)

    def test_validate_valid_gyro_data(self):
        """Test validation of valid Gyro survey data"""
        parsed_data = {
            'md_data': [0, 50, 100, 150],
            'inc_data': [0, 10, 20, 30],
            'azi_data': [0, 90, 180, 270],
            'wt_data': None,
            'gt_data': None,
            'row_count': 4
        }

        is_valid, errors = SurveyFileValidator.validate_file(
            parsed_data,
            'Type 2 - Gyro'
        )

        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)

    def test_validate_missing_required_column_gtl(self):
        """Test validation fails when GTL survey missing required column"""
        parsed_data = {
            'md_data': [0, 100, 200],
            'inc_data': [0, 5, 10],
            'azi_data': [0, 45, 90],
            'wt_data': None,  # Missing w(t)
            'gt_data': [0.2, 0.3, 0.4],
            'row_count': 3
        }

        is_valid, errors = SurveyFileValidator.validate_file(
            parsed_data,
            'Type 1 - GTL'
        )

        self.assertFalse(is_valid)
        self.assertGreater(len(errors), 0)
        self.assertTrue(any('w(t)' in error for error in errors))

    def test_validate_inclination_out_of_range(self):
        """Test validation fails for inclination outside 0-180 degrees"""
        parsed_data = {
            'md_data': [0, 100, 200],
            'inc_data': [0, 5, 185],  # 185 exceeds max (180)
            'azi_data': [0, 45, 90],
            'wt_data': None,
            'gt_data': None,
            'row_count': 3
        }

        is_valid, errors = SurveyFileValidator.validate_file(
            parsed_data,
            'Type 2 - Gyro'
        )

        self.assertFalse(is_valid)
        self.assertTrue(any('185' in error and 'Inclination' in error for error in errors))

    def test_validate_azimuth_out_of_range(self):
        """Test validation fails for azimuth outside 0-360 degrees"""
        parsed_data = {
            'md_data': [0, 100, 200],
            'inc_data': [0, 5, 10],
            'azi_data': [0, 45, 365],  # 365 exceeds max (360)
            'wt_data': None,
            'gt_data': None,
            'row_count': 3
        }

        is_valid, errors = SurveyFileValidator.validate_file(
            parsed_data,
            'Type 2 - Gyro'
        )

        self.assertFalse(is_valid)
        self.assertTrue(any('365' in error and 'Azimuth' in error for error in errors))

    def test_validate_negative_md(self):
        """Test validation fails for negative MD values"""
        parsed_data = {
            'md_data': [0, 100, -50],  # -50 is invalid
            'inc_data': [0, 5, 10],
            'azi_data': [0, 45, 90],
            'wt_data': None,
            'gt_data': None,
            'row_count': 3
        }

        is_valid, errors = SurveyFileValidator.validate_file(
            parsed_data,
            'Type 2 - Gyro'
        )

        self.assertFalse(is_valid)
        self.assertTrue(any('MD' in error and 'non-negative' in error for error in errors))

    def test_validate_md_not_sequential(self):
        """Test validation fails when MD values are not strictly increasing"""
        parsed_data = {
            'md_data': [0, 100, 50],  # 50 < 100, not sequential
            'inc_data': [0, 5, 10],
            'azi_data': [0, 45, 90],
            'wt_data': None,
            'gt_data': None,
            'row_count': 3
        }

        is_valid, errors = SurveyFileValidator.validate_file(
            parsed_data,
            'Type 2 - Gyro'
        )

        self.assertFalse(is_valid)
        self.assertTrue(any('not strictly increasing' in error for error in errors))

    def test_validate_non_numeric_data(self):
        """Test validation fails for non-numeric data"""
        parsed_data = {
            'md_data': [0, 'invalid', 200],  # 'invalid' is not numeric
            'inc_data': [0, 5, 10],
            'azi_data': [0, 45, 90],
            'wt_data': None,
            'gt_data': None,
            'row_count': 3
        }

        is_valid, errors = SurveyFileValidator.validate_file(
            parsed_data,
            'Type 2 - Gyro'
        )

        self.assertFalse(is_valid)
        self.assertTrue(any('Non-numeric' in error for error in errors))

    def test_validate_missing_values(self):
        """Test validation fails for missing values in critical columns"""
        parsed_data = {
            'md_data': [0, None, 200],  # None is invalid
            'inc_data': [0, 5, 10],
            'azi_data': [0, 45, 90],
            'wt_data': None,
            'gt_data': None,
            'row_count': 3
        }

        is_valid, errors = SurveyFileValidator.validate_file(
            parsed_data,
            'Type 2 - Gyro'
        )

        self.assertFalse(is_valid)
        self.assertTrue(any('Missing value' in error for error in errors))

    def test_validate_multiple_errors(self):
        """Test validation returns multiple error messages"""
        parsed_data = {
            'md_data': [0, 50, 100],  # Valid
            'inc_data': [0, 200, 10],  # 200 exceeds max
            'azi_data': [0, 45, 400],  # 400 exceeds max
            'wt_data': None,
            'gt_data': None,
            'row_count': 3
        }

        is_valid, errors = SurveyFileValidator.validate_file(
            parsed_data,
            'Type 2 - Gyro'
        )

        self.assertFalse(is_valid)
        self.assertGreaterEqual(len(errors), 2)  # At least 2 errors
