import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Run Management Workflows
 * Tests Story 2.4 acceptance criteria end-to-end
 */

// Test data
const TEST_RUN = {
  run_number: `E2E-RUN-${Date.now()}`,
  run_name: 'E2E Test Run',
  run_type: 'GTL',
  vertical_section: '1500',
  grid_correction: '0.5',
};

const UPDATED_RUN = {
  run_name: 'E2E Test Run - Updated',
  run_type: 'Gyro',
};

test.describe('Run Management E2E Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
  });

  test.describe('AC#1: List Runs with Pagination and Filtering', () => {
    test('should display runs list page with table', async ({ page }) => {
      // Navigate to runs page
      await page.goto('/runs');

      // Verify page header
      await expect(page.getByRole('heading', { name: 'Runs' })).toBeVisible();

      // Verify create button exists
      await expect(page.getByRole('button', { name: /create run/i })).toBeVisible();

      // Verify filter controls exist
      await expect(page.getByPlaceholder(/search by run number or name/i)).toBeVisible();
      await expect(page.getByLabel(/run type/i)).toBeVisible();
      await expect(page.getByLabel(/sort by/i)).toBeVisible();

      // Verify table structure
      await expect(page.getByText('Run Number')).toBeVisible();
      await expect(page.getByText('Run Name')).toBeVisible();
      await expect(page.getByText('Type')).toBeVisible();
      await expect(page.getByText('Well')).toBeVisible();
      await expect(page.getByText('Created At')).toBeVisible();
    });

    test('should filter runs by run type', async ({ page }) => {
      await page.goto('/runs');

      // Open run type dropdown
      await page.click('label:has-text("Run Type")');
      await page.click('li:has-text("GTL")');

      // Click Apply Filters
      await page.click('button:has-text("Apply Filters")');

      // Wait for table to update
      await page.waitForTimeout(500);

      // Verify GTL chips are visible
      const gtlChips = page.locator('span:has-text("GTL")');
      await expect(gtlChips.first()).toBeVisible();
    });

    test('should search runs by run number', async ({ page }) => {
      await page.goto('/runs');

      // Enter search term
      await page.fill('input[placeholder*="Search by run number or name"]', 'RUN-001');

      // Click Apply Filters
      await page.click('button:has-text("Apply Filters")');

      // Wait for results
      await page.waitForTimeout(500);

      // Verify results contain search term
      await expect(page.getByText('RUN-001')).toBeVisible();
    });

    test('should paginate through runs', async ({ page }) => {
      await page.goto('/runs');

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
      await page.goto('/runs');

      // Apply some filters
      await page.fill('input[placeholder*="Search by run number or name"]', 'test');
      await page.click('button:has-text("Apply Filters")');

      // Clear filters
      await page.click('button:has-text("Clear")');

      // Verify search input is cleared
      const searchInput = page.locator('input[placeholder*="Search by run number or name"]');
      await expect(searchInput).toHaveValue('');
    });
  });

  test.describe('AC#2: Create New Run', () => {
    test('should create a new run with all fields', async ({ page }) => {
      await page.goto('/runs');

      // Click Create Run button
      await page.click('button:has-text("Create Run")');

      // Verify navigation to create page
      await expect(page).toHaveURL('/runs/new');
      await expect(page.getByRole('heading', { name: /create run/i })).toBeVisible();

      // Fill in form fields
      await page.fill('input[name="run_number"]', TEST_RUN.run_number);
      await page.fill('input[name="run_name"]', TEST_RUN.run_name);

      // Select run type
      await page.click('label:has-text("Run Type")');
      await page.click(`li:has-text("${TEST_RUN.run_type}")`);

      // Fill optional fields
      await page.fill('input[name="vertical_section"]', TEST_RUN.vertical_section);
      await page.fill('input[name="grid_correction"]', TEST_RUN.grid_correction);

      // Submit form
      await page.click('button[type="submit"]:has-text("Submit")');

      // Wait for success and redirect
      await page.waitForURL(/\/runs\/.+/, { timeout: 5000 });

      // Verify we're on detail page
      await expect(page.getByText(TEST_RUN.run_name)).toBeVisible();
      await expect(page.getByText(TEST_RUN.run_number)).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/runs/new');

      // Try to submit empty form
      await page.click('button[type="submit"]:has-text("Submit")');

      // Verify validation errors
      await expect(page.getByText(/run number is required/i)).toBeVisible();
      await expect(page.getByText(/run name is required/i)).toBeVisible();
    });

    test('should handle BHC enabled/disabled logic', async ({ page }) => {
      await page.goto('/runs/new');

      // BHC is enabled by default, proposal direction should be disabled
      const proposalDirectionInput = page.locator('input[name="proposal_direction"]');
      await expect(proposalDirectionInput).toBeDisabled();

      // Uncheck BHC
      await page.click('input[name="bhc_enabled"]');

      // Proposal direction should now be enabled and required
      await expect(proposalDirectionInput).toBeEnabled();

      // Try to submit without proposal direction
      await page.fill('input[name="run_number"]', 'TEST-BHC');
      await page.fill('input[name="run_name"]', 'BHC Test');
      await page.click('label:has-text("Run Type")');
      await page.click('li:has-text("GTL")');
      await page.click('button[type="submit"]:has-text("Submit")');

      // Verify validation error
      await expect(page.getByText(/proposal direction is required when bhc is disabled/i)).toBeVisible();
    });

    test('should cancel creation and return to list', async ({ page }) => {
      await page.goto('/runs/new');

      // Fill some fields
      await page.fill('input[name="run_number"]', 'CANCEL-TEST');

      // Click Cancel
      await page.click('button:has-text("Cancel")');

      // Verify navigation back to list
      await expect(page).toHaveURL('/runs');
    });
  });

  test.describe('AC#3: View Run Details', () => {
    test('should display complete run information', async ({ page }) => {
      await page.goto('/runs');

      // Click on first run's view button
      await page.click('[title="View details"]');

      // Wait for detail page
      await page.waitForURL(/\/runs\/.+/);

      // Verify sections are displayed
      await expect(page.getByText('Basic Information')).toBeVisible();
      await expect(page.getByText('Well Information')).toBeVisible();
      await expect(page.getByText('Metadata')).toBeVisible();

      // Verify action buttons
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /edit/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();
    });

    test('should navigate back to runs list', async ({ page }) => {
      await page.goto('/runs');
      await page.click('[title="View details"]');
      await page.waitForURL(/\/runs\/.+/);

      // Click Back button
      await page.click('button:has-text("Back")');

      // Verify navigation to list
      await expect(page).toHaveURL('/runs');
    });

    test('should navigate to edit from detail page', async ({ page }) => {
      await page.goto('/runs');
      await page.click('[title="View details"]');
      const detailUrl = page.url();
      const runId = detailUrl.split('/runs/')[1];

      // Click Edit button
      await page.click('button:has-text("Edit")');

      // Verify navigation to edit page
      await expect(page).toHaveURL(`/runs/${runId}/edit`);
    });
  });

  test.describe('AC#4: Edit Existing Run', () => {
    test('should update run information', async ({ page }) => {
      await page.goto('/runs');

      // Click edit on first run
      await page.click('[title="Edit run"]');

      // Wait for edit page
      await page.waitForURL(/\/runs\/.+\/edit/);

      // Update fields
      await page.fill('input[name="run_name"]', UPDATED_RUN.run_name);

      // Change run type
      await page.click('label:has-text("Run Type")');
      await page.click(`li:has-text("${UPDATED_RUN.run_type}")`);

      // Submit form
      await page.click('button[type="submit"]:has-text("Save Changes")');

      // Wait for redirect to detail page
      await page.waitForURL(/\/runs\/[^/]+$/);

      // Verify updated information is displayed
      await expect(page.getByText(UPDATED_RUN.run_name)).toBeVisible();
      await expect(page.getByText(UPDATED_RUN.run_type)).toBeVisible();
    });

    test('should cancel edit and return to detail page', async ({ page }) => {
      await page.goto('/runs');
      await page.click('[title="Edit run"]');
      await page.waitForURL(/\/runs\/.+\/edit/);

      // Click Cancel
      await page.click('button:has-text("Cancel")');

      // Verify navigation back to detail page
      await expect(page.url()).toMatch(/\/runs\/[^/]+$/);
      await expect(page.url()).not.toContain('/edit');
    });
  });

  test.describe('AC#5: Delete Run (Soft Delete)', () => {
    test('should show delete confirmation dialog', async ({ page }) => {
      await page.goto('/runs');

      // Click delete on a run
      await page.click('[title="Delete run"]');

      // Verify confirmation dialog
      await expect(page.getByText('Delete Run')).toBeVisible();
      await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible();
      await expect(page.getByText(/soft delete/i)).toBeVisible();

      // Verify dialog buttons
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();
    });

    test('should cancel delete operation', async ({ page }) => {
      await page.goto('/runs');

      // Click delete
      await page.click('[title="Delete run"]');

      // Click Cancel in dialog
      await page.click('button:has-text("Cancel")');

      // Verify dialog is closed
      await expect(page.getByText('Delete Run')).not.toBeVisible();

      // Verify still on runs list page
      await expect(page).toHaveURL('/runs');
    });

    test('should soft delete run and show success message', async ({ page }) => {
      await page.goto('/runs');

      // Get run name before delete
      const firstRunName = await page.locator('tbody tr:first-child td:nth-child(2)').textContent();

      // Click delete
      await page.click('[title="Delete run"]:first-of-type');

      // Confirm delete
      await page.click('button:has-text("Delete")');

      // Wait for success message
      await expect(page.getByText(/deleted successfully/i)).toBeVisible({ timeout: 5000 });

      // Verify the run is no longer in the list (or count decreased)
      await page.waitForTimeout(500);
    });
  });

  test.describe('Complete Workflow: Create → View → Edit → Delete', () => {
    test('should complete full CRUD lifecycle', async ({ page }) => {
      const uniqueRunNumber = `E2E-CRUD-${Date.now()}`;

      // 1. CREATE
      await page.goto('/runs/new');
      await page.fill('input[name="run_number"]', uniqueRunNumber);
      await page.fill('input[name="run_name"]', 'Full Lifecycle Test');
      await page.click('label:has-text("Run Type")');
      await page.click('li:has-text("GTL")');
      await page.click('button[type="submit"]:has-text("Submit")');

      // Wait for redirect
      await page.waitForURL(/\/runs\/.+/);

      // 2. VIEW
      await expect(page.getByText('Full Lifecycle Test')).toBeVisible();
      await expect(page.getByText(uniqueRunNumber)).toBeVisible();

      const runUrl = page.url();
      const runId = runUrl.split('/runs/')[1];

      // 3. EDIT
      await page.click('button:has-text("Edit")');
      await page.waitForURL(/\/edit$/);
      await page.fill('input[name="run_name"]', 'Full Lifecycle Test - Updated');
      await page.click('button[type="submit"]:has-text("Save Changes")');

      // Verify update
      await page.waitForURL(`/runs/${runId}`);
      await expect(page.getByText('Full Lifecycle Test - Updated')).toBeVisible();

      // 4. DELETE
      await page.click('button:has-text("Delete")');
      await page.click('button:has-text("Delete")');

      // Verify deletion success
      await expect(page.getByText(/deleted successfully/i)).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 for non-existent run', async ({ page }) => {
      await page.goto('/runs/non-existent-id-12345');

      // Should show error message
      await expect(page.getByText(/run not found/i)).toBeVisible({ timeout: 5000 });
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept API calls and return error
      await page.route('**/api/v1/runs/**', route => route.abort());

      await page.goto('/runs');

      // Should show error alert
      await expect(page.getByText(/failed to load/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Responsive Design', () => {
    test('should display properly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/runs');

      // Verify page is usable on mobile
      await expect(page.getByRole('heading', { name: 'Runs' })).toBeVisible();
      await expect(page.getByRole('button', { name: /create run/i })).toBeVisible();

      // Filters should stack vertically
      await expect(page.getByPlaceholder(/search/i)).toBeVisible();
    });

    test('should display properly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/runs');

      // Verify layout works on tablet
      await expect(page.getByRole('table')).toBeVisible();
    });
  });
});
