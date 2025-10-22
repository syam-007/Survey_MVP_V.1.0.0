"""
Serializers for InterpolatedSurvey model and interpolation API endpoints.
"""
from rest_framework import serializers
from survey_api.models import InterpolatedSurvey


class InterpolatedSurveySerializer(serializers.ModelSerializer):
    """Serializer for InterpolatedSurvey model."""

    calculated_survey_id = serializers.UUIDField(source='calculated_survey.id', read_only=True)

    class Meta:
        model = InterpolatedSurvey
        fields = [
            'id',
            'calculated_survey_id',
            'resolution',
            'md_interpolated',
            'inc_interpolated',
            'azi_interpolated',
            'easting_interpolated',
            'northing_interpolated',
            'tvd_interpolated',
            'dls_interpolated',
            'vertical_section_interpolated',
            'closure_distance_interpolated',
            'closure_direction_interpolated',
            'interpolation_status',
            'point_count',
            'interpolation_duration',
            'error_message',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'calculated_survey_id',
            'md_interpolated',
            'inc_interpolated',
            'azi_interpolated',
            'easting_interpolated',
            'northing_interpolated',
            'tvd_interpolated',
            'dls_interpolated',
            'vertical_section_interpolated',
            'closure_distance_interpolated',
            'closure_direction_interpolated',
            'interpolation_status',
            'point_count',
            'interpolation_duration',
            'error_message',
            'created_at',
            'updated_at',
        ]


class InterpolationRequestSerializer(serializers.Serializer):
    """Serializer for interpolation trigger requests."""

    resolution = serializers.IntegerField(
        min_value=1,
        max_value=100,
        default=10,
        help_text="Interpolation resolution in meters (1-100)"
    )

    def validate_resolution(self, value):
        """Validate resolution is within acceptable range."""
        if value < 1:
            raise serializers.ValidationError("Resolution must be at least 1 meter")
        if value > 100:
            raise serializers.ValidationError("Resolution cannot exceed 100 meters")
        return value


class InterpolationResponseSerializer(serializers.Serializer):
    """Serializer for interpolation API responses."""

    interpolation_id = serializers.UUIDField(read_only=True)
    resolution = serializers.IntegerField(read_only=True)
    point_count = serializers.IntegerField(read_only=True)
    status = serializers.CharField(read_only=True)
    interpolation_duration = serializers.DecimalField(
        max_digits=10,
        decimal_places=3,
        read_only=True,
        allow_null=True
    )
    message = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
