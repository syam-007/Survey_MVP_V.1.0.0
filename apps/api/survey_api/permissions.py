"""
Custom permission classes for Survey API.

Provides permission checks for model-specific access control.
"""
from rest_framework.permissions import BasePermission


class IsComparisonOwner(BasePermission):
    """
    Permission class to check if user owns the comparison.

    Grants permission if the comparison was created by the requesting user.
    """

    def has_object_permission(self, request, view, obj):
        """
        Check if request.user created the comparison.

        Args:
            request: HTTP request object
            view: View being accessed
            obj: ComparisonResult instance

        Returns:
            bool: True if user owns the comparison, False otherwise
        """
        return obj.created_by == request.user
