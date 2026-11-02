/**
 * mockApi MIME / interception contract regression guard
 *
 * Ensures that mockApi (tests/helpers/ui.ts) does not accidentally intercept
 * JS module files or CSS files that Vite serves. If those assets are returned
 * with JSON content-type the browser's strict-MIME-type check will refuse them
 * as module scripts, breaking the app silently in E2E tests.
 *
 * Acceptance criteria:
 *  - No *.js / *.css / Vite asset URL is responded to with application/json.
 *  - Only routes that contain "/api/" in their URL path receive a mocked JSON
 *    response; all other routes must be passed through normally.
 */

import { test, expect } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:5173';

/** File-extension pattern for JS/TS module files and CSS assets. */
const MODULE_FILE_RE = /\.(js|jsx|ts|tsx|mjs|cjs|css)(\?.*)?$/;

test.describe('mockApi – MIME-type contract guard', () => {
  test(
    'mockApi does not serve JS or CSS module files with JSON content-type',
    async ({ page }) => {
      const violations: string[] = [];

      // Register route mocks BEFORE navigation so they are in place when the
      // browser first fetches module scripts.
      await mockApi(page);

      // Attach a response listener to catch any MIME-type mismatches.
      page.on('response', (response) => {
        const url = response.url();
        const contentType = response.headers()['content-type'] ?? '';

        const isModuleFile = MODULE_FILE_RE.test(url);
        const hasJsonContentType =
          contentType.includes('application/json') ||
          contentType.includes('text/json');

        if (isModuleFile && hasJsonContentType) {
          violations.push(
            `MIME violation: ${url} was served with content-type "${contentType}" ` +
              `— expected a JavaScript/CSS MIME type, not JSON`
          );
        }
      });

      // Navigate to root; Vite will load the app's module graph.
      await page.goto(`${BASE_URL}/`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait for the network to settle so all lazy-loaded chunks are fetched.
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      expect(
        violations,
        violations.length > 0
          ? `mockApi incorrectly intercepted ${violations.length} module file(s) with JSON ` +
              `content-type — this would cause a strict-MIME-type browser error:\n` +
              violations.join('\n')
          : ''
      ).toHaveLength(0);
    }
  );

  test(
    'mockApi does not intercept non-API routes with JSON responses',
    async ({ page }) => {
      const unexpectedJson: string[] = [];

      await mockApi(page);

      // Extensions that are never expected to carry JSON from the mock.
      const STATIC_ASSET_RE =
        /\.(js|jsx|ts|tsx|mjs|cjs|css|html|png|jpg|jpeg|svg|ico|woff|woff2|ttf|otf|webp|avif)(\?.*)?$/;

      page.on('response', (response) => {
        const url = response.url();
        const contentType = response.headers()['content-type'] ?? '';

        // Only flag responses that are NOT for an API route AND NOT a known
        // static asset, but still carry a JSON content-type.
        const isApiRoute = url.includes('/api/');
        const isStaticAsset = STATIC_ASSET_RE.test(url);

        if (!isApiRoute && !isStaticAsset && contentType.includes('application/json')) {
          unexpectedJson.push(
            `Non-API route served JSON: ${url} (content-type: "${contentType}")`
          );
        }
      });

      await page.goto(`${BASE_URL}/`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      expect(
        unexpectedJson,
        unexpectedJson.length > 0
          ? `mockApi appears to have intercepted ${unexpectedJson.length} non-API route(s):\n` +
              unexpectedJson.join('\n')
          : ''
      ).toHaveLength(0);
    }
  );

  test(
    'mockApi only responds to requests whose URL path contains /api/',
    async ({ page }) => {
      const mockedUrls: string[] = [];

      await mockApi(page);

      // Intercept fulfilled (non-pass-through) route handler responses.
      // We detect "mocked" responses by checking that they came back with
      // status 200 and application/json but the URL does NOT contain /api/.
      page.on('response', (response) => {
        const url = response.url();
        const contentType = response.headers()['content-type'] ?? '';
        const status = response.status();

        if (
          !url.includes('/api/') &&
          contentType.includes('application/json') &&
          status === 200
        ) {
          mockedUrls.push(url);
        }
      });

      await page.goto(`${BASE_URL}/`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      expect(
        mockedUrls,
        mockedUrls.length > 0
          ? `mockApi returned JSON 200 for ${mockedUrls.length} URL(s) that do not contain "/api/":\n` +
              mockedUrls.join('\n')
          : ''
      ).toHaveLength(0);
    }
  );
});
