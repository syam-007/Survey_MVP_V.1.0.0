"""
Management command to update existing comparisons with full survey coordinates.

This populates the new reference_inc, reference_azi, etc. fields for comparisons
that were created before the migration added these fields.
"""
from django.core.management.base import BaseCommand
from survey_api.models import ComparisonResult
from survey_api.services.delta_calculation_service import DeltaCalculationService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Update existing comparisons with full survey coordinate data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--comparison-id',
            type=str,
            help='Update specific comparison by ID (optional)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        comparison_id = options.get('comparison_id')
        dry_run = options.get('dry_run', False)

        # Get comparisons to update
        if comparison_id:
            comparisons = ComparisonResult.objects.filter(id=comparison_id)
            if not comparisons.exists():
                self.stdout.write(self.style.ERROR(f'Comparison {comparison_id} not found'))
                return
        else:
            # Find comparisons that don't have the new fields populated
            comparisons = ComparisonResult.objects.filter(reference_inc__isnull=True)

        total = comparisons.count()

        if total == 0:
            self.stdout.write(self.style.SUCCESS('No comparisons need updating'))
            return

        self.stdout.write(f'Found {total} comparison(s) to update')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made'))
            for comp in comparisons:
                self.stdout.write(f'  - {comp.id}: {comp.primary_survey.survey_file.file_name} vs {comp.reference_survey.survey_file.file_name}')
            return

        updated = 0
        failed = 0

        for comparison in comparisons:
            try:
                self.stdout.write(f'Updating comparison {comparison.id}...')

                # Recalculate with full survey data
                delta_results = DeltaCalculationService.calculate_deltas(
                    comparison_survey_id=str(comparison.primary_survey.id),
                    reference_survey_id=str(comparison.reference_survey.id),
                    ratio_factor=comparison.ratio_factor
                )

                # Update the comparison with new fields
                comparison.reference_inc = delta_results.get('reference_inc')
                comparison.reference_azi = delta_results.get('reference_azi')
                comparison.reference_northing = delta_results.get('reference_northing')
                comparison.reference_easting = delta_results.get('reference_easting')
                comparison.reference_tvd = delta_results.get('reference_tvd')

                comparison.comparison_inc = delta_results.get('comparison_inc')
                comparison.comparison_azi = delta_results.get('comparison_azi')
                comparison.comparison_northing = delta_results.get('comparison_northing')
                comparison.comparison_easting = delta_results.get('comparison_easting')
                comparison.comparison_tvd = delta_results.get('comparison_tvd')

                comparison.save()

                updated += 1
                self.stdout.write(self.style.SUCCESS(f'  [OK] Updated comparison {comparison.id}'))

            except Exception as e:
                failed += 1
                self.stdout.write(self.style.ERROR(f'  [FAILED] Failed to update comparison {comparison.id}: {str(e)}'))
                logger.error(f'Failed to update comparison {comparison.id}: {str(e)}', exc_info=True)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated} comparison(s)'))
        if failed > 0:
            self.stdout.write(self.style.ERROR(f'Failed to update {failed} comparison(s)'))
