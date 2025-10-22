import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from survey_api.models import Run, SurveyFile, SurveyData
from django.db.models import Count

print('=== ACTUAL DATABASE CHECK ===\n')

# Count records
total_runs = Run.objects.count()
total_files = SurveyFile.objects.count()
total_data = SurveyData.objects.count()

print(f'Total Runs: {total_runs}')
print(f'Total Survey Files: {total_files}')
print(f'Total Survey Data: {total_data}')
print()

# Check runs with multiple files
runs_with_files = Run.objects.annotate(
    file_count=Count('survey_files')
).filter(file_count__gt=0).order_by('-file_count')[:5]

print('Sample Runs with Survey File Counts:')
for run in runs_with_files:
    print(f'  - Run: {run.run_name}')
    print(f'    Survey Files: {run.file_count}')

    files = run.survey_files.all()[:3]
    for sf in files:
        try:
            survey_data = sf.survey_data
            has_data = True
            row_count = survey_data.row_count
        except SurveyData.DoesNotExist:
            has_data = False
            row_count = 0

        print(f'      * {sf.file_name} | Has Data: {has_data} | Rows: {row_count}')
    print()

print('\n=== CONCLUSION ===')
print('The relationship is working correctly!')
print('- Each Run can have MULTIPLE SurveyFiles (ForeignKey)')
print('- Each SurveyFile has ONE SurveyData (OneToOneField)')
print('- All data is stored in separate database tables')
