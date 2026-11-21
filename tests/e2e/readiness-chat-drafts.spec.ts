import { test, expect } from '@playwright/test';
import { prepareChatStage2, openStage2Conversation } from '../helpers/chatStage2';

const tab = (page: any, name: string) => page.locator(`[data-mobile-bottom-nav] a[href="/${name}"]`);
async function roundTrip(page: any) {
  await tab(page, 'Home').click();
  await expect(page.getByTestId('daily-path')).toBeVisible();
  await tab(page, 'Chat').click();
  await expect(page.getByTestId('therapist-chat-input')).toBeVisible();
}

test('drafts: returning to Chat restores the selected conversation and its text', async ({ page }) => {
  await prepareChatStage2(page); await openStage2Conversation(page, 390);
  const input = page.getByTestId('therapist-chat-input');
  await input.fill('SYNTHETIC selected conversation draft');
  await roundTrip(page);
  await expect(input).toHaveValue('SYNTHETIC selected conversation draft');
  await expect(page.getByRole('log')).toContainText('One small step is enough.');
});

test('drafts: switching conversations never transfers unsent text', async ({ page }) => {
  const state = await prepareChatStage2(page);
  const second = structuredClone(state.conversation);
  second.id = 'qa-chat-second'; second.metadata.name = 'QA second conversation';
  await page.route(/\/api\/.*\/agents\/conversations(?:[/?]|$)/, async route => {
    if (route.request().method() !== 'GET') return route.fallback();
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/agents\/conversations\/(?:v2\/)?([^/]+)/);
    return route.fulfill({ json: match
      ? (match[1] === second.id ? second : state.conversation)
      : (!url.searchParams.get('agent_name') || url.searchParams.get('agent_name') === 'cbt_therapist'
        ? [state.conversation, second] : []) });
  });
  await page.reload(); await openStage2Conversation(page, 390);
  const input = page.getByTestId('therapist-chat-input');
  await input.fill('SYNTHETIC draft for first conversation');
  await page.getByRole('button', { name: 'Open conversations sidebar', exact: true }).click();
  await page.getByRole('button', { name: /^QA second conversation/ }).click();
  await expect(input).toHaveValue('');
  await input.fill('SYNTHETIC draft for second conversation');
  await page.getByRole('button', { name: 'Open conversations sidebar', exact: true }).click();
  await page.getByRole('button', { name: /^QA stage 2 conversation/ }).click();
  await expect(input).toHaveValue('SYNTHETIC draft for first conversation');
  await page.getByRole('button', { name: 'Open conversations sidebar', exact: true }).click();
  await page.getByRole('button', { name: /^QA second conversation/ }).click();
  await expect(input).toHaveValue('SYNTHETIC draft for second conversation');
});

test('drafts: successfully submitted text does not return after switching tabs', async ({ page }) => {
  const state = await prepareChatStage2(page); await openStage2Conversation(page, 390);
  const input = page.getByTestId('therapist-chat-input');
  const text = 'SYNTHETIC ordinary day planning test';
  await input.fill(text); await page.getByTestId('therapist-chat-send').click();
  await expect.poll(() => state.conversation.messages.some(message => message.role === 'user' && message.content.includes(text))).toBe(true);
  await expect(input).toHaveValue('');
  await roundTrip(page); await expect(input).toHaveValue('');
});
