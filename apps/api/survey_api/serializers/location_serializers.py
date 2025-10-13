"""
Location serializers for the Location API.
"""
from rest_framework import serializers
from decimal import Decimal
from survey_api.models import Location
from survey_api.services.location_service import LocationService


class LocationSerializer(serializers.ModelSerializer):
    """
    Full serializer for Location model with all fields.

    Calculated fields (easting, northing, grid_correction, g_t, max_g_t, w_t, max_w_t)
    are read-only as they are computed automatically.
    """

    class Meta:
        model = Location
        fields = [
            'id',
            'run',
            'well',
            'latitude',
            'longitude',
            'easting',
            'northing',
            'geodetic_system',
            'map_zone',
            'north_reference',
            'central_meridian',
            'grid_correction',
            'g_t',
            'max_g_t',
            'w_t',
            'max_w_t',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'easting',
            'northing',
            'grid_correction',
            'g_t',
            'max_g_t',
            'w_t',
            'max_w_t',
            'created_at',
            'updated_at',
        ]


class CreateLocationSerializer(serializers.ModelSerializer):
    """
    Serializer for creating Location instances with validation.

    Validates:
    - Latitude range: -90 to 90
    - Longitude range: -180 to 180
    - Exactly one of run or well must be set (run XOR well)

    Calculated fields are automatically computed via LocationService.
    """

    class Meta:
        model = Location
        fields = [
            'run',
            'well',
            'latitude',
            'longitude',
            'geodetic_system',
            'map_zone',
            'north_reference',
            'central_meridian',
        ]

    def validate_latitude(self, value):
        """
        Validate latitude is within valid range (-90 to 90).
        """
        if value < Decimal('-90.0') or value > Decimal('90.0'):
            raise serializers.ValidationError(
                'Latitude must be between -90 and 90 degrees'
            )
        return value

    def validate_longitude(self, value):
        """
        Validate longitude is within valid range (-180 to 180).
        """
        if value < Decimal('-180.0') or value > Decimal('180.0'):
            raise serializers.ValidationError(
                'Longitude must be between -180 and 180 degrees'
            )
        return value

    def validate(self, attrs):
        """
        Validate that exactly one of run or well is set (run XOR well).
        """
        run = attrs.get('run')
        well = attrs.get('well')

        # Check that exactly one is set
        if run and well:
            raise serializers.ValidationError(
                'Location must be associated with either a run or a well, not both'
            )
        if not run and not well:
            raise serializers.ValidationError(
                'Location must be associated with either a run or a well'
            )

        return attrs

    def create(self, validated_data):
        """
        Create location with automatic calculations.
        """
        # Use LocationService to calculate derived fields
        data_with_calculations = LocationService.create_location_with_calculations(
            validated_data
        )

        # Create the location instance with all fields
        location = Location.objects.create(**data_with_calculations)
        return location


class UpdateLocationSerializer(serializers.ModelSerializer):
    """
    Serializer for updating Location instances with re-calculation support.

    If coordinate fields (latitude, longitude, central_meridian, geodetic_system, map_zone)
    are modified, all calculated fields are automatically recalculated.
    """

    class Meta:
        model = Location
        fields = [
            'latitude',
            'longitude',
            'geodetic_system',
            'map_zone',
            'north_reference',
            'central_meridian',
        ]

    def validate_latitude(self, value):
        """
        Validate latitude is within valid range (-90 to 90).
        """
        if value < Decimal('-90.0') or value > Decimal('90.0'):
            raise serializers.ValidationError(
                'Latitude must be between -90 and 90 degrees'
            )
        return value

    def validate_longitude(self, value):
        """
        Validate longitude is within valid range (-180 to 180).
        """
        if value < Decimal('-180.0') or value > Decimal('180.0'):
            raise serializers.ValidationError(
                'Longitude must be between -180 and 180 degrees'
            )
        return value

    def update(self, instance, validated_data):
        """
        Update location with re-calculation if coordinates changed.
        """
        # Check if recalculation is needed
        needs_recalc = any(
            field in validated_data
            for field in ['latitude', 'longitude', 'central_meridian',
                          'geodetic_system', 'map_zone']
        )

        if needs_recalc:
            # Get current data from instance for fields not being updated
            current_data = {
                'latitude': instance.latitude,
                'longitude': instance.longitude,
                'geodetic_system': instance.geodetic_system,
                'map_zone': instance.map_zone,
                'central_meridian': instance.central_meridian,
            }

            # Merge with validated_data
            current_data.update(validated_data)

            # Use LocationService to recalculate derived fields
            data_with_calculations = LocationService.update_location_with_calculations(
                str(instance.id),
                current_data
            )

            # Update all fields
            for field, value in data_with_calculations.items():
                setattr(instance, field, value)
        else:
            # No recalculation needed, just update provided fields
            for field, value in validated_data.items():
                setattr(instance, field, value)

        instance.save()
        return instance
