import os
import django
import sys

# Add the project directory to the path
sys.path.insert(0, 'C:\\Users\\SyamlalMSobana\\Desktop\\Survey_V.1.0.0\\survey\\apps\\api')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from survey_api.services.survey_calculation_service import SurveyCalculationService
import traceback

try:
    result = SurveyCalculationService.calculate('f1be28e6-912c-42e4-b250-b38d0511a418')
    print(f'Success: {result.id}')
except Exception as e:
    print(f'Error: {e}')
    traceback.print_exc()
