"""
Management command to recalculate all location G(t) and W(t) values with new rounding (1 decimal place).
This updates existing locations to have consistently rounded values stored in the database.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from survey_api.models import Location
from survey_api.services.location_service import LocationService
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Recalculate all location G(t) and W(t) values with 1 decimal place rounding'

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

        # Get all locations
        locations = Location.objects.all()

        total_count = locations.count()
        self.stdout.write(f'Found {total_count} locations to recalculate')

        updated_count = 0
        error_count = 0
        skipped_count = 0

        for location in locations:
            try:
                # Check if location has required data
                if not location.latitude or not location.longitude:
                    self.stdout.write(self.style.WARNING(
                        f'  Skipping location {location.id} - missing coordinates'
                    ))
                    skipped_count += 1
                    continue

                location_name = str(location)
                self.stdout.write(f'Processing {location_name}...')

                # Get current values
                old_w_t = float(location.w_t) if location.w_t else None
                old_min_w_t = float(location.min_w_t) if location.min_w_t else None
                old_max_w_t = float(location.max_w_t) if location.max_w_t else None
                old_g_t = float(location.g_t) if location.g_t else None
                old_min_g_t = float(location.min_g_t) if location.min_g_t else None
                old_max_g_t = float(location.max_g_t) if location.max_g_t else None

                # Recalculate g_t and w_t with new rounding
                calculated_values = LocationService.calculate_g_t_w_t(
                    latitude=location.latitude,
                    longitude=location.longitude,
                    easting=location.easting,
                    northing=location.northing,
                    ground_level_elevation=None  # Use simplified calculation
                )

                # Get new values
                new_w_t = float(calculated_values['w_t'])
                new_min_w_t = float(calculated_values['min_w_t'])
                new_max_w_t = float(calculated_values['max_w_t'])
                new_g_t = float(calculated_values['g_t'])
                new_min_g_t = float(calculated_values['min_g_t'])
                new_max_g_t = float(calculated_values['max_g_t'])

                # Check if ANY value changed (compare actual values directly)
                # Use small epsilon for float comparison to avoid precision issues
                epsilon = 0.005  # Values differing by more than 0.005 need updating
                w_t_changed = old_w_t is None or abs(old_w_t - new_w_t) > epsilon
                min_w_t_changed = old_min_w_t is None or abs(old_min_w_t - new_min_w_t) > epsilon
                max_w_t_changed = old_max_w_t is None or abs(old_max_w_t - new_max_w_t) > epsilon
                g_t_changed = old_g_t is None or abs(old_g_t - new_g_t) > epsilon
                min_g_t_changed = old_min_g_t is None or abs(old_min_g_t - new_min_g_t) > epsilon
                max_g_t_changed = old_max_g_t is None or abs(old_max_g_t - new_max_g_t) > epsilon

                if any([w_t_changed, min_w_t_changed, max_w_t_changed, g_t_changed, min_g_t_changed, max_g_t_changed]):
                    # Display changes
                    if w_t_changed or min_w_t_changed or max_w_t_changed:
                        if w_t_changed:
                            self.stdout.write(
                                f'  W(t): {old_w_t:.8f} -> {new_w_t:.1f}' if old_w_t else
                                f'  W(t): None -> {new_w_t:.1f}'
                            )
                        if min_w_t_changed:
                            self.stdout.write(
                                f'  min_W(t): {old_min_w_t:.8f} -> {new_min_w_t:.1f}' if old_min_w_t else
                                f'  min_W(t): None -> {new_min_w_t:.1f}'
                            )
                        if max_w_t_changed:
                            self.stdout.write(
                                f'  max_W(t): {old_max_w_t:.8f} -> {new_max_w_t:.1f}' if old_max_w_t else
                                f'  max_W(t): None -> {new_max_w_t:.1f}'
                            )

                    if g_t_changed or min_g_t_changed or max_g_t_changed:
                        if g_t_changed:
                            self.stdout.write(
                                f'  G(t): {old_g_t:.8f} -> {new_g_t:.1f}' if old_g_t else
                                f'  G(t): None -> {new_g_t:.1f}'
                            )
                        if min_g_t_changed:
                            self.stdout.write(
                                f'  min_G(t): {old_min_g_t:.8f} -> {new_min_g_t:.1f}' if old_min_g_t else
                                f'  min_G(t): None -> {new_min_g_t:.1f}'
                            )
                        if max_g_t_changed:
                            self.stdout.write(
                                f'  max_G(t): {old_max_g_t:.8f} -> {new_max_g_t:.1f}' if old_max_g_t else
                                f'  max_G(t): None -> {new_max_g_t:.1f}'
                            )

                    if not dry_run:
                        with transaction.atomic():
                            # Update location with new rounded values
                            location.w_t = calculated_values['w_t']
                            location.min_w_t = calculated_values['min_w_t']
                            location.max_w_t = calculated_values['max_w_t']
                            location.g_t = calculated_values['g_t']
                            location.min_g_t = calculated_values['min_g_t']
                            location.max_g_t = calculated_values['max_g_t']
                            location.save()

                    self.stdout.write(self.style.SUCCESS(f'  [OK] Updated {location_name}'))
                    updated_count += 1
                else:
                    self.stdout.write(f'  No changes needed (already rounded)')
                    skipped_count += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  [ERROR] {str(e)}'))
                logger.exception(f"Error recalculating location {location.id}")
                error_count += 1
                continue

        # Summary
        self.stdout.write('\n' + '='*60)
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN COMPLETE - No changes were made'))
        else:
            self.stdout.write(self.style.SUCCESS('RECALCULATION COMPLETE'))

        self.stdout.write(f'Total locations: {total_count}')
        self.stdout.write(self.style.SUCCESS(f'Successfully updated: {updated_count}'))
        if skipped_count > 0:
            self.stdout.write(self.style.WARNING(f'Skipped (no changes needed): {skipped_count}'))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'Errors: {error_count}'))
        self.stdout.write('='*60)

        # Note about impact
        if updated_count > 0 and not dry_run:
            self.stdout.write('\n' + self.style.SUCCESS(
                'All location G(t) and W(t) values have been updated with 1 decimal place rounding.\n'
                'These values will now be consistent across the application and used in QA calculations.'
            ))
