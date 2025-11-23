#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from survey_api.models import CalculatedSurvey, SurveyData, SurveyFile
from django.db.models import Q

# Get the latest GTL survey
survey_file = SurveyFile.objects.filter(survey_type='GTL').select_related('survey_data').order_by('-created_at').first()

if not survey_file:
    print("No GTL surveys found")
    exit()

survey_data = survey_file.survey_data
calc = survey_data.calculated_survey

print(f"=== SURVEY FILE {survey_file.id} ===")
print(f"Survey Type: {survey_file.survey_type}")
print(f"Created: {survey_file.created_at}")

print(f"\n=== SURVEY DATA {survey_data.id} ===")
print(f"Row count: {survey_data.row_count}")
print(f"MD length: {len(survey_data.md_data)}")
print(f"Inc length: {len(survey_data.inc_data)}")
print(f"Azi length: {len(survey_data.azi_data)}")
print(f"Last 3 MD: {survey_data.md_data[-3:]}")

print(f"\n=== CALCULATED SURVEY {calc.id} ===")
print(f"Northing length: {len(calc.northing)}")
print(f"Easting length: {len(calc.easting)}")
print(f"TVD length: {len(calc.tvd)}")
print(f"Last 3 Northing: {calc.northing[-3:]}")
print(f"Last 3 Easting: {calc.easting[-3:]}")
print(f"Last 3 TVD: {calc.tvd[-3:]}")

print(f"\n=== DIAGNOSIS ===")
if len(survey_data.md_data) != len(calc.northing):
    print(f"❌ LENGTH MISMATCH!")
    print(f"   MD has {len(survey_data.md_data)} elements")
    print(f"   Northing has {len(calc.northing)} elements")
    print(f"   Missing: {len(survey_data.md_data) - len(calc.northing)} elements")
else:
    print(f"✅ All arrays have {len(calc.northing)} elements - MATCH!")
