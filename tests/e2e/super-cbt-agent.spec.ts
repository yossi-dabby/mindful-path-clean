import { test, expect } from '@playwright/test';
import { spaNavigate, mockApi, logFailedRequests } from '../helpers/ui';

/**
 * @file tests/e2e/super-cbt-agent.spec.ts
 *
 * SuperCbtAgent — End-to-End Tests
 *
 * PURPOSE
 * -------
 * Verifies observable application behaviour for the SuperCbtAgent scaffold:
 *   1. The app boots cleanly with no super-agent console errors in any
 *      supported language context (English, Hebrew).
 *   2. The super-agent feature is completely inert by default — no super-agent
 *      UI is rendered and no routing changes affect normal agent behaviour.
 *
 * These tests exercise REAL production routing and visible application state.
 * Pure-function behaviour (resolveSessionLocale, resolveAgentI18nStrings,
 * isSuperAgentEnabled, flag constants, wiring identity) is fully covered by
 * unit tests in test/utils/superCbtAgent.test.js and
 * test/utils/superCbtAgentI18n.test.js.
 *
 * SAFETY CONSTRAINTS
 * ------------------
 * The SuperCbtAgent scaffold is inactive by default (SUPER_CBT_AGENT_ENABLED=false).
 * These tests confirm that inactive state and must NEVER attempt to enable the
 * feature flag at runtime.  All API routes are mocked via the shared mockApi
 * helper — no real network, Base44 SDK, or LLM calls are made.
 */

// ─── Shared setup ─────────────────────────────────────────────────────────────

async function setupPageWithLanguage(page: Parameters<typeof mockApi>[0], lang: string) {
  await page.addInitScript((language: string) => {
    localStorage.setItem('language', language);
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  }, lang);
  await mockApi(page);
}

// ─── Suite 1 — English (en) ───────────────────────────────────────────────────

test.describe('SuperCbtAgent — English (en)', () => {
  test.beforeEach(async ({ page }) => {
    await setupPageWithLanguage(page, 'en');
  });

  test('app boots cleanly in English — no super agent console errors', async ({ page }) => {
    test.setTimeout(60000);

    const superAgentErrors: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        /super.?cbt.?agent/i.test(msg.text())
      ) {
        superAgentErrors.push(msg.text());
      }
    });

    const requestLogger = await logFailedRequests(page);
    try {
      await spaNavigate(page, '/');
      await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

      expect(superAgentErrors).toHaveLength(0);
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/super-cbt-agent-en-boot-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('super agent is inactive by default in English — no super-agent UI rendered', async ({ page }) => {
    test.setTimeout(60000);
    const requestLogger = await logFailedRequests(page);
    try {
      await spaNavigate(page, '/');
      await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

      // The super-agent UI must not appear when the feature flag is off.
      // The production module sets SUPER_CBT_AGENT_ENABLED=false by default;
      // absence of any super-agent-labelled element confirms the flag is respected.
      const superAgentLabel = page.getByText(/super cbt agent/i);
      await expect(superAgentLabel).toHaveCount(0);
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/super-cbt-agent-en-flag-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('app root renders in English without crash', async ({ page }) => {
    test.setTimeout(60000);
    const requestLogger = await logFailedRequests(page);
    try {
      await spaNavigate(page, '/');
      const root = page.locator('#root');
      await expect(root).toBeVisible({ timeout: 15000 });
      // Root must have child content (app rendered successfully)
      const childCount = await root.evaluate((el) => el.childElementCount);
      expect(childCount).toBeGreaterThan(0);
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/super-cbt-agent-en-root-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });
});

// ─── Suite 2 — Hebrew (he) ────────────────────────────────────────────────────

test.describe('SuperCbtAgent — Hebrew (he)', () => {
  test.beforeEach(async ({ page }) => {
    await setupPageWithLanguage(page, 'he');
  });

  test('app boots cleanly in Hebrew (RTL) — no super agent console errors', async ({ page }) => {
    test.setTimeout(60000);

    const superAgentErrors: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        /super.?cbt.?agent/i.test(msg.text())
      ) {
        superAgentErrors.push(msg.text());
      }
    });

    const requestLogger = await logFailedRequests(page);
    try {
      await spaNavigate(page, '/');
      await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

      expect(superAgentErrors).toHaveLength(0);
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/super-cbt-agent-he-boot-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('super agent is inactive by default in Hebrew — no super-agent UI rendered', async ({ page }) => {
    test.setTimeout(60000);
    const requestLogger = await logFailedRequests(page);
    try {
      await spaNavigate(page, '/');
      await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

      const superAgentLabel = page.getByText(/super cbt agent/i);
      await expect(superAgentLabel).toHaveCount(0);
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/super-cbt-agent-he-flag-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('app root renders in RTL (Hebrew) without crash', async ({ page }) => {
    test.setTimeout(60000);
    const requestLogger = await logFailedRequests(page);
    try {
      await spaNavigate(page, '/');
      const root = page.locator('#root');
      await expect(root).toBeVisible({ timeout: 15000 });
      const childCount = await root.evaluate((el) => el.childElementCount);
      expect(childCount).toBeGreaterThan(0);
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/super-cbt-agent-he-root-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });
});

// ─── Suite 3 — Regression: existing agent routing is unchanged ────────────────
//
// Pure-function assertions (resolveTherapistWiring, ACTIVE_AGENT_WIRINGS,
// SUPER_CBT_AGENT_WIRING identity) live in:
//   test/utils/superCbtAgent.test.js — "ACTIVE_AGENT_WIRINGS['cbt_therapist'] is not SUPER_CBT_AGENT_WIRING"
//   test/utils/superCbtAgent.test.js — "resolveTherapistWiring() does not return SUPER_CBT_AGENT_WIRING"
//
// The E2E layer confirms the same invariant via observable app routing:
// the app must reach a functional home route without any super-agent routing.

test.describe('SuperCbtAgent — Regression: existing agent routing unchanged', () => {
  test.beforeEach(async ({ page }) => {
    await setupPageWithLanguage(page, 'en');
  });

  test('app reaches home route without super-agent routing side-effects', async ({ page }) => {
    test.setTimeout(60000);
    const requestLogger = await logFailedRequests(page);
    try {
      await spaNavigate(page, '/');
      await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

      // Super-agent routing is inactive — no super-agent-specific DOM markers appear
      const superAgentMarker = page.locator('[data-super-cbt-agent]');
      await expect(superAgentMarker).toHaveCount(0);
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/super-cbt-agent-regression-routing-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });

  test('default app boot has no super-agent preamble injected in chat', async ({ page }) => {
    test.setTimeout(60000);
    const requestLogger = await logFailedRequests(page);
    try {
      await spaNavigate(page, '/');
      await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

      // buildSuperAgentSessionPreamble() returns '' when flag is off (flag=false by default).
      // Observable consequence: no super-agent-specific session text appears in the DOM.
      const superAgentPreamble = page.getByText(/advanced cbt mode/i);
      await expect(superAgentPreamble).toHaveCount(0);
    } catch (error) {
      requestLogger.logToConsole();
      await page.screenshot({
        path: `test-results/super-cbt-agent-regression-resolve-failed-${Date.now()}.png`,
        fullPage: true,
      });
      throw error;
    }
  });
});
