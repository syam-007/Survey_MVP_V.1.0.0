# Error Handling & Validation

## File Upload Validation

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

## Calculation & Processing Errors

User Input Validation Form

Validation: Real-time validation for all input fields with:

1. Visual indicators (green check/red X) for field validity
2. Contextual error messages below invalid fields
3. Required Fields: Clear indication of mandatory fields and prevention of submission until completed
4. Data Type Validation: Prevention of invalid characters in numeric fields, date validation, etc.

## System & Integration Errors

1. Database Errors: User-friendly messages for connection issues or data persistence failures
2. Authentication Errors: Clear messaging for login failures, expired sessions, and permission denials
3. Browser Compatibility: Feature detection with graceful degradation for unsupported browsers
4. Network Issues: Offline detection with appropriate messaging and recovery procedures
