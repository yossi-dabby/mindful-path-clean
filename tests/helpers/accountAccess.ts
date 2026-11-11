import type { Page } from '@playwright/test';

// Explicit external account-service fixture, never a flag in production code.
export async function mockAccountAccess(page: Page, userId: string, formsReviewAllowed = false) {
  await page.route('**/api/apps/*/functions/accountAccess', route => route.fulfill({ json: {
    schema_version: 1, user_id: userId, policy_version: '2026-11-11',
    adult_status: 'confirmed', eligible: true, forms_review_allowed: formsReviewAllowed,
  } }));
}
