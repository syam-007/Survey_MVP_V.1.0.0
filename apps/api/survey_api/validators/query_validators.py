"""
Query parameter validators for the Survey API.

Provides validation functions for query parameters including filters,
search terms, and pagination parameters.
"""

from uuid import UUID
from datetime import datetime
from rest_framework.exceptions import ValidationError as DRFValidationError


class QueryValidationError(DRFValidationError):
    """Custom exception for query parameter validation errors"""
    pass


def validate_run_type(value):
    """
    Validate run_type query parameter.

    Args:
        value: The run_type value to validate

    Returns:
        str: The validated run_type value

    Raises:
        QueryValidationError: If run_type is not a valid choice
    """
    from survey_api.models import Run

    valid_types = [choice[0] for choice in Run.RUN_TYPE_CHOICES]

    if value not in valid_types:
        raise QueryValidationError({
            'run_type': f'Invalid run_type. Must be one of: {", ".join(valid_types)}'
        })

    return value


def validate_well_type(value):
    """
    Validate well_type query parameter.

    Args:
        value: The well_type value to validate

    Returns:
        str: The validated well_type value

    Raises:
        QueryValidationError: If well_type is not a valid choice
    """
    from survey_api.models import Well

    valid_types = [choice[0] for choice in Well.WELL_TYPE_CHOICES]

    if value not in valid_types:
        raise QueryValidationError({
            'well_type': f'Invalid well_type. Must be one of: {", ".join(valid_types)}'
        })

    return value


def validate_uuid(value, field_name='id'):
    """
    Validate UUID format.

    Args:
        value: The UUID string to validate
        field_name: Name of the field for error messages

    Returns:
        UUID: The validated UUID object

    Raises:
        QueryValidationError: If UUID format is invalid
    """
    if not value:
        raise QueryValidationError({
            field_name: 'UUID cannot be empty'
        })

    try:
        uuid_obj = UUID(str(value))
        return uuid_obj
    except (ValueError, AttributeError, TypeError):
        raise QueryValidationError({
            field_name: f'Invalid UUID format: {value}'
        })


def validate_date_range(start_date, end_date, start_field='start', end_field='end'):
    """
    Validate date range.

    Args:
        start_date: Start date string or datetime object
        end_date: End date string or datetime object
        start_field: Name of start field for error messages
        end_field: Name of end field for error messages

    Returns:
        tuple: (start_datetime, end_datetime) validated datetime objects

    Raises:
        QueryValidationError: If date range is invalid or end < start
    """
    errors = {}

    # Parse start date
    start_dt = None
    if start_date:
        if isinstance(start_date, datetime):
            start_dt = start_date
        else:
            try:
                start_dt = datetime.fromisoformat(str(start_date).replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                errors[start_field] = f'Invalid date format: {start_date}. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)'

    # Parse end date
    end_dt = None
    if end_date:
        if isinstance(end_date, datetime):
            end_dt = end_date
        else:
            try:
                end_dt = datetime.fromisoformat(str(end_date).replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                errors[end_field] = f'Invalid date format: {end_date}. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)'

    # Check if both dates are valid before comparing
    if errors:
        raise QueryValidationError(errors)

    # Validate range (end must be after start)
    if start_dt and end_dt and end_dt < start_dt:
        raise QueryValidationError({
            'date_range': f'{end_field} ({end_date}) must be after {start_field} ({start_date})'
        })

    return start_dt, end_dt


def validate_page_size(value, max_page_size=100):
    """
    Validate page_size query parameter.

    Args:
        value: The page_size value to validate
        max_page_size: Maximum allowed page size

    Returns:
        int: The validated page_size value (capped at max_page_size)

    Raises:
        QueryValidationError: If page_size is invalid (negative, zero, or non-integer)
    """
    try:
        page_size = int(value)
    except (ValueError, TypeError):
        raise QueryValidationError({
            'page_size': f'Invalid page_size: {value}. Must be a positive integer.'
        })

    if page_size <= 0:
        raise QueryValidationError({
            'page_size': f'page_size must be greater than 0. Got: {page_size}'
        })

    # Cap at max_page_size (don't raise error, just cap it)
    if page_size > max_page_size:
        return max_page_size

    return page_size


def validate_page_number(value):
    """
    Validate page query parameter.

    Args:
        value: The page number to validate

    Returns:
        int: The validated page number

    Raises:
        QueryValidationError: If page number is invalid (negative or non-integer)
    """
    try:
        page = int(value)
    except (ValueError, TypeError):
        raise QueryValidationError({
            'page': f'Invalid page number: {value}. Must be a positive integer.'
        })

    if page < 1:
        raise QueryValidationError({
            'page': f'page must be greater than or equal to 1. Got: {page}'
        })

    return page


def validate_ordering_field(value, valid_fields):
    """
    Validate ordering query parameter.

    Args:
        value: The ordering field (with optional - prefix for descending)
        valid_fields: List of valid field names

    Returns:
        str: The validated ordering value

    Raises:
        QueryValidationError: If ordering field is not valid
    """
    # Remove leading - if present (descending order)
    field = value.lstrip('-')

    if field not in valid_fields:
        raise QueryValidationError({
            'ordering': f'Invalid ordering field: {field}. Must be one of: {", ".join(valid_fields)}'
        })

    return value
