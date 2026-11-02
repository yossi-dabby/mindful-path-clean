import { test, expect, type Page } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const sizes = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }];

async function prepare(page: Page, { language = 'en', theme = 'light', viewport = sizes[0], breathing = false, onboarding = false, notifications = false, loadError = false, longName = false, audio = false, deferFlow = false, deferExercise = false } = {}) {
  let releaseFlow = () => {};
  let releaseExercise = () => {};
  const flowReady = new Promise<void>(resolve => { releaseFlow = resolve; });
  const exerciseReady = new Promise<void>(resolve => { releaseExercise = resolve; });
  const state = { releaseFlow: () => releaseFlow(), releaseExercise: () => releaseExercise(), exerciseRequested: false, failSave: false, failFavorite: false, loadError, exerciseWrites: [] as any[], reflectionWrites: [] as any[] };
  const exercise = { id: 'home-practice-sample', title: language === 'he' ? 'תרגיל דוגמה לבדיקת ממשק בלבד' : 'A sample exercise for interface review', category: breathing ? 'breathing' : 'grounding', difficulty: 'beginner', duration_minutes: 5, duration_options: breathing ? [1, 3, 5] : [], completed_count: 2, total_time_practiced: 0, instructions: 'Sample practice instructions.', favorite: false };
  await page.setViewportSize(viewport);
  await mockApi(page);
  await page.addInitScript(({ language, theme }) => {
    localStorage.setItem('language', language);
    localStorage.setItem('i18nextLng', language);
    localStorage.setItem('theme', theme);
    localStorage.setItem('age_verified', 'true');
    localStorage.setItem('chat_consent_accepted', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  }, { language, theme });
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (/\.(jsx?|tsx?|mjs)$/.test(path)) return route.fallback();
    const entity = path.match(/\/entities\/([^/]+)/)?.[1];
    if (entity === 'User' && req.method() === 'GET') return route.fulfill({ json: { id: 'sample-user', email: 'sample@example.invalid', full_name: longName ? 'Alexandertheodoremaximilianchristopheralexander' : 'Sample Person', onboarding_completed: !onboarding, preferences: { language } } });
    if (state.loadError && req.method() === 'GET' && ['MoodEntry', 'Goal', 'ThoughtJournal', 'DailyFlow'].includes(entity || '')) return route.fulfill({ status: 503, json: { message: 'Sample unavailable' } });
    if (entity === 'DailyFlow') {
      if (req.method() === 'GET') {
        if (deferFlow) await flowReady;
        return route.fulfill({ json: [{ id: 'sample-flow', date: new Date().toISOString().slice(0, 10), check_in_completed: true, exercise_id: exercise.id }] });
      }
      const data = req.postDataJSON();
      if (data.reflection_completed) {
        state.reflectionWrites.push(data);
        if (state.failSave) return route.fulfill({ status: 503, json: { message: 'Sample save failed' } });
      }
      return route.fulfill({ json: { id: 'sample-flow', ...data } });
    }
    if (entity === 'UserExerciseProgress') {
      if (req.method() === 'GET') return route.fulfill({ json: [{ id: 'sample-progress', exercise_id: exercise.id, favorite: exercise.favorite, completed_count: exercise.completed_count, total_time_practiced: exercise.total_time_practiced }] });
      const data = req.postDataJSON();
      state.exerciseWrites.push(data);
      if ('favorite' in data && state.failFavorite) return route.fulfill({ status: 503, json: { message: 'Sample favorite failed' } });
      Object.assign(exercise, data);
      return route.fulfill({ json: { id: 'sample-progress', exercise_id: exercise.id, ...data } });
    }
    if (entity === 'Exercise') {
      if (req.method() !== 'GET') {
        state.exerciseWrites.push(req.postDataJSON());
        if (state.failFavorite) return route.fulfill({ status: 503, json: { message: 'Sample favorite failed' } });
        Object.assign(exercise, req.postDataJSON());
        return route.fulfill({ json: exercise });
      }
      state.exerciseRequested = true;
      if (deferExercise) await exerciseReady;
      return route.fulfill({ json: [exercise] });
    }
    if (entity === 'AudioContent') return route.fulfill({ json: audio ? [{ id: 'sample-audio', title: 'Sample audio', description: 'Sample only', type: 'guided', duration_minutes: 5, background_music: true, audio_url: '/sample-audio.mp3' }] : [] });
    if (entity === 'AppNotification') return route.fulfill({ json: notifications ? Array.from({ length: 6 }, (_, index) => ({ id: `sample-${index}`, title: 'LongUnbrokenNotificationTitle'.repeat(8), message: 'A sample notification message for keyboard and layout review.', action_url: '/Goals', created_date: new Date().toISOString(), is_read: false, type: 'goal_reminder' })) : [] });
    return route.fallback();
  });
  await page.goto('/Home');
  await expect(page.getByTestId(onboarding ? 'onboarding-flow' : 'daily-path')).toBeVisible();
  return state;
}

async function assertFocusContained(page: Page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  // Radix restores focus in a deferred unmount callback. Visibility can return
  // before that callback runs; wait for focus, then check every Tab immediately.
  await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
}

async function assertNoClipping(page: Page, selector: string) {
  const failures = await page.locator(selector).evaluateAll(elements => elements.filter(el => {
    const r = el.getBoundingClientRect();
    return r.width && r.height && (el.scrollWidth > el.clientWidth + 2 || r.left < -1 || r.right > innerWidth + 1);
  }).map(el => el.textContent?.trim()));
  expect(failures).toEqual([]);
}

for (const language of ['en', 'he']) for (const theme of ['light', 'dark']) for (const viewport of sizes) {
  test(`Home practice supports focus, favorites, reflection and retry ${language}/${theme}/${viewport.width}`, async ({ page }) => {
    const state = await prepare(page, { language, theme, viewport });
    const action = page.getByTestId('daily-path-action');
    await action.click();
    const dialog = page.getByRole('dialog');
    await assertFocusContained(page);
    await assertNoClipping(page, '[role="dialog"] h3, [role="dialog"] button');
    const favorite = dialog.locator('button[aria-pressed]');
    await favorite.click();
    await expect(favorite).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => state.exerciseWrites).toEqual([{ favorite: true }]);
    state.failFavorite = true;
    await favorite.click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(favorite).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(action).toBeFocused();
    await action.click();
    await dialog.getByRole('button', { name: language === 'he' ? 'סימון כהושלם' : 'Mark as Complete', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: language === 'he' ? 'התבוננות יומית' : 'Daily Reflection', exact: true })).toBeVisible();
    await assertFocusContained(page);
    if (language === 'he') await expect(dialog).not.toContainText(/Daily Reflection|Choose one focus|Complete Reflection|Controlled breathing/);
    const selected = dialog.locator('button[aria-pressed]').first();
    await selected.click();
    await expect(selected).toHaveAttribute('aria-pressed', 'true');
    const input = dialog.locator('textarea');
    await input.fill(language === 'he' ? 'תובנת דוגמה שנשמרת בזמן כשל' : 'Sample reflection retained after failure');
    state.failSave = true;
    const save = dialog.getByRole('button', { name: language === 'he' ? 'סיום ההתבוננות' : 'Complete Reflection', exact: true });
    await save.click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(input).not.toHaveValue('');
    state.failSave = false;
    await save.click();
    await expect(dialog.getByRole('status')).toBeVisible();
    expect(state.reflectionWrites.at(-1).daily_takeaway).toContain(language === 'he' ? 'תובנת דוגמה' : 'Sample reflection');
    await expect(dialog).toBeHidden({ timeout: 5000 });
  });
}

for (const language of ['en', 'he']) for (const theme of ['light', 'dark']) {
  test(`Home breathing is above mobile chrome and returns on Escape ${language}/${theme}`, async ({ page }) => {
    await prepare(page, { language, theme, breathing: true });
    await page.getByTestId('daily-path-action').click();
    await page.getByRole('tab').nth(1).click();
    const durationButton = page.locator('.premium-overlay .grid.grid-cols-2 button').first();
    await durationButton.click();
    const dialog = page.getByRole('dialog');
    const close = dialog.getByRole('button', { name: language === 'he' ? 'סגירת תרגיל הנשימה' : 'Close breathing exercise', exact: true });
    await expect(close).toBeInViewport({ ratio: 1 });
    expect(await close.evaluate(el => {
      const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return el === hit || el.contains(hit);
    })).toBe(true);
    await assertFocusContained(page);
    await dialog.getByRole('button', { name: language === 'he' ? 'התחל' : 'Start', exact: true }).click();
    await dialog.getByRole('button', { name: language === 'he' ? 'השהה' : 'Pause', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tab').first()).toBeVisible();
    await expect(durationButton).toBeFocused();
    await assertFocusContained(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test(`Home notifications wrap and fit landscape ${language}/${theme}`, async ({ page }) => {
    await prepare(page, { language, theme, viewport: { width: 844, height: 390 }, notifications: true });
    await page.getByTestId('notification-bell').filter({ visible: true }).first().click();
    const panel = page.getByTestId('notification-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('role', 'dialog');
    const box = await panel.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(390);
    await assertNoClipping(page, '[data-testid="notification-panel"] a, [data-testid="notification-panel"] button');
    const link = panel.getByRole('link').first();
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/Goals$/);
  });
}

for (const language of ['en', 'he']) for (const width of [360, 390]) {
  test(`Home 200% text preserves mobile chrome ${language}/${width}`, async ({ page }) => {
    await prepare(page, { language, viewport: { width, height: 844 }, longName: true });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await expect.poll(() => page.locator('[data-mobile-header]').evaluate(el => Math.abs(el.getBoundingClientRect().height - parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mobile-header-height'))))).toBeLessThan(1);
    await assertNoClipping(page, '[data-mobile-header] button, .botanical-home-hero h1');
    // Enlarged labels keep complete words; a short horizontal scroll exposes
    // every tab instead of clipping text or reducing the requested font size.
    for (const tab of await page.locator('[data-mobile-bottom-nav] a').all()) {
      await tab.focus();
      await expect(tab).toBeInViewport({ ratio: 0.99 });
      expect(await tab.evaluate(el => el.scrollWidth <= el.clientWidth + 2)).toBe(true);
    }
    const support = page.getByTestId('persistent-human-support');
    await expect(support).toHaveCSS('position', 'static');
    await support.scrollIntoViewIfNeeded();
    await expect(support).toBeInViewport({ ratio: 0.99 });
    expect(await page.locator('#app-scroll-container').evaluate(el => parseFloat(getComputedStyle(el).paddingTop) >= document.querySelector('[data-mobile-header]')!.getBoundingClientRect().height)).toBe(true);
  });
}

test('Home displays a visible data failure and retries it', async ({ page }) => {
  const state = await prepare(page, { loadError: true });
  await expect(page.getByRole('alert').filter({ hasText: 'Some of your activity' })).toBeVisible({ timeout: 15000 });
  state.loadError = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).first().click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

async function paintedContrast(page: Page, selector: string) {
  return page.locator(selector).evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().width > 0).map(el => {
    const rgb = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
    const luminance = (c: number[]) => c.slice(0, 3).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
    const parents: Element[] = [];
    for (let parent: Element | null = el; parent; parent = parent.parentElement) parents.unshift(parent);
    let bg = [255, 255, 255];
    for (const parent of parents) {
      const c = rgb(getComputedStyle(parent).backgroundColor), a = c[3] ?? 1;
      if (c.length >= 3) bg = bg.map((x, i) => c[i] * a + x * (1 - a));
    }
    const fg = rgb(getComputedStyle(el).color), a = fg[3] ?? 1;
    const l = luminance(fg.slice(0, 3).map((x, i) => x * a + bg[i] * (1 - a))), b = luminance(bg);
    return { text: el.textContent?.trim(), ratio: (Math.max(l, b) + .05) / (Math.min(l, b) + .05) };
  }));
}

for (const theme of ['light', 'dark']) test(`Home practice text contrast and Escape for reflection ${theme}`, async ({ page }) => {
  await prepare(page, { theme, viewport: sizes[2] });
  await page.locator('.garden-nav-link[href="/Home"]').hover();
  for (const result of await paintedContrast(page, '.garden-nav-link[href="/Home"] p')) expect(result.ratio, result.text).toBeGreaterThanOrEqual(4.5);
  await page.getByTestId('daily-path-action').click();
  for (const result of await paintedContrast(page, '[role="dialog"] .text-2xl.font-bold')) expect(result.ratio, result.text).toBeGreaterThanOrEqual(3);
  await page.getByRole('button', { name: 'Mark as Complete', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Daily Reflection', exact: true })).toBeVisible();
  for (const result of await paintedContrast(page, '[role="dialog"] button[aria-pressed] > span:last-child')) expect(result.ratio, result.text).toBeGreaterThanOrEqual(4.5);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

for (const viewport of [sizes[0], sizes[1]]) test(`Home linked audio controls are localized and named ${viewport.width}`, async ({ page }) => {
  await prepare(page, { language: 'he', theme: 'dark', viewport, audio: true });
  await page.getByTestId('daily-path-action').click();
  await page.getByRole('tab', { name: 'אודיו', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('slider', { name: 'מיקום הניגון' })).toBeVisible();
  await expect(dialog.getByRole('slider', { name: 'עוצמת קול' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'ניגון', exact: true })).toBeVisible();
  await expect(dialog).not.toContainText(/Includes calming background music|Add to favorites|Skip forward/);
  await assertNoClipping(page, '[role="tabpanel"][data-state="active"] button');
});

test('Home route announcements preserve keyboard focus in notifications', async ({ page }) => {
  await prepare(page, { viewport: { width: 844, height: 390 }, notifications: true });
  const announcer = page.locator('[data-a11y-route-announcer]');
  await expect(announcer).not.toBeEmpty();
  await page.getByTestId('notification-bell').filter({ visible: true }).first().click();
  const link = page.getByTestId('notification-panel').getByRole('link').first();
  await link.focus();
  await expect(link).toBeFocused();

  // A profile/heading update can settle after the user opens a portal. The
  // new announcement must not move their focus away from the chosen action.
  const updatedHeading = 'A refreshed home heading';
  await page.locator('.botanical-home-hero h1').evaluate((el, value) => { el.textContent = value; }, updatedHeading);
  await expect(announcer).toHaveText(updatedHeading);
  await expect(link).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/Goals$/);
});

test('Home waits for both recommendation requests before opening the useful action', async ({ page }) => {
  const state = await prepare(page, { deferFlow: true, deferExercise: true });
  const action = page.getByTestId('daily-path-action');
  await expect(action).toBeDisabled();
  await expect(action).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByTestId('daily-path-checkin')).toBeEnabled();
  await expect(page.getByTestId('daily-path-coach')).toBeEnabled();

  state.releaseFlow();
  await expect.poll(() => state.exerciseRequested).toBe(true);
  await expect(action).toBeDisabled();
  await expect(action).toHaveAttribute('aria-busy', 'true');

  state.releaseExercise();
  await expect(action).toBeEnabled();
  await expect(action).not.toHaveAttribute('aria-busy', 'true');
  await action.click();
  await expect(page.getByRole('dialog', { name: 'A sample exercise for interface review', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/Home$/);
});
