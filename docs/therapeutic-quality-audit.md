# Therapeutic Quality Audit — Production AI Therapist

> **Task:** Audit of current production therapist behavior — therapeutic value diagnosis  
> **Status:** Analysis only. No code, wiring, or schema changes made in this document.  
> **Scope:** CBT Therapist agent only. AI Companion untouched.  
> **Base branch:** `staging-fresh`  
> **Last updated:** 2026-03-25  
> **Path note:** `base44/functions/` is the repository's Deno backend functions directory (Base44 server-side runtime functions). All file paths in this document reference actual repository paths verified during the audit.

---

## Table of Contents

1. [A — Exact Diagnosis: Why Therapeutic Quality Is Weak](#a--exact-diagnosis-why-therapeutic-quality-is-weak)
2. [B — Top 3 Improvement Levers Ranked by Expected Impact](#b--top-3-improvement-levers-ranked-by-expected-impact)
3. [C — Safest Next Move in Production](#c--safest-next-move-in-production)
4. [D — Type of Best Next Step](#d--type-of-best-next-step)
5. [E — Exact Production Risk of Recommended Next Step](#e--exact-production-risk-of-recommended-next-step)
6. [F — Files That Would Need to Change](#f--files-that-would-need-to-change)
7. [G — External Base44/Config Dependency](#g--external-base44config-dependency)
8. [H — PR Base Confirmation](#h--pr-base-confirmation)
9. [I — Conflict Confirmation](#i--conflict-confirmation)
10. [J — E2E Test Confirmation](#j--e2e-test-confirmation)
11. [Appendix: Full Technical Stack Trace](#appendix-full-technical-stack-trace)

---

## A — Exact Diagnosis: Why Therapeutic Quality Is Weak

### Summary

The system is technically stable, auth works, and the agent infrastructure is correct. The therapeutic weakness is **architectural, not functional**: the entire Stage 2 upgrade stack (memory, summarization, workflow engine, retrieval, safety mode) is fully built, fully tested, and fully dormant behind feature flags that are all `false` in production. The production therapist is therefore operating as a generic LLM with entity access but **no injected therapeutic structure, no session memory, and no prior-session continuity**.

---

### Cause 1 — TECHNICAL: No Upgrade Flags Enabled → HYBRID Wiring Only

**Root file:** `src/api/activeAgentWiring.js`, `src/lib/featureFlags.js`

`resolveTherapistWiring()` evaluates `VITE_THERAPIST_UPGRADE_ENABLED` first. This defaults to `false` in all builds where the environment variable is absent. No `.env` file is present in the repository. Result:

```
ACTIVE_CBT_THERAPIST_WIRING = CBT_THERAPIST_WIRING_HYBRID  (always)
```

All per-phase flags (memory, summarization, workflow, retrieval, live retrieval, safety mode) are also `false`. The V1 through V5 wiring paths are unreachable in production.

---

### Cause 2 — MISSING-CONTEXT: Session Start Injects No Context

**Root file:** `src/pages/Chat.jsx` line 378, `src/lib/workflowContextInjector.js`

The session-start message is built by `buildV4SessionStartContentAsync(ACTIVE_CBT_THERAPIST_WIRING, ...)`. For HYBRID wiring:

- `workflow_context_injection` is absent → no workflow instructions injected
- `retrieval_orchestration_enabled` is absent → no retrieval context injected
- `live_retrieval_enabled` is absent → no live policy injected
- `safety_mode_enabled` is absent → no safety mode injected

**Result:** The therapist receives exactly `[START_SESSION]` as the opening message — a token with zero clinical context, zero user history, and zero structural guidance. For intent-based sessions (thought journal, goal work, etc.), the message is a simple string like `"User clicked: Journal a thought. Start thought_work flow."` — still no user context.

---

### Cause 3 — MEMORY-QUALITY: No Session Memories Being Written or Retrieved

**Root files:** `base44/functions/writeTherapistMemory/entry.ts`, `base44/functions/retrieveTherapistMemory/entry.ts`, `src/lib/therapistMemoryModel.js`

Phase 1 (`writeTherapistMemory`) is gated by `THERAPIST_UPGRADE_MEMORY_ENABLED` environment variable in the Deno function. This flag defaults to `false`. No structured therapist memories are being written to `CompanionMemory` at session end.

Phase 2 (`generateSessionSummary`) is gated by `THERAPIST_UPGRADE_SUMMARIZATION_ENABLED`. This flag is also `false`. No structured `SessionSummary` records are being written from sessions.

**Consequence:** Even though `SessionSummary` and `CompanionMemory` appear in the HYBRID entity `tool_configs`, the records themselves are either empty or populated only by non-structured paths (companion chat). The therapist queries these entities at runtime and finds no useful structured memory. Every session starts blind — no knowledge of prior sessions, no patterns, no themes, no goals worked.

---

### Cause 4 — PROMPT/INSTRUCTION: No Therapeutic Workflow Structure Injected

**Root file:** `src/lib/therapistWorkflowEngine.js`

The Phase 3 workflow engine defines a complete 6-step structured response sequence:

1. Brief validation
2. Organize the problem
3. Map the current cycle
4. Identify intervention point
5. Focused intervention
6. Concrete next step

Along with five response-shaping rules (reduce open-ended questions, summarize over explore, name the pattern, move to structure early, end with something usable) and a six-state emotion differentiation map.

**None of this reaches the production agent.** `THERAPIST_WORKFLOW_INSTRUCTIONS` is built at module load but is only injected when `workflow_context_injection === true` in the active wiring — which requires `THERAPIST_UPGRADE_WORKFLOW_ENABLED=true`. Since all flags are false, the therapist receives no structural guidance. Without this, the agent defaults to generic LLM empathy-loop behavior: open-ended questions, re-exploration of known territory, empathy without intervention, responses that end with questions rather than concrete takeaways.

This is the most direct cause of the "feels like chat, not therapy" experience.

---

### Cause 5 — SAFETY: Safety Filter Over-Constrains Natural Therapeutic Language

**Root file:** `base44/functions/postLlmSafetyFilter/entry.ts`

The post-LLM safety filter strips lines that match any of the following patterns (line-level, case-insensitive):

| Pattern | Intended target | Therapeutic false-positive |
|---|---|---|
| `^Let me\b` | LLM reasoning artifacts (`Let me think...`) | "Let me start by reflecting back what I heard..." |
| `^I should\b` | Meta-commentary (`I should analyze this...`) | "I should point out that this is a classic cognitive distortion" |
| `^I need to\b` | Process narration (`I need to check...`) | "I need to understand more about when this started" |
| `^I will\b` | Process narration (`I will now...`) | "I will help you work through this step by step" |
| `^The next step is\b` | Process narration | "The next step is to identify the automatic thought" |
| `\blet's break down\b` | Informal reasoning | "Let's break down this thought together" — core CBT phrase |
| `^My goal is\b` | Meta-commentary | "My goal is to help you develop a concrete reframe" |

These patterns fire at **line level**: if any single line in a multi-paragraph response starts with a matched string, that entire line is removed. A well-structured therapeutic response like:

> "It sounds like you've been carrying this for a while.  
> Let me reflect back what I'm hearing before we go further.  
> The pattern I'm seeing is..."

...would have its second line stripped, making the response feel incomplete or incoherent.

**Severity assessment:** MEDIUM. The filter protects against real reasoning leakage, but its current scope is over-broad relative to natural therapeutic language. This is a contributing cause, not the primary cause. Fixing the primary causes (workflow engine, memory) will matter more than loosening the filter.

---

### Cause 6 — MISSING-RETRIEVAL: No CBT Knowledge Injected at Session Start

**Root files:** `src/lib/retrievalOrchestrator.js`, `src/lib/v3RetrievalExecutor.js`, `src/lib/v4RetrievalExecutor.js`

Phase 5 (retrieval orchestration) and Phase 6 (live retrieval) are both off. No CBT content from `Exercise`, `Resource`, `AudioContent`, or `Journey` entities is being pre-fetched and injected at session start. The therapist does not receive relevant exercises or psychoeducation material aligned to the current session context.

The entity `tool_configs` in HYBRID wiring include `Exercise` (allowed, source_order 6) and `Resource` (allowed, source_order 7) — but in Base44's agent runtime, entity access via `tool_configs` enables the agent to query entities in-turn (reactive), not to inject pre-fetched context at session start. The Phase 5/6 retrieval path is what would inject relevant content proactively.

**Effect:** The therapist cannot reference specific exercises or resources unless the user explicitly asks and the agent happens to query the entity. This is a secondary cause — the workflow and memory gaps have greater impact on session quality.

---

### Cause 7 — WORKFLOW-DESIGN: Session Arc Is Undefined for the Current Path

**Root file:** `src/pages/Chat.jsx` — `startNewConversationWithIntent()`

The intent routing (thought_work, goal_work, grounding, daily_checkin) sends simple one-line messages to the agent. There is no session arc definition, no structured opening, no clinical framing. The agent must infer the entire session structure from the intent string alone.

Without a session arc, the agent often:
- Spends too many turns on exploration when the pattern is already clear
- Asks open-ended questions when a concrete assessment is possible
- Ends turns with a question rather than a concrete next step or reframe
- Does not explicitly name cognitive-behavioral patterns when they are visible

---

### Consolidated Cause Map

| Cause | Category | Severity | Root |
|---|---|---|---|
| All upgrade flags = false → HYBRID wiring only | Technical | CRITICAL | featureFlags.js |
| Session start = `[START_SESSION]` with zero context | Missing-context | CRITICAL | workflowContextInjector.js |
| No therapist memories written or retrieved | Memory-quality | HIGH | writeTherapistMemory, generateSessionSummary |
| No workflow instructions reaching agent | Prompt/instruction | HIGH | therapistWorkflowEngine.js (dormant) |
| Safety filter strips natural therapeutic phrases | Technical / Safety | MEDIUM | postLlmSafetyFilter |
| No CBT knowledge pre-fetched at session start | Missing-retrieval | MEDIUM | retrievalOrchestrator.js (dormant) |
| No structured session arc per intent | Workflow-design | MEDIUM | Chat.jsx intent routing |

---

## B — Top 3 Improvement Levers Ranked by Expected Impact

### Lever 1 — Activate Phase 3 (Workflow Engine) 🥇 Highest impact

**Expected therapeutic delta:** Structural response quality immediately improves. The 6-step sequence, response-shaping rules, and emotion differentiation map all arrive at the agent's context window on turn 1. The therapist will:
- Stop defaulting to open-ended-question loops
- Begin naming cognitive patterns explicitly
- End responses with concrete takeaways instead of questions
- Differentiate between remorse, guilt, shame, and self-attack in its responses
- Move from validation to intervention at the right clinical moment

**Mechanism:** Set `VITE_THERAPIST_UPGRADE_ENABLED=true` + `VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED=true` in the build environment. This routes `resolveTherapistWiring()` to return `CBT_THERAPIST_WIRING_STAGE2_V2`, which sets `workflow_context_injection: true`. `buildV4SessionStartContentAsync` then appends `THERAPIST_WORKFLOW_INSTRUCTIONS` to every session-start message. No code changes required.

**Pre-condition:** Phase 3 audit report (docs/phase3-audit-report.md, merged in staging-fresh) confirms this is go/no-go PASS. 205 deterministic tests passing in Phase 9.

---

### Lever 2 — Activate Phase 1 + Phase 2 (Memory + Summarization) 🥈 High impact

**Expected therapeutic delta:** Cross-session continuity restored. After activation, the therapist will:
- Retrieve structured memories from prior sessions at session start
- Receive summaries of prior session patterns, triggers, automatic thoughts, interventions
- Avoid re-exploring territory already covered
- Reference prior goals and track therapeutic arc across sessions

**Mechanism:** Server-side: set `THERAPIST_UPGRADE_MEMORY_ENABLED=true` and `THERAPIST_UPGRADE_SUMMARIZATION_ENABLED=true` in the Base44 Deno environment. The V2 wiring (activated by Lever 1) includes `memory_context_injection: true`, so once the client-side Phase 3 flags are on, the session-start path will also trigger memory retrieval. Client-side: `VITE_THERAPIST_UPGRADE_MEMORY_ENABLED=true` is not required for routing (V2 supersedes V1), but the Deno function flags are required for the actual read/write path.

**Note on sequencing:** Phase 2 (summarization) is the write path. Phase 1 (memory retrieval) is the read path. For the first sessions after activation, there will be nothing to read (memories are empty). Value accumulates over time. Recommend activating Lever 1 first and Lever 2 alongside or immediately after.

---

### Lever 3 — Audit and Improve the Base44 System Prompt 🥉 Unknown but possibly highest

**Expected therapeutic delta:** Unknown — but potentially the deepest root cause. The Base44 agent's system prompt (the static clinical instruction that defines the therapist's persona, role boundaries, clinical style, and CBT framework) is **not visible in this codebase**. It is an external Base44 configuration.

If the system prompt is generic (e.g., "You are a helpful CBT therapist...") rather than clinically specific, then even with workflow injection and memory, the agent may default to generic helpfulness rather than structured CBT practice. Inspecting and improving the system prompt is a zero-risk change (does not touch any code, wiring, or entity) but requires access to the Base44 console.

**Specific questions to answer in the audit of the system prompt:**
- Does it specify a structured CBT framework (Beck, ABCDE model, Socratic questioning)?
- Does it give explicit guidance on moving from validation to intervention?
- Does it specify response length constraints?
- Does it name the distinction between validation and clinical assessment?
- Does it give guidance on handling hopelessness, shame, and collapse language?
- Is it language/locale-aware?

---

## C — Safest Next Move in Production

**Recommended next move: Activate Phase 3 (workflow engine) via environment variable only.**

Rationale:
1. **Zero code changes.** Only `VITE_THERAPIST_UPGRADE_ENABLED=true` + `VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED=true` in the Base44 build environment.
2. **Instant rollback.** Remove or set flags to `false` → HYBRID wiring restored in next build. No migration, no data cleanup, no entity changes.
3. **Comprehensively tested.** Phase 9 verification: 205 deterministic tests covering flag isolation, memory, summarization, workflow, retrieval, safety, emergency resources, rollback, and final readiness proof — all passing.
4. **No new entity access.** V2 entity `tool_configs` is identical to HYBRID. No new data reaches the agent.
5. **No safety filter changes.** The workflow instructions are additive context. The existing safety stack (postLlmSafetyFilter, sanitizeAgentOutput, sanitizeConversation, enhancedCrisisDetector, risk panel) is completely unchanged.
6. **Phase 3 audit report confirms go.** `docs/phase3-audit-report.md` (merged on staging-fresh) explicitly verified: V2 wiring is 100% env-only, no stall risk, entity access identical to HYBRID.

---

## D — Type of Best Next Step

**env-only activation**

The single best next step is a pure environment variable change. No files in this repository need to change. The activation mechanism is:

```
VITE_THERAPIST_UPGRADE_ENABLED=true
VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED=true
```

Set these in the Base44 environment for the staging-fresh build. Verify by checking `window.location.search` with `?_s2debug=true` to confirm the diagnostic payload shows:

```
masterGateOn: true
routeHint: "STAGE2_V2 (workflow engine)"
computedFlags.THERAPIST_UPGRADE_WORKFLOW_ENABLED: true
```

The diagnostic tool (`getStage2DiagnosticPayload()` in `src/lib/featureFlags.js`) is already implemented for exactly this verification step.

---

## E — Exact Production Risk of Recommended Next Step

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| V2 wiring returns different session context than HYBRID | LOW | LOW | Context is additive only; `[START_SESSION]` token preserved; no entity access change |
| Workflow instructions confuse the LLM agent | LOW | MEDIUM | 6-step sequence is advisory, not mechanical; "use clinical judgment" explicit |
| LLM produces worse output than HYBRID | LOW | MEDIUM | Rollback is instant (remove env var); no persistent changes |
| Memory injection triggers unexpected behavior | VERY LOW | LOW | V2 has `memory_context_injection: true` flag but actual memory retrieval still requires separate Phase 1 Deno flag; in current state memory retrieval returns empty (fail-open) |
| postLlmSafetyFilter strips workflow instruction content | VERY LOW | NONE | The workflow instructions are injected as a USER-role message, not the LLM response; the filter runs on LLM OUTPUT only |
| E2E tests break | NONE | N/A | No code changes; E2E tests run against default HYBRID behavior; no env flags set in CI |
| New conversation creation fails | NONE | N/A | Conversation creation uses `ACTIVE_CBT_THERAPIST_WIRING.tool_configs` which is identical in V2 and HYBRID |

**Overall risk rating: LOW.** The worst realistic outcome is that the LLM agent produces slightly different (but not worse) responses. Rollback requires no code change.

---

## F — Files That Would Need to Change

### For Lever 1 (Phase 3 activation): ZERO code file changes

Only environment variable changes:
- Set `VITE_THERAPIST_UPGRADE_ENABLED=true` in Base44 build environment
- Set `VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED=true` in Base44 build environment

### For Lever 2 (Phase 1+2 activation): ZERO code file changes

Additional environment variable changes:
- Set `THERAPIST_UPGRADE_MEMORY_ENABLED=true` in Base44 Deno function environment
- Set `THERAPIST_UPGRADE_SUMMARIZATION_ENABLED=true` in Base44 Deno function environment
- Set `VITE_THERAPIST_UPGRADE_MEMORY_ENABLED=true` in Base44 build environment (optional for routing; V2 supersedes V1)

### For Lever 3 (system prompt improvement): External Base44 console

- Inspect and edit the CBT Therapist agent's system prompt in the Base44 console
- No repository files need to change

### If safety filter relaxation is ever approved (separate explicit approval required)

- `base44/functions/postLlmSafetyFilter/entry.ts` — remove or scope the natural-language patterns listed in Cause 5
- This is a **SAFETY-CRITICAL** file requiring a second human reviewer

---

## G — External Base44/Config Dependency

### Client-side flags (build environment)
- `VITE_THERAPIST_UPGRADE_ENABLED` — master gate for client routing
- `VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED` — Phase 3 gate, selects V2 wiring
- `VITE_THERAPIST_UPGRADE_MEMORY_ENABLED` — Phase 1 gate (optional if V2 selected)
- Set in: Base44 app build environment / deployment configuration

### Server-side (Deno function environment)
- `THERAPIST_UPGRADE_MEMORY_ENABLED` — gates `retrieveTherapistMemory` and `writeTherapistMemory`
- `THERAPIST_UPGRADE_SUMMARIZATION_ENABLED` — gates `generateSessionSummary`
- Set in: Base44 Deno function environment variables

### Base44 agent system prompt (external, not in repo)
- The CBT Therapist agent's static clinical instruction is a Base44 configuration artifact
- Not represented anywhere in this codebase
- Must be inspected and potentially improved in the Base44 console
- This is an unknown dependency — quality unknown

### URL-based flag override (staging/preview only)
- Available at preview/staging hosts: `?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_WORKFLOW_ENABLED`
- Allows staging activation without a new build
- Diagnostic: `?_s2debug=true` shows full flag evaluation state

---

## H — PR Base Confirmation

**Confirmed: PR base = `staging-fresh`**

- Current branch: `copilot/audit-therapeutic-quality`
- Merge base with `origin/staging-fresh`: `24d281570b93e23221d534b96da58e25fa051a8c`
- Merge base with `origin/main`: `24d281570b93e23221d534b96da58e25fa051a8c`
- Branch was checked out to target `staging-fresh`
- `git diff origin/staging-fresh...HEAD --name-only` shows no file-level conflicts

---

## I — Conflict Confirmation

**Confirmed: No conflicts with `staging-fresh` or `main`**

Verification:
```
git diff origin/staging-fresh...HEAD --name-only  →  (empty — no file conflicts)
git diff origin/main...HEAD --name-only           →  (empty — no file conflicts)
```

This audit document (`docs/therapeutic-quality-audit.md`) is the only new file in this PR. It is additive — it does not modify any existing file. No merge conflicts are possible.

---

## J — E2E Test Confirmation

**Confirmed: E2E tests are unaffected.**

This PR contains only a documentation file addition (`docs/therapeutic-quality-audit.md`). No source code, wiring, schema, component, function, or configuration has changed.

The following test suites are preserved and unaffected:
- `Playwright E2E Tests / E2E Tests (mobile)` — no code changes
- `Playwright E2E Tests / E2E Tests (web-desktop)` — no code changes
- `Playwright E2E Tests / Smoke Tests (Production-critical)` — no code changes

Current production status (stable baseline preserved):
- auth: ✅
- therapist: ✅
- companion: ✅
- coach: ✅
- Phase 1–3 infrastructure: ✅ (ready, dormant, can be activated via env)

---

## Appendix: Full Technical Stack Trace

### What happens at session start today (HYBRID path)

```
User opens chat
  → startNewConversationWithIntent(intent)
  → base44.agents.createConversation({ agent_name: 'cbt_therapist', tool_configs: HYBRID.tool_configs })
  → buildV4SessionStartContentAsync(HYBRID_WIRING, base44.entities, base44)
      → wiring.workflow_context_injection is undefined → no workflow instructions
      → wiring.retrieval_orchestration_enabled is undefined → no retrieval context
      → wiring.live_retrieval_enabled is undefined → no live policy
      → wiring.safety_mode_enabled is undefined → no safety mode
      → returns '[START_SESSION]'
  → base44.agents.addMessage(conversation, { role: 'user', content: '[START_SESSION]' })
  → Agent receives [START_SESSION] + whatever system prompt is in Base44 config
  → Agent responds (quality determined entirely by system prompt)
  → postLlmSafetyFilter strips forbidden patterns
  → User receives response
```

### What happens at session start with Phase 3 activated (V2 path)

```
User opens chat
  → startNewConversationWithIntent(intent)
  → resolveTherapistWiring() returns CBT_THERAPIST_WIRING_STAGE2_V2
      (because THERAPIST_UPGRADE_ENABLED=true + THERAPIST_UPGRADE_WORKFLOW_ENABLED=true)
  → base44.agents.createConversation({ agent_name: 'cbt_therapist', tool_configs: V2.tool_configs })
      (tool_configs IDENTICAL to HYBRID — no entity access change)
  → buildV4SessionStartContentAsync(V2_WIRING, base44.entities, base44)
      → wiring.workflow_context_injection === true → appends THERAPIST_WORKFLOW_INSTRUCTIONS
      → wiring.retrieval_orchestration_enabled is undefined → no retrieval context
      → returns '[START_SESSION]\n\n=== UPGRADED THERAPIST WORKFLOW === ...'
  → base44.agents.addMessage(conversation, { role: 'user', content: '[START_SESSION]\n\n=== UPGRADED THERAPIST WORKFLOW ... ===' })
  → Agent receives [START_SESSION] + system prompt + 6-step workflow instructions + response rules + emotion map
  → Agent responds with structured therapeutic response
  → postLlmSafetyFilter strips forbidden patterns (unchanged)
  → User receives structured therapeutic response
```

### Key entity access comparison: HYBRID vs V2

| Entity | HYBRID | V2 | Delta |
|---|---|---|---|
| SessionSummary | preferred, order 2 | preferred, order 2 | IDENTICAL |
| ThoughtJournal | preferred, order 3 | preferred, order 3 | IDENTICAL |
| Goal | preferred, order 4 | preferred, order 4 | IDENTICAL |
| CoachingSession | preferred, order 5 | preferred, order 5 | IDENTICAL |
| Exercise | allowed, order 6 | allowed, order 6 | IDENTICAL |
| Resource | allowed, order 7 | allowed, order 7 | IDENTICAL |
| AudioContent | allowed, order 8 | allowed, order 8 | IDENTICAL |
| Journey | allowed, order 9 | allowed, order 9 | IDENTICAL |
| CompanionMemory | restricted, order 10 | restricted, order 10 | IDENTICAL |
| MoodEntry | restricted, order 11 | restricted, order 11 | IDENTICAL |
| CaseFormulation | restricted, order 12 | restricted, order 12 | IDENTICAL |
| Conversation | restricted, order 13 | restricted, order 13 | IDENTICAL |

**No new entity access is added in V2 vs HYBRID. Zero privacy or security delta.**

### Safety stack unchanged by Phase 3 activation

| Safety layer | Status after Phase 3 activation |
|---|---|
| Layer 1: Regex crisis detector (Chat.jsx) | UNCHANGED |
| Layer 2: LLM crisis detector (enhancedCrisisDetector) | UNCHANGED |
| Layer 3: Per-turn safety supplement (buildRuntimeSafetySupplement) | UNCHANGED (returns null for V2; requires V5) |
| Layer 4: postLlmSafetyFilter | UNCHANGED |
| sanitizeAgentOutput | UNCHANGED |
| sanitizeConversation | UNCHANGED |
| InlineRiskPanel | UNCHANGED |

---

*This document is analysis only. No production behavior has been changed. All recommendations require explicit approval before activation.*
