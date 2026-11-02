import { test, expect } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:5173';

/** Allow 1 px rounding tolerance when comparing bounding boxes to viewport width. */
const TOLERANCE_PX = 1;

const BREAKPOINTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 },
];

test.describe('Resources – chip/filter layout across breakpoints', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(() => {
      localStorage.setItem('age_verified', 'true');
      (window as any).__DISABLE_ANALYTICS__ = true;
    });
  });

  for (const bp of BREAKPOINTS) {
    test(`chip rows do not overflow at ${bp.name} (${bp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE_URL}/resources`, { waitUntil: 'domcontentloaded' });

      // Wait for the chip containers to appear
      const categoryChips = page.locator('[data-testid="category-chips"]');
      const typeChips = page.locator('[data-testid="type-chips"]');

      await expect(categoryChips).toBeVisible({ timeout: 15000 });
      await expect(typeChips).toBeVisible({ timeout: 15000 });

      // Assert chip containers do not overflow their parent width
      const categoryBox = await categoryChips.boundingBox();
      const typeBox = await typeChips.boundingBox();

      expect(categoryBox).not.toBeNull();
      expect(typeBox).not.toBeNull();

      // Chip row x-position should be >= 0 and right edge should be <= viewport width
      expect(categoryBox!.x).toBeGreaterThanOrEqual(0);
      expect(categoryBox!.x + categoryBox!.width).toBeLessThanOrEqual(bp.width + TOLERANCE_PX);

      expect(typeBox!.x).toBeGreaterThanOrEqual(0);
      expect(typeBox!.x + typeBox!.width).toBeLessThanOrEqual(bp.width + TOLERANCE_PX);
    });

    test(`chip buttons are visible (not hidden behind scrollbar) at ${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE_URL}/resources`, { waitUntil: 'domcontentloaded' });

      const categoryChips = page.locator('[data-testid="category-chips"]');
      await expect(categoryChips).toBeVisible({ timeout: 15000 });

      // The first chip button ('All') should be visible and not obscured
      const firstChip = categoryChips.locator('button').first();
      await expect(firstChip).toBeVisible();

      // Verify no horizontal scrollbar is visible on the chip row
      // (offsetHeight - clientHeight == 0 means the scrollbar takes no space)
      const scrollbarHeight = await categoryChips.evaluate((el) => {
        return (el as HTMLElement).offsetHeight - (el as HTMLElement).clientHeight;
      });
      expect(scrollbarHeight).toBe(0);
    });
  }
});
