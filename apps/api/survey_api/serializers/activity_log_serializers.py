"""
Activity Log Serializers
"""
from rest_framework import serializers
from survey_api.models import RunActivityLog


class RunActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for run activity logs"""

    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)

    class Meta:
        model = RunActivityLog
        fields = [
            'id',
            'run',
            'user',
            'user_name',
            'user_email',
            'activity_type',
            'activity_type_display',
            'description',
            'metadata',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_user_name(self, obj):
        """Get user's full name"""
        return obj.user_name

    def get_user_email(self, obj):
        """Get user's email"""
        return obj.user_email


class CreateRunActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for creating activity logs"""

    class Meta:
        model = RunActivityLog
        fields = [
            'run',
            'user',
            'activity_type',
            'description',
            'metadata',
        ]
