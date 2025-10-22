from rest_framework import serializers
from survey_api.models import SurveyFile


class SurveyFileSerializer(serializers.ModelSerializer):
    """Serializer for SurveyFile model"""
    reference_surveys_count = serializers.SerializerMethodField()
    survey_data_id = serializers.SerializerMethodField()
    filename = serializers.CharField(source='file_name', read_only=True)
    upload_date = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = SurveyFile
        fields = ('id', 'file_name', 'filename', 'file_path', 'file_size', 'survey_type',
                  'processing_status', 'calculated_data', 'survey_data_id', 'upload_date', 'created_at', 'survey_role',
                  'reference_for_survey', 'reference_surveys_count')
        read_only_fields = ('id', 'created_at', 'processing_status', 'calculated_data', 'reference_surveys_count', 'survey_data_id', 'filename', 'upload_date')

    def get_survey_data_id(self, obj):
        """Get the survey_data ID for navigation"""
        try:
            from survey_api.models import SurveyData
            survey_data = SurveyData.objects.filter(survey_file=obj).first()
            return str(survey_data.id) if survey_data else None
        except Exception:
            return None

    def get_reference_surveys_count(self, obj):
        """Get count of reference surveys linked to this primary survey"""
        return obj.reference_surveys.count() if obj.survey_role == 'primary' else 0

    def validate_file_size(self, value):
        """Validate file size is positive"""
        if value <= 0:
            raise serializers.ValidationError("File size must be greater than 0")
        return value

    def validate_file_name(self, value):
        """Validate file_name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("File name cannot be empty")
        return value.strip()

    def validate(self, data):
        """Validate reference relationships"""
        survey_role = data.get('survey_role', 'primary')
        reference_for_survey = data.get('reference_for_survey')

        # If survey_role is 'reference', validate reference_for_survey
        if survey_role == 'reference' and reference_for_survey:
            if reference_for_survey.survey_role != 'primary':
                raise serializers.ValidationError({
                    'reference_for_survey': 'Reference surveys can only be linked to primary surveys'
                })

            # Prevent circular references
            if reference_for_survey.reference_for_survey == self.instance:
                raise serializers.ValidationError({
                    'reference_for_survey': 'Cannot create circular reference'
                })

        return data


class ReferenceSurveySerializer(serializers.ModelSerializer):
    """
    Serializer for reference surveys with detailed information.
    Includes survey data and calculation status.
    """
    survey_data = serializers.SerializerMethodField()
    calculated_survey = serializers.SerializerMethodField()
    primary_survey = serializers.SerializerMethodField()

    class Meta:
        model = SurveyFile
        fields = (
            'id', 'file_name', 'file_size', 'survey_type', 'survey_role',
            'processing_status', 'created_at', 'reference_for_survey',
            'survey_data', 'calculated_survey', 'primary_survey'
        )
        read_only_fields = ('id', 'created_at', 'processing_status', 'survey_role')

    def get_survey_data(self, obj):
        """Get survey data information"""
        try:
            from survey_api.models import SurveyData
            survey_data = SurveyData.objects.get(survey_file=obj)
            return {
                'id': str(survey_data.id),
                'row_count': survey_data.row_count,
                'validation_status': survey_data.validation_status,
            }
        except SurveyData.DoesNotExist:
            return None

    def get_calculated_survey(self, obj):
        """Get calculated survey information"""
        try:
            from survey_api.models import SurveyData, CalculatedSurvey
            survey_data = SurveyData.objects.get(survey_file=obj)
            calculated = CalculatedSurvey.objects.get(survey_data=survey_data)
            return {
                'id': str(calculated.id),
                'calculation_status': calculated.calculation_status,
                'point_count': survey_data.row_count,
                'calculation_duration': float(calculated.calculation_duration) if calculated.calculation_duration else None,
            }
        except (SurveyData.DoesNotExist, CalculatedSurvey.DoesNotExist):
            return None

    def get_primary_survey(self, obj):
        """Get primary survey information if this is a reference"""
        if obj.reference_for_survey:
            return {
                'id': str(obj.reference_for_survey.id),
                'file_name': obj.reference_for_survey.file_name,
                'survey_type': obj.reference_for_survey.survey_type,
            }
        return None
