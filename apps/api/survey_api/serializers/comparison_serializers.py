"""
Comparison Result Serializers

Serializers for ComparisonResult model including list, detail, and create serializers.
"""
from rest_framework import serializers
from survey_api.models import ComparisonResult, SurveyData, Run


class ComparisonResultSerializer(serializers.ModelSerializer):
    """
    Full serializer for ComparisonResult with all delta data.
    Used for detail views and creation responses.
    """
    primary_survey_info = serializers.SerializerMethodField()
    reference_survey_info = serializers.SerializerMethodField()
    run_info = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()

    class Meta:
        model = ComparisonResult
        fields = (
            'id', 'run', 'primary_survey', 'reference_survey', 'ratio_factor',
            'md_data', 'delta_x', 'delta_y', 'delta_z',
            'delta_horizontal', 'delta_total', 'delta_inc', 'delta_azi',
            # Reference survey full data
            'reference_inc', 'reference_azi', 'reference_northing',
            'reference_easting', 'reference_tvd',
            # Comparison survey full data
            'comparison_inc', 'comparison_azi', 'comparison_northing',
            'comparison_easting', 'comparison_tvd',
            # Metadata
            'statistics', 'created_at', 'created_by',
            'primary_survey_info', 'reference_survey_info', 'run_info',
            'created_by_username'
        )
        read_only_fields = (
            'id', 'created_at', 'created_by', 'primary_survey_info',
            'reference_survey_info', 'run_info', 'created_by_username'
        )

    def get_primary_survey_info(self, obj):
        """Get primary survey metadata."""
        try:
            survey_data = obj.primary_survey
            survey_file = survey_data.survey_file if hasattr(survey_data, 'survey_file') else None
            return {
                'id': str(survey_data.id),
                'file_name': survey_file.file_name if survey_file else 'N/A',
                'survey_type': survey_file.survey_type if survey_file else 'N/A',
                'row_count': survey_data.row_count,
            }
        except Exception:
            return None

    def get_reference_survey_info(self, obj):
        """Get reference survey metadata."""
        try:
            survey_data = obj.reference_survey
            survey_file = survey_data.survey_file if hasattr(survey_data, 'survey_file') else None
            return {
                'id': str(survey_data.id),
                'file_name': survey_file.file_name if survey_file else 'N/A',
                'survey_type': survey_file.survey_type if survey_file else 'N/A',
                'row_count': survey_data.row_count,
            }
        except Exception:
            return None

    def get_run_info(self, obj):
        """Get run metadata."""
        try:
            return {
                'id': str(obj.run.id),
                'run_name': obj.run.run_name,
                'well_name': obj.run.well.well_name if hasattr(obj.run, 'well') else 'N/A',
            }
        except Exception:
            return None

    def get_created_by_username(self, obj):
        """Get creator username."""
        return obj.created_by.username if obj.created_by else 'Unknown'


class ComparisonResultListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for ComparisonResult list views.
    Excludes large delta arrays for performance.
    """
    primary_survey_info = serializers.SerializerMethodField()
    reference_survey_info = serializers.SerializerMethodField()
    max_deviation = serializers.SerializerMethodField()
    point_count = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()

    class Meta:
        model = ComparisonResult
        fields = (
            'id', 'run', 'primary_survey', 'reference_survey', 'ratio_factor',
            'created_at', 'created_by_username',
            'primary_survey_info', 'reference_survey_info',
            'max_deviation', 'point_count'
        )
        read_only_fields = ('id', 'created_at')

    def get_primary_survey_info(self, obj):
        """Get primary survey metadata."""
        try:
            survey_data = obj.primary_survey
            survey_file = survey_data.survey_file if hasattr(survey_data, 'survey_file') else None
            return {
                'id': str(survey_data.id),
                'file_name': survey_file.file_name if survey_file else 'N/A',
                'survey_type': survey_file.survey_type if survey_file else 'N/A',
            }
        except Exception:
            return None

    def get_reference_survey_info(self, obj):
        """Get reference survey metadata."""
        try:
            survey_data = obj.reference_survey
            survey_file = survey_data.survey_file if hasattr(survey_data, 'survey_file') else None
            return {
                'id': str(survey_data.id),
                'file_name': survey_file.file_name if survey_file else 'N/A',
                'survey_type': survey_file.survey_type if survey_file else 'N/A',
            }
        except Exception:
            return None

    def get_max_deviation(self, obj):
        """Get maximum total deviation."""
        return obj.get_max_deviation()

    def get_point_count(self, obj):
        """Get number of comparison points."""
        return obj.statistics.get('point_count', 0)

    def get_created_by_username(self, obj):
        """Get creator username."""
        return obj.created_by.username if obj.created_by else 'Unknown'


class CreateComparisonSerializer(serializers.Serializer):
    """
    Input serializer for creating a new comparison.
    Validates input parameters before calling delta calculation service.
    """
    run_id = serializers.UUIDField(required=True)
    primary_survey_id = serializers.UUIDField(required=True)
    reference_survey_id = serializers.UUIDField(required=True)
    ratio_factor = serializers.IntegerField(
        default=5,
        min_value=1,
        max_value=100,
        help_text="Interpolation step size in meters (default: 5m)"
    )

    def validate_ratio_factor(self, value):
        """Validate ratio factor is within valid range."""
        if not 1 <= value <= 100:
            raise serializers.ValidationError("Ratio factor must be between 1 and 100")
        return value

    def validate(self, data):
        """Validate that surveys exist and are different."""
        if data['primary_survey_id'] == data['reference_survey_id']:
            raise serializers.ValidationError({
                'reference_survey_id': 'Reference survey must be different from primary survey'
            })

        # Check if run exists
        try:
            Run.objects.get(id=data['run_id'])
        except Run.DoesNotExist:
            raise serializers.ValidationError({
                'run_id': 'Run does not exist'
            })

        # Check if surveys exist
        try:
            SurveyData.objects.get(id=data['primary_survey_id'])
        except SurveyData.DoesNotExist:
            raise serializers.ValidationError({
                'primary_survey_id': 'Primary survey does not exist'
            })

        try:
            SurveyData.objects.get(id=data['reference_survey_id'])
        except SurveyData.DoesNotExist:
            raise serializers.ValidationError({
                'reference_survey_id': 'Reference survey does not exist'
            })

        return data
