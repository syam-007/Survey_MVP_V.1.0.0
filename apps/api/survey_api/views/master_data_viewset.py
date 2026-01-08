"""
ViewSets for Master Data models
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from survey_api.models import HoleSectionMaster, SurveyRunInMaster, MinimumIdMaster
from survey_api.serializers import (
    HoleSectionMasterSerializer,
    SurveyRunInMasterSerializer,
    MinimumIdMasterSerializer,
)


class HoleSectionMasterViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for HoleSectionMaster - Read-only
    """
    queryset = HoleSectionMaster.objects.filter(is_active=True)
    serializer_class = HoleSectionMasterSerializer

    def get_queryset(self):
        """
        Optionally filter by section_type
        """
        queryset = super().get_queryset()
        section_type = self.request.query_params.get('section_type', None)
        if section_type:
            queryset = queryset.filter(section_type=section_type)
        return queryset


class SurveyRunInMasterViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for SurveyRunInMaster - Read-only
    """
    queryset = SurveyRunInMaster.objects.filter(is_active=True)
    serializer_class = SurveyRunInMasterSerializer

    def get_queryset(self):
        """
        Filter by run_in_type and/or size_less_than
        """
        queryset = super().get_queryset()

        # Filter by type (casing, drill_pipe, tubing)
        run_in_type = self.request.query_params.get('run_in_type', None)
        if run_in_type:
            queryset = queryset.filter(run_in_type=run_in_type)

        # Filter by size less than a given hole section size
        max_size = self.request.query_params.get('max_size', None)
        if max_size:
            try:
                max_size_decimal = float(max_size)
                queryset = queryset.filter(size_numeric__lt=max_size_decimal)
            except (ValueError, TypeError):
                pass

        return queryset


class MinimumIdMasterViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MinimumIdMasterSerializer

    def get_queryset(self):
        queryset = MinimumIdMaster.objects.filter(is_active=True)
        
        # Get the ID of the selected Survey Run-In from the request
        selected_run_in_id = self.request.query_params.get('survey_run_in_id')

        if selected_run_in_id:
            try:
                # 1. Find the numeric size of the selected pipe (e.g., 13.375)
                selected_pipe = SurveyRunInMaster.objects.get(id=selected_run_in_id)
                max_size = selected_pipe.size_numeric

                # 2. Return ALL Minimum IDs smaller than that size
                # This includes IDs for casing, drillpipe, or tubing
                queryset = queryset.filter(size_numeric__lt=max_size)
            except SurveyRunInMaster.DoesNotExist:
                return queryset.none()

        return queryset.order_by('-size_numeric') # Largest available IDs first