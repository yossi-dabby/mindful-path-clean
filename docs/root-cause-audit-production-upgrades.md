# Root-Cause Audit — Therapeutic Quality with Active Production Upgrades

**Date:** 2026-03-25  
**Active Railway flags:** `VITE_THERAPIST_UPGRADE_ENABLED=true`, `VITE_THERAPIST_UPGRADE_MEMORY_ENABLED=true`, `VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED=true`, `VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED=true`  
**PR base:** staging-fresh  

---

## Active Production Route

With the four active Railway flags, `resolveTherapistWiring()` (`src/api/activeAgentWiring.js`) resolves to
**`CBT_THERAPIST_WIRING_STAGE2_V2`** (Phase 3 — Workflow Engine):

| Check | Result |
|---|---|
| `THERAPIST_UPGRADE_ENABLED` | ✅ true — master gate open |
| `THERAPIST_UPGRADE_SAFETY_MODE_ENABLED` | ❌ not in Railway — skip V5 |
| `THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED` | ❌ not in Railway — skip V4 |
| `THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED` | ❌ not in Railway — skip V3 |
| `THERAPIST_UPGRADE_WORKFLOW_ENABLED` | ✅ true → **returns V2** |

V2 wiring flags: `memory_context_injection: true`, `workflow_engine_enabled: true`,
`workflow_context_injection: true`. Entity tool_configs are identical to HYBRID.

---

## A. Exact Diagnosis of Why Therapeutic Quality Is Still Weak

### Cause 1 — Session-Start Injection Gap (HIGHEST IMPACT)

**Category:** workflow effectiveness limits

`buildV4SessionStartContentAsync(V2_wiring, ...)` is called in `src/pages/Chat.jsx` only in the
**URL intent parameter path** (lines 378 and 419 — triggered when `?intent=XXX` appears in the URL).

The two dominant session-start paths do NOT inject the workflow context:

| Path | Code location | Session-start injected? |
|---|---|---|
| URL `?intent=XXX` parameter | `Chat.jsx:374–434` | ✅ Yes — `buildV4SessionStartContentAsync` called |
| `startNewConversationWithIntent(intentParam)` (button clicks, e.g. Daily Check-in) | `Chat.jsx:756–818` | ❌ No — only sends the plain `initialMessage` string, no session-start context |
| `startNewConversation()` (plain "New Session" button) | `Chat.jsx:820–822` | ❌ No — creates conversation but sends NO first message at all |
| First message while no conversation exists (send handler `!convId` branch) | `Chat.jsx:963–982` | ❌ No — creates conversation then sends user message with no prefix |

**Result:** The majority of sessions receive zero `[START_SESSION]` signal and zero
`THERAPIST_WORKFLOW_INSTRUCTIONS`. The 6-step CBT sequence, response-shaping rules, and emotion
differentiation map never reach the Base44 agent. The upgraded workflow path is wired but not
activated for most sessions.

---

### Cause 2 — `memory_context_injection` Is an Orphaned Flag

**Category:** memory quality limits

`CBT_THERAPIST_WIRING_STAGE2_V2.memory_context_injection = true` is declared but **no code reads
this flag** in the session-start path. `workflowContextInjector.js` reads
`wiring.workflow_context_injection` and `wiring.retrieval_orchestration_enabled`, but there is no
`getMemoryContextForWiring()` function and no memory injection logic.

Actual pre-session memory retrieval only happens at V3+ via `src/lib/v3RetrievalExecutor.js`,
which requires `wiring.retrieval_orchestration_enabled === true`. That requires the
`THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED` flag, which is not set in Railway.

**Result:** No user-specific memory (CompanionMemory, prior SessionSummary, Goals) is pre-injected
at session start. The Base44 agent may query these entities via `tool_configs` at runtime, but
that is passive retrieval after the session starts — not the structured, bounded, priority-ordered
retrieval that Phase 5 provides.

---

### Cause 3 — Summarization Flag Is Active But Produces Only a Prompted Summary

**Category:** summarization usefulness limits

`THERAPIST_UPGRADE_SUMMARIZATION_ENABLED=true` gates `isSummarizationEnabled()` in
`src/lib/summarizationGate.js`. However, in `Chat.jsx`, summarization is implemented as
`requestSummary()` (line 1092–1116), which simply sends a plain text prompt to the agent asking it
to write a session summary. This is a user-triggered conversational request — not a structured
session-end summarization.

The structured path (`src/lib/sessionEndSummarization.js` → `generateSessionSummary` Deno function)
was hooked into `src/components/coaching/CoachingChat.jsx` (Phase 2.1), not into `Chat.jsx`.

**Result:** The summarization flag is active, but it produces a human-readable summary reply in
the chat — not a structured `CompanionMemory` write that feeds back into the next session's
context. The therapeutic arc across sessions (session-to-session continuity) is effectively broken.

---

### Cause 4 — Safety Filter May Over-Constrain Structured CBT Responses

**Category:** safety/post-filter over-constraint

`base44/functions/postLlmSafetyFilter/entry.ts` strips lines matching these patterns among others:

```
/^\s*STEP\s+\d+:/mi   — "Step 3: ..."
/^Let me\b/mi          — "Let me summarize what you've shared..."
/^I need to\b/mi       — "I need to check in about..."
/^The next step is\b/mi — "The next step is..."
/^I will\b/mi          — "I will name the pattern..."
```

These are exactly the structural phrases a CBT therapist following the Phase 3 workflow engine's
6-step sequence would use. The workflow instructions encourage phrases like "Name the pattern
directly" and "End with something usable" — which the agent might express as "Let me name the
pattern..." or "The next step is...". The safety filter would strip these, leaving fragmented
or truncated responses.

**Result:** Even when session-start injection is fixed (Cause 1), the structured clinical language
produced by the workflow engine may be partially stripped, weakening the therapeutic value of
responses and making them less usable.

---

### Cause 5 — No External Knowledge Grounding

**Category:** missing retrieval / missing knowledge grounding

Retrieval orchestration (V3) and live retrieval (V4) are not active. The `ExternalKnowledgeChunk`
entity (Phase 4.2) exists in the schema but is not queried. The therapist has no access to curated
CBT technique guides, evidence-based resources, or structured clinical knowledge beyond what is
encoded in the Base44 system prompt.

**Result:** Responses are grounded only in the LLM's general knowledge plus whatever user-specific
data the agent pulls from `tool_configs` at runtime. No structured CBT knowledge base informs
interventions.

---

### Cause 6 — Base44 System Prompt Is the Foundational Bottleneck

**Category:** external Base44 prompt/config limitations

All local upgrades (workflow context injection, retrieval, memory) are *additive* — they shape and
augment the Base44 agent's behavior. If the Base44 system prompt for `cbt_therapist` is generic
(e.g., "you are a supportive CBT therapist"), the local enhancements can only do so much. The
primary clinical instruction lives in Base44's configuration, which is outside this codebase.

---

## B. Top 3 Improvement Levers (Ranked by Expected Production Impact)

### Rank 1 — Fix Session-Start Context Injection Gap

**Type:** workflow refinement  
**Impact:** HIGH — workflow instructions currently reach almost no sessions in production despite  
V2 being active. Fixing this immediately activates the 6-step CBT sequence, response-shaping  
rules, and emotion differentiation map for 100% of new sessions.  
**Risk:** VERY LOW — additive change, fail-open, no entity access change, no safety stack change.  
**Files:** `src/pages/Chat.jsx` only.

### Rank 2 — Enable Retrieval Orchestration (V3)

**Type:** retrieval activation  
**Impact:** HIGH — V3 injects bounded, priority-ordered context (CompanionMemory → SessionSummary  
→ Goals → Exercises/Resources → ExternalKnowledgeChunk) at session start. This is the structured  
memory injection that `memory_context_injection: true` was supposed to signal but never delivers  
at V2. Activating V3 requires setting `VITE_THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED=true`  
in Railway and the `resolveTherapistWiring()` logic already handles routing to V3.  
**Risk:** LOW-MEDIUM — retrieval is fail-open, the wiring is already built and tested, entity  
access is unchanged. Requires a Railway flag change + new build.

### Rank 3 — Refine postLlmSafetyFilter to Allow Clinical CBT Language

**Type:** safety tuning  
**Impact:** MEDIUM-HIGH — the current patterns strip structural clinical language that the  
workflow engine produces. Narrowing `STEP\s+\d+:`, `Let me`, `The next step is`, `I will` to  
only match genuine system-leakage contexts (e.g., `[STEP 1:]` vs. `Step 1:` in prose) would  
allow structured CBT responses to reach users intact.  
**Risk:** MEDIUM — changes to the safety filter require a second human reviewer.  
**Files:** `base44/functions/postLlmSafetyFilter/entry.ts`.

---

## C. The Single Safest Next Improvement

**Fix the session-start context injection gap in `src/pages/Chat.jsx`.**

Ensure `buildV4SessionStartContentAsync` is called for ALL new conversation starts, not just
URL-intent-triggered ones. This guarantees the V2 workflow context (already built, already wired)
actually reaches the Base44 agent on every session.

---

## D. Category of the Best Next Step

**Workflow refinement** — the workflow instructions are already built and wired, but the runtime
injection path has a gap. This fix closes the gap without changing the workflow, the wiring, or
any other system.

---

## E. Production Risk of the Recommended Next Step

| Risk dimension | Assessment |
|---|---|
| Entity access | Unchanged — no new entities accessed |
| Safety stack | Unchanged — postLlmSafetyFilter, sanitizeAgentOutput, crisis detectors all active |
| Wiring | Unchanged — V2 remains active |
| Session behavior | Additive — new sessions receive the `[START_SESSION]` signal + workflow instructions that intent sessions already receive |
| Rollback | Set `VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED=false` in Railway to revert to HYBRID; the code change itself is isolated to the new-session start path |
| E2E test risk | Very low — the E2E smoke tests verify page load, chat-root visibility, and input presence; they do not test the content of the first message sent |

**Overall risk: VERY LOW.**

---

## F. Exact Files That Would Need to Change

| File | Change |
|---|---|
| `src/pages/Chat.jsx` | Fix `startNewConversationWithIntent()` and the `!convId` branch in `handleSendMessage()` to inject session-start context (see implementation commit) |

No other files require changes for this fix.

---

## G. External Base44 / Config Dependency

None for this fix. The `buildV4SessionStartContentAsync` call is already used in production
(URL intent path). This change extends it to the missing paths. No new Railway flags, no Base44
configuration changes, no new Deno functions are required.

The only external dependency for the **Rank 2** improvement (retrieval activation) is adding
`VITE_THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED=true` to Railway and triggering a
new build.

---

## H. PR Base = staging-fresh

Confirmed. This PR targets `staging-fresh`, not `main`.

---

## I. Conflicts with main

No conflicts. The changes are additive (new doc, one focused Chat.jsx fix). The existing merge
base between `copilot/root-cause-audit-production-upgrades` and `main` is clean.

---

## J. E2E Tests

The fix does not alter:
- Page routing or navigation
- Component render logic
- Auth or consent flows
- Any data entity access
- The safety filter stack

The only behavioral change: new sessions receive an initial message from the AI before the user
types. E2E smoke tests verify page load, chat-root visibility, input presence, and basic message
sends — none of these are affected by the fix.

**Playwright E2E Tests / E2E Tests (mobile):** Expected pass ✅  
**Playwright E2E Tests / E2E Tests (web-desktop):** Expected pass ✅  
**Playwright E2E Tests / Smoke Tests (Production-critical):** Expected pass ✅

---

*Last updated: 2026-03-25*
