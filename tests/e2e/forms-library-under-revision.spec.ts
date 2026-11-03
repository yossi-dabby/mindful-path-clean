import { expect, test, type Page } from '@playwright/test';
import { mockApi, spaNavigate } from '../helpers/ui';

async function setupFormsPage(page: Page, language: string, theme = 'light') {
  await page.addInitScript(({ selectedLanguage, selectedTheme }) => {
    localStorage.setItem('language', selectedLanguage);
    localStorage.setItem('theme', selectedTheme);
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  }, { selectedLanguage: language, selectedTheme: theme });
  await mockApi(page);
  await spaNavigate(page, '/TherapeuticForms');
}

test.describe('Forms Library unavailable public catalog', () => {
  test('English page exposes an empty state without downloadable forms', async ({ page }) => {
    await setupFormsPage(page, 'en');

    await expect(page.getByTestId('therapeutic-forms-page')).toBeVisible();
    await expect(page.getByTestId('forms-empty-state')).toContainText('No forms available');
    await expect(page.getByTestId('forms-under-revision')).toHaveCount(0);
    await expect(page.getByTestId('collections-grid')).toHaveCount(0);
    await expect(page.locator('a[href$=".pdf" i]')).toHaveCount(0);
  });

  test('Hebrew page exposes a localized RTL empty state without downloadable forms', async ({ page }) => {
    await setupFormsPage(page, 'he');

    const pageRoot = page.getByTestId('therapeutic-forms-page');
    await expect(pageRoot).toBeVisible();
    await expect(pageRoot).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('forms-empty-state')).toBeVisible();
    await expect(page.getByTestId('forms-under-revision')).toHaveCount(0);
    await expect(page.getByTestId('collections-grid')).toHaveCount(0);
    await expect(page.locator('a[href$=".pdf" i]')).toHaveCount(0);
  });
});

for (const language of ['en', 'he', 'es', 'fr', 'de', 'it', 'pt']) {
  for (const theme of ['light', 'dark']) {
    test(`empty catalog removes retired architecture ${language}/${theme}`, async ({ page }) => {
      await setupFormsPage(page, language, theme);
      const root = page.getByTestId('therapeutic-forms-page');
      await expect(root).toBeVisible();
      await expect(root).toHaveAttribute('dir', language === 'he' ? 'rtl' : 'ltr');
      await expect(page.getByTestId('forms-audience-architecture')).toHaveCount(0);
      await expect(page.getByTestId('forms-under-revision')).toHaveCount(0);
      await expect(page.getByTestId('forms-empty-state')).toBeVisible();
      await expect(page.getByTestId('forms-collection-architecture')).toHaveCount(0);
      await expect(page.locator('a[href$=".pdf" i]')).toHaveCount(0);
      await expect(root.locator('a[href="/Chat"]')).toBeVisible();
      const state = await page.evaluate(async () => {
        const registry = await import('/src/data/therapeuticForms/index.js');
        return { total: registry.ALL_FORMS.length, ai: registry.getTherapeuticFormsForAI().length,
          overflow: document.documentElement.scrollWidth - window.innerWidth };
      });
      expect(state.total).toBe(0);
      expect(state.ai).toBe(0);
      expect(state.overflow).toBeLessThanOrEqual(2);
    });
  }
}
