"""Check all registered URL patterns"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_api.settings')
django.setup()

from django.urls import get_resolver
from django.urls.resolvers import URLPattern, URLResolver

def show_urls(patterns, prefix=''):
    """Recursively show all URL patterns"""
    for pattern in patterns:
        if isinstance(pattern, URLPattern):
            full_pattern = prefix + str(pattern.pattern)
            name = pattern.name or '<no name>'
            print(f"  {full_pattern} -> {name}")
        elif isinstance(pattern, URLResolver):
            new_prefix = prefix + str(pattern.pattern)
            show_urls(pattern.url_patterns, new_prefix)

resolver = get_resolver()
print("\n=== ALL URL PATTERNS WITH 'survey' OR 'export' ===\n")

# Get all patterns
all_patterns = []
def collect_patterns(patterns, prefix=''):
    for pattern in patterns:
        if isinstance(pattern, URLPattern):
            full_pattern = prefix + str(pattern.pattern)
            all_patterns.append((full_pattern, pattern.name or '<no name>'))
        elif isinstance(pattern, URLResolver):
            new_prefix = prefix + str(pattern.pattern)
            collect_patterns(pattern.url_patterns, new_prefix)

collect_patterns(resolver.url_patterns)

# Filter and display survey/export related patterns
survey_patterns = [p for p in all_patterns if 'survey' in p[0].lower() or 'export' in p[0].lower()]
for pattern, name in sorted(survey_patterns, key=lambda x: x[0]):
    print(f"  {pattern} -> {name}")

print(f"\nTotal survey/export patterns: {len(survey_patterns)}")

# Specifically check for the export patterns
print("\n=== CHECKING SPECIFIC EXPORT PATTERNS ===\n")
export_calc_pattern = [p for p in all_patterns if 'export/calculated' in p[0]]
export_interp_pattern = [p for p in all_patterns if 'export/interpolated' in p[0]]

if export_calc_pattern:
    print("✓ Found export/calculated pattern:")
    for p, n in export_calc_pattern:
        print(f"    {p} -> {n}")
else:
    print("✗ No export/calculated pattern found!")

if export_interp_pattern:
    print("✓ Found export/interpolated pattern:")
    for p, n in export_interp_pattern:
        print(f"    {p} -> {n}")
else:
    print("✗ No export/interpolated pattern found!")
