from rest_framework import serializers
from survey_api.models import Well, Run


class RunSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for runs in well details.

    Used to show associated runs without full nested data.
    """

    class Meta:
        model = Run
        fields = ('id', 'run_number', 'run_name', 'run_type', 'created_at')
        read_only_fields = ('id', 'created_at')


class WellSerializer(serializers.ModelSerializer):
    """
    Serializer for Well model with associated runs.

    Includes:
    - Basic well information
    - List of associated runs (reverse relationship through jobs)
    - Count of associated runs
    """

    runs = serializers.SerializerMethodField()
    runs_count = serializers.SerializerMethodField()

    class Meta:
        model = Well
        fields = ('id', 'well_id', 'well_name', 'created_at', 'updated_at',
                  'runs', 'runs_count')
        read_only_fields = ('id', 'created_at', 'updated_at', 'runs', 'runs_count')

    def get_runs(self, obj):
        """Get runs through jobs relationship"""
        from django.db.models import Q
        # Get all runs from all jobs associated with this well
        runs = Run.objects.filter(job__well=obj).order_by('-created_at')
        return RunSummarySerializer(runs, many=True).data

    def get_runs_count(self, obj):
        """Get count of associated runs"""
        # Use annotated value if available (from queryset), otherwise count
        if hasattr(obj, 'runs_count'):
            return obj.runs_count
        # Count runs through jobs
        from django.db.models import Count
        return obj.jobs.aggregate(total_runs=Count('runs'))['total_runs'] or 0

    def validate_well_id(self, value):
        """Validate well_id is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Well ID cannot be empty")

        # Check length
        if len(value.strip()) > 100:
            raise serializers.ValidationError("Well ID must be 100 characters or less")

        return value.strip()

    def validate_well_name(self, value):
        """Validate well_name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Well name cannot be empty")

        # Check length
        if len(value.strip()) > 255:
            raise serializers.ValidationError("Well name must be 255 characters or less")

        return value.strip()


class WellListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for well list endpoint.

    Does not include nested runs, only runs_count for performance.
    """

    runs_count = serializers.SerializerMethodField()

    class Meta:
        model = Well
        fields = ('id', 'well_id', 'well_name', 'created_at', 'updated_at', 'runs_count')
        read_only_fields = ('id', 'created_at', 'updated_at', 'runs_count')

    def get_runs_count(self, obj):
        """Get count of associated runs"""
        if hasattr(obj, 'runs_count'):
            return obj.runs_count
        # Count runs through jobs
        from django.db.models import Count
        return obj.jobs.aggregate(total_runs=Count('runs'))['total_runs'] or 0
