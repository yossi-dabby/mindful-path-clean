import { test, expect, devices } from '@playwright/test';

/**
 * Pull-to-Refresh Gesture Tests
 *
 * Validates that the PullToRefresh component correctly handles touch gestures:
 * 1. Normal pull within MAX_PULL shows the indicator and "Release to refresh" text
 * 2. Fast pull that jumps past MAX_PULL in a single touchmove event is treated as a
 *    valid pull (the fix: previously such a swipe would be silently ignored)
 * 3. The main scroll container stays at scrollTop=0 during a pull gesture
 */

// Use a mobile device so that touch events fire and the PullToRefresh component activates
test.use({ ...devices['Pixel 5'] });

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.E2E_BASE_URL ||
  process.env.BASE_URL ||
  'http://localhost:5173';

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
  });
}

/**
 * Dispatches touch events on the element at (x, y) to simulate a pull gesture.
 * @param page - Playwright page
 * @param startY - Starting Y coordinate (clientY of touchstart)
 * @param endY   - Ending Y coordinate (clientY of the single touchmove)
 */
async function simulatePull(
  page: import('@playwright/test').Page,
  startY: number,
  endY: number,
  { resetScrollTop = true }: { resetScrollTop?: boolean } = {},
) {
  await page.evaluate(
    ([sx, ex, shouldResetScrollTop]: [number, number, boolean]) => {
      const main = document.querySelector<HTMLElement>('#app-scroll-container');
      if (main && shouldResetScrollTop) main.scrollTop = 0;

      const x = 200;
      const target = document.elementFromPoint(x, sx) ?? document.body;

      target.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 1, target, clientX: x, clientY: sx })],
          bubbles: true,
          cancelable: true,
        }),
      );

      target.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 1, target, clientX: x, clientY: ex })],
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    [startY, endY, resetScrollTop] as [number, number, boolean],
  );
}

async function finishTouch(
  page: import('@playwright/test').Page,
  type: 'touchend' | 'touchcancel',
  clientY: number,
) {
  await page.evaluate(
    ([eventType, y]: ['touchend' | 'touchcancel', number]) => {
      const root = document.querySelector<HTMLElement>('[data-pull-to-refresh]');
      const target = root ?? document.body;
      const x = 200;
      const touches =
        eventType === 'touchend'
          ? []
          : [new Touch({ identifier: 1, target, clientX: x, clientY: y })];

      target.dispatchEvent(
        new TouchEvent(eventType, {
          touches,
          changedTouches: [new Touch({ identifier: 1, target, clientX: x, clientY: y })],
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    [type, clientY] as ['touchend' | 'touchcancel', number],
  );
}

async function pullState(page: import('@playwright/test').Page) {
  return page.locator('[data-pull-to-refresh]').first();
}

test.describe('PullToRefresh gesture handling', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page);
    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });
    // Wait for #app-scroll-container to ensure Home page and PullToRefresh are
    // fully loaded (not just the Suspense fallback spinner).
    await page.waitForFunction(
      () => {
        return !!document.querySelector('#app-scroll-container');
      },
      { timeout: 15000 },
    );
  });

  test('pull indicator appears for distance within MAX_PULL', async ({ page }) => {
    const root = await pullState(page);

    // Pull 90px down — past PULL_THRESHOLD (80) but below MAX_PULL (120)
    await simulatePull(page, 200, 290);

    await expect(root).toHaveAttribute('data-pulling', 'true');
    await expect(page.getByText('Release to refresh')).toBeVisible({ timeout: 2000 });
  });

  test('pull indicator appears even when distance exceeds MAX_PULL in a single touchmove', async ({ page }) => {
    const root = await pullState(page);

    // Fast swipe: jump directly to 150px — past MAX_PULL (120) in one event.
    // This protects the regression where a single overshoot swipe could bypass
    // the indicator entirely instead of clamping and arming the pull state.
    await simulatePull(page, 200, 350);

    await expect(root).toHaveAttribute('data-pulling', 'true');
    await expect(page.getByText('Release to refresh')).toBeVisible({ timeout: 2000 });
  });

  test('extreme swipe velocity clamps pull state and fully resets after touchend', async ({ page }) => {
    const root = await pullState(page);

    await simulatePull(page, 200, 1200);
    await expect(root).toHaveAttribute('data-pulling', 'true');
    await expect(page.getByText('Release to refresh')).toBeVisible({ timeout: 2000 });

    await finishTouch(page, 'touchend', 1200);
    await page.waitForFunction(() => {
      const container = document.querySelector<HTMLElement>('[data-pull-to-refresh]');
      return (
        container?.getAttribute('data-pulling') === 'false' &&
        container?.getAttribute('data-refreshing') === 'false'
      );
    });
  });

  test('main scroll container stays at scrollTop 0 during a pull gesture', async ({ page }) => {
    await simulatePull(page, 200, 350);

    const scrollTop = await page.evaluate(
      () => document.querySelector<HTMLElement>('#app-scroll-container')?.scrollTop ?? -1,
    );
    expect(scrollTop).toBe(0);
  });

  test('touchcancel resets pull indicator and hides it', async ({ page }) => {
    const root = await pullState(page);

    // Start a pull below the threshold so the indicator is visible
    await simulatePull(page, 200, 240);
    await expect(root).toHaveAttribute('data-pulling', 'true');

    // Dispatch touchcancel to simulate an interrupted gesture
    await finishTouch(page, 'touchcancel', 240);

    // Indicator must be gone after cancel
    await page.waitForFunction(() => {
      const container = document.querySelector<HTMLElement>('[data-pull-to-refresh]');
      return (
        container?.getAttribute('data-pulling') === 'false' &&
        container?.getAttribute('data-refreshing') === 'false'
      );
    });
    await expect(page.getByText('Pull to refresh')).toBeHidden({ timeout: 2000 });
  });

  test('normal scrolling does not arm pull-to-refresh or leave a stuck state', async ({ page }) => {
    const root = await pullState(page);

    await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>('#app-scroll-container');
      if (main) {
        main.scrollTop = 240;
      }
    });

    await simulatePull(page, 260, 390, { resetScrollTop: false });

    await expect(root).toHaveAttribute('data-pulling', 'false');
    await expect(root).toHaveAttribute('data-refreshing', 'false');
    await expect(root.locator('[role="status"][aria-live="polite"]')).toHaveCount(0);
  });

  test('interrupted gesture resets when scrolling resumes', async ({ page }) => {
    const root = await pullState(page);

    await simulatePull(page, 200, 245);
    await expect(root).toHaveAttribute('data-pulling', 'true');

    await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>('#app-scroll-container');
      if (!main) return;
      main.scrollTop = 32;
      main.dispatchEvent(new Event('scroll'));
    });

    await page.waitForFunction(() => {
      const container = document.querySelector<HTMLElement>('[data-pull-to-refresh]');
      return container?.getAttribute('data-pulling') === 'false';
    });
    await expect(root).toHaveAttribute('data-refreshing', 'false');
  });

  test('pull indicator has role=status and aria-live=polite', async ({ page }) => {
    await simulatePull(page, 200, 290);
    // Wait for React state to update and the pull indicator to render
    // before querying ARIA attributes (simulatePull is synchronous but
    // React's isPulling state update is asynchronous).
    await page.waitForFunction(
      () => document.querySelector('[data-pull-to-refresh]')?.getAttribute('data-pulling') === 'true',
      { timeout: 3000 },
    );
    // The indicator element must carry the correct ARIA attributes for screen readers
    const attrs = await page.evaluate(() => {
      const indicator = document.querySelector(
        '[data-pull-to-refresh] [role="status"][aria-live="polite"]',
      );
      if (!indicator) return null;
      return {
        role: indicator.getAttribute('role'),
        ariaLive: indicator.getAttribute('aria-live'),
      };
    });
    expect(attrs).not.toBeNull();
    expect(attrs?.role).toBe('status');
    expect(attrs?.ariaLive).toBe('polite');
  });
});
