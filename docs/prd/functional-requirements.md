# Functional Requirements

## 5.1 Run Creation

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

## 5.2 Location Information

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

## 5.3 Depth Information

User must provide:

* Elevation reference (dropdown).
* Reference datum.
* Reference height.
* Reference elevation.

## 5.4 Survey Information

After completing run, location, and depth info, the Survey Info section appears. The user must select a survey type:

1. Type 1 (GTL) -- File must include: MD, Inc, Azi, w(t), g(t).
2. Type 2 (Gyro) -- File must include: MD, Inc, Azi.
3. Type 3 (MWD) -- File must include: MD, Inc, Azi.
4. Type 4 (Unknown) -- File must include: MD, Inc, Azi.

## 5.5 Tie-On Information

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

## 5.6 Functionalities

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

## 5.7 Comparison

* User uploads Reference File and Comparison File.
* One file may be the original calculation file, or two new files may be uploaded.
* User decides which file is reference vs. comparison.
* The system calculates delta.
* Ratio factor: user-defined (default = 10).
* Outputs:
  * 2D and 3D graphs.
  * Results downloadable in Excel/CSV.

## 5.8 Adjustment

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

## 5.9 Extrapolation

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

## 5.10 Exception for Type 1 (GTL)

* If Survey Type 1 is selected, system allows Quality Check.
* Outputs:
  * Calculated data in Excel.
  * Error model with graphs.

## 5.11 Reports

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
