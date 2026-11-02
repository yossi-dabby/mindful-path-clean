import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mockApi } from '../helpers/ui';

test.describe.configure({ mode: 'parallel' });

const config = readFileSync('src/pages.config.js', 'utf8');
const pagesBlock = config.split('export const PAGES = {').at(-1)!.split('}')[0];
const appRoutes = [...pagesBlock.matchAll(/"([^"]+)":/g)].map(match => '/' + match[1]);
const routes = [...appRoutes, '/KnowledgeStudio', '/AdminFeatureFlags', '/TherapistTraining',
  '/about', '/privacy', '/terms', '/contact', '/account-deletion',
  '/login', '/register', '/forgot-password', '/reset-password', '/pdf-viewer', '/data-deletion'];
for (const route of routes) {
  test(`premium route layout has no overflow: ${route}`, async ({ page }) => {
    test.setTimeout(90000);
    await mockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem('language', 'he');
      localStorage.setItem('i18nextLng', 'he');
      localStorage.setItem('chat_consent_accepted', 'true');
      localStorage.setItem('age_verified', 'true');
      (window as any).__TEST_APP_ID__ = 'test-app-id';
      (window as any).__DISABLE_ANALYTICS__ = true;
    });
    await page.goto(route);
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 20000 });
    for (const viewport of [{width:360,height:780}, {width:768,height:1024}, {width:1440,height:900}]) {
      await page.setViewportSize(viewport);
      const size = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth
      }));
      expect(size.scroll, route).toBeLessThanOrEqual(size.width + 2);
    }
  });
}
