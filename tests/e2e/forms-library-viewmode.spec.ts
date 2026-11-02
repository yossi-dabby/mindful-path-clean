import { test, expect, type Page } from '@playwright/test';
import { installSyntheticFormsContent } from '../helpers/formsSyntheticContent';
import { mockApi, spaNavigate } from '../helpers/ui';

const VIEW_MODE_STORAGE_KEY = 'mindfulPath.formsLibrary.viewMode';
const DEFAULT_VIEW_MODE = 'medium';
const HEBREW_COLLECTION_LABEL = 'CBT ייעודי לילדים';
const ENGLISH_COLLECTION_LABEL = 'Children CBT Specialized';

const GRID_CLASS_BY_MODE: Record<string, string> = {
  large: 'grid grid-cols-1 md:grid-cols-2 gap-8',
  medium: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
  compact: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3',
  list: 'grid grid-cols-1 gap-3',
  tiles: 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3',
};

const EXPECTED_VIEW_MODES = ['large', 'medium', 'compact', 'list', 'tiles'] as const;
const WORKSHEET_VISIBILITY_TIMEOUT_MS = 2000;

function normalizeClassName(className: string | null): string {
  return String(className || '')
    .trim()
    .replace(/\s+/g, ' ');
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
  // Forms Library content is sourced from the generated local index, while mockApi
  // keeps unrelated runtime API calls from failing during E2E navigation.
}

async function readViewModeFromLocalStorage(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), VIEW_MODE_STORAGE_KEY);
}

async function getAvailableViewModes(page: Page): Promise<string[]> {
  const available: string[] = [];
  for (const mode of EXPECTED_VIEW_MODES) {
    const control = page.getByTestId(`forms-view-mode-${mode}`);
    if (await control.count()) {
      await expect(control).toBeVisible();
      available.push(mode);
    }
  }
  return available;
}

async function clickViewMode(page: Page, mode: string) {
  const control = page.getByTestId(`forms-view-mode-${mode}`);
  await control.scrollIntoViewIfNeeded();
  await control.click();
}

async function expectGridMatchesViewMode(page: Page, gridTestId: string, mode: string) {
  const grid = page.getByTestId(gridTestId);
  await expect(grid).toBeVisible();
  const expectedClassName = GRID_CLASS_BY_MODE[mode];
  const actualClassName = normalizeClassName(await grid.getAttribute('class'));
  expect(actualClassName).toBe(expectedClassName);
}

async function openCollectionAndModuleWithWorksheets(page: Page): Promise<void> {
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
    const worksheetsVisible = await worksheetsGrid
      .isVisible({ timeout: WORKSHEET_VISIBILITY_TIMEOUT_MS })
      .catch(() => false);

    if (worksheetsVisible) {
      return;
    }

    await expect(page.getByTestId('empty-state')).toBeVisible();
    await page.getByTestId('forms-nav-back').click();
    await expect(page.getByTestId('modules-grid')).toBeVisible();
  }

  throw new Error('No module with visible worksheets grid was found for the selected collection.');
}

test.describe('Forms Library runtime view-mode behavior', () => {
  test.beforeEach(async ({ page }) => {
    await setupHebrewTherapeuticForms(page);
    await spaNavigate(page, '/TherapeuticForms');
    await expect(page.getByTestId('collections-grid')).toBeVisible();
  });

  test('Hebrew view-mode controls are visible and default mode is detectable', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'טפסים טיפוליים' })).toBeVisible();
    await expect(page.getByTestId('forms-view-mode-toggle')).toBeVisible();

    const availableModes = await getAvailableViewModes(page);
    expect(availableModes).toEqual(EXPECTED_VIEW_MODES);

    const storedMode = await readViewModeFromLocalStorage(page);
    expect(storedMode).toBe(DEFAULT_VIEW_MODE);

    await expectGridMatchesViewMode(page, 'collections-grid', storedMode || DEFAULT_VIEW_MODE);

    const collectionCards = page.locator('[data-testid^="collection-card-"]');
    expect(await collectionCards.count()).toBeGreaterThan(0);
    await expect(collectionCards.first()).toContainText(/[\u0590-\u05FF]/);
    await expect(page.locator('body')).not.toContainText(ENGLISH_COLLECTION_LABEL);
  });

  test('switching every available view mode updates state, storage, and Hebrew content visibility', async ({ page }) => {
    const availableModes = await getAvailableViewModes(page);
    expect(availableModes.length).toBeGreaterThan(0);

    const firstCollectionCard = page.locator('[data-testid^="collection-card-"]').first();

    for (const mode of availableModes) {
      await clickViewMode(page, mode);
      await expect(readViewModeFromLocalStorage(page)).resolves.toBe(mode);

      await expectGridMatchesViewMode(page, 'collections-grid', mode);
      await expect(firstCollectionCard).toBeVisible();
      await expect(firstCollectionCard).toContainText(/[\u0590-\u05FF]/);
      await expect(page.locator('body')).not.toContainText(ENGLISH_COLLECTION_LABEL);
    }
  });

  test('selected view mode persists after reload', async ({ page }) => {
    const persistedMode = 'list';

    await clickViewMode(page, persistedMode);
    await expect(readViewModeFromLocalStorage(page)).resolves.toBe(persistedMode);

    await page.reload({ waitUntil: 'load' });

    await expect(page.getByTestId('collections-grid')).toBeVisible();
    await expect(readViewModeFromLocalStorage(page)).resolves.toBe(persistedMode);
    await expectGridMatchesViewMode(page, 'collections-grid', persistedMode);

    const collectionCards = page.locator('[data-testid^="collection-card-"]');
    expect(await collectionCards.count()).toBeGreaterThan(0);
    await expect(collectionCards.first()).toBeVisible();
  });

  test('selected view mode persists through collection/module/worksheet navigation', async ({ page }) => {
    const persistedMode = 'compact';

    await clickViewMode(page, persistedMode);
    await expect(readViewModeFromLocalStorage(page)).resolves.toBe(persistedMode);

    await expectGridMatchesViewMode(page, 'collections-grid', persistedMode);

    await openCollectionAndModuleWithWorksheets(page);

    // openCollectionAndModuleWithWorksheets returns while on the worksheets view
    // (a module is selected), so modules-grid is not rendered at this point.
    await expect(readViewModeFromLocalStorage(page)).resolves.toBe(persistedMode);
    await expectGridMatchesViewMode(page, 'worksheets-grid', persistedMode);

    const worksheetCards = page.locator('[data-testid^="worksheet-card-"]');
    expect(await worksheetCards.count()).toBeGreaterThan(0);
    await expect(worksheetCards.first()).toContainText(/[\u0590-\u05FF]/);

    await page.getByTestId('forms-nav-back').click();
    await expect(page.getByTestId('modules-grid')).toBeVisible();
    await expectGridMatchesViewMode(page, 'modules-grid', persistedMode);

    await page.getByTestId('forms-breadcrumb').getByRole('button', { name: 'כל הטפסים' }).click();
    await expect(page.getByTestId('collections-grid')).toBeVisible();
    await expectGridMatchesViewMode(page, 'collections-grid', persistedMode);
    await expect(readViewModeFromLocalStorage(page)).resolves.toBe(persistedMode);
  });
});
