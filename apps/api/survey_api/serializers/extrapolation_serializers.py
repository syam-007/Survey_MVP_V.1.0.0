"""
Extrapolation Serializers

Handles serialization of extrapolation data.
"""
from rest_framework import serializers
from survey_api.models import Extrapolation


class CreateExtrapolationSerializer(serializers.Serializer):
    """Serializer for creating an extrapolation."""

    survey_data_id = serializers.UUIDField(required=True)
    run_id = serializers.UUIDField(required=True)
    extrapolation_length = serializers.FloatField(
        required=True,
        min_value=0.1,
        max_value=10000,
        help_text="How far to extrapolate beyond last point (meters)"
    )
    extrapolation_step = serializers.FloatField(
        required=True,
        min_value=1,
        max_value=50,
        help_text="Distance between extrapolated points (meters)"
    )
    interpolation_step = serializers.FloatField(
        required=True,
        min_value=1,
        max_value=50,
        help_text="Distance between interpolated points (meters)"
    )
    extrapolation_method = serializers.ChoiceField(
        choices=['Constant', 'Linear Trend', 'Curve Fit'],
        default='Constant',
        help_text="Method to use for extrapolation"
    )


class ExtrapolationSerializer(serializers.ModelSerializer):
    """Serializer for Extrapolation model."""

    created_by_username = serializers.CharField(
        source='created_by.username',
        read_only=True
    )
    survey_file_name = serializers.CharField(
        source='survey_data.filename',
        read_only=True
    )

    class Meta:
        model = Extrapolation
        fields = [
            'id',
            'survey_data',
            'run',
            'created_by',
            'created_by_username',
            'survey_file_name',
            # Parameters
            'extrapolation_length',
            'extrapolation_step',
            'interpolation_step',
            'extrapolation_method',
            # Original data
            'original_md',
            'original_inc',
            'original_azi',
            'original_north',
            'original_east',
            'original_tvd',
            # Interpolated data
            'interpolated_md',
            'interpolated_inc',
            'interpolated_azi',
            'interpolated_north',
            'interpolated_east',
            'interpolated_tvd',
            # Extrapolated data
            'extrapolated_md',
            'extrapolated_inc',
            'extrapolated_azi',
            'extrapolated_north',
            'extrapolated_east',
            'extrapolated_tvd',
            # Combined data
            'combined_md',
            'combined_inc',
            'combined_azi',
            'combined_north',
            'combined_east',
            'combined_tvd',
            # Statistics
            'original_point_count',
            'interpolated_point_count',
            'extrapolated_point_count',
            'final_md',
            'final_tvd',
            'final_horizontal_displacement',
            # Metadata
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ExtrapolationListSerializer(serializers.ModelSerializer):
    """Serializer for listing extrapolations."""

    created_by_username = serializers.CharField(
        source='created_by.username',
        read_only=True
    )
    survey_file_name = serializers.CharField(
        source='survey_data.filename',
        read_only=True
    )

    class Meta:
        model = Extrapolation
        fields = [
            'id',
            'survey_file_name',
            'created_by_username',
            'extrapolation_method',
            'extrapolation_length',
            'original_point_count',
            'extrapolated_point_count',
            'final_md',
            'final_tvd',
            'created_at',
        ]
        read_only_fields = fields
