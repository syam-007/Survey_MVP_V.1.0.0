"""
Serializers for SurveyData model.
"""
from rest_framework import serializers
from survey_api.models import SurveyData


class SurveyDataSerializer(serializers.ModelSerializer):
    """
    Serializer for SurveyData model.
    Used for reading/displaying survey data.
    """

    class Meta:
        model = SurveyData
        fields = [
            'id',
            'survey_file',
            'md_data',
            'inc_data',
            'azi_data',
            'wt_data',
            'gt_data',
            'row_count',
            'validation_status',
            'validation_errors',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
