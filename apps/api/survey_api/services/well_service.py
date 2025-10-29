"""
Service layer for Well business logic.

Separates business logic from views/serializers.
"""

from django.db import transaction
from django.core.exceptions import ValidationError
from survey_api.models import Well
from typing import Optional, Dict, Any
import uuid


class WellService:
    """
    Service class for Well-related business logic.

    Handles:
    - Well creation with validation
    - Well updates
    - Well deletion (CASCADE to runs)
    - Well queries with optimizations
    """

    @staticmethod
    def list_wells(filters: Optional[Dict[str, Any]] = None):
        """
        List wells with optional filters.

        Args:
            filters: Optional dictionary of filters (search, etc.)

        Returns:
            QuerySet of Well objects with prefetched runs
        """
        from django.db.models import Count, Q

        queryset = Well.objects.prefetch_related('runs').annotate(
            runs_count=Count('runs')
        )

        # Apply filters if provided
        if filters:
            if 'search' in filters and filters['search']:
                search_term = filters['search']
                queryset = queryset.filter(
                    Q(well_name__icontains=search_term) | Q(well_id__icontains=search_term)
                )

        # Order by created_at descending by default
        queryset = queryset.order_by('-created_at')

        return queryset

    @staticmethod
    def get_well(well_id: uuid.UUID):
        """
        Get a single well by ID with prefetched runs.

        Args:
            well_id: UUID of the well

        Returns:
            Well object

        Raises:
            Well.DoesNotExist: If well not found
        """
        from django.db.models import Count

        return Well.objects.prefetch_related('runs').annotate(
            runs_count=Count('runs')
        ).get(id=well_id)

    @staticmethod
    @transaction.atomic
    def create_well(validated_data: Dict[str, Any]):
        """
        Create a new well with validation.

        Args:
            validated_data: Validated data from serializer

        Returns:
            Created Well object

        Raises:
            ValidationError: If validation fails
        """
        # Check for unique well_name
        if Well.objects.filter(well_name=validated_data['well_name']).exists():
            raise ValidationError({
                'well_name': 'A well with this name already exists.'
            })

        # Check for unique well_id if provided
        if validated_data.get('well_id'):
            if Well.objects.filter(well_id=validated_data['well_id']).exists():
                raise ValidationError({
                    'well_id': 'A well with this ID already exists.'
                })

        # Create well
        well = Well.objects.create(**validated_data)

        return well

    @staticmethod
    @transaction.atomic
    def update_well(well_id: uuid.UUID, validated_data: Dict[str, Any]):
        """
        Update an existing well.

        Args:
            well_id: UUID of the well to update
            validated_data: Validated data from serializer

        Returns:
            Updated Well object

        Raises:
            Well.DoesNotExist: If well not found
            ValidationError: If validation fails
        """
        well = WellService.get_well(well_id)

        # Check unique constraint if updating well_name
        if 'well_name' in validated_data and validated_data['well_name'] != well.well_name:
            if Well.objects.filter(well_name=validated_data['well_name']).exclude(id=well_id).exists():
                raise ValidationError({
                    'well_name': 'A well with this name already exists.'
                })

        # Check unique constraint if updating well_id
        if 'well_id' in validated_data and validated_data['well_id'] != well.well_id:
            if Well.objects.filter(well_id=validated_data['well_id']).exclude(id=well_id).exists():
                raise ValidationError({
                    'well_id': 'A well with this ID already exists.'
                })

        # Update well fields
        for field, value in validated_data.items():
            setattr(well, field, value)

        well.save()

        return well

    @staticmethod
    @transaction.atomic
    def delete_well(well_id: uuid.UUID):
        """
        Delete a well.

        This performs a hard delete. Associated runs will have their well field
        set to NULL due to the SET_NULL on_delete behavior in the Run model.

        Args:
            well_id: UUID of the well to delete

        Returns:
            None

        Raises:
            Well.DoesNotExist: If well not found
        """
        well = WellService.get_well(well_id)

        # Get runs count before deletion for logging
        runs_count = well.runs.count()

        # Delete well (CASCADE to SET_NULL on runs)
        well.delete()

        return {
            'deleted': True,
            'well_id': str(well_id),
            'affected_runs': runs_count
        }

    @staticmethod
    def validate_well_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate well data before creation/update.

        Args:
            data: Dictionary of well data

        Returns:
            Validated data

        Raises:
            ValidationError: If validation fails
        """
        errors = {}

        # Validate well_name
        if 'well_name' in data:
            well_name = data['well_name']
            if not well_name or not well_name.strip():
                errors['well_name'] = 'Well name cannot be empty.'
            elif len(well_name) > 255:
                errors['well_name'] = 'Well name must be 255 characters or less.'

        # Validate well_id
        if 'well_id' in data:
            well_id = data['well_id']
            if well_id and len(well_id) > 100:
                errors['well_id'] = 'Well ID must be 100 characters or less.'

        if errors:
            raise ValidationError(errors)

        return data

    @staticmethod
    def get_well_statistics():
        """
        Get statistics about wells.

        Returns:
            Dictionary with well statistics
        """
        from django.db.models import Count

        total_wells = Well.objects.count()
        wells_with_runs = Well.objects.annotate(
            runs_count=Count('runs')
        ).filter(runs_count__gt=0).count()

        return {
            'total_wells': total_wells,
            'wells_with_runs': wells_with_runs,
            'wells_without_runs': total_wells - wells_with_runs
        }
