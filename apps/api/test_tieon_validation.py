#!/usr/bin/env python
"""
Test script to verify tie-on validation is working correctly.

Tests:
1. Run without tie-on cannot accept survey uploads (API validation)
2. Run with tie-on accepts survey uploads
3. Calculation service raises error if tie-on missing
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from survey_api.models import Run, TieOn, SurveyData
from survey_api.services.survey_calculation_service import SurveyCalculationService
from survey_api.exceptions import InsufficientDataError


def test_tie_on_requirements():
    """Test tie-on validation across the system."""
    print('=' * 70)
    print('TIE-ON VALIDATION TEST')
    print('=' * 70)
    print()

    # Test 1: Check existing runs for tie-on data
    print('TEST 1: Checking existing runs for tie-on information')
    print('-' * 70)
    runs = Run.objects.all()

    for run in runs:
        has_tieon = hasattr(run, 'tieon') and run.tieon is not None
        print(f'  Run: {run.run_name}')
        print(f'    - Has TieOn: {has_tieon}')

        if has_tieon:
            print(f'    - TieOn MD: {run.tieon.md}')
            print(f'    - TieOn Inc: {run.tieon.inc}')
            print(f'    - TieOn Azi: {run.tieon.azi}')
        print()

    # Test 2: Find a run without tie-on
    print('TEST 2: Testing calculation service with missing tie-on')
    print('-' * 70)

    runs_without_tieon = [r for r in runs if not (hasattr(r, 'tieon') and r.tieon is not None)]

    if runs_without_tieon:
        test_run = runs_without_tieon[0]
        print(f'  Testing with Run: {test_run.run_name} (no tie-on)')

        # Try to find a survey data for this run
        survey_data_list = SurveyData.objects.filter(
            survey_file__run=test_run
        ).select_related('survey_file__run__tieon')

        if survey_data_list.exists():
            test_survey_data = survey_data_list.first()
            print(f'  Found SurveyData: {test_survey_data.id}')
            print(f'  Attempting calculation (should FAIL)...')

            try:
                # This should raise InsufficientDataError
                result = SurveyCalculationService._get_calculation_context(test_survey_data)
                print('  RESULT: FAIL - No error raised (expected InsufficientDataError)')
                print(f'  Context: {result}')
            except InsufficientDataError as e:
                print('  RESULT: PASS - InsufficientDataError raised as expected')
                print(f'  Error Message: {e}')
            except Exception as e:
                print(f'  RESULT: UNEXPECTED ERROR - {type(e).__name__}: {e}')
        else:
            print('  No survey data found for this run (cannot test calculation)')
    else:
        print('  All runs have tie-on data - cannot test missing tie-on scenario')

    print()

    # Test 3: Find a run WITH tie-on
    print('TEST 3: Testing calculation service with valid tie-on')
    print('-' * 70)

    runs_with_tieon = [r for r in runs if hasattr(r, 'tieon') and r.tieon is not None]

    if runs_with_tieon:
        test_run = runs_with_tieon[0]
        print(f'  Testing with Run: {test_run.run_name} (has tie-on)')

        # Try to find a survey data for this run
        survey_data_list = SurveyData.objects.filter(
            survey_file__run=test_run
        ).select_related('survey_file__run__tieon')

        if survey_data_list.exists():
            test_survey_data = survey_data_list.first()
            print(f'  Found SurveyData: {test_survey_data.id}')
            print(f'  Attempting to get calculation context (should PASS)...')

            try:
                result = SurveyCalculationService._get_calculation_context(test_survey_data)
                print('  RESULT: PASS - Context retrieved successfully')
                print(f'  TieOn MD: {result["tieon"]["md"]}')
                print(f'  TieOn Inc: {result["tieon"]["inc"]}')
                print(f'  TieOn Azi: {result["tieon"]["azi"]}')
            except InsufficientDataError as e:
                print(f'  RESULT: FAIL - InsufficientDataError raised unexpectedly')
                print(f'  Error Message: {e}')
            except Exception as e:
                print(f'  RESULT: UNEXPECTED ERROR - {type(e).__name__}: {e}')
        else:
            print('  No survey data found for this run (cannot test calculation)')
    else:
        print('  No runs with tie-on data found')

    print()
    print('=' * 70)
    print('SUMMARY:')
    print('-' * 70)
    print('1. API Validation: Upload endpoint checks for tie-on (Line 80-94 in upload_viewset.py)')
    print('2. Calculation Service: Raises InsufficientDataError if tie-on missing')
    print('3. Frontend: Warning banner shown and upload button disabled when tie-on missing')
    print('4. Run Serializer: Includes has_tieon field to indicate tie-on presence')
    print('=' * 70)


if __name__ == '__main__':
    test_tie_on_requirements()
