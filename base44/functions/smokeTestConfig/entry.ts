/**
 * Smoke Test Configuration & Documentation
 * 
 * Run: npx playwright test e2e/ --project=chromium
 * 
 * FAILING SYMPTOMS:
 * - Timeout after send button click
 * - "Target page, context or browser has been closed"
 * - Error at line ~54 (send interaction)
 * 
 * ROOT CAUSES IDENTIFIED:
 * 1. ❌ Analytics SDK call with null app ID → unhandled error → page crash
 * 2. ❌ Missing page.isClosed() checks in diagnostic loops
 * 3. ❌ Send button had pointerEvents: 'none' → not clickable
 * 
 * FIXES APPLIED:
 * ✅ Chat.js: Added mountedRef guards to all setState calls
 * ✅ Chat.js: Simplified message send flow (removed verbose logging)
 * ✅ Chat.js: Added 30s response timeout with auto-abort
 * ✅ Chat.js: Removed async operations that could fail silently
 * ✅ Chat.js: Fixed send button CSS (removed pointerEvents: 'none')
 * ✅ promptTestingGuide.js: Added page.isClosed() checks + early exit
 * ✅ e2eTestHelpers.js: Created helper with closure detection
 * ✅ e2eTestHelpers.js: Added analytics mocking to prevent null app ID crash
 * 
 * TEST FLOW:
 * 1. Setup page closure diagnostics
 * 2. Navigate to /Chat
 * 3. Check page.isClosed() after each critical action
 * 4. Start conversation
 * 5. Send message (click → fallback to Enter)
 * 6. Verify response appears
 * 7. Verify page still healthy
 * 
 * EXPECTED FAILURES TO IGNORE:
 * - Timeout if no backend API (is backend running?)
 * - Network error if /Chat route doesn't exist
 * 
 * LOCAL TEST:
 * 1. Start dev server: npm run dev
 * 2. Open /Chat in browser manually
 * 3. Send test message
 * 4. Check browser console for errors
 * 5. Then run: npx playwright test
 */

export const smokeTestConfig = {
  timeout: 90000, // 90s total test timeout
  navigationTimeout: 15000, // 15s for page.goto
  elementTimeout: 10000, // 10s for element visibility
  actionTimeout: 5000, // 5s for individual clicks/fills
  responseTimeout: 30000, // 30s for AI response before abort

  baseUrl: 'http://localhost:5173',
  testPages: [
    '/',
    '/Chat',
    '/Coach'
  ],

  selectors: {
    chatRoot: '[data-testid="chat-root"]',
    chatInput: '[data-testid="therapist-chat-input"]',
    chatSend: '[data-testid="therapist-chat-send"]',
    chatMessages: '[data-testid="chat-messages"]',
    consentBanner: '[data-testid="consent-banner"]',
    riskPanel: '[data-testid="inline-risk-panel"]',
    startButton: 'text=Start Your First Session'
  },

  diagnostics: {
    enablePageClosureHandler: true,
    enableConsoleErrorTracking: true,
    enableNavigationTracking: true,
    captureScreenshotOnError: true,
    screenshotDir: 'test-results/screenshots'
  }
};

export default smokeTestConfig;