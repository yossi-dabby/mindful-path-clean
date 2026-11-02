import { test, expect, type Page } from '@playwright/test';
import { installSyntheticFormsContent } from '../helpers/formsSyntheticContent';
import { mockApi, spaNavigate } from '../helpers/ui';

const HEBREW_COLLECTION_LABEL = 'CBT ייעודי לילדים';
const ENGLISH_COLLECTION_LABEL = 'Children CBT Specialized';
const ENGLISH_WORKSHEET_TITLE = 'What Is Going On for Me Right Now?';
const WORKSHEET_VISIBILITY_TIMEOUT_MS = 2000;

const BENIGN_CONSOLE_ERROR_PATTERNS: RegExp[] = [
  /favicon/i,
];

function isBenignConsoleError(text: string): boolean {
  return BENIGN_CONSOLE_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

async function setupHebrewTherapeuticForms(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'he');
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  });

  await mockApi(page);
  await installSyntheticFormsContent(page);
}

async function navigateToWorksheetsLevel(page: Page) {
  await expect(page.getByTestId('collections-grid')).toBeVisible();

  await page.getByTestId('audience-filter-children').click();

  const targetCollectionCard = page
    .locator('[data-testid^="collection-card-"]')
    .filter({ hasText: HEBREW_COLLECTION_LABEL })
    .first();
  await expect(targetCollectionCard).toBeVisible();

  await targetCollectionCard.getByRole('button').first().click();

  await expect(page.getByTestId('modules-grid')).toBeVisible();

  const moduleViewButtons = page.locator('[data-testid^="view-worksheets-"]');
  const moduleCount = await moduleViewButtons.count();
  expect(moduleCount).toBeGreaterThan(0);

  for (let moduleIndex = 0; moduleIndex < moduleCount; moduleIndex += 1) {
    const moduleViewButton = moduleViewButtons.nth(moduleIndex);
    await expect(moduleViewButton).toBeVisible();
    await moduleViewButton.click();
    await expect(page.getByTestId('worksheets-view')).toBeVisible();

    const worksheetsGrid = page.getByTestId('worksheets-grid');
    const worksheetsVisible = await worksheetsGrid.isVisible({ timeout: WORKSHEET_VISIBILITY_TIMEOUT_MS }).catch(() => false);

    if (worksheetsVisible) {
      return;
    }

    await expect(page.getByTestId('empty-state')).toBeVisible();
    await page.getByTestId('forms-nav-back').click();
    await expect(page.getByTestId('modules-grid')).toBeVisible();
  }

  throw new Error('No module with visible worksheets grid was found for the selected collection.');
}

test.describe('Forms Library runtime navigation', () => {
  test('Hebrew collection-first navigation works across collection/module/worksheet levels', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isBenignConsoleError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    await setupHebrewTherapeuticForms(page);
    await spaNavigate(page, '/TherapeuticForms');

    await expect(page.getByRole('heading', { name: 'טפסים טיפוליים' })).toBeVisible();
    await expect(page.getByTestId('collections-grid')).toBeVisible();

    await expect(page.getByTestId('collections-grid')).toContainText(HEBREW_COLLECTION_LABEL);
    await expect(page.locator('body')).not.toContainText(ENGLISH_COLLECTION_LABEL);

    await navigateToWorksheetsLevel(page);

    await expect(page.getByTestId('forms-breadcrumb')).toBeVisible();
    await expect(page.getByTestId('forms-nav-back')).toBeVisible();

    const worksheetCards = page.locator('[data-testid^="worksheet-card-"]');
    expect(await worksheetCards.count()).toBeGreaterThan(0);
    await expect(worksheetCards.first()).toContainText(/[\u0590-\u05FF]/);
    await expect(page.locator('body')).not.toContainText(ENGLISH_WORKSHEET_TITLE);

    await page.getByTestId('forms-nav-back').click();
    await expect(page.getByTestId('modules-grid')).toBeVisible();

    await page
      .getByTestId('forms-breadcrumb')
      .getByRole('button', { name: 'כל הטפסים' })
      .click();
    await expect(page.getByTestId('collections-grid')).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('navigation history works on mobile/desktop projects', async ({ page }) => {
    await setupHebrewTherapeuticForms(page);

    await spaNavigate(page, '/');
    await spaNavigate(page, '/TherapeuticForms');

    await navigateToWorksheetsLevel(page);

    await page.getByTestId('forms-nav-back').click();
    await expect(page.getByTestId('modules-grid')).toBeVisible();

    await page.getByTestId('forms-nav-forward').click();
    await expect(page.getByTestId('worksheets-grid')).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);

    await page.goForward();
    await expect(page).toHaveURL(/\/TherapeuticForms$/);
    await expect(page.getByTestId('collections-grid')).toBeVisible();
  });
});
