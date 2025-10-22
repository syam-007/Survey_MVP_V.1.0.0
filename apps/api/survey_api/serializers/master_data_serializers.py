"""
Serializers for Master Data models
"""
from rest_framework import serializers
from survey_api.models import HoleSectionMaster, SurveyRunInMaster, MinimumIdMaster


class HoleSectionMasterSerializer(serializers.ModelSerializer):
    """
    Serializer for HoleSectionMaster model
    """
    class Meta:
        model = HoleSectionMaster
        fields = [
            'id',
            'hole_section_name',
            'section_type',
            'size_numeric',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SurveyRunInMasterSerializer(serializers.ModelSerializer):
    """
    Serializer for SurveyRunInMaster model
    """
    class Meta:
        model = SurveyRunInMaster
        fields = [
            'id',
            'run_in_name',
            'run_in_type',
            'size_numeric',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MinimumIdMasterSerializer(serializers.ModelSerializer):
    """
    Serializer for MinimumIdMaster model
    """
    survey_run_in_name = serializers.CharField(
        source='survey_run_in.run_in_name',
        read_only=True
    )

    class Meta:
        model = MinimumIdMaster
        fields = [
            'id',
            'minimum_id_name',
            'size_numeric',
            'survey_run_in',
            'survey_run_in_name',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'survey_run_in_name', 'created_at', 'updated_at']
