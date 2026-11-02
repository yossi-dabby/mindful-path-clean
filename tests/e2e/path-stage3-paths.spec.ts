import { test, expect } from '@playwright/test';
import { preparePathStage3, assertPathWidth } from '../helpers/pathStage3';

for (const language of ['en', 'he']) for (const width of [360, 768, 1440]) {
  test(`Stage 3 starter and journey progression ${language}/${width}`, async ({ page }, info) => {
    test.setTimeout(150000); page.setDefaultTimeout(20000);
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 640 });
    const state = await preparePathStage3(page, { language, theme: 'dark' });
    state.db.StarterPath.length = 0;
    await page.goto('/StarterPath');
    const setup = page.locator('.premium-overlay');
    // The route first resolves both the path and account preferences.
    await expect(setup).toBeVisible({ timeout: 20000 });
    await setup.getByRole('button', { pressed: false }).first().click();
    await setup.getByRole('button', { name: language === 'he' ? 'המשיכו' : 'Continue', exact: true }).click();
    await setup.getByRole('button', { pressed: false }).first().click();
    await setup.getByRole('button', { name: language === 'he' ? 'חזרה' : 'Back', exact: true }).click();
    await expect(setup.getByRole('button', { pressed: true })).toHaveCount(1);
    await setup.getByRole('button', { name: language === 'he' ? 'המשיכו' : 'Continue', exact: true }).click();
    await expect(setup.getByRole('button', { pressed: true })).toHaveCount(1);
    await page.screenshot({ path: info.outputPath('starter-personalization.png') });
    await setup.getByRole('button', { name: language === 'he' ? 'התחילו את המסלול שלי' : 'Start My Path', exact: true }).click();
    await page.getByTestId('starter-path-begin').click();
    await expect(page.getByTestId('starter-path-example')).toBeVisible();
    await page.getByRole('textbox').fill('QA practice response only');
    await assertPathWidth(page);
    await page.getByRole('button', { name: language === 'he' ? 'השלימו יום 1' : 'Complete Day 1', exact: true }).click();
    await expect.poll(() => state.db.StarterPath[0]?.current_day).toBe(2);
    const completion = page.getByRole('heading', { name: language === 'he' ? 'יום 1 הושלם!' : 'Day 1 Complete!', exact: true });
    await expect(completion).toBeVisible();
    await expect(completion).toBeFocused();
    const summary = page.getByTestId('starter-path-completion');
    await expect(summary.getByText('QA sample content', { exact: true })).toBeVisible();
    await expect(summary.getByText(language === 'he' ? 'חזרו מחר ליום 2' : 'Come back tomorrow for Day 2', { exact: true })).toBeVisible();
    await expect.poll(() => summary.evaluate(el => {
      const bounds = el.getBoundingClientRect();
      const main = document.querySelector('#app-scroll-container')!;
      const style = getComputedStyle(main);
      return bounds.top >= parseFloat(style.paddingTop) - 1 && bounds.bottom <= innerHeight - parseFloat(style.paddingBottom) + 1;
    })).toBe(true);
    await page.screenshot({ path: info.outputPath('starter-complete.png') });
    await page.reload();
    await expect(page.getByTestId('starter-path-begin')).toBeVisible();
    await expect(setup).toHaveCount(0);
    await assertPathWidth(page);

    await page.goto('/Journeys');
    await expect(page.getByTestId('journeys-page')).toBeVisible();
    for (const tab of ['in-progress', 'completed', 'available']) {
      await page.getByTestId(`journeys-tab-${tab}`).click(); await assertPathWidth(page);
    }
    await page.getByTestId('journey-start-journey-qa').click();
    const dialog = page.getByTestId('journey-detail-dialog');
    await expect(dialog).toBeVisible();
    await page.getByTestId('journey-reflection').fill('QA journey reflection only');
    await page.getByTestId('journey-complete-0').click();
    await expect(page.getByTestId('journey-complete-1')).toBeVisible();
    await page.getByTestId('journey-complete-1').click();
    await expect.poll(() => state.db.UserJourneyProgress[0]?.status).toBe('completed');
    await page.screenshot({ path: info.outputPath('journey-complete.png') });
    await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
    await page.getByTestId('journeys-tab-completed').click();
    await expect(page.getByTestId('journey-card-journey-qa')).toBeVisible();
  });
}
