# Survey Management System - Existing Pages

**Last Updated:** 2025-01-15
**Application Version:** 1.0.0

This document provides a comprehensive overview of all frontend pages created in the Survey Management System.

---

## Table of Contents
1. [Authentication Pages](#authentication-pages)
2. [Dashboard](#dashboard)
3. [Run Management Pages](#run-management-pages)
4. [Survey Pages](#survey-pages)
5. [Well Management Pages](#well-management-pages)
6. [User Management Pages](#user-management-pages)
7. [Missing/Planned Pages](#missingplanned-pages)

---

## Authentication Pages

### 1. Login Page
- **Route:** `/login`
- **File:** `apps/web/src/pages/LoginPage.tsx`
- **Access:** Public
- **Features:**
  - Email/password login form
  - JWT token authentication
  - Remember me functionality
  - Link to registration page
  - Error handling with validation

### 2. Register Page
- **Route:** `/register`
- **File:** `apps/web/src/pages/RegisterPage.tsx`
- **Access:** Public
- **Features:**
  - User registration form (username, email, password)
  - Password confirmation
  - Role selection (Admin, Engineer, Viewer)
  - Form validation
  - Link to login page

### 3. Unauthorized Page
- **Route:** `/unauthorized`
- **File:** `apps/web/src/pages/UnauthorizedPage.tsx`
- **Access:** Public
- **Features:**
  - Error message for unauthorized access
  - Link to go back or login

---

## Dashboard

### 4. Dashboard Page
- **Route:** `/dashboard`
- **File:** `apps/web/src/pages/DashboardPage.tsx`
- **Access:** Protected (All authenticated users)
- **Features:**
  - Welcome message with user info
  - Quick statistics cards
  - Navigation to main sections (Runs, Wells, Users)
  - Recent activity overview

---

## Run Management Pages

### 5. Run List Page
- **Route:** `/runs`
- **File:** `apps/web/src/pages/runs/RunListPage.tsx`
- **Access:** Protected (All authenticated users)
- **Features:**
  - Paginated table of all runs
  - Filtering by run type, well, date range
  - Search by run number/name
  - Sorting by various columns
  - "Create New Run" button (Engineer+ only)
  - Quick actions: View, Edit, Delete
  - Display: Run Number, Name, Type, Well, Created At

### 6. Create Run Page (Basic)
- **Route:** `/runs/new`
- **File:** `apps/web/src/pages/runs/CreateRunPage.tsx`
- **Access:** Role-protected (Engineer, Admin)
- **Features:**
  - Basic run creation form
  - Fields: run_number, run_name, run_type, vertical_section
  - BHC checkbox with conditional proposal_direction
  - Grid correction input
  - Well selection (optional)
  - Form validation
  - Success/error notifications

### 7. Create Complete Run Page (With Location, Depth, Tie-On)
- **Route:** `/runs/new/complete`
- **File:** `apps/web/src/pages/runs/CreateCompleteRunPage.tsx`
- **Access:** Role-protected (Engineer, Admin)
- **Features:**
  - Multi-step form wizard
  - **Step 1: Basic Information**
    - Run number, name, type
    - Vertical section, BHC, proposal direction
    - Grid correction
    - Well association
  - **Step 2: Location Information**
    - Latitude/Longitude
    - Easting/Northing (UTM)
    - Geodetic system, map zone
    - North reference, central meridian
  - **Step 3: Depth Information**
    - Elevation reference
    - Reference datum, height, elevation
  - **Step 4: Tie-On Information** (Optional)
    - MD, Inc, Azi, TVD
    - Northing (Latitude), Easting (Departure)
    - Well type
  - Progress indicator
  - Back/Next navigation
  - Form validation per step
  - Review & Submit

### 8. Run Detail Page
- **Route:** `/runs/:id`
- **File:** `apps/web/src/pages/runs/RunDetailPage.tsx`
- **Access:** Protected (All authenticated users)
- **Features:**
  - Breadcrumb navigation
  - **Section: Basic Information**
    - Run number, name, type
    - Vertical section, BHC status
    - Proposal direction, grid correction
  - **Section: Well Information** (if linked)
    - Well name, type
  - **Section: Location Information** (if added)
    - Latitude, Longitude
    - Easting, Northing
    - Geodetic system, map zone
  - **Section: Depth Information** (if added)
    - Elevation reference
    - Reference height
  - **Section: Tie-On Information** (if added) ✨ NEW
    - MD, Inc, Azi, TVD
    - Northing, Easting
    - Well type
    - "Add Tie-On" button when missing
  - **Section: Metadata**
    - Created by, created at, updated at, Run ID
  - **Actions:**
    - Back to Runs list
    - **Upload Survey File** button → Opens upload dialog
    - Edit button (Engineer+ only)
    - Delete button (Engineer+ only)

### 9. Edit Run Page
- **Route:** `/runs/:id/edit`
- **File:** `apps/web/src/pages/runs/EditRunPage.tsx`
- **Access:** Role-protected (Engineer, Admin)
- **Features:**
  - Pre-populated form with existing run data
  - Edit all run fields
  - Update location, depth information
  - Form validation
  - Save/Cancel actions
  - Success/error notifications

---

## Survey Pages

### 10. Survey Results Page ✨ NEW (Epic 4)
- **Route:** `/runs/:runId/surveys/:surveyDataId`
- **File:** `apps/web/src/pages/runs/SurveyResultsPage.tsx`
- **Access:** Protected (All authenticated users)
- **Features:**
  - **Breadcrumbs:** Home → Runs → Run Details → Survey Results
  - **File Metadata Card:**
    - Filename, upload date
    - Data point count (calculated/interpolated)
    - Processing time
  - **Data Source Toggle:**
    - Switch between Calculated and Interpolated data
    - Count display for each source
  - **Download Buttons:**
    - Download calculated survey (Excel/CSV)
    - Download interpolated survey (Excel/CSV)
  - **3D Wellbore Trajectory:**
    - Interactive 3D plot (Plotly.js)
    - Start/end markers
    - Zoom, pan, rotate controls
    - Hover tooltips with coordinates
  - **2D Trajectory Views:**
    - Toggle between 4 views:
      - Vertical Section (TVD vs Horizontal)
      - Plan View (North vs East)
      - Inclination Profile (MD vs Inc)
      - Azimuth Profile (MD vs Azi)
    - Interactive plots with zoom/pan
  - **Survey Data Table:** ✨ NEW
    - Paginated table (10/25/50/100 rows per page)
    - All columns: MD, Inc, Azi, Northing, Easting, TVD
    - Sortable columns (click headers)
    - Row numbers
    - Formatted decimal places
    - Alternating row colors
    - Sticky header
  - **Error Handling:**
    - Loading states
    - Error messages with retry
    - Empty data states

### 11. Survey Visualization Page
- **Route:** `/runs/:runId/surveys/:surveyDataId/visualization` (Possibly planned)
- **File:** `apps/web/src/pages/runs/SurveyVisualizationPage.tsx`
- **Access:** Protected (All authenticated users)
- **Status:** ⚠️ File exists but may not be fully implemented/routed
- **Features:** (To be confirmed)
  - Advanced visualization options
  - Custom plot configurations

---

## Well Management Pages

### 12. Well List Page
- **Route:** `/wells`
- **File:** `apps/web/src/pages/wells/WellListPage.tsx`
- **Access:** Protected (All authenticated users)
- **Features:**
  - Paginated table of all wells
  - Search by well name
  - Filter by well type
  - Sorting
  - "Create New Well" button (Engineer+ only)
  - Quick actions: View, Edit, Delete
  - Display: Well Name, Type, Location, Created At

### 13. Well Create Page
- **Route:** `/wells/new`
- **File:** `apps/web/src/pages/wells/WellCreatePage.tsx`
- **Access:** Role-protected (Engineer, Admin)
- **Features:**
  - Well creation form
  - Fields: well_name, well_type
  - Location information (optional)
  - Depth information (optional)
  - Form validation
  - Success/error notifications

### 14. Well Detail Page
- **Route:** `/wells/:id`
- **File:** `apps/web/src/pages/wells/WellDetailPage.tsx`
- **Access:** Protected (All authenticated users)
- **Features:**
  - Well basic information
  - Location details (if available)
  - Depth information (if available)
  - Associated runs list
  - Edit/Delete actions (Engineer+ only)

### 15. Well Edit Page
- **Route:** `/wells/:id/edit`
- **File:** `apps/web/src/pages/wells/WellEditPage.tsx`
- **Access:** Role-protected (Engineer, Admin)
- **Features:**
  - Pre-populated form with existing well data
  - Edit all well fields
  - Update location, depth information
  - Form validation
  - Save/Cancel actions

---

## User Management Pages

### 16. Users Page
- **Route:** `/users`
- **File:** `apps/web/src/pages/UsersPage.tsx`
- **Access:** Role-protected (Admin only)
- **Features:**
  - List of all users
  - User details (username, email, role)
  - Create/Edit/Delete users
  - Role management
  - User status (active/inactive)

---

## Missing/Planned Pages

Based on the PRD (Product Requirements Document), the following pages are **NOT YET IMPLEMENTED** but are planned:

### Epic 5: Comparison & Delta Analysis (Planned)
- **Comparison Page**
  - Route: `/runs/:runId/surveys/:surveyDataId/comparison`
  - Features: Upload reference survey, calculate deltas, view comparison plots

### Epic 6: Adjustment & Extrapolation (Planned)
- **Adjustment Page**
  - Route: `/runs/:runId/surveys/:surveyDataId/adjustment`
  - Features: Apply offsets, adjust trajectory, recalculate
- **Extrapolation Page**
  - Route: `/runs/:runId/surveys/:surveyDataId/extrapolation`
  - Features: Extend survey path, choose extrapolation method

### Epic 7: Quality Check (Planned)
- **QC Page** (GTL Type 1 only)
  - Route: `/runs/:runId/surveys/:surveyDataId/qc`
  - Features: Quality check analysis, error models, GTL-specific validation

### Epic 8: Reports (Planned)
- **Reports Page**
  - Route: `/runs/:runId/reports` or `/reports`
  - Features: Generate/download reports for each functionality

### Additional Missing Pages:
- **Profile Page** - User profile management
- **Settings Page** - Application settings
- **Help/Documentation Page** - User guide and help
- **Admin Dashboard** - Advanced admin controls and analytics

---

## Page Access Summary

| Page Category | Total Pages | Engineer+ Access | Admin Only | All Users |
|---------------|-------------|------------------|------------|-----------|
| Authentication | 3 | - | - | 3 |
| Dashboard | 1 | - | - | 1 |
| Run Management | 5 | 3 (Create/Edit) | - | 5 (View) |
| Survey | 2 | - | - | 2 |
| Well Management | 4 | 2 (Create/Edit) | - | 4 (View) |
| User Management | 1 | - | 1 | - |
| **TOTAL** | **16** | **5** | **1** | **16** |

---

## Component Highlights

### Key Reusable Components Created:
1. **SurveyFileUpload** - Drag-and-drop file upload with validation
2. **ProcessingStatus** - Real-time survey processing status with polling
3. **Plot2D / Plot3D** - Interactive 2D/3D visualization components
4. **SurveyDataTable** - Paginated, sortable data table ✨ NEW
5. **DataSourceToggle** - Toggle between calculated/interpolated data
6. **DownloadButton** - Export survey data in Excel/CSV format
7. **ProtectedRoute** - Authentication wrapper for protected pages
8. **RoleProtectedRoute** - Role-based access control wrapper

---

## Navigation Structure

```
Home (/)
└── Login/Register
    └── Dashboard (/dashboard)
        ├── Runs (/runs)
        │   ├── Create Run (/runs/new)
        │   ├── Create Complete Run (/runs/new/complete)
        │   ├── Run Detail (/runs/:id)
        │   │   ├── Upload Survey (Dialog)
        │   │   ├── Edit Run (/runs/:id/edit)
        │   │   └── Survey Results (/runs/:runId/surveys/:surveyDataId)
        │   │       ├── 3D Visualization
        │   │       ├── 2D Plots
        │   │       └── Data Table ✨ NEW
        │
        ├── Wells (/wells)
        │   ├── Create Well (/wells/new)
        │   ├── Well Detail (/wells/:id)
        │   └── Edit Well (/wells/:id/edit)
        │
        └── Users (/users) [Admin Only]
```

---

## Quick Reference: What's Working Now

### ✅ Fully Functional:
1. **Authentication** - Login, Register, JWT tokens
2. **Run CRUD** - Create, Read, Update, Delete runs
3. **Well CRUD** - Create, Read, Update, Delete wells
4. **Survey Upload** - File upload with drag-and-drop ✅
5. **Survey Calculation** - Automatic welleng calculations ✅
6. **Survey Interpolation** - Default 10m resolution ✅
7. **3D Visualization** - Interactive 3D wellbore trajectory ✅
8. **2D Visualization** - 4 plot types (vertical, plan, inc, azi) ✅
9. **Data Table** - Paginated, sortable survey data table ✅ NEW
10. **Export** - Download calculated results in Excel/CSV ✅
11. **Tie-On Display** - View tie-on information on Run Detail ✅ NEW

### ⚠️ Partially Complete:
1. **Tie-On Management** - Display only, no Create/Edit UI yet
2. **Location/Depth Management** - Created with run, no separate edit
3. **Survey Visualization Page** - File exists but may not be routed

### ❌ Not Yet Implemented:
1. **Comparison** - Upload reference, calculate deltas
2. **Adjustment** - Apply offsets, recalculate trajectory
3. **Extrapolation** - Extend survey path
4. **Quality Check** - GTL-specific QC analysis
5. **Reports** - Automatic report generation
6. **Profile Management** - User profile editing
7. **Advanced Admin Dashboard** - System analytics

---

## Next Steps (Recommendations)

### Immediate Priorities:
1. **Add Tie-On Create/Edit Modal** - Complete tie-on management UI
2. **Test Complete Upload-to-Visualization Workflow** - Ensure seamless UX
3. **Epic 5: Comparison** - Start comparison functionality (next major feature)

### Future Epics:
- Epic 5: Comparison & Delta Analysis
- Epic 6: Adjustment & Extrapolation
- Epic 7: Quality Check (GTL surveys)
- Epic 8: Report Generation

---

**Note:** This document reflects the current state of the application as of January 15, 2025. All pages marked with ✨ NEW were added/enhanced during Epic 4 implementation.
