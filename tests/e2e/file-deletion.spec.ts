import { test, expect } from '@playwright/test';
import { mockApi, spaNavigate } from '../helpers/ui';

test('requesting attachment erasure requires consent and retains pending status on refresh', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  const calls: any[] = []; let requested = false;
  const row = { id: 'request-a', status: 'requested', file_count: 2, incomplete: false };
  await page.route('**/api/apps/*/functions/fileDeletion', route => {
    const input = route.request().postDataJSON(); calls.push(input);
    if (input.action === 'request') requested = true;
    return route.fulfill({ json: input.action === 'status' ? { requests: requested ? [row] : [] } : row });
  });
  await spaNavigate(page, '/Settings');
  const panel = page.getByTestId('file-deletion-panel');
  await panel.scrollIntoViewIfNeeded();
  const request = panel.getByRole('button', { name: 'Request file deletion', exact: true });
  await expect(request).toBeDisabled();
  await panel.getByRole('checkbox').check();
  await request.click();
  await expect(panel.getByRole('status')).toContainText('Storage deletion is still pending');
  await expect(request).toBeDisabled();
  await page.reload();
  await panel.getByRole('button', { name: 'Check requests', exact: true }).click();
  await expect(panel.getByRole('listitem')).toContainText('Awaiting support submission');
  expect(calls).toEqual([{ action: 'request' }, { action: 'status' }]);
});

test('failed file-deletion requests remain retryable without claiming completion', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  await page.route('**/api/apps/*/functions/fileDeletion', route => route.fulfill({ status: 503, json: { error: 'FILES_UNAVAILABLE' } }));
  await spaNavigate(page, '/Settings');
  const panel = page.getByTestId('file-deletion-panel');
  await panel.getByRole('checkbox').check();
  await panel.getByRole('button', { name: 'Request file deletion', exact: true }).click();
  await expect(panel.getByRole('alert')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Request file deletion', exact: true })).toBeEnabled();
  await expect(panel.getByRole('listitem')).toHaveCount(0);
});

test('operator must download the exact manifest and record written support confirmation before cleanup', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  await page.route('**/entities/User/me', route => route.fulfill({ json: { id: 'test-user-123', email: 'admin@example.test', role: 'admin', onboarding_completed: true } }));
  let status = 'requested'; const calls: any[] = [];
  await page.route('**/api/apps/*/functions/fileDeletion', route => {
    const input = route.request().postDataJSON(); calls.push(input);
    if (input.action === 'list') return route.fulfill({ json: { requests: [{ id: 'request-a', subject_email: 'qa@example.test', status, file_count: 2 }], next_offset: null } });
    if (input.action === 'export') return route.fulfill({ json: { request_id: 'request-a', manifest_hash: 'snapshot-1', incomplete: false, status,
      manifest: { app_name: 'Mindful Path', file_uris: ['private/synthetic/a', 'private/synthetic/old'] } } });
    if (input.action === 'submitted') status = 'submitted';
    if (input.action === 'confirm') status = 'confirmed';
    if (input.action === 'clear_references') status = 'references_cleared';
    return route.fulfill({ json: { id: 'request-a', status } });
  });
  await spaNavigate(page, '/AdminFeatureFlags');
  const panel = page.getByTestId('file-deletion-admin');
  await panel.getByRole('button', { name: 'Check requests', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Clear references after confirmation', exact: true })).toHaveCount(0);
  const download = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Download support manifest', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('mindful-path-file-deletion-request-a.json');
  await expect(panel).not.toContainText('private/synthetic');
  await panel.getByLabel('Support ticket reference').fill('ticket-123');
  await panel.getByRole('button', { name: 'Record as submitted', exact: true }).click();
  const confirm = panel.getByRole('button', { name: 'Record support confirmation', exact: true });
  await expect(confirm).toBeDisabled();
  await panel.getByRole('checkbox').check();
  await confirm.click();
  await panel.getByRole('button', { name: 'Clear references after confirmation', exact: true }).click();
  await expect(panel.getByRole('listitem')).toContainText('Stored references cleared');
  expect(calls.filter(call => call.action === 'confirm')).toEqual([{ action: 'confirm', request_id: 'request-a', manifest_hash: 'snapshot-1', ticket_reference: 'ticket-123', all_files_confirmed: true }]);
});

test('a pending account deletion shows support instead of asking for age again', async ({ page }) => {
  await mockApi(page);
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  await page.route('**/api/apps/*/functions/accountAccess', route => route.fulfill({ json: {
    schema_version: 1, user_id: 'test-user-123', policy_version: '2026-11-11', adult_status: 'pending', eligible: false, forms_review_allowed: false, deletion_pending: true,
  } }));
  await page.goto('/Chat');
  await expect(page.getByTestId('account-access-gate')).toContainText('Account deletion in progress');
  await expect(page.getByRole('button', { name: "I'm 18 or Older", exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Support', exact: true })).toBeVisible();
  await expect(page.getByTestId('chat-root')).toHaveCount(0);
});
