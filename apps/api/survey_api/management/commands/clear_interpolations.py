"""
Management command to clear all interpolated survey data.

This forces interpolations to be recalculated with the latest logic.
"""
from django.core.management.base import BaseCommand
from survey_api.models import InterpolatedSurvey


class Command(BaseCommand):
    help = 'Clear all interpolated survey data to force recalculation'

    def handle(self, *args, **options):
        count = InterpolatedSurvey.objects.count()
        self.stdout.write(f'Found {count} interpolated surveys')

        if count > 0:
            InterpolatedSurvey.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted {count} interpolated surveys'))
        else:
            self.stdout.write('No interpolated surveys to delete')

        self.stdout.write(self.style.SUCCESS('Done! Interpolations will be recalculated on next request'))
