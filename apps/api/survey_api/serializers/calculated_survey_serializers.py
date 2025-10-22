"""
Serializers for CalculatedSurvey model and calculation status API.
"""
from rest_framework import serializers
from survey_api.models import CalculatedSurvey


class CalculatedSurveySerializer(serializers.ModelSerializer):
    """
    Serializer for CalculatedSurvey model.

    Used for reading calculated survey results.
    """

    class Meta:
        model = CalculatedSurvey
        fields = [
            'id',
            'survey_data',
            'easting',
            'northing',
            'tvd',
            'dls',
            'build_rate',
            'turn_rate',
            'vertical_section',
            'closure_distance',
            'closure_direction',
            'vertical_section_azimuth',
            'calculation_status',
            'calculation_duration',
            'error_message',
            'calculation_context',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields  # All fields are read-only


class CalculationStatusSerializer(serializers.Serializer):
    """
    Serializer for calculation status API response.

    Returns simplified status information for client polling.
    """

    survey_id = serializers.UUIDField(source='survey_data.id', read_only=True)
    calculation_status = serializers.CharField(read_only=True)
    calculation_duration = serializers.DecimalField(
        max_digits=10,
        decimal_places=3,
        read_only=True,
        allow_null=True
    )
    error_message = serializers.CharField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        fields = [
            'survey_id',
            'calculation_status',
            'calculation_duration',
            'error_message',
            'created_at',
        ]
