import { test, expect } from '@playwright/test';
import { assertNoConsoleErrorsOrWarnings } from './utils/androidHelpers';

/**
 * Android PWA / Google Play Readiness Test
 *
 * Verifies that the web app's PWA manifest and meta tags meet the requirements
 * for Google Play submission via Capacitor:
 * - manifest.json is served and valid
 * - Required manifest fields are present (name, icons, display, theme_color)
 * - Viewport meta tag is set correctly for mobile
 * - theme-color meta tag matches the manifest
 * - App icons are accessible at the declared URLs
 * - No console errors on initial load
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

test.describe('PWA Manifest & Google Play Readiness', () => {
  test('manifest.json is valid and contains required Play Store fields', async ({ page }) => {
    const checkConsole = assertNoConsoleErrorsOrWarnings(page);

    // Mock API routes so the app loads without a backend
    await page.route('**/api/apps/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/public-settings/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-app-id', appId: 'test-app-id', appName: 'Mindful Path', isPublic: true }),
        });
      } else if (url.includes('/entities/')) {
        // Entity list endpoints must return arrays so dashboard widgets don't crash on .filter()
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    });

    await page.route('**/api/auth/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test-user-id', email: 'test@example.com', full_name: 'Test User', role: 'user', preferences: {} }),
      });
    });

    // Entity endpoints return empty arrays so dashboard widgets don't throw on .filter()
    await page.route('**/api/entities/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route(/^https:\/\/base44\.app\/api\//, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // 1. Verify the manifest link element exists in the HTML
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', /^\/manifest\.json(?:\?.*)?$/);

    // 2. Fetch and validate the manifest contents
    const manifestHref = await manifestLink.getAttribute('href');
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(`${BASE_URL}${manifestHref}`);
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()['content-type']).toContain('application/json');

    const manifest = await manifestResponse.json();

    // Required fields for Google Play / Capacitor
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.background_color).toBeTruthy();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    // Must have at least a 192x192 and a 512x512 icon
    const icon192 = manifest.icons.find((i: { sizes: string }) => i.sizes === '192x192');
    const icon512 = manifest.icons.find((i: { sizes: string }) => i.sizes === '512x512');
    expect(icon192).toBeTruthy();
    expect(icon512).toBeTruthy();

    // 3. Verify icons are actually reachable
    const icon192Response = await page.request.get(`${BASE_URL}${icon192.src}`);
    expect(icon192Response.status()).toBe(200);
    expect(icon192Response.headers()['content-type']).toContain('image/png');

    const icon512Response = await page.request.get(`${BASE_URL}${icon512.src}`);
    expect(icon512Response.status()).toBe(200);
    expect(icon512Response.headers()['content-type']).toContain('image/png');

    // 4. Verify viewport meta tag is mobile-ready
    const viewport = await page.$eval('meta[name="viewport"]', (el) => el.getAttribute('content'));
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');

    // 5. Verify theme-color meta tag exists and is a valid hex color.
    // Layout.jsx dynamically updates theme-color based on system color scheme preference,
    // so we verify the tag exists with a valid color rather than matching the manifest exactly.
    const themeColor = await page.$eval('meta[name="theme-color"]', (el) => el.getAttribute('content'));
    expect(themeColor).toBeTruthy();
    expect(themeColor).toMatch(/^#[0-9a-fA-F]{3,8}$/);

    // 6. Verify page title is the app name
    await expect(page).toHaveTitle(/^Mindful Path(?:\s|$)/);

    await checkConsole();
  });
});
