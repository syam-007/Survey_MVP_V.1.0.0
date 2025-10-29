from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class AuthenticationTestCase(TestCase):
    """Test cases for authentication endpoints"""

    def setUp(self):
        """Set up test client and test user"""
        self.client = APIClient()
        self.register_url = '/api/v1/auth/register'
        self.login_url = '/api/v1/auth/login'
        self.logout_url = '/api/v1/auth/logout'
        self.refresh_url = '/api/v1/auth/refresh'
        self.me_url = '/api/v1/auth/me'

        # Create test user
        self.test_user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPass123!',
            'first_name': 'Test',
            'last_name': 'User'
        }
        self.test_user = User.objects.create_user(
            username=self.test_user_data['username'],
            email=self.test_user_data['email'],
            password=self.test_user_data['password'],
            first_name=self.test_user_data['first_name'],
            last_name=self.test_user_data['last_name']
        )

    def test_user_registration_success(self):
        """Test successful user registration"""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'NewPass123!',
            'password_confirm': 'NewPass123!',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = self.client.post(self.register_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('user', response.data['data'])
        self.assertIn('tokens', response.data['data'])
        self.assertIn('access', response.data['data']['tokens'])
        self.assertIn('refresh', response.data['data']['tokens'])
        self.assertEqual(response.data['data']['user']['email'], data['email'])

    def test_user_registration_duplicate_email(self):
        """Test registration with duplicate email"""
        data = {
            'username': 'anotheruser',
            'email': self.test_user_data['email'],  # Existing email
            'password': 'NewPass123!',
            'password_confirm': 'NewPass123!',
        }
        response = self.client.post(self.register_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])

    def test_user_registration_password_mismatch(self):
        """Test registration with mismatched passwords"""
        data = {
            'username': 'testuser2',
            'email': 'test2@example.com',
            'password': 'Password123!',
            'password_confirm': 'DifferentPass123!',
        }
        response = self.client.post(self.register_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])

    def test_user_login_success(self):
        """Test successful user login"""
        data = {
            'email': self.test_user_data['email'],
            'password': self.test_user_data['password']
        }
        response = self.client.post(self.login_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('user', response.data['data'])
        self.assertIn('tokens', response.data['data'])
        self.assertIn('access', response.data['data']['tokens'])
        self.assertIn('refresh', response.data['data']['tokens'])

    def test_user_login_wrong_password(self):
        """Test login with incorrect password"""
        data = {
            'email': self.test_user_data['email'],
            'password': 'WrongPassword123!'
        }
        response = self.client.post(self.login_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data['success'])

    def test_user_login_nonexistent_user(self):
        """Test login with non-existent email"""
        data = {
            'email': 'nonexistent@example.com',
            'password': 'Password123!'
        }
        response = self.client.post(self.login_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data['success'])

    def test_token_refresh_success(self):
        """Test successful token refresh"""
        # First login to get tokens
        login_data = {
            'email': self.test_user_data['email'],
            'password': self.test_user_data['password']
        }
        login_response = self.client.post(self.login_url, login_data, format='json')
        refresh_token = login_response.data['data']['tokens']['refresh']

        # Refresh the token
        refresh_data = {'refresh': refresh_token}
        response = self.client.post(self.refresh_url, refresh_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_token_refresh_invalid_token(self):
        """Test token refresh with invalid token"""
        data = {'refresh': 'invalid_token_string'}
        response = self.client.post(self.refresh_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_endpoint_without_token(self):
        """Test accessing protected endpoint without token"""
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_endpoint_with_valid_token(self):
        """Test accessing protected endpoint with valid token"""
        # Login to get token
        login_data = {
            'email': self.test_user_data['email'],
            'password': self.test_user_data['password']
        }
        login_response = self.client.post(self.login_url, login_data, format='json')
        access_token = login_response.data['data']['tokens']['access']

        # Access protected endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['data']['user']['email'], self.test_user_data['email'])

    def test_protected_endpoint_with_invalid_token(self):
        """Test accessing protected endpoint with invalid token"""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token')
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_success(self):
        """Test successful logout"""
        # Login to get tokens
        login_data = {
            'email': self.test_user_data['email'],
            'password': self.test_user_data['password']
        }
        login_response = self.client.post(self.login_url, login_data, format='json')
        access_token = login_response.data['data']['tokens']['access']
        refresh_token = login_response.data['data']['tokens']['refresh']

        # Logout
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_data = {'refresh': refresh_token}
        response = self.client.post(self.logout_url, logout_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])

        # Try to use the refresh token (should fail as it's blacklisted)
        refresh_data = {'refresh': refresh_token}
        refresh_response = self.client.post(self.refresh_url, refresh_data, format='json')
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)
