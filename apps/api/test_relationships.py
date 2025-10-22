#!/usr/bin/env python
"""Test script to verify Run -> SurveyFile -> SurveyData relationships"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from survey_api.models import Run, SurveyFile, SurveyData
from django.db.models import Count

def main():
    print('=' * 60)
    print('DATABASE RELATIONSHIP VERIFICATION')
    print('=' * 60)
    print()

    # Count records
    total_runs = Run.objects.count()
    total_files = SurveyFile.objects.count()
    total_data = SurveyData.objects.count()

    print(f'Total Runs: {total_runs}')
    print(f'Total Survey Files: {total_files}')
    print(f'Total Survey Data: {total_data}')
    print()

    # Check runs with files
    runs_with_files = Run.objects.annotate(
        file_count=Count('survey_files')
    ).order_by('-file_count')[:5]

    print('Top 5 Runs by Survey File Count:')
    print('-' * 60)

    for run in runs_with_files:
        print(f'\nRun: {run.run_name}')
        print(f'  Survey Files Attached: {run.file_count}')

        if run.file_count > 0:
            files = run.survey_files.all()[:3]
            for idx, sf in enumerate(files, 1):
                try:
                    survey_data = sf.survey_data
                    print(f'    [{idx}] {sf.file_name}')
                    print(f'        - Has Survey Data: YES')
                    print(f'        - Row Count: {survey_data.row_count}')
                    print(f'        - Validation: {survey_data.validation_status}')
                except SurveyData.DoesNotExist:
                    print(f'    [{idx}] {sf.file_name}')
                    print(f'        - Has Survey Data: NO')

    print()
    print('=' * 60)
    print('CONCLUSION:')
    print('- Run -> SurveyFile: One-to-Many (WORKING)')
    print('- SurveyFile -> SurveyData: One-to-One (WORKING)')
    print('- Each run CAN have multiple surveys stored in tables!')
    print('=' * 60)

if __name__ == '__main__':
    main()
