import { test, expect, type Page, type Locator } from '@playwright/test';
import { preparePathStage3, assertPathWidth, assertPathTextContrast } from '../helpers/pathStage3';
import { getStage11Copy } from '../../src/components/i18n/stage11UiCopy.js';

const labels = {
  en: { more: 'More actions', edit: 'Edit goal', reminders: 'Reminders', addReminder: 'Add reminder', templates: 'Templates', chart: /Show Chart/i, board: /Show Board/i, journal: /Show Journal/i, calendar: 'Calendar', timeline: 'Timeline', adjust: 'AI Adjust', breakdown: /Break Down/i, coach: /Coach/, health: 'Health', mood: 'Mood', logHealth: /Log health data/i },
  he: { more: 'עוד פעולות', edit: 'עריכת המטרה', reminders: 'תזכורות', addReminder: 'הוספת תזכורת', templates: 'תבניות', chart: /הצגה תרשים/, board: /הצגה לוח/, journal: /הצגה יומן/, calendar: 'לוח שנה', timeline: 'ציר זמן', adjust: 'התאמה בעזרת AI', breakdown: /פירוק/, coach: /מאמן/, health: 'בריאות', mood: 'מצב רוח', logHealth: /תיעוד נתוני בריאות/ }
};

async function dialogFits(page: Page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveCount(1);
  await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  const card = dialog.locator('[data-ui="card"]').first();
  const box = await card.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(await card.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(2);
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  return dialog;
}

async function closeDialog(page: Page, opener?: Locator) {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  if (opener) await expect(opener).toBeFocused();
}

for (const language of ['en', 'he'] as const) for (const width of [360, 768, 1440]) {
  const theme = width === 360 ? 'dark' : 'light';
  test(`Stage 3 goal subpages ${language}/${width}`, async ({ page }, info) => {
    test.setTimeout(150000);
    page.setDefaultTimeout(20000);
    const copy = labels[language];
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 640 });
    const state = await preparePathStage3(page, { language, theme });
    await page.goto('/Goals');
    await expect(page.getByTestId('goals-page')).toBeVisible({ timeout: 20000 });
    const card = page.locator('[data-ui="card"]').filter({ has: page.getByRole('heading', { name: state.db.Goal[0].title, exact: true }) });
    const edit = card.getByRole('button', { name: copy.edit, exact: true });
    await edit.click();
    const form = await dialogFits(page);
    const category = form.getByRole('button', { name: language === 'he' ? 'בחירת קטגוריה' : 'Select Category', exact: true });
    await category.click();
    const chooser = page.getByTestId('bottom-sheet-select-options');
    await expect(chooser).toBeVisible();
    const option = chooser.getByRole('option').first();
    await expect.poll(() => option.evaluate(el => { const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); })).toBe(true);
    await page.keyboard.press('Escape');
    await expect(chooser).toBeHidden();
    await expect(form).toBeVisible();
    for (const tab of await form.getByRole('tab').all()) { await tab.click(); await dialogFits(page); }
    await page.screenshot({ path: info.outputPath('goal-form.png') });
    await closeDialog(page, edit);
    expect(state.writes).toEqual([]);

    for (const name of [copy.chart, copy.board, copy.journal]) {
      await card.getByRole('button', { name }).click();
      await assertPathWidth(page);
    }
    await page.screenshot({ path: info.outputPath('goal-expanded.png') });
    for (const name of [copy.adjust, copy.reminders]) {
      const opener = card.getByRole('button', { name, exact: true });
      await opener.click();
      const dialog = await dialogFits(page);
      if (name === copy.reminders) {
        await dialog.getByRole('button', { name: copy.addReminder, exact: true }).click();
        await dialogFits(page);
      } else {
        await dialog.getByRole('button', { name: 'Generate Suggestions', exact: true }).click();
        const milestone = dialog.getByTestId('goal-adjustment-milestone').first();
        await expect(milestone).toBeVisible();
        for (const text of await milestone.locator('p').all()) await assertPathTextContrast(text);
        for (const apply of await dialog.getByRole('button', { name: 'Apply', exact: true }).all()) {
          expect(await apply.evaluate(el => { const range=document.createRange(); range.selectNodeContents(el); return range.getClientRects().length; })).toBe(1);
        }
        await milestone.scrollIntoViewIfNeeded();
      }
      await page.screenshot({ path: info.outputPath(name === copy.reminders ? 'reminders.png' : 'adjustment.png') });
      await closeDialog(page, opener);
    }
    if (width < 768) await page.getByRole('button', { name: copy.more, exact: true }).click();
    await page.getByRole(width < 768 ? 'menuitem' : 'button', { name: copy.calendar, exact: true }).click();
    await assertPathWidth(page);
    await page.getByTestId('goal-calendar').locator('[data-calendar-date="' + state.db.Goal[0].target_date + '"]').click();
    await expect(page.getByTestId('goal-calendar-day')).toContainText(state.db.Goal[0].title);
    if (width < 768) await page.getByRole('button', { name: copy.more, exact: true }).click();
    await page.getByRole(width < 768 ? 'menuitem' : 'button', { name: copy.timeline, exact: true }).click();
    await assertPathWidth(page);
    await page.screenshot({ path: info.outputPath('calendar-timeline.png') });
    const templateOpener = page.getByRole('button', { name: copy.templates, exact: true });
    await templateOpener.click();
    const templates = await dialogFits(page);
    for (const category of await templates.locator('button[aria-pressed]').all()) {
      await category.click();
      await expect(category).toHaveAttribute('aria-pressed', 'true');
    }
    await templates.locator('button[aria-pressed]').first().click();
    await expect(templates.getByRole('button').filter({ has: page.locator('[data-ui="card"]') }).first()).toBeVisible();
    await closeDialog(page, templateOpener);
    for (const name of [copy.breakdown, copy.coach]) {
      const opener = page.getByRole('button', { name }).first();
      await opener.click();
      const dialog = await dialogFits(page);
      if (name === copy.coach) await dialog.getByRole('button', { name: 'Generate Coaching Plan', exact: true }).click();
      await expect(dialog).toContainText('QA sample content');
      if (name === copy.breakdown) await expect(dialog.getByText('QA action description', { exact: true })).toBeVisible();
      if (name === copy.breakdown) {
        const quick = dialog.getByTestId('goal-breakdown-quick-wins');
        await assertPathTextContrast(quick.getByRole('heading'));
        await assertPathTextContrast(quick.locator('li').first());
        for (const text of await dialog.getByTestId('goal-breakdown-obstacle').first().locator('p').all()) await assertPathTextContrast(text);
        for (const text of await dialog.getByTestId('goal-breakdown-milestone').first().locator('p').all()) await assertPathTextContrast(text);
        const close = dialog.getByRole('button', { name: 'Close', exact: true });
        expect(await close.evaluate(el => { const range=document.createRange(); range.selectNodeContents(el); return range.getClientRects().length; })).toBe(1);
        await close.scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('breakdown-results.png') });
      }
      await dialogFits(page);
      await closeDialog(page, opener);
    }
    const ai = getStage11Copy(language).goals;
    await page.getByRole('button', { name: language === 'he' ? 'הצעות AI' : 'AI Suggestions', exact: true }).first().click();
    const suggestions = await dialogFits(page);
    await suggestions.getByRole('button', { name: ai.generate, exact: true }).click();
    await expect(suggestions.getByRole('heading', { name: 'QA suggested goal', exact: true })).toBeVisible();
    await expect(suggestions.getByText('QA suggested description', { exact: true })).toBeVisible();
    await dialogFits(page);
    await closeDialog(page);
  });

  test(`Stage 3 progress and mood tabs ${language}/${width}`, async ({ page }, info) => {
    test.setTimeout(150000);
    page.setDefaultTimeout(20000);
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 640 });
    await preparePathStage3(page, { language, theme });
    await page.goto('/Progress');
    const progress = page.getByTestId('progress-page');
    await expect(progress).toBeVisible({ timeout: 20000 });
    const tabs = progress.locator('.garden-progress-tabs').getByRole('tab');
    await expect(tabs).toHaveCount(6);
    for (const tab of await tabs.all()) {
      await tab.click(); await expect(tab).toHaveAttribute('aria-selected', 'true');
      await assertPathWidth(page);
      // Radix IDs contain colons, which GitHub artifact uploads reject.
      const tabId = (await tab.getAttribute('id') || 'tab').replace(/[^a-zA-Z0-9_-]/g, '_');
      await page.screenshot({ path: info.outputPath(`progress-${tabId}.png`) });
    }
    await page.getByRole('button', { name: labels[language].logHealth }).click();
    const health = await dialogFits(page);
    const lastField = health.locator('textarea');
    await lastField.fill('QA sample only');
    // Long forms allow scrolling; center the last input clear of sticky controls.
    await lastField.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.screenshot({path:info.outputPath('health-last-field.png')});
    await expect(lastField).toBeInViewport({ ratio: 1 });
    await closeDialog(page);
    await page.goto('/MoodTracker');
    await expect(page.getByTestId('mood-tracker')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid="mood-tracker"] .recharts-wrapper').first()).toBeVisible();
    const chartBounds = await page.locator('[data-testid="mood-tracker"] .recharts-wrapper').evaluateAll(charts => {
      const app = document.querySelector('#app-scroll-container')!.getBoundingClientRect();
      return charts.map(chart => { const r=chart.getBoundingClientRect(); return r.left >= app.left - 1 && r.right <= app.right + 1; });
    });
    expect(chartBounds.every(Boolean)).toBe(true);
    const moodTabs = page.getByRole('tab');
    await expect(moodTabs).toHaveCount(3);
    for (const tab of await moodTabs.all()) { await tab.click(); await expect(tab).toHaveAttribute('aria-selected','true'); await assertPathWidth(page); }
    await page.getByTestId('mood-log-button').click();
    await expect(page.getByTestId('mood-entry-dialog')).toBeVisible();
    await dialogFits(page);
    await closeDialog(page);
    await expect(page.getByTestId('mood-entry-dialog')).toBeHidden();
  });
}
