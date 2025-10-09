from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from survey_api.serializers.user_serializer import UserManagementSerializer
from survey_api.permissions import IsAdmin

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_users(request):
    """
    List all users (Admin only)
    GET /api/v1/users
    """
    users = User.objects.all().order_by('-created_at')
    serializer = UserManagementSerializer(users, many=True)

    return Response({
        'success': True,
        'data': {
            'users': serializer.data,
            'count': users.count()
        }
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAdmin])
def get_user(request, user_id):
    """
    Get user details by ID (Admin only)
    GET /api/v1/users/{user_id}
    """
    try:
        user = User.objects.get(id=user_id)
        serializer = UserManagementSerializer(user)

        return Response({
            'success': True,
            'data': {
                'user': serializer.data
            }
        }, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response({
            'success': False,
            'message': 'User not found',
            'error_code': 'USER_NOT_FOUND'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdmin])
def update_user(request, user_id):
    """
    Update user details (Admin only)
    PUT/PATCH /api/v1/users/{user_id}
    """
    try:
        user = User.objects.get(id=user_id)

        # Prevent admin from removing their own admin role
        if user.id == request.user.id and 'role' in request.data:
            if request.data['role'] != 'Admin':
                return Response({
                    'success': False,
                    'message': 'You cannot remove your own admin role',
                    'error_code': 'CANNOT_DEMOTE_SELF'
                }, status=status.HTTP_400_BAD_REQUEST)

        serializer = UserManagementSerializer(user, data=request.data, partial=(request.method == 'PATCH'))

        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'User updated successfully',
                'data': {
                    'user': serializer.data
                }
            }, status=status.HTTP_200_OK)

        return Response({
            'success': False,
            'message': 'Validation failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    except User.DoesNotExist:
        return Response({
            'success': False,
            'message': 'User not found',
            'error_code': 'USER_NOT_FOUND'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def delete_user(request, user_id):
    """
    Delete user (Admin only)
    DELETE /api/v1/users/{user_id}
    """
    try:
        user = User.objects.get(id=user_id)

        # Prevent admin from deleting themselves
        if user.id == request.user.id:
            return Response({
                'success': False,
                'message': 'You cannot delete your own account',
                'error_code': 'CANNOT_DELETE_SELF'
            }, status=status.HTTP_400_BAD_REQUEST)

        username = user.username
        user.delete()

        return Response({
            'success': True,
            'message': f'User {username} deleted successfully'
        }, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response({
            'success': False,
            'message': 'User not found',
            'error_code': 'USER_NOT_FOUND'
        }, status=status.HTTP_404_NOT_FOUND)
