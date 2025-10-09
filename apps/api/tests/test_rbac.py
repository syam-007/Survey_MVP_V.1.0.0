from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class RBACTestCase(TestCase):
    """Test cases for Role-Based Access Control"""

    def setUp(self):
        """Set up test users with different roles"""
        self.client = APIClient()

        # Create users with different roles
        self.admin = User.objects.create_user(
            username='admin_user',
            email='admin@test.com',
            password='TestPass123!',
            role='Admin'
        )

        self.engineer = User.objects.create_user(
            username='engineer_user',
            email='engineer@test.com',
            password='TestPass123!',
            role='Engineer'
        )

        self.viewer = User.objects.create_user(
            username='viewer_user',
            email='viewer@test.com',
            password='TestPass123!',
            role='Viewer'
        )

    def test_user_model_has_role_field(self):
        """Test that User model has role field with correct choices"""
        self.assertEqual(self.admin.role, 'Admin')
        self.assertEqual(self.engineer.role, 'Engineer')
        self.assertEqual(self.viewer.role, 'Viewer')

    def test_user_role_helper_methods(self):
        """Test User model helper methods"""
        # Admin tests
        self.assertTrue(self.admin.is_admin())
        self.assertTrue(self.admin.is_engineer())  # Admin has Engineer privileges
        self.assertFalse(self.admin.is_viewer())

        # Engineer tests
        self.assertFalse(self.engineer.is_admin())
        self.assertTrue(self.engineer.is_engineer())
        self.assertFalse(self.engineer.is_viewer())

        # Viewer tests
        self.assertFalse(self.viewer.is_admin())
        self.assertFalse(self.viewer.is_engineer())
        self.assertTrue(self.viewer.is_viewer())

    def test_admin_can_list_users(self):
        """Test that Admin can access user list endpoint"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/users')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('users', response.data['data'])
        self.assertEqual(response.data['data']['count'], 3)

    def test_engineer_cannot_list_users(self):
        """Test that Engineer cannot access user list endpoint"""
        self.client.force_authenticate(user=self.engineer)
        response = self.client.get('/api/v1/users')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_cannot_list_users(self):
        """Test that Viewer cannot access user list endpoint"""
        self.client.force_authenticate(user=self.viewer)
        response = self.client.get('/api/v1/users')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_get_user_details(self):
        """Test that Admin can get user details"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/v1/users/{self.engineer.id}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['user']['username'], 'engineer_user')

    def test_admin_can_update_user_role(self):
        """Test that Admin can update user role"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/v1/users/{self.viewer.id}/update',
            {'role': 'Engineer'},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['user']['role'], 'Engineer')

        # Verify role was actually updated
        self.viewer.refresh_from_db()
        self.assertEqual(self.viewer.role, 'Engineer')

    def test_admin_cannot_demote_self(self):
        """Test that Admin cannot remove their own admin role"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/v1/users/{self.admin.id}/update',
            {'role': 'Viewer'},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('cannot remove your own admin role', response.data['message'])

    def test_admin_can_delete_user(self):
        """Test that Admin can delete users"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/v1/users/{self.viewer.id}/delete')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertFalse(User.objects.filter(id=self.viewer.id).exists())

    def test_admin_cannot_delete_self(self):
        """Test that Admin cannot delete their own account"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/v1/users/{self.admin.id}/delete')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('cannot delete your own account', response.data['message'])

    def test_engineer_cannot_manage_users(self):
        """Test that Engineer cannot perform user management operations"""
        self.client.force_authenticate(user=self.engineer)

        # Try to update a user
        response = self.client.patch(
            f'/api/v1/users/{self.viewer.id}/update',
            {'role': 'Admin'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Try to delete a user
        response = self.client.delete(f'/api/v1/users/{self.viewer.id}/delete')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_access_returns_401(self):
        """Test that unauthenticated access returns 401"""
        response = self.client.get('/api/v1/users')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_auth_endpoints_include_role(self):
        """Test that authentication endpoints return user role"""
        # Test login
        login_data = {
            'email': 'admin@test.com',
            'password': 'TestPass123!'
        }
        response = self.client.post('/api/v1/auth/login', login_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['user']['role'], 'Admin')

        # Test /me endpoint
        access_token = response.data['data']['tokens']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get('/api/v1/auth/me')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['user']['role'], 'Admin')

    def test_default_role_is_viewer(self):
        """Test that new users get Viewer role by default"""
        register_data = {
            'username': 'newuser',
            'email': 'newuser@test.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = self.client.post('/api/v1/auth/register', register_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['user']['role'], 'Viewer')

    def test_seed_admin_command(self):
        """Test that seed_admin command creates admin user"""
        from django.core.management import call_command

        # Delete existing admin to test command
        User.objects.filter(username='admin').delete()

        # Run seed_admin command
        call_command('seed_admin', username='testadmin', email='testadmin@test.com', password='admin123')

        # Verify admin was created
        admin = User.objects.get(username='testadmin')
        self.assertEqual(admin.role, 'Admin')
        self.assertEqual(admin.email, 'testadmin@test.com')
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_seed_admin_command_idempotent(self):
        """Test that seed_admin command is idempotent (doesn't fail if admin exists)"""
        from django.core.management import call_command

        # Run command twice
        call_command('seed_admin', username='idempotent_admin', email='idempotent@test.com', password='admin123')
        call_command('seed_admin', username='idempotent_admin', email='idempotent@test.com', password='admin123')

        # Should only have one admin with this username
        admin_count = User.objects.filter(username='idempotent_admin').count()
        self.assertEqual(admin_count, 1)
