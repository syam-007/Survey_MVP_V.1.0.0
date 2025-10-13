# Epic 3: Depth, Survey, and Tie-On Data Models & APIs

## Epic Goal
Implement data models and REST API endpoints for Depth Information, Survey Information, and Tie-On Information. This epic completes the core data input requirements for survey runs, enabling users to provide all necessary information before performing survey calculations.

## Priority
**HIGH** - Critical for completing survey run data requirements before calculation features

## User Value
As a survey engineer, I want to provide depth, survey type, and tie-on information for my survey runs so that the system has all required data to perform accurate survey calculations and analysis.

## Success Criteria
- [ ] Depth Information model and API endpoints implemented
- [ ] Survey Information model and API endpoints with survey type handling
- [ ] Tie-On Information model and API endpoints implemented
- [ ] All models properly linked to Run model (one-to-one relationships)
- [ ] Frontend forms for data entry (Depth, Survey, Tie-On)
- [ ] Validation for all required fields and business rules
- [ ] Comprehensive tests (>80% coverage)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Auto-population from well data when available
- [ ] Survey type validation (Type 1-4 with specific requirements)

## Stories

### Story 3.1: Location Information API & Data Models ✅
**Status:** COMPLETE

**As a** Survey Engineer
**I want** to manage location information for runs (latitude, longitude, UTM coordinates, geodetic system)
**so that** I can define geographic positioning data required for survey calculations

**Completion Notes:**
- Full CRUD API at /api/v1/locations/
- Automatic coordinate calculations (Easting/Northing from Lat/Lon)
- Grid correction, g_t, w_t calculations implemented
- 81 tests passing (>80% coverage)
- One-to-one relationship with Run and Well
- Completed: 2025-10-12

---

### Story 3.2: Depth Information API & Data Models ✅
**Status:** COMPLETE

**As a** survey engineer
**I want** REST API endpoints to manage depth information for runs
**so that** I can store elevation and reference datum data required for survey calculations

**Completion Notes:**
- Full CRUD API at /api/v1/depths/
- XOR constraint enforced (run XOR well)
- 61 tests passing (12 model + 20 serializer + 29 API)
- >80% code coverage achieved
- One-to-one relationship with Run and Well
- Elevation reference choices: KB, RT, GL, MSL, DF, RKB
- Completed: 2025-10-12

**Acceptance Criteria:**
1. **Depth Model Implementation** - Create Django Depth model with all required fields
2. **Depth Serializers** - Implement DRF serializers for depth data with validation
3. **Depth API Endpoints** - Create RESTful API endpoints for CRUD operations
4. **Run-Depth Association** - Link depth to run (one-to-one relationship with cascade delete)
5. **Well-Depth Association** - Support depth data for wells (optional, can be copied from well to run)
6. **Elevation Reference Dropdown** - Validate elevation reference against predefined choices
7. **Input Validation** - Validate reference datum, height, and elevation (numeric with proper ranges)
8. **Auto-Population** - When linking run to well, auto-populate depth data from well if available
9. **API Documentation** - OpenAPI/Swagger documentation for all depth endpoints
10. **Unit Tests** - Write comprehensive tests for models, serializers, and views (>80% coverage)
11. **Integration Tests** - Test depth creation/update flow with run association
12. **Frontend Form** - Create depth information input form for run creation workflow

**Story Points:** 8

---

### Story 3.3: Survey Information API & Data Models
**As a** survey engineer
**I want** REST API endpoints to manage survey information and survey types
**so that** I can specify survey type and prepare for file upload and calculation

**Acceptance Criteria:**
1. **Survey Model Implementation** - Create Django Survey model with survey type and metadata
2. **Survey Type Choices** - Implement survey type enum (Type 1 GTL, Type 2 Gyro, Type 3 MWD, Type 4 Unknown)
3. **Survey Serializers** - Implement DRF serializers with survey type validation
4. **Survey API Endpoints** - Create RESTful API endpoints for CRUD operations
5. **Run-Survey Association** - Link survey to run (one-to-one relationship with cascade delete)
6. **Survey Type Requirements** - Document required columns per survey type:
   - Type 1 (GTL): MD, Inc, Azi, w(t), g(t)
   - Type 2 (Gyro): MD, Inc, Azi
   - Type 3 (MWD): MD, Inc, Azi
   - Type 4 (Unknown): MD, Inc, Azi
7. **File Upload Preparation** - Add file_path field for future Excel upload feature
8. **Status Tracking** - Add status field (pending, uploaded, validated, calculated, error)
9. **API Documentation** - OpenAPI/Swagger documentation for all survey endpoints
10. **Unit Tests** - Write comprehensive tests (>80% coverage)
11. **Integration Tests** - Test survey creation workflow with run
12. **Frontend Form** - Create survey type selection form in run creation workflow

**Story Points:** 8

---

### Story 3.4: Tie-On Information API & Data Models
**As a** survey engineer
**I want** REST API endpoints to manage tie-on information
**so that** I can define survey starting point and hole section details

**Acceptance Criteria:**
1. **TieOn Model Implementation** - Create Django TieOn model with all required fields
2. **TieOn Serializers** - Implement DRF serializers with validation
3. **TieOn API Endpoints** - Create RESTful API endpoints for CRUD operations
4. **Run-TieOn Association** - Link tie-on to run (one-to-one relationship with cascade delete)
5. **Required Fields Validation** - Validate MD, Inc, Azi, TVD, Latitude, Departure, Well Type
6. **Hole Section Dropdown** - Validate hole section against predefined choices
7. **Casing/Drillpipe Logic** - Add boolean fields for casing and drillpipe selection
8. **Survey Tool Type** - Add survey tool type dropdown validation
9. **Survey Interval** - Add From/To fields with auto-calculated interval length
10. **Numeric Validation** - Proper validation for all numeric fields (MD, Inc, Azi, TVD, etc.)
11. **API Documentation** - OpenAPI/Swagger documentation for all tie-on endpoints
12. **Unit Tests** - Write comprehensive tests (>80% coverage)
13. **Integration Tests** - Test tie-on creation workflow with run
14. **Frontend Form** - Create tie-on information input form with conditional fields

**Story Points:** 13

---

### Story 3.5: Frontend Integration - Complete Run Creation Workflow
**As a** survey engineer
**I want** a seamless multi-step form to create a complete run with all required information
**so that** I can efficiently input all data before performing survey calculations

**Acceptance Criteria:**
1. **Multi-Step Form Component** - Create stepper/wizard component for run creation
2. **Step 1: Run Info** - Basic run information (run number, name, type, BHC checkbox)
3. **Step 2: Location** - Location information form (integrated with Story 3.1)
4. **Step 3: Depth** - Depth information form (integrated with Story 3.2)
5. **Step 4: Survey Type** - Survey type selection (integrated with Story 3.3)
6. **Step 5: Tie-On** - Tie-on information form (integrated with Story 3.4)
7. **Navigation Controls** - Next/Previous/Save Draft buttons with validation
8. **Progress Indicator** - Visual progress bar showing current step
9. **Auto-Save** - Save progress at each step completion
10. **Well Linking Toggle** - Option to link run to well with auto-population
11. **Validation Feedback** - Real-time validation with error messages
12. **Summary Review** - Final review screen before submission
13. **Loading States** - Show loading indicators during API calls
14. **Success/Error Handling** - Display notifications for create/update operations
15. **Responsive Design** - Works on desktop and tablet
16. **Unit Tests** - Test form validation and state management

**Story Points:** 13

---

## Epic Dependencies
- **Depends on:**
  - Epic 1 (Foundation & Core Setup) - COMPLETE ✅
  - Epic 2 (API Endpoints & Run Management) - COMPLETE ✅
- **Blocks:**
  - Epic 4 (File Upload & Survey Calculations)
  - Epic 5 (Survey Processing & Analysis)

## Technical Notes

### Backend Architecture
- Follow same pattern as Location model (Story 3.1)
- Use Django models with UUID primary keys
- OneToOneField relationships to Run (and optionally Well)
- Use DecimalField for numeric precision (MD, TVD, coordinates)
- Implement service layer for any calculations (interval length)
- Use DRF ViewSets for CRUD operations
- Use DRF routers for automatic URL configuration

### Data Model Relationships
```
Run (1) ---- (1) Location  [Epic 3, Story 3.1] ✅
Run (1) ---- (1) Depth     [Epic 3, Story 3.2]
Run (1) ---- (1) Survey    [Epic 3, Story 3.3]
Run (1) ---- (1) TieOn     [Epic 3, Story 3.4]
```

### Frontend Architecture
- Use React with TypeScript
- Use Material-UI components for forms
- Use React Hook Form for form state management
- Use React Query for API calls and caching
- Multi-step form with Stepper component
- Persist form state in localStorage for drafts
- Validate each step before allowing navigation

### Validation Rules
- All numeric fields: Proper range validation
- Dropdown fields: Validate against predefined choices
- Required fields: Cannot be null or empty
- Relationships: Run XOR Well for each model
- Survey intervals: From < To, both must be positive

### Testing Strategy
- Model tests: Field validation, constraints, relationships
- Serializer tests: Validation, create/update logic
- Service tests: Any calculation logic
- API tests: CRUD operations, authentication, permissions
- Frontend tests: Form validation, navigation, API integration
- Integration tests: Complete workflow from run creation to data submission

## Estimated Duration
**3 weeks** (50 story points total)

## Definition of Done
- [ ] All 5 stories completed and marked as "Done"
- [ ] All acceptance criteria met for each story
- [ ] API tests achieve >80% coverage
- [ ] All API endpoints documented (Swagger/OpenAPI)
- [ ] Frontend integration complete with working multi-step form
- [ ] Manual testing completed for all user flows
- [ ] Code reviewed and approved
- [ ] Database migrations applied successfully
- [ ] Demo completed showing:
  - Create complete run through multi-step form
  - Navigate between steps with validation
  - Link run to well with auto-population
  - View all run data (location, depth, survey, tie-on)
  - Update individual data sections
  - Validation error handling

---

**Epic Owner:** Bob (Scrum Master)
**Created:** 2025-10-12
**Status:** Ready for Development
