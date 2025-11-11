# Troubleshooting: Data Not Saving to Local Database

## Current Status
- **Backend Database**: Connected to `survey` ✓
- **Frontend Config**: Points to `http://localhost:8000` ✓
- **Customer Count**: 2 (PDO, Test Customer)

## Steps to Diagnose the Issue

### 1. Open Browser Developer Tools
1. Open your browser at `http://localhost:5179`
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab

### 2. Try Creating a Customer
1. Navigate to the Customers page
2. Click "Add Customer" or similar button
3. Fill in the customer details
4. Click "Save" or "Create"

### 3. Check for Errors in Console
Look for any of these error messages:
- **Red error messages** - JavaScript errors
- **401 Unauthorized** - Authentication issues
- **403 Forbidden** - Permission issues
- **400 Bad Request** - Validation errors
- **500 Server Error** - Backend crash

### 4. Check Network Tab
1. Go to the **Network** tab in Developer Tools
2. Try creating a customer again
3. Look for the POST request to `/api/v1/customers/`
4. Click on the request to see:
   - **Status Code**: Should be 200 or 201
   - **Response**: Check if there's an error message
   - **Request Payload**: Verify the data being sent

### 5. Common Issues

#### Issue A: Authentication Token Missing
**Symptom**: 401 Unauthorized error
**Solution**: You need to login first. The frontend needs a valid JWT token.

#### Issue B: Frontend Calling Wrong URL
**Symptom**: Network error or CORS error
**Check**: In Network tab, verify the URL is `http://localhost:8000/api/v1/...` not `https://survey.task.energy/api/v1/...`

#### Issue C: Validation Error
**Symptom**: 400 Bad Request with validation errors
**Solution**: Check the response to see which fields are required

#### Issue D: CORS Error
**Symptom**: "CORS policy" error in console
**Solution**: Backend CORS settings need to allow localhost

## What to Report Back

Please report back with:
1. ✓ Any error messages from the Console tab
2. ✓ The HTTP status code from the Network tab
3. ✓ The full URL being called (from Network tab)
4. ✓ Any error response message from the server

This will help me identify the exact issue!
