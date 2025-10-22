"""
Curve Adjustment Serializers

Handles serialization of adjustment operations and data.
"""
from rest_framework import serializers
from survey_api.models import CurveAdjustment


class ApplyOffsetSerializer(serializers.Serializer):
    """Serializer for applying offsets to comparative survey."""

    md_start = serializers.FloatField(
        required=True,
        help_text="Starting MD for offset application"
    )
    md_end = serializers.FloatField(
        required=True,
        help_text="Ending MD for offset application"
    )
    x_offset = serializers.FloatField(
        default=0.0,
        help_text="Easting (X) offset in meters"
    )
    y_offset = serializers.FloatField(
        default=0.0,
        help_text="Northing (Y) offset in meters"
    )
    z_offset = serializers.FloatField(
        default=0.0,
        help_text="TVD (Z) offset in meters"
    )

    def validate(self, data):
        """Validate that MD range is valid."""
        if data['md_start'] >= data['md_end']:
            raise serializers.ValidationError(
                "md_start must be less than md_end"
            )
        return data


class AdjustmentStateSerializer(serializers.Serializer):
    """Serializer for adjustment state data."""

    adjustment_id = serializers.UUIDField(required=False)
    sequence = serializers.IntegerField()
    md_data = serializers.ListField(
        child=serializers.FloatField()
    )
    north_adjusted = serializers.ListField(
        child=serializers.FloatField()
    )
    east_adjusted = serializers.ListField(
        child=serializers.FloatField()
    )
    tvd_adjusted = serializers.ListField(
        child=serializers.FloatField()
    )
    inc_recalculated = serializers.ListField(
        child=serializers.FloatField(),
        required=False
    )
    azi_recalculated = serializers.ListField(
        child=serializers.FloatField(),
        required=False
    )
    has_adjustment = serializers.BooleanField(default=False)
    message = serializers.CharField(required=False)


class CurveAdjustmentSerializer(serializers.ModelSerializer):
    """Serializer for CurveAdjustment model."""

    class Meta:
        model = CurveAdjustment
        fields = [
            'id',
            'comparison',
            'md_start',
            'md_end',
            'x_offset',
            'y_offset',
            'z_offset',
            'md_data',
            'north_adjusted',
            'east_adjusted',
            'tvd_adjusted',
            'inc_recalculated',
            'azi_recalculated',
            'adjustment_sequence',
            'is_current',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'adjustment_sequence']
