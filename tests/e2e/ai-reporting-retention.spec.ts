import { test, expect } from '@playwright/test';
import { prepareChatStage2, openStage2Conversation } from '../helpers/chatStage2';
import { readinessTranslations } from '../../src/components/i18n/readinessTranslations';

async function prepareRetentionPanel(page) {
  // Let Chat's startup cleanup finish against the baseline mock before replacing
  // it with the explicit manual-cleanup scenario. Otherwise it consumes attempt 1.
  const startupCleanup = page.waitForResponse(response => /\/functions\/retentionCleanup(?:[/?]|$)/.test(response.url()));
  await prepareChatStage2(page);
  await (await startupCleanup).finished();
}

for (const language of ['en', 'he', 'es', 'fr', 'de', 'it', 'pt']) test(`AI report stays in app and retries safely: ${language}`, async ({ page }, info) => {
  const width = info.project.name.includes('mobile') ? 390 : 1280;
  const state = await prepareChatStage2(page, { language, width });
  // Two replies: feedback sampling does not request thumbs, but both replies
  // must still offer reporting. Hidden user text must never be submitted.
  // Consecutive assistant blocks intentionally render as one response. Use two
  // distinct user turns so this really exercises two separately displayed replies.
  state.conversation.messages.push({ id: 'second-user', role: 'user', content: 'Second synthetic user turn.', created_date: new Date().toISOString() } as any);
  state.conversation.messages.push({ id: 'second-assistant', role: 'assistant', content: 'Another synthetic response.', status: 'completed', created_date: new Date().toISOString(), metadata: { status: 'completed', completed: true, feedback_finality_verified: true } } as any);
  let fail = true; const submissions: any[] = [];
  await page.route(/\/functions\/aiContentReports(?:[/?]|$)/, route => {
    submissions.push(route.request().postDataJSON());
    return route.fulfill({ status: fail ? 503 : 200, json: fail ? { error: 'REPORT_UNAVAILABLE' } : { success: true, report_id: 'synthetic-report' } });
  });
  await openStage2Conversation(page, width);
  await expect(page.getByTestId('ai-report-open')).toHaveCount(2);
  await expect(page.getByRole('log')).toContainText('Another synthetic response.');
  await expect(page.getByTestId('feedback-helpful')).toHaveCount(0);
  const trigger = page.getByTestId('ai-report-open').first();
  await expect(trigger).toHaveText(readinessTranslations[language].ai_report.open);
  await trigger.click();
  const dialog = page.getByTestId('ai-report-dialog'); await expect(dialog).toBeVisible();
  await page.getByTestId('ai-report-reason').selectOption('harmful_advice');
  await page.getByTestId('ai-report-details').fill('Synthetic report details');
  await page.getByTestId('ai-report-submit').click(); await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('ai-report-details')).toHaveValue('Synthetic report details');
  await expect(page.getByTestId('ai-report-success')).toHaveCount(0);
  fail = false; await page.getByTestId('ai-report-submit').click(); await expect(page.getByTestId('ai-report-success')).toBeVisible();
  expect(submissions).toHaveLength(2); expect(submissions[0]).toEqual(submissions[1]);
  expect(submissions[1]).toMatchObject({ conversation_id: 'qa-chat-stage2', message_id: 'qa-assistant', reason: 'harmful_advice', details: 'Synthetic report details' });
  expect(submissions[1].response_text).toContain('One small step is enough.');
  expect(JSON.stringify(submissions)).not.toContain('Synthetic UI check only.');
  expect(JSON.stringify(submissions)).not.toContain('Second synthetic user turn.');
  await expect(page).toHaveURL(/\/Chat$/);
});

test('retention partial result remains retryable and shows confirmed counts', async ({ page }) => {
  await prepareRetentionPanel(page);
  let calls = 0;
  await page.route(/\/functions\/retentionCleanup(?:[/?]|$)/, route => {
    calls++;
    return route.fulfill({ json: { success: calls > 1, partial: calls === 1, deletedMoodEntries: 2, deletedJournalEntries: 0, archivedConversations: 0 } });
  });
  await page.evaluate(async () => { const { renderReadinessFixture } = await import('/tests/fixtures/readiness-preview.jsx'); renderReadinessFixture('retention'); });
  await page.getByTestId('retention-cleanup-run').click();
  await expect(page.getByTestId('retention-cleanup-result')).toHaveAttribute('role', 'alert');
  await expect(page.getByTestId('retention-cleanup-result')).toContainText('2 mood entries');
  await page.getByTestId('retention-cleanup-run').click();
  await expect(page.getByTestId('retention-cleanup-result')).toHaveAttribute('role', 'status');
  expect(calls).toBe(2);
});

test('legacy upload references show a support-review message without storage paths', async ({ page }) => {
  await prepareRetentionPanel(page);
  await page.route(/\/functions\/retentionCleanup(?:[/?]|$)/, route => route.fulfill({ json: { success: false, partial: true, manualReviewRequired: true, deletedMoodEntries: 0, deletedJournalEntries: 0, archivedConversations: 0 } }));
  await page.evaluate(async () => { const { renderReadinessFixture } = await import('/tests/fixtures/readiness-preview.jsx'); renderReadinessFixture('retention'); });
  await page.getByTestId('retention-cleanup-run').click();
  const result = page.getByTestId('retention-cleanup-result');
  await expect(result).toHaveAttribute('role', 'alert');
  await expect(result).toContainText(readinessTranslations.en.retention_cleanup.manual_review);
  await expect(result).toContainText('0 journal entries');
});

test('operator records a resolution, and failed writes keep the draft', async ({ page }) => {
  await prepareChatStage2(page);
  let status = 'open'; let fail = true; const writes: any[] = [];
  await page.route(/\/functions\/aiContentReports(?:[/?]|$)/, route => {
    const data = route.request().postDataJSON();
    if (data.action === 'list') return route.fulfill({ json: { reports: status === 'open' ? [{ id: 'synthetic-report', reason: 'harmful_advice', status, response_text: 'Synthetic reported response', reported_at: '2026-11-12' }] : [], next_offset: null } });
    writes.push(data); if (fail) return route.fulfill({ status: 503, json: { error: 'REPORT_UNAVAILABLE' } });
    status = data.status; return route.fulfill({ json: { success: true } });
  });
  await page.evaluate(async () => { const { renderReadinessFixture } = await import('/tests/fixtures/readiness-preview.jsx'); renderReadinessFixture('admin'); });
  const report = page.getByTestId('ai-report-review'); await expect(report).toBeVisible();
  await report.getByRole('combobox').selectOption('resolved');
  await expect(report.getByRole('button', { name: 'Save review', exact: true })).toBeDisabled();
  await report.getByRole('textbox').fill('Synthetic review action'); await report.getByRole('button', { name: 'Save review', exact: true }).click();
  await expect(report.getByRole('alert')).toBeVisible(); await expect(report.getByRole('textbox')).toHaveValue('Synthetic review action');
  fail = false; await report.getByRole('button', { name: 'Save review', exact: true }).click(); await expect(report).toHaveCount(0);
  expect(writes.at(-1)).toEqual({ action: 'review', report_id: 'synthetic-report', status: 'resolved', resolution: 'Synthetic review action' });
});
