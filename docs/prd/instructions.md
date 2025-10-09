# Development Instructions - Survey Management System

## Project Overview

This document provides comprehensive instructions for implementing the Survey Management System based on the PRD requirements. It serves as a guide for developers, architects, and QA teams throughout the development lifecycle.

## System Summary

The Survey Management System is a web-based platform for managing well survey data. It enables engineers to create runs, perform advanced calculations using the welleng library, visualize results in 2D/3D, and generate comprehensive reports.

**Tech Stack:**
- Backend: Django (Python 3.11+) with Django REST Framework
- Frontend: React 18.2+ with TypeScript
- Database: PostgreSQL 15+
- Visualization: Plotly.js
- Deployment: AWS
- File Storage: AWS S3

## Implementation Priority & Sequence

### Phase 1: Foundation & Core Setup (Epic 1)
**Priority: CRITICAL - Must be completed first**

1. **Project Initialization**
   - Set up monorepo structure with npm workspaces
   - Initialize Django backend project with virtual environment
   - Initialize React frontend with TypeScript and Vite
   - Configure PostgreSQL database
   - Set up Redis for caching and sessions
   - Create base Docker compose for local development

2. **Authentication & Authorization**
   - Implement Django authentication system
   - Configure JWT token authentication
   - Implement RBAC with three roles:
     - Admin: Full access to system management, users, and wells
     - Engineer/Surveyor: Create runs, upload files, perform calculations
     - Viewer/Analyst: Read-only access, download reports
   - Create user management endpoints
   - Implement frontend authentication flows and route guards

3. **Database Schema Setup**
   - Create Well model (optional parent entity for runs)
   - Create Run model with all required fields
   - Create Location Information model
   - Create Depth Information model
   - Create Survey Information model
   - Create Tie-On Information model
   - Create File Upload model (track uploaded surveys)
   - Create Report model (track generated reports)
   - Run initial migrations

### Phase 2: Run Management (Epic 2)
**Priority: HIGH - Core workflow foundation**

1. **Well Management (Optional)**
   - Create/Read/Update/Delete wells
   - Associate location and depth data with wells
   - List wells for run linking

2. **Run Creation**
   - Implement run creation form with validation:
     - Run number (required)
     - Run name (required, unique)
     - Run type (dropdown)
     - Vertical section information
     - BHC (Bottom Hole Closure) checkbox logic:
       - Unchecked: Manual proposal direction entry
       - Checked: Set to 0, auto-calculate after survey calculation
     - Grid correction (calculated or 0)
     - Toggle for linking to well
       - If linked: Auto-populate location/depth from well
       - If not linked: Direct entry from run
   - Implement run listing and detail views
   - Create run update/delete functionality

3. **Location Information**
   - Form for location data entry:
     - Latitude/Longitude (calculate Easting/Northing automatically)
     - UTM coordinates: Northing and Easting
     - Geodetic system
     - Map zone
     - North reference (dropdown)
     - Grid correction (calculated)
     - Central meridian
   - Backend calculations: g(t), max g(t), w(t), max w(t)
   - Save location data to database
   - Associate with run or well as appropriate

4. **Depth Information**
   - Form for depth data entry:
     - Elevation reference (dropdown)
     - Reference datum
     - Reference height
     - Reference elevation
   - Save depth data to database
   - Associate with run or well as appropriate

5. **Survey Information Setup**
   - Display after run, location, and depth completion
   - Survey type selection (dropdown):
     - Type 1 (GTL): Requires MD, Inc, Azi, w(t), g(t)
     - Type 2 (Gyro): Requires MD, Inc, Azi
     - Type 3 (MWD): Requires MD, Inc, Azi
     - Type 4 (Unknown): Requires MD, Inc, Azi
   - Dynamic file validation based on survey type

6. **Tie-On Information**
   - Form for tie-on data entry:
     - Measured depth
     - Inclination
     - Azimuth
     - True Vertical Depth (TVD)
     - Latitude (+N / -S)
     - Departure (+E / -W)
     - Well type
   - Survey Details section:
     - Hole section (dropdown)
     - Conditional checkboxes for Casing and Drillpipe
     - Auto-display survey run-in and minimum ID
     - Survey tool type selection
     - Survey interval (From → To)
     - Auto-calculate survey interval length
   - Save tie-on data to database

### Phase 3: File Upload & Validation (Epic 3)
**Priority: HIGH - Required for all calculations**

1. **File Upload Infrastructure**
   - Implement secure file upload to AWS S3
   - Support formats: .xlsx, .csv, .pdf, .rep
   - Implement file size validation (max 50MB)
   - File format validation with clear error messages
   - Create file processing queue

2. **File Validation by Survey Type**
   - Type 1 (GTL): Validate MD, Inc, Azi, w(t), g(t) columns
   - Type 2-4: Validate MD, Inc, Azi columns
   - Check for:
     - Missing required columns with specific error messages
     - Column name mismatches with expected headers
     - Data type mismatches (text in numeric fields)
     - Missing values in critical columns
     - Out-of-range values (inclination > 180°, negative MD)
     - Non-sequential measured depth values
     - Invalid geographic coordinates
   - Display validation results with actionable error messages

### Phase 4: Survey Calculation & Interpolation (Epic 4)
**Priority: CRITICAL - Core functionality**

1. **Welleng Library Integration**
   - Install and configure welleng library
   - Create service layer for welleng operations
   - Implement error handling for welleng exceptions

2. **Survey Calculation**
   - Automatically trigger after successful file upload
   - Use current run information (location, depth, tie-on, survey type)
   - Calculate survey using welleng library
   - Store calculated results in database
   - Handle BHC logic:
     - If BHC checked and proposal direction = 0
     - Calculate closure distance from survey
     - Add closure distance as proposal direction
     - Recalculate survey automatically

3. **Interpolation**
   - Implement interpolation with default resolution = 10
   - Make resolution user-configurable
   - Store interpolated data alongside calculated data
   - Performance target: < 3 seconds for datasets up to 10,000 points

4. **Data Visualization**
   - Implement 2D graph generation using Plotly.js
   - Implement 3D visualization using Plotly.js
   - Display graphs immediately after calculation
   - Performance target: Render initial plot in < 5 seconds
   - Make graphs interactive (zoom, pan, rotate for 3D)

5. **Data Export**
   - Implement Excel export for calculated results
   - Include both survey and interpolation data
   - Format exports for readability
   - Include run metadata in exports

### Phase 5: Survey Comparison (Epic 5)
**Priority: HIGH - Key analysis feature**

1. **Reference Survey Management**
   - Track all uploaded surveys as potential references
   - Implement dropdown showing previously uploaded reference surveys
   - Option to upload new reference survey
   - Reuse calculated/interpolated data for existing surveys

2. **Comparison Workflow**
   - Allow user to select/upload reference survey
   - Allow user to select/upload comparison survey
   - User designates which is reference vs comparison
   - Apply current run info to calculate reference survey if new
   - Interpolate reference survey (resolution = 10)

3. **Delta Calculation**
   - Calculate delta between reference and comparison
   - Apply ratio factor (user-defined, default = 10)
   - Store comparison results in database

4. **Comparison Visualization & Export**
   - Generate 2D comparison graphs
   - Generate 3D comparison graphs
   - Export comparison results to Excel/CSV
   - Include delta calculations in export

### Phase 6: Survey Adjustment & Recalculation (Epic 6)
**Priority: HIGH - Key manipulation feature**

1. **Adjustment Interface**
   - Display dropdown with all previously uploaded surveys
   - Option to upload new survey file
   - For existing surveys: Reuse calculated/interpolated data
   - For new surveys: Calculate and interpolate (resolution = 10)

2. **Adjustment Parameters**
   - Offset inputs for:
     - Easting (X)
     - Northing (Y)
     - TVD (Z)
   - Depth range selection (From → To)
   - Apply adjustments to selected survey

3. **Adjustment Operations**
   - Update survey data based on offsets
   - Update 2D and 3D graphs in real-time
   - Store adjustment history
   - Make adjusted data downloadable (Excel/CSV)

4. **Undo/Redo/Reset Functionality**
   - Implement undo last change
   - Implement redo functionality
   - Implement reset to original
   - Maintain state history for adjustments

5. **Recalculation from Adjusted Path**
   - Allow user to recalculate MD/INC/AZI from adjusted path
   - Use welleng library for recalculation
   - Store recalculated dataset
   - Make recalculated data downloadable (Excel/CSV)
   - Enable comparison of recalculated survey with reference surveys

### Phase 7: Survey Extrapolation (Epic 7)
**Priority: MEDIUM - Advanced analysis feature**

1. **Extrapolation Setup**
   - Option to use current file or upload new file
   - Input fields for:
     - Extrapolation length
     - Extrapolation step
     - Interpolation step
   - Extrapolation method selection (dropdown):
     - Constant
     - Linear Trend
     - Curve Fit

2. **Extrapolation Calculation**
   - Implement extrapolation using welleng library
   - Apply selected method
   - Use provided parameters
   - Store extrapolated results

3. **Extrapolation Visualization & Export**
   - Generate updated 2D plots
   - Generate updated 3D plots
   - Export results to Excel/CSV

### Phase 8: Quality Check (QC) - GTL Only (Epic 8)
**Priority: MEDIUM - Type 1 specific feature**

1. **QC Availability**
   - Only show QC option for Survey Type 1 (GTL)
   - Disable/hide for other survey types

2. **QC Calculation**
   - Perform quality check calculations using welleng
   - Calculate error models
   - Store QC results

3. **QC Output**
   - Export calculated data to Excel
   - Generate error model graphs
   - Make QC report downloadable

### Phase 9: Report Generation (Epic 9)
**Priority: HIGH - Required deliverable**

1. **Report Types**
   - Survey report (after calculation)
   - Comparison report (after comparison)
   - Comparison QC report (after comparison with QC)
   - Survey GTL QC report (after GTL QC)
   - Adjusted/Duplicate survey report (after adjustment)
   - Projected/Extrapolated survey report (after extrapolation)

2. **Automatic Report Generation**
   - Trigger report generation after each functionality
   - Use run metadata and results
   - Format reports professionally
   - Store reports in database and S3

3. **Report Export**
   - All reports downloadable in Excel (required)
   - Optional: CSV and PDF formats
   - Include graphs and data tables
   - Include metadata and timestamps

### Phase 10: Security & Performance (Epic 10)
**Priority: CRITICAL - Production readiness**

1. **Security Implementation**
   - TLS 1.2+ (HTTPS) for all data in transit
   - AES-256 encryption for data at rest (database, S3)
   - Scan and validate uploaded files before processing
   - Implement session management:
     - Auto-logout after 30 minutes inactivity (configurable)
     - Secure session tokens with expiration
     - Token refresh policies
   - Implement CSRF protection
   - Input sanitization and validation

2. **Performance Optimization**
   - Optimize database queries with indexing
   - Implement caching strategy using Redis
   - Optimize file upload/processing (< 10 seconds for 10MB)
   - Optimize calculation performance (< 3 seconds for 10K points)
   - Optimize 3D visualization rendering (< 5 seconds)
   - Implement lazy loading for large datasets

3. **Error Handling**
   - User-friendly error messages for all scenarios
   - Contextual error messages below invalid fields
   - Visual indicators (green check/red X) for form validation
   - Database error handling with fallback
   - Authentication error messaging
   - Browser compatibility detection
   - Network issue detection and recovery
   - Logging and monitoring integration

4. **Backup & Recovery**
   - Implement automated daily backups
   - Test disaster recovery procedures
   - Ensure 24-hour restoration capability

### Phase 11: Testing & Quality Assurance (Epic 11)
**Priority: HIGH - Quality gates**

1. **Unit Testing**
   - Backend: pytest with Django TestCase
   - Frontend: Jest with React Testing Library
   - Target: 80%+ code coverage
   - Test all calculation functions
   - Test all validation functions

2. **Integration Testing**
   - API endpoint testing
   - Database integration testing
   - Welleng library integration testing
   - File upload/processing pipeline testing

3. **End-to-End Testing**
   - Playwright for cross-browser testing
   - Test complete user workflows
   - Test error scenarios
   - Performance testing under load

4. **Security Testing**
   - Penetration testing
   - Authentication/authorization testing
   - File upload security testing
   - SQL injection prevention testing

### Phase 12: Deployment & Infrastructure (Epic 12)
**Priority: HIGH - Production deployment**

1. **Infrastructure as Code**
   - Terraform configurations for AWS resources
   - EC2 instances for application servers
   - RDS PostgreSQL setup
   - S3 buckets for file storage
   - CloudFront CDN configuration
   - Application Load Balancer setup

2. **CI/CD Pipeline**
   - GitHub Actions workflows
   - Automated testing on PRs
   - Automated deployment to staging
   - Manual approval for production
   - Rollback procedures

3. **Monitoring & Observability**
   - AWS CloudWatch integration
   - Application logging
   - Performance monitoring
   - Error tracking and alerting
   - Usage analytics

4. **Documentation**
   - API documentation (auto-generated)
   - User guides
   - Admin documentation
   - Deployment runbooks

## Non-Functional Requirements Implementation

### Performance
- **Target:** < 3 seconds for calculations on datasets with < 10,000 records
- **Implementation:** Optimize welleng operations, use database indexing, implement caching
- **Target:** < 5 seconds for 3D visualization rendering
- **Implementation:** Optimize Plotly.js configuration, use WebGL acceleration
- **Target:** < 10 seconds for 10MB file upload/processing
- **Implementation:** Stream processing, background jobs

### Scalability
- **Target:** Handle surveys with tens of thousands of data points
- **Implementation:** Pagination, lazy loading, database optimization, horizontal scaling

### Usability
- **Requirement:** Non-linear workflow support
- **Implementation:** Allow navigation between sections without strict sequence enforcement, save state at each step

### Browser Compatibility
- **Target:** Chrome, Firefox, Edge (last 2 versions)
- **Implementation:** Feature detection, graceful degradation, polyfills where needed

## Key Technical Considerations

### Welleng Library Integration
- Research welleng library API thoroughly
- Create abstraction layer for welleng operations
- Handle all welleng exceptions gracefully
- Test calculation accuracy against known datasets
- Document any limitations or quirks

### File Processing Strategy
- Process files asynchronously to avoid blocking
- Implement job queue for large file processing
- Provide real-time progress updates
- Store raw files in S3 for reprocessing if needed
- Implement file retention policies

### State Management
- Use Redux Toolkit for complex survey data state
- Cache calculated results to avoid recalculation
- Implement optimistic updates for better UX
- Handle offline scenarios gracefully

### Data Integrity
- Implement database transactions for multi-step operations
- Validate data at multiple layers (frontend, backend, database)
- Implement audit logging for critical operations
- Regular database backups

### API Design
- Follow RESTful conventions
- Version APIs for future compatibility
- Implement pagination for list endpoints
- Use appropriate HTTP status codes
- Provide comprehensive error responses

## Development Workflow

### Local Development
1. Clone repository
2. Install backend dependencies: `pip install -r requirements.txt`
3. Install frontend dependencies: `npm install`
4. Set up PostgreSQL database locally
5. Run migrations: `python manage.py migrate`
6. Start Redis: `redis-server`
7. Start backend: `python manage.py runserver`
8. Start frontend: `npm run dev`
9. Access at `http://localhost:5173`

### Testing Workflow
1. Write tests alongside features
2. Run unit tests locally before committing
3. Ensure all tests pass in CI before merging
4. Perform manual testing in staging environment
5. QA sign-off before production deployment

### Deployment Workflow
1. Merge to main branch triggers CI/CD
2. Automated tests run
3. Build Docker images
4. Deploy to staging automatically
5. Run smoke tests in staging
6. Manual approval for production
7. Deploy to production with blue-green strategy
8. Monitor for errors/performance issues
9. Rollback if necessary

## Critical Success Factors

1. **Accurate Calculations:** Survey calculations must be precise - this is a scientific application
2. **Performance:** Must meet performance benchmarks for user satisfaction
3. **Data Security:** Survey data is sensitive - security is paramount
4. **User Experience:** Complex workflows must be intuitive for engineers
5. **Reliability:** System must be available and stable for production use
6. **Scalability:** Must handle growing data volumes and user base

## Risk Mitigation

### Technical Risks
- **Welleng Integration Complexity:** Allocate time for deep integration work, create abstraction layer
- **Performance Issues:** Implement performance monitoring early, optimize iteratively
- **Data Loss:** Implement robust backup and recovery procedures
- **Security Vulnerabilities:** Regular security audits, penetration testing

### Project Risks
- **Scope Creep:** Stick to MVP scope, defer non-essential features
- **Timeline Pressure:** Prioritize ruthlessly, maintain quality standards
- **Integration Challenges:** Test integrations early and often

## Definition of Done

A feature is considered complete when:
1. Code is written and follows coding standards
2. Unit tests written and passing (80%+ coverage)
3. Integration tests passing
4. Code reviewed and approved
5. Documentation updated
6. Deployed to staging and tested
7. QA sign-off received
8. Performance benchmarks met
9. Security review completed
10. Product Owner acceptance

## Support & Maintenance

### Post-Launch
- Monitor error rates and performance
- Respond to user feedback
- Address bugs promptly
- Plan incremental enhancements
- Regular security updates
- Database maintenance and optimization

### Future Enhancements (Post-MVP)
- Mobile application
- Advanced analytics and reporting
- Machine learning for anomaly detection
- Real-time collaboration features
- Integration with other well management systems
- Custom visualization templates
- Batch processing capabilities
- API for third-party integrations

---

**Document Version:** 1.0
**Last Updated:** 2025-01-07
**Status:** Ready for Development
