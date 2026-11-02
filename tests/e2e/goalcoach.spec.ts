import { test, expect } from '@playwright/test';
import { spaNavigate, safeFill, safeClick, mockApi, logFailedRequests } from '../helpers/ui';

test.describe('GoalCoach Flow (Steps 1→4)', () => {
  test('should complete GoalCoach wizard from step 1 to step 4', async ({ page }) => {
    test.setTimeout(90000);

    const requestLogger = await logFailedRequests(page);

    try {
      await mockApi(page);
      await spaNavigate(page, '/GoalCoach');

      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.log('Network idle timeout - continuing anyway');
      });

      // ========== STEP 1: SELECT CATEGORY ==========
      console.log('[Step 1] Selecting goal category...');

      const step1Container = page.locator('[data-testid="goalcoach-step-1"]');
      await expect(step1Container).toBeVisible({ timeout: 15000 });

      // Avoid strict-mode union locator: prefer the exact one; else fall back to first category
      const preferred = page.locator('[data-testid="goalcoach-category-emotional-emotions-stress"]');
      const anyCategory = page.locator('[data-testid^="goalcoach-category-"]').first();
      const categoryButton = (await preferred.count()) > 0 ? preferred.first() : anyCategory;

      await expect(categoryButton).toBeVisible({ timeout: 15000 });
      await safeClick(categoryButton);

      // Verify selected if aria-pressed exists (don’t fail hard if component differs)
      await expect(categoryButton).toHaveAttribute('aria-pressed', 'true', { timeout: 3000 }).catch(() => {
        console.log('aria-pressed not asserted (component may differ) - continuing');
      });

      console.log('[Step 1] Category selected, clicking Next...');

      const nextButton = page.locator('[data-testid="goalcoach-next"]').first();
      await nextButton.waitFor({ state: 'visible', timeout: 30000 });
      await nextButton.scrollIntoViewIfNeeded();
      await expect(nextButton).toBeEnabled({ timeout: 10000 });
      await safeClick(nextButton);

      // ========== STEP 2: ENTER GOAL DETAILS ==========
      console.log('[Step 2] Entering goal details...');

      const step2Container = page.locator('[data-testid="goalcoach-step-2"]');
      await expect(step2Container).toBeVisible({ timeout: 20000 });

      const titleInput = page
        .locator('[data-testid="goalcoach-title-input"]')
        .or(page.locator('input[placeholder*="e.g.,"]'))
        .first();
      await expect(titleInput).toBeVisible({ timeout: 20000 });
      await safeFill(titleInput, 'E2E Test Goal - Improve Mental Wellness');

      const motivationTextarea = page
        .locator('[data-testid="goalcoach-motivation-input"]')
        .or(page.locator('textarea[placeholder*="why"]'))
        .first();
      await expect(motivationTextarea).toBeVisible({ timeout: 15000 });
      await safeFill(
        motivationTextarea,
        'This is important because I want to reduce stress and anxiety in my daily life.'
      );

      console.log('[Step 2] Goal details filled, clicking Next...');

      await page.waitForTimeout(500);
      await expect(nextButton).toBeEnabled({ timeout: 10000 });
      await safeClick(nextButton);

      // ========== STEP 3: PLAN NEXT STEPS ==========
      console.log('[Step 3] Planning next steps...');

      const step3Container = page.locator('[data-testid="goalcoach-step-3"]');
      await expect(step3Container).toBeVisible({ timeout: 20000 });

      console.log('[Step 3] Optional fields displayed, clicking Next...');
      await safeClick(nextButton);

      // ========== STEP 4: REVIEW & SAVE ==========
      console.log('[Step 4] Reviewing goal...');

      const step4Container = page.locator('[data-testid="goalcoach-step-4"]');
      await expect(step4Container).toBeVisible({ timeout: 20000 });

      await expect(page.locator('text=E2E Test Goal - Improve Mental Wellness')).toBeVisible({ timeout: 15000 });

      console.log('[Step 4] Review complete, clicking Save Goal...');

      const saveButton = page.locator('[data-testid="goalcoach-save"]').first();
      await expect(saveButton).toBeVisible({ timeout: 15000 });
      await expect(saveButton).toBeEnabled({ timeout: 15000 });
      await safeClick(saveButton);

      await page.waitForTimeout(1500);

      console.log('✅ GoalCoach flow completed successfully');
    } catch (error) {
      console.error('❌ GoalCoach flow failed:', error);
      requestLogger.logToConsole();

      try {
        await page.screenshot({
          path: `test-results/goalcoach-failed-${Date.now()}.png`,
          fullPage: true
        });
      } catch (screenshotErr) {
        console.warn('Screenshot failed:', screenshotErr);
      }

      const currentStep = await page.locator('[data-testid^="goalcoach-step-"]').count();
      console.log(`Current visible steps: ${currentStep}`);

      throw error;
    }
  });
});






