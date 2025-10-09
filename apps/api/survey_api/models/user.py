from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid


class User(AbstractUser):
    """
    Custom User model with role-based access control.

    Extends Django's AbstractUser to add role field for RBAC.
    Three roles supported: Admin, Engineer, Viewer
    """

    ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('Engineer', 'Engineer'),
        ('Viewer', 'Viewer'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='Viewer',
        help_text='User role for access control'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def is_admin(self):
        """Check if user has Admin role"""
        return self.role == 'Admin'

    def is_engineer(self):
        """Check if user has Engineer or Admin role"""
        return self.role in ['Admin', 'Engineer']

    def is_viewer(self):
        """Check if user has Viewer role"""
        return self.role == 'Viewer'

    def can_manage_users(self):
        """Check if user can manage other users (Admin only)"""
        return self.is_admin()

    def can_create_runs(self):
        """Check if user can create survey runs (Admin, Engineer)"""
        return self.is_engineer()

    def __str__(self):
        return f"{self.username} ({self.role})"
