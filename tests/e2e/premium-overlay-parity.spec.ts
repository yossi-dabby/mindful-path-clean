import { test, expect } from '@playwright/test';
import { mockApi } from '../helpers/ui';

for (const language of ['en', 'he']) {
  test(`premium goal suggestions stay visible at three widths in ${language}`, async ({ page }) => {
    test.setTimeout(90000);
    await mockApi(page);
    await page.addInitScript(({ language }) => {
      localStorage.setItem('language', language);
      localStorage.setItem('i18nextLng', language);
      localStorage.setItem('chat_consent_accepted', 'true');
      localStorage.setItem('age_verified', 'true');
      (window as any).__TEST_APP_ID__ = 'test-app-id';
      (window as any).__DISABLE_ANALYTICS__ = true;
    }, { language });
    await page.goto('/Goals');
    await page.getByRole('button', { name: language === 'he' ? 'הצעות AI' : 'AI Suggestions', exact: true }).first().click();
    const overlay = page.locator('.premium-overlay');
    await expect(overlay).toBeVisible();
    expect(await overlay.evaluate(e => e.parentElement?.tagName)).toBe('BODY');
    const card = overlay.locator('[data-ui="card"]').first();
    for (const viewport of [{width:360,height:640}, {width:768,height:1024}, {width:1440,height:900}]) {
      await page.setViewportSize(viewport);
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 2);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 2);
      const background = await card.evaluate(e => getComputedStyle(e).backgroundColor);
      expect(background).not.toBe('rgba(0, 0, 0, 0)');
    }
    await overlay.getByRole('button', {name: language === 'he' ? 'ביטול' : 'Cancel', exact:true}).click();
    await expect(overlay).toBeHidden();
  });
}
