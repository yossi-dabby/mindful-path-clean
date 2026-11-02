<!-- Original entry.ts content preserved 2026-08-09T19:01:04.368Z when the bundler-safe stub replaced entry.ts to resolve Base44 function bundling errors. No behavior change — this folder was never a registered/active function. -->

# E2E Test Troubleshooting Guide

## Current Issue: 404 Errors Breaking Tests

### Symptom
```
Error: expect(locator).toBeVisible() failed
Locator: locator('[data-testid="chat-messages"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

### Root Cause
API endpoints returning 404, preventing page content from rendering.

---

## ✅ Required Setup Steps

### Step 1: Copy Test File to Correct Location

The test file **must** be in your Playwright test directory (usually `tests/` or `e2e/`), NOT in `functions/`.

```bash
# Copy the example test to your test directory
cp functions/smoke.web.spec.example.ts tests/e2e/smoke.web.spec.ts

# Or if your tests are in a different location:
cp functions/smoke.web.spec.example.ts e2e/smoke.web.spec.ts
```

### Step 2: Update Import Path

After copying, update the import path in your test file:

**If tests are in `tests/e2e/`:**
```typescript
import { testHelpers } from '../../functions/e2eTestHelpers.js';
```

**If tests are in `e2e/`:**
```typescript
import { testHelpers } from '../functions/e2eTestHelpers.js';
```

### Step 3: Verify Playwright Config

Your `playwright.config.ts` should include:

```typescript
export default defineConfig({
  testDir: './tests/e2e', // or your test directory
  use: {
    baseURL: 'http://127.0.0.1:5173',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 🔍 Verification Checklist

Run these checks in order:

### ✅ Check 1: Dev Server Running
```bash
npm run dev
# Should show: Local: http://127.0.0.1:5173
```

### ✅ Check 2: Test File Location
```bash
# Verify test file exists in test directory
ls -la tests/e2e/smoke.web.spec.ts
# or
ls -la e2e/smoke.web.spec.ts
```

### ✅ Check 3: Run Single Test with Debugging
```bash
npx playwright test smoke.web.spec.ts --debug
```

Watch console output for:
- `[MOCK] API Call:` - Confirms mocking is working
- `[TEST] Page closed` - Should NOT appear
- Network requests - Should be intercepted

### ✅ Check 4: Verify Mocking Works

Open browser console during test run. You should see:
```
[MOCK] API Call: GET /api/apps/public/prod/public-settings/by-id/test-app-id
[MOCK] API Call: GET /api/auth/me
[MOCK] API Call: GET /api/agents/conversations
```

If you DON'T see these, the mocking isn't working.

---

## 🚨 Common Issues & Fixes

### Issue 1: "Module not found: e2eTestHelpers"

**Cause:** Wrong import path after moving test file

**Fix:**
```typescript
// Adjust based on your actual file structure
import { testHelpers } from '../../functions/e2eTestHelpers.js';
```

### Issue 2: Still getting 404 errors

**Cause:** Mocking not applied before page navigation

**Fix:** Add explicit wait after mocking:
```typescript
await testHelpers.mockAnalytics(page);
await testHelpers.mockBase44APIs(page);
await page.waitForTimeout(100); // Small delay
await page.goto('http://127.0.0.1:5173/chat');
```

### Issue 3: "[data-testid='chat-messages']" not found

**Cause:** Test expects messages container when welcome screen is showing

**Fix:** Already fixed in `smoke.web.spec.example.ts`. Make sure you copied the latest version:
```typescript
// Accepts either welcome screen OR messages
const hasWelcome = await page.locator('text=Welcome to Therapy').isVisible();
const hasMessages = await page.locator('[data-testid="chat-messages"]').isVisible();
expect(hasWelcome || hasMessages).toBe(true);
```

### Issue 4: Tests pass locally but fail in CI

**Cause:** CI environment is slower

**Fix:** Increase timeouts in `smoke.web.spec.example.ts`:
```typescript
test.setTimeout(60000); // 60 seconds for CI

// In beforeEach:
await page.waitForFunction(() => {
  const root = document.querySelector('[data-page-ready="true"]');
  return root !== null;
}, { timeout: 30000 }); // Increased for CI
```

---

## 🔧 Manual Mocking (If Automatic Mocking Fails)

If the automatic mocking in `e2eTestHelpers.js` doesn't work, add explicit mocking in your test file:

```typescript
test.beforeEach(async ({ page }) => {
  // Mock public settings endpoint
  await page.route('**/api/apps/public/prod/public-settings/by-id/**', route => {
    console.log('[MANUAL MOCK] Public settings');
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-app',
        appId: 'test-app-id',
        public_settings: {}
      })
    });
  });

  // Mock auth endpoint
  await page.route('**/api/auth/me', route => {
    console.log('[MANUAL MOCK] Auth');
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-user',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user'
      })
    });
  });

  // Mock conversations endpoint
  await page.route('**/conversations**', route => {
    console.log('[MANUAL MOCK] Conversations');
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // Set test environment flags
  await page.addInitScript(() => {
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    document.body.setAttribute('data-test-env', 'true');
    window.__TEST_APP_ID__ = 'test-app-id';
    window.__DISABLE_ANALYTICS__ = true;
  });
});
```

---

## 📊 Expected Test Output

### Success Console Output:
```
[MOCK] API Call: GET /api/apps/public/prod/public-settings/by-id/test-app-id
[MOCK] API Call: GET /api/auth/me
[MOCK] API Call: GET /api/agents/conversations

Running 2 tests using 2 workers

  ✓ Chat Smoke Test (Web) > should load chat page and send message (5.2s)
  ✓ Chat Smoke Test (Web) > should handle page closure gracefully (3.8s)

  2 passed (9.0s)
```

### Failure Console Output (What to Look For):
```
GET http://127.0.0.1:5173/api/apps/public/prod/public-settings/by-id/undefined 404 (Not Found)
```
☝️ This means mocking isn't working OR appId is undefined

---

## 🐛 Advanced Debugging

### Enable Full Trace
```bash
npx playwright test smoke.web.spec.ts --trace on
```

After test fails:
```bash
npx playwright show-trace trace.zip
```

### Check Network Tab
In trace viewer, go to Network tab and verify:
1. All API calls are intercepted (status 200 from mock)
2. No 404 errors appear
3. Responses contain expected mock data

### Check Console Tab
In trace viewer, go to Console tab and verify:
1. `[MOCK]` logs appear
2. No errors about `appId` being undefined
3. No errors about failed API calls

---

## 📝 Quick Fix Checklist

If tests are failing, run through this checklist:

- [ ] Dev server is running (`npm run dev`)
- [ ] Test file is in correct directory (not in `functions/`)
- [ ] Import path is correct for your directory structure
- [ ] `[MOCK]` logs appear in console during test
- [ ] No 404 errors in network tab
- [ ] Test expects welcome screen OR messages (not just messages)
- [ ] Timeouts are sufficient (15s+ for slower CI)
- [ ] Test environment flags are set correctly
- [ ] Analytics is disabled (`window.__DISABLE_ANALYTICS__ = true`)

---

## 🆘 Still Failing? Try This

1. **Run with UI mode:**
   ```bash
   npx playwright test smoke.web.spec.ts --ui
   ```

2. **Watch the test execute step-by-step**

3. **Check browser console** (click "Console" tab in UI mode)

4. **Check network requests** (click "Network" tab in UI mode)

5. **Take screenshot at failure point:**
   ```typescript
   await page.screenshot({ path: 'debug.png', fullPage: true });
   ```

6. **Add console log before failure:**
   ```typescript
   console.log('Page URL:', page.url());
   console.log('Page content:', await page.content());
   ```

---

## 📞 Getting Help

If tests still fail after following this guide, provide:

1. **Console output** (all `[MOCK]` logs and errors)
2. **Network tab screenshot** (from trace or dev tools)
3. **Test file location** (where you copied the test)
4. **Playwright version** (`npx playwright --version`)
5. **Node version** (`node --version`)

This information will help diagnose the issue quickly.
