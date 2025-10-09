from rest_framework import serializers
from survey_api.models import SurveyFile


class SurveyFileSerializer(serializers.ModelSerializer):
    """Serializer for SurveyFile model"""

    class Meta:
        model = SurveyFile
        fields = ('id', 'file_name', 'file_path', 'file_size', 'survey_type',
                  'processing_status', 'calculated_data', 'created_at')
        read_only_fields = ('id', 'created_at', 'processing_status', 'calculated_data')

    def validate_file_size(self, value):
        """Validate file size is positive"""
        if value <= 0:
            raise serializers.ValidationError("File size must be greater than 0")
        return value

    def validate_file_name(self, value):
        """Validate file_name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("File name cannot be empty")
        return value.strip()
