"""Test URL resolution for export endpoints"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from django.urls import resolve, Resolver404

test_urls = [
    '/api/v1/surveys/export/calculated/5ab12d6b-f795-460a-9f75-1f4e8111f4c8/',
    '/api/v1/surveys/export/interpolated/cc7266a8-05fe-458a-8d33-f41b6257b72a/',
]

print("\n=== Testing URL Resolution ===\n")

for url in test_urls:
    print(f"Testing: {url}")
    try:
        result = resolve(url)
        print(f"  SUCCESS")
        print(f"    View name: {result.view_name}")
        print(f"    URL name: {result.url_name}")
        print(f"    View function: {result.func.__name__ if hasattr(result.func, '__name__') else result.func}")
    except Resolver404 as e:
        print(f"  FAILED - URL not found!")
        print(f"    Error: {e}")
    except Exception as e:
        print(f"  FAILED - {type(e).__name__}: {e}")
    print()
