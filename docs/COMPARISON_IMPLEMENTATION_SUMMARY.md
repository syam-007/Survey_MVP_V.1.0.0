# Survey Comparison Implementation Summary

This document summarizes the survey comparison functionality implementation matching the Streamlit logic.

## Overview

The survey comparison feature allows users to compare two surveys (reference and comparative) and visualize the differences in three ways:
1. **3D Wellbore Path** - Shows both surveys in 3D space
2. **Displacement vs MD** - Shows 3D displacement along measured depth
3. **Delta INC & AZI vs MD** - Shows inclination and azimuth differences

## Backend Implementation

### 1. Comparison Service (`survey_api/services/comparison_service.py`)

**Key Features:**
- Manual interpolation of surveys to common MD points
- Uses `welleng` library for survey calculations
- Calculates deltas: INC, AZI, North, East, TVD, and 3D displacement
- Returns structured comparison data with statistics

**Main Method:**
```python
SurveyComparisonService.compare_surveys(
    reference_data={'md': [...], 'inc': [...], 'azi': [...]},
    comparative_data={'md': [...], 'inc': [...], 'azi': [...]},
    step=10.0,  # Interpolation step
    start_xyz=[0, 0, 0]  # Starting coordinates
)
```

**Returns:**
- `comparison_points`: List of dicts with MD, positions (reference & comparative), and deltas
- `summary`: Overall statistics (max displacement, avg displacement, etc.)

### 2. Delta Calculation Service (`survey_api/services/delta_calculation_service.py`)

**Existing Service:**
Your existing `DeltaCalculationService` already handles the comparison logic and stores results in the `ComparisonResult` model.

**Key Features:**
- Fetches interpolated surveys from the database
- Performs welleng-based survey calculations
- Calculates position and angular deltas
- Stores comparison results with statistics

## Frontend Implementation

### 1. Visualization Components

#### a. **ComparisonPlot3D** (`components/comparison/ComparisonPlot3D.tsx`)

**Key Features:**
- Uses `react-plotly.js` for 3D visualization
- Shows reference survey (blue) and comparative survey (red)
- Displays delta vectors with color-coded magnitude
- **Important Fix Applied:**
  - `aspectmode: 'cube'` - Prevents axis scaling while rotating
  - `zaxis.autorange: 'reversed'` - Reverses Z-axis for TVD display

**Matches Streamlit:**
```python
# Streamlit equivalent
fig.update_layout(scene=dict(
    xaxis_title='East [m]',
    yaxis_title='North [m]',
    zaxis_title='TVD [m]',
    zaxis=dict(autorange="reversed"),
    aspectmode='cube'  # THIS FIXES THE AXES SCALE
))
```

#### b. **DeltaVsMDPlot** (`components/comparison/DeltaVsMDPlot.tsx`)

**Key Features:**
- 2D line plot of displacement vs measured depth
- Shows both horizontal and total deviation
- Marks maximum deviation points
- Unified hover mode for easy comparison

**Matches Streamlit:**
```python
# Streamlit equivalent
fig2.add_trace(go.Scatter(x=output['MD'], y=output['Displacement'],
                          mode='lines+markers', name='Displacement'))
fig2.update_layout(title="3D Displacement vs MD",
                   xaxis_title="MD [m]", yaxis_title="Displacement [m]")
```

#### c. **AngularComparisonPlot** (`components/comparison/AngularComparisonPlot.tsx`)

**Key Features:**
- Side-by-side plots for INC and AZI deltas
- Color-coded traces (purple for INC, teal for AZI)
- Shows maximum delta points with annotations
- Grid layout for easy comparison

**Matches Streamlit:**
```python
# Streamlit equivalent
fig3.add_trace(go.Scatter(x=output['MD'], y=output['Delta_INC'],
                          mode='lines', name='Delta INC'))
fig3.add_trace(go.Scatter(x=output['MD'], y=output['Delta_AZI'],
                          mode='lines', name='Delta AZI'))
fig3.update_layout(title="Delta INC & Delta AZI vs MD",
                   xaxis_title="MD [m]", yaxis_title="Degrees")
```

### 2. Comparison Detail Page (`pages/runs/ComparisonDetailPage.tsx`)

**Features:**
- Tabbed interface for switching between visualization modes
- Comparison information card with survey details
- Visualization controls (toggle reference/primary/deltas)
- Statistical summary with max deviations
- Export functionality (Excel/CSV)

## Data Flow

```
1. User selects two surveys to compare
   ↓
2. Frontend calls comparison API endpoint
   ↓
3. Backend fetches interpolated survey data from database
   ↓
4. DeltaCalculationService performs welleng calculations
   ↓
5. Comparison results stored in ComparisonResult model
   ↓
6. Frontend receives comparison data with:
   - md_data: Measured depth array
   - delta_x, delta_y, delta_z: Position deltas
   - delta_inc, delta_azi: Angular deltas
   - delta_total, delta_horizontal: Computed deviations
   - statistics: Summary statistics
   ↓
7. React components render visualizations using Plotly.js
```

## Key Algorithms

### 1. Manual Interpolation

```python
# Find common MD range
md_min = max(min(ref_md), min(cmp_md))
md_max = min(max(ref_md), max(cmp_md))

# Create common MD array with specified step
md_common = np.arange(md_min, md_max + step, step)

# Interpolate both surveys to common points
inc_ref = np.interp(md_common, ref_md, ref_inc)
azi_ref = np.interp(md_common, ref_md, ref_azi)
inc_cmp = np.interp(md_common, cmp_md, cmp_inc)
azi_cmp = np.interp(md_common, cmp_md, cmp_azi)
```

### 2. Delta Calculations

```python
# Angular deltas
delta_inc = survey_ref.inc_deg - survey_cmp.inc_deg
delta_azi = ((survey_ref.azi_grid_deg - survey_cmp.azi_grid_deg) + 180) % 360 - 180

# Position deltas
delta_north = survey_ref.n - survey_cmp.n
delta_east = survey_ref.e - survey_cmp.e
delta_tvd = survey_ref.tvd - survey_cmp.tvd

# 3D displacement
displacement = np.sqrt(delta_north**2 + delta_east**2 + delta_tvd**2)
```

## Database Schema

### ComparisonResult Model

```python
class ComparisonResult(models.Model):
    id = UUIDField(primary_key=True)
    run = ForeignKey('Run')
    primary_survey = ForeignKey('SurveyData')  # Comparative survey
    reference_survey = ForeignKey('SurveyData')  # Reference survey
    ratio_factor = IntegerField(default=10)

    # Data arrays (stored as JSON)
    md_data = JSONField()  # Measured depths
    delta_x = JSONField()  # East/West deltas
    delta_y = JSONField()  # North/South deltas
    delta_z = JSONField()  # Vertical deltas
    delta_inc = JSONField()  # Inclination deltas
    delta_azi = JSONField()  # Azimuth deltas
    delta_total = JSONField()  # Total 3D displacement
    delta_horizontal = JSONField()  # Horizontal displacement

    # Statistics
    statistics = JSONField()  # Summary statistics
```

## API Endpoints

### Existing Endpoints

1. **Create Comparison**
   ```
   POST /api/v1/comparisons/
   Body: {
     "run_id": "uuid",
     "primary_survey_id": "uuid",
     "reference_survey_id": "uuid",
     "ratio_factor": 10
   }
   ```

2. **Get Comparison Detail**
   ```
   GET /api/v1/comparisons/{comparison_id}/
   ```

3. **List Comparisons**
   ```
   GET /api/v1/comparisons/list/?run_id={uuid}
   ```

4. **Export Comparison**
   ```
   GET /api/v1/comparisons/{comparison_id}/export/?format=excel|csv
   ```

## Dependencies

### Backend
- `welleng`: Survey engineering calculations
- `numpy`: Numerical computations
- `Django REST Framework`: API framework

### Frontend
- `react-plotly.js`: Interactive plots
- `plotly.js`: Plotting library
- `@mui/material`: UI components
- `react-router-dom`: Navigation

## Configuration

### Plot Settings

**3D Plot:**
- Height: 700px
- Aspect Mode: `cube` (prevents axis scaling)
- Z-axis: Reversed (TVD convention)
- Camera: `eye: { x: 1.5, y: 1.5, z: 1.5 }`

**2D Plots:**
- Height: 400-500px
- Hover Mode: `x unified` (synchronizes hover across traces)
- Display Mode Bar: Enabled with download options

### Default Parameters

- **Interpolation Step**: 10m (adjustable)
- **Ratio Factor**: 10 (for delta vector visualization)
- **Start XYZ**: [0, 0, 0] (coordinate origin)

## Testing

### Backend Tests
```bash
cd apps/api
venv/Scripts/python.exe manage.py test tests.test_comparison
```

### Frontend Tests
```bash
cd apps/web
npm test -- ComparisonPlot3D
npm test -- DeltaVsMDPlot
npm test -- AngularComparisonPlot
```

## Usage Example

```typescript
// In React component
import { ComparisonPlot3D, DeltaVsMDPlot, AngularComparisonPlot } from '@/components/comparison';

// Fetch comparison data
const { data: comparison } = useComparison(comparisonId);

// Render visualizations
<ComparisonPlot3D
  comparison={comparison}
  showReference={true}
  showPrimary={true}
  showDeltas={true}
/>

<DeltaVsMDPlot comparison={comparison} />

<AngularComparisonPlot comparison={comparison} />
```

## Notes

1. **Location Creation Bug Fix Applied**: The decimal precision issue for latitude/longitude has been fixed by quantizing to 8 decimal places.

2. **AspectMode Fix**: The 3D plot now uses `aspectmode: 'cube'` to prevent axis scaling issues during rotation, matching the Streamlit implementation.

3. **Existing Implementation**: Your application already has comprehensive comparison functionality. The main updates were:
   - Fixed `aspectmode` to `'cube'` in 3D plot
   - Added reversed Z-axis for TVD display
   - Updated axis labels to match Streamlit convention

4. **Data Source**: The comparison uses interpolated survey data from `InterpolatedSurvey` model, which is calculated using `welleng` library.

## Future Enhancements

1. **Real-time Comparison**: Add ability to adjust interpolation step dynamically
2. **Multi-Survey Comparison**: Compare more than two surveys simultaneously
3. **Uncertainty Visualization**: Add confidence intervals to plots
4. **Animation**: Animate the path progression along MD
5. **Cross-sections**: Add 2D cross-section views at specific MD values

## References

- Welleng Documentation: https://github.com/jonnymaserati/welleng
- Plotly.js Documentation: https://plotly.com/javascript/
- Story 5.4: Comparison Visualization (2D & 3D)
- Epic 5: Comparison and Delta Analysis
