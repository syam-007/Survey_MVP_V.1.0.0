#!/usr/bin/env python
import os
import django
from datetime import datetime, timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from survey_api.models import SurveyData

# My fix was deployed around 13:15 UTC (after the server reloaded)
# Check all surveys created after 13:10
cutoff_time = datetime(2025, 11, 20, 13, 10, tzinfo=timezone.utc)

print(f"Checking surveys created after {cutoff_time}")
print("=" * 80)

recent_surveys = SurveyData.objects.filter(created_at__gt=cutoff_time).order_by('-created_at')

if not recent_surveys.exists():
    print("NO SURVEYS CREATED AFTER THE FIX!")
    print("\nAll surveys:")
    all_surveys = SurveyData.objects.all().order_by('-created_at')[:5]
    for sd in all_surveys:
        calc = sd.calculated_survey
        print(f"\nSurvey {sd.id}")
        print(f"  Created: {sd.created_at}")
        print(f"  MD: {len(sd.md_data)}, Northing: {len(calc.northing)}")
else:
    for sd in recent_surveys:
        calc = sd.calculated_survey
        print(f"\nSurvey {sd.id}")
        print(f"  Created: {sd.created_at}")
        print(f"  MD: {len(sd.md_data)}, Northing: {len(calc.northing)}")
        if len(sd.md_data) == len(calc.northing):
            print(f"  Status: FIXED!")
        else:
            print(f"  Status: BROKEN (missing {len(sd.md_data) - len(calc.northing)} stations)")
