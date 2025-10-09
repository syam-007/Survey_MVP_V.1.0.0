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

    # For unhandled exceptions, return 500
    return Response(
        {
            'error': 'InternalServerError',
            'message': 'An unexpected error occurred',
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
