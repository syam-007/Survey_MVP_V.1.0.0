"""
Management command to recalculate all surveys with corrected logic that includes tie-on point.
This re-runs the full calculation from the survey data using the updated welleng service.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from survey_api.models import CalculatedSurvey, SurveyData
from survey_api.services.welleng_service import WellengService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Recalculate all surveys using corrected logic with tie-on point as MD=0'

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

        # Get all successfully calculated surveys
        calculated_surveys = CalculatedSurvey.objects.filter(
            calculation_status='calculated'
        ).select_related('survey_data__survey_file__run__tieon', 'survey_data__survey_file__run__well__location')

        total_count = calculated_surveys.count()
        self.stdout.write(f'Found {total_count} calculated surveys to recalculate')

        updated_count = 0
        error_count = 0
        skipped_count = 0

        for calc_survey in calculated_surveys:
            try:
                survey_data = calc_survey.survey_data
                survey_file = survey_data.survey_file
                run = survey_file.run

                self.stdout.write(f'Processing calculated survey {calc_survey.id} for {survey_file.file_name}...')

                # Get tie-on data
                tie_on = run.tieon
                if not tie_on:
                    self.stdout.write(self.style.WARNING(f'  Skipping - no tie-on data'))
                    skipped_count += 1
                    continue

                tie_on_data = {
                    'md': float(tie_on.md),
                    'inc': float(tie_on.inc),
                    'azi': float(tie_on.azi),
                    'tvd': float(tie_on.tvd),
                    'northing': float(tie_on.latitude),  # TieOn uses latitude for northing
                    'easting': float(tie_on.departure)   # TieOn uses departure for easting
                }

                # Get location data (use defaults if not available)
                location_data = {'latitude': 0.0, 'longitude': 0.0, 'geodetic_system': 'WGS84'}
                if run.well:
                    try:
                        location = run.well.location
                        location_data = {
                            'latitude': location.latitude,
                            'longitude': location.longitude,
                            'geodetic_system': location.geodetic_system
                        }
                    except Exception:
                        pass  # Use defaults

                # Get survey data
                md_data = survey_data.md_data
                inc_data = survey_data.inc_data
                azi_data = survey_data.azi_data

                if not md_data or not inc_data or not azi_data:
                    self.stdout.write(self.style.WARNING(f'  Skipping - empty survey data'))
                    skipped_count += 1
                    continue

                # Check if tie-on point already exists (MD=0)
                if md_data[0] == 0:
                    self.stdout.write(f'  Tie-on point already exists at MD=0, skipping...')
                    skipped_count += 1
                    continue

                self.stdout.write(f'  Recalculating with tie-on point (MD range: 0 to {max(md_data):.2f})...')

                # Re-run calculation using the corrected welleng service
                result = WellengService.calculate_survey(
                    md=md_data,
                    inc=inc_data,
                    azi=azi_data,
                    tie_on_data=tie_on_data,
                    location_data=location_data,
                    survey_type=survey_file.survey_type,
                    vertical_section_azimuth=calc_survey.vertical_section_azimuth
                )

                # Check for changes
                old_point_count = len(calc_survey.northing) if calc_survey.northing else 0
                new_point_count = len(result['northing'])

                if old_point_count != new_point_count:
                    self.stdout.write(f'  NOTE: Point count changed from {old_point_count} to {new_point_count}')

                if not dry_run:
                    with transaction.atomic():
                        # Update calculated survey with new results
                        calc_survey.easting = result['easting']
                        calc_survey.northing = result['northing']
                        calc_survey.tvd = result['tvd']
                        calc_survey.dls = result['dls']
                        calc_survey.build_rate = result['build_rate']
                        calc_survey.turn_rate = result['turn_rate']
                        calc_survey.vertical_section = result['vertical_section']
                        calc_survey.closure_distance = result['closure_distance']
                        calc_survey.closure_direction = result['closure_direction']
                        calc_survey.vertical_section_azimuth = result['vertical_section_azimuth']
                        calc_survey.save()

                        # Also update the survey_data to include the tie-on point
                        # Prepend tie-on values to the stored arrays
                        survey_data.md_data = [0] + md_data
                        survey_data.inc_data = [tie_on.inc] + inc_data
                        survey_data.azi_data = [tie_on.azi] + azi_data
                        survey_data.row_count = len(survey_data.md_data)
                        survey_data.save()

                self.stdout.write(self.style.SUCCESS(
                    f'  [OK] Updated: {new_point_count} points (added tie-on at MD=0), '
                    f'Final closure={result["closure_distance"][-1]:.2f}m @ {result["closure_direction"][-1]:.2f}'
                ))
                updated_count += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  [ERROR] {str(e)}'))
                logger.exception(f"Error recalculating survey {calc_survey.id}")
                error_count += 1
                continue

        # Summary
        self.stdout.write('\n' + '='*60)
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN COMPLETE - No changes were made'))
        else:
            self.stdout.write(self.style.SUCCESS('RECALCULATION COMPLETE'))

        self.stdout.write(f'Total calculated surveys: {total_count}')
        self.stdout.write(self.style.SUCCESS(f'Successfully updated: {updated_count}'))
        if skipped_count > 0:
            self.stdout.write(self.style.WARNING(f'Skipped: {skipped_count}'))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'Errors: {error_count}'))
        self.stdout.write('='*60)

        # Note about interpolations
        if updated_count > 0 and not dry_run:
            self.stdout.write('\n' + self.style.WARNING(
                'NOTE: You should now run "python manage.py recalculate_interpolations" '
                'to update all interpolations with the new calculated data.'
            ))
