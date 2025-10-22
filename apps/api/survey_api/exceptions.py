"""
Custom exception classes for the Survey API.

Provides custom exceptions and exception handler for consistent error responses.
"""

from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404


class RunNotFoundError(Exception):
    """Exception raised when a run is not found."""
    pass


class UnauthorizedError(Exception):
    """Exception raised when user lacks authorization."""
    pass


class ValidationError(Exception):
    """Exception raised when validation fails."""

    def __init__(self, message, field_errors=None):
        super().__init__(message)
        self.field_errors = field_errors or {}


class FileValidationError(Exception):
    """
    Raised when uploaded file fails validation.

    This exception should be raised when survey file validation fails
    (e.g., missing columns, invalid ranges, sequence errors).
    """
    pass


class FileParsingError(Exception):
    """
    Raised when file cannot be parsed.

    This exception should be raised when the file cannot be read or parsed
    (e.g., corrupt file, unsupported format, parsing errors).
    """
    pass


class WellengCalculationError(Exception):
    """
    Raised when welleng calculation fails.

    This exception should be raised when survey trajectory calculation fails
    (e.g., invalid data format, array length mismatch, calculation errors).
    """
    pass


class InsufficientDataError(Exception):
    """
    Raised when required context data is missing for calculation.

    This exception should be raised when necessary location, tie-on, or depth
    data is not available for performing survey calculations.
    """
    pass


class InsufficientOverlapError(Exception):
    """
    Raised when surveys do not have sufficient MD overlap for comparison.

    This exception should be raised when comparing two surveys that don't
    have overlapping measured depth ranges.
    """
    pass


class InvalidSurveyDataError(Exception):
    """
    Raised when survey data is invalid for comparison.

    This exception should be raised when survey data doesn't meet requirements
    for comparison (e.g., not calculated, insufficient points).
    """
    pass


class DeltaCalculationError(Exception):
    """
    Raised when delta calculation fails.

    This exception should be raised when the delta calculation process encounters
    an error (e.g., calculation failure, invalid data format).
    """
    pass


def custom_exception_handler(exc, context):
    """
    Custom exception handler for DRF.

    Returns proper JSON responses for all exceptions with consistent format:
    {
        "error": "error_type",
        "message": "Human readable message",
        "details": {} // Optional field errors
    }
    """
    # Call DRF's default exception handler first
    response = drf_exception_handler(exc, context)

    # If DRF handled it, customize the response format
    if response is not None:
        custom_response = {
            'error': exc.__class__.__name__,
            'message': str(exc),
        }

        # Add field errors if available
        if hasattr(exc, 'detail'):
            if isinstance(exc.detail, dict):
                custom_response['details'] = exc.detail
            elif isinstance(exc.detail, list):
                custom_response['details'] = {'non_field_errors': exc.detail}

        response.data = custom_response
        return response

    # Handle custom exceptions
    if isinstance(exc, RunNotFoundError):
        return Response(
            {
                'error': 'RunNotFoundError',
                'message': str(exc) or 'Run not found',
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if isinstance(exc, UnauthorizedError):
        return Response(
            {
                'error': 'UnauthorizedError',
                'message': str(exc) or 'You do not have permission to perform this action',
            },
            status=status.HTTP_403_FORBIDDEN
        )

    if isinstance(exc, ValidationError):
        response_data = {
            'error': 'ValidationError',
            'message': str(exc),
        }
        if exc.field_errors:
            response_data['details'] = exc.field_errors
        return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

    # Handle Django's built-in exceptions
    if isinstance(exc, Http404):
        return Response(
            {
                'error': 'NotFound',
                'message': 'Resource not found',
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if isinstance(exc, DjangoPermissionDenied):
        return Response(
            {
                'error': 'PermissionDenied',
                'message': str(exc) or 'You do not have permission to perform this action',
            },
            status=status.HTTP_403_FORBIDDEN
        )

    if isinstance(exc, PermissionError):
        return Response(
            {
                'error': 'PermissionError',
                'message': str(exc) or 'You do not have permission to perform this action',
            },
            status=status.HTTP_403_FORBIDDEN
        )

    # Handle calculation exceptions
    if isinstance(exc, WellengCalculationError):
        return Response(
            {
                'error': 'WellengCalculationError',
                'message': str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if isinstance(exc, InsufficientDataError):
        return Response(
            {
                'error': 'InsufficientDataError',
                'message': str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if isinstance(exc, FileValidationError):
        return Response(
            {
                'error': 'FileValidationError',
                'message': str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if isinstance(exc, FileParsingError):
        return Response(
            {
                'error': 'FileParsingError',
                'message': str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Handle comparison exceptions
    if isinstance(exc, InsufficientOverlapError):
        return Response(
            {
                'error': 'InsufficientOverlapError',
                'message': str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if isinstance(exc, InvalidSurveyDataError):
        return Response(
            {
                'error': 'InvalidSurveyDataError',
                'message': str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if isinstance(exc, DeltaCalculationError):
        return Response(
            {
                'error': 'DeltaCalculationError',
                'message': str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # For unhandled exceptions, return 500
    return Response(
        {
            'error': 'InternalServerError',
            'message': 'An unexpected error occurred',
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
