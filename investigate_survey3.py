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
    survey_data = SurveyData.objects.get(id=survey_data_id)
    calculated = CalculatedSurvey.objects.get(survey_data=survey_data)

    print("=== FIRST 5 VALUES ===")
    print(f"MD:       {survey_data.md_data[:5]}")
    print(f"INC:      {survey_data.inc_data[:5]}")
    print(f"AZI:      {survey_data.azi_data[:5]}")
    print(f"Easting:  {calculated.easting[:5]}")
    print(f"Northing: {calculated.northing[:5]}")
    print(f"TVD:      {calculated.tvd[:5]}")

    print("\n=== LAST 5 VALUES ===")
    print(f"MD:       {survey_data.md_data[-5:]}")
    print(f"INC:      {survey_data.inc_data[-5:]}")
    print(f"AZI:      {survey_data.azi_data[-5:]}")
    print(f"Easting:  {calculated.easting[-5:]}")
    print(f"Northing: {calculated.northing[-5:]}")
    print(f"TVD:      {calculated.tvd[-5:]}")

    print("\n=== ARRAY LENGTHS ===")
    print(f"MD:       {len(survey_data.md_data)}")
    print(f"INC:      {len(survey_data.inc_data)}")
    print(f"AZI:      {len(survey_data.azi_data)}")
    print(f"Easting:  {len(calculated.easting)}")
    print(f"Northing: {len(calculated.northing)}")
    print(f"TVD:      {len(calculated.tvd)}")
    print(f"DLS:      {len(calculated.dls)}")

    # Check if the first MD is the tie-on point
    run = survey_data.survey_file.run
    tieon = run.tieon
    print(f"\n=== TIE-ON DATA ===")
    print(f"Tie-on MD:  {tieon.md}")
    print(f"Tie-on INC: {tieon.inc}")
    print(f"Tie-on AZI: {tieon.azi}")
    print(f"First MD in survey: {survey_data.md_data[0]}")
    print(f"Tie-on == First MD: {float(tieon.md) == survey_data.md_data[0]}")

    # Try to manually run welleng to see what happens
    print("\n=== MANUAL WELLENG TEST ===")
    import numpy as np
    from welleng.survey import Survey, SurveyHeader

    md_array = np.array(survey_data.md_data[:10], dtype=float)
    inc_array = np.array(survey_data.inc_data[:10], dtype=float)
    azi_array = np.array(survey_data.azi_data[:10], dtype=float)

    print(f"Input arrays length: {len(md_array)}")

    header = SurveyHeader(
        name="test",
        latitude=0.0,
        longitude=0.0,
        deg=True
    )

    survey = Survey(
        md=md_array,
        inc=inc_array,
        azi=azi_array,
        header=header,
        start_nev=[float(tieon.latitude), float(tieon.departure), float(tieon.tvd)],
        deg=True
    )

    print(f"Output MD length: {len(survey.md)}")
    print(f"Output n length: {len(survey.n)}")
    print(f"Output e length: {len(survey.e)}")
    print(f"Output tvd length: {len(survey.tvd)}")
    print(f"Output dls length: {len(survey.dls)}")

    print(f"\nInput MD:  {md_array}")
    print(f"Output MD: {survey.md}")
    print(f"Output e:  {survey.e}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
