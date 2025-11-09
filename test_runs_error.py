import os
import sys
import django
import traceback

# Add apps/api to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps', 'api'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from survey_api.models import Job
from survey_api.serializers.run_serializer import RunSerializer

try:
    job = Job.objects.first()
    print(f"Job: {job}")

    runs = job.runs.all().select_related('user').prefetch_related('survey_files')
    print(f"Runs count: {runs.count()}")

    if runs.exists():
        run = runs.first()
        print(f"\nFirst run: {run}")

        # Try to serialize one run
        serializer = RunSerializer(run)
        print("\nSerialization successful!")
        print(serializer.data)
    else:
        print("No runs found for this job")

except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
