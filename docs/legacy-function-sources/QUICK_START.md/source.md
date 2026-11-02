<!-- Original entry.ts content preserved 2026-08-09T19:01:04.384Z when the bundler-safe stub replaced entry.ts to resolve Base44 function bundling errors. No behavior change — this folder was never a registered/active function. -->

# E2E Test Quick Start

## 🚀 3-Step Setup

### Step 1: Copy Test File
```bash
# Create test directory if it doesn't exist
mkdir -p tests/e2e

# Copy the self-contained test
cp functions/smoke.web.spec.ts tests/e2e/smoke.web.spec.ts
```

### Step 2: Start Dev Server
```bash
npm run dev
```

### Step 3: Run Test
```bash
npx playwright test tests/e2e/smoke.web.spec.ts --headed
```

---

## ✅ Expected Output

### Success:
```
[TEST] Starting beforeEach setup
[MOCK] Intercepting: GET /api/apps/public/prod/public-settings/by-id/test-app-id
[MOCK] Intercepting: GET /api/auth/me
[MOCK] Intercepting: GET /api/agents/conversations
[TEST] beforeEach setup complete
[TEST] Starting chat page load test
[TEST] Page loaded, checking for chat elements
[TEST] UI state - Welcome: true Messages: false
[TEST] Chat page test passed

✓ Chat Smoke Test > should load chat page without 404 errors (8.2s)
✓ Chat Smoke Test > should handle no active conversation state (3.1s)

2 passed (11.3s)
```

### Failure (404 errors):
```
[404 ERROR] http://127.0.0.1:5173/api/apps/public/prod/public-settings/by-id/undefined
[TEST FAILED] Found 404 errors: [...]
```

---

## 🔍 Troubleshooting

### Still Getting 404s?

1. **Check mocking is applied:**
   Look for `[MOCK] Intercepting:` logs in console

2. **Verify dev server is running:**
   ```bash
   curl http://127.0.0.1:5173
   # Should return HTML, not "Connection refused"
   ```

3. **Check test file location:**
   ```bash
   ls -la tests/e2e/smoke.web.spec.ts
   # File should exist
   ```

4. **Run with verbose logging:**
   ```bash
   DEBUG=pw:api npx playwright test tests/e2e/smoke.web.spec.ts
   ```

### "Element not visible" Error?

This usually means the page didn't load due to 404s. Check:

1. **Console shows mocking:**
   ```
   [MOCK] Intercepting: GET /api/...
   ```

2. **No 404 errors in output:**
   ```
   [404 ERROR] ...  ← Should NOT appear
   ```

3. **Screenshot shows page content:**
   Check `test-results/chat-loaded.png`

---

## 🎯 What This Test Does

1. **Mocks ALL API calls** - Prevents 404 errors
2. **Sets test environment flags** - Bypasses gates
3. **Provides mock SDK** - Handles missing Base44 SDK
4. **Verifies UI renders** - Checks welcome screen appears
5. **Screenshots on success** - Visual confirmation
6. **Tracks 404s** - Fails test if any occur

---

## 📝 CI/CD Integration

### GitHub Actions
```yaml
- name: Run E2E Tests
  run: |
    npm run dev &
    npx wait-on http://127.0.0.1:5173
    npx playwright test tests/e2e/smoke.web.spec.ts
```

### GitLab CI
```yaml
e2e-tests:
  script:
    - npm run dev &
    - npx wait-on http://127.0.0.1:5173
    - npx playwright test tests/e2e/smoke.web.spec.ts
```

---

## 💡 Key Features

✅ **Self-contained** - All mocking inline, no dependencies  
✅ **Comprehensive logging** - See exactly what's happening  
✅ **404 detection** - Fails if any 404 occurs  
✅ **Screenshot capture** - Visual debugging  
✅ **Multiple test scenarios** - Welcome state, input state  

---

## 🆘 Still Stuck?

Run with full debugging:
```bash
PWDEBUG=1 npx playwright test tests/e2e/smoke.web.spec.ts
```

This opens Playwright Inspector where you can:
- Step through each action
- See all network requests
- View page state at each step
- Check console logs in real-time
