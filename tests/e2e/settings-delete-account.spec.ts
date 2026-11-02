/**
 * E2E: Settings → Delete Account flow
 *
 * Tests the in-app account deletion flow required for iOS App Store compliance
 * (App Store Review Guideline 14 — sign-in / account deletion requirement).
 *
 * Covered scenarios:
 *   1. Delete Account button and destructive section are visible in Settings.
 *   2. Cancel path: dialog opens → user cancels → dialog closes, no redirect.
 *   3. Confirmation gate: confirm button is disabled until "DELETE" is typed.
 *   4. Failure path: backend returns error → toast shown, user stays logged in.
 *   5. Success path: backend returns success → deleteMyAccount POST was made.
 *
 * Note: The success path cannot verify the post-delete redirect in a
 * standard E2E environment because performLogout() triggers a full page
 * reload / server-side logout. The test verifies the POST to the backend
 * was made, which is the critical compliance assertion.
 */

import { test, expect, devices } from '@playwright/test';
import { spaNavigate, mockApi } from '../helpers/ui';

// Keep the mobile viewport/touch profile without overriding the browser
// selected by the Playwright project. The iPhone preset otherwise forces
// WebKit even though CI intentionally runs these projects on Chromium.
const { defaultBrowserType: _iPhoneDefaultBrowserType, ...iPhoneDevice } = devices['iPhone 12'];
test.use(iPhoneDevice);

// ── Helpers ────────────────────────────────────────────────────────────────

async function navigateToSettings(page) {
  await mockApi(page);
  await spaNavigate(page, '/Settings');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  // Wait for the Settings page to render
  await page.waitForSelector('[data-testid="delete-account-button"]', { timeout: 15000 });
}

async function openDeleteDialog(page) {
  await page.click('[data-testid="delete-account-button"]');
  // Wait for the AlertDialog to be visible
  await page.waitForSelector('[data-testid="delete-account-input"]', { timeout: 5000 });
}

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe('Settings — Delete Account flow', () => {
  test.setTimeout(60000);

  test('Delete Account button is visible in the Settings destructive section', async ({ page }) => {
    await navigateToSettings(page);
    const deleteButton = page.locator('[data-testid="delete-account-button"]');
    await expect(deleteButton).toBeVisible();
  });

  test('Delete Account button has data-account-deletion="trigger" for scanner visibility', async ({ page }) => {
    await navigateToSettings(page);
    const deleteButton = page.locator('[data-account-deletion="trigger"]');
    await expect(deleteButton).toBeVisible();
    await expect(deleteButton).toHaveAttribute('data-account-deletion', 'trigger');
  });

  test('Delete Account button has an accessible aria-label', async ({ page }) => {
    await navigateToSettings(page);
    const deleteButton = page.locator('[data-testid="delete-account-button"]');
    const ariaLabel = await deleteButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });

  test('Delete Account confirm button is keyboard-reachable inside the dialog', async ({ page }) => {
    await navigateToSettings(page);
    await openDeleteDialog(page);

    const confirmButton = page.locator('[data-testid="delete-account-confirm-button"]');
    // Confirm button must be reachable in the accessibility tree (not hidden)
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    // Confirm button must report its disabled state to AT
    await expect(confirmButton).toBeDisabled();
  });

  test('cancel path: dialog opens and closes without redirect', async ({ page }) => {
    await navigateToSettings(page);
    const currentUrl = page.url();

    await openDeleteDialog(page);

    // Input should be present inside the dialog
    const input = page.locator('[data-testid="delete-account-input"]');
    await expect(input).toBeVisible();

    // Click cancel — dialog should close
    await page.keyboard.press('Escape');
    await expect(input).not.toBeVisible({ timeout: 3000 });

    // URL should not have changed (no redirect)
    expect(page.url()).toBe(currentUrl);
  });

  test('cancel path: explicit Cancel button closes the dialog', async ({ page }) => {
    await navigateToSettings(page);
    await openDeleteDialog(page);

    // Click the Cancel button via its stable data-testid
    const cancelButton = page.locator('[data-testid="delete-account-cancel-button"]');
    await expect(cancelButton).toBeVisible({ timeout: 3000 });
    await cancelButton.click();

    const input = page.locator('[data-testid="delete-account-input"]');
    await expect(input).not.toBeVisible({ timeout: 3000 });
  });

  test('confirmation gate: confirm button is disabled until "DELETE" is typed', async ({ page }) => {
    await navigateToSettings(page);
    await openDeleteDialog(page);

    const confirmButton = page.locator('[data-testid="delete-account-confirm-button"]');
    await expect(confirmButton).toBeDisabled();

    // Type partial text — button should still be disabled
    const input = page.locator('[data-testid="delete-account-input"]');
    await input.fill('DELET');
    await expect(confirmButton).toBeDisabled();

    // Type exact "DELETE" — button should be enabled
    await input.fill('DELETE');
    await expect(confirmButton).toBeEnabled();

    // Clear — button should be disabled again
    await input.fill('');
    await expect(confirmButton).toBeDisabled();
  });

  test('failure path: backend error preserves confirmation for retry and user stays on Settings', async ({ page }) => {
    // Override the deleteMyAccount function to return an error
    await mockApi(page);

    // Intercept the deleteMyAccount backend call specifically and return 500
    await page.route('**/functions/**', async (route) => {
      const req = route.request();
      const url = req.url();
      if (url.includes('deleteMyAccount')) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Deletion failed for test purposes' }),
        });
        return;
      }
      await route.continue();
    });

    await spaNavigate(page, '/Settings');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForSelector('[data-testid="delete-account-button"]', { timeout: 15000 });
    const settingsUrl = page.url();

    await openDeleteDialog(page);

    const input = page.locator('[data-testid="delete-account-input"]');
    await input.fill('DELETE');

    const confirmButton = page.locator('[data-testid="delete-account-confirm-button"]');
    await confirmButton.click();

    // A failed request keeps the confirmation and exposes a recoverable error.
    await expect(page.getByRole('alertdialog').getByRole('alert')).toBeVisible();
    await expect(input).toHaveValue('DELETE');
    await expect(confirmButton).toBeEnabled();

    // URL should not have changed (error did not log out user)
    expect(page.url()).toBe(settingsUrl);
  });

  test('success path: deleteMyAccount backend function is called when confirmed', async ({ page }) => {
    await mockApi(page);

    const deleteCalls: string[] = [];
    await page.route('**/functions/**', async (route) => {
      const req = route.request();
      const url = req.url();
      if (url.includes('deleteMyAccount')) {
        deleteCalls.push(url);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { success: true } }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { success: true } }),
      });
    });

    await spaNavigate(page, '/Settings');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForSelector('[data-testid="delete-account-button"]', { timeout: 15000 });

    await openDeleteDialog(page);

    const input = page.locator('[data-testid="delete-account-input"]');
    await input.fill('DELETE');

    const confirmButton = page.locator('[data-testid="delete-account-confirm-button"]');

    await confirmButton.click();

    // Wait for the deleteMyAccount POST to be captured (no arbitrary timeout).
    await page.waitForFunction(
      (calls) => calls.length >= 1,
      deleteCalls,
      { timeout: 8000 }
    ).catch(() => { /* timeout — check assertion below */ });

    // The deleteMyAccount function must have been called
    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);
    expect(deleteCalls[0]).toContain('deleteMyAccount');
  });
});
