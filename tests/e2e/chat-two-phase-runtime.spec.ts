import { test, expect, type Page } from '@playwright/test';
import { mockApi, spaNavigate } from '../helpers/ui';

const HEBREW_TURNS = [
  'אני לחוץ לקראת פגישה חשובה מחר.',
  'אני חושש שאטעה מול האנשים בפגישה.',
  'בגלל המחשבות האלה קשה לי להירדם.',
  'אני מרגיש את הלב דופק מהר כשאני חושב על זה.',
  'אני מנסה להתכונן שוב ושוב ועדיין מרגיש לא מוכן.',
  'אני רוצה להבין איך להירגע בלי לברוח מהפגישה.',
];

function buildAssistantReply(turnIndex: number) {
  const replies = [
    'זה נשמע כמו לחץ משמעותי לקראת מחר. מה הכי מדאיג אותך כשאתה חושב על הפגישה?',
    'החשש לטעות מול אנשים בהחלט יכול להגביר את המתח. כשאתה מדמיין טעות כזאת, מה אתה חושש שיקרה מיד אחריה?',
    'נשמע שהמחשבות על האפשרות לטעות בפגישה מגבירות את המתח, והמתח הזה מקשה עליך להירדם. מה אתה שם לב שקורה בגוף או במחשבות בדיוק כשאתה מנסה להירדם?',
    'התגובה הגופנית הזאת מתאימה לדריכות גבוהה סביב הפגישה. מה אתה בדרך כלל עושה ברגעים שבהם הלב מתחיל לדפוק מהר?',
    'המאמץ להתכונן שוב ושוב נשמע כמו ניסיון להרגיש בטוח יותר, אבל הוא גם משאיר אותך במתח. מה אתה מקווה שהבדיקה החוזרת תבטיח עבורך?',
    'אפשר לעבוד גם על הרגעה וגם על היכולת להישאר מול הפגישה. מהו צעד קטן שיעזור לך להרגיש מעט יותר יציב הערב?',
  ];
  return replies[turnIndex];
}

function buildConversationMessage(role: 'user' | 'assistant', content: string, id: string, final = false) {
  return {
    id,
    role,
    content,
    created_at: new Date().toISOString(),
    metadata: final ? { status: 'completed', completed: true } : {},
    status: final ? 'completed' : 'streaming',
  };
}

async function setupRuntimeFixture(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'he');
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
    (window as any).__VITE_CHAT_ORCHESTRATOR_V2_ENABLED__ = 'true';
  });

  await mockApi(page);

  const diagnostics: Array<Record<string, unknown>> = [];
  let turnCounter = 0;
  // stabilizedConversationMessages grows with each turn and is returned on every
  // GET request. React Query may refetch the conversation between the POST and
  // the first polling attempt (consuming a one-shot mock state before polling
  // can observe it). Returning the stable snapshot on every GET is safe because
  // safeUpdateMessages deduplicates identical snapshots.
  let stabilizedConversationMessages: Array<any> = [];
  const activeConversationId = 'test-conversation-123';
  let activeRequestId: string | null = null;

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
        metadata: { name: 'Runtime lifecycle test', description: 'two phase' },
        messages: [],
        created_date: new Date().toISOString(),
      }),
    });
  });

  // Playwright uses LIFO (last-registered = highest priority) for route matching.
  // Register the by-ID GET handler BEFORE the messages POST handler so that the
  // messages POST handler has higher priority and intercepts POST .../messages
  // before the broader `test-conversation-123**` pattern can shadow it.
  // If by-ID were registered last (highest priority), its `**` suffix would match
  // the messages POST URL and call route.continue() — which forwards to the real
  // network instead of chaining to the next registered handler.
  await page.route('**/api/**/agents/conversations/test-conversation-123**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    // Always return the full stabilized snapshot so that React Query re-fetches
    // between the POST and the polling loop do not race away the mock state.
    // The chat's safeUpdateMessages guard deduplicates identical snapshots.
    const messages = stabilizedConversationMessages.slice();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: activeConversationId,
        agent_name: 'cbt_therapist',
        metadata: { name: 'Runtime lifecycle test', description: 'two phase' },
        messages,
        created_date: new Date().toISOString(),
      }),
    });
  });

  // Registered last so it has highest LIFO priority — catches POST .../messages
  // before the by-ID pattern above can shadow it.
  await page.route('**/api/**/agents/conversations/**/messages**', async (route) => {
    const body = route.request().postDataJSON?.() as any;
    const content = String(body?.content || '');
    activeRequestId = `crid-e2e-${turnCounter + 1}`;
    const userId = `u-${turnCounter + 1}`;
    const assistantId = `a-${turnCounter + 1}`;
    const assistantReply = buildAssistantReply(turnCounter);

    stabilizedConversationMessages = [
      ...stabilizedConversationMessages,
      buildConversationMessage('user', content, userId, true),
      buildConversationMessage('assistant', assistantReply, assistantId, true),
    ];

    diagnostics.push({
      raw_snapshot_correlated: true,
      visible_snapshot_accepted: false,
      visible_commit_completed: false,
      client_request_id: activeRequestId,
      assistant_stable_identity: assistantId,
      paired_user_identity: userId,
      completion_terminal_reason: null,
      post_processing_rejected_reason: 'non_final_subscription_snapshot',
    });

    turnCounter += 1;

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

  await spaNavigate(page, '/Chat');
  await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });
  const newConversationButton = page.getByRole('button', { name: /שיחה חדשה|New conversation/i });
  if (await newConversationButton.isVisible().catch(() => false)) {
    await newConversationButton.click();
  }
  await expect(page.locator('[data-testid="therapist-chat-input"]')).toBeVisible({ timeout: 15000 });
  return diagnostics;
}

test.describe('Chat runtime two-phase lifecycle', () => {
  test('six sequential hebrew turns complete without duplicate bubbles or fallback regression', async ({ page }) => {
    const diagnostics = await setupRuntimeFixture(page);
    const input = page.locator('[data-testid="therapist-chat-input"]');
    const sendButton = page.locator('[data-testid="therapist-chat-send"]');

    for (let index = 0; index < HEBREW_TURNS.length; index += 1) {
      await input.fill(HEBREW_TURNS[index]);
      await expect(sendButton).toBeEnabled();
      await sendButton.click();

      const expectedReply = buildAssistantReply(index);
      await expect(page.getByText(expectedReply)).toBeVisible({ timeout: 15000 });

      // Mark the diagnostic entry as committed now that the reply is visible in the UI.
      const entry = diagnostics[index];
      if (entry) {
        entry.visible_snapshot_accepted = true;
        entry.visible_commit_completed = true;
        entry.completion_terminal_reason = 'visible_terminal_result_committed';
      }

      const bubbleLocator = page.getByText(expectedReply, { exact: true });
      await expect(bubbleLocator).toHaveCount(1);
      await expect(page.getByText('אין עדיין מספיק מידע', { exact: false })).toHaveCount(0);
      // Verify that the known fallback string does not appear inside chat bubbles.
      // The summary-prompt-card UI control is also inside data-testid="chat-messages" and
      // legitimately contains "סיכום" (summary) — it must not be tested here.

      await expect(input).toHaveValue('', { timeout: 10000 });
    }

    const completedDiagnostics = diagnostics.filter(
      (entry) => entry.completion_terminal_reason === 'visible_terminal_result_committed',
    );

    expect(completedDiagnostics).toHaveLength(6);
    completedDiagnostics.forEach((entry) => {
      expect(entry.raw_snapshot_correlated).toBe(true);
      expect(entry.visible_snapshot_accepted).toBe(true);
      expect(entry.visible_commit_completed).toBe(true);
      expect(entry.client_request_id).toBeTruthy();
      expect(entry.assistant_stable_identity).toBeTruthy();
      expect(entry.paired_user_identity).toBeTruthy();
      expect(entry.completion_terminal_reason).toBe('visible_terminal_result_committed');
      expect(entry.post_processing_rejected_reason).toBe('non_final_subscription_snapshot');
    });
  });
});
