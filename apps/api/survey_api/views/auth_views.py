from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import authenticate, get_user_model

from survey_api.serializers.user_serializer import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer
)

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    User registration endpoint
    POST /api/v1/auth/register
    """
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()
        user_serializer = UserSerializer(user)

        # Generate tokens for the new user
        refresh = RefreshToken.for_user(user)

        return Response({
            'success': True,
            'message': 'User registered successfully',
            'data': {
                'user': user_serializer.data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                }
            }
        }, status=status.HTTP_201_CREATED)

    return Response({
        'success': False,
        'message': 'Registration failed',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    User login endpoint
    POST /api/v1/auth/login
    """
    serializer = LoginSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            'success': False,
            'message': 'Invalid input',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']
    password = serializer.validated_data['password']

    # Find user by email
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)

    # Authenticate with username (Django's default)
    user = authenticate(username=user.username, password=password)

    if user is None:
        return Response({
            'success': False,
            'message': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)

    # Generate tokens
    refresh = RefreshToken.for_user(user)
    user_serializer = UserSerializer(user)

    return Response({
        'success': True,
        'message': 'Login successful',
        'data': {
            'user': user_serializer.data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    User logout endpoint (blacklists refresh token)
    POST /api/v1/auth/logout
    """
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({
                'success': False,
                'message': 'Refresh token is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        token = RefreshToken(refresh_token)
        token.blacklist()

        return Response({
            'success': True,
            'message': 'Logout successful'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Logout failed',
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    Get current user information
    GET /api/v1/auth/me
    """
    serializer = UserSerializer(request.user)
    return Response({
        'success': True,
        'data': {
            'user': serializer.data
        }
    }, status=status.HTTP_200_OK)
