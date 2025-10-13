"""
Survey serializers for handling survey data validation and serialization.
"""
from rest_framework import serializers
from survey_api.models import Survey


class SurveySerializer(serializers.ModelSerializer):
    """
    Full serializer for Survey model with all fields including computed required_columns.
    """
    required_columns = serializers.SerializerMethodField()

    class Meta:
        model = Survey
        fields = ['id', 'run', 'survey_type', 'file_path', 'status',
                  'required_columns', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_required_columns(self, obj):
        """
        Return required Excel columns based on survey type.
        """
        if obj.survey_type == 'Type 1 - GTL':
            return ['MD', 'Inc', 'Azi', 'w(t)', 'g(t)']
        else:
            # Type 2 - Gyro, Type 3 - MWD, Type 4 - Unknown all require same columns
            return ['MD', 'Inc', 'Azi']


class CreateSurveySerializer(serializers.ModelSerializer):
    """
    Serializer for creating Survey instances with validation.
    """
    class Meta:
        model = Survey
        fields = ['run', 'survey_type', 'file_path', 'status']

    def validate(self, attrs):
        """
        Validate survey data.
        """
        # Run is required - Django handles this via OneToOneField
        # Survey type validation handled by choices
        # Status validation handled by choices with default='pending'
        return attrs


class UpdateSurveySerializer(serializers.ModelSerializer):
    """
    Serializer for updating Survey instances.
    Run field is not updateable after creation.
    """
    class Meta:
        model = Survey
        fields = ['survey_type', 'file_path', 'status']
