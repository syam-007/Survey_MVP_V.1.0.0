# Epic 2: API Endpoints & Run Management

## Epic Goal
Implement complete REST API endpoints for managing survey runs, wells, and associated data. This epic enables users to create, read, update, and delete runs through a robust API, forming the core functionality for the Survey Management System.

## Priority
**HIGH** - Critical for enabling core survey management functionality

## User Value
As a survey engineer, I want to create and manage survey runs through API endpoints so that I can efficiently organize and track well survey data through the web application.

## Success Criteria
- [ ] Complete CRUD API for Runs (create, list, retrieve, update, delete)
- [ ] Complete CRUD API for Wells
- [ ] Proper API versioning (/api/v1/)
- [ ] Request/response validation with DRF serializers
- [ ] Pagination for list endpoints
- [ ] Filtering and search capabilities
- [ ] Comprehensive API tests (>80% coverage)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Frontend integration for Run management
- [ ] Error handling with proper HTTP status codes

## Stories

### Story 2.1: Run Management API Endpoints
**As a** survey engineer
**I want** REST API endpoints to manage survey runs
**so that** I can create, view, update, and delete survey runs programmatically

**Acceptance Criteria:**
1. `GET /api/v1/runs` - List all runs with pagination (20 per page)
2. `POST /api/v1/runs` - Create a new run with validation
3. `GET /api/v1/runs/{id}` - Retrieve a specific run with nested location/depth/well data
4. `PUT /api/v1/runs/{id}` - Update an existing run
5. `PATCH /api/v1/runs/{id}` - Partial update of a run
6. `DELETE /api/v1/runs/{id}` - Soft delete a run
7. All endpoints require authentication (JWT token)
8. Proper permission checks (admins and engineers can create/update, viewers read-only)
9. Validation errors return 400 with detailed field errors
10. API returns proper HTTP status codes (200, 201, 400, 401, 403, 404)
11. RunSerializer includes nested well, location, depth data
12. Integration tests for all CRUD operations

**Story Points:** 13

---

### Story 2.2: Well Management API Endpoints
**As a** survey engineer
**I want** REST API endpoints to manage wells
**so that** I can create and link wells to survey runs

**Acceptance Criteria:**
1. `GET /api/v1/wells` - List all wells with pagination
2. `POST /api/v1/wells` - Create a new well
3. `GET /api/v1/wells/{id}` - Retrieve well details with associated runs
4. `PUT /api/v1/wells/{id}` - Update well information
5. `DELETE /api/v1/wells/{id}` - Delete well (sets run.well to NULL)
6. Wells can be filtered by well_type (Oil, Gas, Water, Other)
7. Search wells by well_name (case-insensitive partial match)
8. Authentication and permission checks required
9. WellSerializer includes list of associated runs
10. Integration tests for all endpoints

**Story Points:** 8

---

### Story 2.3: API Filtering, Search & Pagination
**As a** survey engineer
**I want** to filter, search, and paginate API results
**so that** I can efficiently find specific runs and wells

**Acceptance Criteria:**
1. Runs can be filtered by: run_type, well_id, created date range
2. Runs can be searched by: run_number, run_name (partial match)
3. Runs can be ordered by: created_at, updated_at, run_number
4. Wells can be filtered by: well_type
5. Wells can be searched by: well_name
6. Pagination parameters: page, page_size (default 20, max 100)
7. Response includes pagination metadata: count, next, previous, page, total_pages
8. Query parameters validated (invalid filters return 400)
9. Empty results return 200 with empty array
10. Performance: List queries <500ms for 10,000 records

**Story Points:** 8

---

### Story 2.4: Frontend Run Management Pages
**As a** survey engineer
**I want** a web interface to manage runs
**so that** I can create, view, and edit survey runs without using API directly

**Acceptance Criteria:**
1. Runs List Page: Display all runs in a data table with pagination
2. Create Run Page: Form to create new run with validation
3. Run Details Page: View run details with location, depth, well information
4. Edit Run Page: Form to update existing run
5. Delete confirmation dialog with success/error feedback
6. Search and filter controls on list page
7. Loading states during API calls
8. Error messages displayed for failed operations
9. Success notifications for create/update/delete
10. Navigation breadcrumbs and back buttons
11. Responsive design (works on desktop and tablet)
12. Role-based UI (engineers can edit, viewers read-only)

**Story Points:** 13

---

## Epic Dependencies
- **Depends on:** Epic 1 (Foundation & Core Setup) - COMPLETE ✅
- **Blocks:** Epic 3 (File Upload & Processing), Epic 4 (Survey Calculations)

## Technical Notes
- Use Django REST Framework ViewSets for CRUD operations
- Use DRF routers for automatic URL configuration
- Follow API specification in docs/architecture/api-specification.md
- Use select_related/prefetch_related for optimized queries
- Implement service layer for business logic (separation from views)
- Use DRF pagination classes for consistent pagination
- Use django-filter for filtering and search
- Frontend uses axios API client from Epic 1
- Frontend uses Material-UI DataGrid for tables
- Frontend uses React Hook Form for forms

## Estimated Duration
**2 weeks** (42 story points total)

## Definition of Done
- [ ] All 4 stories completed and marked as "Done"
- [ ] All acceptance criteria met for each story
- [ ] API tests achieve >80% coverage
- [ ] All API endpoints documented (Swagger/OpenAPI)
- [ ] Frontend integration complete with working UI
- [ ] Manual testing completed for all user flows
- [ ] Code reviewed and approved
- [ ] Demo completed showing:
  - Create run through web UI
  - List/filter/search runs
  - View run details
  - Update run information
  - Delete run
  - Well management (create, link to run)

---

**Epic Owner:** Bob (Scrum Master)
**Created:** 2025-10-08
**Status:** Ready for Development
