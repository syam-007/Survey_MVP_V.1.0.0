import os
import django
import sys

# Add the apps/api directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'api'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from survey_api.models import SurveyData, CalculatedSurvey

# Use a survey ID from the logs
survey_data_id = '2f003103-bee9-4690-8816-fec51536d68f'

try:
    # First, try to find as SurveyData
    try:
        survey_data = SurveyData.objects.get(id=survey_data_id)
        print(f"Found as SurveyData: {survey_data.id}")
        print(f"Validation Status: {survey_data.validation_status}")
        print(f"Row Count: {survey_data.row_count}")

        print("\n--- Input Array Lengths (from SurveyData) ---")
        print(f"MD length: {len(survey_data.md_data)}")
        print(f"INC length: {len(survey_data.inc_data)}")
        print(f"AZI length: {len(survey_data.azi_data)}")

        # Check if it has a calculated survey
        try:
            calculated = CalculatedSurvey.objects.get(survey_data=survey_data)
            print(f"\n--- Output Array Lengths (from CalculatedSurvey) ---")
            print(f"MD length: {len(calculated.survey_data.md_data)}")
            print(f"Easting length: {len(calculated.easting)}")
            print(f"Northing length: {len(calculated.northing)}")
            print(f"TVD length: {len(calculated.tvd)}")
            print(f"DLS length: {len(calculated.dls)}")

            # Check for None values in easting
            none_count_easting = calculated.easting.count(None)
            none_count_northing = calculated.northing.count(None)
            print(f"\nNone values - Easting: {none_count_easting}, Northing: {none_count_northing}")

            # Show the last few values to see if there's a pattern
            print("\n--- Last 5 values ---")
            print(f"MD: {survey_data.md_data[-5:]}")
            print(f"Easting: {calculated.easting[-5:]}")
            print(f"Northing: {calculated.northing[-5:]}")

        except CalculatedSurvey.DoesNotExist:
            print("\nNo CalculatedSurvey found for this SurveyData")

    except SurveyData.DoesNotExist:
        print(f"Not found as SurveyData, trying as CalculatedSurvey...")

        # Try to find as CalculatedSurvey directly
        calculated = CalculatedSurvey.objects.get(id=survey_data_id)
        print(f"Found as CalculatedSurvey: {calculated.id}")
        print(f"Calculation Status: {calculated.calculation_status}")

        survey_data = calculated.survey_data

        print("\n--- Input Array Lengths (from SurveyData) ---")
        print(f"MD length: {len(survey_data.md_data)}")
        print(f"INC length: {len(survey_data.inc_data)}")
        print(f"AZI length: {len(survey_data.azi_data)}")

        print(f"\n--- Output Array Lengths (from CalculatedSurvey) ---")
        print(f"Easting length: {len(calculated.easting)}")
        print(f"Northing length: {len(calculated.northing)}")
        print(f"TVD length: {len(calculated.tvd)}")
        print(f"DLS length: {len(calculated.dls)}")

        # Check for None values
        none_count_easting = calculated.easting.count(None)
        none_count_northing = calculated.northing.count(None)
        print(f"\nNone values - Easting: {none_count_easting}, Northing: {none_count_northing}")

        # Show the last few values
        print("\n--- Last 5 values ---")
        print(f"MD: {survey_data.md_data[-5:]}")
        print(f"Easting: {calculated.easting[-5:]}")
        print(f"Northing: {calculated.northing[-5:]}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
