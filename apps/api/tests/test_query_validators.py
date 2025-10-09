"""
Unit tests for query parameter validators.

Tests validation functions for filters, search parameters, and pagination.
"""

from django.test import TestCase
from datetime import datetime
from uuid import uuid4
from survey_api.validators.query_validators import (
    validate_run_type,
    validate_well_type,
    validate_uuid,
    validate_date_range,
    validate_page_size,
    validate_page_number,
    validate_ordering_field,
    QueryValidationError
)


class RunTypeValidatorTest(TestCase):
    """Test validate_run_type function"""

    def test_validate_run_type_valid_gtl(self):
        """Test validation passes for valid run_type: GTL"""
        result = validate_run_type('GTL')
        self.assertEqual(result, 'GTL')

    def test_validate_run_type_valid_gyro(self):
        """Test validation passes for valid run_type: Gyro"""
        result = validate_run_type('Gyro')
        self.assertEqual(result, 'Gyro')

    def test_validate_run_type_valid_mwd(self):
        """Test validation passes for valid run_type: MWD"""
        result = validate_run_type('MWD')
        self.assertEqual(result, 'MWD')

    def test_validate_run_type_valid_unknown(self):
        """Test validation passes for valid run_type: Unknown"""
        result = validate_run_type('Unknown')
        self.assertEqual(result, 'Unknown')

    def test_validate_run_type_invalid(self):
        """Test validation fails for invalid run_type"""
        with self.assertRaises(QueryValidationError) as context:
            validate_run_type('InvalidType')

        self.assertIn('run_type', context.exception.detail)
        self.assertIn('Invalid run_type', str(context.exception.detail['run_type']))

    def test_validate_run_type_case_sensitive(self):
        """Test validation is case-sensitive"""
        with self.assertRaises(QueryValidationError):
            validate_run_type('gtl')  # lowercase should fail


class WellTypeValidatorTest(TestCase):
    """Test validate_well_type function"""

    def test_validate_well_type_valid_oil(self):
        """Test validation passes for valid well_type: Oil"""
        result = validate_well_type('Oil')
        self.assertEqual(result, 'Oil')

    def test_validate_well_type_valid_gas(self):
        """Test validation passes for valid well_type: Gas"""
        result = validate_well_type('Gas')
        self.assertEqual(result, 'Gas')

    def test_validate_well_type_valid_water(self):
        """Test validation passes for valid well_type: Water"""
        result = validate_well_type('Water')
        self.assertEqual(result, 'Water')

    def test_validate_well_type_valid_other(self):
        """Test validation passes for valid well_type: Other"""
        result = validate_well_type('Other')
        self.assertEqual(result, 'Other')

    def test_validate_well_type_invalid(self):
        """Test validation fails for invalid well_type"""
        with self.assertRaises(QueryValidationError) as context:
            validate_well_type('InvalidType')

        self.assertIn('well_type', context.exception.detail)
        self.assertIn('Invalid well_type', str(context.exception.detail['well_type']))


class UUIDValidatorTest(TestCase):
    """Test validate_uuid function"""

    def test_validate_uuid_valid(self):
        """Test validation passes for valid UUID"""
        test_uuid = str(uuid4())
        result = validate_uuid(test_uuid)
        self.assertEqual(str(result), test_uuid)

    def test_validate_uuid_with_hyphens(self):
        """Test validation passes for UUID with hyphens"""
        test_uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
        result = validate_uuid(test_uuid)
        self.assertEqual(str(result), test_uuid)

    def test_validate_uuid_invalid_format(self):
        """Test validation fails for invalid UUID format"""
        with self.assertRaises(QueryValidationError) as context:
            validate_uuid('not-a-valid-uuid')

        self.assertIn('id', context.exception.detail)
        self.assertIn('Invalid UUID format', str(context.exception.detail['id']))

    def test_validate_uuid_empty_string(self):
        """Test validation fails for empty string"""
        with self.assertRaises(QueryValidationError) as context:
            validate_uuid('')

        self.assertIn('id', context.exception.detail)
        self.assertIn('UUID cannot be empty', str(context.exception.detail['id']))

    def test_validate_uuid_none(self):
        """Test validation fails for None"""
        with self.assertRaises(QueryValidationError):
            validate_uuid(None)

    def test_validate_uuid_custom_field_name(self):
        """Test validation uses custom field name in error"""
        with self.assertRaises(QueryValidationError) as context:
            validate_uuid('invalid', field_name='well_id')

        self.assertIn('well_id', context.exception.detail)


class DateRangeValidatorTest(TestCase):
    """Test validate_date_range function"""

    def test_validate_date_range_valid(self):
        """Test validation passes for valid date range"""
        start = '2024-01-01T00:00:00Z'
        end = '2024-12-31T23:59:59Z'
        start_dt, end_dt = validate_date_range(start, end)

        self.assertIsInstance(start_dt, datetime)
        self.assertIsInstance(end_dt, datetime)
        self.assertLess(start_dt, end_dt)

    def test_validate_date_range_same_date(self):
        """Test validation passes when start equals end"""
        date = '2024-06-15T12:00:00Z'
        start_dt, end_dt = validate_date_range(date, date)

        self.assertEqual(start_dt, end_dt)

    def test_validate_date_range_end_before_start(self):
        """Test validation fails when end is before start"""
        start = '2024-12-31T23:59:59Z'
        end = '2024-01-01T00:00:00Z'

        with self.assertRaises(QueryValidationError) as context:
            validate_date_range(start, end)

        self.assertIn('date_range', context.exception.detail)
        self.assertIn('must be after', str(context.exception.detail['date_range']))

    def test_validate_date_range_invalid_start_format(self):
        """Test validation fails for invalid start date format"""
        with self.assertRaises(QueryValidationError) as context:
            validate_date_range('invalid-date', '2024-12-31T23:59:59Z')

        self.assertIn('start', context.exception.detail)
        self.assertIn('Invalid date format', str(context.exception.detail['start']))

    def test_validate_date_range_invalid_end_format(self):
        """Test validation fails for invalid end date format"""
        with self.assertRaises(QueryValidationError) as context:
            validate_date_range('2024-01-01T00:00:00Z', 'not-a-date')

        self.assertIn('end', context.exception.detail)
        self.assertIn('Invalid date format', str(context.exception.detail['end']))

    def test_validate_date_range_both_invalid(self):
        """Test validation fails with multiple errors"""
        with self.assertRaises(QueryValidationError) as context:
            validate_date_range('bad-start', 'bad-end')

        # Should have errors for both fields
        self.assertIn('start', context.exception.detail)
        self.assertIn('end', context.exception.detail)

    def test_validate_date_range_none_values(self):
        """Test validation passes with None values (optional filters)"""
        start_dt, end_dt = validate_date_range(None, None)
        self.assertIsNone(start_dt)
        self.assertIsNone(end_dt)

    def test_validate_date_range_only_start(self):
        """Test validation with only start date"""
        start = '2024-01-01T00:00:00Z'
        start_dt, end_dt = validate_date_range(start, None)

        self.assertIsInstance(start_dt, datetime)
        self.assertIsNone(end_dt)

    def test_validate_date_range_only_end(self):
        """Test validation with only end date"""
        end = '2024-12-31T23:59:59Z'
        start_dt, end_dt = validate_date_range(None, end)

        self.assertIsNone(start_dt)
        self.assertIsInstance(end_dt, datetime)

    def test_validate_date_range_custom_field_names(self):
        """Test validation uses custom field names in errors"""
        with self.assertRaises(QueryValidationError) as context:
            validate_date_range(
                '2024-12-31',
                '2024-01-01',
                start_field='created_at_after',
                end_field='created_at_before'
            )

        self.assertIn('date_range', context.exception.detail)


class PageSizeValidatorTest(TestCase):
    """Test validate_page_size function"""

    def test_validate_page_size_valid(self):
        """Test validation passes for valid page_size"""
        result = validate_page_size(20)
        self.assertEqual(result, 20)

    def test_validate_page_size_string_number(self):
        """Test validation converts string to int"""
        result = validate_page_size('50')
        self.assertEqual(result, 50)

    def test_validate_page_size_exceeds_max(self):
        """Test validation caps at max_page_size"""
        result = validate_page_size(200, max_page_size=100)
        self.assertEqual(result, 100)  # Capped at max

    def test_validate_page_size_at_max(self):
        """Test validation allows max_page_size"""
        result = validate_page_size(100, max_page_size=100)
        self.assertEqual(result, 100)

    def test_validate_page_size_zero(self):
        """Test validation fails for zero"""
        with self.assertRaises(QueryValidationError) as context:
            validate_page_size(0)

        self.assertIn('page_size', context.exception.detail)
        self.assertIn('greater than 0', str(context.exception.detail['page_size']))

    def test_validate_page_size_negative(self):
        """Test validation fails for negative value"""
        with self.assertRaises(QueryValidationError) as context:
            validate_page_size(-10)

        self.assertIn('page_size', context.exception.detail)

    def test_validate_page_size_non_numeric(self):
        """Test validation fails for non-numeric string"""
        with self.assertRaises(QueryValidationError) as context:
            validate_page_size('abc')

        self.assertIn('page_size', context.exception.detail)
        self.assertIn('positive integer', str(context.exception.detail['page_size']))


class PageNumberValidatorTest(TestCase):
    """Test validate_page_number function"""

    def test_validate_page_number_valid(self):
        """Test validation passes for valid page number"""
        result = validate_page_number(1)
        self.assertEqual(result, 1)

    def test_validate_page_number_string(self):
        """Test validation converts string to int"""
        result = validate_page_number('5')
        self.assertEqual(result, 5)

    def test_validate_page_number_large(self):
        """Test validation passes for large page numbers"""
        result = validate_page_number(99999)
        self.assertEqual(result, 99999)

    def test_validate_page_number_zero(self):
        """Test validation fails for zero"""
        with self.assertRaises(QueryValidationError) as context:
            validate_page_number(0)

        self.assertIn('page', context.exception.detail)
        self.assertIn('greater than or equal to 1', str(context.exception.detail['page']))

    def test_validate_page_number_negative(self):
        """Test validation fails for negative value"""
        with self.assertRaises(QueryValidationError) as context:
            validate_page_number(-1)

        self.assertIn('page', context.exception.detail)

    def test_validate_page_number_non_numeric(self):
        """Test validation fails for non-numeric string"""
        with self.assertRaises(QueryValidationError):
            validate_page_number('invalid')


class OrderingFieldValidatorTest(TestCase):
    """Test validate_ordering_field function"""

    def test_validate_ordering_field_valid(self):
        """Test validation passes for valid field"""
        valid_fields = ['created_at', 'updated_at', 'run_number']
        result = validate_ordering_field('created_at', valid_fields)
        self.assertEqual(result, 'created_at')

    def test_validate_ordering_field_descending(self):
        """Test validation passes for descending order (- prefix)"""
        valid_fields = ['created_at', 'updated_at']
        result = validate_ordering_field('-created_at', valid_fields)
        self.assertEqual(result, '-created_at')

    def test_validate_ordering_field_invalid(self):
        """Test validation fails for invalid field"""
        valid_fields = ['created_at', 'updated_at']

        with self.assertRaises(QueryValidationError) as context:
            validate_ordering_field('invalid_field', valid_fields)

        self.assertIn('ordering', context.exception.detail)
        self.assertIn('Invalid ordering field', str(context.exception.detail['ordering']))

    def test_validate_ordering_field_invalid_descending(self):
        """Test validation fails for invalid field with - prefix"""
        valid_fields = ['created_at']

        with self.assertRaises(QueryValidationError):
            validate_ordering_field('-invalid_field', valid_fields)
