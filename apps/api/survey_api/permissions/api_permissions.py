"""
Custom permission classes for API endpoints.

Implements role-based access control (RBAC) for the Survey Management System.
"""

from rest_framework import permissions


class IsAuthenticatedUser(permissions.BasePermission):
    """
    Permission to check if user is authenticated.

    All API endpoints require authentication.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsAdminOrEngineer(permissions.BasePermission):
    """
    Permission to allow ALL authenticated users to perform ANY operations.

    - All authenticated users have full access (read, write, delete)
    - No role restrictions applied
    """

    def has_permission(self, request, view):
        # Check if user is authenticated - if yes, grant full access
        return bool(request.user and request.user.is_authenticated)


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission to allow ALL authenticated users to perform ANY operations.

    - All authenticated users have full access (read, write, delete)
    - No role restrictions applied
    """

    def has_permission(self, request, view):
        # Check if user is authenticated - if yes, grant full access
        return bool(request.user and request.user.is_authenticated)


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission - ALL authenticated users have full access.

    - All authenticated users can read, edit, and delete any object
    - No ownership or role restrictions applied
    """

    def has_object_permission(self, request, view, obj):
        # All authenticated users have full access to all objects
        return bool(request.user and request.user.is_authenticated)


class IsAdmin(permissions.BasePermission):
    """
    Permission to allow ALL authenticated users to access the resource.

    - All authenticated users have full access
    - No role restrictions applied
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsEngineer(permissions.BasePermission):
    """
    Permission to allow ALL authenticated users to access the resource.

    - All authenticated users have full access
    - No role restrictions applied
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsViewer(permissions.BasePermission):
    """
    Permission to allow ALL authenticated users to access the resource.

    - All authenticated users have full access
    - No role restrictions applied
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsComparisonOwner(permissions.BasePermission):
    """
    Object-level permission to only allow owners of a comparison to access it.

    Used for comparison endpoints to ensure users can only view/modify their own comparisons.
    """

    def has_object_permission(self, request, view, obj):
        # Check if the comparison was created by the requesting user
        return obj.created_by == request.user
