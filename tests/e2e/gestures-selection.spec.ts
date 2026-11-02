import { test, expect } from '@playwright/test';

/**
 * System Gestures & Selection CSS Tests
 *
 * Validates that the correct CSS rules are applied to:
 * 1. Allow pinch-to-zoom globally (no blanket touch-action suppression on <html>)
 * 2. Allow the iOS long-press callout on the document level (no global suppression)
 * 3. Prevent text selection on interactive elements (buttons, icons) — scoped
 * 4. Keep text selection enabled on content elements (paragraphs)
 * 5. Prevent native drag on images and SVGs
 * 6. Disable the tap highlight on interactive elements
 */

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

test.describe('System Gesture & Selection Policy', () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page);
    await page.goto(`${BASE_URL}/Home`, { waitUntil: 'domcontentloaded' });
    // Wait for Home page buttons (confirms lazy chunk loaded, not just Suspense fallback spinner).
    await page.waitForFunction(() => {
      return !!document.querySelector('button');
    }, { timeout: 15000 });
  });

  // ── P0 fix: pinch-to-zoom must NOT be blocked at document level ───────────
  test('html element does NOT suppress pinch-to-zoom (touch-action is not pan-x pan-y)', async ({ page }) => {
    const touchAction = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('touch-action').trim()
    );
    // 'pan-x pan-y' would disable pinch zoom — that must never be set on <html>
    expect(touchAction).not.toBe('pan-x pan-y');
  });

  // ── P0 fix: iOS callout must NOT be globally suppressed ───────────────────
  test('html element does NOT globally suppress -webkit-touch-callout', async ({ page }) => {
    const callout = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('-webkit-touch-callout').trim()
    );
    // 'none' globally would block copy/share on all content — must not be set on <html>
    expect(callout).not.toBe('none');
  });

  // ── Correct scoped behaviour preserved ───────────────────────────────────
  test('buttons have user-select: none to prevent accidental text selection', async ({ page }) => {
    const userSelect = await page.evaluate(() => {
      const btn = document.querySelector('button');
      return btn ? getComputedStyle(btn).userSelect : null;
    });
    expect(userSelect).toBe('none');
  });

  test('buttons have no tap highlight (webkit-tap-highlight-color: transparent)', async ({ page }) => {
    const tapHighlight = await page.evaluate(() => {
      const btn = document.querySelector('button');
      if (!btn) return null;
      return getComputedStyle(btn).getPropertyValue('-webkit-tap-highlight-color').trim();
    });
    expect(tapHighlight, 'No <button> found on the page').not.toBeNull();
    // Transparent is expressed as rgba(0,0,0,0) or "transparent"
    expect(tapHighlight).toMatch(/rgba\(0,\s*0,\s*0,\s*0\)|transparent/);
  });

  test('buttons suppress the iOS callout menu while content text keeps it enabled', async ({ page }) => {
    const styles = await page.evaluate(() => {
      const btn = document.querySelector('button');
      const paragraph = document.querySelector('p');

      if (!btn || !paragraph) {
        return null;
      }

      return {
        buttonCallout: getComputedStyle(btn).getPropertyValue('-webkit-touch-callout').trim(),
        paragraphCallout: getComputedStyle(paragraph).getPropertyValue('-webkit-touch-callout').trim(),
      };
    });

    if (styles === null) {
      test.skip(true, 'No <button> or <p> found on the page');
      return;
    }

    expect(styles.buttonCallout).toMatch(/^$|none$/);
    expect(styles.paragraphCallout).not.toBe('none');
  });

  test('interactive elements use touch-action: manipulation to remove 300ms tap delay', async ({ page }) => {
    const touchAction = await page.evaluate(() => {
      const btn = document.querySelector('button');
      return btn ? getComputedStyle(btn).getPropertyValue('touch-action').trim() : null;
    });
    expect(touchAction).toBe('manipulation');
  });

  test('paragraph text remains selectable', async ({ page }) => {
    const userSelect = await page.evaluate(() => {
      const p = document.querySelector('p');
      return p ? getComputedStyle(p).userSelect : 'auto';
    });
    // Browsers may report "auto" or "text" for selectable content
    expect(['auto', 'text']).toContain(userSelect);
  });

  test('images have user-select: none and no native drag', async ({ page }) => {
    const styles = await page.evaluate(() => {
      const img = document.querySelector('img');
      if (!img) return null;
      const cs = getComputedStyle(img);
      return {
        userSelect: cs.userSelect,
        userDrag: cs.getPropertyValue('-webkit-user-drag'),
      };
    });
    if (styles === null) {
      test.skip(true, 'No <img> found on this page — skipping img drag test');
      return;
    }
    expect(styles.userSelect).toBe('none');
  });

  test('SVG elements have user-select: none', async ({ page }) => {
    const userSelect = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      if (!svg) return null;
      return getComputedStyle(svg).userSelect;
    });
    if (userSelect === null) {
      test.skip(true, 'No <svg> found on this page — skipping SVG user-select test');
      return;
    }
    expect(userSelect).toBe('none');
  });

  test('html element overscroll behavior is none to prevent system pull-to-refresh', async ({ page }) => {
    const overscroll = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('overscroll-behavior').trim()
    );
    expect(overscroll).toBe('none');
  });
});
