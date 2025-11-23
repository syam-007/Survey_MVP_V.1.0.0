#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from survey_api.models import SurveyData

# Check the specific survey
survey_id = '4f5bb30d-61f6-43fd-9cc9-204858c485cc'

try:
    survey_data = SurveyData.objects.get(id=survey_id)
    calc = survey_data.calculated_survey

    print(f"=== SURVEY DATA {survey_id} ===")
    print(f"Created: {survey_data.created_at}")
    print(f"Row count: {survey_data.row_count}")
    print(f"MD length: {len(survey_data.md_data)}")
    print(f"Last 3 MD: {survey_data.md_data[-3:]}")

    print(f"\n=== CALCULATED SURVEY ===")
    print(f"Northing length: {len(calc.northing)}")
    print(f"Easting length: {len(calc.easting)}")
    print(f"TVD length: {len(calc.tvd)}")
    print(f"Last 3 Northing: {calc.northing[-3:]}")
    print(f"Last 3 Easting: {calc.easting[-3:]}")
    print(f"Last 3 TVD: {calc.tvd[-3:]}")

    print(f"\n=== RESULT ===")
    if len(survey_data.md_data) == len(calc.northing):
        print(f"SUCCESS: All {len(calc.northing)} stations have coordinates")
    else:
        print(f"PROBLEM: MD has {len(survey_data.md_data)} but Northing has {len(calc.northing)}")
        print(f"Missing: {len(survey_data.md_data) - len(calc.northing)} stations")

except SurveyData.DoesNotExist:
    print(f"Survey {survey_id} not found")
