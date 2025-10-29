from rest_framework import serializers
from survey_api.models import Run
from .well_serializer import WellSerializer
from .location_serializer import LocationSerializer
from .depth_serializer import DepthSerializer
from .tieon_serializers import TieOnSerializer
from .survey_file_serializer import SurveyFileSerializer


class UserNestedSerializer(serializers.Serializer):
    """Nested serializer for User in Run responses"""
    id = serializers.UUIDField(read_only=True)
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class RunSerializer(serializers.ModelSerializer):
    """Serializer for Run model with nested relationships"""

    location = LocationSerializer(read_only=True)
    depth = DepthSerializer(read_only=True)
    tieon = TieOnSerializer(read_only=True)
    well = WellSerializer(read_only=True)
    user = UserNestedSerializer(read_only=True)
    survey_files = SurveyFileSerializer(many=True, read_only=True)
    survey_files_count = serializers.SerializerMethodField()
    has_tieon = serializers.SerializerMethodField()

    class Meta:
        model = Run
        fields = ('id', 'run_number', 'run_name', 'survey_type', 'run_type', 'vertical_section',
                  'bhc_enabled', 'proposal_direction', 'grid_correction',
                  'well', 'location', 'depth', 'tieon', 'user', 'survey_files', 'survey_files_count',
                  'has_tieon', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at', 'user', 'survey_files', 'survey_files_count', 'has_tieon')

    def get_survey_files_count(self, obj):
        """Get count of survey files associated with this run"""
        return obj.survey_files.count() if hasattr(obj, 'survey_files') else 0

    def get_has_tieon(self, obj):
        """Check if run has tie-on information"""
        return hasattr(obj, 'tieon') and obj.tieon is not None

    def validate_run_number(self, value):
        """Validate run_number is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Run number cannot be empty")
        return value.strip()

    def validate_run_name(self, value):
        """Validate run_name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Run name cannot be empty")
        return value.strip()


class RunCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Run (without nested objects)"""

    class Meta:
        model = Run
        fields = ('id', 'run_number', 'run_name', 'survey_type', 'run_type', 'vertical_section',
                  'bhc_enabled', 'proposal_direction', 'grid_correction',
                  'well', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_run_number(self, value):
        """Validate run_number is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Run number cannot be empty")
        return value.strip()

    def validate_run_name(self, value):
        """Validate run_name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Run name cannot be empty")
        return value.strip()
