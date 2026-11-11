import { test, expect } from '@playwright/test';
import { mockApi } from '../helpers/ui';

async function setup(page) {
  await mockApi(page);
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('age_verified', 'true'); // Must have no authority.
    document.body?.setAttribute('data-test-env', 'true');
    window.__DISABLE_ANALYTICS__ = true;
  });
  const state = { adult_status: 'pending', available: true, calls: [] as any[] };
  await page.route('**/api/apps/*/functions/accountAccess', async route => {
    const input = route.request().postDataJSON(); state.calls.push(input);
    if (!state.available) return route.fulfill({ status: 503, json: { error: 'ACCESS_UNAVAILABLE' } });
    if (input.action === 'attest') state.adult_status = input.adult ? 'confirmed' : 'declined';
    await route.fulfill({ json: {
      schema_version: 1, user_id: 'test-user-123', policy_version: '2026-11-11',
      adult_status: state.adult_status, eligible: state.adult_status === 'confirmed', forms_review_allowed: false,
    } });
  });
  return state;
}

test('existing OAuth/email account needs server age confirmation despite local and automation flags', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/Chat?e2e-test=1');
  const dialog = page.getByRole('dialog', { name: 'Confirm your age' });
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('chat-root')).toHaveCount(0);
  await expect(dialog.getByRole('link', { name: 'Privacy', exact: true })).toHaveAttribute('href', /railway\.app\/privacy\?lang=en/);
  await dialog.getByRole('button', { name: "I'm 18 or Older", exact: true }).click();
  await expect(page.getByTestId('chat-root')).toBeVisible();
  expect(state.calls.find(call => call.action === 'attest')).toEqual({ action: 'attest', adult: true, policy_version: '2026-11-11', language: 'en' });
  await page.evaluate(() => localStorage.removeItem('age_verified'));
  await page.reload();
  await expect(page.getByTestId('chat-root')).toBeVisible();
  expect(state.calls.filter(call => call.action === 'attest')).toHaveLength(1);
});

test('under-18 declaration blocks all protected tools on reload while support remains accessible', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/Tools');
  await page.getByRole('button', { name: "I'm Under 18", exact: true }).click();
  await expect(page.getByTestId('account-access-gate')).toContainText('restricted');
  await page.evaluate(() => localStorage.setItem('age_verified', 'true'));
  await page.goto('/Chat?e2e-test=1');
  await expect(page.getByTestId('account-access-gate')).toContainText('under-18');
  await expect(page.getByTestId('chat-root')).toHaveCount(0);
  await expect(page.getByRole('button', { name: "I'm 18 or Older", exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Support', exact: true })).toHaveAttribute('href', /\/contact\?lang=en/);
  expect(state.adult_status).toBe('declined');
});

test('initial access-service failure blocks protected UI and supports retry', async ({ page }) => {
  const state = await setup(page); state.available = false;
  await page.goto('/Chat');
  await expect(page.getByRole('alert')).toContainText('could not check');
  await expect(page.getByTestId('chat-root')).toHaveCount(0);
  state.available = true;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Confirm your age' })).toBeVisible();
});

test('a response for a different account never opens protected UI', async ({ page }) => {
  await setup(page);
  await page.route('**/api/apps/*/functions/accountAccess', route => route.fulfill({ json: {
    schema_version: 1, user_id: 'another-user', policy_version: '2026-11-11',
    adult_status: 'confirmed', eligible: true, forms_review_allowed: true,
  } }));
  await page.goto('/Chat');
  await expect(page.getByRole('alert')).toContainText('could not check');
  await expect(page.getByTestId('chat-root')).toHaveCount(0);
});

test('public privacy and deletion information do not require age confirmation', async ({ page }) => {
  const state = await setup(page); state.available = false;
  for (const path of ['/privacy', '/account-deletion']) {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByTestId('account-access-gate')).toHaveCount(0);
  }
  expect(state.calls).toHaveLength(0);
});

test('administrator grants and revokes review access for one existing ordinary account', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  await page.route('**/entities/User/me', route => route.fulfill({ json: {
    id: 'test-user-123', email: 'admin@example.test', role: 'admin', onboarding_completed: true,
  } }));
  const calls: any[] = [];
  let allowed = false;
  await page.route('**/api/apps/*/functions/accountAccess', route => {
    const input = route.request().postDataJSON(); calls.push(input);
    if (input.action === 'grant_forms') allowed = true;
    if (input.action === 'revoke_forms') allowed = false;
    const self = input.action === 'status';
    return route.fulfill({ json: {
      schema_version: 1, policy_version: '2026-11-11', adult_status: 'confirmed', eligible: true,
      user_id: self ? 'test-user-123' : 'reviewer-a', forms_review_allowed: self || allowed,
      ...(self ? {} : { email: 'reviewer@example.test', administrator: false }),
    } });
  });
  await page.goto('/AdminFeatureFlags');
  const panel = page.getByTestId('account-access-admin');
  await panel.getByLabel('Existing account email').fill('reviewer@example.test');
  await panel.getByRole('button', { name: 'Find account', exact: true }).click();
  await panel.getByRole('button', { name: 'Grant review access', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Revoke review access', exact: true })).toBeEnabled();
  await panel.getByRole('button', { name: 'Revoke review access', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Grant review access', exact: true })).toBeEnabled();
  expect(calls.filter(call => ['grant_forms', 'revoke_forms'].includes(call.action))).toEqual([
    { action: 'grant_forms', email: 'reviewer@example.test', user_id: 'reviewer-a' },
    { action: 'revoke_forms', email: 'reviewer@example.test', user_id: 'reviewer-a' },
  ]);
});
