#!/usr/bin/env python
"""Test calculation directly to see where 19th station disappears"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from survey_api.models import SurveyData
from survey_api.services.survey_calculation_service import SurveyCalculationService

# Get the most recent GTL survey
survey_data = SurveyData.objects.filter(
    survey_file__survey_type='GTL'
).order_by('-created_at').first()

if not survey_data:
    print("No GTL surveys found!")
    sys.exit(1)

print(f"Found SurveyData: {survey_data.id}")
print(f"Input MD count: {len(survey_data.md_data)}")
print(f"Input MDs: {survey_data.md_data}")

# Delete existing calculated survey if it exists
if hasattr(survey_data, 'calculated_survey'):
    print(f"\nDeleting existing CalculatedSurvey {survey_data.calculated_survey.id}")
    survey_data.calculated_survey.delete()

# Recalculate
print("\n" + "="*80)
print("TRIGGERING CALCULATION...")
print("="*80)

try:
    calc = SurveyCalculationService.calculate(str(survey_data.id))

    print("\n" + "="*80)
    print("CALCULATION COMPLETED!")
    print("="*80)
    print(f"CalculatedSurvey ID: {calc.id}")
    print(f"Output Northing count: {len(calc.northing)}")
    print(f"Output Easting count: {len(calc.easting)}")
    print(f"Output TVD count: {len(calc.tvd)}")
    print(f"\nLast 3 Northings: {calc.northing[-3:]}")
    print(f"Last 3 Eastings: {calc.easting[-3:]}")
    print(f"Last 3 TVDs: {calc.tvd[-3:]}")
    print(f"\nMATCH: {len(survey_data.md_data) == len(calc.northing)}")
except Exception as e:
    print(f"\nERROR: {e}")
    import traceback
    traceback.print_exc()
