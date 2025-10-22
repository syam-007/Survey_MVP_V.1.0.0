# Epic 5: Comparison & Delta Analysis

## Epic Goal
Implement survey comparison functionality that allows users to compare two survey datasets, calculate deltas, and visualize differences through 2D/3D graphs. This epic enables engineers to analyze trajectory deviations between planned and actual surveys, or compare multiple survey runs.

## Priority
**HIGH** - Critical feature for quality control and trajectory analysis workflows

## User Value
As a survey engineer, I want to compare my current survey against a reference survey so that I can identify trajectory deviations, analyze differences in wellbore position, and make informed decisions about corrective actions.

## Success Criteria
- [ ] Reference survey upload and management system
- [ ] Delta calculation engine (position and angular differences)
- [ ] Comparison visualization (2D and 3D with delta overlay)
- [ ] Configurable ratio factor for deviation scaling
- [ ] Excel/CSV export of comparison results with delta values
- [ ] Multiple reference survey tracking per run
- [ ] Reuse of previously uploaded reference surveys
- [ ] Automatic calculation and interpolation of new reference surveys
- [ ] Performance meets benchmarks (< 5 seconds for comparison)
- [ ] All tests passing with >80% coverage

## Stories

### Story 5.1: Reference Survey Data Model & Upload
**As a** survey engineer
**I want** to upload reference survey files for comparison
**so that** I can analyze deviations between my current survey and a reference trajectory

**Acceptance Criteria:**
1. **Reference Survey Model** - Extend SurveyFile model to support reference surveys
2. **Survey Role Field** - Add field to distinguish: 'primary', 'reference', 'comparison'
3. **Reference Upload API** - Dedicated endpoint for uploading reference surveys
4. **Automatic Processing** - Trigger calculation and interpolation (resolution=10) for reference surveys
5. **Use Current Run Context** - Apply current run's location, depth, tie-on data to reference survey
6. **Multiple References** - Support multiple reference surveys per run
7. **Reference List** - Track all uploaded reference surveys with metadata
8. **Reuse Capability** - Allow selection of previously uploaded reference surveys
9. **File Association** - Link reference survey to run and primary survey
10. **Upload Dropdown** - Frontend component showing:
    - Previously uploaded reference surveys
    - Option to upload new reference survey
11. **Reference Metadata** - Store: upload date, file name, status, data point count
12. **Database Migration** - Update schema to support reference survey relationships
13. **Unit Tests** - Test reference survey creation, association, retrieval (>80% coverage)

**Story Points:** 13

---

### Story 5.2: Delta Calculation Engine
**As a** survey engineer
**I want** the system to calculate position and angular deltas between surveys
**so that** I can quantify trajectory deviations

**Acceptance Criteria:**
1. **Delta Calculation Service** - Create service for computing survey differences
2. **Position Deltas** - Calculate differences for:
   - ΔX (Easting difference)
   - ΔY (Northing difference)
   - ΔZ (TVD difference)
   - ΔHorizontal (horizontal displacement: √(ΔX² + ΔY²))
   - ΔTotal (total displacement: √(ΔX² + ΔY² + ΔZ²))
3. **Angular Deltas** - Calculate differences for:
   - ΔInclination (inc difference)
   - ΔAzimuth (azi difference, handling 0/360 wraparound)
4. **MD Alignment** - Align surveys at corresponding measured depths
5. **Interpolation for Alignment** - Interpolate to common MD stations if needed
6. **Sign Convention** - Consistent sign convention: Comparison - Reference
7. **Delta Storage** - Store calculated deltas in ComparisonResult model
8. **Statistical Summary** - Calculate:
   - Maximum deviation (X, Y, Z, Total)
   - Average deviation
   - Standard deviation
   - Deviation at key depths
9. **Ratio Factor** - Apply user-defined ratio factor for visualization scaling
10. **Welleng Integration** - Use welleng's comparison utilities where applicable
11. **Error Handling** - Handle mismatched survey lengths, missing data
12. **Performance** - Complete delta calculation in < 3 seconds
13. **Unit Tests** - Test delta calculations, edge cases, statistical functions (>80% coverage)

**Story Points:** 21

---

### Story 5.3: Comparison Data Model & API
**As a** survey engineer
**I want** to persist comparison results and access them via API
**so that** I can retrieve and display comparison data efficiently

**Acceptance Criteria:**
1. **ComparisonResult Model** - Create model to store comparison data:
   ```python
   - id: UUID
   - run: ForeignKey(Run)
   - primary_survey: ForeignKey(SurveyData)
   - reference_survey: ForeignKey(SurveyData)
   - ratio_factor: Integer (default=10)
   - md_data: JSON (aligned MD stations)
   - delta_x: JSON (easting deltas)
   - delta_y: JSON (northing deltas)
   - delta_z: JSON (TVD deltas)
   - delta_horizontal: JSON
   - delta_total: JSON
   - delta_inc: JSON
   - delta_azi: JSON
   - max_deviation: JSON (statistics)
   - created_at: DateTime
   ```
2. **Comparison API Endpoints:**
   - POST `/api/v1/comparisons/` - Create new comparison
   - GET `/api/v1/comparisons/{id}/` - Retrieve comparison results
   - GET `/api/v1/comparisons/?run={run_id}` - List comparisons for run
   - DELETE `/api/v1/comparisons/{id}/` - Delete comparison
3. **Request Validation** - Validate:
   - Both surveys exist and are calculated
   - Surveys have sufficient data points
   - Ratio factor is valid (1-100)
4. **Response Format** - Return complete comparison data including:
   - Delta arrays
   - Statistical summary
   - Survey metadata
   - Ratio factor used
5. **Query Optimization** - Use select_related to avoid N+1 queries
6. **Pagination** - Paginate comparison lists
7. **Permissions** - Ensure users can only access their own comparisons
8. **API Documentation** - OpenAPI/Swagger docs for comparison endpoints
9. **Unit Tests** - Test API CRUD operations, validation, permissions (>80% coverage)

**Story Points:** 13

---

### Story 5.4: Comparison Visualization (2D & 3D)
**As a** survey engineer
**I want** to visualize survey comparisons in 2D and 3D with delta overlays
**so that** I can visually identify where and how much the surveys deviate

**Acceptance Criteria:**
1. **3D Comparison Plot** - Display both surveys in 3D:
   - Reference survey (blue line)
   - Comparison survey (red line)
   - Delta vectors (arrows showing deviation)
   - Color-coded deviation magnitude (gradient)
2. **2D Comparison Plots** - Support multiple views:
   - **Vertical Section:** TVD vs. Horizontal with both trajectories
   - **Plan View:** North vs. East with both trajectories
   - **Delta vs. MD:** Plot delta magnitude vs. measured depth
   - **Inclination Comparison:** Inc vs. MD for both surveys
   - **Azimuth Comparison:** Azi vs. MD for both surveys
3. **Delta Scaling** - Apply ratio factor to delta visualization
4. **Interactive Controls:**
   - Toggle reference/comparison visibility
   - Adjust ratio factor dynamically
   - Zoom to areas of maximum deviation
5. **Deviation Heatmap** - Color-code survey points by deviation magnitude
6. **Legend** - Clear legend identifying reference vs. comparison
7. **Deviation Annotations** - Label maximum deviation points
8. **Plot Export** - Export comparison plots as PNG
9. **Performance** - Render comparison plots in < 5 seconds
10. **Responsive Design** - Adapt to different screen sizes
11. **Loading States** - Show loading indicators during data fetch
12. **Error Handling** - Handle missing data gracefully
13. **Unit Tests** - Test plot components, data transformation, interactions

**Story Points:** 21

---

### Story 5.5: Comparison Results Export
**As a** survey engineer
**I want** to download comparison results in Excel/CSV format
**so that** I can analyze deltas offline and share with team members

**Acceptance Criteria:**
1. **Excel Export Service** - Extend export service for comparison data
2. **Comparison Export Endpoint** - REST endpoint to download comparison results
3. **Excel Structure** - Multi-sheet workbook:
   - **Summary Sheet:**
     - Run information
     - Reference survey metadata
     - Comparison survey metadata
     - Ratio factor
     - Statistical summary (max, avg, std deviation)
   - **Position Deltas Sheet:**
     - Columns: MD, ΔX, ΔY, ΔZ, ΔHorizontal, ΔTotal
   - **Angular Deltas Sheet:**
     - Columns: MD, ΔInc, ΔAzi
   - **Reference Data Sheet:**
     - Full reference survey data (MD, Inc, Azi, X, Y, TVD)
   - **Comparison Data Sheet:**
     - Full comparison survey data (MD, Inc, Azi, X, Y, TVD)
4. **CSV Export** - Support CSV format (all data in single file)
5. **Conditional Formatting** - Highlight maximum deviation cells in Excel
6. **Charts in Excel** - Embed delta charts in Excel workbook
7. **File Naming** - Use format: `{run_name}_comparison_{ref_name}_vs_{comp_name}_{timestamp}.xlsx`
8. **Download Button** - Add download button to comparison results page
9. **Format Selection** - Let user choose Excel or CSV format
10. **File Size Optimization** - Compress large comparison datasets
11. **Error Handling** - Handle export errors with user feedback
12. **Unit Tests** - Test Excel generation, formatting, download flow (>80% coverage)

**Story Points:** 13

---

### Story 5.6: Comparison Frontend Workflow
**As a** survey engineer
**I want** a streamlined frontend experience for comparing surveys
**so that** I can quickly set up comparisons and view results

**Acceptance Criteria:**
1. **Comparison Page** - Create dedicated comparison page/modal
2. **Survey Selection UI:**
   - Dropdown for primary survey (current run's surveys)
   - Dropdown for reference survey:
     - List previously uploaded reference surveys
     - Option: "Upload New Reference Survey"
3. **Reference Upload Modal** - Modal for uploading new reference survey
4. **Automatic Processing Indicator** - Show when reference is being calculated/interpolated
5. **Ratio Factor Control** - Input field or slider for ratio factor (1-100, default=10)
6. **Compare Button** - Trigger comparison calculation
7. **Comparison Status** - Show status: preparing → calculating deltas → complete
8. **Results Display:**
   - Statistical summary cards (max, avg deviation)
   - 3D comparison plot
   - 2D comparison plots (tabbed or side-by-side)
   - Delta vs. MD chart
9. **Survey Switcher** - Allow swapping reference and comparison roles
10. **Previous Comparisons List** - Show history of comparisons for current run
11. **Comparison Actions:**
    - Download results (Excel/CSV)
    - Delete comparison
    - Duplicate comparison (with different ratio factor)
12. **Error Display** - Clear error messages for failed comparisons
13. **Loading States** - Loading indicators throughout workflow
14. **Responsive Design** - Mobile-friendly comparison interface
15. **Unit Tests** - Test comparison flow, UI interactions, error handling (>80% coverage)
16. **Integration Tests** - Test complete comparison workflow end-to-end

**Story Points:** 21

---

## Epic Dependencies
- **Depends on:**
  - Epic 4 (File Upload & Survey Calculations) - REQUIRED ✅
    - SurveyData model with calculation results
    - File upload infrastructure
    - Welleng calculation service
    - Interpolation service
- **Blocks:**
  - Epic 6 (Adjustment & Extrapolation Features)
  - Epic 7 (Report Generation) - Comparison reports

## Technical Notes

### Backend Architecture
- **Delta Calculation Strategy:**
  - Align surveys by measured depth (MD)
  - Interpolate to common MD stations if needed
  - Calculate deltas at each aligned station
  - Store deltas as JSON arrays for efficiency
- **Ratio Factor:** Scaling factor for visualization (delta × ratio_factor)
- **Sign Convention:** Comparison - Reference (positive = comparison survey deviates in positive direction)
- **Welleng Integration:** Use welleng's survey comparison utilities where available

### Database Schema
```
Run (1) ---- (0..*) SurveyData
SurveyData.survey_role: 'primary' | 'reference' | 'comparison'

ComparisonResult:
  - run_id (FK)
  - primary_survey_id (FK to SurveyData)
  - reference_survey_id (FK to SurveyData)
  - ratio_factor
  - delta arrays (JSON)
  - statistics (JSON)
```

### Frontend Architecture
- **State Management:** React Query for comparison data caching
- **Visualization:** Extend Plotly.js components for dual-survey rendering
- **File Upload:** Reuse file upload component from Epic 4
- **Reference Dropdown:** Custom dropdown with "Upload New" option
- **Real-time Updates:** Poll for reference survey calculation status

### Delta Calculation Formulas
```
ΔX = X_comparison - X_reference
ΔY = Y_comparison - Y_reference
ΔZ = TVD_comparison - TVD_reference
ΔHorizontal = √(ΔX² + ΔY²)
ΔTotal = √(ΔX² + ΔY² + ΔZ²)
ΔInc = Inc_comparison - Inc_reference
ΔAzi = Azi_comparison - Azi_reference (handle 0/360 wraparound)
```

### MD Alignment Strategy
1. Find common MD range (max of minimums, min of maximums)
2. Create uniform MD stations within common range
3. Interpolate both surveys to these common stations
4. Calculate deltas at each station

### Ratio Factor Usage
- **Purpose:** Scale delta visualization for better visibility
- **Default:** 10 (deltas shown 10× actual magnitude)
- **Range:** 1-100
- **Application:** Only affects visualization, not stored deltas
- **Example:** If actual ΔX = 0.5m and ratio = 10, display ΔX = 5m in plot

### Performance Optimization
- **Caching:** Cache comparison results to avoid recalculation
- **Lazy Loading:** Load plots progressively (3D first, then 2D)
- **Downsampling:** Downsample delta arrays for initial visualization if >10,000 points
- **Background Calculation:** Consider async comparison for large datasets
- **Database Indexing:** Index on run_id, primary_survey_id, reference_survey_id

### Testing Strategy
- **Model Tests:** ComparisonResult validation, relationships
- **Service Tests:** Delta calculation logic, MD alignment, statistics
- **API Tests:** Comparison CRUD operations, validation, permissions
- **Frontend Tests:** Survey selection, comparison display, error handling
- **Integration Tests:** End-to-end comparison workflow
- **Performance Tests:** Verify < 5 second comparison time

### Error Handling
- **Mismatched Surveys:** Clear error if surveys have insufficient overlap
- **Calculation Failures:** Handle reference survey calculation errors
- **Missing Data:** Graceful handling of incomplete survey data
- **Ratio Factor Validation:** Ensure ratio factor is within valid range
- **Concurrent Comparisons:** Handle multiple simultaneous comparison requests

### Security Considerations
- **Access Control:** Users can only compare surveys they own
- **Reference Survey Isolation:** Reference surveys associated with specific runs
- **File Upload Security:** Apply same validation as primary surveys
- **Rate Limiting:** Prevent abuse of comparison endpoint

## Estimated Duration
**7 weeks** (102 story points total)

## Definition of Done
- [ ] All 6 stories completed and marked as "Done"
- [ ] All acceptance criteria met for each story
- [ ] Reference survey upload and management working
- [ ] Delta calculation accurate for all delta types
- [ ] Comparison visualization rendering correctly in 2D and 3D
- [ ] Ratio factor scaling working as expected
- [ ] Excel/CSV export includes all comparison data
- [ ] Previously uploaded references can be reused
- [ ] New reference surveys automatically calculated and interpolated
- [ ] All tests passing with >80% coverage
- [ ] API documentation complete (Swagger/OpenAPI)
- [ ] Frontend comparison workflow tested end-to-end
- [ ] Performance benchmarks validated (< 5 seconds)
- [ ] Security validated (access control, permissions)
- [ ] Demo completed showing:
  - Upload and select reference survey
  - Calculate comparison with different ratio factors
  - View 3D comparison plot with delta vectors
  - View 2D delta plots
  - Download comparison results in Excel
  - Reuse previously uploaded reference survey
  - Handle mismatched surveys gracefully
  - Performance with large datasets (>5,000 points)

---

## Story Creation Summary

All 6 stories for Epic 5 have been created and saved in `docs/stories/`:

| Story | Title | Story Points | Status | File |
|-------|-------|--------------|--------|------|
| 5.1 | Reference Survey Data Model & Upload | 13 | Ready for Development | `5.1.reference-survey-upload.story.md` |
| 5.2 | Delta Calculation Engine | 21 | Ready for Development | `5.2.delta-calculation-engine.story.md` |
| 5.3 | Comparison Data Model & API | 13 | Ready for Development | `5.3.comparison-data-model-api.story.md` |
| 5.4 | Comparison Visualization (2D & 3D) | 21 | Ready for Development | `5.4.comparison-visualization.story.md` |
| 5.5 | Comparison Results Export | 13 | Ready for Development | `5.5.comparison-results-export.story.md` |
| 5.6 | Comparison Frontend Workflow | 21 | Ready for Development | `5.6.comparison-frontend-workflow.story.md` |

**Total Story Points:** 102

Each story includes:
- Complete acceptance criteria
- Detailed task breakdowns
- Code examples and implementation guidance
- Database schemas and API specifications
- React component structures
- Testing requirements

**Recommended Development Order:**
1. Story 5.1 → Story 5.2 → Story 5.3 (Backend foundation)
2. Story 5.4 → Story 5.5 (Visualization layer)
3. Story 5.6 (Frontend integration - depends on all previous stories)

---

**Epic Owner:** Product Manager
**Created:** 2025-01-14
**Status:** Stories Created - Ready for Development
**Depends on:** Epic 4 (Complete)
**Stories Created:** 2025-10-15
