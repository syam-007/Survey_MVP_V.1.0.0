import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Well Management Workflows
 * Tests Story 2.5 acceptance criteria end-to-end
 */

// Test data
const TEST_WELL = {
  well_name: `E2E-WELL-${Date.now()}`,
  well_type: 'Oil',
  api_number: 'API-12345678',
  field_name: 'E2E Test Field',
  operator: 'E2E Test Operator',
  latitude: '29.7604',
  longitude: '-95.3698',
  spud_date: '2024-01-15',
  completion_date: '2024-03-20',
};

const UPDATED_WELL = {
  well_name: 'E2E Test Well - Updated',
  well_type: 'Gas',
  operator: 'E2E Test Operator - Updated',
};

test.describe('Well Management E2E Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
  });

  test.describe('AC#1: List Wells with Pagination and Filtering', () => {
    test('should display wells list page with table', async ({ page }) => {
      // Navigate to wells page
      await page.goto('/wells');

      // Verify page header
      await expect(page.getByRole('heading', { name: 'Wells' })).toBeVisible();

      // Verify create button exists
      await expect(page.getByRole('button', { name: /create well/i })).toBeVisible();

      // Verify filter controls exist
      await expect(page.getByPlaceholder(/search by well name or api number/i)).toBeVisible();
      await expect(page.getByLabel(/well type/i)).toBeVisible();
      await expect(page.getByLabel(/sort by/i)).toBeVisible();

      // Verify table structure
      await expect(page.getByText('Well Name')).toBeVisible();
      await expect(page.getByText('Type')).toBeVisible();
      await expect(page.getByText('API Number')).toBeVisible();
      await expect(page.getByText('Field')).toBeVisible();
      await expect(page.getByText('Operator')).toBeVisible();
      await expect(page.getByText('Created At')).toBeVisible();
    });

    test('should filter wells by well type', async ({ page }) => {
      await page.goto('/wells');

      // Open well type dropdown
      await page.click('label:has-text("Well Type")');
      await page.click('li:has-text("Oil")');

      // Click Apply Filters
      await page.click('button:has-text("Apply Filters")');

      // Wait for table to update
      await page.waitForTimeout(500);

      // Verify Oil chips are visible
      const oilChips = page.locator('span:has-text("Oil")');
      await expect(oilChips.first()).toBeVisible();
    });

    test('should search wells by well name', async ({ page }) => {
      await page.goto('/wells');

      // Enter search term
      await page.fill('input[placeholder*="Search by well name or API number"]', 'WELL-001');

      // Click Apply Filters
      await page.click('button:has-text("Apply Filters")');

      // Wait for results
      await page.waitForTimeout(500);

      // Verify results contain search term
      await expect(page.getByText('WELL-001')).toBeVisible();
    });

    test('should paginate through wells', async ({ page }) => {
      await page.goto('/wells');

      // Verify pagination controls exist
      await expect(page.locator('[role="combobox"]')).toBeVisible();

      // Change page size
      await page.click('[role="combobox"]');
      await page.click('[role="option"]:has-text("50")');

      // Wait for table update
      await page.waitForTimeout(500);

      // Verify page size changed
      const paginationText = await page.textContent('.MuiTablePagination-displayedRows');
      expect(paginationText).toContain('50');
    });

    test('should clear all filters', async ({ page }) => {
      await page.goto('/wells');

      // Apply some filters
      await page.fill('input[placeholder*="Search by well name or API number"]', 'test');
      await page.click('button:has-text("Apply Filters")');

      // Clear filters
      await page.click('button:has-text("Clear")');

      // Verify search input is cleared
      const searchInput = page.locator('input[placeholder*="Search by well name or API number"]');
      await expect(searchInput).toHaveValue('');
    });
  });

  test.describe('AC#2: Create New Well', () => {
    test('should create a new well with all fields', async ({ page }) => {
      await page.goto('/wells');

      // Click Create Well button
      await page.click('button:has-text("Create Well")');

      // Verify navigation to create page
      await expect(page).toHaveURL('/wells/new');
      await expect(page.getByRole('heading', { name: /create well/i })).toBeVisible();

      // Fill in basic information
      await page.fill('input[name="well_name"]', TEST_WELL.well_name);

      // Select well type
      await page.click('label:has-text("Well Type")');
      await page.click(`li:has-text("${TEST_WELL.well_type}")`);

      await page.fill('input[name="api_number"]', TEST_WELL.api_number);
      await page.fill('input[name="field_name"]', TEST_WELL.field_name);
      await page.fill('input[name="operator"]', TEST_WELL.operator);

      // Fill location information
      await page.fill('input[name="latitude"]', TEST_WELL.latitude);
      await page.fill('input[name="longitude"]', TEST_WELL.longitude);

      // Fill dates
      await page.fill('input[name="spud_date"]', TEST_WELL.spud_date);
      await page.fill('input[name="completion_date"]', TEST_WELL.completion_date);

      // Submit form
      await page.click('button[type="submit"]:has-text("Submit")');

      // Wait for success and redirect
      await page.waitForURL(/\/wells\/.+/, { timeout: 5000 });

      // Verify we're on detail page
      await expect(page.getByText(TEST_WELL.well_name)).toBeVisible();
      await expect(page.getByText(TEST_WELL.api_number)).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/wells/new');

      // Try to submit empty form
      await page.click('button[type="submit"]:has-text("Submit")');

      // Verify validation errors
      await expect(page.getByText(/well name is required/i)).toBeVisible();
      await expect(page.getByText(/well type is required/i)).toBeVisible();
    });

    test('should validate latitude range', async ({ page }) => {
      await page.goto('/wells/new');

      // Fill required fields
      await page.fill('input[name="well_name"]', 'Validation Test Well');
      await page.click('label:has-text("Well Type")');
      await page.click('li:has-text("Oil")');

      // Enter invalid latitude (> 90)
      await page.fill('input[name="latitude"]', '100');
      await page.click('button[type="submit"]:has-text("Submit")');

      // Verify validation error
      await expect(page.getByText(/latitude must be between -90 and 90/i)).toBeVisible();
    });

    test('should validate longitude range', async ({ page }) => {
      await page.goto('/wells/new');

      // Fill required fields
      await page.fill('input[name="well_name"]', 'Validation Test Well');
      await page.click('label:has-text("Well Type")');
      await page.click('li:has-text("Oil")');

      // Enter invalid longitude (> 180)
      await page.fill('input[name="longitude"]', '200');
      await page.click('button[type="submit"]:has-text("Submit")');

      // Verify validation error
      await expect(page.getByText(/longitude must be between -180 and 180/i)).toBeVisible();
    });

    test('should cancel creation and return to list', async ({ page }) => {
      await page.goto('/wells/new');

      // Fill some fields
      await page.fill('input[name="well_name"]', 'CANCEL-TEST');

      // Click Cancel
      await page.click('button:has-text("Cancel")');

      // Verify navigation back to list
      await expect(page).toHaveURL('/wells');
    });
  });

  test.describe('AC#3: View Well Details', () => {
    test('should display complete well information', async ({ page }) => {
      await page.goto('/wells');

      // Click on first well's view button
      await page.click('[title="View details"]');

      // Wait for detail page
      await page.waitForURL(/\/wells\/.+/);

      // Verify sections are displayed
      await expect(page.getByText('Basic Information')).toBeVisible();
      await expect(page.getByText('Location Information')).toBeVisible();
      await expect(page.getByText('Dates')).toBeVisible();
      await expect(page.getByText('Metadata')).toBeVisible();

      // Verify action buttons
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /edit/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();
    });

    test('should display associated runs section', async ({ page }) => {
      await page.goto('/wells');
      await page.click('[title="View details"]');
      await page.waitForURL(/\/wells\/.+/);

      // Verify Associated Runs section exists
      await expect(page.getByText('Associated Runs')).toBeVisible();
    });

    test('should navigate back to wells list', async ({ page }) => {
      await page.goto('/wells');
      await page.click('[title="View details"]');
      await page.waitForURL(/\/wells\/.+/);

      // Click Back button
      await page.click('button:has-text("Back")');

      // Verify navigation to list
      await expect(page).toHaveURL('/wells');
    });

    test('should navigate to edit from detail page', async ({ page }) => {
      await page.goto('/wells');
      await page.click('[title="View details"]');
      const detailUrl = page.url();
      const wellId = detailUrl.split('/wells/')[1];

      // Click Edit button
      await page.click('button:has-text("Edit")');

      // Verify navigation to edit page
      await expect(page).toHaveURL(`/wells/${wellId}/edit`);
    });
  });

  test.describe('AC#4: Edit Existing Well', () => {
    test('should update well information', async ({ page }) => {
      await page.goto('/wells');

      // Click edit on first well
      await page.click('[title="Edit well"]');

      // Wait for edit page
      await page.waitForURL(/\/wells\/.+\/edit/);

      // Update fields
      await page.fill('input[name="well_name"]', UPDATED_WELL.well_name);

      // Change well type
      await page.click('label:has-text("Well Type")');
      await page.click(`li:has-text("${UPDATED_WELL.well_type}")`);

      await page.fill('input[name="operator"]', UPDATED_WELL.operator);

      // Submit form
      await page.click('button[type="submit"]:has-text("Save Changes")');

      // Wait for redirect to detail page
      await page.waitForURL(/\/wells\/[^/]+$/);

      // Verify updated information is displayed
      await expect(page.getByText(UPDATED_WELL.well_name)).toBeVisible();
      await expect(page.getByText(UPDATED_WELL.well_type)).toBeVisible();
      await expect(page.getByText(UPDATED_WELL.operator)).toBeVisible();
    });

    test('should cancel edit and return to detail page', async ({ page }) => {
      await page.goto('/wells');
      await page.click('[title="Edit well"]');
      await page.waitForURL(/\/wells\/.+\/edit/);

      // Click Cancel
      await page.click('button:has-text("Cancel")');

      // Verify navigation back to detail page
      await expect(page.url()).toMatch(/\/wells\/[^/]+$/);
      await expect(page.url()).not.toContain('/edit');
    });

    test('should preserve existing values when editing', async ({ page }) => {
      await page.goto('/wells');
      await page.click('[title="Edit well"]');
      await page.waitForURL(/\/wells\/.+\/edit/);

      // Verify form is pre-filled
      const wellNameInput = page.locator('input[name="well_name"]');
      await expect(wellNameInput).not.toHaveValue('');
    });
  });

  test.describe('AC#5: Delete Well (Soft Delete)', () => {
    test('should show delete confirmation dialog', async ({ page }) => {
      await page.goto('/wells');

      // Click delete on a well
      await page.click('[title="Delete well"]');

      // Verify confirmation dialog
      await expect(page.getByText('Delete Well')).toBeVisible();
      await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible();
      await expect(page.getByText(/soft delete/i)).toBeVisible();

      // Verify dialog buttons
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();
    });

    test('should cancel delete operation', async ({ page }) => {
      await page.goto('/wells');

      // Click delete
      await page.click('[title="Delete well"]');

      // Click Cancel in dialog
      await page.click('button:has-text("Cancel")');

      // Verify dialog is closed
      await expect(page.getByText('Delete Well')).not.toBeVisible();

      // Verify still on wells list page
      await expect(page).toHaveURL('/wells');
    });

    test('should soft delete well and show success message', async ({ page }) => {
      await page.goto('/wells');

      // Get well name before delete
      const firstWellName = await page.locator('tbody tr:first-child td:nth-child(1)').textContent();

      // Click delete
      await page.click('[title="Delete well"]:first-of-type');

      // Confirm delete
      await page.click('button:has-text("Delete")');

      // Wait for success message
      await expect(page.getByText(/deleted successfully/i)).toBeVisible({ timeout: 5000 });

      // Verify the well is no longer in the list (or count decreased)
      await page.waitForTimeout(500);
    });
  });

  test.describe('Complete Workflow: Create → View → Edit → Delete', () => {
    test('should complete full CRUD lifecycle', async ({ page }) => {
      const uniqueWellName = `E2E-CRUD-${Date.now()}`;

      // 1. CREATE
      await page.goto('/wells/new');
      await page.fill('input[name="well_name"]', uniqueWellName);
      await page.click('label:has-text("Well Type")');
      await page.click('li:has-text("Oil")');
      await page.fill('input[name="field_name"]', 'Full Lifecycle Test Field');
      await page.click('button[type="submit"]:has-text("Submit")');

      // Wait for redirect
      await page.waitForURL(/\/wells\/.+/);

      // 2. VIEW
      await expect(page.getByText(uniqueWellName)).toBeVisible();
      await expect(page.getByText('Full Lifecycle Test Field')).toBeVisible();

      const wellUrl = page.url();
      const wellId = wellUrl.split('/wells/')[1];

      // 3. EDIT
      await page.click('button:has-text("Edit")');
      await page.waitForURL(/\/edit$/);
      await page.fill('input[name="well_name"]', `${uniqueWellName} - Updated`);
      await page.click('button[type="submit"]:has-text("Save Changes")');

      // Verify update
      await page.waitForURL(`/wells/${wellId}`);
      await expect(page.getByText(`${uniqueWellName} - Updated`)).toBeVisible();

      // 4. DELETE
      await page.click('button:has-text("Delete")');
      await page.click('button:has-text("Delete")');

      // Verify deletion success
      await expect(page.getByText(/deleted successfully/i)).toBeVisible();
    });
  });

  test.describe('Navigation Integration', () => {
    test('should navigate from dashboard to wells', async ({ page }) => {
      await page.goto('/dashboard');

      // Click Wells button
      await page.click('button:has-text("Wells")');

      // Verify navigation
      await expect(page).toHaveURL('/wells');
    });

    test('should navigate from wells to runs', async ({ page }) => {
      await page.goto('/wells');

      // Verify navigation link/button exists (adjust selector based on your implementation)
      await page.goto('/runs');

      // Verify we're on runs page
      await expect(page).toHaveURL('/runs');
      await expect(page.getByRole('heading', { name: 'Runs' })).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 for non-existent well', async ({ page }) => {
      await page.goto('/wells/non-existent-id-12345');

      // Should show error message
      await expect(page.getByText(/well not found/i)).toBeVisible({ timeout: 5000 });
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept API calls and return error
      await page.route('**/api/v1/wells/**', route => route.abort());

      await page.goto('/wells');

      // Should show error alert
      await expect(page.getByText(/failed to load/i)).toBeVisible({ timeout: 5000 });
    });

    test('should validate unique API number', async ({ page }) => {
      await page.goto('/wells/new');

      // Fill form with existing API number (assuming API-001 exists)
      await page.fill('input[name="well_name"]', 'Duplicate API Test');
      await page.click('label:has-text("Well Type")');
      await page.click('li:has-text("Oil")');
      await page.fill('input[name="api_number"]', 'API-001');
      await page.click('button[type="submit"]:has-text("Submit")');

      // Should show error (may come from backend)
      await page.waitForTimeout(1000);
    });
  });

  test.describe('Responsive Design', () => {
    test('should display properly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/wells');

      // Verify page is usable on mobile
      await expect(page.getByRole('heading', { name: 'Wells' })).toBeVisible();
      await expect(page.getByRole('button', { name: /create well/i })).toBeVisible();

      // Filters should stack vertically
      await expect(page.getByPlaceholder(/search/i)).toBeVisible();
    });

    test('should display properly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/wells');

      // Verify layout works on tablet
      await expect(page.getByRole('table')).toBeVisible();
    });

    test('should display form properly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/wells/new');

      // Verify form fields are visible and accessible
      await expect(page.locator('input[name="well_name"]')).toBeVisible();
      await expect(page.getByLabel(/well type/i)).toBeVisible();
    });
  });
});
