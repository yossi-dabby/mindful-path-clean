import { expect, test } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.E2E_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:5173';

test.describe('Chat mobile welcome-card visibility', () => {
  test.use({ viewport: { width: 365, height: 659 } });

  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem('chat_consent_accepted', 'true');
      localStorage.setItem('age_verified', 'true');
      (window as any).__TEST_APP_ID__ = 'test-app-id';
      (window as any).__DISABLE_ANALYTICS__ = true;
    });
  });

  test('shows the complete welcome and start action on entry without scrolling', async ({ page }) => {
    await page.goto(`${BASE_URL}/Chat`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('[data-page-ready="true"]'));

    const scroller = page.getByTestId('chat-empty-state-scroll');
    const welcome = page.getByTestId('chat-welcome');
    const startButton = page.getByTestId('chat-start-first-session');
    const composer = page.getByTestId('chat-intent-chooser');

    await expect(scroller).toBeVisible();
    await expect(welcome).toBeVisible();
    await expect(welcome).toBeInViewport({ ratio: 1 });
    await expect(startButton).toBeInViewport({ ratio: 1 });
    expect(await scroller.evaluate(el => el.scrollTop)).toBe(0);
    expect(await page.locator('#app-scroll-container').evaluate(el => el.scrollTop)).toBe(0);

    const [scrollerBox, startButtonBox, composerBox] = await Promise.all([
      scroller.boundingBox(),
      startButton.boundingBox(),
      composer.boundingBox(),
    ]);

    expect(scrollerBox).not.toBeNull();
    expect(startButtonBox).not.toBeNull();
    expect(composerBox).not.toBeNull();
    expect(startButtonBox!.y + startButtonBox!.height).toBeLessThanOrEqual(
      scrollerBox!.y + scrollerBox!.height + 1,
    );
    expect(startButtonBox!.y + startButtonBox!.height).toBeLessThanOrEqual(composerBox!.y + 1);
  });
});
