import { test, expect } from '@playwright/test';
import { mockApi, spaNavigate, logFailedRequests } from '../helpers/ui';

/**
 * Sidebar Navigation Smoke Test
 *
 * Navigates to each major route exposed in the sidebar/bottom-nav and asserts
 * that a stable page-ready indicator is visible.  Uses mockApi so no real
 * backend is required and no real data is created or modified.
 *
 * NOTE: Selectors scope to `main h1` (not a bare `h1`) so that the Sidebar
 * "MindWell" heading and the MobileHeader heading (both outside <main>) are
 * not accidentally matched — consistent with the convention in user-flows.spec.ts.
 */

interface RouteConfig {
  /** URL path to navigate to */
  path: string;
  /** Human-readable name for the test label */
  name: string;
  /**
   * Locator string for the stable "page ready" element.
   * Most pages render an h1 inside <main>; Chat is identified by its
   * dedicated data-testid attribute which is always present regardless of
   * consent state.
   */
  selector: string;
}

const SIDEBAR_ROUTES: RouteConfig[] = [
  { path: '/',            name: 'Home',         selector: 'main h1' },
  { path: '/Chat',        name: 'Chat',         selector: '[data-testid="chat-root"]' },
  // Coach has two h1s — one in md:hidden mobile header, one in hidden md:block desktop header.
  // The welcome card h2 is always visible (mock returns [] sessions → empty-state renders).
  { path: '/Coach',       name: 'Coach',        selector: 'main h2' },
  { path: '/MoodTracker', name: 'Mood Tracker', selector: 'main h1' },
  { path: '/Journal',     name: 'Journal',      selector: 'main h1' },
  { path: '/Progress',    name: 'Progress',     selector: 'main h1' },
  { path: '/Exercises',   name: 'Exercises',    selector: 'main h1' },
  { path: '/Goals',       name: 'Goals',        selector: 'main h1' },
  { path: '/Community',   name: 'Community',    selector: 'main h1' },
  { path: '/Resources',   name: 'Resources',    selector: 'main h1' },
  { path: '/Settings',    name: 'Settings',     selector: 'main h1' },
];

test.describe('Sidebar navigation smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  for (const route of SIDEBAR_ROUTES) {
    test(`${route.name} page renders without 404s`, async ({ page }) => {
      test.setTimeout(60000);

      const requestLogger = await logFailedRequests(page);

      try {
        await spaNavigate(page, route.path);

        // Wait for network quiet; swallow timeout — some pages keep long-pollers open.
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        // Assert the stable page-ready indicator is visible.
        const el = page.locator(route.selector).first();
        await expect(el).toBeVisible({ timeout: 15000 });

        // Fail if any 404 responses were detected for GET requests on this navigation.
        // POST/PATCH entity 404s are excluded: they are background writes (e.g. analytics,
        // subscription checks) that the UI handles gracefully and do not indicate a broken route.
        const failed404s = requestLogger
          .getFailedRequests()
          .filter((r) => r.includes(' - 404') && !r.startsWith('POST ') && !r.startsWith('PATCH '));

        if (failed404s.length > 0) {
          throw new Error(`404 responses detected on ${route.name}:\n${failed404s.join('\n')}`);
        }
      } catch (error) {
        requestLogger.logToConsole();
        await page.screenshot({
          path: `test-results/sidebar-nav-${route.name.replace(/\s+/g, '-').toLowerCase()}-failed-${Date.now()}.png`,
          fullPage: true,
        });
        throw error;
      }
    });
  }
});
