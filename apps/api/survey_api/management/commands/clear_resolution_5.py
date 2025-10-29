"""
Management command to clear resolution=5 interpolations.
"""
from django.core.management.base import BaseCommand
from survey_api.models import InterpolatedSurvey


class Command(BaseCommand):
    help = 'Clear all resolution=5 interpolations'

    def handle(self, *args, **options):
        count = InterpolatedSurvey.objects.filter(resolution=5).count()
        self.stdout.write(f'Found {count} resolution=5 interpolations')

        if count > 0:
            InterpolatedSurvey.objects.filter(resolution=5).delete()
            self.stdout.write(self.style.SUCCESS(f'Deleted {count} resolution=5 interpolations'))
        else:
            self.stdout.write('No resolution=5 interpolations to delete')

        self.stdout.write(self.style.SUCCESS('Done!'))
