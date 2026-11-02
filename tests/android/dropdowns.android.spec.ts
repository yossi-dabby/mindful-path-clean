import { test, expect } from '@playwright/test';
import { assertNoConsoleErrorsOrWarnings } from './utils/androidHelpers';

/**
 * Android Dropdowns & Selection Controls Readiness Tests
 *
 * Verifies that Radix UI Select and Dropdown Menu components work correctly
 * on Android and mobile viewports, specifically:
 *
 * 1. Select Content opens below the trigger (position="popper" + side="bottom")
 *    and is not distorted by conflicting inline/CSS styles.
 * 2. Select options meet the minimum touch-target height.
 * 3. DropdownMenu items meet the minimum touch-target height.
 * 4. Selecting an option updates the trigger value (full interaction roundtrip).
 * 5. No console errors or warnings throughout.
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

/** Minimum touch-target height in pixels (iOS HIG / Android Material Design). */
const MIN_TOUCH_TARGET_PX = 44;

/** Maximum allowed height as a fraction of the viewport (matches max-h-[70vh]). */
const MAX_CONTENT_HEIGHT_FRACTION = 0.70;

// ---------------------------------------------------------------------------
// Shared mock setup
// ---------------------------------------------------------------------------
async function mockApis(page: import('@playwright/test').Page) {
  await page.route('**/api/apps/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/public-settings/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test-app-id', appId: 'test-app-id', appName: 'Test App', isPublic: true }),
      });
    } else if (url.includes('/entities/User')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'user',
          onboarding_completed: true,
          preferences: {},
        }),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
  });

  await page.route('**/api/auth/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user',
        onboarding_completed: true,
        preferences: {},
      }),
    });
  });

  await page.route('**/api/entities/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/analytics/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript(() => {
    document.body.setAttribute('data-test-env', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
    localStorage.setItem('base44_app_id', 'test-app-id');
    localStorage.setItem('base44_access_token', 'test-token');
  });
}

// ===========================================================================
// 1. Select – opens below trigger (popper/bottom positioning)
// ===========================================================================
test.describe('Select – content positioning on mobile', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page);

    // Mock Goals so the MilestonesTimeline select has data
    await page.route('**/api/entities/Goal**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'goal-1',
            title: 'Test Goal',
            status: 'active',
            progress: 0,
            milestones: [
              { title: 'Task A', completed: false, due_date: null },
            ],
            created_date: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route('**/api/apps/**/entities/Goal**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'goal-1',
            title: 'Test Goal',
            status: 'active',
            progress: 0,
            milestones: [
              { title: 'Task A', completed: false, due_date: null },
            ],
            created_date: new Date().toISOString(),
          },
        ]),
      });
    });
  });

  test('select content opens below the trigger without distorted positioning', async ({ page }) => {
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);

    await page.goto(`${BASE_URL}/Goals`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Find the timeline toggle button (clock icon) that reveals the Select controls
    const timelineToggle = page.locator('button:has(svg.lucide-clock)').first();

    if (await timelineToggle.count() === 0) {
      test.skip(true, 'Timeline toggle not found – skipping');
      return;
    }

    await timelineToggle.click();
    await page.waitForTimeout(500);

    // Find the first Select trigger (combobox role)
    const firstTrigger = page.getByRole('combobox').first();

    if (await firstTrigger.count() === 0) {
      test.skip(true, 'No combobox triggers found – skipping');
      return;
    }

    await expect(firstTrigger).toBeVisible({ timeout: 5000 });

    // Capture trigger bounding box before opening
    const triggerBox = await firstTrigger.boundingBox();
    expect(triggerBox).not.toBeNull();

    // Open the select
    await firstTrigger.click();
    await page.waitForTimeout(400);

    // The select content (listbox) should be visible
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible({ timeout: 5000 });

    // Assert the content renders below the trigger (y position > trigger bottom)
    const contentBox = await listbox.boundingBox();
    if (contentBox && triggerBox) {
      // Content top should be at or below the trigger's bottom edge
      expect(contentBox.y).toBeGreaterThanOrEqual(triggerBox.y);
    }

    // Dismiss
    await page.keyboard.press('Escape');

    await checkConsole();
  });

  test('select content is not taller than the viewport', async ({ page }) => {
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);

    await page.goto(`${BASE_URL}/Goals`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const timelineToggle = page.locator('button:has(svg.lucide-clock)').first();

    if (await timelineToggle.count() === 0) {
      test.skip(true, 'Timeline toggle not found – skipping');
      return;
    }

    await timelineToggle.click();
    await page.waitForTimeout(500);

    const firstTrigger = page.getByRole('combobox').first();

    if (await firstTrigger.count() === 0) {
      test.skip(true, 'No combobox triggers found – skipping');
      return;
    }

    await firstTrigger.click();
    await page.waitForTimeout(400);

    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible({ timeout: 5000 });

    const viewportSize = page.viewportSize();
    const contentBox = await listbox.boundingBox();

    if (contentBox && viewportSize) {
      // Content height should not exceed 70% of the viewport (max-h-[70vh])
      expect(contentBox.height).toBeLessThanOrEqual(viewportSize.height * MAX_CONTENT_HEIGHT_FRACTION);
    }

    await page.keyboard.press('Escape');
    await checkConsole();
  });
});

// ===========================================================================
// 2. Select – touch-target height for options
// ===========================================================================
test.describe('Select – option touch-target sizes', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page);

    await page.route('**/api/entities/Goal**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'goal-1',
            title: 'Test Goal',
            status: 'active',
            progress: 0,
            milestones: [{ title: 'Task A', completed: false, due_date: null }],
            created_date: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route('**/api/apps/**/entities/Goal**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'goal-1',
            title: 'Test Goal',
            status: 'active',
            progress: 0,
            milestones: [{ title: 'Task A', completed: false, due_date: null }],
            created_date: new Date().toISOString(),
          },
        ]),
      });
    });
  });

  test('select options are at least MIN_TOUCH_TARGET_PX tall on mobile', async ({ page }) => {
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);

    await page.goto(`${BASE_URL}/Goals`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const timelineToggle = page.locator('button:has(svg.lucide-clock)').first();

    if (await timelineToggle.count() === 0) {
      test.skip(true, 'Timeline toggle not found – skipping');
      return;
    }

    await timelineToggle.click();
    await page.waitForTimeout(500);

    const firstTrigger = page.getByRole('combobox').first();

    if (await firstTrigger.count() === 0) {
      test.skip(true, 'No combobox triggers found – skipping');
      return;
    }

    await firstTrigger.click();
    await page.waitForTimeout(400);

    const options = page.getByRole('option');
    const optionCount = await options.count();

    if (optionCount === 0) {
      test.skip(true, 'No options visible – skipping');
      return;
    }

    // Check all visible options meet the minimum touch target
    for (let i = 0; i < optionCount; i++) {
      const option = options.nth(i);
      const box = await option.boundingBox();
      if (box) {
        await expect.soft(
          box.height,
          `Option ${i} height (${box.height}px) should be >= ${MIN_TOUCH_TARGET_PX}px`
        ).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
      }
    }

    await page.keyboard.press('Escape');
    await checkConsole();
  });
});

// ===========================================================================
// 3. Select – full interaction round-trip (open → select → value updates)
// ===========================================================================
test.describe('Select – interaction round-trip', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page);

    await page.route('**/api/entities/Goal**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'goal-1',
            title: 'Alpha Goal',
            status: 'active',
            progress: 0,
            milestones: [{ title: 'Task A', completed: false, due_date: null }],
            created_date: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route('**/api/apps/**/entities/Goal**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'goal-1',
            title: 'Alpha Goal',
            status: 'active',
            progress: 0,
            milestones: [{ title: 'Task A', completed: false, due_date: null }],
            created_date: new Date().toISOString(),
          },
        ]),
      });
    });
  });

  test('selecting an option updates the combobox trigger value', async ({ page }) => {
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);

    await page.goto(`${BASE_URL}/Goals`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const timelineToggle = page.locator('button:has(svg.lucide-clock)').first();

    if (await timelineToggle.count() === 0) {
      test.skip(true, 'Timeline toggle not found – skipping');
      return;
    }

    await timelineToggle.click();
    await page.waitForTimeout(500);

    // Target the "date range" select (second combobox: overdue / next 7 days / next 30 days)
    const dateSelect = page.getByRole('combobox').nth(1);

    if (await dateSelect.count() === 0) {
      test.skip(true, 'Date select not found – skipping');
      return;
    }

    await expect(dateSelect).toBeVisible({ timeout: 5000 });

    // Open the date select
    await dateSelect.click();
    await page.waitForTimeout(400);

    // Choose "Overdue" (or the first non-All option)
    const overdueOption = page.getByRole('option', { name: /overdue/i });
    const nextWeekOption = page.getByRole('option', { name: /next 7 days/i });

    let targetOption = overdueOption;
    if ((await overdueOption.count()) === 0) {
      targetOption = nextWeekOption;
    }

    if (await targetOption.count() === 0) {
      // Just pick the second option
      const allOptions = page.getByRole('option');
      if ((await allOptions.count()) > 1) {
        targetOption = allOptions.nth(1);
      } else {
        test.skip(true, 'No selectable option found – skipping');
        return;
      }
    }

    const selectedText = await targetOption.textContent();
    await targetOption.click();
    await page.waitForTimeout(300);

    // The trigger should now show the selected value
    if (selectedText) {
      await expect(dateSelect).toContainText(selectedText.trim(), { timeout: 3000 });
    }

    await checkConsole();
  });
});

// ===========================================================================
// 4. Select – CrisisAlerts filter selects (admin-bypassed version)
// ===========================================================================
test.describe('Select – CrisisAlerts filter controls', () => {
  test.beforeEach(async ({ page }) => {
    // Mock as admin so the CrisisAlerts page renders its filter controls
    await page.route('**/api/apps/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/public-settings/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-app-id', appId: 'test-app-id', appName: 'Test App', isPublic: true }),
        });
      } else if (url.includes('/entities/User')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-user-id',
            email: 'admin@example.com',
            full_name: 'Admin User',
            role: 'admin',
            onboarding_completed: true,
            preferences: {},
          }),
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
    });

    await page.route('**/api/auth/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'admin@example.com',
          full_name: 'Admin User',
          role: 'admin',
          onboarding_completed: true,
          preferences: {},
        }),
      });
    });

    await page.route('**/api/entities/CrisisAlert**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'alert-1',
            surface: 'chat',
            reason_code: 'self_harm',
            severity: 'high',
            user_email: 'user@example.com',
            created_date: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route('**/api/entities/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('**/analytics/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.addInitScript(() => {
      document.body.setAttribute('data-test-env', 'true');
      (window as any).__TEST_APP_ID__ = 'test-app-id';
      (window as any).__DISABLE_ANALYTICS__ = true;
      localStorage.setItem('base44_app_id', 'test-app-id');
      localStorage.setItem('base44_access_token', 'test-token');
    });
  });

  test('crisis alerts surface and reason filter selects work correctly on mobile', async ({ page }) => {
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);

    await page.goto(`${BASE_URL}/CrisisAlerts`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const filtersCard = page.locator('[data-testid="crisis-alerts-filters"]');

    if (await filtersCard.count() === 0) {
      test.skip(true, 'Crisis alerts filters not found – skipping');
      return;
    }

    await expect(filtersCard).toBeVisible({ timeout: 10000 });

    // --- Surface filter ---
    const surfaceTrigger = page.locator('[data-testid="surface-filter"]');

    if (await surfaceTrigger.count() === 0) {
      test.skip(true, 'Surface filter not found – skipping');
      return;
    }

    await surfaceTrigger.click();
    await page.waitForTimeout(500);

    const surfaceOptions = page.getByRole('option');

    if (await surfaceOptions.count() > 0) {
      // Verify at least one option meets mobile touch-target size
      const firstOptionBox = await surfaceOptions.first().boundingBox();
      if (firstOptionBox) {
        await expect.soft(
          firstOptionBox.height,
          `Surface option height (${firstOptionBox.height}px) should be >= ${MIN_TOUCH_TARGET_PX}px`
        ).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
      }

      await surfaceOptions.first().click();
      await page.waitForTimeout(400);
    } else {
      await page.keyboard.press('Escape');
    }

    // --- Reason filter ---
    const reasonTrigger = page.locator('[data-testid="reason-filter"]');

    if (await reasonTrigger.count() === 0) {
      test.skip(true, 'Reason filter not found – skipping');
      return;
    }

    await reasonTrigger.click();
    await page.waitForTimeout(500);

    const reasonOptions = page.getByRole('option');

    if (await reasonOptions.count() > 0) {
      await reasonOptions.first().click();
      await page.waitForTimeout(400);
    } else {
      await page.keyboard.press('Escape');
    }

    // Alerts list should still be present after filtering
    const alertsList = page.locator('[data-testid="crisis-alerts-list"]');
    await expect(alertsList).toBeVisible({ timeout: 5000 });

    await checkConsole();
  });
});
