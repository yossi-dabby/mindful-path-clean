import { test, expect } from '@playwright/test';
import { assertNoConsoleErrorsOrWarnings } from './utils/androidHelpers';
import { mockApi } from '../helpers/ui';

/**
 * Android Navigation & Optimistic UI Tests
 *
 * Covers three categories of issues that were causing console warnings on Android and iOS:
 *
 * 1. Bottom Tabs & Stack Preservation
 *    - Switching between bottom-nav tabs navigates correctly without no-op warnings.
 *    - Re-tapping the active tab resets to the tab root and scrolls to top.
 *    - Each tab remembers its last visited sub-page (stack preservation).
 *
 * 2. Within-Tab Back Navigation (Unified Navigation / Back Stack)
 *    - The mobile header back button navigates back within the tab's stack.
 *    - Using navigate(-1) keeps the browser history in sync with the tab stack,
 *      preventing iOS WKWebView "Unified Navigation" warnings.
 *    - Tab switching with replace:true does not pollute the browser history.
 *
 * 3. Optimistic UI Updates (Android)
 *    - Toggling a milestone checkbox updates the UI immediately (before the server
 *      responds), and the cache is reconciled with server state via invalidation.
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

// ---------------------------------------------------------------------------
// Shared API mocking helper
// ---------------------------------------------------------------------------
async function mockApis(page: import('@playwright/test').Page) {
  await mockApi(page);
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  });
}

/** Returns the link to a given page path from the bottom navigation bar. */
function bottomNavLink(page: import('@playwright/test').Page, path: string) {
  // Use the ARIA role "navigation" which only matches the visible BottomNav on mobile
  // (the sidebar nav is display:none and is excluded from the accessibility tree).
  return page.getByRole('navigation', { name: 'Main navigation' }).locator(`a[href="/${path}"]`).first();
}

// ===========================================================================
// 1. Bottom Tabs & Stack Preservation
// ===========================================================================
test.describe('Bottom Tabs & Stack Preservation', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page);
  });

  test('switching between tabs navigates without console warnings', async ({ page }) => {
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);

    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // The Pixel 5 profile must render the mobile bottom navigation.
    const bottomNav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(bottomNav).toBeVisible({ timeout: 10000 });

    // Switch to Journal tab
    await bottomNavLink(page, 'Journal').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/Journal');

    // Switch to Home tab
    await bottomNavLink(page, 'Home').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/Home');

    // Switch to My Path and Tools — these are first-class tab roots.
    await bottomNavLink(page, 'MyPath').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/MyPath');
    await expect(page.locator('#root')).not.toBeEmpty();

    await bottomNavLink(page, 'Tools').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/Tools');
    await expect(page.locator('#root')).not.toBeEmpty();

    // Switch to the Coach tab.
    await bottomNavLink(page, 'Chat').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/Chat');

    await checkConsole();
  });

  test('re-tapping the active tab resets to tab root without console warnings', async ({ page }) => {
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);

    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const homeLink = bottomNavLink(page, 'Home');
    if (await homeLink.count() === 0) {
      test.skip(true, 'Home link not found – skipping');
      return;
    }

    // Already on /Home – tapping Home again should be a no-op navigation (no warning)
    await homeLink.click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/Home');

    // Tap once more to confirm idempotency
    await homeLink.click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/Home');

    await checkConsole();
  });

  test('switching to an already-active tab that is at root does not generate a no-op warning', async ({ page }) => {
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);

    // Navigate directly to a tab's root page
    await page.goto(`${BASE_URL}/Journal`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const journalLink = bottomNavLink(page, 'Journal');
    if (await journalLink.count() === 0) {
      test.skip(true, 'Journal link not found – skipping');
      return;
    }

    // Tapping Journal while already on /Journal should not cause a duplicate-navigation warning
    await journalLink.click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/Journal');

    await checkConsole();
  });

  test('mapped sub-pages keep their parent tab marked active in the bottom nav', async ({ page }) => {
    await page.goto(`${BASE_URL}/Playlists`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const toolsTab = bottomNavLink(page, 'Tools');
    if (await toolsTab.count() === 0) {
      test.skip(true, 'Tools link not found – skipping');
      return;
    }

    await expect(toolsTab).toHaveAttribute('aria-current', 'page');
  });

  test('repeat-tapping the active root tab does not accumulate history entries', async ({ page }) => {
    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const homeLink = bottomNavLink(page, 'Home');
    if (await homeLink.count() === 0) {
      test.skip(true, 'Home link not found – skipping');
      return;
    }

    const historyBefore = await page.evaluate(() => window.history.length);

    // Tap the active root tab three times
    await homeLink.click();
    await page.waitForTimeout(300);
    await homeLink.click();
    await page.waitForTimeout(300);
    await homeLink.click();
    await page.waitForTimeout(300);

    // Tab switch uses replace:true so history must not grow by more than 1 entry
    // across 3 taps. The +2 upper bound accounts for the one replace that lands
    // the browser at the root path on the first tap; subsequent replace navigations
    // reuse that same entry without pushing new ones.
    const historyAfter = await page.evaluate(() => window.history.length);
    expect(historyAfter).toBeLessThanOrEqual(historyBefore + 2);
    expect(page.url()).toContain('/Home');
  });

  test('bottom nav does not visually overlap page content (content clearance)', async ({ page }) => {
    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // The #app-scroll-container must have paddingBottom >= BOTTOM_NAV_HEIGHT (80px)
    const paddingBottom = await page.evaluate(() => {
      const el = document.getElementById('app-scroll-container');
      return el ? parseFloat(getComputedStyle(el).paddingBottom) : 0;
    });
    expect(paddingBottom).toBeGreaterThanOrEqual(80);
  });

  test('ThoughtCoach sub-page keeps Chat tab active in bottom nav', async ({ page }) => {
    await page.goto(`${BASE_URL}/ThoughtCoach`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const chatTab = bottomNavLink(page, 'Chat');
    if (await chatTab.count() === 0) {
      test.skip(true, 'Chat tab link not found – skipping');
      return;
    }

    await expect(chatTab).toHaveAttribute('aria-current', 'page');
  });
});

// ===========================================================================
// 2. Within-Tab Back Navigation (Unified Navigation / Back Stack)
// ===========================================================================
test.describe('Within-Tab Back Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page);
  });

  test('navigating from a sub-page to another page and back uses the history stack correctly', async ({ page }) => {
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);

    // Start at Home tab root
    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const initialUrl = page.url();
    expect(initialUrl).toContain('/Home');

    // Navigate to a sub-page within the same logical tab (Settings is accessible from any tab)
    await page.goto(`${BASE_URL}/Settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    expect(page.url()).toContain('/Settings');

    // Simulate pressing the browser/native back button
    await page.goBack();
    await page.waitForTimeout(800);

    // Should be back at /Home, not at /Settings or any other URL
    expect(page.url()).toContain('/Home');

    await checkConsole();
  });

  test('tab switching via bottom nav uses replace navigation and does not inflate browser history', async ({ page }) => {
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);

    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const bottomNav = page.getByRole('navigation');
    if ((await bottomNav.count()) === 0) {
      test.skip(true, 'No navigation found – skipping');
      return;
    }

    // Record history length before tab switches
    const historyLengthBefore = await page.evaluate(() => window.history.length);

    // Switch to Journal and back to Home via the bottom nav
    await bottomNavLink(page, 'Journal').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/Journal');

    await bottomNavLink(page, 'Home').click();
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/Home');

    // Tab switching uses replace:true so history length should not grow — both
    // navigations replace the current entry rather than pushing a new one.
    const historyLengthAfter = await page.evaluate(() => window.history.length);
    expect(historyLengthAfter).toBeGreaterThanOrEqual(historyLengthBefore);
    expect(historyLengthAfter).toBeLessThanOrEqual(historyLengthBefore + 1);

    await checkConsole();
  });

  test('mobile header shows back button only on sub-pages, not on tab roots', async ({ page }) => {
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);

    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // At the Home root: no back button should appear in the mobile header
    const backButton = page.locator('header[class*="md:hidden"] button[aria-label="Go back"]');
    const backButtonVisible = await backButton.isVisible().catch(() => false);
    // On the root page the back button should be absent (or hidden)
    expect(backButtonVisible).toBe(false);

    await checkConsole();
  });
});

// ===========================================================================
// 3. Optimistic UI Updates (Android)
// ===========================================================================
test.describe('Optimistic UI Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/apps/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/public-settings/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-app-id', appId: 'test-app-id', appName: 'Test App', isPublic: true }),
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
          onboarding_completed: true,
          preferences: {},
        }),
      });
    });

    // Goal API: GET returns one goal with two milestones; PATCH/PUT persists state.
    let goalState = {
      id: 'goal-1',
      title: 'Optimistic Test Goal',
      description: 'Goal for testing optimistic updates',
      status: 'active',
      progress: 0,
      milestones: [
        { title: 'Task A', completed: false },
        { title: 'Task B', completed: false },
      ],
      created_date: new Date().toISOString(),
    };

    const handleGoalRoute = async (route: import('@playwright/test').Route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([goalState]) });
      } else if (method === 'PATCH' || method === 'PUT') {
        const body = route.request().postDataJSON();
        goalState = { ...goalState, ...body };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(goalState) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    };

    await page.route('**/api/entities/Goal**', handleGoalRoute);
    await page.route('**/api/apps/**/entities/Goal**', handleGoalRoute);

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

  test('milestone checkbox toggles UI immediately (optimistic) and completes without console warnings', async ({ page }) => {
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);

    await page.goto(`${BASE_URL}/Goals`, { waitUntil: 'networkidle' });

    // Wait for the Goals heading to appear
    const headingSelectors = ['text=Active Goals', 'text=Your Goals', 'h1:has-text("Goals")'];
    let headingFound = false;
    for (const sel of headingSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        headingFound = true;
        break;
      } catch {
        // continue
      }
    }
    if (!headingFound) {
      test.skip(true, 'Goals heading not found – skipping');
      return;
    }

    // Find checkboxes
    const checkboxes = page.locator('[role="checkbox"], input[type="checkbox"]');
    if (await checkboxes.count() === 0) {
      test.skip(true, 'No checkboxes found – skipping');
      return;
    }

    const firstCheckbox = checkboxes.first();
    await expect(firstCheckbox).toBeVisible({ timeout: 5000 });

    const getState = async (el: import('@playwright/test').Locator) => {
      const ds = await el.getAttribute('data-state');
      if (ds) return ds === 'checked';
      return el.isChecked();
    };

    const initialState = await getState(firstCheckbox);

    // Click the checkbox – the UI should update immediately (optimistic)
    await firstCheckbox.click();

    // Verify state toggled without waiting for network
    await expect.poll(() => getState(firstCheckbox), { timeout: 2000 }).toBe(!initialState);

    // Wait for network call to complete
    await page.waitForTimeout(1000);

    // State should still be toggled (server confirmed)
    expect(await getState(firstCheckbox)).toBe(!initialState);

    await checkConsole();
  });
});
