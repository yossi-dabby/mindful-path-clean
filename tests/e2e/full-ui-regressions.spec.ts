import { test, expect } from '@playwright/test';
import { mockApi } from '../helpers/ui';

async function prepare(page, route: string) {
  await mockApi(page);
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('age_verified', 'true');
    localStorage.setItem('chat_consent_accepted', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  });
  await page.goto(route);
}

for (const populated of [false, true]) test(`health form escapes filtered progress cards (${populated ? 'populated' : 'empty'})`, async ({ page }) => {
  await prepare(page, '/Progress');
  if (populated) await page.route('**/entities/HealthMetric**', route => route.fulfill({ json: [{ id: 'sample-health', date: '2026-10-26', sleep_hours: 7, steps: 6000, heart_rate_avg: 72 }] }));
  await page.getByRole('tab', { name: 'Health', exact: true }).click();
  await page.getByRole('button', { name: /Log health data/i }).click();
  const form = page.getByTestId('health-form-dialog');
  await expect(form).toBeVisible();
  const title = form.locator('#health-form-title');
  await expect(title).toBeInViewport({ ratio: 1 });
  await expect(form.getByRole('button', { name: 'Close', exact: true })).toBeInViewport({ ratio: 1 });
  expect(await form.evaluate(el => el.parentElement === document.body)).toBe(true);
  await form.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(form).toBeHidden();
});

test('goal wizard reveals the new step after scrolling a long previous step', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  await prepare(page, '/GoalCoach');
  await page.getByTestId('goalcoach-category-behavioral-other').click();
  await page.getByTestId('goalcoach-next').click();
  await page.getByTestId('goalcoach-title-input').fill('A small sample goal');
  await page.getByTestId('goalcoach-motivation-input').fill('Sample motivation');
  await page.getByTestId('goalcoach-description-input').fill('Sample details');
  const scroll = page.getByTestId('coach-step-scroll');
  await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
  expect(await scroll.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await page.getByTestId('goalcoach-next').click();
  await expect(page.getByTestId('goalcoach-step-3').locator('h2')).toBeInViewport({ ratio: 1 });
  expect(await scroll.evaluate(el => el.scrollTop)).toBe(0);
});

test('missing exercise id does not request an arbitrary exercise', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', r => { if (r.url().includes('/entities/Exercise')) requests.push(r.url()); });
  await prepare(page, '/ExerciseView');
  await expect(page.getByText('Exercise not found', { exact: true })).toBeVisible();
  expect(requests).toEqual([]);
});

test('missing playlist id offers a return instead of an indefinite loading message', async ({ page }) => {
  await prepare(page, '/PlaylistDetail');
  await expect(page.getByText('Playlist not found.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Back to Playlists/i }).click();
  await expect(page).toHaveURL(/\/Playlists$/);
});

test('journey actions fit a narrow desktop card without clipped labels', async ({ page }) => {
  await prepare(page, '/Home');
  const journeys = Array.from({ length: 3 }, (_, i) => ({
    id: `audit-journey-${i}`, title: 'A calm sample journey', description: 'Sample only',
    language: 'en', is_active: true, category: 'anxiety', difficulty: 'beginner', duration_days: 2,
    steps: [{ day: 1, title: 'One small step', game_slug: 'thought-quiz' }]
  }));
  await page.route('**/entities/Journey**', route => route.fulfill({ json: journeys }));
  await page.route('**/entities/UserJourneyProgress**', route => route.fulfill({ json: journeys.map(j => ({
    id: `progress-${j.id}`, journey_id: j.id, status: 'in_progress', current_step: 0, completed_steps: []
  })) }));
  await page.setViewportSize({ width: 1363, height: 936 });
  await page.goto('/Journeys');
  await page.getByRole('tab', { name: /In Progress/i }).click();
  const card = page.getByTestId('journey-card-audit-journey-0');
  await expect(card).toBeVisible();
  for (const id of ['journey-restart-audit-journey-0', 'journey-remove-audit-journey-0']) {
    const action = page.getByTestId(id);
    expect(await action.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    const b = await action.boundingBox();
    const c = await card.boundingBox();
    expect(b!.x).toBeGreaterThanOrEqual(c!.x);
    expect(b!.x + b!.width).toBeLessThanOrEqual(c!.x + c!.width);
  }
});

test('tablet premium cards keep their actions inside each card', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await prepare(page, '/AdvancedAnalytics');
  const actions = page.getByRole('button', { name: /Go Premium/i });
  await expect(actions.first()).toBeVisible();
  for (const action of await actions.all()) {
    expect(await action.evaluate(el => {
      const a = el.getBoundingClientRect();
      const card = el.closest('[data-ui="card"]')!.getBoundingClientRect();
      return Math.max(card.left - a.left, a.right - card.right, el.scrollWidth - el.clientWidth);
    })).toBeLessThanOrEqual(1);
  }
});

test('PDF without a file explains the state and offers a close action', async ({ page }) => {
  await prepare(page, '/pdf-viewer');
  await expect(page.getByRole('heading', { name: 'PDF unavailable' })).toBeVisible();
  await expect(page.getByText('No file was selected. Close this viewer and open a document from the app.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
});


test('new-user onboarding covers navigation and keeps keyboard focus inside', async ({ page }) => {
  await prepare(page, '/Home');
  await page.route('**/entities/User/me', route => route.fulfill({ json: {
    id: 'new-sample-user', email: 'sample@example.invalid', full_name: 'Sample user',
    onboarding_completed: false
  } }));
  await page.reload();
  const flow = page.getByTestId('onboarding-flow');
  await expect(flow).toBeVisible();
  expect(await flow.evaluate(el => el.parentElement === document.body)).toBe(true);
  await expect(flow.locator('h1')).toBeInViewport({ ratio: 1 });
  expect(await flow.evaluate(el => {
    const topElement = document.elementFromPoint(20, 20);
    return topElement === el || el.contains(topElement);
  })).toBe(true);
  await flow.locator('button[aria-pressed]').first().click();
  const last = flow.getByRole('link', { name: 'Human support', exact: true });
  await expect(last).toHaveAttribute('href', '/contact');
  await last.focus();
  await page.keyboard.press('Tab');
  expect(await flow.evaluate(el => el.contains(document.activeElement))).toBe(true);
  for (const title of ['How are you feeling right now?', 'What kind of support fits you today?', 'Your first step is ready']) {
    await flow.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(flow.getByRole('heading', { name: title, exact: true })).toBeVisible();
    if (title !== 'Your first step is ready') await flow.locator('button[aria-pressed]').first().click();
  }
});
