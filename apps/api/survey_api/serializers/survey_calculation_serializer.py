from rest_framework import serializers
from survey_api.models import SurveyCalculation


class SurveyCalculationSerializer(serializers.ModelSerializer):
    """Serializer for SurveyCalculation model"""

    class Meta:
        model = SurveyCalculation
        fields = ('id', 'calculation_type', 'parameters', 'results', 'status', 'created_at')
        read_only_fields = ('id', 'created_at', 'status')

    def validate_calculation_type(self, value):
        """Validate calculation_type is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Calculation type cannot be empty")
        return value.strip()

    def validate_results(self, value):
        """Validate results is not empty"""
        if not value:
            raise serializers.ValidationError("Results cannot be empty")
        return value
