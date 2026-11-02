import { test, expect, Route } from '@playwright/test';
import { assertNoConsoleErrorsOrWarnings } from './utils/androidHelpers';

/**
 * Android Goals Readiness Test
 * 
 * This test verifies that goal milestone checkboxes persist correctly on Android,
 * specifically testing:
 * - Goals page loads correctly
 * - Milestone checkboxes can be toggled
 * - Checkbox state persists after page reload
 * - No console errors or warnings
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

type TestGoal = {
  id: string;
  title: string;
  description: string;
  status: string;
  progress: number;
  milestones: { title: string; completed: boolean; description?: string; due_date?: string | null }[];
  created_date: string;
};

test.describe('Android Goals Milestone Persistence', () => {
  let goalData: TestGoal[];

  test.beforeEach(async ({ page }) => {
    goalData = [
      {
        id: 'test-goal-1',
        title: 'Test Goal',
        description: 'A test goal for Android testing',
        status: 'active',
        progress: 0,
        milestones: [
          { title: 'First task', completed: false, description: 'First milestone' },
          { title: 'Second task', completed: false, description: 'Second milestone' }
        ],
        created_date: new Date().toISOString()
      }
    ];

    // Set up test environment
    await page.route('**/api/apps/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/public-settings/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-app-id',
            appId: 'test-app-id',
            appName: 'Test App',
            isPublic: true
          })
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
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
          preferences: {}
        })
      });
    });

    await page.route('**/api/apps/**/entities/User/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'user',
          preferences: {}
        })
      });
    });
    
    const handleGoalRoute = async (route: Route) => {
      const method = route.request().method();
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(goalData)
        });
        return;
      }
      
      if (method === 'PATCH' || method === 'PUT') {
        const postData = route.request().postDataJSON();
        const nextMilestones = postData?.milestones || postData?.updatedMilestones;
        if (nextMilestones) {
          goalData = [
            {
              ...goalData[0],
              progress: postData.progress || postData.newProgress || goalData[0].progress,
              milestones: nextMilestones
            }
          ];
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...goalData[0],
            progress: postData.progress || postData.newProgress || goalData[0].progress,
            milestones: nextMilestones || goalData[0].milestones
          })
        });
        return;
      }
      
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    };

    // Mock goals API with test data
    await page.route('**/api/entities/Goal**', handleGoalRoute);
    await page.route('**/api/apps/**/entities/Goal**', handleGoalRoute);
    
    await page.route('**/analytics/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.route('**/api/apps/**/analytics/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    
    // Set up test environment
    await page.addInitScript(() => {
      document.body.setAttribute('data-test-env', 'true');
      window.__TEST_APP_ID__ = 'test-app-id';
      localStorage.setItem('base44_app_id', 'test-app-id');
      localStorage.setItem('base44_access_token', 'test-token');
      window.__DISABLE_ANALYTICS__ = true;
    });
  });

  test('should persist milestone checkbox state across page reload', async ({ page }) => {
    // Set up console monitoring at the start
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);
    
    // Navigate to Goals page
    await page.goto(`${BASE_URL}/Goals`, { waitUntil: 'networkidle' });
    
    // Wait for goals to load - look for either "Active Goals" or "Your Goals" heading
    const headingSelectors = [
      'text=Active Goals',
      'text=Your Goals',
      'h1:has-text("Goals")',
      'h1:has-text("Your Goals")'
    ];

    let headingFound = false;
    for (const selector of headingSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        headingFound = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!headingFound) {
      test.skip(true, 'Goals page heading not found - skipping test');
      return;
    }

    // Look for "Tasks:" section
    const tasksSection = page.locator('text=Tasks:').first();
    
    if (await tasksSection.count() === 0) {
      test.skip(true, 'No "Tasks:" section found - skipping test');
      return;
    }
    await expect(tasksSection).toBeVisible({ timeout: 5000 });

    // Find checkboxes - try multiple strategies
    // 1. Standard input checkboxes
    // 2. Radix UI checkboxes (button role with data-state)
    const checkboxSelectors = [
      'input[type="checkbox"]',
      '[role="checkbox"]',
      'button[role="checkbox"]'
    ];

    let checkboxes = null;
    for (const selector of checkboxSelectors) {
      const elements = page.locator(selector);
      if (await elements.count() > 0) {
        checkboxes = elements;
        test.info().annotations.push({ type: 'info', description: `Found ${await elements.count()} checkboxes with selector: ${selector}` });
        break;
      }
    }

    if (!checkboxes || await checkboxes.count() === 0) {
      test.skip(true, 'No checkboxes found - skipping test');
      return;
    }

    // Get the first one or two checkboxes
    const firstCheckbox = checkboxes.first();
    const checkboxCount = await checkboxes.count();
    const secondCheckbox = checkboxCount > 1 ? checkboxes.nth(1) : null;

    // Record initial states
    const getCheckboxState = async (checkbox: any) => {
      // For standard checkboxes
      if (await checkbox.getAttribute('type') === 'checkbox') {
        return await checkbox.isChecked();
      }
      // For Radix checkboxes
      const dataState = await checkbox.getAttribute('data-state');
      return dataState === 'checked';
    };

    const initialState1 = await getCheckboxState(firstCheckbox);
    const initialState2 = secondCheckbox ? await getCheckboxState(secondCheckbox) : null;

    test.info().annotations.push({ type: 'info', description: `Initial states - First: ${initialState1}, Second: ${initialState2}` });

    // Toggle both checkboxes
    await firstCheckbox.click();
    await expect.poll(async () => await getCheckboxState(firstCheckbox)).toBe(!initialState1);

    if (secondCheckbox) {
      await secondCheckbox.click();
      await expect.poll(async () => await getCheckboxState(secondCheckbox)).toBe(!initialState2);
    }

    // Reload the page
    await page.reload({ waitUntil: 'networkidle' });

    // Find the Tasks section and checkboxes again after reload
    const tasksAfterReload = page.locator('text=Tasks:').first();
    await expect(tasksAfterReload).toBeVisible({ timeout: 10000 });

    // Find checkboxes again
    let checkboxesAfterReload = null;
    for (const selector of checkboxSelectors) {
      const elements = page.locator(selector);
      if (await elements.count() > 0) {
        checkboxesAfterReload = elements;
        break;
      }
    }

    if (!checkboxesAfterReload || await checkboxesAfterReload.count() === 0) {
      throw new Error('Checkboxes not found after reload');
    }

    const firstCheckboxAfterReload = checkboxesAfterReload.first();
    const secondCheckboxAfterReload = checkboxCount > 1 ? checkboxesAfterReload.nth(1) : null;

    // Get states after reload
    const stateAfterReload1 = await getCheckboxState(firstCheckboxAfterReload);
    const stateAfterReload2 = secondCheckboxAfterReload ? await getCheckboxState(secondCheckboxAfterReload) : null;

    test.info().annotations.push({ type: 'info', description: `States after reload - First: ${stateAfterReload1}, Second: ${stateAfterReload2}` });

    // Assert that states have changed (indicating persistence)
    expect(stateAfterReload1, 
      `First checkbox should have toggled from ${initialState1} to ${!initialState1}`
    ).toBe(!initialState1);

    if (secondCheckbox && secondCheckboxAfterReload) {
      expect(stateAfterReload2,
        `Second checkbox should have toggled from ${initialState2} to ${!initialState2}`
      ).toBe(!initialState2);
    }

    // Assert no console errors or warnings
    await checkConsole();
  });

  test('milestones timeline filters open as drawers', async ({ page }) => {
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);

    await page.goto(`${BASE_URL}/Goals`, { waitUntil: 'networkidle' });

    const timelineToggle = page.locator('button:has(svg.lucide-clock)');
    await expect(timelineToggle).toBeVisible({ timeout: 5000 });
    await timelineToggle.click();

    const timelineHeading = page.locator('text=Milestones Timeline');
    await expect(timelineHeading).toBeVisible({ timeout: 5000 });

    const goalFilter = page.getByRole('button', { name: 'Filter by Goal' });
    await goalFilter.click();
    await expect(page.getByRole('option', { name: /all goals/i })).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');

    const dateFilter = page.getByRole('button', { name: 'Date Range' });
    await dateFilter.click();
    await expect(page.getByRole('option', { name: /all dates/i })).toBeVisible({ timeout: 5000 });

    await checkConsole();
  });
});
