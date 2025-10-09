# Workflow Overview

1. Create a Run -- Define run details and optionally link it to a well.
2. Add Location & Depth Information -- Provide well coordinates and elevation data.
3. Enter Survey Info -- Select survey type and Tie-on information.
4. Upload survey -- upload Excel file for survey calculation
5. Perform Functionalities:

## 4.1 Survey Calculation & Interpolation

* Automatically triggered after file upload (default interpolation resolution = 10).
* Results: Survey data is available immediately, and interpolation is provided with a default resolution of 10, including graphs and data
* The calculated result can be downloaded in an Excel format.

## 4.2 Comparison

* User uploads a reference survey for comparison.
* The system applies the current run info to calculate and interpolate (resolution = 10) the reference survey.
* Comparison is executed → delta calculated → results downloadable (Excel) with 2D & 3D graphs.
* If the user wants to compare with another reference survey, the upload dropdown will show:
  * The previously uploaded reference surveys.
  * An option to upload a new reference survey.
* When the user uploads a new reference survey, the system will automatically calculate the survey and interpolate it with a resolution of 10. This calculation is performed using the current run information.

## 4.3 Adjustment & Recalculation

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

## 4.4 Extrapolation

File-based or current file workflow with interpolation.

## 4.5 Quality Check (QC)

Only for GTL (Type 1) surveys.

## 4.6 Generate Reports

Automatically produce the corresponding report for each action.
