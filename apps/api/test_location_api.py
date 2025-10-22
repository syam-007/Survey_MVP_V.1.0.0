"""
Test script to call the Location API endpoint directly
"""
import os
import django
import sys
import json

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from django.test import RequestFactory
from survey_api.views.location_viewset import LocationViewSet
from survey_api.models import Run, Well
from rest_framework.test import force_authenticate
from django.contrib.auth import get_user_model

User = get_user_model()

# Get or create a test user
user, _ = User.objects.get_or_create(username='testuser', defaults={'email': 'test@test.com'})

# Get the first run
run = Run.objects.first()
if not run:
    print("ERROR: No runs found in database. Please create a run first.")
    sys.exit(1)

print(f"\n\nUsing run: {run.id} ({run.run_number})")

# Test data with DMS values
test_data = {
    "run": str(run.id),
    "geodetic_datum": "PSD 93",
    "geodetic_system": "Universal Transverse Mercator",
    "map_zone": "Zone 40N(54E to 60E)",
    "north_reference": "Grid North",
    "central_meridian": 57,
    "latitude_degrees": 11,
    "latitude_minutes": 11,
    "latitude_seconds": 11,
    "longitude_degrees": 10,
    "longitude_minutes": 11,
    "longitude_seconds": 11,
}

print(f"\nTest data: {json.dumps(test_data, indent=2)}")

# Create a request
factory = RequestFactory()
request = factory.post('/api/v1/locations/', data=test_data, content_type='application/json')
force_authenticate(request, user=user)

# Call the viewset
viewset = LocationViewSet.as_view({'post': 'create'})

print("\n\nCalling LocationViewSet.create()...")
print("=" * 60)

try:
    response = viewset(request)
    print(f"\nResponse status: {response.status_code}")
    print(f"Response data: {json.dumps(response.data, indent=2, default=str)}")
except Exception as e:
    print(f"\nERROR: {e}")
    import traceback
    traceback.print_exc()
