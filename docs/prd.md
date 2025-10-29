
# Product Requirements Document (PRD) Survey Management System (Web Application)

## Purpose

The purpose of the Survey Management System is to provide a web-based platform for managing well survey data. The system will allow users to create runs, manage survey information, perform calculations, make comparisons, adjust trajectories, extrapolate results, and generate comprehensive reports.

## Scope

The application will be used by engineers and surveyors:

* Create and manage well-run.
* Input and validate survey-related data.
* Perform advanced survey calculations and analysis (using the welleng library).
* Visualize survey results in both 2D and 3D.
* Generate downloadable reports in standardized formats (Excel, CSV, PDF, where applicable).

## Users

* Primary Users: Survey Engineers
* Secondary Users: Data Analysts, QHSE Manager, Measurement Coordinator, Measurement Manager.

## Workflow Overview

1. Create a Run -- Define run details and optionally link it to a well.
2. Add Location & Depth Information -- Provide well coordinates and elevation data.
3. Enter Survey Info -- Select survey type and Tie-on information.
4. Upload survey -- upload Excel file for survey calculation
5. Perform Functionalities:

### 4.1 Survey Calculation & Interpolation

* Automatically triggered after file upload (default interpolation resolution = 10).
* Results: Survey data is available immediately, and interpolation is provided with a default resolution of 10, including graphs and data
* The calculated result can be downloaded in an Excel format.

### 4.2 Comparison

* User uploads a reference survey for comparison.
* The system applies the current run info to calculate and interpolate (resolution = 10) the reference survey.
* Comparison is executed → delta calculated → results downloadable (Excel) with 2D & 3D graphs.
* If the user wants to compare with another reference survey, the upload dropdown will show:
  * The previously uploaded reference surveys.
  * An option to upload a new reference survey.
* When the user uploads a new reference survey, the system will automatically calculate the survey and interpolate it with a resolution of 10. This calculation is performed using the current run information.

### 4.3 Adjustment & Recalculation

When the user navigates to the Adjust Survey functionality:

* The Upload File option will display all surveys previously uploaded as reference surveys.
* The user can:
  * Select any of these previously uploaded surveys → the system will reuse the already calculated & interpolated data (no need to recalculate).
  * Or upload a new survey file → the system will perform survey calculation and interpolation (resolution = 10) using the current run info

For whichever survey is selected:

1. The user can apply adjustments (offsets for Easting (X), Northing (Y), TVD (Z), and depth range).
2. The system updates the survey data and graphs (2D & 3D).
3. Adjusted data becomes downloadable in Excel format.

Additional options:

* Undo Last Change, Redo, and Reset to Original.
* Recalculation: After adjustment, the user can recalculate MD/INC/AZI from the adjusted path.
* The recalculated dataset is downloadable in Excel and can be compared against a reference survey

### 4.4 Extrapolation

File-based or current file workflow with interpolation.

### 4.5 Quality Check (QC)

Only for GTL (Type 1) surveys.

### 4.6 Generate Reports

Automatically produce the corresponding report for each action.

## Functional Requirements

### 5.1 Run Creation

The user can create a run by entering:

* Run number
* Run name (must be unique)
* Run type (dropdown)
* Vertical section information
* Includes a checkbox for BHC (Bottom Hole Closure):
  * If the checkbox is not selected, the proposal direction must be entered manually by the user.
  * If the checkbox is selected, the proposal direction is set to 0 initially. Once the survey is calculated, the system will compute the closure distance. That closure distance will then be added as the proposal direction, and the survey will be recalculated automatically.
* Grid correction (calculated or set to 0)
* Location information
* Depth information

A toggle option allows linking the run to a well:

* If selected, a well can be chosen from the list.
* If the well has existing location and depth data, it will auto-populate.
* If not, the user can add data directly from the run to the well.
* Users may also create runs without linking to a well.

### 5.2 Location Information

User must provide:

* Latitude and Longitude (the system calculates Easting and Northing).
* UTM coordinates: Northing and Easting.
* Geodetic system.
* Map zone.
* North reference (dropdown).
* Grid correction (calculated).
* Central meridian.

Backend calculations:

* g(t), max g(t), w(t), max w(t).

### 5.3 Depth Information

User must provide:

* Elevation reference (dropdown).
* Reference datum.
* Reference height.
* Reference elevation.

### 5.4 Survey Information

After completing run, location, and depth info, the Survey Info section appears. The user must select a survey type:

1. Type 1 (GTL) -- File must include: MD, Inc, Azi, w(t), g(t).
2. Type 2 (Gyro) -- File must include: MD, Inc, Azi.
3. Type 3 (MWD) -- File must include: MD, Inc, Azi.
4. Type 4 (Unknown) -- File must include: MD, Inc, Azi.

### 5.5 Tie-On Information

User must provide:

* Measured depth.
* Inclination.
* Azimuth.
* True Vertical Depth (TVD).
* Latitude (+N / -S).
* Departure (+E / -W).
* Well type.

Survey Details:

* Hole section (dropdown).
* If selected, → checkboxes for Casing and Drillpipe appear.
* Selecting one auto-displays survey run-in and minimum ID.
* The user must also select the survey tool type.
* Define survey interval (From → To).
* Survey interval length auto-calculated.

### 5.6 Functionalities

Available functionalities (via welleng library):

* Calculate the survey.
* Interpolation.
* Comparison.
* Duplicate survey.
* Adjust the survey.
* Project survey.
* Extrapolate.

File Validation:

* User uploads an Excel file according to the survey type.
* System validates file structure and required columns.
* After validation:
  * Perform calculations.
  * Generate 2D and 3D graphs.
  * Allow downloads in Excel or PDF.

### 5.7 Comparison

* User uploads Reference File and Comparison File.
* One file may be the original calculation file, or two new files may be uploaded.
* User decides which file is reference vs. comparison.
* The system calculates delta.
* Ratio factor: user-defined (default = 10).

#### Comparison Results Display

The comparison results are displayed in a comprehensive format with the following sections:

1. **Survey Information Cards**
   * Primary Survey card (blue background) showing file name, survey type, and row count
   * Reference Survey card (purple background) showing file name, survey type, and row count

2. **Comparison Result Data Table**
   * Displayed before the Statistical Summary section
   * Contains comprehensive data for all comparison points:
     * MD (Measured Depth)
     * Reference Inc/Azi (purple-tinted columns)
     * Primary Inc/Azi (blue-tinted columns)
     * Delta values (ΔX, ΔY, ΔZ, ΔHorizontal, ΔTotal, ΔInc, ΔAzi)
   * **Color Coding System:**
     * Position Deltas (ΔX, ΔY, ΔZ, ΔHorizontal, ΔTotal):
       * Green: < 0.1m (Good deviation)
       * Yellow: 0.1-0.3m (Medium deviation)
       * Red: > 0.3m (High deviation)
     * Angular Deltas (ΔInc, ΔAzi):
       * Green: < 0.5° (Good deviation)
       * Yellow: 0.5-1.5° (Medium deviation)
       * Red: > 1.5° (High deviation)
   * Sticky header and scrollable table (max height: 600px)
   * Color legend displayed below the table

3. **Statistical Summary**
   * Key metrics cards showing:
     * Total comparison points
     * Maximum total deviation (m)
     * Maximum horizontal deviation (m)
     * Average total deviation (m)
   * Position Deltas table (Max, Average, Std Deviation)
   * Angular Deltas table (Max, Average, Std Deviation)
   * Deviations at Key Depths (Start, 25%, 50%, 75%, End)

4. **Comparison Visualizations (Tabbed Interface)**
   * **Tab 1 - 3D Survey Comparison** (Default):
     * Interactive 3D plot showing reference and primary survey trajectories
     * Minimum height: 700px
   * **Tab 2 - Position Deltas vs MD**:
     * 2D plot showing ΔX, ΔY, ΔZ, ΔHorizontal, and ΔTotal vs Measured Depth
     * Minimum height: 600px
   * **Tab 3 - Angular Deltas vs MD**:
     * 2D plot showing ΔInclination and ΔAzimuth vs Measured Depth
     * Minimum height: 600px
   * All tabs are scrollable to accommodate content

* Outputs:
  * Interactive comparison results page with color-coded data
  * 2D and 3D graphs in tabbed interface
  * Results downloadable in Excel/CSV format

### 5.8 Adjustment

User options:

* Use current comparison files.
* Keep comparison file and upload new reference file.
* Upload two new files.

User must provide:

* Offsets → Adjust Easting (X), Northing (Y), TVD (Z).
* Depth range (From → To).

After clicking Adjust:

* Updated graph and adjusted data displayed.
* Downloadable in Excel/CSV.

Additional Options:

* Undo Last Change.
* Redo.
* Reset to Original.

Recalculation:

* User can recalculate MD/INC/AZI from adjusted path.
* Recalculated file downloadable in Excel/CSV.
* Adjusted survey can be compared with reference survey.

### 5.9 Extrapolation

* The user can use the current file or upload new file.
* Must provide:
  * Extrapolation length.
  * Extrapolation step.
  * Interpolation step.
* User selects extrapolation method (dropdown):
  * Constant.
  * Linear Trend.
  * Curve Fit.
* System generates updated 2D and 3D plots.
* Results downloadable in Excel/CSV.

### 5.10 Exception for Type 1 (GTL)

* If Survey Type 1 is selected, system allows Quality Check.

#### GTL Quality Check Process

1. **QA Upload and Calculation**
   * User uploads GTL survey file for quality analysis
   * System performs QA calculations using location and file data
   * QA Delta Formula: `Location Value - File Value` (not File - Location)
   * Results include delta calculations for W(t) and G(t) values

2. **QA Results Display**
   * Comprehensive QA data table showing:
     * MD (Measured Depth)
     * File W(t) and G(t) values (from uploaded file)
     * Location W(t) and G(t) values (from run location data)
     * Delta W(t) and Delta G(t) (Location - File)
   * Color-coded delta cells:
     * Green: Within acceptable tolerance
     * Yellow: Medium deviation (requires attention)
     * Red: High deviation (requires review)
   * Statistical summary of QA results

3. **QA Approval Workflow**
   * After QA calculation, survey status is set to 'calculated'
   * User can review QA results and either:
     * Approve the survey → status changes to 'completed'
     * Reject and request recalculation
   * Only surveys with 'completed' status can proceed to comparison

4. **Database Optimizations**
   * Location W(t) and G(t) values are rounded to 1 decimal place at database level
   * Ensures consistency between file values and location values
   * Improves QA calculation accuracy

* Outputs:
  * Calculated QA data in Excel format
  * Error model with graphs
  * QA approval status tracking
  * Color-coded QA data table for quick assessment

### 5.11 Reports

The system must generate a report for each functionality performed.

Report Types:

* Survey report.
* Comparison report.
* Comparison QC report.
* Survey GTL QC report.
* Adjusted/Duplicate survey report.
* Projected/Extrapolated survey report.

Requirement:

* Reports are generated automatically after each functionality.
* All reports are downloadable in Excel.
* Additional formats (CSV, PDF) are optional.

## Non-Functional Requirements

* Performance: Calculations should complete within a few seconds for typical datasets (<10,000 records).
* Scalability: Must handle large surveys with tens of thousands of data points.
* Usability: The application supports a structured workflow, but it is not strictly linear. Users can move between sections as needed, either following the recommended order or jumping directly to specific sections.
* Data Validation: Clear error messages if input files are invalid or missing columns.
* Portability: Should run in modern browsers (Chrome, Edge, Firefox).

## Technical Dependencies & Constraints

### Technical Specifications

* Backend: Django(python) with welleng library
* Frontend: React with 3D visualization (plotly.js or similar)
* Database: postgresql
* Deployment: AWS
* File Format Support: .xlsx,.csv,.pdf,.rep
* API testing: Postman
* Browser Support: Chrome, Firefox, Edge (last 2 versions)

### Security Requirements

#### Authentication & Authorization

* Users must authenticate using secure credentials (username/password, SSO, or corporate identity provider).
* Role-based access control (RBAC):
  * Admin -- full access, including managing wells, users, and system settings.
  * Engineer/Surveyor -- create runs, upload survey files, perform calculations.
  * Viewer/Analyst -- view results and download reports, no editing rights.

#### Data Protection

* All data in transit must use TLS 1.2+ (HTTPS) encryption.
* All data at rest (database, file storage) must be AES-256 encrypted.
* Uploaded files (Excel/CSV) must be scanned and validated before processing.

#### Session Management

* Automatic logout after a configurable inactivity period (eg: 30 minutes).
* Secure session tokens with expiration and refresh policies.

#### Backup & Recovery

* Automated daily backups of survey data and configurations.
* Disaster recovery plan ensuring data restoration within 24 hours.

### Performance Benchmarks

Performance (Enhanced):

- Survey Calculation other functionality: < 3 seconds for datasets up to 10,000 points
- 3D Visualization: Render initial plot in < 5 seconds
- File Upload/Processing: < 10 seconds for 10MB files

## Error Handling & Validation

### File Upload Validation

1. File Format: Clear error messages for unsupported file types with list of accepted formats (.xlsx, .csv, .pdf, .rep)
2. File Size: Validation for file size limits (max 50MB per file) with appropriate error messaging
3. Required Columns: Specific error messages indicating:
   * Missing required columns for each survey type
   * Column name mismatches with expected headers
   * Data type mismatches (e.g., text in numeric fields)
4. Data Integrity: Validation for:
   * Missing values in critical columns (MD, Inc, Azi)
   * Out-of-range values (e.g., inclination > 180 degrees, negative measured depth)
   * Non-sequential measured depth values
   * Invalid geographic coordinates

### Calculation & Processing Errors

User Input Validation Form

Validation: Real-time validation for all input fields with:

1. Visual indicators (green check/red X) for field validity
2. Contextual error messages below invalid fields
3. Required Fields: Clear indication of mandatory fields and prevention of submission until completed
4. Data Type Validation: Prevention of invalid characters in numeric fields, date validation, etc.

### System & Integration Errors

1. Database Errors: User-friendly messages for connection issues or data persistence failures
2. Authentication Errors: Clear messaging for login failures, expired sessions, and permission denials
3. Browser Compatibility: Feature detection with graceful degradation for unsupported browsers
4. Network Issues: Offline detection with appropriate messaging and recovery procedures
