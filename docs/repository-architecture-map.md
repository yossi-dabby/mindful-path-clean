# Repository Architecture Map — Mindful Path CBT App

> **Internal reference for GitHub Copilot and contributors.**
> Created as part of Stage 2 — Repository Architecture Snapshot and Safety Map.
> This document is additive and read-only with respect to existing application logic.
> See also: `docs/copilot-safety-rules.md`, `.github/copilot-instructions.md`.

---

## Table of Contents

1. [Top-Level Folder Map](#1-top-level-folder-map)
2. [Major Subfolder Map](#2-major-subfolder-map)
3. [Safe Edit Zone Classification](#3-safe-edit-zone-classification)
4. [Dependency Flow](#4-dependency-flow)
5. [Production-Critical Files and Groups](#5-production-critical-files-and-groups)
6. [Future Copilot Work Lanes](#6-future-copilot-work-lanes)

---

## 1. Top-Level Folder Map

| Path | Responsibility | Runtime Impact |
|---|---|---|
| `.github/` | Copilot instructions, PR template, CI workflows | Indirectly (CI gates) |
| `android/` | Capacitor Android wrapper project | Build-time only |
| `docs/` | Internal policy, safety, agent-access, architecture docs | None (documentation only) |
| `functions/` | Base44 backend functions (Deno/TypeScript) — production-active | **HIGH** |
| `public/` | Static assets, PWA manifest, app icons, deep-link config | Low (static serving) |
| `src/` | React + Vite frontend application source | **HIGH** |
| `test/` | Vitest unit test suite | None (test-only) |
| `tests/` | Playwright E2E and Android integration tests | None (test-only) |

**Root-level configuration files** (do not modify casually):

| File | Purpose |
|---|---|
| `vite.config.js` | Vite build configuration |
| `vitest.config.js` | Vitest unit test configuration |
| `playwright.config.ts` | Playwright E2E test configuration |
| `playwright.android.config.ts` | Playwright Android test configuration |
| `tailwind.config.js` | Tailwind CSS design system configuration |
| `postcss.config.js` | PostCSS / Autoprefixer configuration |
| `eslint.config.js` | ESLint rules |
| `jsconfig.json` | TypeScript/JSConfig for IDE tooling |
| `components.json` | shadcn/ui component registry configuration |
| `capacitor.config.ts` | Capacitor native app configuration |
| `index.html` | Vite entry HTML (PWA shell) |
| `package.json` | Dependencies and npm scripts |

---

## 2. Major Subfolder Map

### `functions/` — Base44 Backend Functions (PRODUCTION-CRITICAL)

All TypeScript files in this folder run on the Base44 Deno runtime and are directly
production-active. They are the backend of the app.

| File | Responsibility | Risk |
|---|---|---|
| `backfillKnowledgeIndex.ts` | Admin-triggered batch indexer for content entities | **CRITICAL — do not modify** |
| `buildContentDocument.ts` | Converts a content entity record into a text document for indexing | **CRITICAL** |
| `chunkContentDocument.ts` | Splits a content document into overlapping chunks for embedding | **CRITICAL** |
| `upsertKnowledgeIndex.ts` | Embeds and upserts content chunks into the vector knowledge index | **CRITICAL** |
| `indexContentRecord.ts` | Orchestrator: build → chunk → upsert pipeline for one record | **CRITICAL** |
| `removeFromKnowledgeIndex.ts` | Removes a record's chunks from the vector index | **CRITICAL** |
| `retrieveRelevantContent.ts` | Semantic retrieval from knowledge index for agent queries | **CRITICAL** |
| `evaluateKnowledgeIndex.ts` | Evaluation harness for retrieval quality | Medium |
| `postLlmSafetyFilter.ts` | Safety filter applied after LLM output | **SAFETY-CRITICAL** |
| `sanitizeAgentOutput.ts` | Sanitizes agent output before delivery to client | **SAFETY-CRITICAL** |
| `sanitizeConversation.ts` | Sanitizes conversation before feeding to agents | **SAFETY-CRITICAL** |
| `enhancedCrisisDetector.ts` | Detects crisis signals in conversation | **SAFETY-CRITICAL** |
| `checkProactiveNudges.ts` | Automation: proactive user nudges (scheduled) | **CRITICAL** |
| `checkGoalReminders.ts` | Automation: goal reminder notifications (scheduled) | **CRITICAL** |
| `retentionCleanup.ts` | Automation: data retention and cleanup (scheduled) | **CRITICAL** |
| `sendNotification.ts` | Sends push/in-app notifications | High |
| `createCheckoutSession.ts` | Stripe checkout session creation | High |
| `stripeWebhook.ts` | Stripe webhook handler | High |
| `normalizeAgentMessage.ts` | Normalizes incoming agent messages | High |
| `extractThoughtWorkData.ts` | Extracts structured data from thought-work entries | High |
| `logProtocolMetrics.ts` | Logs evaluation / monitoring metrics | Medium |
| `generateComplianceReport.ts` | Generates compliance/audit reports | Medium |
| `validateAgentEntityAccess.ts` | Validates that an agent access request is within policy | Medium |
| `validateAgentPolicy.ts` | Validates agent wiring against the access policy | Medium |
| `goldenScenarios.ts` | Golden test scenarios for agent behavior | Test |
| `safetyGoldenScenarios.ts` | Golden test scenarios for safety filters | Test |
| `runSafetyTestSuite.ts` | Runs the full safety test suite | Test |
| `redTeamingTests.ts` | Red-team adversarial test cases | Test |
| `dataRetentionTests.ts` | Tests for data retention logic | Test |
| `testReasoningFilter.ts` | Tests for reasoning-leakage filter | Test |
| `testReasoningLeakage.ts` | Tests for reasoning-leakage detection | Test |
| `promptTestingGuide.ts` | Guide/runbook for prompt testing | Docs/Test |
| `playwrightTests.ts` | Playwright helper stubs inside functions | Test |
| `e2eTestHelpers.ts` | E2E test helpers | Test |
| `smoke.web.spec.ts` | Smoke test spec | Test |
| `smoke.web.spec.example.ts` | Example smoke spec | Test/Docs |
| `smokeTestConfig.ts` | Smoke test configuration | Test |
| `*.md.ts` | Markdown-style documentation embedded in `.ts` extension | Docs |

### `src/api/` — Frontend API Client and Wiring (PRODUCTION-CRITICAL)

| File/Folder | Responsibility | Risk |
|---|---|---|
| `entities/index.js` | All Base44 entity definitions used by the frontend | **CRITICAL — do not modify schema** |
| `agentWiring.js` | Entity-to-agent wiring configuration (Steps 1–3) | **CRITICAL — do not modify** |
| `activeAgentWiring.js` | Active (live) agent wiring applied at runtime | **CRITICAL — do not modify** |
| `base44Client.js` | Base44 SDK client initialization | **CRITICAL** |

### `src/components/` — React UI Components

| Subfolder | Responsibility | Risk |
|---|---|---|
| `ai/` | AI chat and companion UI components | High |
| `audio/` | Audio player / content components | Medium |
| `chat/` | Chat UI for AI Companion | High |
| `coaching/` | CBT coaching session wizard and chat | High |
| `community/` | Community forum components | Medium |
| `exercises/` | Exercise display and interactive tools | Medium |
| `experiential_games/` | Experiential game UI | Medium |
| `feed/` | Personalized content feed | Medium |
| `gamification/` | Streaks, badges, rewards | Medium |
| `goals/` | Goal setting and goal coach wizard | High |
| `health/` | Health data integration components | Medium |
| `home/` | Home page components | Medium |
| `i18n/` | Internationalization — translations.jsx (7 languages) | Medium |
| `journal/` | Thought journal UI | High |
| `journeys/` | Structured CBT journey UI | Medium |
| `layout/` | App layout shell, scroll container (AppContent.jsx) | **HIGH** |
| `mood/` | Mood tracking entry components | Medium |
| `notifications/` | Notification display | Medium |
| `onboarding/` | Onboarding wizard | Medium |
| `playlists/` | Audio playlist UI | Medium |
| `progress/` | Progress tracking and charts | Medium |
| `resources/` | Psychoeducation resource display | Medium |
| `settings/` | User settings UI | Medium |
| `shared/` | Shared/reused UI primitives | Medium |
| `starterpath/` | Starter path onboarding flow | Medium |
| `subscription/` | Subscription / paywall UI | High |
| `ui/` | shadcn/ui base component library | Low |
| `utils/` | Frontend utility components | Low |

### `src/pages/` — Route-Level Page Components (MEDIUM-HIGH RISK)

Each file maps to a user-facing route. Do not modify routes or layouts without
explicit approval.

### `src/lib/` — Frontend Libraries and Utilities

| File | Responsibility |
|---|---|
| `AuthContext.jsx` | Authentication context and state |
| `NavigationTracker.jsx` | Route navigation analytics |
| `PageNotFound.jsx` | 404 fallback page |
| `app-params.js` | URL / app parameter helpers |
| `platform.js` | Platform detection (web/iOS/Android) |
| `query-client.js` | TanStack React Query client configuration |
| `scrollContainer.js` | Scroll container diagnostic utilities |
| `utils.js` | Shared utility functions (cn, classnames, etc.) |

### `src/hooks/` — Custom React Hooks

| File | Responsibility |
|---|---|
| `use-mobile.jsx` | Mobile breakpoint detection hook |

### `src/utils/` — Frontend Utility Modules

| File | Responsibility |
|---|---|
| `index.ts` | Utility re-exports |
| `numericSafety.js` | Safe numeric parsing helpers |

### `test/` — Vitest Unit Tests

All files under `test/utils/` are Vitest unit test specs. They test pure logic
modules and are safe to add to, but existing tests must not be removed or weakened.

| File | Tests |
|---|---|
| `activeAgentWiring.test.js` | Active agent wiring validation |
| `agentWiring.test.js` | Agent wiring policy checks |
| `agentWiringHybrid.test.js` | Hybrid agent wiring tests |
| `agentWiringStep2.test.js` | Step 2 wiring tests |
| `agentWiringStep3.test.js` | Step 3 wiring tests |
| `agentWiringV1Final.test.js` | V1 final wiring tests |
| `breathingExercises.test.js` | Breathing exercise data |
| `cn.test.js` | Class name utility |
| `exercisesData.test.js` | Exercise data integrity |
| `messageContentSanitizer.test.js` | Message sanitization |
| `numericSafety.test.js` | Numeric safety helpers |
| `translations.test.js` | i18n translation completeness |
| `validateAgentPolicy.test.js` | Agent policy validation |

### `tests/` — Playwright E2E and Android Tests

| Subfolder | Responsibility |
|---|---|
| `e2e/` | Web E2E tests (smoke, user flows, accessibility, layouts) |
| `android/` | Android-specific Playwright tests |
| `helpers/` | Shared Playwright helper utilities |

### `docs/` — Internal Documentation (LOW RISK)

All files here are documentation-only. Additive changes are safe. Do not remove
existing policy documents.

| File | Responsibility |
|---|---|
| `ai-agent-access-policy.md` | **Source of truth** for agent entity access policy |
| `ai-agent-content-mapping.md` | Entity-to-agent content mapping |
| `ai-agent-decision-matrix.md` | Agent decision classification matrix |
| `ai-agent-enforcement-spec.md` | Detailed enforcement spec for agent wiring |
| `ai-agent-hybrid-model.md` | Hybrid agent architecture description |
| `ai-agent-policy-validator-checks.md` | Policy validator check descriptions |
| `ai-entity-classification.md` | Entity classification (Private/Shared/Restricted) |
| `copilot-safety-rules.md` | Copilot safety rules summary |
| `data-model.md` | Data model reference |
| `mobile-overflow-audit.md` | Mobile scroll/overflow audit |
| `repository-architecture-map.md` | **This file** — architecture snapshot |
| `copilot-repo-handoff.md` | Copilot handoff summary (companion file) |

### `android/` — Capacitor Android Project (MEDIUM RISK)

Generated and managed by Capacitor CLI. Do not modify manually unless
explicitly required for native capability changes.

### `public/` — Static Assets (LOW RISK)

PWA icons, manifest, deep-link asset association. Safe to update assets.

---

## 3. Safe Edit Zone Classification

### 🔴 HIGH RISK — Do Not Change Without Explicit Approval

| Path | Reason |
|---|---|
| `functions/backfillKnowledgeIndex.ts` | Live knowledge indexing — batch backfill |
| `functions/buildContentDocument.ts` | Knowledge index pipeline |
| `functions/chunkContentDocument.ts` | Knowledge index pipeline |
| `functions/upsertKnowledgeIndex.ts` | Knowledge index pipeline |
| `functions/indexContentRecord.ts` | Knowledge index orchestrator |
| `functions/removeFromKnowledgeIndex.ts` | Knowledge index delete path |
| `functions/retrieveRelevantContent.ts` | Live retrieval — feeds agents |
| `functions/postLlmSafetyFilter.ts` | **Safety-critical** — LLM output filtering |
| `functions/sanitizeAgentOutput.ts` | **Safety-critical** — agent output sanitization |
| `functions/sanitizeConversation.ts` | **Safety-critical** — conversation sanitization |
| `functions/enhancedCrisisDetector.ts` | **Safety-critical** — crisis detection |
| `functions/checkProactiveNudges.ts` | Live automation |
| `functions/checkGoalReminders.ts` | Live automation |
| `functions/retentionCleanup.ts` | Live data retention automation |
| `functions/createCheckoutSession.ts` | Stripe payment — live |
| `functions/stripeWebhook.ts` | Stripe webhook — live |
| `functions/sendNotification.ts` | Live notifications |
| `src/api/entities/index.js` | Base44 entity schemas — live runtime |
| `src/api/agentWiring.js` | Agent wiring configuration — live |
| `src/api/activeAgentWiring.js` | Active agent wiring — live |
| `src/api/base44Client.js` | SDK client — live |
| `src/App.jsx` | Root router and auth loading |
| `src/Layout.jsx` | Main layout shell and scroll container |
| `src/components/layout/AppContent.jsx` | Scroll container (`#app-scroll-container`) |
| `src/main.jsx` | Application entry point |
| `src/pages.config.js` | Route/page registration |
| `src/components/coaching/CoachingSessionWizard.jsx` | Clinical coaching session wizard |
| `src/components/coaching/CoachingChat.jsx` | Live AI coaching chat |
| `src/components/chat/` | AI Companion chat |
| `src/components/ai/` | AI-related UI components |
| `src/components/subscription/` | Payment and paywall logic |
| `vite.config.js` | Build configuration |
| `capacitor.config.ts` | Native app configuration |
| `.github/copilot-instructions.md` | Copilot master instructions |

### 🟠 MEDIUM RISK — Change Only in Small, Reviewed PRs

| Path | Reason |
|---|---|
| `functions/normalizeAgentMessage.ts` | Agent message normalization |
| `functions/extractThoughtWorkData.ts` | Thought data extraction |
| `functions/logProtocolMetrics.ts` | Metrics logging |
| `functions/validateAgentEntityAccess.ts` | Access policy validation |
| `functions/validateAgentPolicy.ts` | Policy validation |
| `functions/generateComplianceReport.ts` | Compliance reporting |
| `src/pages/` | Route-level pages — changes affect user flows |
| `src/components/goals/` | Goal coach wizard (GoalCoachWizard.jsx) |
| `src/components/journal/` | Thought journal UI |
| `src/components/coaching/` (non-chat) | Coaching session UI |
| `src/components/mood/` | Mood tracking |
| `src/components/onboarding/` | Onboarding flow |
| `src/components/starterpath/` | Starter path flow |
| `src/components/i18n/translations.jsx` | i18n strings — must update all 7 languages |
| `src/lib/AuthContext.jsx` | Auth state |
| `src/lib/scrollContainer.js` | Scroll container diagnostics |
| `tailwind.config.js` | Design system |
| `playwright.config.ts` | E2E configuration |
| `playwright.android.config.ts` | Android E2E configuration |
| `android/` | Capacitor native project |
| `public/manifest.json` | PWA manifest |

### 🟡 COPILOT-SAFE WITH TESTS

| Path | Notes |
|---|---|
| `test/utils/` | Add tests; never remove or weaken existing tests |
| `tests/e2e/` | Add E2E specs for approved flows |
| `tests/android/` | Add Android E2E specs for approved flows |
| `src/components/exercises/breathingExercisesData.js` | Pure data; testable directly |
| `src/components/ui/` | shadcn/ui base components — safe to add new variants |
| `src/utils/numericSafety.js` | Pure utility — safe to extend |
| `src/lib/utils.js` | Pure utility — safe to extend |
| `functions/goldenScenarios.ts` | Test-only; safe to add scenarios |
| `functions/safetyGoldenScenarios.ts` | Test-only; safe to add scenarios |

### 🟢 LOW RISK — Docs, Tests, Configuration (Additive Only)

| Path | Notes |
|---|---|
| `docs/` | Documentation only; never remove existing policy docs |
| `README.md` | Project readme |
| `SMOKE.md` | Smoke test documentation |
| `TRANSLATION_STATUS.md` | Translation completeness tracking |
| `public/assets/` | Static image assets |
| `public/icons/` | PWA icons |
| `eslint.config.js` | Linting rules — low impact |
| `postcss.config.js` | PostCSS configuration |
| `jsconfig.json` | IDE configuration |
| `components.json` | shadcn/ui registry |
| `functions/*.md.ts` | Documentation files embedded in functions |

---

## 4. Dependency Flow

### Frontend → Backend

```
User interaction (React page/component)
  → TanStack React Query hook
  → Base44 SDK client (src/api/base44Client.js)
  → Base44 entity API (src/api/entities/index.js)
  → Base44 backend runtime
```

### AI Agent Invocation Flow

```
User sends message (CoachingChat.jsx / Chat.jsx)
  → activeAgentWiring.js (selects correct agent at runtime)
  → agentWiring.js (entity source_order configuration)
  → Base44 agent runtime
    → retrieveRelevantContent.ts (knowledge retrieval)
    → sanitizeConversation.ts (conversation pre-processing)
    → LLM call (agent generates response)
    → postLlmSafetyFilter.ts (output safety check)
    → sanitizeAgentOutput.ts (output sanitization)
  → Response returned to client
```

### Knowledge Index Pipeline

```
Content entity created/updated (Exercise, Resource, AudioContent, Journey)
  → indexContentRecord.ts (orchestrator)
    → buildContentDocument.ts (entity → text document)
    → chunkContentDocument.ts (document → overlapping chunks)
    → upsertKnowledgeIndex.ts (chunks → vector store embeddings)
```

### Knowledge Index Backfill (Admin-Triggered Only)

```
Admin triggers backfillKnowledgeIndex.ts
  → Inlined build → chunk → upsert pipeline
  → Scoped to allowed shared content entities only
  → Feature-flag gated (KNOWLEDGE_BACKFILL_ENABLED + KNOWLEDGE_INDEX_ENABLED)
```

### Knowledge Retrieval Flow

```
Agent receives user query
  → retrieveRelevantContent.ts
    → Feature-flag check (KNOWLEDGE_RETRIEVAL_ENABLED)
    → Embedding of query (openai_pinecone provider)
    → Vector similarity search
    → Filtered by entity_type + language
    → Returns top_k ranked chunks
  → Chunks injected into agent context window
```

### Automation / Scheduled Jobs

```
Base44 automation scheduler
  → checkProactiveNudges.ts (proactive engagement nudges)
  → checkGoalReminders.ts (goal deadline reminders)
  → retentionCleanup.ts (data retention / PII cleanup)
```

### Payment Flow

```
User initiates subscription
  → createCheckoutSession.ts (creates Stripe session)
  → Stripe hosted checkout
  → stripeWebhook.ts (handles payment confirmation)
  → Subscription entity updated
```

### Scroll Container Architecture

```
src/Layout.jsx (#app-scroll-container <main>)
  overflow-x-clip + overflow-y-auto + height:100dvh
  → Page components render inside this single scroll root
  → Full-screen pages (wizards/chat) use fixed inset-0 to break out
  → src/lib/scrollContainer.js provides debugScrollChain() diagnostic
```

### i18n Flow

```
src/components/i18n/translations.jsx (7 languages: en, he, es, fr, de, it, pt)
  → src/components/i18n/i18nConfig.jsx (i18next configuration)
  → react-i18next hooks in components
  → Falls back to English for missing keys
```

### Test Dependency Flow

```
test/utils/*.test.js (Vitest unit tests)
  → Pure logic modules (no Base44 SDK calls)
  → breathingExercisesData.js, numericSafety.js, agentWiring.js, etc.

tests/e2e/*.spec.ts (Playwright E2E)
  → Requires running dev/preview server
  → Tests full user flows via browser automation

tests/android/*.spec.ts (Playwright Android)
  → Requires Capacitor Android build + connected device/emulator

functions/*.test*.ts / goldenScenarios.ts / etc.
  → Backend evaluation and safety test suites (Base44 runtime)
```

---

## 5. Production-Critical Files and Groups

### Production-Critical Files (Do Not Modify Without Approval)

```
functions/backfillKnowledgeIndex.ts
functions/buildContentDocument.ts
functions/chunkContentDocument.ts
functions/upsertKnowledgeIndex.ts
functions/indexContentRecord.ts
functions/removeFromKnowledgeIndex.ts
functions/retrieveRelevantContent.ts
functions/postLlmSafetyFilter.ts       ← SAFETY-CRITICAL
functions/sanitizeAgentOutput.ts       ← SAFETY-CRITICAL
functions/sanitizeConversation.ts      ← SAFETY-CRITICAL
functions/enhancedCrisisDetector.ts    ← SAFETY-CRITICAL
functions/checkProactiveNudges.ts
functions/checkGoalReminders.ts
functions/retentionCleanup.ts
functions/createCheckoutSession.ts
functions/stripeWebhook.ts
functions/sendNotification.ts
src/api/entities/index.js              ← Base44 entity schemas
src/api/agentWiring.js                 ← Agent wiring configuration
src/api/activeAgentWiring.js           ← Live agent wiring
src/api/base44Client.js                ← SDK client
src/App.jsx                            ← Root router
src/Layout.jsx                         ← Layout shell
src/main.jsx                           ← Entry point
src/pages.config.js                    ← Route registration
src/components/layout/AppContent.jsx   ← Scroll container
```

### Files That Define AI Agent Behavior

```
src/api/agentWiring.js
src/api/activeAgentWiring.js
functions/retrieveRelevantContent.ts
functions/postLlmSafetyFilter.ts
functions/sanitizeAgentOutput.ts
functions/sanitizeConversation.ts
functions/enhancedCrisisDetector.ts
functions/normalizeAgentMessage.ts
functions/validateAgentEntityAccess.ts
functions/validateAgentPolicy.ts
```

Source-of-truth policy documents (read-only):
```
docs/ai-agent-access-policy.md
docs/ai-agent-enforcement-spec.md
docs/ai-agent-content-mapping.md
docs/ai-entity-classification.md
```

### Files That Define Retrieval / Indexing Behavior

```
functions/backfillKnowledgeIndex.ts
functions/buildContentDocument.ts
functions/chunkContentDocument.ts
functions/upsertKnowledgeIndex.ts
functions/indexContentRecord.ts
functions/removeFromKnowledgeIndex.ts
functions/retrieveRelevantContent.ts
functions/evaluateKnowledgeIndex.ts
```

### Files That Define Build / Deployment Behavior

```
vite.config.js
package.json
capacitor.config.ts
android/build.gradle
android/app/build.gradle
android/settings.gradle
android/variables.gradle
public/manifest.json
public/.well-known/assetlinks.json
.github/workflows/playwright.yml
.github/workflows/webpack.yml
```

### Configuration Files (Do Not Change Casually)

```
vite.config.js
tailwind.config.js
eslint.config.js
vitest.config.js
playwright.config.ts
playwright.android.config.ts
jsconfig.json
components.json
capacitor.config.ts
postcss.config.js
```

### Private User Entities (Never Index or Retrieve Cross-User)

The following entity types are private. They must never appear in shared
retrieval pipelines or be exposed cross-user:

```
ThoughtJournal
Conversation
CaseFormulation
MoodEntry
CompanionMemory
UserDeletedConversations
```

These are defined in `src/api/entities/index.js` and their access policy
is documented in `docs/ai-agent-access-policy.md` and
`docs/ai-entity-classification.md`.

---

## 6. Future Copilot Work Lanes

### Lane A: Documentation-Only Tasks 🟢

**Safe for Copilot without additional approval.**

- Adding or updating files in `docs/`
- Updating `README.md`, `SMOKE.md`, `TRANSLATION_STATUS.md`
- Adding inline comments to non-critical utility files
- Updating `functions/*.md.ts` documentation files

**Must not**: remove or contradict existing policy documents.

---

### Lane B: Test-Only Tasks 🟡

**Safe for Copilot with test-aware review.**

- Adding new Vitest unit tests in `test/utils/`
- Adding new Playwright E2E specs in `tests/e2e/`
- Adding new Playwright Android specs in `tests/android/`
- Adding golden scenarios to `functions/goldenScenarios.ts`
- Adding safety test cases to `functions/safetyGoldenScenarios.ts`

**Must not**: remove, weaken, or skip existing tests.
**Must not**: add tests that require schema changes or new entities.

---

### Lane C: Pure Utility Tasks 🟡

**Safe for Copilot with unit test coverage.**

- Adding pure utility functions to `src/lib/utils.js`
- Adding pure helpers to `src/utils/numericSafety.js`
- Adding new shadcn/ui variants to `src/components/ui/`
- Extending breathing exercise data in `src/components/exercises/breathingExercisesData.js`

**Must not**: introduce side effects, entity access, or runtime state changes.

---

### Lane D: i18n Tasks 🟡

**Safe for Copilot when adding strings only.**

- Adding new translation keys to `src/components/i18n/translations.jsx`
- **All 7 languages must be updated**: en, he, es, fr, de, it, pt
- Checking translation completeness via `test/utils/translations.test.js`

**Must not**: remove existing keys; must not leave non-English languages empty.

---

### Lane E: Frontend Bug Fix and UI Tasks 🟠

**Requires explicit approval before Copilot proceeds.**

- Fixing bugs in existing UI components (when explicitly requested)
- Adding new pages or components (when explicitly requested)
- Scroll or layout fixes (must preserve `overflow-x-clip` scroll pattern)
- Responsive design fixes

**Must not**: change routes, navigation, or layout structure without approval.
**Must not**: add `overflow-x-hidden` to page wrappers (breaks iOS WKWebView).
**Must not**: add nested scroll containers inside `#app-scroll-container`.
**Must use**: `min-h-dvh` not `min-h-screen` for page root wrappers.

---

### Lane F: Backend Hardening Tasks 🔴

**Requires explicit approval and careful review.**

- Hardening logic in `functions/postLlmSafetyFilter.ts`
- Hardening logic in `functions/sanitizeAgentOutput.ts`
- Adding new safety rules without weakening existing ones
- Adding new validation in `functions/validateAgentPolicy.ts`

**Must not**: weaken any existing safety checks.
**Must not**: change the signature or output contract of safety functions.
**Must**: propose behavior change explicitly in PR description.

---

### Lane G: Retrieval Regression and Evaluation Tasks 🔴

**Requires explicit approval.**

- Adding evaluation scenarios to `functions/evaluateKnowledgeIndex.ts`
- Extending `functions/goldenScenarios.ts` with new retrieval scenarios
- Running retrieval quality evaluations (read-only; no index mutation)

**Must not**: modify retrieval logic or indexing behavior.
**Must not**: expand retrieval scope beyond approved shared content entities.

---

### Lane H: Base44 Behavior Changes 🔴 COPILOT-UNSAFE WITHOUT HUMAN APPROVAL

**Never proceed without explicit human approval.**

- Any change to `src/api/entities/index.js` (entity schemas)
- Any change to `src/api/agentWiring.js` or `activeAgentWiring.js`
- Any change to retrieval/indexing pipeline functions
- Any change to agent prompts or tool configurations
- Any change to Base44 automations or scheduled jobs
- Any change to payment or webhook functions
- Any change to `.env` values, secrets, or environment configuration

**If in doubt**: stop, describe the proposed change in the PR, and wait for approval.

---

*Last updated: Stage 2 — Repository Architecture Snapshot (additive documentation only).*
*No existing application behavior was changed in creating this document.*
