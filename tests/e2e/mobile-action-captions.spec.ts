import { test, expect } from '@playwright/test';
import { mockApi } from '../helpers/ui';

const labels = [
  ['en', 'More actions', 'Calendar', 'Create SMART Goal'], ['he', 'עוד פעולות', 'לוח שנה', 'יצירת מטרת SMART'],
  ['es', 'Más acciones', 'Calendario', 'Crear objetivo SMART'], ['fr', 'Autres actions', 'Calendrier', 'Créer un objectif SMART'],
  ['de', 'Weitere Aktionen', 'Kalender', 'SMART-Ziel erstellen'], ['it', 'Altre azioni', 'Calendario', 'Crea obiettivo SMART'],
  ['pt', 'Mais ações', 'Calendário', 'Criar meta SMART']
];
for (const [language, more, calendar, manual] of labels) {
  test('mobile actions stay readable and operable: ' + language, async ({ page }) => {
    test.setTimeout(90000);
    await mockApi(page);
    await page.addInitScript((language) => {
      localStorage.setItem('language', language); localStorage.setItem('i18nextLng', language);
      localStorage.setItem('chat_consent_accepted', 'true'); localStorage.setItem('age_verified', 'true');
      (window as any).__TEST_APP_ID__ = 'test-app-id'; (window as any).__DISABLE_ANALYTICS__ = true;
    }, language);
    await page.setViewportSize({width:360,height:780});
    await page.goto('/Goals');
    const trigger = page.getByRole('button', {name:more, exact:true});
    await expect(trigger).toBeVisible({timeout:30000});
    await expect(trigger).toHaveText(more);
    await trigger.click();
    const actions = page.getByRole('menuitem');
    // Stage 3 adds the existing manual goal form to the three view actions.
    await expect(actions).toHaveCount(4);
    await expect(page.getByRole('menuitem', { name: manual, exact: true })).toBeVisible();
    for (const action of await actions.all()) {
      expect((await action.innerText()).trim()).not.toBe('');
      await expect.poll(async () => (await action.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('menuitem', { name: calendar, exact: true }).click();
    await expect(page.getByRole('menu')).not.toBeVisible();
    const bounds = await page.evaluate(() => ({width:innerWidth, content:document.documentElement.scrollWidth}));
    expect(bounds.content).toBeLessThanOrEqual(bounds.width + 1);
    await page.setViewportSize({width:768,height:1024});
    await expect(trigger).not.toBeVisible();
  });
}
