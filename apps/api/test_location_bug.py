"""
Test script to debug the location service issue
"""
import os
import django
import sys

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from survey_api.services.location_service import LocationService

# Test data from the frontend (RUN-06 attempt)
test_data = {
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
    "run": "5267e36c-8d99-4e17-919b-5190dca970dc"
}

print("\n" + "="*60)
print("TESTING LOCATION SERVICE WITH REAL DATA")
print("="*60)
print(f"\nInput data: {test_data}")
print()

try:
    result = LocationService.create_location_with_calculations(test_data)
    print("\nSUCCESS!")
    print(f"Result: {result}")
except Exception as e:
    print(f"\nERROR: {e}")
    import traceback
    traceback.print_exc()
