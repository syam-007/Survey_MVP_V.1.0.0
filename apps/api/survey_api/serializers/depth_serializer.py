from rest_framework import serializers
from survey_api.models import Depth


class DepthSerializer(serializers.ModelSerializer):
    """Serializer for Depth model"""

    class Meta:
        model = Depth
        fields = ('id', 'elevation_reference', 'reference_datum',
                  'reference_height', 'reference_elevation', 'created_at')
        read_only_fields = ('id', 'created_at')
