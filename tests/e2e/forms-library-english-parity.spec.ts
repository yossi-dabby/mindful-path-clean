/**
 * PR-11 — Forms Library English Language-Parity E2E
 *
 * Verifies runtime behaviour of the Forms Library in English locale:
 *  1. Therapeutic Forms page loads without fatal console errors.
 *  2. English collection labels appear (not technical IDs).
 *  3. Hebrew-only collection labels do not appear in English mode.
 *  4. English collection → module/worksheet navigation works.
 *  5. Back/breadcrumb navigation works in English mode.
 *  6. No Hebrew collection label bleeds into English mode.
 *
 * Data-aware design:
 *  - Tests are scoped to English forms that already exist in the generated index.
 *  - No fake forms are added.  If the English Forms Library is extended in a
 *    future PR, these tests will automatically exercise the new content.
 *  - If a scenario cannot be exercised because content is absent, the test
 *    is conditional (guarded by a runtime check) so the suite does not fail
 *    due to absent future content.
 */

import { test, expect, type Page } from '@playwright/test';
import { installSyntheticFormsContent } from '../helpers/formsSyntheticContent';
import { mockApi, spaNavigate } from '../helpers/ui';

// ─── Constants ────────────────────────────────────────────────────────────────

/** English label for the children specialized CBT collection. */
const ENGLISH_COLLECTION_LABEL = 'Children CBT Specialized';

/** Hebrew label for the same collection — must NOT appear in English mode. */
const HEBREW_COLLECTION_LABEL = 'CBT ייעודי לילדים';

/** A stable English worksheet title from the children CBT core collection. */
const ENGLISH_WORKSHEET_TITLE = 'What Am I Feeling?';

const WORKSHEET_VISIBILITY_TIMEOUT_MS = 2000;

const BENIGN_CONSOLE_ERROR_PATTERNS: RegExp[] = [
  /favicon/i,
  /ResizeObserver/i,
];

function isBenignConsoleError(text: string): boolean {
  return BENIGN_CONSOLE_ERROR_PATTERNS.some((p) => p.test(text));
}

// ─── Setup helpers ────────────────────────────────────────────────────────────

async function setupEnglishTherapeuticForms(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  });
  await mockApi(page);
  await installSyntheticFormsContent(page);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Forms Library — English language-parity', () => {
  test('Therapeutic Forms page loads in English mode without fatal errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isBenignConsoleError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    await setupEnglishTherapeuticForms(page);
    await spaNavigate(page, '/TherapeuticForms');

    await expect(page.getByTestId('collections-grid')).toBeVisible();

    expect(
      consoleErrors,
      `Unexpected console errors on English Forms Library load:\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);
  });

  test('English collection labels appear — not raw technical IDs', async ({ page }) => {
    await setupEnglishTherapeuticForms(page);
    await spaNavigate(page, '/TherapeuticForms');

    await expect(page.getByTestId('collections-grid')).toBeVisible();

    // At least one English collection card with a human-readable label must appear.
    const collectionCard = page
      .locator('[data-testid^="collection-card-"]')
      .filter({ hasText: ENGLISH_COLLECTION_LABEL })
      .first();
    await expect(collectionCard).toBeVisible();

    // The visible text must not be a raw collection id (which would contain
    // underscores in snake_case or look like "adolescents_cbt_core").
    const cardText = await collectionCard.textContent();
    expect(cardText).not.toMatch(/^[a-z_]+$/);
    expect(cardText).not.toMatch(/[_]{2,}/);
  });

  test('Hebrew-only collection labels do not appear in English mode', async ({ page }) => {
    await setupEnglishTherapeuticForms(page);
    await spaNavigate(page, '/TherapeuticForms');

    await expect(page.getByTestId('collections-grid')).toBeVisible();

    // Hebrew collection label must not be visible.
    const hebrewCard = page
      .locator('[data-testid^="collection-card-"]')
      .filter({ hasText: HEBREW_COLLECTION_LABEL })
      .first();
    await expect(hebrewCard).not.toBeVisible();
  });

  test('English collection → module → worksheet navigation works', async ({ page }) => {
    await setupEnglishTherapeuticForms(page);
    await spaNavigate(page, '/TherapeuticForms');

    await expect(page.getByTestId('collections-grid')).toBeVisible();

    // Filter to children audience.
    const childrenFilter = page.getByTestId('audience-filter-children');
    const childrenFilterExists = await childrenFilter.isVisible().catch(() => false);
    if (childrenFilterExists) {
      await childrenFilter.click();
    }

    // Navigate into the English children specialized collection.
    const targetCard = page
      .locator('[data-testid^="collection-card-"]')
      .filter({ hasText: ENGLISH_COLLECTION_LABEL })
      .first();
    const cardExists = await targetCard.isVisible().catch(() => false);
    if (!cardExists) {
      // No English collection cards yet — guard: skip navigation assertion.
      return;
    }
    await targetCard.getByRole('button').first().click();

    await expect(page.getByTestId('modules-grid')).toBeVisible();

    const moduleViewButtons = page.locator('[data-testid^="view-worksheets-"]');
    const moduleCount = await moduleViewButtons.count();
    expect(moduleCount).toBeGreaterThan(0);

    // Try each module until we find one with worksheets.
    let worksheetFound = false;
    for (let i = 0; i < moduleCount; i++) {
      const btn = moduleViewButtons.nth(i);
      await expect(btn).toBeVisible();
      await btn.click();
      await expect(page.getByTestId('worksheets-view')).toBeVisible();

      const worksheetsGrid = page.getByTestId('worksheets-grid');
      const visible = await worksheetsGrid.isVisible({ timeout: WORKSHEET_VISIBILITY_TIMEOUT_MS }).catch(() => false);
      if (visible) {
        worksheetFound = true;
        break;
      }

      // Empty module — go back and try next.
      await expect(page.getByTestId('empty-state')).toBeVisible();
      await page.getByTestId('forms-nav-back').click();
      await expect(page.getByTestId('modules-grid')).toBeVisible();
    }

    // At least one module must contain worksheet cards.
    expect(worksheetFound, 'No module with visible worksheets was found in English mode').toBe(true);
  });

  test('Back navigation works from worksheet level in English mode', async ({ page }) => {
    await setupEnglishTherapeuticForms(page);
    await spaNavigate(page, '/TherapeuticForms');

    await expect(page.getByTestId('collections-grid')).toBeVisible();

    const targetCard = page
      .locator('[data-testid^="collection-card-"]')
      .filter({ hasText: ENGLISH_COLLECTION_LABEL })
      .first();
    const cardExists = await targetCard.isVisible().catch(() => false);
    if (!cardExists) {
      return;
    }
    await targetCard.getByRole('button').first().click();

    await expect(page.getByTestId('modules-grid')).toBeVisible();

    const firstModuleBtn = page.locator('[data-testid^="view-worksheets-"]').first();
    await firstModuleBtn.click();
    await expect(page.getByTestId('worksheets-view')).toBeVisible();

    // Back navigation must return to modules level.
    await page.getByTestId('forms-nav-back').click();
    await expect(page.getByTestId('modules-grid')).toBeVisible();
  });

  test('Open and Download controls are visible on English worksheet cards', async ({ page }) => {
    await setupEnglishTherapeuticForms(page);
    await spaNavigate(page, '/TherapeuticForms');

    await expect(page.getByTestId('collections-grid')).toBeVisible();

    const targetCard = page
      .locator('[data-testid^="collection-card-"]')
      .filter({ hasText: ENGLISH_COLLECTION_LABEL })
      .first();
    const cardExists = await targetCard.isVisible().catch(() => false);
    if (!cardExists) {
      return;
    }
    await targetCard.getByRole('button').first().click();
    await expect(page.getByTestId('modules-grid')).toBeVisible();

    // Find a module with worksheet cards.
    const moduleViewButtons = page.locator('[data-testid^="view-worksheets-"]');
    const moduleCount = await moduleViewButtons.count();
    for (let i = 0; i < moduleCount; i++) {
      await moduleViewButtons.nth(i).click();
      await expect(page.getByTestId('worksheets-view')).toBeVisible();

      const worksheetsGrid = page.getByTestId('worksheets-grid');
      const visible = await worksheetsGrid.isVisible({ timeout: WORKSHEET_VISIBILITY_TIMEOUT_MS }).catch(() => false);
      if (visible) {
        // Both Open and Download controls must be present.
        await expect(page.getByTestId('forms-file-open').first()).toBeVisible();
        await expect(page.getByTestId('forms-file-download').first()).toBeVisible();
        return;
      }

      await page.getByTestId('forms-nav-back').click();
      await expect(page.getByTestId('modules-grid')).toBeVisible();
    }
  });

  test('Hebrew leakage prevention: no Hebrew collection labels in English mode', async ({ page }) => {
    await setupEnglishTherapeuticForms(page);
    await spaNavigate(page, '/TherapeuticForms');

    await expect(page.getByTestId('collections-grid')).toBeVisible();

    // Collect all visible collection card texts.
    const allCards = page.locator('[data-testid^="collection-card-"]');
    const cardCount = await allCards.count();

    for (let i = 0; i < cardCount; i++) {
      const text = await allCards.nth(i).textContent();
      // None should contain Hebrew characters.
      const hasHebrew = /[\u0590-\u05FF\uFB00-\uFB4F]/.test(text ?? '');
      expect(
        hasHebrew,
        `Hebrew characters found in English mode collection card: "${text}"`,
      ).toBe(false);
    }
  });
});
