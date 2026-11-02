# Production-Readiness Audit — Railway / Base44

**Branch investigated:** `copilot/investigate-production-readiness`
**PR base:** `staging-fresh`
**Audit date:** 2026-03-24
**Prepared by:** GitHub Copilot Coding Agent
**Scope:** Investigation only — no code changes made in this audit pass
**History:** Third investigation pass. Builds on PR #449 (`copilot/start-clean-production-investigation`, first pass) and PR #451 (`copilot/clean-production-audit`, extended pass), both merged into `staging-fresh`. This branch starts from the same merge base (`24d2815`) as those investigations and performs a clean, independent inspection pass to confirm findings and identify any newly visible issues.

---

## 0. Branch and Conflict Status

| Check | Result |
|-------|--------|
| PR base branch | `staging-fresh` ✅ |
| Merge base with `staging-fresh` | `24d281570b93e23221d534b96da58e25fa051a8c` |
| Merge base with `main` | `24d281570b93e23221d534b96da58e25fa051a8c` |
| Conflicts against `staging-fresh` | **None** ✅ (our branch adds only this docs file; staging-fresh has a prior audit file) |
| Conflicts against `main` | **None** ✅ (diff is empty — our "Initial plan" commit contains no code changes) |
| `staging-fresh` is ahead of `main` by | 4 commits (investigation audit work from PRs #449 and #451) |
| Our branch is ahead of `main` by | 1 commit (this docs file) |

**Conflict summary:** No merge conflicts exist against either `staging-fresh` or `main`. The only difference between this branch and `staging-fresh` is this audit document (a new file). The only difference between this branch and `main` is the single "Initial plan" commit (empty) plus this audit document.

---

## 1. Executive Summary

This is a clean production-readiness audit of the Mindful Path app as deployed on Railway. The audit covers auth bootstrap, login redirect flow, onboarding, settings, chat/AI readiness, page loading, routing, and differences between Base44 preview and Railway production.

**Overall assessment:** The application is structurally sound and architecturally correct for Railway production deployment. React Router, SPA routing via `serve -s`, auth overlay pattern, and onboarding flow all work correctly. The primary production risk is environmental, not architectural.

**Critical finding (unchanged from previous passes):** `VITE_BASE44_APP_ID` is a Vite build-time variable. If it is not set in Railway environment variables before the build, every API call uses `/api/apps/null/...` — causing a login redirect loop and total app failure. This is the single highest-risk item.

**New finding in this pass:** The GitHub Actions workflows (`playwright.yml`, `webpack.yml`) only trigger on `main, master, develop, staging` — they do **not** trigger on `staging-fresh`. PRs targeting `staging-fresh` have no CI coverage.

All Stage 2 AI capability flags correctly default to `false`. The basic HYBRID agent wiring (`cbt_therapist`, `ai_companion`) is the only active AI path and requires those agents to exist in the Base44 app instance.

---

## 2. Code Paths Inspected

### 2.1 AuthContext — `src/lib/AuthContext.jsx`

**Full behavior chain:**

```
App mounts
  └─ AuthProvider useEffect → checkAuth(retryCount=0)
       └─ setIsLoadingAuth(true)
       └─ base44.auth.me() [GET /api/apps/{appId}/entities/User/me]
            ├─ Success → setUser(data), setIsAuthenticated(true)
            │             → finally: setIsLoadingAuth(false)
            │             → overlay disappears, app is accessible
            └─ Failure
                 ├─ error.data.extra_data.reason === 'user_not_registered'
                 │    → setAuthError({type:'user_not_registered'})
                 │    → setIsLoadingAuth(false)
                 │    → UserNotRegisteredError screen shown
                 ├─ 401/403 AND retryCount < 1
                 │    → await 800ms
                 │    → [FLASH BUG] finally fires: setIsLoadingAuth(false)
                 │    → return checkAuth(1)  ← overlay reappears briefly
                 └─ 401/403 AND retryCount >= 1
                      → redirectToLogin(currentPath)
                      → setIsLoadingAuth(false)
```

**Known issue — `finally` / retry interaction:**

The `finally` block fires unconditionally, including during the 800ms retry path. This means `setIsLoadingAuth(false)` is called before the retry fires, briefly dropping the loading overlay. The overlay is then re-raised at the start of `checkAuth(1)`. On mobile or slow connections this flash is visible.

**Severity:** Low / cosmetic. The retry logic itself is correct.

**Files:** `src/lib/AuthContext.jsx` lines 17-72

---

### 2.2 App Param / AppId Resolution — `src/lib/app-params.js`

**Resolution priority order (highest to lowest):**

1. `window.__TEST_APP_ID__` — Playwright test injection (never in production)
2. `import.meta.env.VITE_BASE44_APP_ID` — **build-time Vite env var (correct production path)**
3. `import.meta.env.BASE44_APP_ID` — legacy alias
4. URL query param `?app_id=xxx` — manual override, saved to localStorage
5. `localStorage.base44_app_id` — persisted from a previous URL param visit
6. `null` — failure fallback

**Critical mechanics:**

`VITE_BASE44_APP_ID` is resolved at Vite build time and compiled into the JS bundle. The value `import.meta.env.VITE_BASE44_APP_ID` is a static string replacement performed by the Vite compiler — it is **not** read from the environment at runtime. If the variable is not set in Railway before the build command runs, the bundle contains the literal `undefined` for that slot, which resolves to `null`.

**Railway implication:** Setting `VITE_BASE44_APP_ID` in Railway after a build has no effect until a new build is triggered. The variable must be present at build time.

**`getAppParamValue` persistence mechanism:**

Every call to `getAppParamValue("app_id", { defaultValue: envAppId })` writes `envAppId` back to `localStorage.base44_app_id`. This means once a user visits with a valid `VITE_BASE44_APP_ID` in the bundle, the appId is cached in their browser. On the next visit (even if the env var is somehow absent), the cached value provides a fallback. This is resilience — but it does not protect against the very first visit with a broken build.

**Dev-only diagnostic:** `console.warn('[app-params] VITE_BASE44_APP_ID is not set...')` fires only in `DEV` mode. Production builds do not emit this warning, making the missing-appId failure entirely silent.

**Files:** `src/lib/app-params.js` lines 37-64

---

### 2.3 Base44 Client Setup — `src/api/base44Client.js`

**Client initialization:**

```javascript
const APP_BASE_URL = import.meta.env.VITE_BASE44_APP_BASE_URL || 'https://base44.app';

export const base44 = createClient({
  appId: appId || undefined,   // undefined prevents literal 'null' in API paths
  token,
  functionsVersion,
  requiresAuth: false,
  appBaseUrl: APP_BASE_URL,
});
```

**Analytics guard:**

```javascript
if (!appId) {
  base44.analytics.cleanup();
  base44.analytics = { track: () => {}, cleanup: () => {} };
}
```

Prevents `/api/apps/null/analytics/...` batch requests when appId is missing. ✅

**`updateMe` PATCH override:**

```javascript
if (appId) {
  base44.auth.updateMe = async (data) => {
    const me = await base44.auth.me();
    return base44.entities.User.update(me.id, data);
  };
}
```

The Base44 server returns HTTP 405 for PUT on the User entity. The override uses the entity SDK's `update()` which sends PATCH. This only installs when `appId` is truthy — meaning if appId is missing, the default SDK updateMe (PUT → 405) is used.

**`appBaseUrl` discrepancy between `base44Client.js` and `vite.config.js`:**

- `base44Client.js` fallback: `https://base44.app` (used for `redirectToLogin()` in production)
- `vite.config.js` fallback: `https://mindful-path-75aeaf7d.base44.app` (used only for dev HMR tools)

These serve different purposes. The vite plugin's `appBaseUrl` configures HMR notifier, navigation notifier, and visual edit agent — **development-only tools not present in production builds**. The `base44Client.js` fallback is the production-relevant one and correctly points to the Base44 platform login.

**Assessment:** ✅ No production risk from this discrepancy. Both fallbacks are correct for their respective contexts.

**Files:** `src/api/base44Client.js` lines 1-70

---

### 2.4 Onboarding / WelcomeWizard — `src/pages/Home.jsx`, `src/components/onboarding/WelcomeWizard.jsx`

**Trigger pattern in `Home.jsx`:**

```javascript
useEffect(() => {
  // Fast path: use sessionStorage cache (avoids flicker)
  const cached = sessionStorage.getItem('user_prefs_loaded');
  if (cached) {
    const { onboarding_completed } = JSON.parse(cached);
    if (onboarding_completed === false) setShowOnboarding(true);
  }
  // Authoritative path: confirm from server
  base44.auth.me().then((userData) => {
    if (!userData.onboarding_completed) setShowOnboarding(true);
    // Refresh cache
    sessionStorage.setItem('user_prefs_loaded', JSON.stringify({
      name: userData.full_name,
      onboarding_completed: userData.onboarding_completed
    }));
  }).catch(() => {});  // silent fail — doesn't block home page
}, []);
```

**Completion path (WelcomeWizard):**

1. User fills 3-step wizard → submits
2. `useMutation` calls `base44.auth.updateMe({ onboarding_completed: true, ... })`
3. **Optimistic update:** `onComplete()` is called in `onMutate` (before server responds)
4. Wizard closes immediately; user lands on Home
5. Server call completes (or fails) in the background
6. On success: `queryClient.invalidateQueries(['currentUser'])`

**What happens when `appId` is missing:**
- `base44.auth.me()` in Home.jsx fails silently (`.catch(() => {})`)
- The `showOnboarding` state stays `false` unless sessionStorage cache says otherwise
- User never sees onboarding wizard on first visit — skips setup entirely
- `updateMe` call would use SDK default (PUT → 405) → onboarding save fails

**Assessment:** ✅ Pattern is correct and resilient. Dependent on appId being valid.

---

### 2.5 Routing / App Routes — `src/App.jsx`, `railway.toml`, `public/_redirects`

**Route structure:**

```
/           → Home.jsx        (mainPage = "Home")
/AdvancedAnalytics → AdvancedAnalytics.jsx
/Chat       → Chat.jsx
/Coach      → Coach.jsx
...
/Settings   → Settings.jsx
/*          → PageNotFound.jsx
```

All pages except `MoodTracker` are lazy-loaded via `React.lazy()`. `MoodTracker` is imported directly (not lazy).

**Auth overlay pattern:**

Routes are always rendered. A full-screen spinner overlay (`zIndex: 9999`) is placed on top while `isLoadingAuth` is true. This ensures the DOM is fully hydrated before auth state settles — important for Playwright E2E tests that query DOM elements early.

**SPA routing configuration:**

```toml
# railway.toml
startCommand = "npx serve -s dist -l $PORT"  # -s = SPA mode (404 → index.html)
```

```
# public/_redirects  (Netlify-style; ignored by `serve` but harmless)
/* /index.html 200
```

`serve -s` handles all direct URL navigation correctly. A request to `/Chat` or `/Settings` returns `index.html` (200), React Router parses the path, and the correct page renders.

**`createPageUrl` utility:**

```typescript
// src/utils/index.ts
export function createPageUrl(pageName: string) {
  return '/' + pageName.replace(/ /g, '-');
}
```

Converts page names to URL paths with space-to-hyphen substitution. All pages in `pages.config.js` use single-word names so no substitution occurs in practice.

**Assessment:** ✅ Routing is production-ready. No issues found.

---

### 2.6 Settings Accessibility — `src/pages/Settings.jsx`

```javascript
useEffect(() => {
  base44.auth.me().then(async (userData) => {
    if (!userData) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }
    setUser(userData);
    setFullName(userData.full_name || '');
    // ... preference init, non-critical async calls follow
  }).catch(() => {
    base44.auth.redirectToLogin(window.location.pathname);
  });
}, []);
```

Secondary auth guard — in practice, AuthContext will have already redirected unauthenticated users. This acts as a belt-and-suspenders check for Settings.

Non-critical queries (UserPoints, Subscription) appear to be within the same `.then()` block — any failure there would trigger the outer `.catch()` and redirect. This is a potential over-broad catch: a transient points API error during an authenticated session would redirect the user to the login page instead of just hiding the points widget.

**Severity:** Low — this scenario requires an auth-succeeding user to have a secondary non-auth API call fail after the initial `me()` succeeds, which is uncommon.

---

### 2.7 Chat / AI Entry Path — `src/pages/Chat.jsx`, `src/api/activeAgentWiring.js`

**Agent selection at module load:**

```javascript
// activeAgentWiring.js
export const ACTIVE_CBT_THERAPIST_WIRING = resolveTherapistWiring();
// → CBT_THERAPIST_WIRING_HYBRID (when all flags off, which is default)
// → agent name: 'cbt_therapist'

export const ACTIVE_AI_COMPANION_WIRING = AI_COMPANION_WIRING_HYBRID;
// → agent name: 'ai_companion'
```

**Conversation creation flow:**

```javascript
// Chat.jsx — new conversation
const conversation = await base44.agents.createConversation({
  agent_name: ACTIVE_CBT_THERAPIST_WIRING.name,  // 'cbt_therapist'
  tool_configs: ACTIVE_CBT_THERAPIST_WIRING.tool_configs,
  metadata: { language: i18n.language, ... }
});
```

Error path: wrapped in `try/catch` → error is `console.error()`-logged but not surfaced to the user. The chat page enters a stuck empty state.

**Real-time message delivery:**

Chat uses a dual-path pattern:
1. **Primary:** `base44.agents.subscribeToConversation()` — WebSocket/SSE subscription
2. **Fallback:** Polling with exponential backoff, started on message send

If the subscription succeeds, polling stops. If the subscription fails, polling provides reliable delivery. This pattern is resilient to network variations.

**`ErrorBoundary` in Chat:**

```javascript
// src/components/utils/ErrorBoundary.jsx
render() {
  if (this.state.hasError) {
    return null;  // silent — no user-facing error message
  }
  return this.props.children;
}
```

Sub-components that throw during render silently disappear. Debugging production issues requires looking at the console.

**appId gating within Chat:**

Analytics calls and retention cleanup are guarded by `appParams.appId`. Conversation creation is not explicitly guarded — it will attempt and fail with `/api/apps/null/agents/...` if appId is missing. The error is caught silently.

**Assessment:**

- ✅ Default HYBRID wiring is safe and production-ready
- ✅ Subscription + polling fallback is a resilient real-time pattern
- ✅ Agent tool configurations match the privacy/access policy
- ⚠️ No pre-flight agent existence check before `createConversation`
- ⚠️ Silent error catch leaves users in an empty/stuck state

---

### 2.8 Feature Flags — `src/lib/featureFlags.js`

**All Stage 2 flags:**

```javascript
THERAPIST_UPGRADE_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_ENABLED === 'true',
THERAPIST_UPGRADE_MEMORY_ENABLED: ...,
THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: ...,
THERAPIST_UPGRADE_WORKFLOW_ENABLED: ...,
THERAPIST_UPGRADE_RETRIEVAL_ENABLED: ...,
THERAPIST_UPGRADE_LIVE_RETRIEVAL_ENABLED: ...,
THERAPIST_UPGRADE_SAFETY_MODE_ENABLED: ...,
THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED: ...,
```

**Key behaviors:**

- All flags default to `false` — Stage 2 path is entirely opt-in via Railway env vars
- `_s2` URL override (e.g., `?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED`) **only works** on `*.base44.app` or localhost hosts
- On Railway custom domain: `isStagingOrPreviewHost()` returns `false` → URL overrides are explicitly disabled
- Must use `VITE_*` build-time env vars to enable flags on Railway production

**Assessment:** ✅ Flag system is fail-closed by design. Safe for production.

---

### 2.9 Vite Build Configuration — `vite.config.js`

```javascript
build: {
  sourcemap: process.env.CI ? true : false,
  minify: process.env.CI ? false : "esbuild",
},
```

When `CI=true` is set in the Railway environment (as it sometimes is by convention):
- Sourcemaps are **enabled** — exposes full application source structure to anyone with browser dev tools
- Minification is **disabled** — produces a larger, slower, human-readable bundle

**Security consideration:** Enabled sourcemaps in production expose auth logic, agent wiring, API call patterns, and internal implementation to browser inspection.

**Action required:** Confirm `CI` is not set to `true` in the Railway **production** environment. (It is appropriate for CI/staging builds; not for production.)

---

### 2.10 CI Workflow Branch Coverage — `.github/workflows/`

**Current triggers in both `playwright.yml` and `webpack.yml`:**

```yaml
on:
  push:
    branches: [ main, master, develop, staging ]
  pull_request:
    branches: [ main, master, develop, staging ]
```

`staging-fresh` is **not** in this list.

**Implication:** Pull requests targeting `staging-fresh` (including this one) will not trigger Playwright E2E tests or the build test suite. Regressions introduced in `staging-fresh` work will not be caught by CI until the branch is merged to one of the listed branches.

**Severity:** 🟠 Medium. Not a blocker for the current audit, but increases risk for all future work on `staging-fresh`.

**Proposed fix (future PR):** Add `staging-fresh` to the `branches` list in both workflow files.

---

## 3. Production Blockers

### BLOCKER-1: `VITE_BASE44_APP_ID` not set in Railway

**Severity:** 🔴 Critical — app completely non-functional without this  
**Files:** `src/lib/app-params.js:44`, `src/api/base44Client.js:15`

**Mechanism:**

1. User visits Railway URL
2. Auth check calls `base44.auth.me()` → target URL: `/api/apps/null/entities/User/me` → error
3. AuthContext retries once (800ms delay), same result
4. `base44.auth.redirectToLogin(currentPath)` → sends user to `https://base44.app/login?returnUrl=...`
5. User logs in on Base44 platform
6. Redirected back to Railway app with session cookie
7. Auth check fires again → `/api/apps/null/me` → same failure → redirect loop

**Cascading effects:**

| Call | Effect when appId is null |
|------|--------------------------|
| `base44.auth.me()` | Fails → redirect loop |
| `base44.auth.updateMe(...)` | 405 (SDK default PUT, PATCH override not installed) |
| `base44.entities.*.list()` | 404 or error → empty data pages |
| `base44.agents.createConversation()` | Fails → chat stuck empty |
| `base44.agents.subscribeToConversation()` | Fails → no real-time messages |
| `base44.functions.invoke(...)` | Fails → summarization, cleanup, nudges fail |

**Verification:** Railway dashboard → Variables → `VITE_BASE44_APP_ID` must be present **before** the build runs.

---

### BLOCKER-2: `cbt_therapist` agent not deployed in Base44 app instance

**Severity:** 🔴 Critical for chat capability  
**Files:** `src/api/agentWiring.js:106`, `src/api/activeAgentWiring.js:195`, `src/pages/Chat.jsx:351`

The `ACTIVE_CBT_THERAPIST_WIRING.name` resolves to `'cbt_therapist'` (HYBRID wiring). `base44.agents.createConversation({ agent_name: 'cbt_therapist' })` will fail if no agent with that name exists in the Base44 app's agent configuration.

**Symptom:** Chat page loads, user taps to start a session, nothing happens. No user-facing error (caught silently).

**Verification:** Base44 app admin → Agents → confirm `cbt_therapist` and `ai_companion` agents are configured.

---

## 4. Likely Root Causes

| Observed Issue | Likely Root Cause |
|----------------|-----------------|
| Login redirect loop | `VITE_BASE44_APP_ID` not set in Railway env before build |
| Onboarding wizard never shown | `base44.auth.me()` fails silently in Home.jsx → `onboarding_completed` never checked |
| Onboarding save fails | `updateMe` override not installed (appId null) → PUT → 405 |
| All data pages show empty | All entity API calls fail with null appId |
| Chat cannot start | `cbt_therapist` agent not deployed OR appId null |
| AI capabilities unavailable | Feature flags all `false` (correct default; needs env vars) |
| Auth overlay flash on retry | `finally` block fires between retry attempts |

---

## 5. Confirmed Root Causes

| Root Cause | Confirmed By | Exact Location |
|-----------|-------------|----------------|
| `VITE_BASE44_APP_ID` is build-time only | Code inspection: `import.meta.env` is a compile-time static replacement | `src/lib/app-params.js:44` |
| `updateMe` PATCH override conditional on `appId` | `if (appId)` guard on lines 36–41 | `src/api/base44Client.js:36` |
| Feature flags are build-time env vars | `import.meta.env?.VITE_THERAPIST_UPGRADE_*` pattern | `src/lib/featureFlags.js:35–96` |
| `_s2` URL overrides disabled on non-Base44 domains | `isStagingOrPreviewHost()` checks `*.base44.app` hostname only | `src/lib/featureFlags.js:91–113` |
| Analytics disabled when appId falsy | `if (!appId) { base44.analytics.cleanup(); ... }` | `src/api/base44Client.js:22–27` |

---

## 6. AI Capability Blockers

These items are not app-breaking but must be resolved to unlock Stage 2 AI features.

| Issue | What It Blocks | Fix |
|-------|---------------|-----|
| `VITE_THERAPIST_UPGRADE_ENABLED` not set | Master gate off → all Stage 2 behavior disabled | Set `VITE_THERAPIST_UPGRADE_ENABLED=true` in Railway and rebuild |
| Per-phase flags not set | Each phase (memory, summarization, workflow, retrieval, safety) disabled individually | Set matching `VITE_THERAPIST_UPGRADE_*=true` flags per phase |
| `_s2` URL override blocked on Railway domain | Cannot use `?_s2=...` URL shortcut on custom Railway domain | Must always use `VITE_*` env vars for Railway; URL override is Base44-preview-only |
| `cbt_therapist` / `ai_companion` agents not confirmed | Chat and AI companion cannot create conversations | Verify agent existence in Base44 admin |
| External knowledge chunks not populated | V3/V4/V5 retrieval phases have no content to retrieve | Run `backfillKnowledgeIndex` function or ingest trusted documents |
| `ACTIVE_CBT_THERAPIST_WIRING` is HYBRID (not V1–V5) | Stage 2 advanced features inactive | Enable upgrade flags — wiring auto-selects highest active phase |

---

## 7. Issues That Can Wait

| Issue | Severity | Why It Can Wait |
|-------|----------|----------------|
| AuthContext `finally` / retry flash | Low | Cosmetic only; visible on slow connections |
| `ErrorBoundary` returns `null` silently | Moderate | Hides failures but doesn't cause data loss; complicates debugging |
| Settings `.catch()` over-broad redirect | Low | Requires two sequential failures; uncommon scenario |
| Chat `createConversation` silent catch | Moderate | Error logged to console; user sees stuck empty state |
| `CI=true` in Railway production env | Medium | Unminified bundle with sourcemaps if `CI` is set; verify env vars |
| CI workflows missing `staging-fresh` trigger | Medium | No automated CI on staging-fresh PRs; increases manual testing burden |
| `public/_redirects` (Netlify-style file) | Info | Ignored by `serve`; harmless but unnecessary for Railway |

---

## 8. Recommended Fix Order

> ⚠️ Step 1 is a Railway/Base44 admin action — no code change required.
> Steps 2–4 are small, targeted code changes proposed for future PRs.

### Step 1 — Environment Configuration (No Code Change)

**In Railway dashboard → Variables, before triggering a new build:**

1. ✅ Set `VITE_BASE44_APP_ID` to the correct Base44 app ID
2. ✅ Verify `VITE_BASE44_APP_BASE_URL` is set (or confirm `https://base44.app` fallback is acceptable — the fallback is correct for login redirects)
3. ✅ Confirm `CI` is **not** `true` in the Railway production environment (prevents unminified builds with sourcemaps)
4. ✅ Trigger a new Railway build after setting the above

**In Base44 app admin:**

5. ✅ Confirm `cbt_therapist` agent is configured
6. ✅ Confirm `ai_companion` agent is configured

**Expected outcome:** Resolves BLOCKER-1 and BLOCKER-2. App is fully functional.

---

### Step 2 — Add `staging-fresh` to CI Workflow Triggers (Small Config Change)

**Files:** `.github/workflows/playwright.yml`, `.github/workflows/webpack.yml`

Add `staging-fresh` to both `push.branches` and `pull_request.branches` lists. This ensures all PRs targeting `staging-fresh` get automated E2E and build testing.

**Risk:** None — purely additive. E2E tests are unchanged.

---

### Step 3 — Fix AuthContext Retry / Loading Flash (Small Code Change)

**File:** `src/lib/AuthContext.jsx`

Remove the `finally` block and call `setIsLoadingAuth(false)` explicitly at each terminal path only (success, `user_not_registered`, final failure after retry). This ensures the loading overlay stays visible during the 800ms retry delay.

```javascript
// Proposed structure (not applied in this branch — audit only):
const checkAuth = async (retryCount = 0) => {
  setIsLoadingAuth(true);
  setAuthError(null);
  try {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setIsAuthenticated(true);
    setIsLoadingAuth(false);  // terminal: success
  } catch (error) {
    const status = error?.status || error?.response?.status;
    if (error?.data?.extra_data?.reason === 'user_not_registered') {
      setIsAuthenticated(false);
      setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
      setIsLoadingAuth(false);  // terminal: known error
      return;
    }
    if ((status === 401 || status === 403) && retryCount < 1) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return checkAuth(retryCount + 1);  // retry; loading stays true ← correct
    }
    setIsAuthenticated(false);
    if (status === 401 || status === 403) {
      base44.auth.redirectToLogin(window.location.pathname + window.location.search);
    } else {
      setAuthError({ type: 'unknown', message: error.message || 'Failed to load app' });
    }
    setIsLoadingAuth(false);  // terminal: final failure
  }
};
```

**Risk:** Low. Only the retry-path visual behavior changes (overlay stays visible during the delay).  
**E2E impact:** None — tests check that the overlay disappears after auth succeeds.

---

### Step 4 — ErrorBoundary Fallback UI (Small Code Change)

**File:** `src/components/utils/ErrorBoundary.jsx`

Return a minimal message instead of `null` when an error is caught. This makes production failures visible to users and easier to debug.

```jsx
render() {
  if (this.state.hasError) {
    return (
      <div className="p-4 text-center text-sm text-slate-500">
        Something went wrong. Please refresh the page.
      </div>
    );
  }
  return this.props.children;
}
```

**Risk:** Very low. Only affects error-state rendering.  
**E2E impact:** None — E2E tests do not trigger error boundary states.

---

### Step 5 — AI Capability Enablement (Environment Variables, No Code Change)

After Step 1 is verified working end-to-end:

1. Set `VITE_THERAPIST_UPGRADE_ENABLED=true` in Railway
2. Set `VITE_THERAPIST_UPGRADE_MEMORY_ENABLED=true` (Phase 1 only first)
3. Trigger a Railway build and deploy
4. Test: start a chat session, confirm memory writes work, no crashes
5. Progressively enable additional phases:
   - `VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED=true`
   - `VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED=true`
   - `VITE_THERAPIST_UPGRADE_RETRIEVAL_ENABLED=true` (only after knowledge chunks are populated)
   - `VITE_THERAPIST_UPGRADE_LIVE_RETRIEVAL_ENABLED=true`
   - `VITE_THERAPIST_UPGRADE_SAFETY_MODE_ENABLED=true`

---

## 9. Base44 Preview vs Railway Production: Key Differences

| Aspect | Base44 Preview | Railway Production |
|--------|---------------|---------------------|
| `appId` injection | Auto-provided by Base44 platform | Must set `VITE_BASE44_APP_ID` before build |
| App base URL | Platform-configured automatically | Needs `VITE_BASE44_APP_BASE_URL` or uses `https://base44.app` fallback |
| Feature flag URL overrides (`?_s2=...`) | ✅ Works — domain matches `*.base44.app` | ❌ Blocked — non-matching domain (by design) |
| Feature flag env vars (`VITE_THERAPIST_UPGRADE_*`) | Works if set in Base44 build config | ✅ Standard Railway environment variables |
| Auth redirect destination | Points to preview app login | Points to `https://base44.app` login (or custom if `VITE_BASE44_APP_BASE_URL` is set) |
| Analytics | Auto-initialized with appId | Works only if `VITE_BASE44_APP_ID` is set |
| Agent deployment | Agents available in preview instance | Agents must exist in the app's Base44 admin panel |
| Build artifacts | Source maps on by default in preview | Depends on `CI` env var — must confirm `CI≠true` |
| CI test coverage | Base44 CI pipeline | GitHub Actions — currently does not trigger on `staging-fresh` |

---

## 10. Exact Files and Areas Involved

| File | Area | Risk Level |
|------|------|-----------|
| `src/lib/app-params.js` | AppId resolution, build-time baking | 🔴 Critical — must verify env vars |
| `src/api/base44Client.js` | Client setup, updateMe PATCH override, analytics guard | 🔴 Critical — depends on valid appId |
| `src/lib/AuthContext.jsx` | Auth bootstrap, retry logic, loading overlay | 🟠 Medium — retry flash bug; logic is correct |
| `src/App.jsx` | Route definitions, auth overlay pattern | 🟢 Low — correct implementation |
| `src/pages/Home.jsx` | Onboarding gate (dual-check pattern) | 🟢 Low — depends on updateMe/appId |
| `src/components/onboarding/WelcomeWizard.jsx` | Onboarding completion path | 🟢 Low — correct; depends on updateMe |
| `src/pages/Chat.jsx` | AI entry path, conversation creation, polling | 🟠 Medium — silent catch, no agent pre-check |
| `src/api/activeAgentWiring.js` | Runtime agent selection, flag evaluation | 🟢 Low — HYBRID default is safe |
| `src/api/agentWiring.js` | Agent configuration definitions | 🟢 Low — read-only reference |
| `src/lib/featureFlags.js` | Stage 2 feature flag registry, URL override guard | 🟢 Low — all flags correctly default false |
| `src/components/utils/ErrorBoundary.jsx` | Silent error handling in Chat | 🟠 Medium — hides production failures |
| `src/pages/Settings.jsx` | Secondary auth check, profile/preferences | 🟢 Low — over-broad catch is minor |
| `railway.toml` | Deployment config (SPA mode) | 🟢 Low — correct implementation |
| `public/_redirects` | Netlify-style SPA fallback (ignored by Railway) | 🟢 Info — harmless |
| `vite.config.js` | Build config, CI flag behavior | 🟠 Medium — must verify `CI≠true` in Railway prod |
| `.github/workflows/playwright.yml` | E2E CI triggers | 🟠 Medium — missing `staging-fresh` trigger |
| `.github/workflows/webpack.yml` | Build CI triggers | 🟠 Medium — missing `staging-fresh` trigger |

---

## 11. E2E Test Preservation

The proposed fixes (Steps 2–4) are minimal and isolated. Impact analysis:

| Test Suite | Impact of Proposed Fixes |
|-----------|--------------------------|
| Playwright E2E Tests / E2E Tests (mobile) | None — auth overlay behavior unchanged after auth success |
| Playwright E2E Tests / E2E Tests (web-desktop) | None — loading state transitions remain identical |
| Playwright E2E Tests / Smoke Tests (Production-critical) | None — only error-state and retry-visual behavior improved |

No proposed fix touches routing, page structure, navigation elements, agent wiring, entity access, or the scroll container pattern. All changes are isolated to `AuthContext.jsx` and `ErrorBoundary.jsx` behavior in error states.

---

## 12. Production Validation Checklist

### Core App

- [ ] `VITE_BASE44_APP_ID` set in Railway environment variables (present before build)
- [ ] `VITE_BASE44_APP_BASE_URL` set, or confirm `https://base44.app` fallback is acceptable
- [ ] `CI` not set to `true` in Railway **production** env (when `CI=true` build is unminified with sourcemaps)
- [ ] `cbt_therapist` agent confirmed in Base44 app admin
- [ ] `ai_companion` agent confirmed in Base44 app admin
- [ ] Login flow tested end-to-end on Railway domain (not just Base44 preview)
- [ ] Onboarding wizard shown and completes successfully (writes `onboarding_completed: true`)
- [ ] Chat page opens and conversation starts (no stuck empty state)
- [ ] Settings page loads and saves user preferences
- [ ] All main pages load without blank content (Home, Goals, Journal, Progress)
- [ ] Direct URL refresh (e.g., visiting `/Chat` directly) loads the correct page

### Code Fixes (Future PRs)

- [ ] `staging-fresh` added to CI workflow branch triggers (Step 2)
- [ ] AuthContext retry flash fixed — loading overlay stays visible during 800ms delay (Step 3)
- [ ] ErrorBoundary shows user-facing message instead of `null` (Step 4)

### AI Capability Rollout (After Core Verified)

- [ ] `VITE_THERAPIST_UPGRADE_ENABLED=true` set and built
- [ ] Phase 1 memory (`VITE_THERAPIST_UPGRADE_MEMORY_ENABLED=true`) enabled and tested
- [ ] External knowledge chunks populated before enabling retrieval phases
- [ ] Each Phase 1 → 7 flag enabled and tested incrementally

---

*Last updated: 2026-03-24 — audit branch `copilot/investigate-production-readiness`, base `staging-fresh`. Third independent investigation pass. No code changes applied in this branch.*
