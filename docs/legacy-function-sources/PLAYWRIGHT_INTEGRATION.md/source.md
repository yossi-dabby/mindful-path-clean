<!-- Original entry.ts content preserved 2026-08-09T19:01:04.379Z when the bundler-safe stub replaced entry.ts to resolve Base44 function bundling errors. No behavior change — this folder was never a registered/active function. -->

# Playwright E2E Test Integration Guide

Complete guide for implementing stable E2E tests with page closure protection and API mocking.

## Overview

This app experienced intermittent test failures due to:
1. **Analytics crashes** - `base44.analytics.track()` called with null app ID
2. **API 404 errors** - Base44 SDK calls failing due to missing app context
3. **Page closures** - Browser tab closing unexpectedly during tests
4. **Unguarded state updates** - React setState after component unmount

## Solution Architecture

### 1. Test Helpers (functions/e2eTestHelpers.js)

Provides utilities for:
- ✅ Mocking analytics API
- ✅ Mocking Base44 API endpoints (public settings, auth, agents, entities)
- ✅ Page closure detection and diagnostics
- ✅ Safe page interactions with fallbacks
- ✅ Chat-specific test utilities

### 2. Frontend Safeguards

Added to Chat.js and other components:
- ✅ `mountedRef` to prevent setState after unmount
- ✅ Response timeouts (30s) with cleanup
- ✅ Test environment detection to bypass consent/age gates
- ✅ Disabled analytics in test mode via `window.__DISABLE_ANALYTICS__`

## Quick Start

### 1. Import Test Helpers
```typescript
import { testHelpers } from '../../functions/e2eTestHelpers.js';
```

### 2. Setup Before Each Test
```typescript
test.beforeEach(async ({ page }) => {
  // CRITICAL: Mock analytics to prevent null app ID crashes
  await testHelpers.mockAnalytics(page);
  
  // CRITICAL: Mock Base44 API endpoints to prevent 404 errors
  await testHelpers.mockBase44APIs(page);
  
  // Setup closure diagnostics
  testHelpers.setupClosureDiagnostics(page);
  
  // Set test environment flags and app context
  await page.addInitScript(() => {
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    document.body.setAttribute('data-test-env', 'true');
    
    // Provide test app context
    window.__TEST_APP_ID__ = 'test-app-id';
    window.__TEST_APP_TOKEN__ = 'test-token';
  });
});
```

### 3. Use Safe Chat Interactions
```typescript
test('chat flow', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/chat');
  
  // Wait for chat ready (handles page closure)
  const input = await testHelpers.waitForChatReady(page);
  
  // Send message safely (button click + Enter fallback)
  await testHelpers.sendChatMessage(page, 'Hello');
  
  // Verify page health
  const isHealthy = await testHelpers.verifyPageHealth(page);
  expect(isHealthy).toBe(true);
});
```

## Test Helper API

### mockAnalytics(page)
Intercepts analytics API calls to prevent crashes when app ID is null/undefined.

### mockBase44APIs(page)
Mocks Base44 platform endpoints:
- `/api/apps/public/*/public-settings/**` - App configuration
- `/api/auth/me` - User authentication
- `/api/agents/**` - Agent conversations
- `/api/entities/**` - Entity CRUD operations

### setupClosureDiagnostics(page)
Monitors page lifecycle and logs:
- Page close events
- Navigation changes
- JavaScript errors
- Console errors

### waitForChatReady(page, timeout)
Waits for chat input to be visible and enabled, with page closure protection.

### sendChatMessage(page, message, timeout)
Sends a chat message with fallback:
1. Try button click
2. Fallback to Enter key if button fails
3. Verify page is still open

### verifyPageHealth(page)
Checks if page is still open and chat root is visible.

### safeDiagnosticLoop(page, locator, callback)
Iterate over elements with closure protection (for debugging).

## Root Causes Fixed

✅ **Analytics crash**: Added `mockAnalytics()` in e2eTestHelpers.js + app-side disable flag
✅ **API 404 errors**: Added `mockBase44APIs()` to mock Base44 endpoints during tests  
✅ **Button not clickable**: Removed `pointerEvents: 'none'` from Chat.js send button  
✅ **Unguarded setState**: Added `mountedRef` checks to prevent updates after unmount
✅ **Response timeout**: Added 30s timeout with abort in subscription handler
✅ **Diagnostic loop crash**: Created `safeDiagnosticLoop()` with closure protection
✅ **Import path error**: Helpers are in `functions/`, not `tests/`

## Frontend App Context

If your app uses `appParams.appId` or similar context, add defensive checks:

```javascript
// In your auth or app context initialization
const getAppId = () => {
  // Test environment override
  if (window.__TEST_APP_ID__) {
    return window.__TEST_APP_ID__;
  }
  
  // Production/staging
  return appParams?.appId || process.env.REACT_APP_APP_ID || 'default-app-id';
};

const getAppToken = () => {
  if (window.__TEST_APP_TOKEN__) {
    return window.__TEST_APP_TOKEN__;
  }
  
  return appParams?.token || localStorage.getItem('app_token') || null;
};
```

This prevents undefined/null errors when SDK makes API calls during tests.

## Example Test File

See `functions/smoke.web.spec.example.ts` for a complete working example.

Copy it to your test directory:
```bash
cp functions/smoke.web.spec.example.ts tests/e2e/smoke.web.spec.ts
```

## Debugging Failed Tests

If tests still fail:

1. **Check console output** for `[MOCK]` logs - verifies interception works
2. **Check for page closure** - look for `[PAGE CLOSED]` in output
3. **Verify app ID is set** - check `window.__TEST_APP_ID__` in test
4. **Check network tab** in Playwright trace viewer for 404s
5. **Increase timeouts** if app is slow to start

## CI/CD Integration

Ensure your CI environment:
- Runs dev server before tests (`npm run dev` or similar)
- Sets `NODE_ENV=test` or equivalent
- Has sufficient timeout for app startup (30-60s)
- Saves Playwright traces on failure

## Maintenance

When adding new API endpoints to your app:
1. Add mock routes in `mockBase44APIs()` if they cause 404s in tests
2. Update this guide with any new patterns
3. Keep test helpers DRY and reusable

## Support

For issues:
1. Check this guide
2. Review `functions/e2eTestHelpers.js` implementation
3. Examine `functions/smoke.web.spec.example.ts` for patterns
4. Add more logging/diagnostics as needed
