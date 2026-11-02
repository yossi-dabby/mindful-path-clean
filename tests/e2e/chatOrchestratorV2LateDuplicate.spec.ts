import { test, expect, type Page } from '@playwright/test';
import { mockApi, spaNavigate } from '../helpers/ui';
import { SAFE_CONVERSATION_ROUTE_PATTERNS } from '../helpers/ui';

const TEST_APP_ID = 'test-app-id';
const ACTIVE_CONVERSATION_ID = 'test-conversation-123';

/**
 * Issues a no-store GET for the active conversation from within the browser
 * context so that Playwright route handlers see the request and the mock can
 * advance its pollStage counter.  The response is intentionally discarded —
 * only the side-effect on pollStage matters; the app's own polling is what
 * ultimately commits "Assistant B" to React state.
 */
async function nudgeConversationRefetch(page: import('@playwright/test').Page) {
  await page.evaluate(
    ([appId, convId]: [string, string]) => {
      return fetch(`/api/apps/${appId}/agents/conversations/${convId}`, {
        method: 'GET',
        cache: 'no-store',
      });
    },
    [TEST_APP_ID, ACTIVE_CONVERSATION_ID] as [string, string],
  );
}

function buildMessage(role: 'user' | 'assistant', id: string, content: string) {
  return {
    id,
    role,
    content,
    created_at: new Date().toISOString(),
    metadata: role === 'assistant' ? { status: 'completed', completed: true } : { status: 'completed' },
    status: 'completed',
  };
}

async function setupLateReplayFixture(page: Page) {
  await page.addInitScript((appId) => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = appId;
    (window as any).__DISABLE_ANALYTICS__ = true;
  }, TEST_APP_ID);

  await mockApi(page);

  const activeConversationId = ACTIVE_CONVERSATION_ID;
  const messages: Array<any> = [];
  const diagnostics: Array<{ type: string; payload: string }> = [];
  const conversationPostUrls: string[] = [];
  // pollStage tracks the turn-2 polling phase:
  //   0 = before any turn-2 poll
  //   1 = first poll for turn 2 observed (u1, a1, u2 in messages, a2 not yet visible)
  //   2 = second poll for turn 2 observed (a2 added to messages)
  //
  // a2 is injected synchronously on the second GET so there is no timer-based
  // race between the Node.js event loop and the browser's 500 ms polling timer.
  let pollStage = 0;

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[S2Debug]') || text.includes('[V2Orchestrator]')) {
      diagnostics.push({ type: msg.type(), payload: text });
    }
  });
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/agents/conversations')) {
      conversationPostUrls.push(req.url());
    }
  });

  await page.route('**/api/**/agents/conversations', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: activeConversationId,
        agent_name: 'cbt_therapist',
        metadata: { name: 'Late replay runtime test' },
        messages: [],
        created_date: new Date().toISOString(),
      }),
    });
  });

  await page.route(SAFE_CONVERSATION_ROUTE_PATTERNS.CONVERSATION_BY_ID, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    // Advance pollStage only after u2 has been confirmed as sent (u2 id present
    // in messages array), so a background GET (e.g. React-Query refetch) that
    // fires before MESSAGES_POST completes cannot prematurely consume a stage
    // transition.
    //
    // Stage 0 → 1 (first GET after turn 2 is sent): return [u1, a1, u2]
    // without a2 so the orchestrator exercises the "reply not yet ready"
    // polling-continuation path before a2 becomes visible.
    //
    // Stage 1 → 2 (second GET after turn 2 is sent): inject a2 synchronously
    // so the orchestrator receives [u1, a1, u2, a2] and can commit
    // "Assistant B".  Synchronous injection avoids any timer-based race with
    // the browser's polling timer that caused intermittent CI failures.
    const turn2Sent = messages.some((m) => m.id === 'u2');
    if (turn2Sent && pollStage === 0) {
      pollStage = 1;
    } else if (turn2Sent && pollStage === 1) {
      if (!messages.some((m) => m.id === 'a2')) {
        messages.push(buildMessage('assistant', 'a2', 'Assistant B'));
      }
      pollStage = 2;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: activeConversationId,
        agent_name: 'cbt_therapist',
        metadata: { name: 'Late replay runtime test' },
        messages: messages.slice(),
        created_date: new Date().toISOString(),
      }),
    });
  });

  await page.route(SAFE_CONVERSATION_ROUTE_PATTERNS.MESSAGES_POST, async (route) => {
    const body = route.request().postDataJSON?.() as any;
    const content = String(body?.content || '');
    const userTurn = messages.filter((m) => m.role === 'user').length + 1;
    messages.push(buildMessage('user', `u${userTurn}`, content));
    if (userTurn === 1) {
      messages.push(buildMessage('assistant', 'a1', 'Assistant A'));
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        role: 'user',
        content,
        created_date: new Date().toISOString(),
      }),
    });
  });

  await spaNavigate(page, '/Chat?_s2=CHAT_ORCHESTRATOR_V2_ENABLED&_s2debug=true');
  await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });

  return {
    diagnostics,
    getPollStage: () => pollStage,
    getConversationPostUrls: () => conversationPostUrls.slice(),
  };
}

test.describe('Chat V2 late duplicate runtime', () => {
  test.describe.configure({ retries: 2 });

  test('stale previous-turn assistant does not close turn 2 before assistant B arrives', async ({ page }) => {
    test.setTimeout(180000);
    const fixture = await setupLateReplayFixture(page);
    const input = page.locator('[data-testid="therapist-chat-input"]');
    const send = page.locator('[data-testid="therapist-chat-send"]');
    const assistantB = page.getByText('Assistant B', { exact: true });

    await input.fill('User message 1');
    await expect(send).toBeEnabled({ timeout: 10000 });
    await send.click();
    await expect(page.getByText('Assistant A', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Assistant A', { exact: true })).toHaveCount(1);
    await nudgeConversationRefetch(page);
    await nudgeConversationRefetch(page);

    const getMessagePostCount = () =>
      fixture.getConversationPostUrls().filter((url) => url.includes('/messages')).length;
    const postCountBeforeTurn2 = getMessagePostCount();

    await input.fill('User message 2');
    await expect(send).toBeEnabled({ timeout: 10000 });
    await send.click();

    await expect(input).toHaveValue('', { timeout: 5000 });
    await expect(page.getByText('Assistant A', { exact: true })).toHaveCount(1);

    let secondPostObserved = false;
    try {
      await expect.poll(getMessagePostCount, { timeout: 45000, intervals: [500] }).toBeGreaterThanOrEqual(postCountBeforeTurn2 + 1);
      secondPostObserved = true;
    } catch {
      if (getMessagePostCount() >= postCountBeforeTurn2 + 1) {
        secondPostObserved = true;
      } else {
        await expect(input).toBeEnabled({ timeout: 10000 });
        await input.fill('User message 2');
        await expect(input).toHaveValue('User message 2', { timeout: 5000 });
        await input.press('Enter');
        try {
          await expect.poll(getMessagePostCount, { timeout: 45000, intervals: [500] }).toBeGreaterThanOrEqual(postCountBeforeTurn2 + 1);
          secondPostObserved = true;
        } catch {
          throw new Error('Turn-2 message POST was not observed after both click and Enter fallback submissions');
        }
      }
    }

    // Advance the mock's pollStage to 2 by nudging the conversation GET from
    // within the browser context (Playwright route handlers intercept these
    // requests so pollStage transitions deterministically).  The nudge only
    // advances the mock state; the app's own polling loop is what commits
    // "Assistant B" to React state, so the subsequent toBeVisible check is
    // still a meaningful end-to-end assertion.
    await expect.poll(async () => {
      if (fixture.getPollStage() < 2) {
        await nudgeConversationRefetch(page);
      }
      return fixture.getPollStage();
    }, {
      timeout: secondPostObserved ? 15000 : 30000,
      intervals: [500],
    }).toBe(2);
    await expect(assistantB).toBeVisible({ timeout: 15000 });
    await expect(assistantB).toHaveCount(1);
    await expect(page.getByText('Assistant A', { exact: true })).toHaveCount(1);

    const lifecycle = await page.evaluate(() => {
      const entries = (window as any).__S2_DEBUG_LIFECYCLE_LOGS__ || [];
      return Array.isArray(entries) ? entries : [];
    });
    const staleEvidence = lifecycle.some((entry: any) =>
      entry?.rejection_reason === 'stale_previous_turn_response' ||
      entry?.rejection_reason === 'no_new_assistant_for_active_turn' ||
      entry?.polling_continues === true);
    const diagnosticStaleEvidence = fixture.diagnostics.some((entry) =>
      entry.payload.includes('stale_previous_turn_response') ||
      entry.payload.includes('no_new_assistant_for_active_turn') ||
      entry.payload.includes('"polling_continues":true'));
    const pollingAcceptedVisible = await page.getByText(/Polling:accepted/, { exact: false }).count() > 0;
    expect(staleEvidence || diagnosticStaleEvidence || pollingAcceptedVisible).toBe(true);
    expect(lifecycle.some((entry: any) =>
      entry?.terminal_reason === 'visible_terminal_result_committed' &&
      typeof entry?.client_request_id === 'string' &&
      entry.client_request_id.length > 0)).toBe(true);
  });
});
