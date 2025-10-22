# Epic 4: File Upload & Survey Calculations

## Epic Goal
Implement file upload functionality, welleng library integration, and core survey calculation capabilities. This epic enables users to upload survey data files, validate them, perform calculations using the welleng library, and visualize results with automatic interpolation.

## Priority
**HIGH** - Critical for enabling core survey calculation workflows that the system was designed to support

## User Value
As a survey engineer, I want to upload survey data files and have the system automatically calculate, interpolate, and visualize my survey results so that I can quickly analyze wellbore trajectories and make informed decisions.

## Success Criteria
- [ ] File upload system with validation for Excel files (.xlsx, .csv)
- [ ] Welleng library integrated for survey calculations
- [ ] Automatic interpolation with default resolution of 10
- [ ] 2D and 3D visualization of survey results
- [ ] File download functionality for calculated results (Excel format)
- [ ] Survey data model with proper relationship to Run
- [ ] Comprehensive validation for survey data integrity
- [ ] Performance meets benchmarks (< 3 seconds for 10,000 points)
- [ ] All tests passing with >80% coverage

## Stories

### Story 4.1: Survey Data Model & File Upload Infrastructure
**As a** survey engineer
**I want** to upload Excel files containing survey data
**so that** the system can store and process my survey measurements

**Acceptance Criteria:**
1. **SurveyData Model** - Create Django model to store uploaded survey measurements
2. **File Upload API** - REST endpoint for uploading .xlsx and .csv files (max 50MB)
3. **File Storage** - Secure file storage with proper naming conventions
4. **Survey Type Validation** - Validate uploaded file matches selected survey type
5. **Required Columns Validation** - Verify file contains required columns based on type:
   - Type 1 (GTL): MD, Inc, Azi, w(t), g(t)
   - Type 2/3/4: MD, Inc, Azi
6. **Data Type Validation** - Ensure numeric columns contain valid numbers
7. **Data Integrity Checks** - Validate:
   - No missing values in critical columns
   - Inclination: 0-180 degrees
   - Azimuth: 0-360 degrees
   - MD values are positive and sequential
8. **Error Messaging** - Clear, specific error messages for validation failures
9. **File Metadata Tracking** - Store filename, upload timestamp, file size, row count
10. **Database Schema** - Survey data stored with proper relationship to Run and Survey models
11. **API Documentation** - OpenAPI/Swagger docs for upload endpoints
12. **Unit Tests** - Test file parsing, validation logic, error handling (>80% coverage)

**Story Points:** 13

---

### Story 4.2: Welleng Library Integration & Survey Calculation
**As a** survey engineer
**I want** the system to automatically calculate survey trajectories using welleng
**so that** I can get accurate wellbore position calculations immediately after upload

**Acceptance Criteria:**
1. **Welleng Library Setup** - Install and configure welleng Python library
2. **Survey Calculation Service** - Create service layer for welleng calculations
3. **Automatic Trigger** - Calculation triggered automatically after successful file upload
4. **Survey Status Tracking** - Update survey status: pending → processing → calculated/error
5. **Calculation Input Preparation** - Convert uploaded data to welleng input format
6. **Use Run Context** - Apply location, depth, and tie-on data from associated run
7. **Position Calculations** - Calculate:
   - Easting (X)
   - Northing (Y)
   - True Vertical Depth (TVD)
   - DLS (Dog Leg Severity)
   - Build Rate
   - Turn Rate
8. **Store Calculated Results** - Save calculated values to database (CalculatedSurvey model)
9. **Error Handling** - Handle welleng calculation errors gracefully with user-friendly messages
10. **Performance Optimization** - Meet performance benchmark (< 3 seconds for 10,000 points)
11. **Async Processing** - Consider background task queue for large files
12. **Unit Tests** - Test welleng integration, calculation logic, error scenarios (>80% coverage)

**Story Points:** 21

---

### Story 4.3: Survey Interpolation
**As a** survey engineer
**I want** automatic interpolation of my survey data with default resolution of 10
**so that** I have smooth trajectory data for visualization and analysis

**Acceptance Criteria:**
1. **Interpolation Service** - Create service for welleng interpolation
2. **Default Resolution** - Automatically interpolate with resolution = 10 after calculation
3. **Configurable Resolution** - Allow users to specify custom interpolation resolution (1-100)
4. **Interpolation Algorithm** - Use welleng's interpolation methods
5. **Store Interpolated Data** - Save interpolated points to database (InterpolatedSurvey model)
6. **Relationship Tracking** - Link interpolated data to original calculated survey
7. **Incremental Interpolation** - Support interpolation at multiple resolutions
8. **Data Point Calculation** - Interpolate all positional fields (MD, Inc, Azi, X, Y, TVD, DLS)
9. **Performance** - Interpolation completes within 1-2 seconds for typical datasets
10. **API Endpoint** - REST endpoint to trigger re-interpolation with different resolution
11. **Status Updates** - Track interpolation status separately from calculation status
12. **Unit Tests** - Test interpolation logic, resolution handling, data integrity (>80% coverage)

**Story Points:** 13

---

### Story 4.4: 2D & 3D Survey Visualization
**As a** survey engineer
**I want** to see 2D and 3D visualizations of my calculated survey
**so that** I can visually inspect the wellbore trajectory

**Acceptance Criteria:**
1. **Visualization Library** - Integrate Plotly.js or similar for React
2. **2D Plot Component** - Create React component for 2D trajectory view
3. **2D Plot Types** - Support multiple 2D views:
   - Vertical Section (TVD vs. Horizontal Displacement)
   - Plan View (North vs. East)
   - Inclination Profile (MD vs. Inc)
   - Azimuth Profile (MD vs. Azi)
4. **3D Plot Component** - Create React component for 3D wellbore visualization
5. **3D Rendering** - Display 3D trajectory with proper axes (X, Y, TVD)
6. **Interactive Controls** - Zoom, pan, rotate for both 2D and 3D plots
7. **Data Switching** - Toggle between calculated and interpolated data views
8. **Performance** - Initial plot renders in < 5 seconds
9. **Responsive Design** - Plots adapt to different screen sizes
10. **Plot Export** - Allow users to export plots as PNG images
11. **Loading States** - Show loading indicators while plots render
12. **Error Handling** - Graceful handling of missing data or rendering errors
13. **Unit Tests** - Test plot components, data transformation, interaction handlers

**Story Points:** 13

---

### Story 4.5: Survey Results Download
**As a** survey engineer
**I want** to download calculated and interpolated survey results in Excel format
**so that** I can use the data in other tools and share with team members

**Acceptance Criteria:**
1. **Excel Export Service** - Create backend service for Excel file generation
2. **Calculated Data Export** - Export calculated survey results to Excel
3. **Interpolated Data Export** - Export interpolated survey results to Excel
4. **Excel Structure** - Well-formatted Excel with:
   - Header row with column names
   - Run metadata sheet (run info, location, depth, tie-on)
   - Calculated data sheet
   - Interpolated data sheet (if available)
5. **Column Organization** - Include all relevant fields: MD, Inc, Azi, TVD, X (Easting), Y (Northing), DLS, Build Rate, Turn Rate
6. **File Naming** - Use consistent naming: `{run_name}_calculated_{timestamp}.xlsx`
7. **Download API Endpoint** - REST endpoint to trigger file download
8. **Frontend Download Button** - Add download button to survey results page
9. **Multiple Format Support** - Support .xlsx and .csv formats
10. **File Size Optimization** - Compress large files appropriately
11. **Error Handling** - Handle export errors with user feedback
12. **Unit Tests** - Test Excel generation, file formatting, download flow (>80% coverage)

**Story Points:** 8

---

### Story 4.6: Survey Calculation Frontend Integration
**As a** survey engineer
**I want** a seamless frontend workflow from file upload to viewing results
**so that** I can efficiently process survey data end-to-end

**Acceptance Criteria:**
1. **File Upload Component** - Create React component for drag-and-drop file upload
2. **Upload Progress Indicator** - Show upload progress bar
3. **Validation Feedback** - Display validation errors clearly to user
4. **Processing Status** - Show real-time calculation status (uploading → validating → calculating → interpolating → complete)
5. **Results Page** - Create survey results page showing:
   - File metadata (name, upload time, row count)
   - Calculation summary (status, duration, data points)
   - 2D and 3D plots
   - Download buttons
6. **Navigation** - Add survey upload option to run detail page
7. **Multiple File Support** - Track and display multiple survey files per run
8. **Error Display** - User-friendly error messages for failed uploads/calculations
9. **Success Notifications** - Confirm successful completion with notification
10. **Loading States** - Proper loading indicators throughout workflow
11. **Responsive Design** - Mobile-friendly file upload and results display
12. **Unit Tests** - Test upload flow, status updates, error handling (>80% coverage)
13. **Integration Tests** - Test complete workflow from upload to visualization

**Story Points:** 13

---

## Epic Dependencies
- **Depends on:**
  - Epic 3 (Depth, Survey, and Tie-On Data Models) - COMPLETE ✅
    - Survey model with survey_type field
    - Run model with all relationships
    - Location, Depth, TieOn models for calculation context
- **Blocks:**
  - Epic 5 (Comparison & Adjustment Features)
  - Epic 6 (Extrapolation & Quality Check)
  - Epic 7 (Report Generation)

## Technical Notes

### Backend Architecture
- **Welleng Library:** Primary calculation engine (https://github.com/jonnymaserati/welleng)
- **File Upload:** Django's FileField with custom storage backend
- **Async Processing:** Consider Celery for long-running calculations
- **Data Models:**
  ```python
  SurveyData        # Uploaded raw data
  CalculatedSurvey  # Welleng calculation results
  InterpolatedSurvey # Interpolated data points
  ```
- **Service Layer:** Separate calculation logic from API views
- **Error Handling:** Custom exceptions for validation and calculation errors

### Frontend Architecture
- **File Upload:** React Dropzone for drag-and-drop
- **State Management:** React Query for async operations, cache calculation results
- **Visualization:** Plotly.js for interactive 2D/3D plots
- **File Download:** Use blob URLs for client-side downloads
- **Status Polling:** WebSocket or polling for real-time calculation status

### Database Schema
```
Run (1) ---- (1) Survey (from Epic 3)
Survey (1) ---- (1) SurveyFile
SurveyFile (1) ---- (1) SurveyData (raw uploaded data)
SurveyData (1) ---- (1) CalculatedSurvey
CalculatedSurvey (1) ---- (0..*) InterpolatedSurvey (different resolutions)
```

### Welleng Integration Points
1. **Survey Calculation:**
   - Input: MD, Inc, Azi arrays + survey type + tie-on data
   - Output: Position arrays (X, Y, TVD) + DLS + Build/Turn rates
2. **Interpolation:**
   - Input: Calculated survey + resolution
   - Output: Interpolated survey at specified resolution
3. **Error Handling:**
   - Handle welleng exceptions gracefully
   - Validate input data before passing to welleng

### File Upload Validation Strategy
1. **Pre-Upload Validation:**
   - File type check (.xlsx, .csv, .rep)
   - File size check (< 50MB)
2. **Post-Upload Validation:**
   - Column name validation
   - Data type validation
   - Range validation (Inc: 0-180, Azi: 0-360)
   - Sequence validation (MD increasing)
3. **Survey Type Matching:**
   - Type 1 (GTL): Require w(t), g(t) columns
   - Type 2/3/4: Require MD, Inc, Azi only

### Performance Optimization
- **File Upload:** Stream large files, don't load entirely into memory
- **Calculation:** Use NumPy arrays for efficient welleng processing
- **Interpolation:** Cache interpolated results, avoid recalculation
- **Visualization:** Downsample data for initial render if > 10,000 points
- **Database:** Index on run_id, survey_id, created_at

### Testing Strategy
- **Model Tests:** SurveyData, CalculatedSurvey, InterpolatedSurvey validation
- **Service Tests:** Welleng calculation logic, interpolation, file parsing
- **API Tests:** Upload, calculation trigger, download endpoints
- **Frontend Tests:** Upload component, visualization components, error handling
- **Integration Tests:** End-to-end upload → calculate → visualize → download
- **Performance Tests:** Verify benchmarks (< 3s calculation, < 5s render)

## Estimated Duration
**6 weeks** (81 story points total)

## Definition of Done
- [ ] All 6 stories completed and marked as "Done"
- [ ] All acceptance criteria met for each story
- [ ] Welleng library successfully integrated
- [ ] File upload validation working for all survey types
- [ ] Survey calculations accurate and performant (< 3 seconds for 10,000 points)
- [ ] Interpolation working with configurable resolution
- [ ] 2D and 3D visualizations rendering correctly (< 5 seconds)
- [ ] Excel download functionality working
- [ ] All tests passing with >80% coverage
- [ ] API documentation complete (Swagger/OpenAPI)
- [ ] Frontend workflow tested end-to-end
- [ ] Performance benchmarks validated
- [ ] Security validated (file upload scanning, size limits)
- [ ] Demo completed showing:
  - Upload survey file for each survey type
  - Automatic calculation and interpolation
  - View 2D and 3D plots
  - Download calculated results
  - Error handling for invalid files
  - Performance with large dataset (>5,000 points)

---

**Epic Owner:** John (Product Manager)
**Created:** 2025-10-13
**Status:** Ready for Development
