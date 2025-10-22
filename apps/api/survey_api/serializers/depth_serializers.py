"""
Depth serializers for the Depth API.
"""
from rest_framework import serializers
from decimal import Decimal
from survey_api.models import Depth


class DepthSerializer(serializers.ModelSerializer):
    """
    Full serializer for Depth model with all fields.

    Used for reading depth data. ID and timestamps are read-only.
    """

    class Meta:
        model = Depth
        fields = [
            'id',
            'run',
            'well',
            'elevation_reference',
            'reference_datum',
            'reference_height',
            'reference_elevation',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
        ]


class CreateDepthSerializer(serializers.ModelSerializer):
    """
    Serializer for creating Depth instances with validation.

    Validates:
    - elevation_reference is one of the valid choices (KB, RT, GL, MSL, etc.)
    - Exactly one of run or well must be set (run XOR well)
    - All required fields are provided

    elevation_reference defaults to "MSL" (Mean Sea Level).
    reference_datum defaults to "RKB/DFE(Drill Floor Elevation)" and is read-only.
    """

    class Meta:
        model = Depth
        fields = [
            'run',
            'well',
            'elevation_reference',
            'reference_datum',
            'reference_height',
            'reference_elevation',
        ]
        read_only_fields = ['reference_datum']

    def validate(self, attrs):
        """
        Validate that exactly one of run or well is set (run XOR well).
        """
        run = attrs.get('run')
        well = attrs.get('well')

        # Check that exactly one is set
        if run and well:
            raise serializers.ValidationError(
                'Depth must be associated with either a run or a well, not both'
            )
        if not run and not well:
            raise serializers.ValidationError(
                'Depth must be associated with either a run or a well'
            )

        return attrs


class UpdateDepthSerializer(serializers.ModelSerializer):
    """
    Serializer for updating Depth instances.

    Allows partial updates. Run and well associations cannot be changed after creation.
    reference_datum is read-only and cannot be updated.
    """

    class Meta:
        model = Depth
        fields = [
            'elevation_reference',
            'reference_datum',
            'reference_height',
            'reference_elevation',
        ]
        read_only_fields = ['reference_datum']

    def validate_elevation_reference(self, value):
        """
        Validate elevation_reference is one of the valid choices.
        """
        valid_choices = [choice[0] for choice in Depth.ELEVATION_REFERENCE_CHOICES]
        if value not in valid_choices:
            raise serializers.ValidationError(
                f'Elevation reference must be one of: {", ".join(valid_choices)}'
            )
        return value
