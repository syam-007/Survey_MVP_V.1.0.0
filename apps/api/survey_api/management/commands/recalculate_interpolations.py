"""
Management command to recalculate all interpolations using the corrected welleng interpolation logic.
This re-runs the full interpolation from the calculated survey data using welleng's interpolate_survey function.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from survey_api.models import InterpolatedSurvey
from survey_api.services.welleng_service import WellengService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Recalculate all interpolations using corrected welleng interpolation logic'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        # Get all completed interpolations
        interpolations = InterpolatedSurvey.objects.filter(
            interpolation_status='completed'
        ).select_related('calculated_survey__survey_data')

        total_count = interpolations.count()
        self.stdout.write(f'Found {total_count} interpolations to recalculate')

        updated_count = 0
        error_count = 0
        skipped_count = 0

        for interp in interpolations:
            try:
                self.stdout.write(f'Processing interpolation {interp.id} (resolution={interp.resolution}m)...')

                # Get the calculated survey
                calc_survey = interp.calculated_survey
                survey_data = calc_survey.survey_data

                if not survey_data:
                    self.stdout.write(self.style.WARNING(f'  Skipping - no survey data'))
                    skipped_count += 1
                    continue

                # Prepare data for interpolation
                calculated_data = {
                    'md': survey_data.md_data,
                    'inc': survey_data.inc_data,
                    'azi': survey_data.azi_data,
                    'easting': calc_survey.easting,
                    'northing': calc_survey.northing,
                    'tvd': calc_survey.tvd
                }

                # Re-run interpolation using the corrected welleng service
                self.stdout.write(f'  Re-interpolating with welleng (resolution={interp.resolution}m)...')
                result = WellengService.interpolate_survey(
                    calculated_data=calculated_data,
                    resolution=interp.resolution
                )

                # Check for significant changes
                old_inc_first = interp.inc_interpolated[0] if interp.inc_interpolated else None
                new_inc_first = result['inc'][0] if result['inc'] else None

                if old_inc_first and new_inc_first:
                    inc_diff = abs(old_inc_first - new_inc_first)
                    if inc_diff > 0.01:
                        self.stdout.write(f'  NOTE: First INC changed from {old_inc_first:.2f} to {new_inc_first:.2f} (diff: {inc_diff:.2f})')

                if not dry_run:
                    with transaction.atomic():
                        # Update all interpolated fields
                        interp.md_interpolated = result['md']
                        interp.inc_interpolated = result['inc']
                        interp.azi_interpolated = result['azi']
                        interp.easting_interpolated = result['easting']
                        interp.northing_interpolated = result['northing']
                        interp.tvd_interpolated = result['tvd']
                        interp.dls_interpolated = result['dls']
                        interp.vertical_section_interpolated = result['vertical_section']
                        interp.closure_distance_interpolated = result['closure_distance']
                        interp.closure_direction_interpolated = result['closure_direction']
                        interp.point_count = result['point_count']
                        interp.save()

                self.stdout.write(self.style.SUCCESS(
                    f'  [OK] Updated: {result["point_count"]} points, '
                    f'Final closure={result["closure_distance"][-1]:.2f}m @ {result["closure_direction"][-1]:.2f}'
                ))
                updated_count += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  [ERROR] {str(e)}'))
                logger.exception(f"Error recalculating interpolation {interp.id}")
                error_count += 1
                continue

        # Summary
        self.stdout.write('\n' + '='*60)
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN COMPLETE - No changes were made'))
        else:
            self.stdout.write(self.style.SUCCESS('RECALCULATION COMPLETE'))

        self.stdout.write(f'Total interpolations: {total_count}')
        self.stdout.write(self.style.SUCCESS(f'Successfully updated: {updated_count}'))
        if skipped_count > 0:
            self.stdout.write(self.style.WARNING(f'Skipped: {skipped_count}'))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'Errors: {error_count}'))
        self.stdout.write('='*60)
