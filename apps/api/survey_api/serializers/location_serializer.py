from rest_framework import serializers
from survey_api.models import Location


class LocationSerializer(serializers.ModelSerializer):
    """Serializer for Location model"""

    class Meta:
        model = Location
        fields = ('id', 'latitude', 'longitude', 'easting', 'northing',
                  'geodetic_system', 'map_zone', 'north_reference',
                  'central_meridian', 'created_at')
        read_only_fields = ('id', 'created_at')

    def validate_latitude(self, value):
        """Validate latitude is within valid range"""
        if value < -90 or value > 90:
            raise serializers.ValidationError("Latitude must be between -90 and 90 degrees")
        return value

    def validate_longitude(self, value):
        """Validate longitude is within valid range"""
        if value < -180 or value > 180:
            raise serializers.ValidationError("Longitude must be between -180 and 180 degrees")
        return value
