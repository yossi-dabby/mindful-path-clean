import { test, expect, type Page } from '@playwright/test';
import { mockApi } from '../helpers/ui';

async function prepare(page: Page, language = 'en', theme = 'light', width = 390) {
  await page.setViewportSize({ width, height: width === 768 ? 1024 : 900 });
  await mockApi(page);
  await page.addInitScript(({ language, theme }) => {
    localStorage.setItem('language', language); localStorage.setItem('i18nextLng', language); localStorage.setItem('theme', theme);
    (window as any).__TEST_APP_ID__ = 'test-app-id'; (window as any).__DISABLE_ANALYTICS__ = true;
  }, { language, theme });
  const db: Record<string, any[]> = { MoodEntry: [], DailyFlow: [], UserExerciseProgress: [], Exercise: [] };
  const state = { db, failFlow: false, failProgress: false, writes: [] as any[] };
  await page.route(/\/api\/apps\/[^/]+\/entities\/(?:MoodEntry|DailyFlow|UserExerciseProgress|Exercise)(?:[/?]|$)/, async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (/\.(jsx?|tsx?|mjs)$/.test(path)) return route.fallback();
    const match = path.match(/\/entities\/([^/]+)(?:\/([^/]+))?/);
    if (!match || !(match[1] in db)) return route.fallback();
    const [, entity, id] = match, rows = db[entity];
    if (req.method() === 'GET') return route.fulfill({ json: rows });
    const data = req.postDataJSON(); state.writes.push({ entity, data });
    if ((entity === 'DailyFlow' && state.failFlow) || (entity === 'UserExerciseProgress' && state.failProgress)) return route.fulfill({ status: 503, json: { message: 'QA sample failure' } });
    if (entity === 'Exercise') return route.fulfill({ status: 404, json: { message: 'Catalog writes are not user progress' } });
    const row = id ? rows.find(r => r.id === id) : { id: `sample-${entity}` };
    Object.assign(row, data); if (!id) rows.push(row);
    return route.fulfill({ json: row });
  });
  await page.goto('/Home'); await expect(page.getByTestId('daily-path')).toBeVisible();
  return state;
}

for (const language of ['en', 'he']) for (const theme of ['light', 'dark']) for (const width of [390, 768, 1440]) {
  test(`Home saves check-in, recommended built-in progress and reflection ${language}/${theme}/${width}`, async ({ page }) => {
    const state = await prepare(page, language, theme, width);
    const action = page.getByTestId('daily-path-checkin');
    await action.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(state.writes).toEqual([]);
    await action.click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: language === 'he' ? 'בסדר' : 'Okay', exact: true }).click();
    await dialog.locator('textarea').fill('QA sample only');
    const save = dialog.getByRole('button', { name: language === 'he' ? 'שמירת הבדיקה' : 'Save check-in', exact: true });
    state.failFlow = true; await save.click(); await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.locator('textarea')).toHaveValue('QA sample only');
    expect(state.db.MoodEntry).toHaveLength(1);
    state.failFlow = false; await save.click(); await expect(dialog).toHaveCount(0);
    expect(state.db.MoodEntry).toHaveLength(1); expect(state.db.DailyFlow).toHaveLength(1);
    await page.reload(); await expect(page.getByTestId('daily-path-checkin').locator('.lucide-check')).toBeVisible();
    await page.getByTestId('daily-path-action').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(/\/Home$/);
    const favorite = page.getByRole('dialog').locator('button[aria-pressed]');
    await favorite.click(); await expect(favorite).toHaveAttribute('aria-pressed', 'true'); await expect(favorite).toBeEnabled();
    await page.keyboard.press('Escape'); await page.reload(); await page.getByTestId('daily-path-action').click();
    await expect(page.getByRole('dialog').locator('button[aria-pressed]')).toHaveAttribute('aria-pressed', 'true');
    const complete = page.getByRole('button', { name: language === 'he' ? 'סימון כהושלם' : 'Mark as Complete', exact: true });
    state.failProgress = true; await complete.click(); await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
    await expect(page.getByRole('dialog')).not.toContainText('Exercise Completed!');
    state.failProgress = false; state.failFlow = true;
    await complete.click(); await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
    await expect.poll(() => state.db.UserExerciseProgress[0].completed_count).toBe(1);
    state.failFlow = false; await complete.click();
    await expect(page.getByRole('heading', { name: language === 'he' ? 'התבוננות יומית' : 'Daily Reflection', exact: true })).toBeVisible();
    expect(state.db.UserExerciseProgress[0].completed_count).toBe(1);
    await page.getByRole('dialog').locator('textarea').fill('QA reflection only');
    await page.getByRole('button', { name: language === 'he' ? 'סיום ההתבוננות' : 'Complete Reflection', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('status')).toBeVisible();
    expect(state.db.DailyFlow[0]).toMatchObject({ check_in_completed: true, exercise_completed: true, reflection_completed: true, daily_takeaway: 'QA reflection only' });
    expect(state.writes.some(w => w.entity === 'Exercise')).toBe(false);
  });
}

for (const language of ['en', 'he']) test(`Interactive breathing contains focus and contrasts every theme ${language}`, async ({ page }) => {
  await prepare(page, language);
  await page.getByTestId('daily-path-action').click();
  const trigger = page.getByRole('tab', { name: language === 'he' ? 'נשימה' : 'Breathing', exact: true });
  await trigger.click(); const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(page.getByTestId('interactive-breathing-surface')).toHaveCSS('background-image', /linear-gradient/);
  await expect.poll(() => dialog.evaluate(e => e.contains(document.activeElement))).toBe(true);
  for (let i = 0; i < 18; i++) { await page.keyboard.press('Tab'); expect(await dialog.evaluate(e => e.contains(document.activeElement))).toBe(true); }
  for (const index of [0, 1, 5]) {
    await dialog.getByRole('tab').nth(index).click();
    const paint = await page.getByTestId('breathing-countdown').evaluate(e => ({ color: getComputedStyle(e).color, gradient: getComputedStyle(e.parentElement!.parentElement!).backgroundImage }));
    const rgb = (s: string) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const L = (c: number[]) => c.map(x => x/255).map(x => x <= .04045 ? x/12.92 : ((x+.055)/1.055)**2.4).reduce((s,x,i) => s+x*[.2126,.7152,.0722][i],0);
    const stops = paint.gradient.match(/rgb\([^)]+\)/g)!;
    for (let n = 0; n <= 10; n++) {
      const a=rgb(stops[0]), b=rgb(stops[1]), bg=a.map((x,i)=>x+(b[i]-x)*n/10), fg=L(rgb(paint.color)), back=L(bg);
      expect((Math.max(fg,back)+.05)/(Math.min(fg,back)+.05)).toBeGreaterThanOrEqual(3);
    }
  }
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  for (const key of ['Enter', 'Space', 'Enter']) {
    await trigger.press(key);
    await expect(dialog).toHaveCount(1);
    // A mounted dialog can precede Radix's focus/listener effect. Wait for the
    // real keyboard target before sending Escape, as on the initial opening.
    await expect.poll(() => dialog.evaluate(e => e.contains(document.activeElement))).toBe(true);
    // Reopening also exercises the focus trap before dismissal. Autofocus can
    // precede Radix's passive layer registration under a busy CI renderer.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate(e => e.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test('Library completion failure remains visible and successful retry persists progress', async ({ page }) => {
  const state = await prepare(page);
  await page.getByTestId('daily-path-action').click();
  await page.getByRole('heading', { name: '5-4-3-2-1 Sensory Grounding', exact: true, level: 3 }).click();
  const dialog = page.getByRole('dialog');
  state.failProgress = true;
  await dialog.locator('button[aria-pressed]').click(); await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.locator('button[aria-pressed]')).toHaveAttribute('aria-pressed', 'false');
  await dialog.getByRole('button', { name:'Mark as Complete', exact:true }).click();
  await expect(dialog).not.toContainText('Exercise Completed!'); await expect(dialog.getByRole('button', { name:'Mark as Complete', exact:true })).toBeEnabled();
  state.failProgress = false;
  await dialog.getByRole('button', { name:'Mark as Complete', exact:true }).click();
  await expect(dialog).toContainText('Exercise Completed!'); await expect(dialog).toHaveCount(0);
  // A completed practice also appears in Quick Start (h4). Reopen the library
  // card (h3), keeping the locator strict instead of selecting an arbitrary copy.
  await page.reload(); await page.getByRole('heading', { name:'5-4-3-2-1 Sensory Grounding', exact:true, level:3 }).click();
  expect(state.db.UserExerciseProgress[0].completed_count).toBe(1);
  await expect(page.getByRole('dialog')).toContainText('1');
  expect(state.writes.some(w => w.entity === 'Exercise')).toBe(false);
});
