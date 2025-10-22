"""
Serializers for file upload functionality.
"""
from rest_framework import serializers


class FileUploadSerializer(serializers.Serializer):
    """
    Serializer for survey file upload.
    Validates file, run_id, and survey_type.
    """
    file = serializers.FileField(
        required=True,
        help_text="Survey data file (.xlsx or .csv)"
    )

    run_id = serializers.UUIDField(
        required=True,
        help_text="UUID of the Run this survey belongs to"
    )

    survey_type = serializers.ChoiceField(
        choices=[
            ('Type 1 - GTL', 'Type 1 - GTL'),
            ('Type 2 - Gyro', 'Type 2 - Gyro'),
            ('Type 3 - MWD', 'Type 3 - MWD'),
            ('Type 4 - Unknown', 'Type 4 - Unknown'),
        ],
        required=True,
        help_text="Type of survey data"
    )

    def validate_file(self, value):
        """
        Validate file size and type.
        """
        # Validate file size (max 50MB)
        max_size = 50 * 1024 * 1024  # 50MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size exceeds maximum allowed size of 50MB. "
                f"File size: {value.size / (1024 * 1024):.2f}MB"
            )

        # Validate file type
        allowed_extensions = ['.xlsx', '.csv']
        file_name = value.name.lower()

        if not any(file_name.endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                f"Invalid file type. Only .xlsx and .csv files are allowed. "
                f"Received: {file_name}"
            )

        return value

    def validate_run_id(self, value):
        """
        Validate that the run exists.
        """
        from survey_api.models import Run

        try:
            Run.objects.get(id=value)
        except Run.DoesNotExist:
            raise serializers.ValidationError(
                f"Run with id {value} does not exist"
            )

        return value
