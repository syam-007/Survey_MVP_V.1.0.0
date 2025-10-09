# Technical Dependencies & Constraints

## Technical Specifications

* Backend: Django(python) with welleng library
* Frontend: React with 3D visualization (plotly.js or similar)
* Database: postgresql
* Deployment: AWS
* File Format Support: .xlsx,.csv,.pdf,.rep
* API testing: Postman
* Browser Support: Chrome, Firefox, Edge (last 2 versions)

## Security Requirements

### Authentication & Authorization

* Users must authenticate using secure credentials (username/password, SSO, or corporate identity provider).
* Role-based access control (RBAC):
  * Admin -- full access, including managing wells, users, and system settings.
  * Engineer/Surveyor -- create runs, upload survey files, perform calculations.
  * Viewer/Analyst -- view results and download reports, no editing rights.

### Data Protection

* All data in transit must use TLS 1.2+ (HTTPS) encryption.
* All data at rest (database, file storage) must be AES-256 encrypted.
* Uploaded files (Excel/CSV) must be scanned and validated before processing.

### Session Management

* Automatic logout after a configurable inactivity period (eg: 30 minutes).
* Secure session tokens with expiration and refresh policies.

### Backup & Recovery

* Automated daily backups of survey data and configurations.
* Disaster recovery plan ensuring data restoration within 24 hours.

## Performance Benchmarks

Performance (Enhanced):

- Survey Calculation other functionality: < 3 seconds for datasets up to 10,000 points
- 3D Visualization: Render initial plot in < 5 seconds
- File Upload/Processing: < 10 seconds for 10MB files
