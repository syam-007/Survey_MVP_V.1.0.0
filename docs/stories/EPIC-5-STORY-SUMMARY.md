# Epic 5: Comparison & Delta Analysis - Story Summary

**Status:** All Stories Created - Ready for Development
**Date Created:** 2025-10-15
**Total Story Points:** 102
**Estimated Duration:** 7 weeks

---

## Overview

Epic 5 implements survey comparison functionality that allows engineers to:
- Upload reference surveys for comparison
- Calculate position and angular deltas between surveys
- Visualize deviations in 2D and 3D
- Export comparison results to Excel/CSV
- Manage comparison workflows through the frontend

---

## Stories

### Story 5.1: Reference Survey Data Model & Upload
**File:** `5.1.reference-survey-upload.story.md`
**Story Points:** 13
**Status:** Ready for Development

**What it does:**
- Extends SurveyFile model to support reference surveys
- Adds `survey_role` field: 'primary', 'reference', 'comparison'
- Creates reference upload API endpoint
- Automatically triggers calculation and interpolation for reference surveys
- Supports multiple reference surveys per run
- Enables reuse of previously uploaded references

**Key Components:**
- Database migration for `survey_role` field
- Reference upload API endpoint
- `ReferenceUploadModal.tsx` component
- `ReferenceSelector.tsx` component

**Tasks:** 13 tasks covering database schema, API endpoints, automatic processing, frontend components

---

### Story 5.2: Delta Calculation Engine
**File:** `5.2.delta-calculation-engine.story.md`
**Story Points:** 21
**Status:** Ready for Development

**What it does:**
- Implements delta calculation service for comparing surveys
- Calculates position deltas: ΔX, ΔY, ΔZ, ΔHorizontal, ΔTotal
- Calculates angular deltas: ΔInclination, ΔAzimuth (with wraparound handling)
- Aligns surveys by measured depth using interpolation
- Computes statistical summaries (max, avg, std deviation)
- Applies ratio factor for visualization scaling

**Key Components:**
- `DeltaCalculationService` class
- MD alignment logic
- Azimuth wraparound formula: `((delta + 180) % 360) - 180`
- Statistical summary computation

**Tasks:** 11 tasks covering delta calculation service, alignment logic, statistical functions, performance optimization

**Delta Formulas:**
```
ΔX = X_comparison - X_reference
ΔY = Y_comparison - Y_reference
ΔZ = TVD_comparison - TVD_reference
ΔHorizontal = √(ΔX² + ΔY²)
ΔTotal = √(ΔX² + ΔY² + ΔZ²)
ΔInc = Inc_comparison - Inc_reference
ΔAzi = Azi_comparison - Azi_reference (with wraparound handling)
```

---

### Story 5.3: Comparison Data Model & API
**File:** `5.3.comparison-data-model-api.story.md`
**Story Points:** 13
**Status:** Ready for Development

**What it does:**
- Creates `ComparisonResult` model to persist comparison data
- Stores delta arrays as JSON for all delta types
- Implements CRUD API endpoints for comparisons
- Provides query optimization with select_related
- Enforces permissions and access control

**Key Components:**
- `ComparisonResult` model with UUID primary key
- API endpoints:
  - POST `/api/v1/comparisons/` - Create comparison
  - GET `/api/v1/comparisons/{id}/` - Retrieve comparison
  - GET `/api/v1/comparisons/?run={run_id}` - List comparisons
  - DELETE `/api/v1/comparisons/{id}/` - Delete comparison
- Serializers: `ComparisonResultSerializer`, `CreateComparisonSerializer`
- ViewSet: `ComparisonViewSet`

**Tasks:** 15 tasks covering model creation, migrations, API endpoints, serializers, validation, permissions

**Model Fields:**
- `id`, `run`, `primary_survey`, `reference_survey`, `ratio_factor`
- Delta arrays: `md_data`, `delta_x`, `delta_y`, `delta_z`, `delta_horizontal`, `delta_total`, `delta_inc`, `delta_azi`
- `statistics` (JSON), `created_at`, `created_by`

---

### Story 5.4: Comparison Visualization (2D & 3D)
**File:** `5.4.comparison-visualization.story.md`
**Story Points:** 21
**Status:** Ready for Development

**What it does:**
- Creates 3D comparison plot with both surveys and delta vectors
- Implements 2D plots: Vertical Section, Plan View, Delta vs MD, Inc/Azi comparison
- Applies ratio factor scaling to deltas
- Adds interactive controls for toggling visibility and adjusting ratio
- Color-codes points by deviation magnitude (heatmap)
- Supports plot export as PNG

**Key Components:**
- `ComparisonPlot3D.tsx` - 3D visualization with delta vectors
- `ComparisonPlotVertical.tsx` - TVD vs Horizontal
- `ComparisonPlotPlan.tsx` - North vs East
- `DeltaVsMDPlot.tsx` - Delta magnitude vs MD
- `InclinationComparisonPlot.tsx` - Inc vs MD
- `AzimuthComparisonPlot.tsx` - Azi vs MD
- `ComparisonControls.tsx` - Interactive controls

**Tasks:** 11 tasks covering 3D plot, 2D plots, interactive controls, heatmap, performance optimization

**Visualization Features:**
- Reference survey: Blue line
- Comparison survey: Red line
- Delta vectors: Arrows scaled by ratio factor
- Deviation heatmap: Green (low) → Yellow (medium) → Red (high)

---

### Story 5.5: Comparison Results Export
**File:** `5.5.comparison-results-export.story.md`
**Story Points:** 13
**Status:** Ready for Development

**What it does:**
- Extends Excel export service for comparison data
- Generates multi-sheet Excel workbook
- Supports CSV export as alternative format
- Applies conditional formatting to highlight max deviation
- Embeds delta charts in Excel
- Provides download button with format selection

**Key Components:**
- Excel export service: `export_comparison_results()` method
- Export endpoint: `/api/v1/comparisons/{id}/export/`
- Frontend: `ComparisonDownloadButton.tsx`

**Tasks:** 8 tasks covering Excel generation, CSV export, conditional formatting, charts, download UI

**Excel Sheets:**
1. **Summary** - Run info, survey metadata, statistics, embedded charts
2. **Position Deltas** - MD, ΔX, ΔY, ΔZ, ΔHorizontal, ΔTotal
3. **Angular Deltas** - MD, ΔInc, ΔAzi
4. **Reference Data** - Full reference survey data
5. **Comparison Data** - Full comparison survey data

**File Naming:** `{run_name}_comparison_{ref_name}_vs_{comp_name}_{timestamp}.xlsx`

---

### Story 5.6: Comparison Frontend Workflow
**File:** `5.6.comparison-frontend-workflow.story.md`
**Story Points:** 21
**Status:** Ready for Development

**What it does:**
- Creates dedicated comparison page with complete workflow
- Implements survey selection UI with reference upload option
- Provides comparison controls with ratio factor slider
- Displays comparison status during calculation
- Shows comparison results with statistical summary and plots
- Maintains comparison history for each run
- Supports comparison actions: download, delete, duplicate, swap

**Key Components:**
- `ComparisonPage.tsx` - Main comparison page
- `SurveySelector.tsx` - Survey selection dropdowns
- `ComparisonControls.tsx` - Ratio factor slider and Compare button
- `ComparisonStatus.tsx` - Status tracking component
- `ComparisonResults.tsx` - Results display with plots
- `ComparisonHistoryList.tsx` - Previous comparisons list

**React Query Hooks:**
- `useCreateComparison()` - useMutation for creating comparisons
- `useComparison(comparisonId)` - useQuery for fetching comparison
- `useComparisonHistory(runId)` - useQuery for listing comparisons

**Tasks:** 14 tasks covering page creation, survey selection, controls, status tracking, results display, history, actions, error handling, loading states, responsive design, state management, tests

**Route:** `/runs/:runId/compare`

---

## Development Order

### Phase 1: Backend Foundation (6 weeks)
1. **Week 1:** Story 5.1 - Reference Survey Data Model & Upload
2. **Week 2-3:** Story 5.2 - Delta Calculation Engine
3. **Week 4:** Story 5.3 - Comparison Data Model & API

### Phase 2: Visualization Layer (3 weeks)
4. **Week 5-6:** Story 5.4 - Comparison Visualization (2D & 3D)
5. **Week 7:** Story 5.5 - Comparison Results Export

### Phase 3: Frontend Integration (3 weeks)
6. **Week 8-10:** Story 5.6 - Comparison Frontend Workflow

**Note:** Phase 3 depends on completion of Phases 1 and 2

---

## Technical Stack

### Backend
- **Framework:** Django REST Framework
- **Database:** PostgreSQL with JSONField for delta arrays
- **Services:**
  - `DeltaCalculationService` - Delta calculation logic
  - `ExcelExportService` - Excel/CSV export
  - `InterpolationService` - MD alignment and interpolation
- **Libraries:**
  - `welleng` - Wellbore engineering calculations
  - `numpy` - Numerical computations
  - `openpyxl` - Excel file generation

### Frontend
- **Framework:** React 18 with TypeScript
- **UI Library:** Material-UI (MUI)
- **State Management:** React Query (@tanstack/react-query)
- **Visualization:** Plotly.js
- **Routing:** React Router v6

---

## Key Technical Concepts

### Ratio Factor
- **Purpose:** Scale delta visualization for better visibility
- **Default:** 10 (deltas shown 10× actual magnitude)
- **Range:** 1-100
- **Application:** Only affects visualization, not stored deltas
- **Example:** If actual ΔX = 0.5m and ratio = 10, display ΔX = 5m in plot

### MD Alignment Strategy
1. Find common MD range (max of minimums, min of maximums)
2. Create uniform MD stations within common range
3. Interpolate both surveys to these common stations
4. Calculate deltas at each station

### Azimuth Wraparound Handling
Azimuth values wrap around at 0°/360°, so direct subtraction can give incorrect results.

**Problem:**
- Reference azimuth: 350°
- Comparison azimuth: 10°
- Naive delta: 10° - 350° = -340° (incorrect)
- Actual delta: 20° (comparison is 20° clockwise from reference)

**Solution Formula:**
```
ΔAzi = ((Azi_comparison - Azi_reference + 180) % 360) - 180
```

This formula ensures the delta is in the range [-180°, 180°].

### Sign Convention
**Comparison - Reference**
- Positive delta: Comparison survey is greater/higher
- Negative delta: Comparison survey is less/lower

---

## Performance Requirements

- **Delta Calculation:** < 3 seconds
- **Comparison Visualization:** < 5 seconds
- **Plot Rendering:** < 5 seconds
- **Excel Export:** < 10 seconds

**Optimization Strategies:**
- Cache comparison results
- Lazy load plots (3D first, then 2D)
- Downsample large datasets (>10,000 points) for initial visualization
- Use WebGL rendering for 3D plots
- Database indexing on run_id, primary_survey_id, reference_survey_id

---

## Testing Requirements

Each story requires:
- **Unit Tests:** >80% code coverage
- **Integration Tests:** End-to-end workflow tests
- **Performance Tests:** Verify benchmarks are met

**Key Test Scenarios:**
- Reference survey upload and automatic processing
- Delta calculation accuracy with edge cases
- MD alignment with mismatched surveys
- Azimuth wraparound handling
- Comparison API CRUD operations
- Visualization rendering with various datasets
- Excel/CSV export file structure and formatting
- Frontend comparison workflow end-to-end

---

## Dependencies

**Requires (from Epic 4):**
- ✅ SurveyData model with calculation results
- ✅ File upload infrastructure
- ✅ Welleng calculation service
- ✅ Interpolation service
- ✅ Excel export service

**Blocks:**
- Epic 6: Adjustment & Extrapolation Features
- Epic 7: Report Generation (comparison reports)

---

## Success Metrics

- [ ] All 6 stories completed and marked as "Done"
- [ ] Reference survey upload working with automatic calculation
- [ ] Delta calculation accurate for all delta types
- [ ] Comparison visualization rendering correctly in 2D and 3D
- [ ] Ratio factor scaling working as expected
- [ ] Excel/CSV export includes all comparison data
- [ ] Previously uploaded references can be reused
- [ ] All tests passing with >80% coverage
- [ ] Performance benchmarks validated
- [ ] Demo completed successfully

---

## Quick Reference

### API Endpoints
- `POST /api/v1/survey-data/upload-reference/` - Upload reference survey
- `POST /api/v1/comparisons/` - Create comparison
- `GET /api/v1/comparisons/{id}/` - Get comparison
- `GET /api/v1/comparisons/?run={run_id}` - List comparisons
- `GET /api/v1/comparisons/{id}/export/?format=excel` - Export comparison
- `DELETE /api/v1/comparisons/{id}/` - Delete comparison

### Frontend Routes
- `/runs/:runId/compare` - Comparison page

### Key Models
- `SurveyFile` (extended with `survey_role` field)
- `ComparisonResult` (new)

### Key Services
- `DeltaCalculationService`
- `ExcelExportService.export_comparison_results()`

### Key Components
- `ComparisonPage.tsx` - Main page
- `ComparisonPlot3D.tsx` - 3D visualization
- `DeltaVsMDPlot.tsx` - Delta vs MD chart
- `ComparisonDownloadButton.tsx` - Export button

---

**Last Updated:** 2025-10-15
**Next Steps:** Begin implementation with Story 5.1
