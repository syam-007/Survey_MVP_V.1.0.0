# Welleng Library Integration Research Checklist

## Purpose
This checklist guides the comprehensive research of the welleng library to ensure it meets all Survey Management System requirements before development begins.

**Assigned To:** Lead Developer + Architect
**Estimated Time:** 3-5 days
**Priority:** CRITICAL - BLOCKER for Epic 4+

---

## Phase 1: Discovery & Installation (Day 1)

### 1.1 Package Identification
- [ ] Search PyPI for welleng package: https://pypi.org/search/?q=welleng
- [ ] Confirm official package name and maintainer
- [ ] Check package popularity (downloads, stars, forks)
- [ ] Review package documentation URL
- [ ] Check latest version and release history
- [ ] Review changelog for breaking changes

**Document:**
```
Package Name: _____________________
Latest Version: _____________________
Documentation: _____________________
GitHub Repository: _____________________
Last Updated: _____________________
Maintenance Status: [ ] Active [ ] Stale [ ] Abandoned
```

### 1.2 Installation Testing
- [ ] Create clean Python 3.11 virtual environment
- [ ] Attempt installation: `pip install welleng`
- [ ] Document any dependency conflicts
- [ ] Verify installation: `python -c "import welleng; print(welleng.__version__)"`
- [ ] Test on Windows (development environment)
- [ ] Test on Linux (production environment)
- [ ] Document installation steps in architecture docs

**Document:**
```bash
# Installation steps
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install welleng==<version>

# Verification
python -c "import welleng; print(welleng.__version__)"

# Known Issues:
- Issue 1: _____________________
- Issue 2: _____________________
```

### 1.3 Dependencies Analysis
- [ ] Review welleng dependencies: `pip show welleng`
- [ ] Check for conflicts with project dependencies (Django, numpy, etc.)
- [ ] Document all transitive dependencies
- [ ] Check for security vulnerabilities: `pip-audit`
- [ ] Verify licenses are compatible

---

## Phase 2: API Exploration (Day 1-2)

### 2.1 Core API Discovery
- [ ] Review official API documentation
- [ ] List all available modules and classes
- [ ] Identify calculation methods
- [ ] Identify interpolation methods
- [ ] Identify comparison methods (if any)
- [ ] Identify adjustment/modification methods
- [ ] Identify extrapolation methods
- [ ] Identify QC/quality check methods

**Document:**
```python
# Core API Structure
from welleng import <module_name>

# Available Classes:
# - Class1: Purpose
# - Class2: Purpose

# Key Methods for Each PRD Requirement:
# Survey Calculation (Phase 4): welleng.???
# Interpolation (Phase 4): welleng.???
# Comparison (Phase 5): welleng.??? or custom implementation needed
# Adjustment (Phase 6): welleng.???
# Extrapolation (Phase 7): welleng.???
# QC for GTL (Phase 8): welleng.???
```

### 2.2 Data Format Requirements
- [ ] Determine input data format (DataFrame, numpy array, dict, custom class?)
- [ ] Document required column names for each survey type
- [ ] Document data types for each column (float64, int, etc.)
- [ ] Document unit expectations (meters/feet, degrees/radians)
- [ ] Document coordinate system requirements
- [ ] Check if data preprocessing is required

**Document:**
```python
# Example Input Format
# Survey Type 1 (GTL)
input_data = {
    'MD': [0.0, 10.0, 20.0],  # Measured Depth in meters/feet?
    'Inc': [0.0, 1.5, 3.0],    # Inclination in degrees/radians?
    'Azi': [0.0, 90.0, 180.0], # Azimuth in degrees/radians?
    'wt': [...],               # What does this represent?
    'gt': [...],               # What does this represent?
}

# Survey Type 2-4 (Gyro, MWD, Unknown)
# Same as above but without wt, gt
```

### 2.3 Output Format Analysis
- [ ] Document output data format
- [ ] Identify all calculated fields
- [ ] Map output to PRD requirements (Easting, Northing, TVD, etc.)
- [ ] Document output units
- [ ] Check if post-processing is required

---

## Phase 3: Feature Mapping (Day 2-3)

### 3.1 Survey Calculation (PRD Section 5.6)
**Requirement:** Calculate survey using MD, Inc, Azi (+ wt, gt for GTL)

- [ ] Identify welleng method for survey calculation
- [ ] Document method signature and parameters
- [ ] Test with sample data for all 4 survey types
- [ ] Verify calculation includes: Easting, Northing, TVD, Latitude, Longitude
- [ ] Test BHC (Bottom Hole Closure) calculation workflow
- [ ] Document performance for 100, 1K, 10K, 50K data points

**Code Example:**
```python
# TO BE COMPLETED DURING RESEARCH
import welleng

def calculate_survey(survey_data, survey_type, run_info):
    """
    Calculate survey using welleng library.

    Args:
        survey_data: Input survey data with MD, Inc, Azi
        survey_type: Type 1-4 (GTL, Gyro, MWD, Unknown)
        run_info: Run context (location, depth, tie-on)

    Returns:
        Calculated survey with Easting, Northing, TVD, etc.
    """
    # Implementation details TBD
    pass
```

**Performance Test Results:**
```
100 points: ___ seconds
1,000 points: ___ seconds
10,000 points: ___ seconds (Target: < 3 seconds)
50,000 points: ___ seconds
```

### 3.2 Interpolation (PRD Section 4.1, 5.6)
**Requirement:** Interpolate survey with resolution = 10 (user-configurable)

- [ ] Identify welleng interpolation method
- [ ] Document resolution parameter usage
- [ ] Test with various resolution values (5, 10, 20, 50)
- [ ] Verify interpolation preserves survey integrity
- [ ] Document performance characteristics

**Code Example:**
```python
def interpolate_survey(calculated_survey, resolution=10):
    """
    Interpolate calculated survey data.

    Args:
        calculated_survey: Output from calculate_survey()
        resolution: Interpolation resolution (default: 10)

    Returns:
        Interpolated survey data
    """
    # Implementation details TBD
    pass
```

### 3.3 Comparison (PRD Section 5.7)
**Requirement:** Compare two surveys, calculate delta, apply ratio factor

- [ ] Check if welleng provides comparison methods
- [ ] If yes: Document comparison API
- [ ] If no: Design custom comparison logic
- [ ] Document delta calculation approach
- [ ] Test ratio factor application
- [ ] Verify output includes deltas for all calculated fields

**Decision Point:**
```
Does welleng have built-in comparison?
[ ] YES - Use welleng.??? method
[ ] NO - Implement custom comparison:
    - Calculate survey1 and survey2 independently
    - Compute deltas: delta = survey1 - survey2
    - Apply ratio factor to deltas
```

### 3.4 Adjustment (PRD Section 5.8)
**Requirement:** Apply offsets (X, Y, Z) to survey within depth range

- [ ] Check if welleng provides adjustment methods
- [ ] Document offset application approach
- [ ] Test offset parameters (Easting, Northing, TVD)
- [ ] Test depth range filtering
- [ ] Verify undo/redo state management requirements

**Decision Point:**
```
Does welleng support survey adjustment?
[ ] YES - Use welleng.??? method
[ ] NO - Implement custom adjustment:
    - Filter survey by depth range
    - Apply offsets to Easting, Northing, TVD
    - Recalculate dependent values if needed
```

### 3.5 Recalculation from Adjusted Path (PRD Section 4.3)
**Requirement:** Recalculate MD/INC/AZI from adjusted path

- [ ] Identify welleng method for inverse calculation
- [ ] Document reverse calculation API
- [ ] Test with adjusted survey data
- [ ] Verify accuracy of recalculated MD/INC/AZI

### 3.6 Extrapolation (PRD Section 5.9)
**Requirement:** Extrapolate survey using Constant, Linear Trend, or Curve Fit

- [ ] Identify welleng extrapolation methods
- [ ] Document all available extrapolation methods
- [ ] Map to PRD requirements (Constant, Linear Trend, Curve Fit)
- [ ] Test with extrapolation length, step, interpolation step parameters
- [ ] Verify extrapolation accuracy

**Code Example:**
```python
def extrapolate_survey(survey, method, length, step, interp_step):
    """
    Extrapolate survey data.

    Args:
        survey: Calculated survey data
        method: 'constant', 'linear', or 'curve_fit'
        length: Extrapolation length
        step: Extrapolation step
        interp_step: Interpolation step

    Returns:
        Extrapolated survey
    """
    # Implementation details TBD
    pass
```

### 3.7 Quality Check (PRD Section 5.10)
**Requirement:** QC for GTL (Type 1) surveys, generate error models

- [ ] Identify welleng QC methods for GTL
- [ ] Document QC calculation process
- [ ] Document error model generation
- [ ] Test with GTL survey data
- [ ] Verify error model output format

---

## Phase 4: Integration Design (Day 3-4)

### 4.1 Abstraction Layer Design
**Goal:** Create a clean interface that isolates welleng from application code

- [ ] Design service layer interface
- [ ] Define exception hierarchy for welleng errors
- [ ] Define data transformation layer (app ↔ welleng formats)
- [ ] Define validation layer (pre-welleng data checks)
- [ ] Document error handling strategy

**Architecture:**
```python
# apps/api/survey_api/services/welleng_service.py

class WellengService:
    """
    Abstraction layer for welleng library operations.
    Isolates application code from welleng implementation details.
    """

    def calculate_survey(self, survey_data, run_context):
        """Calculate survey with welleng."""
        try:
            # 1. Validate input data
            # 2. Transform to welleng format
            # 3. Call welleng API
            # 4. Transform output to app format
            # 5. Return standardized result
            pass
        except WellengException as e:
            # Handle welleng-specific errors
            raise SurveyCalculationError(f"Calculation failed: {e}")

    def interpolate_survey(self, survey, resolution):
        """Interpolate survey with welleng."""
        pass

    # ... other methods
```

### 4.2 Error Handling Strategy
- [ ] Document all welleng exception types
- [ ] Map welleng errors to user-friendly messages
- [ ] Define retry logic for transient errors
- [ ] Define rollback strategy for failed operations
- [ ] Create error logging strategy

**Error Mapping:**
```python
# Welleng Error -> User-Facing Message
WellengInputError -> "Survey data format is invalid. Please check your file."
WellengCalculationError -> "Survey calculation failed. Please verify your input data."
WellengPerformanceError -> "Calculation is taking longer than expected. Please try with a smaller dataset."
```

### 4.3 Data Transformation Layer
- [ ] Design app data model (Django models)
- [ ] Design welleng data format
- [ ] Create transformation functions (app → welleng)
- [ ] Create transformation functions (welleng → app)
- [ ] Handle unit conversions if needed
- [ ] Handle coordinate system transformations if needed

**Transformation Functions:**
```python
def app_to_welleng(survey_file_data, run_context):
    """Transform app data format to welleng input format."""
    pass

def welleng_to_app(welleng_result, survey_file_id):
    """Transform welleng output to app data format."""
    pass
```

---

## Phase 5: Testing Strategy (Day 4-5)

### 5.1 Test Data Creation
- [ ] Find or create reference survey datasets for each type
- [ ] Calculate expected results manually or with reference tool
- [ ] Create test fixtures with known inputs and outputs
- [ ] Create edge case test data (empty, single point, large dataset)
- [ ] Create invalid data for error handling tests

**Test Fixtures:**
```python
# tests/fixtures/survey_data.py

SURVEY_GTL_SIMPLE = {
    'input': {
        'MD': [0, 100, 200, 300],
        'Inc': [0, 2, 5, 10],
        'Azi': [0, 45, 90, 135],
        'wt': [...],
        'gt': [...],
    },
    'expected_output': {
        'Easting': [0, 1.23, 5.67, ...],
        'Northing': [0, 0.87, 4.21, ...],
        'TVD': [0, 99.95, 199.50, ...],
    }
}
```

### 5.2 Unit Tests Design
- [ ] Test each welleng service method independently
- [ ] Test with valid inputs (happy path)
- [ ] Test with invalid inputs (error cases)
- [ ] Test with edge cases (empty, single point, maximum size)
- [ ] Test performance with large datasets
- [ ] Mock welleng for fast unit tests

**Test Structure:**
```python
# tests/test_welleng_service.py

class TestWellengService:
    def test_calculate_survey_gtl_valid(self):
        """Test GTL survey calculation with valid data."""
        pass

    def test_calculate_survey_performance(self):
        """Test calculation performance meets < 3 second target."""
        pass

    def test_calculate_survey_invalid_data(self):
        """Test error handling for invalid input data."""
        pass
```

### 5.3 Integration Tests Design
- [ ] Test end-to-end workflow: upload → calculate → visualize
- [ ] Test comparison workflow
- [ ] Test adjustment workflow
- [ ] Test extrapolation workflow
- [ ] Test QC workflow

---

## Phase 6: Documentation (Day 5)

### 6.1 Create Welleng Integration Guide
- [ ] Create `docs/architecture/welleng-integration.md`
- [ ] Document installation process
- [ ] Document API usage for each feature
- [ ] Include code examples
- [ ] Document error handling
- [ ] Document performance characteristics
- [ ] Document limitations and gotchas

### 6.2 Update Architecture Documents
- [ ] Update tech stack document with welleng version
- [ ] Update API specification with calculation endpoints
- [ ] Update database schema if welleng requires additional fields
- [ ] Update testing strategy with welleng-specific tests

### 6.3 Update Instructions Document
- [ ] Add welleng installation to Phase 1
- [ ] Add detailed welleng usage to Phase 4-8
- [ ] Add welleng testing strategy
- [ ] Add welleng troubleshooting guide

---

## Deliverables Checklist

- [ ] **Welleng Integration Guide** (`docs/architecture/welleng-integration.md`)
  - Installation instructions
  - API documentation with examples
  - Error handling guide
  - Performance characteristics
  - Testing strategy

- [ ] **Service Layer Code** (`apps/api/survey_api/services/welleng_service.py`)
  - Abstraction layer implementation
  - Data transformation functions
  - Error handling

- [ ] **Test Fixtures** (`tests/fixtures/survey_data.py`)
  - Reference datasets for all survey types
  - Known good calculation results

- [ ] **Unit Tests** (`tests/test_welleng_service.py`)
  - Test coverage for all welleng operations
  - Performance tests

- [ ] **Updated Architecture Docs**
  - Tech stack updated
  - Database schema updated (if needed)
  - Testing strategy updated

---

## Success Criteria

- [ ] ✅ Welleng successfully installed and verified on Windows and Linux
- [ ] ✅ All PRD calculation requirements mapped to welleng APIs
- [ ] ✅ Abstraction layer designed and documented
- [ ] ✅ Test fixtures created with known good results
- [ ] ✅ Performance testing confirms < 3 second target is achievable
- [ ] ✅ Error handling strategy defined and documented
- [ ] ✅ Integration guide complete and reviewed
- [ ] ✅ Team confident in welleng capabilities and limitations

---

## Risk Mitigation

**If Welleng Cannot Meet Requirements:**

1. **Partial Capability**
   - Use welleng for what it does well
   - Implement missing features in custom code
   - Document custom implementations

2. **Performance Issues**
   - Optimize data transformation
   - Use caching aggressively
   - Consider async processing for large datasets
   - Revise performance targets if necessary

3. **Complete Incompatibility**
   - Evaluate alternative libraries
   - Consider implementing core calculations from scratch
   - Escalate to stakeholders immediately

---

**Notes:**
- This research is CRITICAL PATH - blocks Epics 4-8
- Daily standup updates required during research phase
- Escalate blockers immediately
- Document everything - this will be referenced throughout development
