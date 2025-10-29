"""
TieOn serializers for handling tie-on data validation and serialization.
"""
from rest_framework import serializers
from survey_api.models import TieOn
from decimal import Decimal


class TieOnSerializer(serializers.ModelSerializer):
    """
    Full serializer for TieOn model with all fields.
    """
    hole_section_master_name = serializers.CharField(
        source='hole_section_master.hole_section_name',
        read_only=True
    )
    survey_run_in_name = serializers.CharField(
        source='survey_run_in.run_in_name',
        read_only=True
    )
    minimum_id_name = serializers.CharField(
        source='minimum_id.minimum_id_name',
        read_only=True
    )

    class Meta:
        model = TieOn
        fields = [
            'id', 'run', 'md', 'inc', 'azi', 'tvd', 'latitude', 'departure',
            'well_type', 'expected_inclination', 'is_bhc', 'proposal_direction',
            'survey_interval_from', 'survey_interval_to',
            'survey_interval_length', 'created_at', 'updated_at',
            'hole_section_master', 'hole_section_master_name',
            'survey_run_in_type', 'survey_run_in', 'survey_run_in_name',
            'minimum_id', 'minimum_id_name'
        ]
        read_only_fields = ['id', 'survey_interval_length', 'created_at', 'updated_at',
                           'hole_section_master_name', 'survey_run_in_name', 'minimum_id_name']


class CreateTieOnSerializer(serializers.ModelSerializer):
    """
    Serializer for creating TieOn instances with validation.
    """
    class Meta:
        model = TieOn
        fields = [
            'run', 'md', 'inc', 'azi', 'tvd', 'latitude', 'departure',
            'well_type', 'expected_inclination', 'is_bhc', 'proposal_direction',
            'survey_interval_from', 'survey_interval_to',
            'hole_section_master', 'survey_run_in_type', 'survey_run_in', 'minimum_id'
        ]

    def validate_inc(self, value):
        """
        Validate inclination is between 0 and 180 degrees.
        """
        if value < Decimal('0.00') or value > Decimal('180.00'):
            raise serializers.ValidationError(
                "Inclination must be between 0 and 180 degrees"
            )
        return value

    def validate_azi(self, value):
        """
        Validate azimuth is between 0 and 360 degrees.
        """
        if value < Decimal('0.00') or value >= Decimal('360.00'):
            raise serializers.ValidationError(
                "Azimuth must be between 0 and 360 degrees"
            )
        return value

    def validate(self, attrs):
        """
        Validate survey interval: from < to
        """
        survey_interval_from = attrs.get('survey_interval_from')
        survey_interval_to = attrs.get('survey_interval_to')

        if survey_interval_from and survey_interval_to:
            if survey_interval_from >= survey_interval_to:
                raise serializers.ValidationError({
                    'survey_interval_from': "Survey interval 'from' must be less than 'to'"
                })

        return attrs


class UpdateTieOnSerializer(serializers.ModelSerializer):
    """
    Serializer for updating TieOn instances.
    Run field is not updateable after creation.
    """
    class Meta:
        model = TieOn
        fields = [
            'md', 'inc', 'azi', 'tvd', 'latitude', 'departure',
            'well_type', 'expected_inclination', 'is_bhc', 'proposal_direction',
            'survey_interval_from', 'survey_interval_to',
            'hole_section_master', 'survey_run_in_type', 'survey_run_in', 'minimum_id'
        ]

    def validate_inc(self, value):
        """
        Validate inclination is between 0 and 180 degrees.
        """
        if value < Decimal('0.00') or value > Decimal('180.00'):
            raise serializers.ValidationError(
                "Inclination must be between 0 and 180 degrees"
            )
        return value

    def validate_azi(self, value):
        """
        Validate azimuth is between 0 and 360 degrees.
        """
        if value < Decimal('0.00') or value >= Decimal('360.00'):
            raise serializers.ValidationError(
                "Azimuth must be between 0 and 360 degrees"
            )
        return value

    def validate(self, attrs):
        """
        Validate survey interval: from < to
        """
        survey_interval_from = attrs.get('survey_interval_from')
        survey_interval_to = attrs.get('survey_interval_to')

        # Get existing values if not provided (for partial updates)
        if not survey_interval_from and self.instance:
            survey_interval_from = self.instance.survey_interval_from
        if not survey_interval_to and self.instance:
            survey_interval_to = self.instance.survey_interval_to

        if survey_interval_from and survey_interval_to:
            if survey_interval_from >= survey_interval_to:
                raise serializers.ValidationError({
                    'survey_interval_from': "Survey interval 'from' must be less than 'to'"
                })

        return attrs
