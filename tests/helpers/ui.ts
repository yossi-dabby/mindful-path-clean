import { Page, expect } from '@playwright/test';

export async function waitForAppHydration(page: Page, timeout = 10000) {
  await page.waitForFunction(
    () => {
      const root = document.querySelector('#root');
      return root && root.children.length > 0;
    },
    { timeout }
  );
}

export async function spaNavigate(page: Page, path: string) {
  let baseUrl =
    process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.BASE_URL ||
    'http://127.0.0.1:5173';

  try {
    const currentUrl = page.url();
    if (
      currentUrl &&
      currentUrl !== 'about:blank' &&
      currentUrl.startsWith('http')
    ) {
      const url = new URL(currentUrl);
      baseUrl = url.origin;
    }
  } catch {
    // ignore
  }

  const targetUrl = `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForAppHydration(page);
}

export async function takeDebugScreenshot(page: Page, name: string) {
  if (page.isClosed()) {
    console.warn(`[Screenshot] Skipped: page '${name}' was closed.`);
    return;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/debug-${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Mocks Base44-style API calls so the UI can render "happy path" without real backend.
 * Important: covers public-settings and analytics which otherwise 404 and can block UI flow.
 */
export async function mockApi(page: Page) {
  // Isolated UI tests use fallback fonts; optional font requests must not
  // trigger the startup fallback when external network access is blocked.
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({
    status: 200, contentType: 'text/css', body: '',
  }));

  const mockConversationId = 'test-conversation-123';
  const mockUserId = 'test-user-123';
  const mockUserEmail = 'test@example.com';

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    // Never intercept JS/TS module files — let Vite serve them with the
    // correct MIME type (application/javascript).  Without this guard the
    // broad **/api/** pattern can match source files that contain "api" in
    // their path (e.g. /src/api/base44Client.js) and return JSON, which
    // triggers a strict-MIME-type browser error for module scripts.
    if (/\.(js|jsx|ts|tsx|mjs|cjs)(\?.*)?$/.test(url)) {
      await route.continue();
      return;
    }

    // ---- Base44 infrastructure endpoints (must not 404) ----

    // analytics tracking (ignore)
    if (url.includes('/analytics/track/batch')) {
      await route.fulfill({
        status: 204,
        body: '',
      });
      return;
    }

    // app-logs (e.g. /api/app-logs/<appId>/log-user-in-app/<page>)
    if (url.includes('/app-logs/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    // public settings by id (often called with null during tests)
    if (url.includes('/public-settings/by-id/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'public-settings-test',
          flags: {},
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        }),
      });
      return;
    }

    // ---- Auth endpoints ----
    // The Base44 SDK calls GET /api/apps/{appId}/entities/User/me for auth.me() and
    // PATCH (overridden in base44Client.js) for auth.updateMe().
    // Returning onboarding_completed: true prevents the WelcomeWizard from rendering in tests.
    if (url.includes('/entities/User/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockUserId,
          email: mockUserEmail,
          full_name: 'Test User',
          role: 'user',
          onboarding_completed: true,
          created_date: new Date().toISOString(),
        }),
      });
      return;
    }

    if (url.includes('/auth/me') || url.includes('/auth/session')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockUserId,
          email: mockUserEmail,
          full_name: 'Test User',
          role: 'user',
          onboarding_completed: true,
          created_date: new Date().toISOString(),
        }),
      });
      return;
    }

    // ---- Agent conversations ----
    // IMPORTANT: More-specific patterns must be checked before less-specific ones so that
    // requests to /agents/conversations/{id}/messages and /agents/conversations/{id}
    // are not accidentally swallowed by the broader /agents/conversations list rules.

    // Add message to conversation (echo back posted content) — checked first because
    // url.includes('/agents/conversations') also matches this URL.
    if (
      url.includes('/agents/conversations/') &&
      url.includes('/messages') &&
      method === 'POST'
    ) {
      let postedContent = 'Test message';
      try {
        const postData = route.request().postData();
        if (postData) {
          const json = JSON.parse(postData);
          if (typeof json?.content === 'string' && json.content.trim()) {
            postedContent = json.content.trim();
          }
          if (typeof json?.message === 'string' && json.message.trim()) {
            postedContent = json.message.trim();
          }
        }
      } catch {
        // ignore parse errors
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          role: 'user',
          content: postedContent,
          created_date: new Date().toISOString(),
        }),
      });
      return;
    }

    // Get specific conversation by ID — must come before the list GET below.
    if (url.includes('/agents/conversations/') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockConversationId,
          agent_name: 'cbt_therapist',
          metadata: { name: 'Test Session', description: 'Test' },
          messages: [],
          created_date: new Date().toISOString(),
        }),
      });
      return;
    }

    // List conversations (no trailing slash / ID in the URL segment).
    if (url.includes('/agents/conversations') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    // Create new conversation.
    if (url.includes('/agents/conversations') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockConversationId,
          agent_name: 'cbt_therapist',
          metadata: { name: 'Test Session', description: 'Test' },
          messages: [],
          created_date: new Date().toISOString(),
        }),
      });
      return;
    }

    // Mock Base44 function invocations so they don't reach the real server in CI.
    // The enhancedCrisisDetector is called in handleSendMessage before the POST;
    // without this mock it would either block on the network or fail slowly.
    if (url.includes('/functions/') && method === 'POST') {
      if (url.includes('enhancedCrisisDetector')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { is_crisis: false, severity: 'none', confidence: 0 } }),
        });
        return;
      }
      // All other functions: return a generic success response.
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { success: true } }),
      });
      return;
    }

    // ---- Entities used by UI ----
    if (url.includes('/entities/UserDeletedConversations')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes('/entities/Goal') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes('/entities/Goal') && method === 'POST') {
      let postData: any = {};
      try {
        postData = req.postDataJSON();
      } catch {
        // ignore
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-goal-123',
          ...postData,
          created_date: new Date().toISOString(),
          created_by: mockUserEmail,
          updated_date: new Date().toISOString(),
        }),
      });
      return;
    }

    if (url.includes('/entities/ThoughtJournal') && method === 'POST') {
      let postData: any = {};
      try {
        postData = req.postDataJSON();
      } catch {
        // ignore
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-thought-journal-123',
          ...postData,
          created_date: new Date().toISOString(),
          created_by: mockUserEmail,
          updated_date: new Date().toISOString(),
        }),
      });
      return;
    }

    if (url.includes('/entities/ForumPost') && method === 'POST') {
      let postData: any = {};
      try {
        postData = req.postDataJSON();
      } catch {
        // ignore
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-post-123',
          title: postData.title || 'Test Post',
          content: postData.content || 'Test content',
          category: postData.category || 'general',
          tags: postData.tags || [],
          upvotes: 0,
          author_display_name: postData.author_display_name || 'Test User',
          created_date: new Date().toISOString(),
          created_by: mockUserEmail,
          updated_date: new Date().toISOString(),
        }),
      });
      return;
    }

    if (url.includes('/entities/MoodEntry')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (url.includes('/entities/DailyFlow')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    // Any other entity GET - return empty array
    if (url.includes('/entities/') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    // Default: pass through
    await route.continue();
  });
}

export async function logFailedRequests(page: Page) {
  const failedRequests: string[] = [];

  page.on('requestfailed', (request) => {
    failedRequests.push(
      `${request.method()} ${request.url()} - ${request.failure()?.errorText}`
    );
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedRequests.push(
        `${response.request().method()} ${response.url()} - ${response.status()}`
      );
    }
  });

  return {
    getFailedRequests: () => failedRequests.slice(0, 10),
    logToConsole: () => {
      if (failedRequests.length > 0) {
        console.log('\n❌ Failed Requests (first 10):');
        failedRequests.slice(0, 10).forEach((r) => console.log(`  - ${r}`));
      }
    },
  };
}

export async function safeFill(locator: any, text: string) {
  await locator.clear();
  await locator.fill(text);
}

export async function safeClick(locator: any, timeout = 20000) {
  await locator.waitFor({ state: 'attached', timeout });
  await expect(locator).toBeVisible({ timeout });
  await expect(locator).toBeEnabled({ timeout });
  await locator.click({ force: false });
}

// ---------------------------------------------------------------------------
// Language-setup helpers
//
// Call these via page.addInitScript before navigation so that the app boots
// with the correct language from localStorage. Do NOT change the language
// after navigation — this may not trigger a full re-render in all cases.
// ---------------------------------------------------------------------------

/**
 * Configures the page to boot in Hebrew mode by setting localStorage before
 * navigation.  Must be called before spaNavigate / page.goto.
 */
export async function setupHebrewMode(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'he');
  });
}

/**
 * Configures the page to boot in English mode by setting localStorage before
 * navigation.  Must be called before spaNavigate / page.goto.
 */
export async function setupEnglishMode(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en');
  });
}

// ---------------------------------------------------------------------------
// Forms Library helpers
// ---------------------------------------------------------------------------

/**
 * Waits for the Therapeutic Forms page to finish loading.
 * Asserts that at least one collection card is visible before returning.
 */
export async function waitForFormsPage(page: Page, timeout = 20000) {
  // The forms page renders collection cards inside a grid once hydrated.
  await expect(
    page.locator('[data-testid^="collection-card-"]').first()
  ).toBeVisible({ timeout });
}

/**
 * Waits until exactly `expectedCount` GeneratedFileCard elements are visible
 * in the Chat view. Use this instead of a fixed timeout after sending a Chat
 * message that should produce form attachment cards.
 *
 * Asserts an exact count, not a minimum. If the test expects "at least N",
 * use page.locator('[data-testid="generated-file-card"]') with a custom check.
 *
 * @param expectedCount - Exact number of cards that must be present (default 1).
 */
export async function waitForGeneratedFileCards(
  page: Page,
  expectedCount = 1,
  timeout = 15000
) {
  const cards = page.locator('[data-testid="generated-file-card"]');
  await expect(cards).toHaveCount(expectedCount, { timeout });
}

// ---------------------------------------------------------------------------
// Safe conversation route patterns
//
// Use these constants when registering page.route() handlers in Chat E2E
// tests.  They are narrow enough to avoid accidentally intercepting other
// API paths or static assets.
//
// IMPORTANT — Playwright uses LIFO (last-registered = highest priority):
// route.continue() sends the request to the real network, NOT to the next
// registered handler.  Register CONVERSATION_BY_ID BEFORE MESSAGES_POST so
// that MESSAGES_POST (registered last) has the highest priority and catches
// POST .../messages before the broader `by-ID` pattern can shadow it.
// ---------------------------------------------------------------------------

/**
 * Narrow Playwright route patterns for Base44 agent conversation endpoints.
 *
 * Usage example (LIFO order — MESSAGES_POST must be registered LAST):
 *
 * ```ts
 * await page.route(SAFE_CONVERSATION_ROUTE_PATTERNS.CONVERSATION_BY_ID, async (route) => { … });
 * await page.route(SAFE_CONVERSATION_ROUTE_PATTERNS.MESSAGES_POST, async (route) => { … });
 * ```
 */
export const SAFE_CONVERSATION_ROUTE_PATTERNS = {
  /**
   * POST /api/.../agents/conversations/{id}/messages
   * Register this handler LAST (highest LIFO priority) so it intercepts
   * POST .../messages before the CONVERSATION_BY_ID pattern can shadow it.
   */
  MESSAGES_POST: '**/api/**/agents/conversations/**/messages**',

  /**
   * GET /api/.../agents/conversations/{id}
   * Register this handler BEFORE MESSAGES_POST (lower LIFO priority).
   */
  CONVERSATION_BY_ID: '**/api/**/agents/conversations/test-conversation-123**',

  /**
   * GET /api/.../agents/conversations  (list, no trailing ID segment)
   * Register this handler LAST among the conversation handlers.
   */
  CONVERSATIONS_LIST: '**/api/**/agents/conversations',
} as const;
