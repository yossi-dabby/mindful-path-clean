import { expect, test, type Page, type Route } from '@playwright/test';
import { mockApi, setupHebrewMode, spaNavigate } from '../helpers/ui';

const journey = {
  id: 'journey-calm',
  language: 'en',
  title: 'A calm journey',
  description: 'English source content must never appear in Hebrew mode.',
  duration_days: 2,
  category: 'anxiety',
  difficulty: 'beginner',
  is_active: true,
  outcomes: ['Notice stress responses', 'Choose a helpful response'],
  steps: [
    {
      day: 1,
      title: 'Pause and notice',
      description: 'A short practice for noticing the present moment.',
      game_slug: 'thought-quiz',
      reflection_prompt: 'What did you notice?',
    },
    {
      day: 2,
      title: 'Choose one small step',
      description: 'Choose one gentle and practical next action.',
      game_slug: 'tiny-experiment',
      reflection_prompt: 'Which step feels right?',
    },
  ],
  localizations: {
    he: {
      title: 'מסע לרוגע יציב',
      description: 'תרגול הדרגתי שמחזק ויסות ורוגע ביום־יום.',
      outcomes: ['זיהוי תגובות לחץ', 'בחירת תגובה מיטיבה'],
      steps: [
        {
          title: 'עוצרים ומתבוננים',
          description: 'תרגול קצר לזיהוי מה שקורה ברגע הזה.',
          reflection_prompt: 'מה שמתם לב אליו?',
        },
        {
          title: 'בוחרים צעד קטן',
          description: 'בחירת פעולה מעשית ועדינה להמשך.',
          reflection_prompt: 'איזה צעד מתאים לכם?',
        },
      ],
    },
  },
};

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function prepareJourneys(page: Page, viewport = { width: 390, height: 844 }) {
  await page.setViewportSize(viewport);
  await setupHebrewMode(page);
  await mockApi(page);

  let progress: Record<string, any> | null = null;

  await page.route('**/entities/Journey**', async (route) => {
    await fulfillJson(route, [journey]);
  });

  await page.route('**/entities/UserJourneyProgress**', async (route) => {
    const request = route.request();
    const method = request.method();

    if (method === 'GET') {
      await fulfillJson(route, progress ? [progress] : []);
      return;
    }

    const payload = request.postDataJSON() || {};
    if (method === 'POST') {
      progress = {
        id: 'progress-calm',
        ...payload,
        created_date: '2026-09-02T08:00:00.000Z',
        updated_date: '2026-09-02T08:00:00.000Z',
      };
    } else {
      progress = {
        ...(progress || { id: 'progress-calm', journey_id: journey.id }),
        ...payload,
        updated_date: '2026-09-02T08:05:00.000Z',
      };
    }
    await fulfillJson(route, progress);
  });

  await spaNavigate(page, '/Journeys');
  await expect(page.getByTestId('journeys-page')).toBeVisible({ timeout: 20_000 });
}

test.describe('Premium journeys experience', () => {
  test('opens from the Tools hub and keeps Hebrew metadata localized', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupHebrewMode(page);
    await mockApi(page);
    await spaNavigate(page, '/Tools');

    const journeysLink = page.locator('a[href="/Journeys"]');
    await expect(journeysLink).toBeVisible({ timeout: 20_000 });
    await journeysLink.click();
    await expect(page).toHaveURL(/\/Journeys$/);
    await expect(page.getByTestId('journeys-page')).toBeVisible({ timeout: 20_000 });
  });

  test('starts immediately unlocked and advances the open journey after completion', async ({ page }) => {
    await prepareJourneys(page);

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const card = page.getByTestId('journey-card-journey-calm');
    await expect(card).toContainText('מסע לרוגע יציב');
    await expect(card).toContainText('תרגול הדרגתי שמחזק ויסות ורוגע ביום־יום.');
    await expect(card).not.toContainText('A calm journey');
    await expect(card).not.toContainText('English source content');
    await expect(card).toContainText('התמודדות עם חרדה');
    await expect(card).toContainText('עדין');
    await expect(card).not.toContainText('anxiety');
    await expect(card).not.toContainText('beginner');

    const startButton = page.getByTestId('journey-start-journey-calm');
    const startBox = await startButton.boundingBox();
    expect(startBox).not.toBeNull();
    expect(startBox!.height).toBeGreaterThanOrEqual(44);
    await startButton.click();

    const dialog = page.getByTestId('journey-detail-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('journey-step-0')).toContainText('עוצרים ומתבוננים');
    await expect(page.getByTestId('journey-step-0')).not.toContainText('Pause and notice');
    await expect(page.getByTestId('journey-step-0')).toContainText('השלב הנוכחי');
    await expect(page.getByTestId('journey-complete-0')).toBeVisible();

    await page.getByTestId('journey-reflection').fill('שמתי לב לנשימה מהירה');
    await page.getByTestId('journey-complete-0').click();

    await expect(page.getByTestId('journey-step-0')).toContainText('הושלם');
    await expect(page.getByTestId('journey-step-1')).toContainText('השלב הנוכחי');
    await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  test('stays within mobile and desktop viewports, including the detail sheet', async ({ page }) => {
    await prepareJourneys(page);

    for (const viewport of [
      { width: 360, height: 780 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
    }

    await page.setViewportSize({ width: 360, height: 780 });
    await page.getByTestId('journey-view-journey-calm').click();
    const dialog = page.getByTestId('journey-detail-dialog');
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
    expect(box!.height).toBeLessThanOrEqual(viewport!.height + 1);
  });
});
