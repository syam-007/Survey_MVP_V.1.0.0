import os
import django
import sys
import json
from decimal import Decimal

# Add the project directory to the path
sys.path.insert(0, 'C:\\Users\\SyamlalMSobana\\Desktop\\Survey_V.1.0.0\\survey\\apps\\api')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from survey_api.models import Run
from survey_api.views.run_viewset import RunViewSet

# Get the run
run = Run.objects.select_related(
    'well__location',
    'location',
    'depth',
    'tie_on'
).prefetch_related('survey_files').get(id='964376fd-126b-4f84-af7f-493cea1e645a')

# Build response manually
response_data = {
    'id': str(run.id),
    'run_number': run.run_number,
    'run_name': run.run_name,
    'run_type': run.run_type,
    'run_in_type': run.run_in_type,
    'created_at': run.created_at.isoformat(),
    'updated_at': run.updated_at.isoformat(),
}

# Add well info
if run.well:
    response_data['well'] = {
        'id': str(run.well.id),
        'well_id': run.well.well_id,
        'well_name': run.well.well_name,
        'field': run.well.field,
        'platform_rig': run.well.platform_rig,
    }
    if run.well.location:
        response_data['well']['location'] = {
            'id': str(run.well.location.id),
            'latitude': float(run.well.location.latitude) if run.well.location.latitude else None,
            'longitude': float(run.well.location.longitude) if run.well.location.longitude else None,
            'easting': float(run.well.location.easting) if run.well.location.easting else None,
            'northing': float(run.well.location.northing) if run.well.location.northing else None,
        }

# Add location info with rounded values
if run.location:
    response_data['location'] = {
        'id': str(run.location.id),
        'latitude': float(run.location.latitude) if run.location.latitude else None,
        'longitude': float(run.location.longitude) if run.location.longitude else None,
        'easting': float(run.location.easting) if run.location.easting else None,
        'northing': float(run.location.northing) if run.location.northing else None,
        'geodetic_datum': run.location.geodetic_datum,
        'geodetic_system': run.location.geodetic_system,
        'map_zone': run.location.map_zone,
        'north_reference': run.location.north_reference,
        'central_meridian': float(run.location.central_meridian) if run.location.central_meridian else None,
        'grid_correction': float(run.location.grid_correction) if run.location.grid_correction else None,
        'w_t': round(float(run.location.w_t), 1) if run.location.w_t else None,
        'min_w_t': round(float(run.location.min_w_t), 1) if run.location.min_w_t else None,
        'max_w_t': round(float(run.location.max_w_t), 1) if run.location.max_w_t else None,
        'g_t': round(float(run.location.g_t), 1) if run.location.g_t else None,
        'min_g_t': round(float(run.location.min_g_t), 1) if run.location.min_g_t else None,
        'max_g_t': round(float(run.location.max_g_t), 1) if run.location.max_g_t else None,
    }

# Add depth info
if run.depth:
    response_data['depth'] = {
        'id': str(run.depth.id),
        'total_depth': float(run.depth.total_depth) if run.depth.total_depth else None,
        'kick_off_point': float(run.depth.kick_off_point) if run.depth.kick_off_point else None,
    }

# Add tieon info
if run.tie_on:
    response_data['tie_on'] = {
        'id': str(run.tie_on.id),
        'md': float(run.tie_on.md) if run.tie_on.md else None,
        'inc': float(run.tie_on.inc) if run.tie_on.inc else None,
        'azi': float(run.tie_on.azi) if run.tie_on.azi else None,
        'tvd': float(run.tie_on.tvd) if run.tie_on.tvd else None,
        'northing': float(run.tie_on.northing) if run.tie_on.northing else None,
        'easting': float(run.tie_on.easting) if run.tie_on.easting else None,
    }

print(json.dumps(response_data, indent=2))
