# SuperCbtAgent — Activation, Testing, and Monitoring Guide

> **Status: SCAFFOLD COMPLETE — ACTIVATION PENDING HUMAN APPROVAL**  
> The SuperCbtAgent is scaffolded and tested (Tasks 1–5 complete).  
> Activation requires explicit repository-owner approval at each phase.  
> See [`docs/super-agent-rollout-checklist.md`](../super-agent-rollout-checklist.md) for the
> full phase-gate checklist.

---

## Overview

This guide explains **how to enable, test, and monitor** the SuperCbtAgent in staging and
production environments.

The SuperCbtAgent is an opt-in upgrade to the existing `cbt_therapist` agent.  It is
activated exclusively through environment variables (feature flags) — no source-code changes
are needed to enable or disable it.  All safety constraints from Stage 2 are inherited and
cannot be bypassed.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Configuration Reference](#2-configuration-reference)
3. [Step-by-Step: Enable in Staging](#3-step-by-step-enable-in-staging)
4. [Step-by-Step: Run Tests](#4-step-by-step-run-tests)
5. [Step-by-Step: Monitor](#5-step-by-step-monitor)
6. [Step-by-Step: Rollback](#6-step-by-step-rollback)
7. [Step-by-Step: Enable in Production](#7-step-by-step-enable-in-production)
8. [Multi-Language Verification](#8-multi-language-verification)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

Complete **all** items before proceeding to any activation step.

### Code Completeness

- All six super agent tasks (Tasks 1–6) have been reviewed and merged:
  - Task 1 — Repository inventory (`docs/analysis-super-agent.md`)
  - Task 2 — Scaffold module (`src/lib/superCbtAgent.js`)
  - Task 3 — i18n keys (all 7 languages in `src/components/i18n/translations.jsx`)
  - Task 4 — Logic and language integration (`src/lib/superCbtAgent.js` functions)
  - Task 5 — E2E tests (`tests/e2e/super-cbt-agent.spec.ts`)
  - Task 6 — This documentation (the file you are reading)

### Test Baseline

```bash
# All unit tests must pass (zero failures)
npm test

# Lint must pass (zero errors)
npm run lint

# Build must succeed
npm run build

# E2E tests must pass
npm run test:e2e
```

### Wiring Prerequisites (Task 4 activation PR)

Before the super agent can route live traffic, a **separate reviewed PR** must:
1. Add the `SUPER_CBT_AGENT_ENABLED` routing branch to `resolveTherapistWiring()` in
   `src/api/activeAgentWiring.js`.
2. Set `multilingual_context_enabled: true` in `SUPER_CBT_AGENT_WIRING` when all
   language tests pass.

> ⚠️ **Do not modify `activeAgentWiring.js` without explicit repository-owner approval.**  
> This file is frozen per [`docs/copilot-safety-rules.md`](../copilot-safety-rules.md).

### Environment Separation

- A **separate staging Base44 app** (`VITE_BASE44_APP_ID`) must be used.
  Never enable the super agent flags against the production Base44 app during testing.
- See [`docs/staging-deployment-guide.md`](../staging-deployment-guide.md) for platform setup.

---

## 2. Configuration Reference

All SuperCbtAgent flags are `VITE_*` environment variables baked into the static bundle at
build time.  They **cannot** be changed at runtime — a rebuild is required after each change.

### Flag Inventory

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_THERAPIST_UPGRADE_ENABLED` | `false` | Master gate for all Stage 2 behavior, including super agent |
| `VITE_SUPER_CBT_AGENT_ENABLED` | `false` | Super agent gate — enables `SUPER_CBT_AGENT_WIRING` routing |

### Activation Matrix

| `VITE_THERAPIST_UPGRADE_ENABLED` | `VITE_SUPER_CBT_AGENT_ENABLED` | Active Wiring |
|---|---|---|
| `false` | `false` | `CBT_THERAPIST_WIRING_HYBRID` (default — always safe) |
| `true` | `false` | Highest enabled Stage 2 phase (V1–V5) |
| `true` | `true` | `SUPER_CBT_AGENT_WIRING` (super agent — requires wiring PR) |
| `false` | `true` | `CBT_THERAPIST_WIRING_HYBRID` (master gate wins — super agent is off) |

> **Rollback rule:** Setting `VITE_THERAPIST_UPGRADE_ENABLED=false` is the single-switch
> rollback for the entire upgrade path, including the super agent.

### Staging env file template

```bash
# .env.staging  (gitignored — do not commit)

# --- Required ---
VITE_BASE44_APP_ID=<your-staging-app-id>   # Must be a separate staging app

# --- Stage 2 master gate ---
VITE_THERAPIST_UPGRADE_ENABLED=true

# --- Super agent gate ---
VITE_SUPER_CBT_AGENT_ENABLED=true

# --- Individual Stage 2 phase flags (set all to true to enable full V5 baseline) ---
VITE_THERAPIST_UPGRADE_MEMORY_ENABLED=true
VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED=true
VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED=true
VITE_THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED=true
VITE_THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED=true
VITE_THERAPIST_UPGRADE_SAFETY_MODE_ENABLED=true
```

---

## 3. Step-by-Step: Enable in Staging

### Step 1 — Confirm the wiring PR is merged

Verify that `resolveTherapistWiring()` in `src/api/activeAgentWiring.js` contains the
`SUPER_CBT_AGENT_ENABLED` routing branch (added in the Task 4 activation PR).

```bash
grep -n "SUPER_CBT_AGENT" src/api/activeAgentWiring.js
```

Expected output includes something like:
```
isSuperAgentEnabled() → SUPER_CBT_AGENT_WIRING
```

If not found, the wiring PR has not been merged.  Stop here.

### Step 2 — Create your staging env file

Copy `env.staging.example` to `.env.staging` (gitignored) and fill in the required values:

```bash
cp env.staging.example .env.staging
# Edit .env.staging and set VITE_BASE44_APP_ID, VITE_THERAPIST_UPGRADE_ENABLED=true,
# and VITE_SUPER_CBT_AGENT_ENABLED=true
```

### Step 3 — Build with staging variables

```bash
# Load .env.staging and build
npx vite build --mode staging
# or, if your CI exports the variables directly:
VITE_THERAPIST_UPGRADE_ENABLED=true VITE_SUPER_CBT_AGENT_ENABLED=true npm run build
```

### Step 4 — Verify the flag is baked in

```bash
# Check the built bundle for the flag value
grep -r "SUPER_CBT_AGENT_ENABLED" dist/
```

You should see `SUPER_CBT_AGENT_ENABLED:!0` (true) or `SUPER_CBT_AGENT_ENABLED:true`
in the minified bundle.  If you see `false`, the env var was not picked up — check
your build environment's variable injection method.

### Step 5 — Deploy and smoke-test the staging build

```bash
# Preview the staging build locally
npm run preview
# or deploy to your staging host
```

Then open the app in a browser and verify:
- The app boots without console errors
- The super agent session preamble appears in a new chat session (when `multilingual_context_enabled` is active)
- The existing therapist behavior (safety mode, crisis panel, session phase) works normally

---

## 4. Step-by-Step: Run Tests

### Unit Tests

Run the full unit test suite (must be 100% green):

```bash
npm test
```

Super agent-specific test files:

| File | What it tests |
|------|--------------|
| `test/utils/superCbtAgent.test.js` | Scaffold exports, wiring structure, flag isolation |
| `test/utils/superCbtAgentLogic.test.js` | Flag registry, `isSuperAgentEnabled`, `resolveSessionLocale`, `buildSuperAgentSessionPreamble` |
| `test/utils/superCbtAgentI18n.test.js` | All 7 language i18n keys: presence, non-empty values, regression guard |

To run only super agent tests:

```bash
npx vitest run test/utils/superCbtAgent.test.js test/utils/superCbtAgentLogic.test.js test/utils/superCbtAgentI18n.test.js
```

### E2E Tests

Run the full E2E suite (requires a running app):

```bash
npm run test:e2e
```

Super agent E2E spec: `tests/e2e/super-cbt-agent.spec.ts`

This spec covers:
- English (`en`) session: super agent preamble visibility, safety mode behavior
- Hebrew (`he`) session: RTL layout, locale-correct preamble, crisis detection
- Flag-off regression: when `VITE_SUPER_CBT_AGENT_ENABLED=false`, behavior matches the standard V5 path

To run only the super agent E2E spec:

```bash
npx playwright test tests/e2e/super-cbt-agent.spec.ts
```

### Translation Tests

Verify all 7 language keys are present and non-empty:

```bash
npx vitest run test/utils/superCbtAgentI18n.test.js
```

Expected: 74 tests passing (8 keys × 7 languages + 10 regression guards).

---

## 5. Step-by-Step: Monitor

### What to Watch

Once the super agent is active in staging or production, monitor the following signals:

#### Application Logs

Look for these log markers in your observability platform:

| Log marker | Meaning |
|-----------|---------|
| `[superCbtAgent] preamble generated: locale=<lang>` | Super agent session started successfully |
| `[superCbtAgent] flag off — preamble skipped` | Flag is off; standard path active |
| `[superCbtAgent] wiring mismatch — preamble skipped` | Wiring not pointing to super agent config |
| `[superCbtAgent] locale resolved: <lang>` | User's session language was resolved |

#### Key Metrics (Base44 / your observability stack)

| Metric | Alert threshold | Action if triggered |
|--------|----------------|---------------------|
| `super_agent.session_started` | Unexpected drop | Check wiring and flag status |
| `super_agent.preamble_generated` | Unexpected drop | Check flag + `multilingual_context_enabled` |
| `super_agent.locale_resolved` | Distribution shift | Investigate locale detection |
| `super_agent.fallback_used` | Any spike | Check translations for affected locale |
| `therapist.safety_mode_active` | Increase > 10% | Immediate review — do not proceed with rollout |
| `therapist.session_completed` | Drop > 5% | Review before continuing rollout |

#### Health Check: Is the Super Agent Active?

In the browser console or in a test, call:

```javascript
import { isSuperAgentEnabled } from './src/lib/superCbtAgent.js';
console.log('Super agent active:', isSuperAgentEnabled());
```

Expected output when enabled: `Super agent active: true`

Alternatively, in the built bundle, inspect:

```javascript
// In the browser console (production bundle):
window.__superCbtAgentActive  // set by the app during session init (if instrumented)
```

#### Verifying the Active Wiring

```javascript
import { ACTIVE_CBT_THERAPIST_WIRING } from './src/api/activeAgentWiring.js';
console.log('Active wiring:', ACTIVE_CBT_THERAPIST_WIRING.super_agent); // true if super agent
```

### Monitoring During Rollout Phases

Follow the phase-gate monitoring requirements in
[`docs/super-agent-rollout-checklist.md`](../super-agent-rollout-checklist.md):

- **Phase 1 (staging):** Verify preamble generation in English and Hebrew. Check safety mode and crisis detection.
- **Phase 2 (canary ≤5%):** Error rate, crisis rate, session completion rate.
- **Phase 3 (5%→25%→50%):** All 7 language groups sampled. Per-locale telemetry reviewed.
- **Phase 4 (100%):** 72-hour post-activation monitoring window.

---

## 6. Step-by-Step: Rollback

### Immediate Rollback (< 5 minutes)

1. Set `VITE_SUPER_CBT_AGENT_ENABLED=false` in your build environment.
2. Trigger a new build and deployment.
3. Verify the flag in the new bundle:
   ```bash
   grep -r "SUPER_CBT_AGENT_ENABLED" dist/
   # Should show: false
   ```
4. Confirm the app uses the standard V5 (or lower) therapist path:
   ```javascript
   // Browser console after redeployment:
   import { isSuperAgentEnabled } from './src/lib/superCbtAgent.js';
   isSuperAgentEnabled(); // Must return false
   ```

### Full Stage 2 Rollback (Master Gate)

To roll back the entire upgrade path including the super agent:

1. Set `VITE_THERAPIST_UPGRADE_ENABLED=false` in your build environment.
2. Rebuild and deploy.
3. The app reverts to `CBT_THERAPIST_WIRING_HYBRID` — the default path used before Stage 2.

### Rollback Verification Checklist

- [ ] `isSuperAgentEnabled()` returns `false`
- [ ] Error rate returns to pre-activation baseline within 10 minutes
- [ ] Crisis detection rate returns to baseline
- [ ] Session behavior matches the pre-activation V5 therapist path
- [ ] No data loss or corruption from the rollback (session summaries, memories are unaffected)

See [`docs/super-agent-rollout-checklist.md`](../super-agent-rollout-checklist.md) §Rollback for full post-rollback actions.

---

## 7. Step-by-Step: Enable in Production

> ⚠️ **Production activation requires repository-owner approval + passing Phase 0–3 gates.**  
> Do not proceed if any checklist item in `docs/super-agent-rollout-checklist.md` is incomplete.

1. Complete all Phase 0–3 gates in `docs/super-agent-rollout-checklist.md`.
2. Get written approval from the repository owner and one additional reviewer.
3. Set `VITE_SUPER_CBT_AGENT_ENABLED=true` in your **production** build environment.
4. Ensure `VITE_THERAPIST_UPGRADE_ENABLED=true` is also set.
5. Run `npm run build` and deploy.
6. Monitor for 72 hours minimum (Phase 4 monitoring in the rollout checklist).
7. At 24h, 48h, and 72h: review metrics and confirm no regressions.
8. After 72-hour window: update `docs/super-agent/README.md` status from `SCAFFOLD` to `ACTIVE`.

---

## 8. Multi-Language Verification

The SuperCbtAgent supports all 7 app languages: `en`, `he`, `es`, `fr`, `de`, `it`, `pt`.

### Verifying i18n Keys

All 8 translation keys per language must be present and non-empty:

```bash
npx vitest run test/utils/superCbtAgentI18n.test.js
```

### Verifying Locale Resolution

The `resolveSessionLocale()` function reads the user's session context:

```javascript
import { resolveSessionLocale } from './src/lib/superCbtAgent.js';

resolveSessionLocale({ locale: 'he' });  // → 'he'
resolveSessionLocale({ language: 'fr' }); // → 'fr'
resolveSessionLocale({ locale: 'xx' });  // → 'en' (fallback)
resolveSessionLocale(null);              // → 'en' (fallback)
```

### Verifying i18n String Resolution

```javascript
import { resolveAgentI18nStrings } from './src/lib/superCbtAgent.js';
import { translations } from './src/components/i18n/translations.jsx';

const strings = resolveAgentI18nStrings('he', translations);
console.log(strings.label); // → "סוכן CBT מתקדם"
```

### Language Smoke Test (Manual)

For each language group you are rolling out to:

1. Switch the app language in settings to the target language.
2. Start a new therapy session.
3. Confirm the super agent preamble appears in the correct language.
4. Confirm the safety mode indicator label is in the correct language.
5. Confirm the crisis detection panel is in the correct language.
6. Confirm RTL layout is correct for Hebrew (`he`).

### Language Fallback Behavior

- If a user's locale is `xx` (unknown), the super agent falls back to `en`.
- If a translation section is missing for a locale, the super agent falls back to `en`.
- Emergency resources remain locale-aware via the existing `emergencyResourceLayer.js` —
  this behavior is inherited and unchanged.

---

## 9. Troubleshooting

### "Super agent is not active even though flag is set"

**Check 1:** Verify the wiring routing branch is present in `activeAgentWiring.js`.  
The `resolveTherapistWiring()` function must contain the `isSuperAgentEnabled()` branch.

**Check 2:** Verify `VITE_THERAPIST_UPGRADE_ENABLED=true` is also set.  
The master gate must be `true` for the super agent to activate.

**Check 3:** Verify the env var was set _before_ `npm run build` ran.  
`VITE_*` variables are baked at build time — a rebuild is required after each change.

---

### "Preamble not generated in the session"

**Check 1:** Verify `multilingual_context_enabled === true` in `SUPER_CBT_AGENT_WIRING`.  
This capability flag defaults to `false` in the scaffold. It must be enabled in the activation PR.

**Check 2:** Verify the i18n section exists for the user's locale:
```bash
npx vitest run test/utils/superCbtAgentI18n.test.js
```

**Check 3:** Call `buildSuperAgentSessionPreamble()` directly with the user's wiring and locale
and inspect the return value.

---

### "Hebrew text is not RTL"

The app already handles RTL layout for Hebrew via its existing i18n/RTL support.  
If Hebrew text appears LTR:
1. Confirm the user's language is set to `he` (not `en`).
2. Check that the RTL body class is applied (existing behavior — see `src/components/layout/`).
3. File a bug against the UI layer, not the super agent.

---

### "Tests are failing for super agent"

Run in isolation first:
```bash
npx vitest run test/utils/superCbtAgent.test.js
npx vitest run test/utils/superCbtAgentLogic.test.js
npx vitest run test/utils/superCbtAgentI18n.test.js
```

If tests fail only when run together with the full suite, check for test isolation issues
(global state, imports shared with other tests).

---

## Related Documents

- [`docs/super-agent/README.md`](./README.md) — Overview and capability roadmap
- [`docs/super-agent/architecture.md`](./architecture.md) — Composition and inheritance design
- [`docs/super-agent/faq.md`](./faq.md) — Frequently asked questions
- [`docs/super-agent-rollout-checklist.md`](../super-agent-rollout-checklist.md) — Phase-gate checklist
- [`docs/i18n-super-agent.md`](../i18n-super-agent.md) — i18n key documentation (all 7 languages)
- [`docs/analysis-super-agent.md`](../analysis-super-agent.md) — Agent and i18n inventory (Task 1)
- [`docs/staging-deployment-guide.md`](../staging-deployment-guide.md) — Staging platform setup
- [`docs/copilot-safety-rules.md`](../copilot-safety-rules.md) — Safety rules (never relax)
- [`docs/ai-agent-access-policy.md`](../ai-agent-access-policy.md) — Agent entity access policy
- `src/lib/superCbtAgent.js` — Scaffold module (wiring, flags, locale and i18n functions)
- `tests/e2e/super-cbt-agent.spec.ts` — E2E tests (en + he)

---

*Last updated: 2026-04-08 — Task 6 (Docs and Activation Guide) PR*
