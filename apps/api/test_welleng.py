#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from survey_api.models import CalculatedSurvey, SurveyData
import numpy as np
from welleng.survey import Survey, SurveyHeader

# Get the latest calculated survey
calc = CalculatedSurvey.objects.select_related('survey_data').order_by('-created_at').first()
sd = calc.survey_data

print("=== TESTING WELLENG WITH SAME INPUT ===")
md_data = sd.md_data
inc_data = sd.inc_data
azi_data = sd.azi_data

print(f"Input MD: {len(md_data)} stations")
print(f"MDs: {md_data}")

# Create arrays
md_array = np.array(md_data, dtype=np.float64)
inc_array = np.array(inc_data, dtype=np.float64)
azi_array = np.array(azi_data, dtype=np.float64)

print(f"\nNumpy arrays:")
print(f"  MD shape: {md_array.shape}")
print(f"  Inc shape: {inc_array.shape}")
print(f"  Azi shape: {azi_array.shape}")

# Create welleng survey
header = SurveyHeader(name="test", latitude=25.0, longitude=55.0, deg=True)
survey = Survey(
    md=md_array,
    inc=inc_array,
    azi=azi_array,
    header=header,
    start_nev=[0, 0, 0],
    deg=True
)

print(f"\nWelleng Survey results:")
print(f"  survey.n (Northing) length: {len(survey.n)}")
print(f"  survey.e (Easting) length: {len(survey.e)}")
print(f"  survey.tvd length: {len(survey.tvd)}")
print(f"  survey.md length: {len(survey.md)}")

print(f"\nLast 3 survey.md values: {survey.md[-3:]}")
print(f"Last 3 survey.n values: {survey.n[-3:]}")

if len(survey.n) < len(md_array):
    print(f"\nPROBLEM: Welleng dropped {len(md_array) - len(survey.n)} station(s)!")
    print("This is a welleng library issue, not our code.")
