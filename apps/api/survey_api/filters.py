"""
Filter classes for the Survey API.

Provides filtering, searching, and ordering capabilities for API endpoints.
"""

import django_filters
from survey_api.models import Run


class RunFilter(django_filters.FilterSet):
    """
    Filter class for Run model.

    Provides filtering by:
    - run_type (exact match)
    - well (ForeignKey)
    - created_at (date range)
    - updated_at (date range)
    - run_number (case-insensitive contains)
    - run_name (case-insensitive contains)

    Ordering available by: created_at, updated_at, run_number
    """

    # Exact filters
    run_type = django_filters.ChoiceFilter(
        field_name='run_type',
        choices=Run.RUN_TYPE_CHOICES
    )
    well = django_filters.UUIDFilter(field_name='well__id')

    # Date range filters
    created_at_after = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='gte'
    )
    created_at_before = django_filters.DateTimeFilter(
        field_name='created_at',
        lookup_expr='lte'
    )
    updated_at_after = django_filters.DateTimeFilter(
        field_name='updated_at',
        lookup_expr='gte'
    )
    updated_at_before = django_filters.DateTimeFilter(
        field_name='updated_at',
        lookup_expr='lte'
    )

    # Search filters (case-insensitive contains)
    run_number = django_filters.CharFilter(
        field_name='run_number',
        lookup_expr='icontains'
    )
    run_name = django_filters.CharFilter(
        field_name='run_name',
        lookup_expr='icontains'
    )

    # Ordering
    ordering = django_filters.OrderingFilter(
        fields=(
            ('created_at', 'created_at'),
            ('updated_at', 'updated_at'),
            ('run_number', 'run_number'),
        )
    )

    class Meta:
        model = Run
        fields = ['run_type', 'well', 'run_number', 'run_name']
