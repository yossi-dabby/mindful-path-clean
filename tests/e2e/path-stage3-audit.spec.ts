import { test, expect } from '@playwright/test';
import { preparePathStage3, assertPathWidth } from '../helpers/pathStage3';

for (const language of ['en', 'he']) for (const theme of ['light', 'dark']) for (const width of [360, 768, 1440]) {
  test(`Stage 3 page audit ${language}/${theme}/${width}`, async ({ page }, testInfo) => {
    test.setTimeout(150000);
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 844 });
    await preparePathStage3(page, { language, theme });
    for (const route of ['MyPath', 'Goals', 'Progress', 'MoodTracker', 'StarterPath', 'Journeys', 'GoalCoach']) {
      await page.goto(`/${route}`);
      await expect(page.locator(`[data-app-page-transition][data-app-page-name="${route}"]`)).toBeVisible({ timeout: 20000 });
      await expect(route === 'GoalCoach' ? page.getByTestId('goalcoach-step-1') : page.locator(`[data-app-page-name="${route}"]`).getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20000 });
      await assertPathWidth(page);
      await page.screenshot({ path: testInfo.outputPath(`${route}-${language}-${theme}-${width}.png`) });
    }
  });
}
