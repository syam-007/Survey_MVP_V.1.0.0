#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from survey_api.models import CalculatedSurvey, SurveyData
import numpy as np

# Get the latest calculated survey
calc = CalculatedSurvey.objects.select_related('survey_data').order_by('-created_at').first()
sd = calc.survey_data

print("=== SURVEY DATA (INPUT) ===")
print(f"Row count: {sd.row_count}")
print(f"MD array length: {len(sd.md_data)}")
print(f"MD values: {sd.md_data}")
print(f"\n=== CALCULATED SURVEY (OUTPUT) ===")
print(f"Northing length: {len(calc.northing)}")
print(f"Easting length: {len(calc.easting)}")
print(f"TVD length: {len(calc.tvd)}")

print(f"\n=== CHECKING FOR DUPLICATES ===")
md_arr = np.array(sd.md_data)
unique_mds = np.unique(md_arr)
print(f"Unique MDs: {len(unique_mds)} out of {len(md_arr)} total")
if len(md_arr) != len(unique_mds):
    print(f"DUPLICATES FOUND!")
    print(f"Duplicate values: {md_arr[np.where(np.bincount(md_arr.astype(int)) > 1)[0]]}")
else:
    print("No duplicates found")

print(f"\n=== PROBLEM DIAGNOSIS ===")
print(f"Input stations: {len(sd.md_data)}")
print(f"Output stations: {len(calc.northing)}")
print(f"Missing stations: {len(sd.md_data) - len(calc.northing)}")
