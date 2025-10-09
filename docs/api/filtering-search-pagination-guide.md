# API Filtering, Search, and Pagination Guide

Complete guide to using filtering, search, ordering, and pagination features in the Survey API.

## Table of Contents

1. [Overview](#overview)
2. [Run API Filters](#run-api-filters)
3. [Well API Filters](#well-api-filters)
4. [Search](#search)
5. [Ordering](#ordering)
6. [Pagination](#pagination)
7. [Combining Features](#combining-features)
8. [Performance Characteristics](#performance-characteristics)
9. [Error Handling](#error-handling)

---

## Overview

All list endpoints support:
- **Filtering**: Narrow results by specific field values
- **Search**: Full-text search across multiple fields
- **Ordering**: Sort results by specific fields
- **Pagination**: Page through large result sets

Base URLs:
- Run API: `GET /api/v1/runs/`
- Well API: `GET /api/v1/wells/`

---

## Run API Filters

### Available Filters

#### `run_type`
Filter by run type.

**Valid values:** `GTL`, `Gyro`, `MWD`, `Unknown`

```bash
GET /api/v1/runs/?run_type=MWD
```

#### `well`
Filter by well UUID.

```bash
GET /api/v1/runs/?well=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
```

#### `created_at_after`
Filter runs created after a specific date/time.

**Format:** ISO 8601 (`YYYY-MM-DDTHH:MM:SS`)

```bash
GET /api/v1/runs/?created_at_after=2024-01-01T00:00:00
```

#### `created_at_before`
Filter runs created before a specific date/time.

**Format:** ISO 8601 (`YYYY-MM-DDTHH:MM:SS`)

```bash
GET /api/v1/runs/?created_at_before=2024-12-31T23:59:59
```

#### `updated_at_after`
Filter runs updated after a specific date/time.

```bash
GET /api/v1/runs/?updated_at_after=2024-06-01T00:00:00
```

#### `updated_at_before`
Filter runs updated before a specific date/time.

```bash
GET /api/v1/runs/?updated_at_before=2024-06-30T23:59:59
```

### Date Range Example

Get runs created in January 2024:

```bash
GET /api/v1/runs/?created_at_after=2024-01-01T00:00:00&created_at_before=2024-01-31T23:59:59
```

---

## Well API Filters

### Available Filters

#### `well_type`
Filter by well type.

**Valid values:** `Oil`, `Gas`, `Water`, `Other`

```bash
GET /api/v1/wells/?well_type=Oil
```

---

## Search

Search across multiple fields using the `search` query parameter.

### Run API Search

Searches across:
- `run_number` (partial match, case-insensitive)
- `run_name` (partial match, case-insensitive)

```bash
GET /api/v1/runs/?search=MWD
```

**Example results:**
- Matches run_number: `MWD-001`, `RUN-MWD-123`
- Matches run_name: `"Alpha MWD Run"`, `"MWD Survey Data"`

### Well API Search

Searches across:
- `well_name` (partial match, case-insensitive)

```bash
GET /api/v1/wells/?search=Alpha
```

**Example results:**
- Matches well_name: `"Alpha Well"`, `"Well Alpha-1"`

---

## Ordering

Sort results using the `ordering` query parameter.

### Run API Ordering

**Available fields:**
- `created_at` (default: descending)
- `updated_at`
- `run_number`

**Ascending order:**
```bash
GET /api/v1/runs/?ordering=created_at
```

**Descending order** (prefix with `-`):
```bash
GET /api/v1/runs/?ordering=-created_at
```

**Example:** Get oldest runs first:
```bash
GET /api/v1/runs/?ordering=created_at
```

### Well API Ordering

**Available fields:**
- `created_at` (default: descending)
- `updated_at`
- `well_name`

**Example:** Sort wells alphabetically:
```bash
GET /api/v1/wells/?ordering=well_name
```

---

## Pagination

All list endpoints return paginated results.

### Pagination Parameters

#### `page`
Page number (1-indexed).

**Default:** `1`

```bash
GET /api/v1/runs/?page=2
```

#### `page_size`
Number of results per page.

**Default:** `20`
**Maximum:** `100`

```bash
GET /api/v1/runs/?page_size=50
```

**Note:** Requests exceeding `max_page_size=100` will be capped at 100.

### Pagination Response

```json
{
  "count": 150,
  "next": "http://api.example.com/api/v1/runs/?page=3",
  "previous": "http://api.example.com/api/v1/runs/?page=1",
  "page": 2,
  "total_pages": 8,
  "page_size": 20,
  "results": [...]
}
```

**Fields:**
- `count`: Total number of results
- `next`: URL to next page (null if last page)
- `previous`: URL to previous page (null if first page)
- `page`: Current page number
- `total_pages`: Total number of pages
- `page_size`: Results per page
- `results`: Array of result objects

### Example: Navigate Pages

**First page:**
```bash
GET /api/v1/runs/?page=1&page_size=20
```

**Next page:**
```bash
GET /api/v1/runs/?page=2&page_size=20
```

**Last page:**
```bash
GET /api/v1/runs/?page=8&page_size=20
```

---

## Combining Features

You can combine filters, search, ordering, and pagination in a single request.

### Example 1: Filter + Search

Get MWD runs containing "Alpha":

```bash
GET /api/v1/runs/?run_type=MWD&search=Alpha
```

### Example 2: Filter + Ordering

Get Oil wells sorted alphabetically:

```bash
GET /api/v1/wells/?well_type=Oil&ordering=well_name
```

### Example 3: Date Range + Filter + Ordering

Get MWD runs from January 2024, newest first:

```bash
GET /api/v1/runs/?run_type=MWD&created_at_after=2024-01-01T00:00:00&created_at_before=2024-01-31T23:59:59&ordering=-created_at
```

### Example 4: Complex Combination

Get Oil wells containing "Alpha", sorted alphabetically, 10 per page:

```bash
GET /api/v1/wells/?well_type=Oil&search=Alpha&ordering=well_name&page=1&page_size=10
```

### Example 5: Filter by Well + Date Range + Search

Get runs for a specific well, created in the last 30 days, containing "MWD":

```bash
GET /api/v1/runs/?well=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&created_at_after=2024-10-01T00:00:00&search=MWD
```

---

## Performance Characteristics

### Response Times

| Dataset Size | Operation | Expected Time |
|--------------|-----------|---------------|
| 10,000+ runs | List (paginated) | < 500ms |
| 10,000+ runs | Filtered list | < 500ms |
| 10,000+ runs | Search | < 500ms |
| 1,000+ wells | List (paginated) | < 500ms |
| 1,000+ wells | Filtered list | < 500ms |

**Note:** Performance tested with 10,000 runs and 100 wells on standard hardware.

### Optimization Tips

1. **Use pagination**: Always paginate large result sets
2. **Filter first**: Apply filters before search for better performance
3. **Limit page_size**: Smaller pages load faster
4. **Index-friendly filters**: Use `run_type`, `well_type`, and UUID filters (indexed)
5. **Date range filters**: More efficient than searching by date in text fields

### Query Complexity

Query count remains constant regardless of result size:
- **Run list**: ~3 queries (optimized with select_related/prefetch_related)
- **Well list**: ~3 queries (optimized with annotate for run counts)

---

## Error Handling

### Invalid Filter Values

**Example:** Invalid `run_type`

```bash
GET /api/v1/runs/?run_type=InvalidType
```

**Response:** `400 Bad Request` or empty results

```json
{
  "count": 0,
  "next": null,
  "previous": null,
  "page": 1,
  "total_pages": 0,
  "page_size": 20,
  "results": []
}
```

### Invalid Date Format

**Example:** Malformed date

```bash
GET /api/v1/runs/?created_at_after=not-a-date
```

**Response:** `400 Bad Request`

```json
{
  "created_at_after": ["Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SS)"]
}
```

### Invalid Page Number

**Example:** Page 0

```bash
GET /api/v1/runs/?page=0
```

**Response:** `404 Not Found`

```json
{
  "detail": "Invalid page."
}
```

**Example:** Page beyond available data

```bash
GET /api/v1/runs/?page=9999
```

**Response:** `404 Not Found`

```json
{
  "detail": "Invalid page."
}
```

### Invalid UUID

**Example:** Malformed UUID

```bash
GET /api/v1/runs/?well=not-a-valid-uuid
```

**Response:** `400 Bad Request` or empty results

### Invalid Ordering Field

**Example:** Non-orderable field

```bash
GET /api/v1/runs/?ordering=invalid_field
```

**Response:** `400 Bad Request` or ignored (falls back to default ordering)

---

## Complete Examples

### Use Case 1: Recent MWD Runs for a Well

Get MWD runs for Well A from the last 7 days, newest first:

```bash
curl -X GET "http://api.example.com/api/v1/runs/?well=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&run_type=MWD&created_at_after=2024-10-01T00:00:00&ordering=-created_at" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Use Case 2: Search All Oil Wells

Get all Oil wells containing "Alpha", sorted by name:

```bash
curl -X GET "http://api.example.com/api/v1/wells/?well_type=Oil&search=Alpha&ordering=well_name" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Use Case 3: Paginated Run List

Get page 3 of runs (showing 50 per page):

```bash
curl -X GET "http://api.example.com/api/v1/runs/?page=3&page_size=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Use Case 4: Monthly Report

Get all runs created in January 2024, grouped by type:

```bash
# Get all run types first
curl -X GET "http://api.example.com/api/v1/runs/?created_at_after=2024-01-01T00:00:00&created_at_before=2024-01-31T23:59:59&page_size=100" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Or filter by specific type
curl -X GET "http://api.example.com/api/v1/runs/?run_type=MWD&created_at_after=2024-01-01T00:00:00&created_at_before=2024-01-31T23:59:59" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Quick Reference

### Run API Query Parameters

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `run_type` | String | `MWD` | Filter by run type |
| `well` | UUID | `a0eebc99...` | Filter by well UUID |
| `created_at_after` | DateTime | `2024-01-01T00:00:00` | Runs created after date |
| `created_at_before` | DateTime | `2024-12-31T23:59:59` | Runs created before date |
| `updated_at_after` | DateTime | `2024-01-01T00:00:00` | Runs updated after date |
| `updated_at_before` | DateTime | `2024-12-31T23:59:59` | Runs updated before date |
| `search` | String | `Alpha` | Search run_number and run_name |
| `ordering` | String | `-created_at` | Sort by field (prefix `-` for desc) |
| `page` | Integer | `2` | Page number (1-indexed) |
| `page_size` | Integer | `50` | Results per page (max 100) |

### Well API Query Parameters

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `well_type` | String | `Oil` | Filter by well type |
| `search` | String | `Alpha` | Search well_name |
| `ordering` | String | `well_name` | Sort by field |
| `page` | Integer | `1` | Page number |
| `page_size` | Integer | `20` | Results per page |

---

## Support

For questions or issues with API filtering and search:
- Review API documentation: `/docs/api/`
- Check test examples: `/apps/api/tests/`
- Report issues: Project issue tracker
