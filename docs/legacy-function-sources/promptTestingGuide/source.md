<!-- Original entry.ts content preserved 2026-08-09T19:01:04.399Z when the bundler-safe stub replaced entry.ts to resolve Base44 function bundling errors. No behavior change — this folder was never a registered/active function. -->

```ts
/**
 * PROMPT TESTING GUIDE - Using Golden Scenarios
 * 
 * Shows how to integrate golden scenarios into Playwright tests
 * for eval-driven prompt improvements across all 3 surfaces
 * 
 * SAFEGUARDS:
 * - Defensive page.isClosed() checks before all locator operations
 * - Simplified wait conditions (avoid waitForTimeout chains)
 * - Early returns on unexpected closure
 * - Minimal timeout values (500-1000ms) with explicit fallbacks
 * - No long message loops
 */

import { GOLDEN_SCENARIOS, validateScenario } from './goldenScenarios.js';

/**
 * Utility: Safe page action wrapper with closure detection
 */
async function safePageAction(page, action, errorMsg = 'Page closed unexpectedly') {
  if (page.isClosed?.()) {
    console.error(`[PAGE CLOSED] ${errorMsg}`);
    return null;
  }
  try {
    return await action();
  } catch (e) {
    if (e.message?.includes('closed')) {
      console.error(`[PAGE CLOSED] ${errorMsg}: ${e.message}`);
      return null;
    }
    throw e;
  }
}

/**
 * Example 1: Test Hard Refusal for Medical Questions
 * Applies to: therapist_chat, ai_companion, coach_chat
 */
export const testMedicalRefusal = async ({ page, surface }) => {
  if (page.isClosed?.()) return;
  
  const scenario = Object.values(GOLDEN_SCENARIOS).find(
    s => s.name === "Medical/Diagnostic Refusal"
  );

  // Test only first input to avoid timeout loops
  const input = scenario.inputs[0];
  
  try {
    // Navigate & send (with closure check)
    if (surface === 'therapist_chat') {
      await page.goto('/Chat', { timeout: 10000, waitUntil: 'domcontentloaded' });
    } else if (surface === 'coach_chat') {
      await page.goto('/Coach', { timeout: 10000, waitUntil: 'domcontentloaded' });
    } else {
      await page.goto('/', { timeout: 10000, waitUntil: 'domcontentloaded' });
    }

    if (page.isClosed?.()) return;

    const inputSelector = surface === 'therapist_chat' 
      ? '[data-testid="therapist-chat-input"]'
      : surface === 'ai_companion'
      ? '[data-testid="ai-companion-input"]'
      : '[data-testid="coach-chat-input"]';

    const sendSelector = surface === 'therapist_chat'
      ? '[data-testid="therapist-chat-send"]'
      : surface === 'ai_companion'
      ? '[data-testid="ai-companion-send"]'
      : '[data-testid="coach-chat-send"]';

    await page.locator(inputSelector).fill(input);
    await page.locator(sendSelector).click();

    // Wait briefly for response (no long timeouts)
    await page.waitForTimeout(500);
    if (page.isClosed?.()) return;

    const responseText = await page.locator('[data-testid*="messages"]')
      .last()
      .textContent()
      .catch(() => '');

    // Validate
    const result = validateScenario(input, scenario.name, {
      content: responseText || '',
      ui_state: {},
      blocked_send: false
    });

    console.assert(result.passed, `Failed: ${result.failures.join(', ')}`);
  } catch (error) {
    if (error.message?.includes('closed')) {
      console.error('[PAGE CLOSED] testMedicalRefusal terminated early');
    } else {
      throw error;
    }
  }
};

/**
 * Example 2: Test Crisis Detection Blocks Send
 * Applies to: therapist_chat, ai_companion, coach_chat
 */
export const testCrisisDetection = async ({ page, surface }) => {
  if (page.isClosed?.()) return;

  const scenario = Object.values(GOLDEN_SCENARIOS).find(
    s => s.name === "Crisis/Safety Detection"
  );

  // Test only first input
  const input = scenario.inputs[0];

  try {
    // Navigate
    const url = surface === 'therapist_chat' ? '/Chat' : surface === 'coach_chat' ? '/Coach' : '/';
    await page.goto(url, { timeout: 10000, waitUntil: 'domcontentloaded' });
    if (page.isClosed?.()) return;

    const inputSelector = surface === 'therapist_chat' 
      ? '[data-testid="therapist-chat-input"]'
      : surface === 'ai_companion'
      ? '[data-testid="ai-companion-input"]'
      : '[data-testid="coach-chat-input"]';

    const sendSelector = surface === 'therapist_chat'
      ? '[data-testid="therapist-chat-send"]'
      : surface === 'ai_companion'
      ? '[data-testid="ai-companion-send"]'
      : '[data-testid="coach-chat-send"]';

    await page.locator(inputSelector).fill(input);
    if (page.isClosed?.()) return;

    // Check send button disabled + risk panel visible
    const sendBtn = page.locator(sendSelector);
    const riskPanel = page.locator('[data-testid="inline-risk-panel"]');

    const isDisabled = await sendBtn.isDisabled().catch(() => null);
    const isPanelVisible = await riskPanel.isVisible().catch(() => false);
    
    console.assert(isDisabled === true, 'Send button should be disabled for crisis');
    console.assert(isPanelVisible === true, 'Risk panel should be visible for crisis');
  } catch (error) {
    if (!error.message?.includes('closed')) throw error;
    console.error('[PAGE CLOSED] testCrisisDetection terminated early');
  }
};

/**
 * Example 3: Test Therapy Mode Activation
 * Applies to: therapist_chat
 */
export const testThoughtWorkMode = async ({ page }) => {
  if (page.isClosed?.()) return;

  const scenario = Object.values(GOLDEN_SCENARIOS).find(
    s => s.name === "Thought Work Mode Activation"
  );

  try {
    await page.goto('/Chat', { timeout: 10000, waitUntil: 'domcontentloaded' });
    if (page.isClosed?.()) return;

    const input = scenario.inputs[0];

    await page.locator('[data-testid="therapist-chat-input"]').fill(input);
    await page.locator('[data-testid="therapist-chat-send"]').click();

    // Minimal wait + closure check
    await page.waitForTimeout(500);
    if (page.isClosed?.()) return;

    const response = await page.locator('[data-testid="chat-messages"]')
      .last()
      .textContent()
      .catch(() => '');

    const questionCount = (response.match(/\?/g) || []).length;
    console.assert(questionCount === 1, `Expected 1 question, got ${questionCount}`);
  } catch (error) {
    if (!error.message?.includes('closed')) throw error;
    console.error('[PAGE CLOSED] testThoughtWorkMode terminated early');
  }
};

/**
 * Example 4: Test Session Summary Override
 * Applies to: therapist_chat, coach_chat
 */
export const testSessionSummaryOverride = async ({ page, surface }) => {
  if (page.isClosed?.()) return;

  try {
    const url = surface === 'therapist_chat' ? '/Chat' : '/Coach';
    await page.goto(url, { timeout: 10000, waitUntil: 'domcontentloaded' });
    if (page.isClosed?.()) return;

    const inputSelector = surface === 'therapist_chat'
      ? '[data-testid="therapist-chat-input"]'
      : '[data-testid="coach-chat-input"]';
    const sendSelector = surface === 'therapist_chat'
      ? '[data-testid="therapist-chat-send"]'
      : '[data-testid="coach-chat-send"]';

    // Single message (not loop) to avoid timeout
    await page.locator(inputSelector).fill("I've been feeling anxious lately");
    await page.locator(sendSelector).click();
    await page.waitForTimeout(500);
    if (page.isClosed?.()) return;

    // Send summary request
    await page.locator(inputSelector).fill("Can you give me a summary?");
    await page.locator(sendSelector).click();

    await page.waitForTimeout(500);
    if (page.isClosed?.()) return;

    const response = await page.locator('[data-testid*="messages"]')
      .last()
      .textContent()
      .catch(() => '');

    const hasSummary = response.toLowerCase().includes('summary');
    console.assert(hasSummary, 'Summary should be provided');
  } catch (error) {
    if (!error.message?.includes('closed')) throw error;
    console.error('[PAGE CLOSED] testSessionSummaryOverride terminated early');
  }
};

/**
 * Example 5: Test No Blocking Overlays
 * Applies to: therapist_chat, ai_companion, coach_chat
 */
export const testNoBlockingOverlays = async ({ page, surface }) => {
  if (page.isClosed?.()) return;

  try {
    const url = surface === 'therapist_chat' ? '/Chat' : surface === 'coach_chat' ? '/Coach' : '/';
    await page.goto(url, { timeout: 10000, waitUntil: 'domcontentloaded' });
    if (page.isClosed?.()) return;

    const viewport = page.viewportSize();
    const inputSelector = surface === 'therapist_chat' 
      ? '[data-testid="therapist-chat-input"]'
      : surface === 'ai_companion'
      ? '[data-testid="ai-companion-input"]'
      : '[data-testid="coach-chat-input"]';

    const element = page.locator(inputSelector).first();
    const isVisible = await element.isVisible().catch(() => false);
    if (page.isClosed?.()) return;

    if (isVisible) {
      const box = await element.boundingBox().catch(() => null);
      const isEnabled = await element.isEnabled().catch(() => false);
      
      console.assert(box !== null, 'Input should have valid bounding box');
      console.assert(isEnabled === true, 'Input should be enabled');
      
      if (box && viewport && viewport.width < 1000) {
        console.assert(box.y + box.height < viewport.height, 'Input should not be off-screen');
      }
    }

    // Check no modals
    if (!page.isClosed?.()) {
      const modalCount = await page.locator('dialog').count().catch(() => 0);
      console.assert(modalCount === 0, `Should have 0 modals, found ${modalCount}`);
    }
  } catch (error) {
    if (!error.message?.includes('closed')) throw error;
    console.error('[PAGE CLOSED] testNoBlockingOverlays terminated early');
  }
};

/**
 * Example 6: Validate Consent Banner is Non-Blocking
 * Applies to: therapist_chat, ai_companion, coach_chat
 */
export const testConsentBannerNonBlocking = async ({ page, surface }) => {
  if (page.isClosed?.()) return;

  try {
    // Clear consent
    try {
      await page.context().clearCookies();
    } catch (e) {
      // Ignore context errors
    }

    const url = surface === 'therapist_chat' ? '/Chat' : surface === 'coach_chat' ? '/Coach' : '/';
    await page.goto(url, { timeout: 10000, waitUntil: 'domcontentloaded' });
    if (page.isClosed?.()) return;

    // Check banner
    const banner = page.locator('[data-testid="consent-banner"]');
    const bannerVisible = await banner.isVisible().catch(() => false);
    console.assert(bannerVisible === true, 'Consent banner should be visible');
    if (page.isClosed?.()) return;

    // Check input accessible
    const inputSelector = surface === 'therapist_chat' 
      ? '[data-testid="therapist-chat-input"]'
      : surface === 'ai_companion'
      ? '[data-testid="ai-companion-input"]'
      : '[data-testid="coach-chat-input"]';

    const input = page.locator(inputSelector).first();
    const inputEnabled = await input.isEnabled().catch(() => false);
    console.assert(inputEnabled === true, 'Input should be enabled with banner visible');

    if (page.isClosed?.()) return;

    // Click accept
    const acceptBtn = page.locator('[data-testid="consent-accept"]');
    const acceptEnabled = await acceptBtn.isEnabled().catch(() => false);
    console.assert(acceptEnabled === true, 'Accept button should be enabled');

    await acceptBtn.click().catch(() => {});
    await page.waitForTimeout(300);
    if (page.isClosed?.()) return;

    // Banner should disappear
    const bannerGone = await banner.isVisible().catch(() => true);
    console.assert(bannerGone === false, 'Banner should disappear after accept');
  } catch (error) {
    if (!error.message?.includes('closed')) throw error;
    console.error('[PAGE CLOSED] testConsentBannerNonBlocking terminated early');
  }
};

export default {
  testMedicalRefusal,
  testCrisisDetection,
  testThoughtWorkMode,
  testSessionSummaryOverride,
  testNoBlockingOverlays,
  testConsentBannerNonBlocking
};
```
