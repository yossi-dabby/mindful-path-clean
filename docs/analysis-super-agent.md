# Analysis: Inventory of AI Agent and Language Support for Super Agent Rollout

> **Purpose:** This document maps every file, abstraction, and entry point involved in the
> AI therapist agent system and the language / i18n infrastructure.  
> It is the reference inventory for subsequent Super Agent PRs.  
> **No code or configuration is changed by this document.**

---

## Table of Contents

1. [Agent System — Overview](#1-agent-system--overview)
2. [Primary Agent Entry Points](#2-primary-agent-entry-points)
3. [Agent Wiring & Routing](#3-agent-wiring--routing)
4. [Feature Flags & Upgrade Gates](#4-feature-flags--upgrade-gates)
5. [Workflow Engine & Context Injection](#5-workflow-engine--context-injection)
6. [Memory & Summarization Layer](#6-memory--summarization-layer)
7. [Retrieval Orchestration Stack](#7-retrieval-orchestration-stack)
8. [Safety Stack (Agent-Specific)](#8-safety-stack-agent-specific)
9. [Backend Functions — Agent-Related](#9-backend-functions--agent-related)
10. [Agent Validation & Policy Enforcement](#10-agent-validation--policy-enforcement)
11. [External Knowledge Pipeline](#11-external-knowledge-pipeline)
12. [i18n & Language Support — Overview](#12-i18n--language-support--overview)
13. [i18n Config & Bootstrap](#13-i18n-config--bootstrap)
14. [Translation Files & Builders](#14-translation-files--builders)
15. [Language Selector UI](#15-language-selector-ui)
16. [Agent Prompt Multilingual Sections](#16-agent-prompt-multilingual-sections)
17. [Test Files — Agent & Language](#17-test-files--agent--language)
18. [Policy & Architecture Documents](#18-policy--architecture-documents)
19. [Dependency Map for Super Agent Tasks](#19-dependency-map-for-super-agent-tasks)

---

## 1. Agent System — Overview

The app has **two AI agents**:

| Agent | Canonical name | Role |
|-------|---------------|------|
| **CBT Therapist** | `cbt_therapist` | Structured clinical CBT sessions |
| **AI Companion** | `ai_companion` | Supportive emotional wellness |

The CBT Therapist is the target for the "super agent" upgrade.  
Both agents are configured via Base44 entity wiring (tool_configs) and are currently live.

The therapist has been through 10 upgrade phases (Stage 2), each gated by feature flags.  
The active wiring is resolved at runtime by `resolveTherapistWiring()` in `src/api/activeAgentWiring.js`.

---

## 2. Primary Agent Entry Points

### 2.1 Frontend Session Entry — Chat.jsx

**File:** `src/pages/Chat.jsx`

The primary user-facing entry point for CBT Therapist sessions.

Key responsibilities:
- Loads the active therapist wiring via `ACTIVE_CBT_THERAPIST_WIRING`
- Calls `buildV4SessionStartContentAsync()` / `buildRuntimeSafetySupplement()` for context injection
- Invokes `base44.entities.Conversation.create()` / Base44 agent API for message exchange
- Handles crisis detection, risk panel, safety mode indicator, and session-phase indicator
- Imports: `useTranslation` (react-i18next) — all user-visible strings are i18n-keyed
- Imports legacy variant profile guard (`LEGACY_VARIANT_PROFILES`) — fail-closed for stale agent names

Notable imports in `Chat.jsx`:
```
ACTIVE_CBT_THERAPIST_WIRING        ← src/api/activeAgentWiring.js
buildV4SessionStartContentAsync    ← src/lib/workflowContextInjector.js
buildRuntimeSafetySupplement       ← src/lib/workflowContextInjector.js
detectCrisisWithReason             ← src/components/utils/crisisDetector
validateAgentOutput                ← src/components/utils/validateAgentOutput.jsx
sanitizeConversationMessages       ← src/components/utils/validateAgentOutput.jsx
SessionPhaseIndicator              ← src/components/therapy/SessionPhaseIndicator.jsx
SafetyModeIndicator                ← src/components/therapy/SafetyModeIndicator.jsx
```

### 2.2 Agent Prompt Definition

**File:** `base44/agents/cbt_therapist.jsonc`

The live Base44 agent instructions file for the CBT Therapist.  
This is a **production-active** JSONC file (~117 KB). It encodes:
- Multilingual hard-banned phrase lists (all 7 languages)
- Multilingual refinement question templates (all 7 languages)
- CBT curriculum layer and intervention hierarchy
- Correction pass rules (CP1–CP6) applied before every response
- Response domain lock, continuity relevance gate
- Safety mode constraints and emergency resource policy

> **This file is frozen.** Do not modify without explicit approval.

### 2.3 Companion / Coach Entry Points

**File:** `src/pages/Coach.jsx`  
The AI Companion entry point (separate from the CBT Therapist session page).

---

## 3. Agent Wiring & Routing

### 3.1 Agent Wiring Registry

**File:** `src/api/agentWiring.js` (~38 KB)

Exports all named wiring configurations — pure JS constants, no runtime behavior.

| Export constant | Phase | Description |
|----------------|-------|-------------|
| `CBT_THERAPIST_WIRING_STEP_1` | Step 1 | 4 preferred entities only |
| `CBT_THERAPIST_WIRING_STEP_2` | Step 2 | + 4 allowed shared-content entities |
| `CBT_THERAPIST_WIRING_STEP_3` | Step 3 | + 2 restricted entities |
| `CBT_THERAPIST_WIRING_HYBRID` | Hybrid | + 2 caution-layer entities (CaseFormulation, Conversation) |
| `CBT_THERAPIST_WIRING_STAGE2_V1` | Phase 1 | Hybrid + memory context injection flag |
| `CBT_THERAPIST_WIRING_STAGE2_V2` | Phase 3 | V1 + workflow engine flags |
| `CBT_THERAPIST_WIRING_STAGE2_V3` | Phase 5 | V2 + retrieval orchestration + ExternalKnowledgeChunk |
| `CBT_THERAPIST_WIRING_STAGE2_V4` | Phase 6 | V3 + live retrieval enabled flag |
| `CBT_THERAPIST_WIRING_STAGE2_V5` | Phase 7 | V4 + safety mode enabled flag |
| `CBT_THERAPIST_WIRING_STAGE2_V6` | Phase 10 | V5 + formulation-led CBT |
| `AI_COMPANION_WIRING_STEP_1` | Step 1 | 2 preferred entities |
| `AI_COMPANION_WIRING_STEP_2` | Step 2 | + 4 allowed shared-content entities |
| `AI_COMPANION_WIRING_STEP_3` | Step 3 | + 2 restricted entities |
| `AI_COMPANION_WIRING_HYBRID` | Hybrid | + Conversation caution-layer entity |

Entity access matrix for CBT Therapist (Hybrid + Stage 2):

| Entity | Access Level | Notes |
|--------|-------------|-------|
| SessionSummary | preferred | source_order 2 |
| ThoughtJournal | preferred | source_order 3 |
| Goal | preferred | source_order 4 |
| CoachingSession | preferred | source_order 5 |
| Exercise | allowed | source_order 6 |
| Resource | allowed | source_order 7 |
| AudioContent | allowed | source_order 8 |
| Journey | allowed | source_order 9 |
| CompanionMemory | restricted | source_order 10, read_only |
| MoodEntry | restricted | source_order 11, calibration_only |
| CaseFormulation | restricted | source_order 12, caution_layer, read_only |
| Conversation | restricted | source_order 13, caution_layer, secondary_only |
| ExternalKnowledgeChunk | restricted | source_order 14 (V3+), external_trusted |

### 3.2 Active Routing

**File:** `src/api/activeAgentWiring.js`

Single place where the runtime wiring is resolved.

Key exports:
- `resolveTherapistWiring()` — evaluates feature flags in priority order and returns the correct wiring version
- `ACTIVE_CBT_THERAPIST_WIRING` — computed at module load from `resolveTherapistWiring()`
- `ACTIVE_AI_COMPANION_WIRING` — always `AI_COMPANION_WIRING_HYBRID`
- `ACTIVE_AGENT_WIRINGS` — map of both agents by name

Routing priority (highest first):
1. Master gate off → `CBT_THERAPIST_WIRING_HYBRID`
2. `THERAPIST_UPGRADE_SAFETY_MODE_ENABLED` → `CBT_THERAPIST_WIRING_STAGE2_V5`
3. `THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED` → `CBT_THERAPIST_WIRING_STAGE2_V4`
4. `THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED` → `CBT_THERAPIST_WIRING_STAGE2_V3`
5. `THERAPIST_UPGRADE_WORKFLOW_ENABLED` → `CBT_THERAPIST_WIRING_STAGE2_V2`
6. `THERAPIST_UPGRADE_MEMORY_ENABLED` → `CBT_THERAPIST_WIRING_STAGE2_V1`
7. Master gate on, no phase flag → `CBT_THERAPIST_WIRING_HYBRID`

> **Note:** Phase 10 (V6) wiring is defined in agentWiring.js but not yet referenced in  
> `resolveTherapistWiring()`. It will be added in the Phase 10 activation step.

---

## 4. Feature Flags & Upgrade Gates

**File:** `src/lib/featureFlags.js`

All Stage 2 upgrade flags are exported from a frozen `THERAPIST_UPGRADE_FLAGS` object.

| Flag | Env variable | Phase |
|------|-------------|-------|
| `THERAPIST_UPGRADE_ENABLED` | `VITE_THERAPIST_UPGRADE_ENABLED` | Master gate |
| `THERAPIST_UPGRADE_MEMORY_ENABLED` | `VITE_THERAPIST_UPGRADE_MEMORY_ENABLED` | Phase 1 |
| `THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` | `VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` | Phase 2 |
| `THERAPIST_UPGRADE_WORKFLOW_ENABLED` | `VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED` | Phase 3 |
| `THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED` | `VITE_THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED` | Phase 4 |
| `THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED` | `VITE_THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED` | Phase 5 |
| `THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED` | `VITE_THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED` | Phase 6 |
| `THERAPIST_UPGRADE_SAFETY_MODE_ENABLED` | `VITE_THERAPIST_UPGRADE_SAFETY_MODE_ENABLED` | Phase 7 |

Key function exports:
- `isUpgradeEnabled(flagName)` — dual-path evaluation (env var + staging URL override)
- `logUpgradeEvent(event, context)` — analytics hook for upgrade observability
- `registerUpgradeAnalyticsTracker(trackFn)` — connects to Base44 analytics
- `getStage2DiagnosticPayload()` / `logStage2Diagnostics()` — `?_s2debug=true` diagnostic tools

Staging URL override format: `?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_WORKFLOW_ENABLED`  
(Only active on `*.base44.app` and `localhost` hosts — fail-closed on production domains.)

---

## 5. Workflow Engine & Context Injection

### 5.1 Workflow Engine

**File:** `src/lib/therapistWorkflowEngine.js`

Defines the CBT session structure for the upgraded path:
- `THERAPIST_WORKFLOW_VERSION` — semver version constant
- `THERAPIST_WORKFLOW_SEQUENCE` — fixed 6-step CBT response sequence
- `THERAPIST_WORKFLOW_INSTRUCTIONS` — pre-built instruction string for context injection
- `THERAPIST_FORMULATION_RESPONSE_RULES` — 7 rules added in Phase 10 (formulation-led CBT)
- Emotion differentiation map and instruction builder utilities

### 5.2 Context Injector

**File:** `src/lib/workflowContextInjector.js`

Assembles the full `[START_SESSION]` content for any wiring version:
- `getWorkflowContextForWiring(wiring)` — returns workflow instructions when V2+ wiring is active
- `buildSessionStartContent(wiring)` — synchronous, V2/V3 path only (no async)
- `buildV3SessionStartContentAsync(entities, wiring)` — Phase 5.1 async retrieval
- `buildV4SessionStartContentAsync(entities, baseClient, wiring)` — Phase 6 async + live retrieval
- `buildV6SessionStartContentAsync(entities, baseClient, wiring)` — Phase 10 formulation-led
- `buildRuntimeSafetySupplement(lastUserMessage, wiring)` — per-turn safety supplement (Phase 7.1)

Imports and chains:
```
therapistWorkflowEngine.js → THERAPIST_WORKFLOW_INSTRUCTIONS
retrievalOrchestrator.js   → getRetrievalContextForWiring, buildBoundedContextPackage
v3RetrievalExecutor.js     → executeV3BoundedRetrieval
liveRetrievalWrapper.js    → LIVE_RETRIEVAL_POLICY_INSTRUCTIONS, buildLiveContextSection
v4RetrievalExecutor.js     → executeV4BoundedRetrieval
therapistSafetyMode.js     → determineSafetyMode, getSafetyModeContextForWiring, evaluateRuntimeSafetyMode
emergencyResourceLayer.js  → buildEmergencyResourceSection
```

---

## 6. Memory & Summarization Layer

### 6.1 Memory Model

**File:** `src/lib/therapistMemoryModel.js`

Defines the structured memory record schema stored inside `CompanionMemory` entity records.
- Version marker `THERAPIST_MEMORY_TYPE = 'therapist_session'`
- No runtime side effects; safe to import in tests

### 6.2 Summarization Gate

**File:** `src/lib/summarizationGate.js`

JS-side gate for Phase 2 session-end summarization:
- `isSummarizationEnabled()` — checks feature flags
- Output contract (mirrors Phase 1 memory schema)
- Sanitization helpers for summary string and array fields
- `buildSafeStubRecord()` — fail-safe minimal record builder

### 6.3 Real Summarization Invocation Path

**File:** `src/lib/sessionEndSummarization.js`

Phase 2.1 real runtime summarization:
- `deriveSessionSummaryPayload(session, boundedMessages)` — non-LLM structured extraction
- `triggerSessionEndSummarization(session, messages, invoker)` — fire-and-forget invocation

Backend counterpart: `base44/functions/generateSessionSummary/`

### 6.4 Backend Memory Functions

| Function directory | Description |
|-------------------|-------------|
| `base44/functions/retrieveTherapistMemory/` | Read structured therapist memory records |
| `base44/functions/writeTherapistMemory/` | Write structured therapist memory records |
| `base44/functions/generateSessionSummary/` | Generate structured session summaries |

---

## 7. Retrieval Orchestration Stack

### 7.1 Configuration

**File:** `src/lib/retrievalConfig.js`

Pure configuration data — source type constants, bounds, thresholds.  
No runtime side effects.

Key constants:
- `RETRIEVAL_SOURCE_TYPES` — named identifiers for each retrieval source
- `RETRIEVAL_CONFIG` — bounds (max items per source, internal sufficiency threshold)

### 7.2 Orchestrator

**File:** `src/lib/retrievalOrchestrator.js`

Core Phase 5 retrieval orchestrator:
- `RETRIEVAL_ORCHESTRATION_INSTRUCTIONS` — pre-built injection string
- `getRetrievalContextForWiring(wiring)` — returns instructions for V3+ wiring
- `buildBoundedContextPackage(items, config)` — provenance-tagged context assembler

### 7.3 V3 Executor (Phase 5.1)

**File:** `src/lib/v3RetrievalExecutor.js`

Real runtime executor for internal-first retrieval (4 internal sources):
1. `therapist_memory` — CompanionMemory with therapist version marker
2. `session_context` — active Goal + recent SessionSummary
3. `internal_knowledge` — Exercise + Resource
4. `external_knowledge` — ExternalKnowledgeChunk

### 7.4 V4 Executor (Phase 6)

**File:** `src/lib/v4RetrievalExecutor.js`

Extends V3 with Step 5 — live trusted retrieval via the technical allowlist wrapper.
- Delegates to `executeV3BoundedRetrieval` for sources 1–4
- Checks internal sufficiency before triggering live retrieval
- Returns combined `V4RetrievalResult`

### 7.5 Live Retrieval Allowlist

**File:** `src/lib/liveRetrievalAllowlist.js`

Technical (code-level) domain allowlist for live retrieval.  
Approved domains: `nimh.nih.gov`, `nice.org.uk`, `who.int`, `samhsa.gov`, `library.samhsa.gov`,
`medlineplus.gov`, `healthquality.va.gov`, `psychiatry.org`, `cssrs.columbia.edu`.

### 7.6 Live Retrieval Wrapper

**File:** `src/lib/liveRetrievalWrapper.js`

Fail-closed wrapper for live retrieval:
- Validates URL against allowlist before any network request
- Normalizes returned content into safe bounded format
- Returns `LiveRetrievalResult` — never throws

Backend counterpart: `base44/functions/fetchLiveResource/`

---

## 8. Safety Stack (Agent-Specific)

### 8.1 Safety Mode (Upgraded Path)

**File:** `src/lib/therapistSafetyMode.js`

Phase 7 safety mode — layers on top of (never replaces) the existing crisis stack:
- Deterministic pattern-matching for high-distress / high-risk language (no LLM dependency)
- `determineSafetyMode(input)` — evaluates safety-mode entry conditions
- `evaluateRuntimeSafetyMode(lastMessage)` — per-turn runtime evaluator (Phase 7.1)
- `getSafetyModeContextForWiring(wiring, safetyResult)` — returns instruction text
- `SAFETY_MODE_INSTRUCTIONS` — pre-built instruction string
- `SAFETY_MODE_FAIL_CLOSED_RESULT` — canonical fail-closed value
- `SAFETY_PRECEDENCE_ORDER` — constant defining safety signal priority

### 8.2 Emergency Resource Layer

**File:** `src/lib/emergencyResourceLayer.js`

Phase 7 locale-sensitive, LLM-independent emergency resource layer:
- `VERIFIED_EMERGENCY_RESOURCES` — static map of verified crisis contacts for all 7 locales (en, he, es, fr, de, it, pt)
- `buildEmergencyResourceSection(locale)` — returns bounded formatted context string
- `getResourceSourceBasis(locale)` — provenance metadata for resource set
- `isLocaleVerified(locale)` — locale verification check
- Fail-safe: unknown/missing locale always falls back to `en` (international set)

### 8.3 Crisis Detection (Shared — All Paths)

**File:** `src/components/utils/crisisDetector.jsx`  
**Function:** `detectCrisisWithReason(message)`

Used in Chat.jsx for all conversation paths. Test file: `test/utils/crisisDetector.test.js`

### 8.4 Output Sanitization (Shared — All Paths)

**File:** `src/components/utils/validateAgentOutput.jsx`

Exports:
- `validateAgentOutput(output)` — output contract enforcement
- `sanitizeConversationMessages(messages)` — conversation sanitization

Backend counterparts:
- `base44/functions/sanitizeAgentOutput/entry.ts`
- `base44/functions/sanitizeConversation/entry.ts`
- `base44/functions/postLlmSafetyFilter/entry.ts` — LLM output safety filter

### 8.5 Upgraded-Path UI Components

| File | Phase | Description |
|------|-------|-------------|
| `src/components/therapy/SessionPhaseIndicator.jsx` | Phase 8 | Shows current CBT workflow phase (flag-gated) |
| `src/components/therapy/SafetyModeIndicator.jsx` | Phase 8 | Shows safety mode active state (flag-gated) |

---

## 9. Backend Functions — Agent-Related

All under `base44/functions/`:

| Directory | Description | Safety Level |
|-----------|-------------|-------------|
| `postLlmSafetyFilter/` | LLM output safety filter | 🔴 SAFETY-CRITICAL |
| `sanitizeAgentOutput/` | Agent output sanitization | 🔴 SAFETY-CRITICAL |
| `sanitizeConversation/` | Conversation sanitization | 🔴 SAFETY-CRITICAL |
| `enhancedCrisisDetector/` | Enhanced crisis detection | 🔴 SAFETY-CRITICAL |
| `generateSessionSummary/` | Session summary generation | Production-active |
| `retrieveTherapistMemory/` | Memory retrieval | Production-active |
| `writeTherapistMemory/` | Memory write | Production-active |
| `retrieveRelevantContent/` | Content retrieval | Production-active |
| `retrieveCurriculumUnit/` | CBT curriculum retrieval | Production-active |
| `retrieveTrustedCBTContent/` | Trusted CBT content retrieval | Production-active |
| `fetchLiveResource/` | Live resource fetcher (allowlisted) | Production-active |
| `ingestTrustedDocument/` | External document ingestion | Production-active |
| `validateTrustedSource/` | Source validation | Production-active |
| `indexContentRecord/` | Knowledge index upsert | Production-active |
| `upsertKnowledgeIndex/` | Knowledge index management | Production-active |
| `backfillKnowledgeIndex/` | Knowledge index backfill | 🔴 INDEXING-CRITICAL |
| `validateAgentPolicy/` | Agent policy validator | Production-active |
| `validateAgentEntityAccess/` | Entity access validator | Production-active |
| `extractThoughtWorkData/` | Thought work extraction | Production-active |
| `normalizeAgentMessage/` | Message normalization | Production-active |
| `sessionPhaseEngine/` | Session phase engine (Deno) | Production-active |
| `therapistSafetyMode/` | Safety mode backend | Production-active |
| `buildContentDocument/` | Content document builder | Production-active |
| `chunkContentDocument/` | Content chunking | Production-active |
| `evaluateKnowledgeIndex/` | Knowledge index evaluation | Production-active |
| `removeFromKnowledgeIndex/` | Knowledge index removal | Production-active |
| `logProtocolMetrics/` | Protocol metrics logging | Production-active |
| `checkProactiveNudges/` | Proactive nudge checker | 🟠 USER-FACING |
| `retentionCleanup/` | Data retention cleanup | 🔴 DESTRUCTIVE |
| `generateComplianceReport/` | Compliance reporting | Production-active |
| `sendNotification/` | Notification sender | Production-active |
| `deleteMyAccount/` | Account deletion | 🔴 DESTRUCTIVE |

---

## 10. Agent Validation & Policy Enforcement

### 10.1 Policy Validator

**File:** `base44/functions/validateAgentPolicy/entry.ts`

Validates agent configurations against `docs/ai-agent-enforcement-spec.md §F`.  
Frontend test mirror: `test/utils/validateAgentPolicy.test.js`

### 10.2 Entity Access Validator

**File:** `base44/functions/validateAgentEntityAccess/entry.ts`  
Frontend test mirror: `test/utils/validateAgentEntityAccess.test.js`

Enforces entity-level access rules per agent.

---

## 11. External Knowledge Pipeline

### 11.1 Source & Chunk Models

| File | Description |
|------|-------------|
| `src/lib/externalKnowledgeSource.js` | External knowledge source schema + approved source registry |
| `src/lib/externalKnowledgeChunk.js` | External knowledge chunk schema + factory/validation helpers |
| `src/lib/externalKnowledgeStore.js` | Phase 4.1 in-memory store (deduplication, provenance) |
| `src/lib/externalKnowledgePersistence.js` | Phase 4.2 entity-based persistence adapter |

### 11.2 Entity Schemas

| File | Description |
|------|-------------|
| `src/api/entities/ExternalKnowledgeSource.js` | Base44 entity schema for knowledge sources |
| `src/api/entities/ExternalKnowledgeChunk.js` | Base44 entity schema for knowledge chunks |
| `src/api/entities/index.js` | Entity registry (includes KnowledgeInfrastructure domain) |

### 11.3 Seed Data

| File | Description |
|------|-------------|
| `src/data/trusted-cbt-batch-2.base44.json` | CBT trusted content batch 2 |
| `src/data/trusted-cbt-batch-3.base44.json` | CBT trusted content batch 3 |

---

## 12. i18n & Language Support — Overview

**Supported languages:**

| Code | Language | Notes |
|------|----------|-------|
| `en` | English | Default language |
| `he` | Hebrew | RTL layout support |
| `es` | Spanish | — |
| `fr` | French | — |
| `de` | German | — |
| `it` | Italian | — |
| `pt` | Portuguese | — |

**Library:** `react-i18next` with `i18next-browser-languagedetector`

**Language persistence:** `localStorage` key `language`

**RTL support:** Automatic — `document.documentElement.dir = 'rtl'` when `lng === 'he'`

---

## 13. i18n Config & Bootstrap

| File | Description |
|------|-------------|
| `src/components/i18n/i18nConfig.jsx` | i18n initialization, language detection, RTL toggle, missing-key handler |
| `src/components/i18n/translationsBuilder.jsx` | Merges mind-games translations into the main `translations` object via `applyMindGamesTranslations()` |
| `src/components/i18n/I18N_GUIDELINES.md` | i18n usage rules and key convention guide |
| `src/components/i18n/PHASE_3_SUMMARY.md` | Phase 3 i18n guardrails & E2E hardening summary |

i18nConfig bootstrap chain:
```
src/main.jsx
  └── imports i18nConfig.jsx
        └── imports translations.jsx  (en + he inline)
        └── imports translationsBuilder.jsx
              └── imports mindGamesUiTranslations.jsx
              └── imports mindGamesContentTranslations.jsx
              └── imports mindGamesHelpTranslations.jsx
```

---

## 14. Translation Files & Builders

### 14.1 Primary Translation File

**File:** `src/components/i18n/translations.jsx`

Exports `translations` object with all 7 language namespaces.  
Structure: `translations[langCode].translation = { ... }`

Currently contains inline entries for **English (`en`) and Hebrew (`he`)**.  
Spanish, French, German, Italian, Portuguese are in the translations object but have fewer inline entries — they rely on the i18n fallback to `en` for missing keys.

> **Important for Super Agent:** Any new UI strings or agent-related i18n keys must be added to all 7 languages in this file.

### 14.2 Per-Language JSON Files (legacy/reference)

| File | Status |
|------|--------|
| `src/components/i18n/translations/en.jsx` | Reference — en language entries |
| `src/components/i18n/translations/he.jsx` | Reference — he language entries |
| `src/components/i18n/translations/en.json` | JSON reference |
| `src/components/i18n/translations/he.json` | JSON reference |

### 14.3 Mind Games Translations (separate modules)

| File | Description |
|------|-------------|
| `src/components/i18n/mindGamesUiTranslations.jsx` | Mind games UI string translations |
| `src/components/i18n/mindGamesContentTranslations.jsx` | Mind games content translations |
| `src/components/i18n/mindGamesHelpTranslations.jsx` | Mind games help/tutorial translations |

These are merged into the main `translations` object at bootstrap by `translationsBuilder.jsx`.

---

## 15. Language Selector UI

**File:** `src/components/settings/LanguageSelector.jsx`

React component rendered in the Settings page.

Key behaviors:
- Renders a card grid with 7 language buttons
- On selection: calls `i18n.changeLanguage(code)` and saves to user profile via `base44.auth.updateMe`
- Shows current language with a check mark indicator
- RTL flag on Hebrew entry

Referenced from: `src/pages/Settings.jsx`

---

## 16. Agent Prompt Multilingual Sections

The CBT Therapist agent instructions (`base44/agents/cbt_therapist.jsonc`) include explicit multilingual content in these sections:

| Section | Languages covered |
|---------|------------------|
| **CP1 — Final Line Enforcement** (Refinement check question templates) | en, he, es, fr, de, it, pt |
| **CP2 — Hard-Banned Phrase Strip** | en, he, es, fr, de, it, pt |
| **Emergency resource outputs** | Per-locale verified crisis contacts via `emergencyResourceLayer.js` |

The `emergencyResourceLayer.js` `VERIFIED_EMERGENCY_RESOURCES` static map also covers all 7 locales with locale-specific crisis hotlines and resources.

The `cbt_therapist.jsonc` description field explicitly states:  
> *"multilingual parity across all enabled app languages"*

---

## 17. Test Files — Agent & Language

All test files are in `test/utils/`.

### 17.1 Agent Wiring Tests

| Test file | Coverage |
|-----------|----------|
| `agentWiring.test.js` | Basic wiring structure |
| `agentWiring.entityLists.test.js` | Entity list correctness |
| `agentWiring.contracts.test.js` | Wiring contract invariants |
| `agentWiringStep2.test.js` | Step 2 wiring |
| `agentWiringStep3.test.js` | Step 3 wiring |
| `agentWiringHybrid.test.js` | Hybrid wiring |
| `agentWiringV1Final.test.js` | V1 final config |
| `activeAgentWiring.test.js` | Active wiring routing |
| `validateAgentPolicy.test.js` | Agent policy validation |
| `validateAgentEntityAccess.test.js` | Entity access validation |

### 17.2 Therapist Upgrade Phase Tests

| Test file | Phase |
|-----------|-------|
| `therapistUpgradeBaseline.test.js` | Baseline / pre-upgrade |
| `therapistUpgrade01.test.js` | Phase 0.1 routing |
| `therapistMemoryPhase1.test.js` | Phase 1 memory |
| `therapistSummarizationPhase2.test.js` | Phase 2 summarization |
| `therapistSummarizationPhase21.test.js` | Phase 2.1 real invocation |
| `therapistWorkflowPhase3.test.js` | Phase 3 workflow engine |
| `therapistWorkflowPhase31.test.js` | Phase 3.1 context injection |
| `therapistExternalKnowledgePhase4.test.js` | Phase 4 external knowledge |
| `therapistExternalKnowledgePhase41.test.js` | Phase 4.1 storage |
| `therapistExternalKnowledgePhase42.test.js` | Phase 4.2 persistence |
| `therapistRetrievalPhase5.test.js` | Phase 5 retrieval orchestration |
| `therapistRetrievalPhase51.test.js` | Phase 5.1 real executor |
| `therapistRetrievalPhase6.test.js` | Phase 6 live retrieval |
| `therapistSafetyPhase7.test.js` | Phase 7 safety mode |
| `therapistSafetyPhase71.test.js` | Phase 7.1 runtime evaluator |
| `therapistUpgradePhase8.test.js` | Phase 8 UI components |
| `therapistUpgradePhase9.test.js` | Phase 9 regression/rollback (205 tests) |

### 17.3 Safety & Sanitization Tests

| Test file | Coverage |
|-----------|----------|
| `crisisDetector.test.js` | Crisis detection |
| `crisisDetector.normalization.test.js` | Input normalization |
| `postLlmSafetyFilter.test.js` | LLM safety filter |
| `postLlmSafetyFilter.edgecases.test.js` | Edge cases |
| `sanitizeAgentOutput.test.js` | Output sanitization |
| `sanitizeConversation.test.js` | Conversation sanitization |
| `validateAgentOutputSanitizer.test.js` | Output sanitizer validation |
| `sanitization.neverEmptyInvariant.test.js` | Never-empty invariant |
| `messageContentSanitizer.test.js` | Message sanitization |

### 17.4 i18n & Language Tests

| Test file | Coverage |
|-----------|----------|
| `translations.test.js` | All 7 languages present; core sidebar keys |
| `i18n.keysComplete.test.js` | Key completeness validation |

### 17.5 Feature Flags & Staging Tests

| Test file | Coverage |
|-----------|----------|
| `stage2RuntimeOverride.test.js` | URL-based staging override |
| `stage2Diagnostics.test.js` | Diagnostic payload |
| `stage2StagingBlockerFix.test.js` | Staging host recognition |

### 17.6 Knowledge Pipeline Tests

| Test file | Coverage |
|-----------|----------|
| `knowledgePipeline.allowList.test.js` | Allowlist validation |
| `knowledgePipeline.buildDocument.test.js` | Document building |
| `knowledgePipeline.chunkDocument.test.js` | Document chunking |
| `knowledgePipeline.retrievalShape.test.js` | Retrieval result shape |
| `knowledgePipeline.retrievalRegression.test.js` | Retrieval regression |
| `knowledgePipeline.privateEntityExclusion.test.js` | Private entity exclusion |

---

## 18. Policy & Architecture Documents

All under `docs/`:

| File | Description |
|------|-------------|
| `ai-agent-access-policy.md` | Complete agent entity access policy table (source of truth) |
| `ai-agent-enforcement-spec.md` | Enforcement rules §A–§F |
| `ai-agent-hybrid-model.md` | Hybrid wiring model design |
| `ai-agent-content-mapping.md` | Content entity mapping |
| `ai-agent-decision-matrix.md` | Decision matrix for entity access |
| `ai-agent-policy-validator-checks.md` | Policy validator checklist |
| `ai-entity-classification.md` | Entity classification (preferred/allowed/restricted/prohibited/private) |
| `data-model.md` | Full Base44 data model reference |
| `therapist-upgrade-stage2-plan.md` | Full Stage 2 upgrade plan (all 10 phases) |
| `repository-architecture-map.md` | Repository structure and architecture overview |
| `copilot-safety-rules.md` | Copilot safety rules (governs all AI-assisted changes) |
| `safety-filter-review-checklist.md` | Safety filter review checklist |
| `private-entity-data-flow-audit.md` | Private entity data flow audit |

---

## 19. Dependency Map for Super Agent Tasks

This section maps the files that must be touched (additively, never mutated) for each subsequent Super Agent PR.

### Task 2 — Super CBT Agent Skeleton

New files to create (additive only):

| New file | Type | Purpose |
|----------|------|---------|
| `src/lib/superCbtAgent.js` | Module | SuperCbtAgent class/composer |
| `src/api/superCbtAgentWiring.js` | Config | Additive wiring config for SuperCbtAgent |
| `docs/super-agent/README.md` | Docs | Architecture and activation guide |

Existing files to **read only** (do not modify):
- `src/api/agentWiring.js` — pattern reference for wiring structure
- `src/api/activeAgentWiring.js` — routing pattern reference
- `src/lib/featureFlags.js` — flag pattern reference

### Task 3 — Multilingual / i18n Preparation

Files to update (additive keys only):
- `src/components/i18n/translations.jsx` — add new keys under all 7 language sections

New files to create:
- `docs/super-agent/i18n-keys.md` — inventory of new keys and their translations

Keys must be added to: `en`, `he`, `es`, `fr`, `de`, `it`, `pt` — no exceptions.

### Task 4 — Super Agent Logic & Language Integration

New files to create:
- `src/lib/superCbtAgentLogic.js` — CBT protocol logic, language-context selection
- `src/lib/superCbtAgentFeatureFlag.js` — new feature flag for Super CBT Agent

Existing files to **read only**:
- `src/lib/therapistWorkflowEngine.js` — workflow step pattern reference
- `src/lib/workflowContextInjector.js` — injection pattern reference
- `src/lib/emergencyResourceLayer.js` — locale-sensitive resource pattern reference

### Task 5 — E2E Tests & Safety Validation

New test files to create:
- `test/utils/superCbtAgent.test.js` — unit/integration tests
- `tests/e2e/superCbtAgent.spec.js` — Playwright E2E tests (English + Hebrew minimum)

Existing tests must continue to pass:
- All 50+ test files listed in Section 17 must remain green

### Task 6 — Documentation

Files to create/update (additive only):
- `docs/super-agent/README.md` — main documentation
- `docs/super-agent/activation-guide.md` — step-by-step activation guide
- `docs/super-agent/language-coverage.md` — language support matrix

Files to read for reference (do not modify):
- `docs/ai-agent-access-policy.md`
- `docs/ai-agent-enforcement-spec.md`
- `docs/therapist-upgrade-stage2-plan.md`

---

## Appendix A — Private Entities (Never Index or Expose)

The following entities must never be added to shared retrieval pipelines or cross-user queries:

- `ThoughtJournal`
- `Conversation`
- `CaseFormulation`
- `MoodEntry`
- `CompanionMemory`
- `UserDeletedConversations`

---

## Appendix B — Prohibited Entities (Per Agent)

**CBT Therapist prohibited:** `Subscription`, `UserDeletedConversations`, `AppNotification`, `MindGameActivity`

**AI Companion prohibited:** `ThoughtJournal`, `CoachingSession`, `CaseFormulation`, `Subscription`, `UserDeletedConversations`, `AppNotification`, `MindGameActivity`

---

*Last updated: 2026-04-08. Generated from a full repository scan — no code or configuration was modified.*
