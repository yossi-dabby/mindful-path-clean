import { test, expect } from '@playwright/test';
import { preparePathStage3, assertPathWidth } from '../helpers/pathStage3';

for (const language of ['en', 'he']) {
  test(`Stage 3 final starter day keeps its completion summary ${language}`, async ({ page }, info) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: language === 'he' ? 768 : 360, height: language === 'he' ? 1024 : 640 });
    const state = await preparePathStage3(page, { language, theme: 'dark' });
    state.db.StarterPath[0].current_day = 7;
    await page.goto('/StarterPath');
    const begin = page.getByTestId('starter-path-begin');
    await expect(begin).toBeVisible({ timeout: 20000 });
    await begin.click();
    await page.getByRole('textbox').fill('QA final day reflection only');
    await page.getByRole('button', { name: language === 'he' ? 'השלימו יום 7' : 'Complete Day 7', exact: true }).click();
    const summary = page.getByTestId('starter-path-completion');
    await expect(summary.getByRole('heading', { name: language === 'he' ? 'יום 7 הושלם!' : 'Day 7 Complete!', exact: true })).toBeFocused();
    await expect(summary.getByText(language === 'he' ? 'השלמתם את מסלול 7 הימים! המשיכו עם התרגול היומי שלכם.' : "You've completed the 7-Day Starter Path! Continue with your daily practice.", { exact: true })).toBeVisible();
    expect(state.db.StarterPath[0]).toMatchObject({ current_day: 7, completed: true, day_exercises: { 7: 'QA final day reflection only' } });
    await assertPathWidth(page);
    await page.screenshot({ path: info.outputPath('starter-all-complete.png') });
    await summary.getByRole('button', { name: language === 'he' ? 'חזרה לדף הבית' : 'Return Home', exact: true }).click();
    await expect(page).toHaveURL(/\/Home$/);
  });
}
