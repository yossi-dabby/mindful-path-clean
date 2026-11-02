import { test, expect } from '@playwright/test';
import { mockApi, waitForAppHydration } from '../helpers/ui';

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:5173';

const PAGES = ['/Resources', '/Home'];

test.describe('Network resilience', () => {
  for (const path of PAGES) {
    test(`app shell remains visible after going offline on ${path}`, async ({
      page,
    }) => {
      await mockApi(page);

      // Load the page while online so all assets are available
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await waitForAppHydration(page);

      // Confirm the app shell is visible while online
      const appShell = page.locator('#app-scroll-container');
      await expect(appShell).toBeVisible({ timeout: 15000 });

      // Simulate going offline — the already-rendered shell must stay visible
      await page.context().setOffline(true);

      await expect(appShell).toBeVisible();
    });
  }
});
