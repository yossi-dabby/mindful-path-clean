import { test, expect } from '@playwright/test';
import { preparePathStage3 } from '../helpers/pathStage3';

for (const language of ['en', 'he']) for (const width of [360, 1440]) {
  test(`Mood dialog closes with one Escape without the document listener ${language}/${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const state = await preparePathStage3(page, { language });
    // Model a delayed document-level Escape handler without intercepting the
    // keyboard event itself: React's dialog handler still receives the key.
    await page.addInitScript(() => {
      const doc = document as any;
      const add = doc.addEventListener.bind(doc);
      const remove = doc.removeEventListener.bind(doc);
      const wrappers = new WeakMap();
      const capture = (options: any) => options === true || options?.capture;
      (window as any).__deferredEscapeCalls = 0;
      doc.addEventListener = (type: string, listener: any, options: any) => {
        if (type !== 'keydown' || !capture(options) || !listener) return add(type, listener, options);
        const wrapped = (event: KeyboardEvent) => {
          if (event.key === 'Escape') { (window as any).__deferredEscapeCalls++; return; }
          if (typeof listener === 'function') listener.call(doc, event);
          else listener.handleEvent(event);
        };
        wrappers.set(listener, wrapped);
        return add(type, wrapped, options);
      };
      doc.removeEventListener = (type: string, listener: any, options: any) =>
        remove(type, type === 'keydown' && capture(options) ? wrappers.get(listener) || listener : listener, options);
    });
    await page.goto('/MoodTracker');
    const opener = page.getByTestId('mood-log-button');
    await opener.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveCount(1);
    await expect(page.getByTestId('mood-entry-dialog')).toBeVisible();
    for (let index = 0; index < 8; index++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(await page.evaluate(() => (window as any).__deferredEscapeCalls)).toBeGreaterThan(0);
    expect(state.writes).toHaveLength(0);
  });
}
