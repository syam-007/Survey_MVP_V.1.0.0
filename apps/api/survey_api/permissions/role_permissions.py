from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework import status
from functools import wraps


class IsAdmin(BasePermission):
    """
    Permission class to allow access only to Admin users.
    """
    message = "You do not have permission to perform this action. Admin role required."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin()


class IsEngineerOrAdmin(BasePermission):
    """
    Permission class to allow access to Engineer and Admin users.
    """
    message = "You do not have permission to perform this action. Engineer or Admin role required."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_engineer()


class IsViewerOrAbove(BasePermission):
    """
    Permission class to allow all authenticated users read access.
    Write operations require Engineer or Admin role.
    """
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        # All authenticated users can read
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return request.user.is_authenticated

        # Only Engineer or Admin can write
        return request.user.is_authenticated and request.user.is_engineer()


def require_role(*allowed_roles):
    """
    Decorator for function-based views to require specific roles.

    Usage:
        @require_role('Admin')
        def admin_only_view(request):
            ...

        @require_role('Admin', 'Engineer')
        def engineer_or_admin_view(request):
            ...

    Args:
        *allowed_roles: Variable length argument list of allowed role names

    Returns:
        Decorated view function that checks user role before execution
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return Response({
                    'success': False,
                    'message': 'Authentication required',
                    'error_code': 'AUTHENTICATION_REQUIRED'
                }, status=status.HTTP_401_UNAUTHORIZED)

            # Check if user role is in allowed roles
            if request.user.role not in allowed_roles:
                return Response({
                    'success': False,
                    'message': 'You do not have permission to perform this action',
                    'error_code': 'PERMISSION_DENIED',
                    'required_role': list(allowed_roles)
                }, status=status.HTTP_403_FORBIDDEN)

            return view_func(request, *args, **kwargs)

        return wrapped_view
    return decorator
