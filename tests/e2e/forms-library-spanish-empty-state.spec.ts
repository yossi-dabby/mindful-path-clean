import { test, expect, type Page } from '@playwright/test';
import contentStatus from '../../src/data/therapeuticForms/content-status.json' with { type: 'json' };
import { mockApi, spaNavigate } from '../helpers/ui';

async function setupSpanishForms(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'es');
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  });
  await mockApi(page);
}

test.describe('Forms Library — Spanish empty architecture', () => {
  test('shows the localized empty state without form cards or fallback content', async ({ page }) => {
    await setupSpanishForms(page);
    await spaNavigate(page, '/TherapeuticForms');

    await expect(page.getByRole('heading', { name: 'Formularios Terapéuticos' })).toBeVisible();

    if (contentStatus.contentAvailable === true) {
      await expect(page.getByTestId('empty-state')).toBeVisible();
      await expect(page.getByTestId('empty-state')).toContainText('No hay formularios disponibles');
      await expect(page.getByTestId('empty-state')).toContainText(
        'Ningún formulario terapéutico coincide con los filtros seleccionados',
      );
      await expect(page.locator('[data-testid^="collection-card-"]')).toHaveCount(0);
      await expect(page.locator('[data-testid^="worksheet-card-"]')).toHaveCount(0);
      return;
    }

    await expect(page.getByTestId('forms-under-revision')).toContainText('Los formularios se están actualizando');
    await expect(page.getByTestId('collections-grid')).toHaveCount(0);
    await expect(page.locator('a[href$=".pdf" i]')).toHaveCount(0);
  });
});
