# Therapist Upgrade — Base44 Stage 2 Final Technical Spec
## Execution-Ready Implementation Plan

> **Status:** Planning only — no code, schema, agent, or behavior changes made in this document.
> **Source of Truth:** Base44 Stage 2 Final Technical Spec (therapist upgrade scope only).
> **What This Is:** A clean, phased, PR-sized, dependency-ordered implementation plan for execution.
> **What This Is Not:** Implementation. No files changed. No behavior altered. No scope expanded.
> **Governed By:** `.github/copilot-instructions.md`, `docs/copilot-safety-rules.md`, `docs/ai-agent-access-policy.md`, `docs/ai-agent-enforcement-spec.md`
> **Last updated:** 2026-03-19

---

## Table of Contents

1. [Section 1 — Epic Summary](#section-1--epic-summary)
2. [Section 2 — Phase Breakdown](#section-2--phase-breakdown)
3. [Section 3 — PR-Sized Tasks](#section-3--pr-sized-tasks)
4. [Section 4 — Dependency Order](#section-4--dependency-order)
5. [Section 5 — High-Risk Areas](#section-5--high-risk-areas)
6. [Section 6 — File / Surface Map](#section-6--file--surface-map)
7. [Section 7 — Implementation Guardrails for All Future PRs](#section-7--implementation-guardrails-for-all-future-prs)
8. [Section 8 — Ready-for-Implementation Verdict](#section-8--ready-for-implementation-verdict)

---

## Section 1 — Epic Summary

### Epic Title
**CBT Therapist Upgrade — Structured Memory, Workflow Engine, Trusted Knowledge, and Safety Mode (Base44 Stage 2)**

### Epic Goal
Upgrade the existing CBT Therapist agent with structured session memory, end-of-session summarization, a lightweight workflow engine, external trusted knowledge ingestion, internal-first retrieval orchestration, a live retrieval allowlist wrapper, a dedicated safety mode, and a locale-sensitive emergency resource layer — all behind feature flags, all additive, and all reversible — without replacing or touching the current default therapist path.

### Business / Clinical Purpose
The current therapist agent (Hybrid wiring) is stable and active. Stage 2 enhances it with capabilities that make sessions more coherent, memory-aware, and clinically grounded:

- **Structured memory** prevents session drift by persisting and retrieving relevant facts across sessions.
- **Session summarization** preserves therapeutic continuity without requiring the agent to re-read full conversation history.
- **Workflow engine** keeps the therapist on-arc within a structured session flow (check-in → agenda → CBT work → close).
- **Trusted knowledge** grounds the therapist in verified CBT content rather than unvetted model generation.
- **Internal-first retrieval** ensures the therapist prefers indexed structured content over raw LLM recall.
- **Live retrieval allowlist** prevents any entity outside the approved set from reaching the agent at runtime.
- **Safety mode** provides a safe, reduced-capability fallback when crisis signals or confidence failures occur.
- **Emergency resource layer** ensures locale-appropriate crisis resources are surfaced regardless of agent state.

### Non-Goals
The following are explicitly out of scope for this epic:

- Replacing the current default therapist path.
- Changing the AI Companion agent.
- Modifying any existing UI routes, navigation, or page layout.
- Changing auth, billing, or subscription behavior.
- Removing or weakening existing safety filters, crisis detection, or sanitization.
- Indexing or retrieving private user entities (ThoughtJournal, Conversation, CaseFormulation, MoodEntry, CompanionMemory, UserDeletedConversations) at a shared or cross-user level.
- Adding agent tools not required by the Stage 2 spec.
- Redesigning any component, page, or layout.
- Expanding agent entity access beyond what the existing `docs/ai-agent-access-policy.md` already allows.

### Safety Constraints
1. The current default therapist path (`CBT_THERAPIST_WIRING_HYBRID`) must remain the active default until every Phase 7 safety gate has passed.
2. Every upgraded behavior must live behind a dedicated named feature flag before it is reachable.
3. No safety filter, sanitization function, crisis detector, or risk panel may be modified or weakened.
4. The live retrieval allowlist must be enforced at the technical layer, not by prompt instruction alone.
5. Safety mode must be fail-closed: any uncertainty defaults to the restricted safe path.
6. Emergency resource layer must fire independently of agent state — it must not depend on the LLM.
7. No private user entity may appear in any shared indexing or retrieval pipeline.

### Rollback Principle
Every phase must be independently reversible by toggling a feature flag or deleting a new function — without touching any existing code, schema, or wiring. No phase may alter any currently-live path such that removal of the new code breaks existing behavior.

### Default-Path Preservation Principle
The existing `CBT_THERAPIST_WIRING_HYBRID` configuration and its associated default session flow are the production baseline. All new behavior is additive — it augments the existing path for users in the feature-flagged cohort only. Users not in the flag cohort must receive exactly the same experience as today.

---

## Section 2 — Phase Breakdown

---

### Phase 0 — Upgrade Gate and Safety Baseline

**Goal:** Establish the feature-flag infrastructure and confirm the current safety baseline before any upgrade work begins.

**Why it exists:** All subsequent phases depend on a reliable feature flag mechanism. Verifying the current safety baseline first ensures that no existing safety behavior has drifted and that there is a clean, documented starting state for regression testing.

**What must remain untouched:**
- All existing agent wiring files (`src/api/agentWiring.js`, `src/api/activeAgentWiring.js`)
- All backend safety functions (`postLlmSafetyFilter.ts`, `sanitizeAgentOutput.ts`, `sanitizeConversation.ts`, `enhancedCrisisDetector.ts`)
- All existing test suites

**What is likely to change:**
- A new feature-flag config file or utility (e.g., `src/lib/featureFlags.js`) is created
- A new `THERAPIST_UPGRADE_ENABLED` flag (and per-phase sub-flags) is added and defaults to `false`
- A baseline safety regression test snapshot is created in `test/` and `functions/`

**Main risk:** If feature-flag infrastructure is implemented incorrectly, Phase 0 could introduce a flag evaluation path that silently enables unreleased behavior in production.

**Safety constraints:**
- All flags must default to `false` (upgrade disabled) unless explicitly set
- No flag evaluation may reach existing production code paths

**Exit criteria:**
- Feature-flag utility exists and is tested
- `THERAPIST_UPGRADE_ENABLED` defaults to `false` and is verified in CI
- A baseline safety snapshot test passes against the current default therapist path
- Zero regressions in all existing unit and E2E tests

---

### Phase 1 — Structured Therapist Memory Layer

**Goal:** Implement structured session memory storage and session-start retrieval so the therapist begins each session with relevant prior context.

**Why it exists:** The current therapist relies on a limited context window and session summaries. Structured memory enables coherent multi-session therapeutic arcs by persisting key structured facts (action items, identified patterns, session themes) to a dedicated memory store.

**What must remain untouched:**
- Existing `SessionSummary` entity access in the current wiring
- Existing `CompanionMemory` read-only behavior in the therapist wiring
- All current safety filters and sanitization logic

**What is likely to change:**
- A new backend function `writeTherapistMemory.ts` that stores structured memory entries at session end
- A new backend function `retrieveTherapistMemory.ts` that fetches relevant prior memory at session start
- New fields on an existing entity (e.g., `SessionSummary`) OR a new entity — **only if the Stage 2 spec explicitly requires it and approval is obtained**
- A new wiring config `CBT_THERAPIST_WIRING_STAGE2_V1` that wraps the hybrid config with memory retrieval at session start

**Main risk:** Memory retrieval at session start adds latency to the session initiation path. If memory retrieval fails, it must not block session start.

**Safety constraints:**
- Memory retrieval must be fail-open for session start (session starts even if memory retrieval fails)
- Memory write at session end must be non-blocking and must not prevent session close
- Private user entity data must never be written into shared memory stores

**Exit criteria:**
- `retrieveTherapistMemory.ts` retrieves relevant prior context for a test user
- `writeTherapistMemory.ts` persists structured memory entries correctly
- Session-start retrieval is behind `THERAPIST_UPGRADE_MEMORY_ENABLED` flag
- Latency budget measured and within acceptable threshold
- No regressions in existing session-start behavior for non-flagged users

---

### Phase 2 — Session-End Structured Summarization

**Goal:** At the end of each session, generate a structured summary (themes, action items, mood arc, risk signals) and persist it for future retrieval by Phase 1 memory.

**Why it exists:** Unstructured session transcript recall is expensive and unreliable. Structured summarization at session-end provides a compact, retrievable record that feeds both Phase 1 memory and therapist continuity in future sessions.

**What must remain untouched:**
- All existing `SessionSummary` reads in the current wiring
- All existing session-close and conversation-end logic
- All sanitization and safety filters that apply to session output

**What is likely to change:**
- A new backend function `generateSessionSummary.ts` that invokes a structured summarization pipeline at session end
- A new trigger or automation that calls `generateSessionSummary.ts` when a `CoachingSession` closes
- Integration with Phase 1 memory write — the structured summary becomes Phase 1 input

**Main risk:** The summarization pipeline is LLM-assisted. If the LLM returns a malformed or unsafe summary, it must be caught before persisting. The existing `postLlmSafetyFilter.ts` must be applied to all summarization output.

**Safety constraints:**
- `postLlmSafetyFilter.ts` must be applied to all session summary content before persistence
- `sanitizeAgentOutput.ts` must be applied to any summary text before storage
- A session summary that fails safety filtering must be stored as a minimal safe stub (not fail the session close)

**Exit criteria:**
- `generateSessionSummary.ts` produces structured output for a complete test session
- Output passes all safety filter checks
- Summary persists to the appropriate entity
- Summarization is behind `THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` flag
- No regressions in session-close behavior for non-flagged users

---

### Phase 3 — Therapist Workflow Engine

**Goal:** Implement a lightweight session-phase engine that keeps the therapist on-arc: check-in → agenda-setting → CBT work → session-close, with appropriate transitions and phase-sensitive prompting.

**Why it exists:** Without structure, a multi-turn CBT session can drift from the therapeutic arc. The workflow engine provides guardrails for session phase transitions without replacing the LLM's conversational behavior.

**What must remain untouched:**
- Existing therapist prompt (current wiring is not altered as the default path)
- All current session initiation and close logic
- All existing entities and their access levels

**What is likely to change:**
- A new backend function `sessionPhaseEngine.ts` that tracks current phase and emits phase-transition signals
- Phase state stored in an existing entity field (e.g., on `CoachingSession`) or a new minimal field — **with explicit approval for any schema change**
- A new wiring config `CBT_THERAPIST_WIRING_STAGE2_V2` that extends V1 with phase-engine context injection
- A phase-sensitive prompt context injection mechanism that does not replace the existing system prompt

**Main risk:** Prompt injection for phase context must not conflict with or override existing clinical guardrails. Phase transitions must be signal-driven (never forced) to avoid jarring mid-conversation breaks.

**Safety constraints:**
- Phase engine must not override crisis detection or safety mode triggers
- Phase transitions must be advisory — they provide context to the agent but do not restrict its response
- No phase-only prompt claims about safety behavior (technical enforcement always takes precedence)

**Exit criteria:**
- `sessionPhaseEngine.ts` correctly tracks phases for a test session
- Phase context injection is additive and does not conflict with existing prompt structure
- Phase engine is behind `THERAPIST_UPGRADE_WORKFLOW_ENABLED` flag
- No regressions in existing session flow for non-flagged users
- Unit tests confirm all phase transitions

---

### Phase 4 — External Trusted Knowledge Ingestion

**Goal:** Ingest externally sourced, clinically approved content (e.g., CBT technique guides, psychoeducation materials in PDF or structured format) into the existing knowledge index so the therapist can ground responses in verified content.

**Why it exists:** The existing retrieval pipeline indexes structured content entities from the app (Exercise, Resource, AudioContent, Journey). Stage 2 adds a controlled ingestion pathway for external trusted materials so the therapist can reference authoritative CBT literature.

**What must remain untouched:**
- Existing indexing pipeline (`backfillKnowledgeIndex.ts`, `indexContentRecord.ts`, `upsertKnowledgeIndex.ts`)
- Existing entity schemas — new ingestion uses a dedicated content entity or an existing one such as `Resource`
- All existing access control rules

**What is likely to change:**
- A new backend function `ingestTrustedDocument.ts` that processes external documents (PDF or structured text) through the existing build → chunk → upsert pipeline
- A new allowlisted source-type field on the content entity used for external documents
- An admin-only ingestion trigger (not user-facing)
- An associated `TrustedSource` validation step that verifies document provenance before indexing

**Main risk:** PDF ingestion reliability. PDF parsing is fragile and can produce malformed chunks. Malformed chunks that pass the embedding step will pollute the knowledge index and degrade retrieval quality.

**Safety constraints:**
- External documents must pass provenance validation before indexing
- All ingested content must be scoped to the technical allowlist for the therapist — no content outside the allowed entity set can be ingested
- External content must never contain or expose PII
- Ingestion must be admin-gated, not user-accessible

**Exit criteria:**
- `ingestTrustedDocument.ts` correctly processes a sample approved document through the existing pipeline
- Ingested content is retrievable via `retrieveRelevantContent.ts`
- Ingestion is behind `THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED` flag
- Admin-only gate confirmed
- PDF parsing edge cases (empty, malformed, oversized) handled gracefully
- No changes to the existing indexing pipeline

---

### Phase 5 — Retrieval Orchestration

**Goal:** Implement an internal-first retrieval orchestrator that queries the indexed knowledge base before considering raw LLM generation, ensuring responses are grounded in structured content whenever possible.

**Why it exists:** The current agent retrieves from indexed entities at runtime. The orchestrator adds explicit prioritization — internal indexed knowledge is always consulted first; LLM generation is the fallback, not the primary source.

**What must remain untouched:**
- Existing `retrieveRelevantContent.ts` function
- Existing entity access rules and source-order in the wiring

**What is likely to change:**
- A new backend function `orchestrateRetrieval.ts` that wraps `retrieveRelevantContent.ts` with a priority layer: internal-first, then shared content, then LLM fallback
- A confidence threshold mechanism that determines when internal retrieval is sufficient vs. when LLM augmentation is warranted
- A retrieval-result metadata wrapper that tags responses with their provenance (indexed vs. generated)

**Main risk:** Retrieval confidence scoring that is poorly calibrated may over-suppress LLM generation (degrading user experience) or under-suppress it (defeating the internal-first goal). Calibration requires measurement, not guesswork.

**Safety constraints:**
- Orchestrator must not bypass the existing allowlist — it may only retrieve from approved entities
- LLM fallback must still pass all existing safety filters
- Retrieval failures must be non-blocking — if retrieval returns nothing, the agent falls back to LLM behavior with appropriate safety filters applied

**Exit criteria:**
- `orchestrateRetrieval.ts` correctly routes a test query through the priority hierarchy
- Internal content retrieval is preferred and measured
- Retrieval provenance metadata is logged
- Orchestrator is behind `THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED` flag
- No regressions in existing retrieval behavior for non-flagged users
- Unit tests confirm priority ordering and fallback behavior

---

### Phase 6 — Live Retrieval Wrapper + Allowlist Enforcement

**Goal:** Wrap the live retrieval path with a strict technical allowlist gate that enforces the approved entity set at the retrieval layer — not by prompt instruction alone.

**Why it exists:** Prompt-level allowlist claims are insufficient. A technical enforcement layer ensures that no entity outside the approved set for the CBT Therapist can be retrieved at runtime, regardless of what the LLM or orchestrator requests.

**What must remain untouched:**
- Existing `retrieveRelevantContent.ts` function (the wrapper wraps it; it does not replace it)
- All existing access policy rules in `docs/ai-agent-access-policy.md`
- All existing entity wiring configurations

**What is likely to change:**
- A new backend function `liveRetrievalWrapper.ts` that intercepts all retrieval requests for the upgraded therapist, checks the requested entity against the technical allowlist, and rejects or passes the request accordingly
- An allowlist configuration object (stored in config, not in prompt) that maps agent identity to permitted entity set
- A rejection handler that logs and returns an empty result (not an error) when an unauthorized entity is requested

**Main risk:** The allowlist is the single most important safety control in Stage 2. If it is implemented incorrectly (wrong entity names, wrong agent identity scoping, incomplete rejection handling), entities outside the approved set could reach the agent silently.

**Safety constraints:**
- The allowlist is enforced in code, not in prompt
- Allowlist configuration must be version-controlled and reviewed before activation
- Any rejection must be logged with sufficient context for audit
- Fail-closed: if the allowlist configuration cannot be loaded, all retrieval is rejected until configuration is confirmed

**Exit criteria:**
- `liveRetrievalWrapper.ts` blocks retrieval of any entity not in the approved set for the CBT Therapist
- Allowlist rejection is logged and verifiable
- Fail-closed behavior confirmed by test: wrapper with missing config blocks all retrieval
- Wrapper is behind `THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED` flag
- Security review of allowlist configuration before first activation
- Unit tests cover all allowlist edge cases (approved entity passes, unauthorized entity blocked, config-missing behavior)

---

### Phase 7 — Safety Mode + Emergency Resource Layer

**Goal:** Implement a dedicated safety mode that the therapist enters when crisis signals, confidence failures, or adversarial patterns are detected — and an independent locale-sensitive emergency resource layer that fires regardless of agent state.

**Why it exists:** The current crisis detection (`enhancedCrisisDetector.ts`) and safety filters (`postLlmSafetyFilter.ts`) apply at the output layer. Stage 2 adds a safety mode that constrains the agent's behavior before LLM generation — reducing the risk of a harmful response reaching the output layer in the first place.

**What must remain untouched:**
- All existing safety filters (`postLlmSafetyFilter.ts`, `sanitizeAgentOutput.ts`, `sanitizeConversation.ts`)
- All existing crisis detection logic (`enhancedCrisisDetector.ts`)
- All existing risk panel UI behavior

**What is likely to change:**
- A new backend function `therapistSafetyMode.ts` that defines the reduced-capability safe response set and the conditions that trigger safety mode entry
- Safety mode entry conditions: crisis signal detected by `enhancedCrisisDetector.ts`, low retrieval confidence in Phase 5, allowlist rejection in Phase 6, or explicit flag override
- A new backend function `emergencyResourceLayer.ts` that provides locale-sensitive crisis contacts and resources, triggered independently of the agent (not via LLM)
- Emergency resources stored in a new or existing entity (e.g., `Resource`) with a `resource_type: emergency` and `locale` field — **additive only, no schema modification to existing fields**

**Main risk:** The emergency resource layer must fire completely independently of agent state and LLM availability. If it depends on LLM output, it fails exactly when it is most needed. The locale detection must be reliable and have a sensible fallback locale (English international resources).

**Safety constraints:**
- Safety mode must be fail-closed: if mode determination fails, the agent defaults to safety mode, not normal mode
- Emergency resource layer must not depend on LLM output
- Emergency resources must be pre-stored, not generated
- Safety mode must not remove or bypass any existing safety filter — it adds a layer; it does not replace one
- Emergency resource locale detection must have a fallback

**Exit criteria:**
- `therapistSafetyMode.ts` correctly enters and exits safety mode based on all defined trigger conditions
- `emergencyResourceLayer.ts` returns correct locale-appropriate resources for at least 7 supported locales (en, he, es, fr, de, it, pt — matching existing i18n coverage)
- Emergency layer fires correctly when agent is in safety mode, including when LLM is unavailable
- Fail-closed behavior confirmed by test
- Safety mode and emergency layer are behind `THERAPIST_UPGRADE_SAFETY_MODE_ENABLED` flag
- No modification to existing safety filters
- Full golden-scenario safety test passes

---

### Phase 8 — Minimal UI Additions

**Goal:** Add the minimal additive UI elements required by the Stage 2 spec — only what is strictly necessary, and only behind the upgrade feature flag.

**Why it exists:** Some Stage 2 capabilities (e.g., safety mode indicator, session phase display, memory acknowledgment) require small UI changes. These are strictly additive and never alter existing UI routes, navigation, or layout.

**What must remain untouched:**
- All existing pages, routes, navigation, and layout
- All existing session UI components
- The `#app-scroll-container` scroll pattern (`overflow-x-clip`, `overflow-y-auto`, `height:100dvh`)

**What is likely to change:**
- A small optional indicator in the active session UI that shows current session phase (visible only when `THERAPIST_UPGRADE_WORKFLOW_ENABLED` is true)
- A safety mode UI state (reduced-capability indicator) visible only when the therapist is in safety mode
- New i18n keys in `src/components/i18n/translations.jsx` for all 7 languages (en, he, es, fr, de, it, pt) for any new UI strings
- No new routes, no new pages, no layout changes

**Main risk:** Any UI component that depends on new backend state (phase engine, safety mode) must handle loading and error states gracefully without crashing the existing session view.

**Safety constraints:**
- No new UI may bypass or replace the existing risk panel or crisis UI
- All new UI strings must be i18n-complete across all 7 supported languages
- No layout or scroll container changes

**Exit criteria:**
- New UI components render correctly in isolation tests
- i18n coverage for all new strings confirmed by running `test/utils/translations.test.js`
- New components are hidden when feature flag is disabled (non-flagged users see zero change)
- No regressions in existing session UI
- Viewport and scroll behavior unchanged (visual regression check)

---

### Phase 9 — Testing, Regression, Rollback Verification

**Goal:** Complete end-to-end testing of all Stage 2 phases, verify that all regression criteria pass, and confirm that rollback (flag disable) restores exactly the pre-Stage-2 behavior.

**Why it exists:** No phase should go to production without a full regression and rollback sweep. Phase 9 is the gate that must pass before any feature flag is enabled in production.

**What must remain untouched:**
- All existing passing tests — Phase 9 must not modify or remove any existing test

**What is likely to change:**
- New unit tests for all new backend functions (Phases 1–7)
- New golden scenarios in `functions/goldenScenarios.ts` for Stage 2 retrieval paths (additive only)
- New safety golden scenarios in `functions/safetyGoldenScenarios.ts` for safety mode and emergency layer (additive only)
- New Playwright E2E scenarios for Phase 8 UI additions
- A rollback test that confirms: disabling all Stage 2 flags produces output identical to the pre-upgrade baseline

**Main risk:** Rollback tests may be insufficient if the pre-upgrade baseline was not correctly snapshotted in Phase 0. Phase 9 depends on Phase 0 having produced a reliable baseline.

**Safety constraints:**
- No existing test may be removed, weakened, or skipped
- All new tests must be deterministic and non-flaky
- Safety golden scenarios must be run twice to confirm no flakiness before production enablement

**Exit criteria:**
- All existing unit tests (44+) continue to pass
- All new unit tests pass
- All new golden scenarios pass
- All E2E tests pass
- Rollback test confirms that disabling all Stage 2 flags produces behavior identical to Phase 0 baseline
- Safety test suite passes in full
- Performance/latency budget confirmed within thresholds
- Security review of allowlist configuration completed

---

## Section 3 — PR-Sized Tasks

---

### Phase 0 — Upgrade Gate and Safety Baseline

#### Task 0.1 — Feature Flag Infrastructure

| Field | Value |
|---|---|
| **Task title** | Create feature flag utility with all Stage 2 flags defaulting to false |
| **Phase** | 0 |
| **Goal** | Implement `src/lib/featureFlags.js` with a typed map of all Stage 2 feature flags, each defaulting to `false`. Include a `isUpgradeEnabled(flagName)` utility. |
| **Likely files / surfaces** | `src/lib/featureFlags.js` (new), `src/lib/app-params.js` (read-only reference for env pattern) |
| **Dependencies** | None |
| **Risk level** | LOW |
| **Feature-flagged** | N/A (this creates the flag system) |
| **Rollback-sensitive** | NO (adding a new utility with no existing callers) |
| **Done criteria** | `featureFlags.js` exists, all Stage 2 flags present, all default to `false`, unit test confirms flag evaluation, no existing code changed |

#### Task 0.2 — Safety Baseline Regression Snapshot

| Field | Value |
|---|---|
| **Task title** | Create Phase 0 baseline regression snapshot for current therapist behavior |
| **Phase** | 0 |
| **Goal** | Add a baseline test in `test/` that records the current default therapist wiring (entity set, source order, flag values) and asserts it is unchanged. This snapshot is the regression anchor for Phase 9. |
| **Likely files / surfaces** | `test/utils/therapistUpgradeBaseline.test.js` (new), `src/api/agentWiring.js` (read-only) |
| **Dependencies** | Task 0.1 |
| **Risk level** | LOW |
| **Feature-flagged** | NO |
| **Rollback-sensitive** | NO |
| **Done criteria** | Baseline test passes, documents current wiring exactly, all existing tests still pass |

---

### Phase 1 — Structured Therapist Memory Layer

#### Task 1.1 — Write Therapist Memory Function

| Field | Value |
|---|---|
| **Task title** | Implement `writeTherapistMemory.ts` backend function |
| **Phase** | 1 |
| **Goal** | Create a backend function that accepts structured session memory entries (themes, action items, risk signals) and persists them to the approved storage entity at session end. |
| **Likely files / surfaces** | `functions/writeTherapistMemory.ts` (new), relevant entity in `src/api/entities/` (read-only for schema reference) |
| **Dependencies** | Task 0.1 |
| **Risk level** | MEDIUM |
| **Feature-flagged** | YES — `THERAPIST_UPGRADE_MEMORY_ENABLED` |
| **Rollback-sensitive** | YES |
| **Done criteria** | Function persists structured memory, is gated by flag, unit test covers happy path and failure path (memory write failure is non-blocking), no schema changes without approval |

#### Task 1.2 — Retrieve Therapist Memory Function

| Field | Value |
|---|---|
| **Task title** | Implement `retrieveTherapistMemory.ts` backend function |
| **Phase** | 1 |
| **Goal** | Create a backend function that retrieves relevant prior memory entries for a user at session start, returns them as structured context for agent injection. Must be fail-open: session starts even if retrieval returns empty or errors. |
| **Likely files / surfaces** | `functions/retrieveTherapistMemory.ts` (new) |
| **Dependencies** | Task 1.1 |
| **Risk level** | MEDIUM |
| **Feature-flagged** | YES — `THERAPIST_UPGRADE_MEMORY_ENABLED` |
| **Rollback-sensitive** | YES |
| **Done criteria** | Function retrieves correct prior memory for test user, handles empty result gracefully, handles retrieval error without blocking session start, latency measured |

#### Task 1.3 — Stage 2 V1 Wiring Config

| Field | Value |
|---|---|
| **Task title** | Add `CBT_THERAPIST_WIRING_STAGE2_V1` to `agentWiring.js` |
| **Phase** | 1 |
| **Goal** | Add a new wiring config that extends the current HYBRID config with memory context injection at session start. This config is NOT yet the active config. |
| **Likely files / surfaces** | `src/api/agentWiring.js` (additive only — new export, no existing lines changed) |
| **Dependencies** | Tasks 1.1, 1.2 |
| **Risk level** | LOW |
| **Feature-flagged** | YES — active only when `THERAPIST_UPGRADE_MEMORY_ENABLED` is true |
| **Rollback-sensitive** | YES |
| **Done criteria** | New wiring config added as a new export, existing exports unchanged, wiring validation tests pass, new unit test for V1 config |

---

### Phase 2 — Session-End Structured Summarization

#### Task 2.1 — Generate Session Summary Function

| Field | Value |
|---|---|
| **Task title** | Implement `generateSessionSummary.ts` backend function |
| **Phase** | 2 |
| **Goal** | Create a backend function that takes a completed session and produces a structured summary (themes, action items, mood arc, risk signals). All output must pass `postLlmSafetyFilter.ts` and `sanitizeAgentOutput.ts` before persistence. |
| **Likely files / surfaces** | `functions/generateSessionSummary.ts` (new), `functions/postLlmSafetyFilter.ts` (read-only), `functions/sanitizeAgentOutput.ts` (read-only) |
| **Dependencies** | Task 0.1 |
| **Risk level** | HIGH |
| **Feature-flagged** | YES — `THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` |
| **Rollback-sensitive** | YES |
| **Done criteria** | Structured summary produced for test session, output passes safety filter, unsafe output stored as minimal safe stub, unit test covers safety filter failure path, no changes to existing safety functions |

#### Task 2.2 — Session-Close Summarization Trigger

| Field | Value |
|---|---|
| **Task title** | Wire summarization trigger to session-close event |
| **Phase** | 2 |
| **Goal** | Wire `generateSessionSummary.ts` to fire when a `CoachingSession` record closes. Must be non-blocking: session close succeeds even if summarization fails. |
| **Likely files / surfaces** | Existing session-close automation or new Base44 trigger (backend only), no frontend changes |
| **Dependencies** | Task 2.1 |
| **Risk level** | MEDIUM |
| **Feature-flagged** | YES — `THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` |
| **Rollback-sensitive** | YES |
| **Done criteria** | Summarization fires on session close, session close is non-blocking, trigger confirmed in staging test |

---

### Phase 3 — Therapist Workflow Engine

#### Task 3.1 — Session Phase Engine Function

| Field | Value |
|---|---|
| **Task title** | Implement `sessionPhaseEngine.ts` backend function |
| **Phase** | 3 |
| **Goal** | Create a backend function that tracks the current phase of a session (check-in, agenda, CBT work, close) and emits phase-transition signals. Phases are advisory — they do not constrain agent responses. |
| **Likely files / surfaces** | `functions/sessionPhaseEngine.ts` (new) |
| **Dependencies** | Task 0.1 |
| **Risk level** | MEDIUM |
| **Feature-flagged** | YES — `THERAPIST_UPGRADE_WORKFLOW_ENABLED` |
| **Rollback-sensitive** | YES |
| **Done criteria** | Phase engine correctly tracks all 4 phases, phase transitions are deterministic, crisis detection can override any phase transition (phase engine defers to safety signals), unit tests cover all transitions |

#### Task 3.2 — Phase Context Injection in Stage 2 V2 Wiring

| Field | Value |
|---|---|
| **Task title** | Add `CBT_THERAPIST_WIRING_STAGE2_V2` with phase context injection |
| **Phase** | 3 |
| **Goal** | Add a new wiring config that extends V1 with phase-engine context injection. Injection is additive (appended context, not a replacement of any existing prompt section). |
| **Likely files / surfaces** | `src/api/agentWiring.js` (additive — new export only) |
| **Dependencies** | Tasks 1.3, 3.1 |
| **Risk level** | MEDIUM |
| **Feature-flagged** | YES — `THERAPIST_UPGRADE_WORKFLOW_ENABLED` |
| **Rollback-sensitive** | YES |
| **Done criteria** | V2 config adds phase context correctly, existing V1 and HYBRID configs unchanged, wiring validation tests pass |

---

### Phase 4 — External Trusted Knowledge Ingestion

#### Task 4.1 — Trusted Document Ingestor Function

| Field | Value |
|---|---|
| **Task title** | Implement `ingestTrustedDocument.ts` backend function |
| **Phase** | 4 |
| **Goal** | Create an admin-only backend function that accepts an external document (PDF or structured text), validates its provenance, and routes it through the existing build → chunk → upsert pipeline. |
| **Likely files / surfaces** | `functions/ingestTrustedDocument.ts` (new), `functions/indexContentRecord.ts` (read-only), `functions/buildContentDocument.ts` (read-only) |
| **Dependencies** | Task 0.1 |
| **Risk level** | HIGH |
| **Feature-flagged** | YES — `THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED` |
| **Rollback-sensitive** | YES |
| **Done criteria** | Sample approved document ingested successfully, content is retrievable, malformed PDF handled gracefully (error, no partial index), admin-only gate confirmed, no changes to existing indexing functions |

#### Task 4.2 — Provenance Validation Step

| Field | Value |
|---|---|
| **Task title** | Implement `validateTrustedSource.ts` provenance validation |
| **Phase** | 4 |
| **Goal** | Create a validation function that checks document source metadata (author, organization, approval flag) before ingestion is allowed. Reject documents that fail validation before they reach the indexing pipeline. |
| **Likely files / surfaces** | `functions/validateTrustedSource.ts` (new) |
| **Dependencies** | Task 4.1 |
| **Risk level** | MEDIUM |
| **Feature-flagged** | YES |
| **Rollback-sensitive** | NO |
| **Done criteria** | Validation correctly rejects documents without provenance metadata, approved documents pass, unit tests cover all rejection conditions |

---

### Phase 5 — Retrieval Orchestration

#### Task 5.1 — Retrieval Orchestrator Function

| Field | Value |
|---|---|
| **Task title** | Implement `orchestrateRetrieval.ts` internal-first retrieval orchestrator |
| **Phase** | 5 |
| **Goal** | Create a backend function that wraps `retrieveRelevantContent.ts` with a priority layer: internal indexed content first, shared content pool second, LLM fallback last. Retrieval failures are non-blocking. |
| **Likely files / surfaces** | `functions/orchestrateRetrieval.ts` (new), `functions/retrieveRelevantContent.ts` (read-only) |
| **Dependencies** | Task 0.1, Phase 4 complete |
| **Risk level** | MEDIUM |
| **Feature-flagged** | YES — `THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED` |
| **Rollback-sensitive** | YES |
| **Done criteria** | Orchestrator routes query through correct priority, empty retrieval falls back gracefully, provenance metadata logged, unit tests confirm priority order and fallback |

#### Task 5.2 — Retrieval Confidence Threshold Configuration

| Field | Value |
|---|---|
| **Task title** | Add retrieval confidence threshold configuration |
| **Phase** | 5 |
| **Goal** | Implement a configurable confidence threshold (not hardcoded) that determines when internal retrieval is sufficient. Threshold is stored in config, not in prompt. |
| **Likely files / surfaces** | `src/lib/featureFlags.js` (extend with threshold config), or a dedicated `src/lib/retrievalConfig.js` |
| **Dependencies** | Task 5.1 |
| **Risk level** | LOW |
| **Feature-flagged** | YES |
| **Rollback-sensitive** | NO |
| **Done criteria** | Threshold is configurable, default value is conservative (prefers internal content), unit test confirms behavior at threshold boundary |

---

### Phase 6 — Live Retrieval Wrapper + Allowlist Enforcement

#### Task 6.1 — Allowlist Configuration

| Field | Value |
|---|---|
| **Task title** | Define and version-control the technical allowlist configuration |
| **Phase** | 6 |
| **Goal** | Create a version-controlled allowlist config that maps agent identity to permitted entity set, following the existing `docs/ai-agent-access-policy.md`. Must be stored in config (not in prompt). |
| **Likely files / surfaces** | `src/lib/allowlistConfig.js` (new) or `functions/allowlistConfig.ts` (new) |
| **Dependencies** | Task 0.1 |
| **Risk level** | HIGH |
| **Feature-flagged** | YES — `THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED` |
| **Rollback-sensitive** | YES |
| **Done criteria** | Allowlist matches `docs/ai-agent-access-policy.md` exactly, security review completed before activation, config is version-controlled |

#### Task 6.2 — Live Retrieval Wrapper Function

| Field | Value |
|---|---|
| **Task title** | Implement `liveRetrievalWrapper.ts` allowlist enforcement function |
| **Phase** | 6 |
| **Goal** | Create a backend function that intercepts all retrieval requests for the upgraded therapist, checks against the technical allowlist, rejects unauthorized entities (returns empty, logs rejection), and passes authorized requests to `orchestrateRetrieval.ts`. Fail-closed: if config is unavailable, all retrieval is rejected. |
| **Likely files / surfaces** | `functions/liveRetrievalWrapper.ts` (new), `functions/orchestrateRetrieval.ts` (read-only from Phase 5) |
| **Dependencies** | Tasks 6.1, 5.1 |
| **Risk level** | HIGH |
| **Feature-flagged** | YES — `THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED` |
| **Rollback-sensitive** | YES |
| **Done criteria** | Authorized entities pass, unauthorized entities return empty + logged, config-missing defaults to all-rejected, unit tests cover all allowlist edge cases, security review completed |

---

### Phase 7 — Safety Mode + Emergency Resource Layer

#### Task 7.1 — Therapist Safety Mode Function

| Field | Value |
|---|---|
| **Task title** | Implement `therapistSafetyMode.ts` — safety mode logic |
| **Phase** | 7 |
| **Goal** | Create a backend function that defines safety mode entry/exit conditions and returns the appropriate reduced-capability response set when the therapist enters safety mode. Entry conditions: crisis signal, low retrieval confidence, allowlist rejection, flag override. Must not modify any existing safety filter. |
| **Likely files / surfaces** | `functions/therapistSafetyMode.ts` (new), `functions/enhancedCrisisDetector.ts` (read-only), `functions/postLlmSafetyFilter.ts` (read-only) |
| **Dependencies** | Tasks 6.2, 5.1 |
| **Risk level** | HIGH |
| **Feature-flagged** | YES — `THERAPIST_UPGRADE_SAFETY_MODE_ENABLED` |
| **Rollback-sensitive** | YES |
| **Done criteria** | All 4 entry conditions trigger safety mode correctly, fail-closed confirmed (mode determination failure → safety mode), no existing safety filter modified, unit tests cover all entry conditions and fail-closed path |

#### Task 7.2 — Emergency Resource Layer Function

| Field | Value |
|---|---|
| **Task title** | Implement `emergencyResourceLayer.ts` — locale-sensitive emergency resources |
| **Phase** | 7 |
| **Goal** | Create a backend function that returns pre-stored locale-appropriate crisis contacts and resources. Resources are pre-stored (not LLM-generated). Locale detection has a fallback (English international). Function must be callable independently of agent state and LLM availability. Covers all 7 app locales: en, he, es, fr, de, it, pt. |
| **Likely files / surfaces** | `functions/emergencyResourceLayer.ts` (new), `Resource` entity or a new static config for pre-stored resources |
| **Dependencies** | Task 7.1 |
| **Risk level** | HIGH |
| **Feature-flagged** | YES — `THERAPIST_UPGRADE_SAFETY_MODE_ENABLED` |
| **Rollback-sensitive** | YES |
| **Done criteria** | Correct resources returned for all 7 locales, fallback to en-international confirmed, function works when LLM is unavailable (no LLM dependency), pre-stored resources reviewed and approved |

#### Task 7.3 — Safety Golden Scenario Tests

| Field | Value |
|---|---|
| **Task title** | Add Stage 2 safety golden scenarios to `safetyGoldenScenarios.ts` |
| **Phase** | 7 |
| **Goal** | Add golden test scenarios (additive only) covering: safety mode entry via crisis signal, safety mode entry via allowlist rejection, emergency resource layer in each locale, fail-closed behavior. |
| **Likely files / surfaces** | `functions/safetyGoldenScenarios.ts` (additive), `functions/goldenScenarios.ts` (additive) |
| **Dependencies** | Tasks 7.1, 7.2 |
| **Risk level** | LOW |
| **Feature-flagged** | NO (tests always run) |
| **Rollback-sensitive** | NO |
| **Done criteria** | All new golden scenarios pass, no existing scenarios modified, scenarios run twice to confirm non-flakiness |

---

### Phase 8 — Minimal UI Additions

#### Task 8.1 — Session Phase Indicator Component

| Field | Value |
|---|---|
| **Task title** | Add minimal session phase indicator UI component (flag-gated) |
| **Phase** | 8 |
| **Goal** | Create a small, optional UI component that shows the current session phase when `THERAPIST_UPGRADE_WORKFLOW_ENABLED` is true. Component must be hidden (null render) when flag is false. Must not alter any existing session UI layout. |
| **Likely files / surfaces** | `src/components/therapy/SessionPhaseIndicator.jsx` (new), existing session view (read-only except for flag-gated injection point) |
| **Dependencies** | Task 3.1 (phase engine) |
| **Risk level** | LOW |
| **Feature-flagged** | YES |
| **Rollback-sensitive** | NO |
| **Done criteria** | Component renders correctly when enabled, renders nothing when disabled, no layout impact, i18n strings added for all 7 languages |

#### Task 8.2 — Safety Mode UI Indicator

| Field | Value |
|---|---|
| **Task title** | Add safety mode UI indicator (flag-gated) |
| **Phase** | 8 |
| **Goal** | Create a small UI indicator that appears when the therapist is in safety mode. Must not replace or overlap the existing risk panel or crisis UI. Hidden when flag is false. |
| **Likely files / surfaces** | `src/components/therapy/SafetyModeIndicator.jsx` (new), existing session view (read-only except for flag-gated injection point) |
| **Dependencies** | Task 7.1 (safety mode) |
| **Risk level** | MEDIUM |
| **Feature-flagged** | YES |
| **Rollback-sensitive** | NO |
| **Done criteria** | Indicator appears only in safety mode and only when flag is true, does not interfere with existing risk panel, i18n-complete for 7 languages |

#### Task 8.3 — i18n Keys for All Stage 2 UI Strings

| Field | Value |
|---|---|
| **Task title** | Add all new Stage 2 UI strings to translations.jsx in all 7 languages |
| **Phase** | 8 |
| **Goal** | Add all new i18n keys required by Tasks 8.1 and 8.2 to `src/components/i18n/translations.jsx`. All 7 languages must be populated. |
| **Likely files / surfaces** | `src/components/i18n/translations.jsx` (additive), `test/utils/translations.test.js` (run to verify) |
| **Dependencies** | Tasks 8.1, 8.2 |
| **Risk level** | LOW |
| **Feature-flagged** | NO |
| **Rollback-sensitive** | NO |
| **Done criteria** | All 7 language sections updated, `npm test` (translations test) passes, no existing keys modified |

---

### Phase 9 — Testing, Regression, Rollback Verification

#### Task 9.1 — Unit Tests for All New Backend Functions

| Field | Value |
|---|---|
| **Task title** | Write unit tests for all new backend functions (Phases 1–7) |
| **Phase** | 9 |
| **Goal** | Ensure every new function introduced in Phases 1–7 has a corresponding unit test covering happy path, error/failure path, and fail-closed behavior where applicable. |
| **Likely files / surfaces** | New test files in `test/utils/` for each new function |
| **Dependencies** | Phases 1–7 complete |
| **Risk level** | LOW |
| **Feature-flagged** | NO |
| **Rollback-sensitive** | NO |
| **Done criteria** | All new functions have unit tests, all 44+ existing tests continue to pass, coverage report shows no uncovered new code paths |

#### Task 9.2 — E2E Tests for Stage 2 UI Additions

| Field | Value |
|---|---|
| **Task title** | Add Playwright E2E tests for Phase 8 UI components |
| **Phase** | 9 |
| **Goal** | Add E2E test scenarios covering: phase indicator visible when flag enabled, phase indicator hidden when flag disabled, safety mode indicator visible during safety mode, safety mode indicator hidden when flag disabled. |
| **Likely files / surfaces** | `tests/e2e/therapistUpgrade.spec.ts` (new) |
| **Dependencies** | Phase 8 complete |
| **Risk level** | LOW |
| **Feature-flagged** | NO |
| **Rollback-sensitive** | NO |
| **Done criteria** | All new E2E tests pass, no existing E2E tests broken |

#### Task 9.3 — Rollback Verification Test

| Field | Value |
|---|---|
| **Task title** | Implement and run rollback verification test |
| **Phase** | 9 |
| **Goal** | Confirm that disabling all Stage 2 feature flags (`THERAPIST_UPGRADE_ENABLED: false`) produces output that is identical to the Phase 0 baseline snapshot. This is the final gate before any flag is enabled in production. |
| **Likely files / surfaces** | `test/utils/therapistUpgradeBaseline.test.js` (extends Task 0.2), all existing agent wiring tests |
| **Dependencies** | Tasks 0.2, 9.1, 9.2 |
| **Risk level** | LOW |
| **Feature-flagged** | NO |
| **Rollback-sensitive** | NO |
| **Done criteria** | With all Stage 2 flags false, output matches Phase 0 snapshot exactly, all 44+ existing tests pass, E2E tests pass |

---

## Section 4 — Dependency Order

### Strict Sequential Dependencies (blocking)

```
Task 0.1 (Feature Flags) → ALL other tasks depend on this
Task 0.2 (Baseline Snapshot) → Task 9.3 (Rollback Verification)

Phase 1 depends on: Task 0.1
  Task 1.1 (writeTherapistMemory) → Task 1.2 (retrieveTherapistMemory) → Task 1.3 (V1 Wiring)

Phase 2 depends on: Task 0.1
  Task 2.1 (generateSessionSummary) → Task 2.2 (Session-Close Trigger)
  Task 2.2 → feeds into Task 1.1 (summarization output is memory input)

Phase 3 depends on: Phase 1 complete
  Task 3.1 (sessionPhaseEngine) → Task 3.2 (V2 Wiring)

Phase 4 depends on: Task 0.1
  Task 4.1 (ingestTrustedDocument) → Task 4.2 (validateTrustedSource)

Phase 5 depends on: Phase 4 complete
  Task 5.1 (orchestrateRetrieval) → Task 5.2 (Confidence Threshold)

Phase 6 depends on: Task 5.1
  Task 6.1 (Allowlist Config) → Task 6.2 (liveRetrievalWrapper)
  Task 6.2 depends on: Task 5.1

Phase 7 depends on: Tasks 6.2, 5.1
  Task 7.1 (therapistSafetyMode) → Task 7.2 (emergencyResourceLayer) → Task 7.3 (Safety Golden Scenarios)

Phase 8 depends on: Tasks 3.1, 7.1
  Task 8.1 → Task 8.2 → Task 8.3

Phase 9 depends on: ALL previous phases complete
  Task 9.1 → Task 9.2 → Task 9.3
```

### Parallelizable Tasks

The following groups can run in parallel once their shared prerequisite is met:

| Parallel Group | Tasks | Shared Prerequisite |
|---|---|---|
| **Group A** | Phase 1 + Phase 2 + Phase 4 | Task 0.1 |
| **Group B** | Phase 3 + Phase 4 | Phase 1 complete |
| **Group C** | Phase 5 + Phase 6 allowlist config | Phase 4 complete |
| **Group D** | Phase 8.1 + Phase 8.2 | Tasks 3.1 and 7.1 |
| **Group E** | Task 9.1 + Task 9.2 | All Phases 1–8 complete |

### Tasks That Must Wait for Verification

| Task | Must wait for |
|---|---|
| Task 6.2 (live retrieval wrapper active) | Security review of Task 6.1 allowlist config |
| Task 7.2 (emergency resources) | Pre-stored resource data reviewed and approved |
| Any production flag enablement | Task 9.3 (rollback verification) passes |

---

## Section 5 — High-Risk Areas

---

### 1. Live Retrieval Allowlist Enforcement (Phase 6)

**Why it is risky:**
The allowlist is the primary technical control preventing unauthorized entity access at runtime. If it is implemented incorrectly (wrong entity names, case mismatch, incomplete config coverage, misidentified agent context), entities outside the approved set could reach the therapist agent silently. Prompt-level claims are insufficient — this must be a code-level gate.

**What must be proven before rollout:**
- Unit tests confirm all approved entities pass and all unauthorized entities are blocked
- Config-missing behavior confirmed as fail-closed (all retrieval rejected, not all permitted)
- Security review of allowlist config object completed before flag is enabled
- Agent identity scoping confirmed: the wrapper identifies the correct agent before applying its allowlist
- Rejection logging confirmed and verifiable in audit trail

---

### 2. Fail-Closed Behavior (Phases 6, 7)

**Why it is risky:**
Two components must be fail-closed: the live retrieval wrapper (Phase 6) and safety mode (Phase 7). Fail-open defaults in either would allow bypassing safety controls silently — retrieval of unauthorized content (Phase 6) or bypassing reduced-capability protection (Phase 7). Fail-open is almost always the programming default; fail-closed requires deliberate implementation.

**What must be proven before rollout:**
- Phase 6: wrapper with config=null/missing returns empty results for all requests (not an error that falls through)
- Phase 7: mode determination that throws returns safety mode state (not normal mode)
- Both behaviors confirmed in dedicated unit tests that inject failure conditions
- No "catch and continue" error handling that silently permits unauthorized paths

---

### 3. Locale-Sensitive Emergency Resources (Phase 7)

**Why it is risky:**
Emergency resources must fire when a user is in crisis, which may be exactly when the LLM is unavailable, overloaded, or in an error state. If the emergency resource layer depends on LLM output (directly or indirectly), it fails exactly when it is most needed. Locale detection that fails must fall back to English international resources — not return empty.

**What must be proven before rollout:**
- Emergency resource function is purely deterministic — no LLM call in its execution path
- Resources for all 7 locales (en, he, es, fr, de, it, pt) are pre-stored and reviewed
- Locale fallback confirmed: unknown locale or locale detection failure → en-international resources (not empty)
- Function executes successfully when Base44 agent runtime is in error state (simulated in test)
- Resources reviewed for clinical accuracy by appropriate stakeholder before production

---

### 4. PDF Ingestion Reliability (Phase 4)

**Why it is risky:**
PDF parsing is inherently unreliable. PDFs produced by different tools have varying encoding, embedded fonts, image-only pages, and structural irregularities that produce garbage text or empty content when parsed programmatically. If malformed chunks are indexed, retrieval quality degrades silently — the knowledge base is polluted without obvious signal.

**What must be proven before rollout:**
- PDF parser produces clean text for a representative sample of approved source documents
- Empty-parse detection: if a PDF yields fewer than N characters, it is rejected before chunking
- Malformed chunk detection: chunks below minimum word count are discarded before embedding
- A quality-check step is inserted between parse and chunk: sample of parsed content is logged for human review before production ingestion
- Rollback path confirmed: if an ingested document degrades retrieval quality, it can be removed via `removeFromKnowledgeIndex.ts` without touching other indexed content

---

### 5. Therapist Workflow Engine Prompt Conflicts (Phase 3)

**Why it is risky:**
Phase context injection adds text to the agent's context window. If this injection conflicts with, duplicates, or contradicts the existing clinical prompt structure, it can degrade the therapist's coherence or cause it to misinterpret session state. The existing prompt is a carefully crafted clinical instrument — any injection must be additive and non-conflicting.

**What must be proven before rollout:**
- Phase context injection is clearly delimited (e.g., a clearly labeled section appended to context, not interleaved with existing prompt sections)
- A clinical review confirms that phase context does not override or contradict existing CBT technique guidance in the prompt
- If the phase engine produces a phase signal that conflicts with actual conversation state (e.g., signals "CBT work" when user is in crisis), safety mode overrides phase engine — confirmed in test
- A/B comparison of session quality with and without phase context injection on test users in staging before production

---

### 6. Regression Risk to Current Therapist Default Path (All Phases)

**Why it is risky:**
The current hybrid therapist wiring is the production default serving all users. Any Stage 2 code that introduces bugs in shared infrastructure (Base44 runtime, entity access layer, retrieval functions) could degrade the current default path even for users not in the Stage 2 flag cohort. This is the most broadly impactful failure mode.

**What must be proven before rollout:**
- All shared infrastructure changes (retrieval functions, session functions) are additive wrappers — the existing code path is not modified, only called from new code
- Phase 0 baseline regression test passes before any Stage 2 code is deployed
- Phase 9 rollback verification confirms that flag=false produces output identical to Phase 0 baseline
- No Stage 2 PR modifies any existing function file — only new files are created
- Every Stage 2 PR is reviewed with explicit attention to: "does this change any existing code path, even indirectly?"

---

## Section 6 — File / Surface Map

This map reflects the likely implementation surfaces only. Surfaces marked **[EXISTING — READ ONLY]** must not be modified by Stage 2 PRs. Surfaces marked **[NEW]** are additions. Surfaces marked **[ADDITIVE]** receive new exports or content only.

---

### Entities

| Entity | Stage 2 Usage | Surface Rule |
|---|---|---|
| `SessionSummary` | Memory anchor for Phase 1 retrieval | **[EXISTING — READ ONLY]** — no schema change without approval |
| `CoachingSession` | Phase 3 phase tracking anchor | **[EXISTING — READ ONLY]** — schema changes require explicit approval |
| `Resource` | Emergency resource pre-storage (Phase 7) | **[EXISTING — READ ONLY]** — additive new records only, no schema change |
| `CompanionMemory` | Read-only in current wiring — unchanged | **[EXISTING — READ ONLY]** |
| `ThoughtJournal`, `Goal`, `Exercise`, `AudioContent`, `Journey` | Unchanged therapist access | **[EXISTING — READ ONLY]** |
| *(New memory entity, if required by spec)* | Structured therapist memory (Phase 1) | **[NEW — requires explicit schema approval]** |

---

### Agents

| Agent Config | Stage 2 Usage | Surface Rule |
|---|---|---|
| `CBT_THERAPIST_WIRING_HYBRID` | Current default — unchanged | **[EXISTING — READ ONLY]** |
| `AI_COMPANION_WIRING_HYBRID` | Out of scope — unchanged | **[EXISTING — READ ONLY]** |
| `CBT_THERAPIST_WIRING_STAGE2_V1` | Phase 1 memory wiring | **[NEW — additive export in agentWiring.js]** |
| `CBT_THERAPIST_WIRING_STAGE2_V2` | Phase 3 workflow wiring | **[NEW — additive export in agentWiring.js]** |
| `src/api/activeAgentWiring.js` | Stage 2 flag-gated selection added | **[ADDITIVE — new flag-conditional branch only; existing branch unchanged]** |

---

### Backend Functions

| Function | Phase | Surface Rule |
|---|---|---|
| `writeTherapistMemory.ts` | 1 | **[NEW]** |
| `retrieveTherapistMemory.ts` | 1 | **[NEW]** |
| `generateSessionSummary.ts` | 2 | **[NEW]** |
| `sessionPhaseEngine.ts` | 3 | **[NEW]** |
| `ingestTrustedDocument.ts` | 4 | **[NEW]** |
| `validateTrustedSource.ts` | 4 | **[NEW]** |
| `orchestrateRetrieval.ts` | 5 | **[NEW]** |
| `liveRetrievalWrapper.ts` | 6 | **[NEW]** |
| `therapistSafetyMode.ts` | 7 | **[NEW]** |
| `emergencyResourceLayer.ts` | 7 | **[NEW]** |
| `postLlmSafetyFilter.ts` | All | **[EXISTING — READ ONLY]** |
| `sanitizeAgentOutput.ts` | All | **[EXISTING — READ ONLY]** |
| `sanitizeConversation.ts` | All | **[EXISTING — READ ONLY]** |
| `enhancedCrisisDetector.ts` | All | **[EXISTING — READ ONLY]** |
| `retrieveRelevantContent.ts` | 5, 6 | **[EXISTING — READ ONLY]** |
| `indexContentRecord.ts` | 4 | **[EXISTING — READ ONLY]** |
| `backfillKnowledgeIndex.ts` | 4 | **[EXISTING — READ ONLY]** |
| `goldenScenarios.ts` | 9 | **[ADDITIVE]** |
| `safetyGoldenScenarios.ts` | 9 | **[ADDITIVE]** |

---

### UI Components

| Component | Phase | Surface Rule |
|---|---|---|
| `src/components/therapy/SessionPhaseIndicator.jsx` | 8 | **[NEW]** |
| `src/components/therapy/SafetyModeIndicator.jsx` | 8 | **[NEW]** |
| `src/components/i18n/translations.jsx` | 8 | **[ADDITIVE — new keys only]** |
| All existing session UI components | N/A | **[EXISTING — READ ONLY]** |
| All existing pages, routes, navigation | N/A | **[EXISTING — READ ONLY]** |

---

### Tests

| File | Phase | Surface Rule |
|---|---|---|
| `test/utils/therapistUpgradeBaseline.test.js` | 0 | **[NEW]** |
| `test/utils/writeTherapistMemory.test.js` | 1 | **[NEW]** |
| `test/utils/retrieveTherapistMemory.test.js` | 1 | **[NEW]** |
| `test/utils/generateSessionSummary.test.js` | 2 | **[NEW]** |
| `test/utils/sessionPhaseEngine.test.js` | 3 | **[NEW]** |
| `test/utils/ingestTrustedDocument.test.js` | 4 | **[NEW]** |
| `test/utils/orchestrateRetrieval.test.js` | 5 | **[NEW]** |
| `test/utils/liveRetrievalWrapper.test.js` | 6 | **[NEW]** |
| `test/utils/therapistSafetyMode.test.js` | 7 | **[NEW]** |
| `test/utils/emergencyResourceLayer.test.js` | 7 | **[NEW]** |
| `tests/e2e/therapistUpgrade.spec.ts` | 9 | **[NEW]** |
| All existing test files | N/A | **[EXISTING — READ ONLY]** |

---

### Config / Flags

| File | Phase | Surface Rule |
|---|---|---|
| `src/lib/featureFlags.js` | 0 | **[NEW]** |
| `src/lib/allowlistConfig.js` | 6 | **[NEW]** |
| `src/lib/retrievalConfig.js` | 5 | **[NEW]** |
| `src/api/agentWiring.js` | 1, 3 | **[ADDITIVE — new exports only; existing exports unchanged]** |
| `src/api/activeAgentWiring.js` | All | **[ADDITIVE — new flag-conditional branch; existing default branch unchanged]** |

---

## Section 7 — Implementation Guardrails for All Future PRs

Every PR that implements any part of Stage 2 **must** comply with all of the following rules. These rules are non-negotiable. A PR that violates any one of these rules must not be merged.

---

### Rule 1 — Additive Only
Every change must be additive. New files, new exports, new entries. **Do not modify any existing function, entity schema, agent wiring export, test, or UI component that is not part of Stage 2.** Prefer extension over replacement. Prefer isolation over modification.

### Rule 2 — No Breaking Changes
No PR may change the behavior of any existing code path. Before merging, explicitly verify: does this change alter any currently-live execution path? If yes, the PR must be redesigned as an additive wrapper, not a modification.

### Rule 3 — Current Therapist Stays Default
`CBT_THERAPIST_WIRING_HYBRID` must remain the active default for all users who are not in the Stage 2 flag cohort. `activeAgentWiring.js` must not be changed to make any Stage 2 config the default without explicit approval after Phase 9 exit criteria are all met.

### Rule 4 — Feature Flag First
No Stage 2 behavior may be reachable in production without a feature flag check. Every new code path must begin with an explicit flag evaluation that defaults to the existing behavior when the flag is absent or false. Feature flags must be evaluated in code, not by prompt instruction.

### Rule 5 — Minimal Change Only
Each PR addresses exactly one task from Section 3. No PR may bundle multiple tasks unless they are trivially inseparable (e.g., a function and its immediate unit test). Prefer small, reviewable diffs.

### Rule 6 — Preserve Current Safety Stack
No PR may modify, weaken, remove, or bypass any of the following: `postLlmSafetyFilter.ts`, `sanitizeAgentOutput.ts`, `sanitizeConversation.ts`, `enhancedCrisisDetector.ts`, existing risk panel UI, existing crisis detection routing. Stage 2 adds layers on top — it never replaces or weakens any existing safety layer.

### Rule 7 — No Prompt-Only Allowlist Claims
Allowlist enforcement must be implemented in code (function-level gate), not claimed in a prompt or system instruction. A prompt can describe the allowlist for agent guidance, but it cannot be the enforcement mechanism. The technical gate (`liveRetrievalWrapper.ts`) must exist before any prompt-level description of restrictions is considered meaningful.

### Rule 8 — No Prompt-Only Safety Claims
Safety mode must be triggered by technical conditions (crisis detector output, retrieval confidence, flag state), not by prompt instruction alone. A prompt that says "if crisis, enter safe mode" is insufficient. The `therapistSafetyMode.ts` function must make the mode determination in code.

### Rule 9 — Internal Knowledge First
The retrieval orchestrator must always query indexed internal content before any LLM generation fallback. No PR may invert or bypass this priority without explicit approval. Verify: does the orchestrator always hit internal retrieval first? If it has a configuration that can skip internal retrieval, that configuration must default to off.

### Rule 10 — Rollback Must Stay Possible
At every stage, disabling all Stage 2 flags must restore exactly the pre-upgrade behavior. No PR may create a dependency where existing behavior depends on Stage 2 code being present. After merging each PR, confirm the rollback verification test still passes.

### Rule 11 — No Unrelated App Modifications
Stage 2 PRs must not touch any file outside the Stage 2 implementation surface defined in Section 6. If a PR touches an unrelated page, route, component, entity, or utility, the unrelated change must be extracted into a separate PR or removed.

### Rule 12 — Private User Entities Remain Private
No Stage 2 implementation may cause ThoughtJournal, Conversation, CaseFormulation, MoodEntry, CompanionMemory, or UserDeletedConversations to be indexed, retrieved, or exposed at a shared or cross-user level. Every PR that touches retrieval, indexing, or memory must be reviewed explicitly for this constraint.

---

## Section 8 — Ready-for-Implementation Verdict

| Criterion | Rating |
|---|---|
| **Planning completeness** | HIGH |
| **Safety planning quality** | HIGH |
| **Scope control quality** | HIGH |

**Biggest implementation blocker:**
The live retrieval allowlist enforcement (Phase 6) requires security review of the allowlist configuration before any Stage 2 behavior can be enabled in production. This review cannot be automated — it requires a qualified human reviewer to confirm that the allowlist matches the approved entity policy exactly. No production flag enablement should proceed until this review is complete and documented.

**First safe implementation phase:**
Phase 0 — specifically Task 0.1 (feature flag infrastructure). This is purely additive, has no effect on any existing behavior, and enables all subsequent phases to be built safely behind flags.

**Can implementation begin after this planning output:** ONLY WITH CONDITIONS

**Conditions:**
1. The Base44 Stage 2 Final Technical Spec must be read in full before implementation begins. This plan is derived from the problem statement's description of that spec, but the spec itself is the binding source of truth. Any inconsistency between this plan and the spec must be resolved in favor of the spec.
2. All implementation must start with Phase 0. No other phase may be started before Phase 0 exit criteria are fully met.
3. Every PR must be reviewed by a human reviewer who has read this plan and the guardrails in Section 7 before merge.
4. Any schema change (new entity or new field) not resolved in this plan must receive explicit written approval from the repository owner before implementation. This plan intentionally defers schema decisions where the spec does not clearly specify them.
5. The emergency resource content (Phase 7, Task 7.2) must be reviewed and approved by an appropriate clinical or content stakeholder before any resource data is added to the system.
6. No Stage 2 feature flag may be enabled in production until Phase 9 exit criteria are fully met and documented.
7. The security review of the allowlist configuration (Phase 6, Task 6.1) must be completed before `THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED` is set to true in any environment.

---

*This document is the execution-ready implementation plan for Base44 Stage 2 Therapist Upgrade.*
*No code was written, modified, or deleted in the creation of this document.*
*All existing application behavior is unchanged.*
*See `.github/copilot-instructions.md` for the master Copilot instruction set governing all future implementation work.*
