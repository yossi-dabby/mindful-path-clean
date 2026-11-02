import { test, expect } from '@playwright/test';
import { mockApi, setupHebrewMode, spaNavigate } from '../helpers/ui';

async function expectPremiumFlowLayout(page, testId: string) {
  const flow = page.getByTestId(testId);
  await expect(flow).toBeVisible({ timeout: 20000 });
  const metrics = await flow.evaluate((element) => ({
    width: element.scrollWidth,
    viewport: window.innerWidth,
    headerActionHeight: element.querySelector<HTMLElement>('[data-testid="coach-header-action"]')?.getBoundingClientRect().height || 0,
  }));
  expect(metrics.width).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.headerActionHeight).toBeGreaterThanOrEqual(44);
}

test.describe('Premium Thought Coach and Goal Coach flows', () => {
  test.beforeEach(async ({ page }) => {
    await setupHebrewMode(page);
    await mockApi(page);
  });

  test('Thought Coach is responsive, accessible, validated, and saves through all four steps', async ({ page }) => {
    let savedPayload: Record<string, unknown> | undefined;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/entities/ThoughtJournal')) {
        savedPayload = request.postDataJSON();
      }
    });

    await spaNavigate(page, '/ThoughtCoach');
    await expectPremiumFlowLayout(page, 'thoughtcoach-flow');

    const next = page.getByTestId('thoughtcoach-next');
    await expect(next).toBeDisabled();
    const category = page.getByTestId('thoughtcoach-category-overthinking');
    await category.click();
    await expect(category).toHaveAttribute('aria-pressed', 'true');
    await expect(next).toBeEnabled();
    await next.click();

    await expect(page.getByTestId('thoughtcoach-step-2')).toBeVisible();
    await expect(next).toBeDisabled();
    await page.getByTestId('thoughtcoach-situation-input').fill('  פגישה חשובה  ');
    await page.getByTestId('thoughtcoach-thoughts-input').fill('  אני בטוח אכשל  ');
    const emotion = page.getByTestId('thoughtcoach-emotion-anxious');
    await emotion.click();
    await expect(emotion).toHaveAttribute('aria-pressed', 'true');
    await expect(next).toBeEnabled();
    await next.click();

    await expect(page.getByTestId('thoughtcoach-step-3')).toBeVisible();
    await page.getByTestId('thoughtcoach-balanced-input').fill('  אני יכול להתכונן ולעשות את המיטב  ');
    await next.click();

    await expect(page.getByTestId('thoughtcoach-step-4')).toContainText('פגישה חשובה');
    const save = page.getByTestId('thoughtcoach-save');
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByTestId('thoughtcoach-flow')).toBeHidden({ timeout: 15000 });
    expect(savedPayload).toMatchObject({
      situation: 'פגישה חשובה',
      automatic_thoughts: 'אני בטוח אכשל',
      emotions: ['anxious'],
      tags: ['overthinking'],
      balanced_thought: 'אני יכול להתכונן ולעשות את המיטב',
    });
  });

  test('Goal Coach keeps SMART data clean, localizes dates, and exposes touch-safe controls', async ({ page }) => {
    let savedPayload: Record<string, any> | undefined;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/entities/Goal')) {
        savedPayload = request.postDataJSON();
      }
    });

    await spaNavigate(page, '/GoalCoach');
    await expectPremiumFlowLayout(page, 'goalcoach-flow');

    const next = page.getByTestId('goalcoach-next');
    await expect(next).toBeDisabled();
    await page.getByTestId('goalcoach-category-emotional-emotions-stress').click();
    await next.click();

    await page.getByTestId('goalcoach-title-input').fill('  עצירה לפני תגובה  ');
    await page.getByTestId('goalcoach-motivation-input').fill('  להרגיש רגוע יותר  ');
    const targetDate = new Date(); targetDate.setDate(targetDate.getDate() + 30);
    await page.getByTestId('goalcoach-target-date').fill(targetDate.toISOString().slice(0, 10));
    await next.click();

    await page.getByTestId('goalcoach-smart-specific').fill('  לעצור ולנשום  ');
    await page.getByTestId('goalcoach-smart-relevant').fill('  תומך בערכים שלי  ');
    await page.getByTestId('goalcoach-milestone-title-0').fill('  לתרגל פעם אחת  ');
    await next.click();

    const review = page.getByTestId('goalcoach-step-4');
    await expect(review).toContainText('עצירה לפני תגובה');
    await expect(review).not.toContainText('(emotional)');
    await page.getByTestId('goalcoach-save').click();
    await expect(page.getByTestId('goalcoach-flow')).toBeHidden({ timeout: 15000 });

    expect(savedPayload?.smart_criteria).toEqual({ specific: 'לעצור ולנשום', relevant: 'תומך בערכים שלי' });
    expect(JSON.stringify(savedPayload)).not.toContain('UI Category');
    expect(savedPayload?.title).toBe('עצירה לפני תגובה');
  });
});

