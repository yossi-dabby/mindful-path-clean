import { test, expect } from '@playwright/test';
import { preparePathStage3, assertPathWidth } from '../helpers/pathStage3';

for (const language of ['en', 'he']) for (const width of [360, 768, 1440]) {
  test(`Stage 3 many goals remain reachable ${language}/${width}`, async ({ page }) => {
    test.setTimeout(60000); page.setDefaultTimeout(20000);
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 640 });
    const state = await preparePathStage3(page, { language, theme: 'dark' });
    const source = state.db.Goal[0];
    for (let i = 1; i <= 8; i++) state.db.Goal.push({ ...source, id: `many-${i}`, title: `${source.title} ${i}` });
    await page.goto('/Goals');
    await expect(page.getByTestId('goals-page')).toBeVisible({ timeout: 20000 });
    const last = page.getByRole('heading', { name: `${source.title} 8`, exact: true });
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    await assertPathWidth(page);
  });
  test(`Stage 3 empty pages and manual goal save ${language}/${width}`, async ({ page }) => {
    test.setTimeout(150000); page.setDefaultTimeout(20000);
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 640 });
    const state = await preparePathStage3(page, { language, theme: 'dark', populated: false });
    for (const route of ['Goals', 'Progress', 'MoodTracker', 'Journeys']) {
      await page.goto(`/${route}`);
      const marker = { Goals: 'goals-page', Progress: 'progress-page', MoodTracker: 'mood-tracker', Journeys: 'journeys-page' }[route];
      await expect(page.getByTestId(marker)).toBeVisible({ timeout: 20000 });
      await assertPathWidth(page);
    }
    await page.goto('/Goals');
    await expect(page.getByTestId('goals-page')).toBeVisible();
    if (width < 768) await page.getByRole('button', { name: language === 'he' ? 'עוד פעולות' : 'More actions', exact: true }).click();
    await page.getByRole(width < 768 ? 'menuitem' : 'button', { name: language === 'he' ? 'יצירת מטרת SMART' : 'Create SMART Goal', exact: true }).click();
    const form = page.getByRole('dialog');
    await expect.poll(() => form.evaluate(el => el.contains(document.activeElement))).toBe(true);
    const input = form.locator('input').first();
    const title = 'QA manual goal with a long title '.repeat(4).trim();
    await input.fill(title);
    await form.getByRole('button', { name: language === 'he' ? 'יצירת מטרה' : 'Create Goal', exact: true }).click();
    await expect(form).toHaveCount(0);
    await expect.poll(() => state.db.Goal.length).toBe(1);
    await page.reload();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await assertPathWidth(page);
  });

  test(`Stage 3 Goal Coach retains long input across all steps ${language}/${width}`, async ({ page }) => {
    test.setTimeout(90000); page.setDefaultTimeout(20000);
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 640 });
    const state = await preparePathStage3(page, { language, theme: 'dark', populated: false });
    await page.goto('/GoalCoach');
    await expect(page.getByTestId('goalcoach-step-1')).toBeVisible({ timeout: 20000 });
    await page.locator('[data-testid^="goalcoach-category-"]').first().click();
    await page.getByTestId('goalcoach-next').click();
    const title = 'QA long goal title '.repeat(10).trim();
    await page.getByTestId('goalcoach-title-input').fill(title);
    await page.getByTestId('goalcoach-motivation-input').fill('QA motivation '.repeat(30));
    await page.getByTestId('goalcoach-next').click();
    await page.getByTestId('goalcoach-milestone-title-0').fill('QA milestone');
    await page.getByTestId('goalcoach-next').click();
    await expect(page.getByTestId('goalcoach-step-4')).toContainText(title);
    expect(await page.getByTestId('goalcoach-flow').evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(2);
    await page.getByTestId('goalcoach-back').click();
    await expect(page.getByTestId('goalcoach-milestone-title-0')).toHaveValue('QA milestone');
    await page.getByTestId('goalcoach-next').click();
    const save = page.getByTestId('goalcoach-save');
    await expect(save).toBeInViewport({ ratio: 1 });
    await save.click();
    await expect.poll(() => state.db.Goal.length).toBe(1);
    expect(state.db.Goal[0].title).toBe(title);
    await expect(page).toHaveURL(/\/Home$/);
  });
}
