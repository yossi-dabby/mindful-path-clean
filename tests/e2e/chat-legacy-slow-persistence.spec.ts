import { test, expect } from '@playwright/test';
import { mockApi, SAFE_CONVERSATION_ROUTE_PATTERNS } from '../helpers/ui';

for (const delayedPhase of ['persistence', 'generation']) {
test('legacy chat serializes follow-ups during slow ' + delayedPhase, async ({ page }) => {
  test.setTimeout(60000);
  await mockApi(page);
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
    (window as any).__VITE_CHAT_ORCHESTRATOR_V2_ENABLED__ = 'false';
  });
  const messages: any[] = [];
  const posts: string[] = [];
  let releaseFirst!: () => void;
  const firstPersisted = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const conversation = () => ({
    id: 'test-conversation-123', agent_name: 'cbt_therapist',
    metadata: { name: 'Synthetic slow persistence test' },
    messages: messages.slice(), created_date: new Date().toISOString(),
  });
  await page.route(SAFE_CONVERSATION_ROUTE_PATTERNS.CONVERSATION_BY_ID, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({ json: conversation() });
  });
  await page.route(SAFE_CONVERSATION_ROUTE_PATTERNS.MESSAGES_POST, async (route) => {
    const content = String(route.request().postDataJSON()?.content || '');
    const turn = posts.push(content);
    if (turn === 1 && delayedPhase === 'persistence') await firstPersisted;
    const user = { id: 'u' + turn, role: 'user', content, status: 'completed', created_date: new Date().toISOString() };
    messages.push(user);
    const answer = {
      id: 'a' + turn, role: 'assistant', content: 'Confirmed answer ' + turn,
      status: 'completed', metadata: { status: 'completed', completed: true },
      created_date: new Date().toISOString(),
    };
    if (turn === 1 && delayedPhase === 'generation') {
      void firstPersisted.then(() => messages.push(answer));
    } else {
      messages.push(answer);
    }
    await route.fulfill({ json: user });
  });

  await page.goto('/Chat');
  const input = page.getByTestId('therapist-chat-input');
  await expect(input).toBeVisible();
  await input.fill('First synthetic message');
  await input.press('Enter');
  await expect.poll(() => posts.length).toBe(1);
  // Reproduce the real API taking longer than the old loading failsafe.
  await page.waitForTimeout(11000);
  await input.fill('Second synthetic message');
  await input.press('Enter');
  await expect(input).toHaveValue('');
  await page.waitForTimeout(1000);
  try {
    expect(posts).toHaveLength(1);
  } finally {
    releaseFirst();
  }
  await expect(page.getByRole('log').getByText('Confirmed answer 1', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect.poll(() => posts.length, { timeout: 20000 }).toBe(2);
  await expect(page.getByRole('log').getByText('Confirmed answer 2', { exact: true })).toBeVisible({ timeout: 20000 });
  expect(posts[0]).toContain('First synthetic message');
  expect(posts[1]).toContain('Second synthetic message');
  await expect(page.getByRole('log').getByText('Confirmed answer 1', { exact: true })).toBeVisible();
});
}
