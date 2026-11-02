/**
 * PR-7 — Forms Library Hebrew RTL layout and overflow E2E
 *
 * Verifies runtime layout reliability for Hebrew content:
 * 1. Hebrew RTL mode renders correctly.
 * 2. Long Hebrew titles/descriptions do not break the layout.
 * 3. Cards remain readable across collection/module/worksheet levels.
 * 4. Action buttons remain visible and clickable.
 * 5. No horizontal overflow appears on desktop or mobile (390×844).
 * 6. Breadcrumb/back navigation remains usable in Hebrew.
 *
 * Longest Hebrew entries used for stress checks (from generated index):
 *   - Longest title:       "הקול הביקורתי שלי מול הקול הטוב שלי" (35 chars)
 *   - Longest description: ~184 chars in adolescents-cbt-specialized-he OCD module
 */
import { test, expect, type Page } from '@playwright/test';
import { installSyntheticFormsContent } from '../helpers/formsSyntheticContent';
import { mockApi, spaNavigate } from '../helpers/ui';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Hebrew label for the children specialized CBT collection. */
const HEBREW_COLLECTION_LABEL = 'CBT ייעודי לילדים';

/** English-only label that must NOT appear when language is Hebrew. */
const ENGLISH_COLLECTION_LABEL = 'Children CBT Specialized';

/**
 * Tolerance for horizontal overflow checks.
 * A small buffer accommodates sub-pixel rounding and OS-level scrollbar widths.
 */
const OVERFLOW_TOLERANCE_PX = 2;

const WORKSHEET_VISIBILITY_TIMEOUT_MS = 2000;

// ─── Setup helpers ────────────────────────────────────────────────────────────

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

// ─── Assertion helpers ────────────────────────────────────────────────────────

/**
 * Asserts that neither the document element nor the body has a horizontal
 * scrollbar beyond the allowed tolerance.
 */
async function assertNoHorizontalOverflow(page: Page) {
  const { docOverflow, bodyOverflow } = await page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    return {
      docOverflow: docEl.scrollWidth - docEl.clientWidth,
      bodyOverflow: body.scrollWidth - body.clientWidth,
    };
  });
  expect(docOverflow, 'documentElement horizontal overflow').toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
  expect(bodyOverflow, 'body horizontal overflow').toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
}

// ─── Navigation helper ────────────────────────────────────────────────────────

/**
 * Navigates from the collections grid all the way to a module that has visible
 * worksheet cards.  Mirrors the helper used in forms-library-navigation.spec.ts.
 */
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

  for (let i = 0; i < moduleCount; i++) {
    const btn = moduleViewButtons.nth(i);
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page.getByTestId('worksheets-view')).toBeVisible();

    const worksheetsVisible = await page
      .getByTestId('worksheets-grid')
      .isVisible({ timeout: WORKSHEET_VISIBILITY_TIMEOUT_MS })
      .catch(() => false);

    if (worksheetsVisible) return;

    await expect(page.getByTestId('empty-state')).toBeVisible();
    await page.getByTestId('forms-nav-back').click();
    await expect(page.getByTestId('modules-grid')).toBeVisible();
  }

  throw new Error('No module with visible worksheets grid was found for the selected collection.');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Forms Library Hebrew RTL layout and overflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupHebrewTherapeuticForms(page);
    await spaNavigate(page, '/TherapeuticForms');
    await expect(page.getByTestId('collections-grid')).toBeVisible();
  });

  test('Hebrew page RTL baseline — direction attribute, Hebrew cards, no overflow', async ({ page }) => {
    // Hebrew page title is visible
    await expect(page.getByRole('heading', { name: 'טפסים טיפוליים' })).toBeVisible();

    // Main content wrapper carries dir="rtl" when language is Hebrew
    const mainWrapper = page.getByTestId('therapeutic-forms-page');
    await expect(mainWrapper).toHaveAttribute('dir', 'rtl');

    // Hebrew collection cards are visible and contain Hebrew characters
    const collectionCards = page.locator('[data-testid^="collection-card-"]');
    expect(await collectionCards.count()).toBeGreaterThan(0);
    await expect(collectionCards.first()).toContainText(/[\u0590-\u05FF]/);

    // No English-only collection label visible
    await expect(page.locator('body')).not.toContainText(ENGLISH_COLLECTION_LABEL);

    await assertNoHorizontalOverflow(page);
  });

  test('collection card layout — title readable, card within viewport, action button reachable', async ({ page }) => {
    await page.getByTestId('audience-filter-children').click();

    const targetCard = page
      .locator('[data-testid^="collection-card-"]')
      .filter({ hasText: HEBREW_COLLECTION_LABEL })
      .first();

    await expect(targetCard).toBeVisible();
    await expect(targetCard).toContainText(/[\u0590-\u05FF]/);

    // Card bounding box must not exceed viewport width
    const viewport = page.viewportSize();
    const box = await targetCard.boundingBox();
    if (viewport && box) {
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + OVERFLOW_TOLERANCE_PX);
    }

    // Browse/navigation button is visible and enabled
    const browseButton = targetCard.getByRole('button').first();
    await expect(browseButton).toBeVisible();
    await expect(browseButton).toBeEnabled();

    await assertNoHorizontalOverflow(page);
  });

  test('module card layout — Hebrew titles within viewport, breadcrumb and back button usable', async ({ page }) => {
    await page.getByTestId('audience-filter-children').click();

    const targetCard = page
      .locator('[data-testid^="collection-card-"]')
      .filter({ hasText: HEBREW_COLLECTION_LABEL })
      .first();
    await expect(targetCard).toBeVisible();
    await targetCard.getByRole('button').first().click();

    await expect(page.getByTestId('modules-grid')).toBeVisible();

    const moduleCards = page.locator('[data-testid^="module-card-"]');
    expect(await moduleCards.count()).toBeGreaterThan(0);
    await expect(moduleCards.first()).toContainText(/[\u0590-\u05FF]/);

    // First module card must fit within viewport width
    const viewport = page.viewportSize();
    const box = await moduleCards.first().boundingBox();
    if (viewport && box) {
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + OVERFLOW_TOLERANCE_PX);
    }

    // Breadcrumb and back button remain visible and enabled
    await expect(page.getByTestId('forms-breadcrumb')).toBeVisible();
    await expect(page.getByTestId('forms-nav-back')).toBeVisible();
    await expect(page.getByTestId('forms-nav-back')).toBeEnabled();

    await assertNoHorizontalOverflow(page);
  });

  test('worksheet card layout — Hebrew titles, Open/Download visible, no horizontal overflow', async ({ page }) => {
    await navigateToWorksheetsLevel(page);

    await expect(page.getByTestId('worksheets-grid')).toBeVisible();

    const worksheetCards = page.locator('[data-testid^="worksheet-card-"]');
    expect(await worksheetCards.count()).toBeGreaterThan(0);

    const firstCard = worksheetCards.first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard).toContainText(/[\u0590-\u05FF]/);

    // First worksheet card must fit within viewport width
    const viewport = page.viewportSize();
    const box = await firstCard.boundingBox();
    if (viewport && box) {
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + OVERFLOW_TOLERANCE_PX);
    }

    // Open and Download action buttons are visible on the first worksheet card
    await expect(firstCard.getByTestId('forms-file-open')).toBeVisible();
    await expect(firstCard.getByTestId('forms-file-download')).toBeVisible();

    // Breadcrumb and back button remain usable from worksheet level
    await expect(page.getByTestId('forms-breadcrumb')).toBeVisible();
    await expect(page.getByTestId('forms-nav-back')).toBeVisible();
    await expect(page.getByTestId('forms-nav-back')).toBeEnabled();

    await assertNoHorizontalOverflow(page);
  });

  test('long Hebrew content stress — collection/module cards wrap safely, no horizontal scroll', async ({ page }) => {
    // The adolescents audience contains the longest Hebrew content:
    //   - Longest title:       "הקול הביקורתי שלי מול הקול הטוב שלי" (35 chars)
    //   - Longest description: ~184 chars in adolescents-cbt-specialized-he (OCD module 06)
    await page.getByTestId('audience-filter-adolescents').click();

    const collectionCards = page.locator('[data-testid^="collection-card-"]');
    expect(await collectionCards.count()).toBeGreaterThan(0);

    // Check up to 4 cards to confirm each fits within the viewport
    const viewport = page.viewportSize();
    const cardCount = await collectionCards.count();
    for (let i = 0; i < Math.min(cardCount, 4); i++) {
      const card = collectionCards.nth(i);
      const box = await card.boundingBox();
      if (viewport && box) {
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + OVERFLOW_TOLERANCE_PX);
      }
    }

    // No horizontal scroll at the collection level
    await assertNoHorizontalOverflow(page);

    // Navigate into the first adolescent collection to reach the module level
    await collectionCards.first().getByRole('button').first().click();
    await expect(page.getByTestId('modules-grid')).toBeVisible();

    // Long descriptions on module cards must not create horizontal scroll
    await assertNoHorizontalOverflow(page);

    // Back button and breadcrumb remain usable after navigating into long-content modules
    await expect(page.getByTestId('forms-nav-back')).toBeVisible();
    await expect(page.getByTestId('forms-nav-back')).toBeEnabled();
    await expect(page.getByTestId('forms-breadcrumb')).toBeVisible();
  });

  test('Hebrew layout compatibility smoke — default and compact view modes', async ({ page }) => {
    // This test covers two representative modes only.
    // Full view-mode coverage is the responsibility of forms-library-viewmode.spec.ts (PR-3).

    const collectionCards = page.locator('[data-testid^="collection-card-"]');
    await expect(collectionCards.first()).toContainText(/[\u0590-\u05FF]/);

    // Default (medium) mode — Hebrew content visible, no English-only labels, no overflow
    await expect(page.locator('body')).not.toContainText(ENGLISH_COLLECTION_LABEL);
    await assertNoHorizontalOverflow(page);

    // Compact mode — Hebrew content still readable and within viewport
    const compactControl = page.getByTestId('forms-view-mode-compact');
    if ((await compactControl.count()) > 0) {
      await compactControl.scrollIntoViewIfNeeded();
      await compactControl.click();
      await expect(collectionCards.first()).toContainText(/[\u0590-\u05FF]/);
      await expect(page.locator('body')).not.toContainText(ENGLISH_COLLECTION_LABEL);
      await assertNoHorizontalOverflow(page);
    }
  });
});
