import { test, expect, type Page } from '@playwright/test';
import { mockApi } from '../helpers/ui';

test.describe.configure({ mode: 'parallel' });

async function setup(page: Page, language = 'en', theme = 'light', width = 390, height = 844) {
  await page.setViewportSize({ width, height });
  await mockApi(page);
  await page.addInitScript(({ language, theme }) => {
    localStorage.setItem('language', language); localStorage.setItem('i18nextLng', language); localStorage.setItem('theme', theme);
    (window as any).__TEST_APP_ID__ = 'test-app-id'; (window as any).__DISABLE_ANALYTICS__ = true;
  }, { language, theme });
  const date = new Date().toISOString().slice(0, 10);
  const db: Record<string, any[]> = {
    MoodEntry: [{ id: 'today-mood', date, mood: 'good', energy_level: 'moderate', stress_level: 3, notes: 'QA saved check-in', created_date: `${date}T10:00:00Z` }],
    DailyFlow: [{ id: 'today-flow', date, check_in_completed: true, exercise_completed: true, reflection_completed: true, key_insight: 'QA saved insight', daily_takeaway: 'QA saved reflection' }],
    UserExerciseProgress: [{ id: 'progress', exercise_id: 'builtin-grounding-54321', completed_count: 4, favorite: true }],
    AppNotification: [], Playlist: [{ id: 'playlist', name: 'QA playlist', description: 'QA description', video_count: 0 }], PlaylistVideo: [], Video: [], VideoProgress: [],
  };
  const writes: any[] = [];
  await page.route(/\/api\/apps\/[^/]+\/entities\/(?:MoodEntry|DailyFlow|UserExerciseProgress|AppNotification|Playlist|PlaylistVideo|Video|VideoProgress)(?:[/?]|$)/, async route => {
    const req = route.request(), url = new URL(req.url());
    const match = url.pathname.match(/\/entities\/([^/]+)(?:\/([^/]+))?/)!;
    const [, entity, id] = match;
    if (req.method() === 'GET') {
      const q = JSON.parse(url.searchParams.get('q') || '{}');
      let rows = db[entity].filter(r => Object.entries(q).every(([k, v]) => r[k] === v));
      const sort = url.searchParams.get('sort');
      if (sort) { const key = sort.replace(/^-/, ''); rows = [...rows].sort((a,b) => String(a[key] || '').localeCompare(String(b[key] || '')) * (sort.startsWith('-') ? -1 : 1)); }
      const skip = Number(url.searchParams.get('skip') || 0), limit = Number(url.searchParams.get('limit') || 1000);
      return route.fulfill({ json: rows.slice(skip, skip + limit) });
    }
    const data = req.method() === 'DELETE' ? null : req.postDataJSON();
    writes.push({ entity, id, method: req.method(), data });
    if (req.method() === 'DELETE') { db[entity] = db[entity].filter(r => r.id !== id); return route.fulfill({ json: { success: true } }); }
    const row = id ? db[entity].find(r => r.id === id) : { id: `new-${entity}-${writes.length}`, created_by: 'test@example.com', created_date: new Date().toISOString() };
    Object.assign(row, data); if (!id) db[entity].push(row);
    return route.fulfill({ json: row });
  });
  return { db, writes, date };
}

for (const language of ['en', 'he']) for (const width of [333, 768, 1440]) {
  test(`Daily records review, edit, cancel and reset preserve exercise progress ${language}/${width}`, async ({ page }) => {
    const state = await setup(page, language, width === 768 ? 'dark' : 'light', width);
    await page.goto('/Home');
    const trigger = page.getByTestId('open-daily-records');
    await trigger.click(); const history = page.getByTestId('daily-records-dialog');
    const day = history.getByTestId('daily-record-day'); await day.locator('summary').click();
    await expect(history).not.toContainText('home_practice.');
    await expect(history).toContainText('QA saved check-in'); await expect(history).toContainText('QA saved insight'); await expect(history).toContainText('QA saved reflection');
    const open = history.getByRole('button', { name: language === 'he' ? 'פתיחת ההתבוננות' : 'Open reflection', exact: true });
    await open.click(); let reflection = page.getByRole('dialog').filter({ has: page.locator('textarea') });
    await expect(reflection.locator('textarea')).toHaveValue('QA saved reflection');
    await reflection.locator('textarea').fill('QA cancelled edit'); await page.keyboard.press('Escape');
    await expect(open).toBeFocused(); expect(state.writes).toEqual([]);
    await open.click(); reflection = page.getByRole('dialog').filter({ has: page.locator('textarea') });
    await expect(reflection.locator('textarea')).toHaveValue('QA saved reflection');
    await reflection.locator('textarea').fill('QA updated reflection');
    await reflection.getByRole('button', { name: language === 'he' ? 'שמירת השינויים' : 'Save changes', exact: true }).click();
    await expect(page.getByRole('dialog', { name: language === 'he' ? 'התבוננות יומית' : 'Daily Reflection', exact:true }).getByRole('status')).toBeVisible(); await expect(open).toBeFocused();
    await expect(history).toContainText('QA updated reflection');
    const reset = history.getByRole('button', { name: language === 'he' ? 'איפוס הרשומות של היום' : 'Reset today’s entries', exact: true });
    await reset.click(); const confirm = history.getByTestId('daily-records-confirm-delete');
    const cancel = confirm.getByRole('button', { name: language === 'he' ? 'ביטול' : 'Cancel', exact: true });
    await expect(cancel).toBeFocused(); await cancel.click(); await expect(reset).toBeFocused();
    expect(state.writes.filter(w => w.method === 'DELETE')).toHaveLength(0);
    await reset.click(); await confirm.getByRole('button', { name: language === 'he' ? 'מחיקת הרשומות' : 'Delete entries', exact: true }).click();
    await expect(confirm).toHaveCount(0);
    await expect(history.getByRole('status')).toBeVisible();
    await expect(history.getByTestId('daily-record-day')).toHaveCount(0);
    expect(state.db.MoodEntry).toEqual([]); expect(state.db.DailyFlow).toEqual([]);
    expect(state.db.UserExerciseProgress[0]).toMatchObject({ completed_count: 4, favorite: true });
    expect(state.writes.some(w => w.entity === 'UserExerciseProgress')).toBe(false);
    await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
    await page.reload(); await trigger.click(); await expect(history.getByTestId('daily-record-day')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveJSProperty('scrollWidth', await page.getByRole('dialog').evaluate(e => e.clientWidth));
  });
}

test('Daily history pages through earlier dates and edits the selected historic flow', async ({ page }) => {
  const state = await setup(page);
  for (let n = 1; n <= 28; n++) {
    const date = new Date(Date.now() - n * 86400000).toISOString().slice(0,10);
    state.db.DailyFlow.push({ id: `older-${n}`, date, exercise_completed: true, reflection_completed: true, daily_takeaway: `QA earlier ${n}`, key_insight: `QA insight ${n}` });
  }
  await page.goto('/Home'); await page.getByTestId('open-daily-records').click();
  const history = page.getByTestId('daily-records-dialog'); await expect(history.getByTestId('daily-record-day')).toHaveCount(25);
  await history.getByRole('button', { name: 'Load earlier records' }).click(); await expect(history.getByTestId('daily-record-day')).toHaveCount(29);
  const day = history.getByTestId('daily-record-day').last(); await day.locator('summary').click(); await day.getByRole('button', { name: 'Open reflection' }).click();
  const reflection = page.getByRole('dialog').filter({ has: page.locator('textarea') }); await expect(reflection.locator('textarea')).toHaveValue('QA earlier 28');
  await reflection.locator('textarea').fill('QA edited historic flow'); await reflection.getByRole('button', { name:'Save changes', exact:true }).click();
  await expect.poll(() => state.db.DailyFlow.find(r => r.id === 'older-28').daily_takeaway).toBe('QA edited historic flow');
  expect(state.db.DailyFlow[0].daily_takeaway).toBe('QA saved reflection');
});

for (const language of ['en','he']) for (const size of [{width:320,height:568}, {width:333,height:597}, {width:390,height:844}, {width:844,height:390}, {width:768,height:1024}, {width:1440,height:900}]) for (const theme of ['light','dark']) {
  test(`Breathing selector stays in one row and circle clears controls ${language}/${theme}/${size.width}`, async ({ page }) => {
    await setup(page, language, theme, size.width, size.height); await page.goto('/Exercises');
    await page.getByRole('tab', { name: language === 'he' ? 'נשימה' : 'Breathing', exact:true }).click();
    const surface = page.getByTestId('interactive-breathing-surface'), circle = page.getByTestId('breathing-circle');
    await expect(circle).toBeVisible();
    await expect(surface.locator('.interactive-breathing-practice')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const bounds = await surface.evaluate(e => {
      const box = (selector: string) => { const r = e.querySelector(selector)!.getBoundingClientRect(); return { x:r.x,y:r.y,right:r.right,bottom:r.bottom }; };
      return {circle:box('.breathing-circle'), controls:box('.breathing-session-controls'), selector:box('.breathing-session-selector'), tabs:[...e.querySelectorAll('[role="tab"]')].map(e => e.getBoundingClientRect().y), header:box('.breathing-session-header'), client:e.clientWidth, scroll:e.scrollWidth};
    });
    expect(new Set(bounds.tabs).size).toBe(1); expect(bounds.selector.bottom).toBeLessThanOrEqual(bounds.circle.y);
    expect(bounds.circle.x).toBeGreaterThanOrEqual(0); expect(bounds.circle.right).toBeLessThanOrEqual(size.width);
    expect(bounds.circle.bottom <= bounds.controls.y || bounds.circle.right <= bounds.controls.x || bounds.controls.right <= bounds.circle.x).toBe(true);
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 1);
    const start = surface.locator('.breathing-session-controls button').first(); await start.scrollIntoViewIfNeeded(); await expect(start).toBeInViewport(); await start.click();
    await expect(circle).toBeInViewport({ ratio: 1 });
    const after = await circle.boundingBox(), header = await surface.locator('.breathing-session-header').boundingBox();
    expect(after!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    await expect(surface.getByTestId('breathing-countdown')).toBeVisible();
    await page.screenshot({ path:`test-results/stage1-breathing-${language}-${theme}-${size.width}.png` });
  });
}

for (const language of ['en','he']) test(`Notification preview belongs to current account and can be removed ${language}`, async ({ page }) => {
  const state = await setup(page, language); await page.goto('/Settings');
  await page.getByTestId('send-notification-preview').click();
  await expect.poll(() => state.db.AppNotification.length).toBe(1);
  const write = state.writes.find(w => w.entity === 'AppNotification');
  expect(write.data).not.toHaveProperty('created_by'); expect(write.data).toMatchObject({ email_sent: false, is_read: false, action_url: '/Home' });
  expect(state.db.AppNotification[0].created_by).toBe('test@example.com');
  await page.getByRole('banner').getByRole('button', { name: language === 'he' ? 'התראות' : 'Notifications', exact:true }).click();
  await expect(page.getByText(language === 'he' ? 'התראת הבדיקה שלכם הגיעה' : 'Your test notification is here', {exact:true})).toBeVisible();
  await page.getByRole('button', { name: language === 'he' ? 'מחיקת התראה' : 'Delete notification', exact:true }).click();
  await expect.poll(() => state.db.AppNotification.length).toBe(0);
  expect(state.writes.some(w => w.entity !== 'AppNotification')).toBe(false);
});

for (const language of ['en','he']) for (const width of [390,768,1440]) test(`Media pages share readable headers and playlist form ${language}/${width}`, async ({ page }) => {
  const { db } = await setup(page, language, 'dark', width);
  db.Playlist[0].name = `QA playlist ${'LongTitle'.repeat(15)}`;
  for (const path of ['/Exercises','/Videos','/Playlists','/PlaylistDetail?id=playlist','/VideoPlayer?videoUrl=%2Fqa.mp4&title=QA%20video']) {
    await page.goto(path); const header = page.getByTestId('library-page-header'); await expect(header).toBeVisible();
    await expect(header.getByRole('heading', {level:1})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    if (path === '/Playlists') {
      const title = page.getByRole('heading', {level:3});
      await expect(title).toBeVisible();
      expect(await title.evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
      const remove = page.getByRole('button', { name: language === 'he' ? 'מחק רשימה' : 'Delete playlist', exact:true });
      await expect(remove).toHaveCSS('opacity', '1');
    }
    if (path === '/Videos') {
      await header.getByRole('button', { name: language === 'he' ? 'חדש' : 'New', exact:true }).click();
      const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('textbox').first()).toHaveAccessibleName(language === 'he' ? 'שם רשימת הצפייה *' : 'Playlist name *');
      await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
    }
  }
});
