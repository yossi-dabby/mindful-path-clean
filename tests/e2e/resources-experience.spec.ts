import { test, expect } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.BASE_URL ||
  'http://127.0.0.1:5173';

const resources = [
  { id: 'r-en', language: 'en', status: 'active', title: 'Anxiety disorders', description: 'Official guidance.', url: 'https://www.who.int/test', type: 'article', category: 'anxiety', tags: ['anxiety'], estimated_time: '7', source: 'World Health Organization', publication_date: '2025-09-08', verified_at: '2026-09-01T12:00:00Z' },
  { id: 'r-he', language: 'he', status: 'active', title: 'מהו דיכאון', description: 'מידע רשמי ועדכני.', url: 'https://me.health.gov.il/test', type: 'article', category: 'depression', tags: ['דיכאון'], estimated_time: '8', source: 'משרד הבריאות', publication_date: '2026-01-01', verified_at: '2026-09-01T12:00:00Z' },
  { id: 'r-es', language: 'es', status: 'active', title: 'Trastornos de ansiedad', description: 'Información oficial.', url: 'https://www.who.int/es/test', type: 'article', category: 'anxiety', tags: ['ansiedad'], estimated_time: '7', source: 'Organización Mundial de la Salud', publication_date: '2025-09-08', verified_at: '2026-09-01T12:00:00Z' },
  { id: 'r-fr', language: 'fr', status: 'active', title: 'Troubles anxieux', description: 'Informations officielles.', url: 'https://www.who.int/fr/test', type: 'article', category: 'anxiety', tags: ['anxiété'], estimated_time: '7', source: 'Organisation mondiale de la Santé', publication_date: '2025-09-08', verified_at: '2026-09-01T12:00:00Z' },
  { id: 'r-de', language: 'de', status: 'active', title: 'Stress und Psyche', description: 'Offizielle Informationen.', url: 'https://gesund.bund.de/test', type: 'guide', category: 'stress', tags: ['Stress'], estimated_time: '7', source: 'gesund.bund.de', publication_date: '2026-01-14', verified_at: '2026-09-01T12:00:00Z' },
  { id: 'r-it', language: 'it', status: 'active', title: 'Salute mentale', description: 'Informazioni ufficiali.', url: 'https://www.iss.it/test', type: 'guide', category: 'general', tags: ['benessere'], estimated_time: '7', source: 'Istituto Superiore di Sanità', publication_date: '2026-06-04', verified_at: '2026-09-01T12:00:00Z' },
  { id: 'r-pt', language: 'pt', status: 'active', title: 'Saúde mental', description: 'Informação oficial.', url: 'https://www.sns24.gov.pt/test', type: 'guide', category: 'general', tags: ['bem-estar'], estimated_time: '7', source: 'SNS 24', publication_date: '2025-05-05', verified_at: '2026-09-01T12:00:00Z' },
];

const locales = [
  { language: 'en', open: 'Open official source', dir: 'ltr' },
  { language: 'he', open: 'פתיחת המקור הרשמי', dir: 'rtl' },
  { language: 'es', open: 'Abrir fuente oficial', dir: 'ltr' },
  { language: 'fr', open: 'Ouvrir la source officielle', dir: 'ltr' },
  { language: 'de', open: 'Offizielle Quelle öffnen', dir: 'ltr' },
  { language: 'it', open: 'Apri la fonte ufficiale', dir: 'ltr' },
  { language: 'pt', open: 'Abrir fonte oficial', dir: 'ltr' },
];

test.describe('Resources – verified multilingual experience', () => {
  for (const locale of locales) {
    test(`shows only the active ${locale.language} catalog with localized actions`, async ({ page }) => {
      await mockApi(page);
      await page.route('**/entities/Resource**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(resources),
        });
      });
      await page.addInitScript(({ language }) => {
        localStorage.setItem('age_verified', 'true');
        localStorage.setItem('language', language);
        (window as any).__DISABLE_ANALYTICS__ = true;
      }, { language: locale.language });

      await page.goto(`${BASE_URL}/resources`, { waitUntil: 'domcontentloaded' });

      const card = page.getByTestId('resource-card');
      await expect(card).toHaveCount(1);
      await expect(card.getByRole('link', { name: new RegExp(locale.open) })).toBeVisible();
      await expect(card.getByRole('link', { name: new RegExp(locale.open) })).toHaveAttribute('target', '_blank');
      await expect(page.locator('html')).toHaveAttribute('dir', locale.dir);
      await expect(page.locator('body')).not.toContainText('resources_ui.');
      await expect(page.locator('body')).not.toContainText('View Resource');

      const saveButton = card.getByRole('button').first();
      const box = await saveButton.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(40);
      expect(box!.height).toBeGreaterThanOrEqual(40);
    });
  }

  test('search, filters and responsive cards remain usable on mobile', async ({ page }) => {
    await mockApi(page);
    await page.route('**/entities/Resource**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(resources),
      });
    });
    await page.addInitScript(() => {
      localStorage.setItem('age_verified', 'true');
      localStorage.setItem('language', 'he');
      (window as any).__DISABLE_ANALYTICS__ = true;
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/resources`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('resource-card')).toHaveCount(1);
    const search = page.getByLabel('חיפוש בספריית המשאבים');
    await search.fill('לא קיים');
    await expect(page.getByTestId('resource-card')).toHaveCount(0);
    await expect(page.getByText('לא נמצאו משאבים מתאימים')).toBeVisible();

    const categoryChips = page.getByTestId('category-chips');
    const box = await categoryChips.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  });
});
