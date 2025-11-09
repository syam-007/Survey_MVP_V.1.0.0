import os
import django
import sys

# Add the apps/api directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'api'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from survey_api.models import Survey

survey_id = '2f003103-bee9-4690-8816-fec51536d68f'

try:
    survey = Survey.objects.get(id=survey_id)

    print(f"Survey ID: {survey.id}")
    print(f"Survey Type: {survey.survey_type}")
    print(f"Is Interpolated: {survey.is_interpolated}")
    print(f"Run ID: {survey.run.id if survey.run else 'N/A'}")
    print(f"Created At: {survey.created_at}")
    print("\n--- Array Lengths ---")

    md = survey.md or []
    inc = survey.inc or []
    azi = survey.azi or []
    tvd = survey.tvd or []
    easting = survey.easting or []
    northing = survey.northing or []
    vs = survey.vs or []
    dls = survey.dls or []

    print(f"MD length: {len(md)}")
    print(f"INC length: {len(inc)}")
    print(f"AZI length: {len(azi)}")
    print(f"TVD length: {len(tvd)}")
    print(f"Easting length: {len(easting)}")
    print(f"Northing length: {len(northing)}")
    print(f"VS length: {len(vs)}")
    print(f"DLS length: {len(dls)}")

    # Check for any None values
    print("\n--- Checking for None values ---")
    print(f"MD has None: {None in md}")
    print(f"INC has None: {None in inc}")
    print(f"AZI has None: {None in azi}")
    print(f"TVD has None: {None in tvd}")
    print(f"Easting has None: {None in easting}")
    print(f"Northing has None: {None in northing}")
    print(f"VS has None: {None in vs}")
    print(f"DLS has None: {None in dls}")

    # Show first and last few values
    print("\n--- First 3 and Last 3 MD values ---")
    print(f"First 3: {md[:3]}")
    print(f"Last 3: {md[-3:]}")

    print("\n--- First 3 and Last 3 Easting values ---")
    print(f"First 3: {easting[:3]}")
    print(f"Last 3: {easting[-3:]}")

    # Check if there's a pattern in the missing data
    print("\n--- Comparing MD indices with Easting ---")
    if len(md) > len(easting):
        print(f"Missing {len(md) - len(easting)} Easting value(s)")
        print("MD values that don't have corresponding Easting:")
        for i in range(len(easting), len(md)):
            print(f"  Index {i}: MD = {md[i]}")

except Survey.DoesNotExist:
    print(f"Survey with ID {survey_id} not found")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
