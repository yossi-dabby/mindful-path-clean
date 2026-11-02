# V9 Chat Orchestration System Audit

**Audit Date:** 2026-08-03  
**Repository:** yossi-dabby/mindful-path  
**Scope:** AI Therapist chat system — complete investigation  
**Classification:** INVESTIGATION ONLY — no runtime code modified  
**Branch:** (current branch at time of audit)

---

## Table of Contents

1. [Executive Conclusion](#1-executive-conclusion)
2. [Architecture Map](#2-architecture-map)
3. [Evidence Cross-Check Table](#3-evidence-cross-check-table)
4. [Root-Cause Tree](#4-root-cause-tree)
5. [Findings by Severity](#5-findings-by-severity)
6. [System vs Model Responsibility Table](#6-system-vs-model-responsibility-table)
7. [Recommended Target Architecture](#7-recommended-target-architecture)
8. [Implementation Plan](#8-implementation-plan)
9. [Success Assessment](#9-success-assessment)
10. [Minimum Safe Next PR](#10-minimum-safe-next-pr)
11. [Open Questions](#11-open-questions)

---

## 1. Executive Conclusion

### Direct answers

**Is the main failure in Chat/state management?**  
Yes — partially. Chat.jsx has a confirmed architectural gap in turn correlation (no `reply_to_turn_id`; relies on array position and `messages.length + 2`). The subscription handler silently discards all events during generation, making polling the sole delivery path with no fallback on timeout. Together these produce the observed lost-turn and stale-response behaviours.

**Is orchestration/context composition a central failure?**  
Yes — for the formulation-led regression and the `action_permitted` non-enforcement. Context is composed as a flat concatenated string with no machine-readable structure. The LTS/Continuity divergence is documented architecture, not a bug, but is not adequately surfaced to operators or consumers.

**Is strategy enforcement missing or broken?**  
Broken by design. `action_permitted=false` is injected into the model context as human-readable text guidance. There is no post-generation validator that checks whether the model's response contains imperative behavioural directives. The model violated the constraint and the system had no mechanism to detect or reject the output.

**Is the model itself the primary or secondary problem?**  
Secondary. The model produced compliant behaviour in the sense that the system gave it no enforceable constraint. The output "שלח את ההודעה עכשיו" is fully explicable from an absent post-generation enforcement layer, not from model non-compliance. The model should not be blamed before the pipeline is confirmed correct.

**Is a full rewrite justified?**  
Not yet. The failures map onto specific, bounded architectural gaps — absent turn correlation, absent post-generation enforcement, a single delivery path with no fallback. These can be addressed with targeted architectural repair behind a feature flag, without a full rewrite. A full rewrite carries a higher probability of introducing new regressions than a scoped repair at this stage.

---

## 2. Architecture Map

### 2.1 User message → rendered response (full runtime path)

```
User types and presses Send
  │
  └─ handleSendMessage() [Chat.jsx:2743]
       │
       ├─ 1. Consume pendingFormulationCorrectionRef [Chat.jsx:2952–2965]
       │       Prepend CURRENT-TURN GROUNDING CORRECTION block to message content
       │       Clear ref (one-shot, no retry)
       │
       ├─ 2. Consume pendingGroundingCorrectionRef [Chat.jsx:2966–2980]
       │       Same one-shot prepend + clear
       │
       ├─ 3. Clear input, setIsLoading(true) [Chat.jsx:2825, 2827]
       │
       ├─ 4. Compute expectedReplyCountRef = messages.length + 2 [Chat.jsx:2766]
       │       ⚠ Array-position correlation — no turn_id
       │
       ├─ 5. base44.agents.addMessage(conversation, { role:'user', content }) [Chat.jsx:3113]
       │       User message (with any correction block embedded) is now persisted
       │       in Base44 conversation history
       │
       └─ 6. pollWithBackoff(attempt=0) [Chat.jsx:3143]
              Attempt 0: wait 500ms
              Attempt 1: wait 1000ms
              Attempt 2: wait 2000ms
              Attempt 3: wait 4000ms
              Attempt 4: wait 8000ms
              Max 5 attempts → force-commit or timeout error
              │
              ├─ base44.agents.getConversation(conversationId)
              │
              ├─ buildVisibleConversationMessages(messages) [Chat.jsx:1142]
              │    Stage 1: sanitizeConversationMessagesAligned() — strips correction blocks
              │    Stage 2: alignedMessageTransform() — normalise, guard JSON
              │    Stage 3: applyFormulationGuardToConversationMessages()
              │    Stage 4: applyCurrentTurnGroundingGuardToConversationMessages()
              │    Stage 5: filter (remove empty/invalid)
              │
              ├─ evaluateAssistantSnapshotFinality(guardedPoll) [Chat.jsx:~1720]
              │    Requires stableCount ≥ 2 (same content on 2 consecutive polls)
              │    Returns isFinal: bool
              │
              ├─ hasExpectedReplyCount check [Chat.jsx:3175]
              │    guardedPoll.length >= expectedReplyCountRef.current
              │
              └─ safeUpdateMessages(guardedPoll, 'Polling') [Chat.jsx:1282]
                   Reject conditions:
                   - Shorter than lastConfirmedMessagesRef
                   - Visible assistant mutation
                   - Non-final change (unless first hydration)
                   - Content regression (new < old × 0.75)
                   - Finalized message mutation (V8-K immutability)
                   Accept → setMessages(guardedPoll) + setIsLoading(false)
                   Accept → markAssistantMessagesFinalized(convId, guardedPoll)

  Parallel path (subscription — suppressed during loading):
  │
  └─ useEffect subscription [Chat.jsx:1727]
       On conversation update event:
       ├─ if isLoadingRef.current === true → EARLY RETURN (silent discard)
       │    ⚠ This means ALL subscription events during generation are discarded
       └─ if isLoadingRef.current === false:
            buildVisibleConversationMessages() → safeUpdateMessages('Subscription')
            If accepted: subscriptionSucceededRef.current = true
            If subscriptionSucceededRef = true: polling skips safeUpdateMessages
```

### 2.2 Context composition path (V9, session start)

```
buildV9SessionStartContentAsync(wiring, entities, baseClient, options)
  [workflowContextInjector.js:2423]
  │
  ├─ Guard: wiring.longitudinal_layer_enabled !== true → delegate to V8
  │
  ├─ 1. readLTSSnapshotWithDiagnostic(entities) [workflowContextInjector.js:2179]
  │       Filter: CompanionMemory.filter({ memory_type: 'lts' })
  │       Returns: { ltsRecord, diagnostic: { lts_valid, read_result } }
  │
  ├─ 2. isLTSWeak(ltsRecord) check
  │       If weak or absent: v8Options = options (no LTS passed to V8)
  │       If valid: v8Options = { ...options, lts_record: ltsRecord }
  │
  └─ 3. buildV8SessionStartContentAsync(wiring, entities, baseClient, v8Options)
              [workflowContextInjector.js:1972]
              │
              ├─ readCrossSessionContinuity() [crossSessionContinuity.js:213]
              │   CompanionMemory.list('-created_date', 9)
              │   Filter by memory_type='therapist_session' + inner version marker
              │   Returns: { continuityBlock, diagnostic, records }
              │
              ├─ CaseFormulation entity read
              │
              ├─ determineSafetyMode()
              │
              ├─ extractMessageSignals()
              │
              ├─ scoreDistressTier()
              │
              ├─ extractLTSStrategyInputs(options.lts_record ?? null)
              │
              ├─ determineTherapistStrategy(continuityData, formulationData,
              │                              distressTier, messageSignals, ltsInputs)
              │   [therapistStrategyEngine.js:763]
              │   Returns: frozen TherapistStrategyState
              │   ⚠ action_permitted defaults to false in all _buildStrategyState() calls
              │
              ├─ buildPlannerContext(strategyState, ...)
              │
              ├─ applyStrategyPrecedenceGuard(rawStrategyState, plannerCtx)
              │   [workflowContextInjector.js:1381]
              │   Sets action_permitted = modeIsActionCapable && !hasBlockedGates
              │   Returns augmented strategy state (Object.assign, NOT frozen)
              │
              └─ Concatenation (in order, \n\n separated):
                   [START_SESSION]
                   + THERAPIST_WORKFLOW_INSTRUCTIONS (if workflow_context_injection)
                   + formulationContextBlock (if formulation_context_enabled)
                   + formulationLedBlock (if formulation_led_enabled OR VITE flag)
                   + continuityBlock (if continuity_layer_enabled)
                   + safetyModeContext
                   + retrievalContext
                   + liveContextSection
                   + plannerContext
                   + strategyContextSection ← contains "Action permitted: no"
                   + enforcementBlock (if precedence_enforced)
                   + ltsContextBlock (if LTS valid — appended by V9 wrapper)
                   → Single flat string sent to base44.agents.addMessage()
```

### 2.3 Memory read/write paths

```
Session end (write paths):
  writeTherapistMemory/entry.ts
    → CompanionMemory.create({ memory_type: 'therapist_session', content: JSON.stringify(sessionRecord) })
    sessionRecord has: therapist_memory_version: '1' (inner marker)

  writeLTSSnapshot/entry.ts
    → CompanionMemory.create({ memory_type: 'lts', content: JSON.stringify(ltsRecord) })
    ltsRecord has: lts_version: '1', memory_type: 'lts', session_count: N (inner fields)

Session start (read paths):
  readCrossSessionContinuity()  [crossSessionContinuity.js:219]
    CompanionMemory.list('-created_date', 9) — NO type filter
    Keep: raw.memory_type === 'therapist_session' && isTherapistMemoryRecord(inner)
    → selected_prior_session_count = matched records (max 3)

  readLTSSnapshotWithDiagnostic()  [workflowContextInjector.js:2179]
    CompanionMemory.filter({ memory_type: 'lts' }, '-created_date', 15)
    Keep: raw.memory_type === 'lts' && isLTSRecord(inner) && !isLTSWeak(inner)
    isLTSWeak: true if trajectory='unknown'|'insufficient_data' OR session_count < 2
    → lts_valid = (read_result === 'valid')
```

---

## 3. Evidence Cross-Check Table

| Production Observation | Repository Mechanism | Status | Likely Root Cause | Confidence | Evidence |
|---|---|---|---|---|---|
| A: `routeHint: STAGE2_V9` | `activeAgentWiring.js:235–246`: V9 selected when `STRATEGY_ENABLED && LONGITUDINAL_ENABLED`; `featureFlags.js:465–469` emits routeHint | **Confirmed** | Routing correct | High | `activeAgentWiring.js:235–246`, `featureFlags.js:465–469` |
| A: `route_selected: stage2_v9 / wave3c_lts` | `featureFlags.js`: `getStage2DiagnosticPayload` assembles flag + path | **Confirmed** | Routing correct | High | `featureFlags.js:450–490` |
| B: LTS `lts_valid=false, lts_session_count=0` | `readLTSSnapshotWithDiagnostic`: returns `absent_or_invalid` when no `memory_type='lts'` records exist, or when record has `session_count < 2` or `trajectory='unknown'` | **Confirmed** | LTS snapshot never written, or `writeLTSSnapshot` produced a weak record (session_count=1, trajectory='unknown') | High | `workflowContextInjector.js:2179–2249`, `therapistMemoryModel.js:371–454` |
| B: Continuity `selected_prior_session_count=3` | `crossSessionContinuity.js:219`: `CompanionMemory.list()` with no type filter, then filters by inner `therapist_memory_version='1'` | **Confirmed** | 3 `therapist_session` records exist; they are distinct from `lts` records | High | `crossSessionContinuity.js:213–295` |
| B: LTS=0 while Continuity=3 | Different entities and different memory_type filters; `therapist_session` records accumulate every session; `lts` records require explicit `writeLTSSnapshot` call and `session_count ≥ 2` | **Confirmed** | By design — they measure different things. LTS record absent or weak at this session count | High | `therapistMemoryModel.js:76,287`, `workflowContextInjector.js:2277–2285` |
| C: `formulation_led_effective: false` (V9) | `getFormulationLedContextForWiring` [injector:1203]: injects block only if `wiring.formulation_led_enabled === true` OR `isUpgradeEnabled('THERAPIST_UPGRADE_FORMULATION_LED_ENABLED')`. V9 wiring has no `formulation_led_enabled` field. | **Confirmed** | `VITE_THERAPIST_UPGRADE_FORMULATION_LED_ENABLED` not set in deployed env; V9 wiring lacks the flag; this is a capability gap, not a bug | High | `workflowContextInjector.js:1203–1216`, `agentWiring.js:1383–1442` |
| C: V9 "strict superset of V8" claim | V9 delegates to `buildV8SessionStartContentAsync` with optional LTS record; all V8 blocks preserved; formulation-led is a separate optional flag not part of the wiring chain | **Partially confirmed** | Strict superset claim is accurate for wiring capabilities; formulation-led is a separate opt-in flag outside the superset chain | Medium | `workflowContextInjector.js:2423–2500`, `agentWiring.js` |
| C: URL parsed `FORMULATION_LED_ENABLED` but `formulation_led_effective: false` | `runtimeCapabilityDiagnostic.js:242–256`: diagnostic reports `wiring.formulation_led_enabled === true` (false for V9) as primary check; URL flag read by `isUpgradeEnabled` separately | **Confirmed** | Diagnostic reflects wiring state, not URL flag; flag in URL confirms URL parsing works but `isUpgradeEnabled` returns based on `window.__FEATURE_FLAGS__` or `VITE_` env, not URL at runtime | Medium | `runtimeCapabilityDiagnostic.js:242–256`, `featureFlags.js` |
| D: `intervention_mode: stabilisation, action_permitted: false` with behavioural directives in response | `buildStrategyContextSection` [strategyEngine:1093] emits text only: "Action permitted: no". No post-generation validator checks for imperative directives. `validateAgentOutput.js` does not reference `action_permitted` | **Confirmed critical gap** | `action_permitted` is text guidance only; no deterministic post-generation enforcement exists | High | `therapistStrategyEngine.js:1093–1168`, `validateAgentOutput.js` (no `action_permitted` reference) |
| D: `current_message_available: false` | This field is part of the strategy diagnostic snapshot; suggests `extractMessageSignals` did not receive the current user message text at strategy computation time | **Partially confirmed** | Message signals are extracted from the current conversation window; if the session-start context is built at conversation creation (not per-turn), current message may be absent | Medium | `workflowContextInjector.js:1800–1870`, `therapistStrategyEngine.js:763` |
| E: Lost user turns, no response to "בדרך כלל אני קורא..." | Subscription suppressed during `isLoading=true`; polling relies on `expectedReplyCount`; no `reply_to_turn_id`; if polling times out before generation completes, response is never committed | **Confirmed as plausible mechanism** | Polling timeout (5 attempts, max 37.5s cumulative) can expire before model finishes; subscription discards events during loading; no fallback delivery | High | `Chat.jsx:1770–1773, 3143–3261, 2766` |
| E: Response attached to stale turn | `expectedReplyCountRef = messages.length + 2` overwritten on each send; assistant response identified by array position not turn_id | **Confirmed structural gap** | Array-position correlation; second send resets expected count before first response commits | High | `Chat.jsx:2766, 859–864, 1349` |
| F: CURRENT-TURN GROUNDING CORRECTION block in transcript | Correction blocks built by `buildPendingGroundingCorrectionBlock/buildPendingFormulationCorrectionBlock`; stored in `pendingGroundingCorrectionRef/pendingFormulationCorrectionRef`; injected into user message content before `base44.agents.addMessage()` call | **Confirmed** | Blocks ARE persisted in Base44 conversation history as part of user message content; `sanitizeConversationMessagesAligned` must strip them on render | High | `Chat.jsx:2951–2980`, `formulationContractGuard.js`, `validateAgentOutput.jsx` |
| F: Block appearing in rendered transcript | `sanitizeConversationMessagesAligned` is applied in stage 1 of `buildVisibleConversationMessages`; if sanitization misses a block, it renders | **Unresolved** | Depends on sanitizer correctness; cannot confirm from repository evidence alone | Medium | `Chat.jsx:1142–1165`, `validateAgentOutput.jsx` |
| G: "אני זוכר שבפעם הקודמת נגענו" while LTS=0 | Continuity block includes source-honest relational language guidance; `crossSessionContinuity.js` outputs continuity block from 3 selected sessions | **Confirmed — grounded in Continuity** | Statement grounded in continuity data (3 sessions), not LTS; LTS being zero does not invalidate continuity-based memory references | High | `crossSessionContinuity.js:280–340` |

---

## 4. Root-Cause Tree

### Root causes (direct causes of observed failures)

**RC-1: No turn identity — array-position correlation**  
`expectedReplyCountRef = messages.length + 2` (`Chat.jsx:2766`). No `client_request_id`, no `generation_id`, no `reply_to_turn_id`. The system cannot prove which assistant response belongs to which user message.

**RC-2: Single delivery path with no fallback on timeout**  
Subscription is suppressed during `isLoading=true` (`Chat.jsx:1770`). Polling is the sole delivery mechanism. After 5 exponential-backoff attempts (max ~37.5s cumulative), polling either force-commits or times out. If generation exceeds this window, the response is never delivered to the client.

**RC-3: `action_permitted` is text guidance only — no post-generation enforcement**  
`buildStrategyContextSection` (`therapistStrategyEngine.js:1093`) produces a plain-text block injected into model context. `validateAgentOutput.js` contains no reference to `action_permitted`. The model can output imperative behavioural directives when `action_permitted=false` with no detection or rejection.

**RC-4: Grounding correction blocks stored in conversation history**  
`pendingGroundingCorrectionRef` and `pendingFormulationCorrectionRef` are consumed once by prepending to user message content before `base44.agents.addMessage()` (`Chat.jsx:2951–2980`). The correction block is persisted in Base44 conversation history. Sanitization must reliably strip these on every read path; any sanitizer gap exposes internal orchestration content to the user.

**RC-5: LTS write never triggered, or first-session weak threshold**  
`writeLTSSnapshot` writes with `memory_type='lts'`. `readLTSSnapshotWithDiagnostic` classifies any record with `session_count < 2` or `trajectory='unknown'` as weak (`lts_valid=false`). If the first LTS record is written after session 1, `session_count=1`, which is weak. LTS can thus be zero for a user with 3 completed sessions if `writeLTSSnapshot` was recently enabled or has been failing silently.

**RC-6: Formulation-led not in V9 wiring, requires separate env flag**  
V9 wiring object (`agentWiring.js:1383–1442`) does not contain `formulation_led_enabled`. `getFormulationLedContextForWiring` (`workflowContextInjector.js:1203–1216`) requires either `wiring.formulation_led_enabled === true` or `VITE_THERAPIST_UPGRADE_FORMULATION_LED_ENABLED=true` in the deployed environment. If the env flag is absent, formulation-led instructions are silently skipped for all V7–V12 wirings.

---

### Contributing factors

**CF-1: Pending correction block cleared on first consume — no retry**  
`pendingFormulationCorrectionRef.current = null` is set at `Chat.jsx:2964` immediately before the send. If the send fails or the block is needed again, it cannot be retried. There is no write-back path from the backend confirming the correction was received.

**CF-2: `safeUpdateMessages` immutability key is not stable across delivery paths**  
`getAssistantIdentityKey` (`Chat.jsx:724–732`) derives the key from `msg.id`, then `created_at+role+index`, then `_turn_id`, then raw index. If subscription and polling deliver the same message with different field populations, the finalization key can differ, bypassing the immutability guard.

**CF-3: Diagnostic `formulation_led_effective` can show `true` when block is not injected**  
`runtimeCapabilityDiagnostic.js:242–256` reports `formulation_led_effective = true` when `formulation_context_enabled && led_flag && master`. But `getFormulationLedContextForWiring` at runtime only reads `wiring.formulation_led_enabled` or the VITE env flag. The diagnostic and the runtime injector use different evaluation paths, which can produce a misleading `true` in diagnostics when the block is actually not injected.

**CF-4: Context is a flat concatenated string**  
The final context object sent to `base44.agents.addMessage()` is a single `\n\n`-delimited string. There is no structured representation of which blocks are present, no checksum, no machine-readable block list. Post-generation enforcement cannot interrogate what the model was given.

---

### Symptoms (observable effects)

- Lost user turns / "לא ענית!!!" — polling timeout before generation completed
- Response appears for wrong turn — array-position correlation race with rapid sends
- "שלח את ההודעה עכשיו" despite `action_permitted=false` — RC-3
- CURRENT-TURN GROUNDING CORRECTION visible in transcript — RC-4 + sanitizer gap
- `formulation_led_effective: false` in V9 — RC-6
- LTS=0 while Continuity=3 — RC-5 (by design but not clearly surfaced)

---

### Unrelated observations

- `thinkingPlaceholderRef` is a React ref to the loading div, not a message bubble. It does not affect message state.
- The V9 superset claim is accurate with respect to wiring chain capabilities.
- `MessageList` receives `messages` slice directly; no additional filtering at render time beyond `visibleCount`.

---

## 5. Findings by Severity

### P0 — Privacy / Safety / Transcript Integrity

**P0-A: Grounding correction blocks persist in Base44 conversation history**  
Internal orchestration instructions (CURRENT-TURN GROUNDING CORRECTION, formulation correction) are injected into the user message content field before `base44.agents.addMessage()`. They are persisted in Base44 conversation history. The only safeguard is `sanitizeConversationMessagesAligned()` on every read path. If this function fails, misses a block pattern, or is bypassed (e.g., loadConversation history path), internal clinical orchestration instructions become visible to the user.

*Files:* `Chat.jsx:2951–2980`, `formulationContractGuard.js`, `validateAgentOutput.jsx`

**P0-B: Internal instruction isolation is incomplete**  
Correction blocks are not stored in a separate internal channel. They are embedded in the user message content, mixing internal orchestration with the clinical transcript. This makes it impossible to audit the boundary between user-visible content and system-internal content from the persisted record alone.

*Files:* `Chat.jsx:2951–2980`, `base44/functions/writeTherapistMemory/entry.ts`

---

### P1 — Lost turns, wrong-turn response, strategy violation

**P1-A: User turns can be permanently lost (no response delivered)**  
When `isLoading=true`, all subscription events are silently discarded (`Chat.jsx:1770`). Polling is the only delivery path. After 5 exponential-backoff attempts (500ms→1s→2s→4s→8s), polling either force-commits the last snapshot or emits a timeout error. If the model has not responded within this window, the response is never committed to state. The user sees "Thinking..." indefinitely or receives a timeout message.

*Files:* `Chat.jsx:1770–1773, 3143–3261, 3210`

**P1-B: Rapid consecutive sends produce wrong-turn responses**  
`expectedReplyCountRef.current = messages.length + 2` is set at the beginning of `handleSendMessage` (`Chat.jsx:2766`). If the user sends a second message before the first response has been committed, the second send overwrites `expectedReplyCountRef`. The poll for the second turn may then commit the first response (if array position matches), producing a response that belongs to turn N appearing as the answer to turn N+1.

*Files:* `Chat.jsx:2766, 859–864`

**P1-C: `action_permitted=false` is not enforced post-generation**  
The strategy engine correctly computes `action_permitted=false` for STABILISATION mode. This value is injected into the model context as text guidance only (`therapistStrategyEngine.js:1122`). `validateAgentOutput.js` and all guard functions in `validateAgentOutput.jsx` contain no reference to `action_permitted`. A model response containing imperative directives like "שלח את ההודעה עכשיו" passes all post-generation checks without detection.

*Files:* `therapistStrategyEngine.js:1093–1168`, `validateAgentOutput.js` (entire file), `Chat.jsx` (no `action_permitted` reference)

---

### P2 — Memory / LTS inconsistency, capability regression

**P2-A: LTS session_count=0 while Continuity session_count=3 — by design but misleading**  
LTS reads only `CompanionMemory` records with outer `memory_type='lts'`. Continuity reads all records and filters by inner `therapist_memory_version='1'`. These are different record types accumulated on different write paths. LTS being zero is expected when `writeLTSSnapshot` has not yet produced a record with `session_count ≥ 2`. The divergence is correct but is surfaced as a single session with contradictory diagnostics, creating operator confusion.

*Files:* `workflowContextInjector.js:2179–2249`, `crossSessionContinuity.js:213–295`, `therapistMemoryModel.js:76,287`

**P2-B: LTS write is silent-fail for first session**  
A user's first session produces a `writeLTSSnapshot` call with `session_count=1`. `isLTSWeak` classifies `session_count < 2` as weak. The session-start LTS read for session 2 will therefore see `lts_valid=false, lts_session_count=0` even though an LTS record exists. The user must complete at least 2 sessions before LTS provides strategy signals. This is documented but not surfaced in any user-facing or operator-facing diagnostic as a distinct "LTS warming up" state.

*Files:* `workflowContextInjector.js:2277–2285`, `base44/functions/writeLTSSnapshot/entry.ts`

**P2-C: Formulation-led instructions silently absent from V9**  
V9 wiring object has no `formulation_led_enabled` field. `getFormulationLedContextForWiring` silently skips the formulation-led block when the `VITE_THERAPIST_UPGRADE_FORMULATION_LED_ENABLED` env flag is absent. V9 sessions proceed without formulation-led instructions unless the separate env flag is explicitly set. The "strict superset" documentation does not mention this gap.

*Files:* `workflowContextInjector.js:1203–1216`, `agentWiring.js:1383–1442`

**P2-D: Diagnostic `formulation_led_effective` can give a false positive**  
`runtimeCapabilityDiagnostic.js:242–256` evaluates `formulation_led_effective` using a different code path than the runtime injector. The diagnostic can show `true` when the injector has not actually emitted the formulation-led block. This makes the diagnostic unreliable for confirming this capability is active.

*Files:* `runtimeCapabilityDiagnostic.js:242–256`, `workflowContextInjector.js:1203–1216`

**P2-E: Pending correction block consumed before confirmed received**  
`pendingFormulationCorrectionRef.current = null` is set at `Chat.jsx:2964` before `base44.agents.addMessage()` resolves. If the send fails at the network layer, the correction block is permanently discarded. There is no retry path.

*Files:* `Chat.jsx:2952–2980`

---

### P3 — Diagnostics / Documentation gaps

**P3-A: No generation_id, turn_id, or reply_to_turn_id**  
The system has no mechanism to link an assistant response to a specific user turn other than array position. No `client_request_id` is emitted at send time. The diagnostics cannot prove which user message a given assistant response was generated in response to.

**P3-B: Context composition not observable**  
The final context string sent to the model is not logged (correctly, for privacy). But there is also no structural record of which blocks were included, which were skipped, or what the total length was. If a block is silently skipped due to a false conditional, there is no observable evidence.

**P3-C: Subscription suppress-during-loading is undocumented**  
`isLoadingRef.current` guard at `Chat.jsx:1770` is the most significant architectural decision in the chat lifecycle. It is not documented in comments, not tested in isolation, and not surfaced in any diagnostic.

**P3-D: LTS warming period not surfaced in diagnostics**  
`lts_valid=false, lts_session_count=0` with `read_result='weak'` vs `read_result='absent_or_invalid'` are collapsed into the same operator experience. An operator cannot distinguish "LTS has never been written" from "LTS was written but is still in the warming period".

---

## 6. System vs Model Responsibility Table

| Observed Failure | Responsibility | Reasoning |
|---|---|---|
| Lost user turn / "לא ענית!!!" | **System** | Polling timeout (RC-2); subscription suppressed (RC-2); no delivery fallback |
| Response for wrong turn ("שלח" after different question) | **System** | Array-position turn correlation (RC-1); rapid-send `expectedReplyCount` overwrite (P1-B) |
| `action_permitted=false` not respected: "שלח את ההודעה עכשיו" | **System/Orchestration** | No post-generation enforcement (RC-3). Cannot be attributed to model alone without proving the model received `action_permitted=false` instruction AND had no confounding prompt context. Model non-compliance is secondary hypothesis. |
| CURRENT-TURN GROUNDING CORRECTION in transcript | **System** | Blocks stored in user message content (RC-4); sanitizer must strip on every path |
| "אני זוכר שבפעם הקודמת..." while LTS=0 | **Orchestration (valid)** | Statement grounded in continuity block (3 sessions confirmed); LTS=0 does not invalidate; statement was correctly prompted |
| `formulation_led_effective: false` (V9) | **Orchestration** | Env flag not set; V9 wiring lacks the field; silent gap (RC-6) |
| LTS=0 / Continuity=3 diagnostic contradiction | **System (documentation gap)** | By design; different record types; not clearly surfaced (P2-A) |
| Diagnostic `formulation_led_effective: true` when block not injected | **System** | Diagnostic uses different evaluation path than runtime injector (P2-D) |
| `current_message_available: false` in strategy | **Orchestration** | Strategy built at session start, not per-turn; current message may not be available at strategy computation time |

---

## 7. Recommended Target Architecture

### Core principle

Introduce a feature-flagged parallel orchestration path (`CHAT_ORCHESTRATOR_V2_ENABLED=false` default) that surgically replaces the components responsible for the confirmed failures, without rewriting Chat.jsx in its entirety.

### Components mapped against actual repository

The following names are proposed; they do not yet exist in the repository.

#### 7.1 `TurnCorrelationRegistry`

**Gap addressed:** RC-1 (array-position correlation)  
**What it does:** Generates and tracks a `client_request_id` at `handleSendMessage` time. Stores `{ client_request_id, turn_index, expected_reply_count }`. Polls and subscription events are tagged with the originating `client_request_id`. An assistant response is only committed when its `client_request_id` matches the last active request.  
**Files affected:** `Chat.jsx` (handleSendMessage, pollWithBackoff), `base44.agents.addMessage` call site  
**Note:** Depends on Base44 agent API supporting per-message metadata passthrough and surfacing it in `getConversation` responses.

#### 7.2 `CanonicalConversationStore`

**Gap addressed:** RC-2 (single delivery path)  
**What it does:** A dedicated React context that owns the single canonical `messages` array. Both polling and subscription write through it with priority rules: polling wins during `isLoading=true`; subscription wins when `isLoading=false`. Replaces the current dual-path where subscription is silently discarded.  
**Files affected:** `Chat.jsx` (messages state, safeUpdateMessages, subscription effect)

#### 7.3 `ResponsePolicyEnforcer`

**Gap addressed:** RC-3 (no post-generation enforcement)  
**What it does:** A post-generation validation function that receives the strategy state (specifically `action_permitted`, `intervention_mode`) alongside the model's raw output. Checks for patterns of imperative behavioural directives (e.g., regex patterns for Hebrew and English action commands). When a violation is detected and `action_permitted=false`, either triggers regeneration (bounded, max 1 retry) or replaces with a safe neutral fallback.  
**Files affected:** New file in `src/components/utils/` or `src/lib/`; called from `buildVisibleConversationMessages` stage 3  
**Note:** Must be privacy-safe. Must not log the violating text. Pattern list must be bounded and maintained.

#### 7.4 `InternalInstructionChannel`

**Gap addressed:** RC-4 / P0-A (correction blocks in user message content)  
**What it does:** Instead of embedding correction blocks in user message `content`, stores them in a dedicated `metadata` field on the message (if Base44 agent API supports metadata passthrough to model context). The correction block is transmitted to the model via a separate model-context injection path, not the user message content. The `sanitizeConversationMessagesAligned` function becomes a last-resort guard rather than the primary isolation mechanism.  
**Files affected:** `Chat.jsx:2951–2980`, `formulationContractGuard.js`, `validateAgentOutput.jsx`  
**Note:** Requires confirming Base44 agent API metadata passthrough to model. If metadata is not passed to the model, an alternative is to emit correction blocks as a synthetic `system` role message that is filtered from rendered output by role, not by content scanning.

#### 7.5 `CanonicalTherapistMemoryReader`

**Gap addressed:** P2-A (LTS/Continuity diagnostic confusion), P2-D (diagnostic false positive)  
**What it does:** A unified read function that returns `{ lts: { valid, record, readResult, warmingUp }, continuity: { sessions, block } }`. Exposes a `lts_warming_up` boolean (`lts_session_count=1 && read_result='weak'`) to distinguish the warming period from total absence.  
**Files affected:** `workflowContextInjector.js:2179`, `crossSessionContinuity.js`

#### 7.6 `ContextComposerV2`

**Gap addressed:** CF-4 (flat string composition), P3-B (no observable block list)  
**What it does:** Assembles context as a structured object `{ blocks: [{ id, type, content, included }], finalString }`. The `blocks` array is retained (not logged) for the duration of the session-start call, allowing `GenerationAuditMetadata` to confirm which blocks were present.  
**Files affected:** `workflowContextInjector.js` (V9 builder)

#### 7.7 `GenerationAuditMetadata`

**Gap addressed:** P3-A (no generation_id), P3-B (no context observability)  
**What it does:** A lightweight per-turn record `{ client_request_id, turn_index, blocks_included: string[], action_permitted: bool, lts_valid: bool, continuity_session_count: number, response_rejected: bool, rejection_reason: string | null }`. Stored in React ref (not state), not persisted, not logged to console. Available to the `ResponsePolicyEnforcer` and to the stability report.  
**Note:** Must not log user content. Block IDs (string labels) are safe; block content is not.

---

## 8. Implementation Plan

### Phase 0 — Instrumentation and reproducible tests

**Entry:** Audit complete, no code changes yet  
**Exit:** Failing tests exist that reproduce each confirmed failure mode

**Files likely affected:**
- `test/utils/` — new test files for each confirmed gap
- `src/lib/chatStabilityReport.js` — extend to surface new invariants

**Invariants to establish:**
1. One user send → exactly one assistant response committed
2. Response committed only when `expectedReplyCount` met AND poll source matches active `client_request_id`
3. `buildVisibleConversationMessages` output contains no correction block markers
4. Strategy state with `action_permitted=false` → no imperative directive in final response (requires mock model)

**Tests:**
- Test: rapid double-send → second response does not appear as first response
- Test: polling times out → `setIsLoading(false)` called with safe state, not stuck
- Test: correction block in user message content → `sanitizeConversationMessagesAligned` removes it
- Test: `formulation_led_enabled` absent in wiring, VITE flag absent → formulation-led block absent from context string

**Rollback:** No production change; rollback by reverting test files  
**Risks:** Test infrastructure may not support full Chat.jsx integration testing without real Base44 backend

---

### Phase 1 — Canonical message lifecycle

**Entry:** Phase 0 tests exist and fail for RC-1, RC-2  
**Exit:** Turn correlation by `client_request_id`; subscription-or-polling convergence; no delivery black hole

**Files likely affected:**
- `src/pages/Chat.jsx` — `handleSendMessage`, `pollWithBackoff`, subscription effect
- New: `src/lib/turnCorrelationRegistry.js`
- New: `src/lib/canonicalConversationStore.js` (or hook)

**Invariants:**
- `client_request_id` generated at send time, stored in ref
- Polling commits only when `client_request_id` matches
- Subscription no longer silently discarded during loading; instead queued and processed when loading clears
- `isLoading` cleared on both successful commit AND timeout

**Tests:** Phase 0 tests for RC-1, RC-2 pass  
**Rollback:** `CHAT_ORCHESTRATOR_V2_ENABLED=false` default; old path preserved  
**Risks:** Changing subscription behavior may introduce new races; extensive staging validation required

---

### Phase 2 — Context composer separation

**Entry:** Phase 1 complete  
**Exit:** `ContextComposerV2` returns structured block list; `formulation_led_effective` diagnostic matches runtime

**Files likely affected:**
- `src/lib/workflowContextInjector.js` — V9 builder
- `src/lib/runtimeCapabilityDiagnostic.js` — use same evaluation path as runtime

**Invariants:**
- Diagnostic `formulation_led_effective` uses `getFormulationLedContextForWiring` directly
- Context string identical to current output (no behavior change)
- `GenerationAuditMetadata` block list populated

**Tests:** Diagnostic test: V9 wiring + no VITE flag → `formulation_led_effective: false`  
**Rollback:** Old path preserved behind flag  
**Risks:** Diagnostic may currently be relied upon by other tools; verify before changing

---

### Phase 3 — Deterministic strategy enforcement

**Entry:** Phase 2 complete; `GenerationAuditMetadata` available  
**Exit:** `action_permitted=false` → no imperative directive in committed response

**Files likely affected:**
- New: `src/components/utils/responsePolicyEnforcer.js`
- `src/pages/Chat.jsx` — `buildVisibleConversationMessages` stage 3
- `src/lib/workflowContextInjector.js` — pass strategy state to audit metadata

**Invariants:**
- `ResponsePolicyEnforcer` never logs user content
- Pattern list is bounded (max N patterns), reviewed clinically
- Violation triggers max 1 regeneration attempt; if second attempt also violates, committed with safe fallback
- Safe fallback is clinically neutral, not empty

**Tests:** Phase 0 test for RC-3 passes  
**Rollback:** Feature flag; old path continues without enforcement  
**Risks:** False positives in pattern matching could suppress valid responses; clinical review of patterns required; Hebrew regex accuracy

---

### Phase 4 — Canonical memory adapter

**Entry:** Phase 3 complete  
**Exit:** `CanonicalTherapistMemoryReader` returns unified read result; `lts_warming_up` surfaced in diagnostics

**Files likely affected:**
- `src/lib/workflowContextInjector.js` — replace dual read calls
- `src/lib/runtimeCapabilityDiagnostic.js` — add `lts_warming_up` field
- `test/utils/wave3cLTSRead.test.js`, `test/utils/wave3eLTSDiagnostics.test.js`

**Invariants:**
- `lts_warming_up=true` when `session_count=1 && read_result='weak'`
- Continuity and LTS read from same function call, no duplicate entity fetches
- LTS fail-open behavior preserved (absent LTS → exact V8 behavior)

**Tests:** Unit test: 1-session LTS record → `lts_warming_up=true`; 3-session → `lts_valid=true`  
**Rollback:** Old dual-read path preserved behind flag  
**Risks:** Unified read adds latency if Base44 entity fetch is serial; consider parallel fetch

---

### Phase 5 — Internal instruction channel

**Entry:** Phase 4 complete; Base44 API metadata support confirmed  
**Exit:** Correction blocks not stored in user message `content`; `sanitizeConversationMessagesAligned` becomes last-resort guard only

**Files likely affected:**
- `src/pages/Chat.jsx:2951–2980` — message construction
- `src/components/utils/formulationContractGuard.js` — block injection path
- `src/components/utils/validateAgentOutput.jsx` — sanitizer becomes secondary

**Invariants:**
- User message `content` field contains only user-supplied text
- Correction blocks transmitted via `metadata.internal_context` or equivalent
- `buildVisibleConversationMessages` never needs to strip content from user messages
- All existing sanitizer tests continue to pass (sanitizer still present as safety net)

**Prerequisite:** Confirmation that Base44 agent API passes `metadata` fields to the model context  
**Tests:** Unit test: message after correction → `content` field contains no correction markers  
**Rollback:** Revert to prepend path if Base44 metadata not supported  
**Risks:** Highest risk phase; depends on Base44 API capability not confirmed from repository evidence

---

### Phase 6 — Shadow-mode comparison

**Entry:** Phases 1–5 complete behind `CHAT_ORCHESTRATOR_V2_ENABLED=false`  
**Exit:** V2 and V1 paths produce identical output in shadow mode for a representative sample

**Files likely affected:**
- New: shadow comparison harness (non-production, test environment only)
- No production code changes

**Invariants:**
- Shadow mode never affects real user sessions
- Comparison is structural (block lists, strategy decision, turn count) — never compares clinical content

**Tests:** Shadow divergence rate < 1% on representative session sample  
**Rollback:** Disable shadow mode  
**Risks:** Shadow mode requires dual-invocation overhead; must not affect latency

---

### Phase 7 — Controlled rollout and legacy path removal

**Entry:** Shadow-mode comparison passed; Phase 0 tests all pass  
**Exit:** `CHAT_ORCHESTRATOR_V2_ENABLED=true` is the default; legacy path removed

**Files likely affected:**
- `src/pages/Chat.jsx` — remove V1 conditional paths
- `src/lib/workflowContextInjector.js` — remove V1 builder references
- All feature flag checks for `CHAT_ORCHESTRATOR_V2_ENABLED`

**Invariants:**
- All Phase 0 invariants pass at 100% in production
- Rollback within one deploy cycle by reverting flag default

**Tests:** Full E2E suite; regression rate monitored  
**Rollback:** Revert flag default; V1 path preserved for one release cycle  
**Risks:** Unknown production edge cases not covered by test suite; gradual rollout (5%→25%→100%) recommended

---

## 9. Success Assessment

### Assumptions common to all estimates

1. Base44 agent API supports per-message `metadata` passthrough to the model context (required for Phase 5). This is unconfirmed from repository evidence.
2. The model does not have a systematic tendency to ignore `action_permitted=false` instructions when the context is otherwise correct. If it does, `ResponsePolicyEnforcer` alone will not solve this without significant prompt engineering.
3. The lost-turn incidents are primarily caused by polling timeout, not by Base44 server-side message loss. If the server discards messages silently, client-side fixes are insufficient.
4. The team can safely run E2E tests against a staging Base44 instance before production rollout.

### A: Local patches only (no architectural change)

- **Scope:** Individual bug fixes in current Chat.jsx without structural changes
- **Risk:** High — each patch targets a symptom, not the root cause; new patches can interact
- **Rollback quality:** Good per patch, but accumulated patches are hard to revert atomically
- **Migration complexity:** Low
- **Regression surface:** Medium — each patch is small but the substrate is fragile
- **Estimated effort:** 2–4 weeks
- **Probability of solving confirmed failures:** 25–40% — turn correlation and delivery reliability require structural changes; patches cannot add `client_request_id` safely
- **Probability of new regressions:** 35–50% — Chat.jsx has many interacting guards

### B: Targeted architectural repair (phases 1–5 behind feature flag)

- **Scope:** TurnCorrelationRegistry, CanonicalConversationStore, ResponsePolicyEnforcer, InternalInstructionChannel
- **Risk:** Medium — scoped changes, old path preserved, flag-gated
- **Rollback quality:** Excellent — flag rollback is instant
- **Migration complexity:** Medium — requires Phase 5 Base44 API confirmation
- **Regression surface:** Medium — delivery path changes affect every conversation
- **Estimated effort:** 8–14 weeks
- **Probability of solving confirmed failures:** 65–80% — addresses RC-1 through RC-6 directly
- **Probability of new regressions:** 20–35% — delivery path and subscription changes carry inherent race risk

### C: Parallel Chat Orchestrator V2 behind feature flag (full message lifecycle)

- **Scope:** New `ChatOrchestratorV2` component that replaces Chat.jsx message handling end-to-end; Chat.jsx UI preserved
- **Risk:** Medium-high — larger surface area; V1 divergence must be carefully managed
- **Rollback quality:** Excellent — flag rollback
- **Migration complexity:** High — full lifecycle rewrite
- **Regression surface:** High — all message paths affected
- **Estimated effort:** 16–24 weeks
- **Probability of solving confirmed failures:** 75–88% — clean design; no legacy state debt
- **Probability of new regressions:** 25–40% — large new surface

### D: Full chat rewrite

- **Scope:** Replace Chat.jsx, workflowContextInjector.js, all guards, all memory adapters
- **Risk:** Very high — no legacy fallback; all clinical paths affected simultaneously
- **Rollback quality:** Poor — revert requires reverting entire system
- **Migration complexity:** Very high
- **Regression surface:** Very high
- **Estimated effort:** 24–36 weeks
- **Probability of solving confirmed failures:** 60–80% — clean design but introduces new unknowns
- **Probability of new regressions:** 40–60% — entire surface replaced

**Recommendation:** Option B (targeted architectural repair) has the best risk-adjusted probability of success. Phases 1–3 address the P0 and P1 failures. Phase 5 is conditional on Base44 API confirmation.

---

## 10. Minimum Safe Next PR

### What to include

A single PR containing **Phase 0 only**: instrumentation and reproducible failing tests.

**Specifically:**

1. New test: `test/utils/chatTurnCorrelation.test.js`  
   - Tests that `deduplicateMessages` (`Chat.jsx:654–693`) correctly deduplicates by `msg.id`
   - Tests that `getAssistantIdentityKey` is stable when the same message is delivered by polling then subscription
   - Tests that `expectedReplyCountRef` logic (`messages.length + 2`) breaks when a second send overwrites it

2. New test: `test/utils/correctionBlockSanitization.test.js`  
   - Imports `sanitizeConversationMessagesAligned` from `validateAgentOutput.jsx`
   - Asserts that a user message containing a correction block prefix is stripped to user-supplied text only
   - Asserts that a message without a correction block is unchanged

3. New test: `test/utils/actionPermittedEnforcement.test.js`  
   - Imports `buildStrategyContextSection` from `therapistStrategyEngine.js`
   - Asserts that when `action_permitted=false`, the context string contains "no" not "yes"
   - Asserts that there is no post-generation enforcement function exported from `validateAgentOutput.js` that checks `action_permitted` (documents the gap as a failing assertion to be fixed in Phase 3)

4. New test: `test/utils/formulationLedV9.test.js`  
   - Asserts that `getFormulationLedContextForWiring` returns `null` for V9 wiring when `VITE_THERAPIST_UPGRADE_FORMULATION_LED_ENABLED` is not set

5. Extend `src/lib/chatStabilityReport.js`  
   - Add `turn_correlation_mode: 'array_position' | 'client_request_id'` field
   - Add `pending_correction_blocks: number` field
   - These are observability fields only; no behavior change

### What NOT to include

- Any change to `Chat.jsx` message handling
- Any change to `workflowContextInjector.js`
- Any change to `validateAgentOutput.js` or `validateAgentOutput.jsx`
- Any change to `formulationContractGuard.js`
- Any `test.skip` or `test.fixme`

### Why this is safe

- No production behavior changes
- All new tests are isolated unit tests for exported helpers
- Failing tests document confirmed gaps without masking them
- Tests can be independently verified by human review

---

## 11. Open Questions

The following questions cannot be resolved from repository evidence alone and require either production payload capture, Base44 platform API documentation, or staging environment verification.

1. **Does Base44's `agents.addMessage()` API support a `metadata` field that is passed to the model context?**  
   This is required for Phase 5 (InternalInstructionChannel). The repository shows `metadata` passed to `addMessage` at `Chat.jsx:3436` for check-in data, but it is unclear whether Base44 forwards this to the model context or only stores it on the entity.

2. **What is the exact server-side conversation state when the production incident occurred?**  
   The repository evidence confirms that the client-side delivery path could explain lost turns, but it is not possible to confirm from the repository alone whether Base44 also had server-side message loss. A server-side message audit would be required to separate client-side delivery failure from server-side generation failure.

3. **What was the exact final context string sent to the model for the incident turns?**  
   The incident transcript shows "שלח את ההודעה עכשיו" appearing after `action_permitted=false`. Without the exact model input for that generation, it is not provable whether the model received the `action_permitted=false` instruction clearly or whether another block overrode or contradicted it. A bounded, privacy-safe context hash comparison (not the clinical text) would be sufficient to confirm.

4. **Does the production LTS `read_result='weak'` indicate `session_count=1` (warming) or `session_count=0` (never written)?**  
   Both map to `lts_valid=false, lts_session_count=0` in the diagnostic. The distinction matters for whether the root cause is "LTS write never triggered" (system fault) or "LTS is in the expected warm-up period" (by design). A single raw `CompanionMemory` record query would resolve this.

5. **Is `VITE_THERAPIST_UPGRADE_FORMULATION_LED_ENABLED` set in the production environment?**  
   The repository shows the flag evaluation path but not the actual deployed environment configuration. If this flag is set, formulation-led is active in V9 and the `formulation_led_effective: false` report is a diagnostic bug only. If it is not set, the capability is genuinely absent.

6. **Does `ResponsePolicyEnforcer` (Phase 3) risk suppressing valid clinical directives?**  
   In certain clinical contexts (e.g., grounding exercises, safety plans), the therapist model may appropriately give structured action instructions. The pattern list for `ResponsePolicyEnforcer` must be reviewed by a clinical expert before implementation to ensure it does not inadvertently suppress clinically appropriate guidance.

7. **What is the actual maximum generation time observed in production?**  
   The polling timeout (5 attempts × max 8s = ~40s) is the delivery window. If production model latency regularly exceeds this, the polling window should be extended before any other fix is applied.

---

## Appendix A: Test Coverage Assessment

### A.1 What existing tests cover

| Test File | Scope | action_permitted | Grounding Block | LTS/Continuity Divergence |
|---|---|---|---|---|
| `test/utils/wave3cLTSRead.test.js` (1070 lines) | Isolated helpers: `isLTSWeak`, `buildLTSContextBlock`, `readLTSSnapshotWithDiagnostic` | ❌ not tested | ❌ not tested | ✅ `session_count < LTS_MIN` threshold tested (lines 269–276) |
| `test/utils/wave3eLTSDiagnostics.test.js` (564 lines) | Isolated helpers: `buildLTSDiagnosticSnapshot`, `extractLTSStrategyInputs` | ❌ not tested | ❌ not tested | ✅ `lts_session_count: 7` forwarded correctly (lines 220–223) |
| `test/utils/therapistUpgradePhase9.test.js` (1576 lines) | Phase 1–7 contract validation; wiring routing; memory schema; flag isolation | ❌ not tested | ❌ not tested | ❌ not tested |
| `test/utils/formulationLedSeparation.test.js` (388 lines) | `getFormulationLedContextForWiring` for V6/V6-LED/V7–V12; V6-LED injects instructions; V6 does not | ❌ not tested | ❌ not tested | ❌ not tested |
| `test/utils/superCbtAgent.test.js` (326 lines) | Scaffold inspection; super agent not in active routing | ❌ not tested | ❌ not tested | ❌ not tested |

### A.2 Critical gaps — no test coverage exists for

1. **`action_permitted=false` enforcement** — No test verifies that a model response containing an imperative directive is caught or rejected when strategy is STABILISATION. No test checks that `validateAgentOutput.js` enforces this constraint. This gap exists across all 5 surveyed test files.

2. **Grounding correction block isolation** — No test verifies that `sanitizeConversationMessagesAligned` removes a correction block from a user message before rendering. The P0-A safeguard has no test coverage.

3. **Turn correlation under rapid consecutive sends** — No test exercises `expectedReplyCountRef` being overwritten by a second send before the first response commits.

4. **Polling timeout behaviour** — No test verifies that `setIsLoading(false)` is called correctly when all 5 polling attempts are exhausted.

5. **Subscription suppression during loading** — No test documents or verifies the `isLoadingRef.current === true` early return at `Chat.jsx:1770`. This is the most architecturally significant guard in the delivery path and has no test.

6. **Full LTS=0 / Continuity=3 scenario** — Tests cover individual functions (`isLTSWeak`, `readLTSSnapshotWithDiagnostic`) but no integration test covers the scenario where `therapist_session` records exist but no `lts` records do.

7. **`formulation_led_effective` diagnostic vs. runtime divergence** — No test verifies that the diagnostic in `runtimeCapabilityDiagnostic.js` matches the actual injector output.

### A.3 False confidence — helpers tested but runtime path is not

All 5 test files test isolated, exported pure functions. None of them exercise the Chat.jsx runtime path. A test that confirms `isLTSWeak(null) === true` does not prove that `buildV9SessionStartContentAsync` correctly handles an absent LTS record in production. A test that confirms `buildStrategyContextSection` emits "Action permitted: no" does not prove that this text actually reaches the model or that the model respects it.

This false confidence is a significant observability gap: the test suite can pass 100% while all 6 confirmed P0/P1 failures remain undetected.

### A.4 `chatStabilityReport.js` is dead code

`src/lib/chatStabilityReport.js` (44 lines) exports `emitStabilitySummary` and `printFinalStabilityReport`. These functions are **not imported by `Chat.jsx`**. Chat.jsx defines equivalent functions inline (`emitStabilitySummary`, `printFinalStabilityReport`) and exposes `printFinalStabilityReport` on `window.printChatStabilityReport` at `Chat.jsx:3454`. The module file is unused and would be dead code in any bundle analysis.

---

## Appendix B: Key File Reference

| File | Purpose | Key lines |
|---|---|---|
| `src/pages/Chat.jsx` | Central chat runtime (4012 lines) | 326–446 (state/refs), 654–693 (dedup), 1142–1280 (buildVisibleConversationMessages), 1282–1501 (safeUpdateMessages), 1727–1983 (subscription), 2743–3287 (handleSendMessage + pollWithBackoff) |
| `src/lib/workflowContextInjector.js` | V1–V12 context builders, LTS read, precedence guard (2951 lines) | 1203–1216 (formulation-led), 1381–1432 (applyStrategyPrecedenceGuard), 2143–2249 (readLTSSnapshotWithDiagnostic, isLTSWeak), 2277–2310 (isLTSWeak), 2423–2500 (buildV9SessionStartContentAsync) |
| `src/lib/therapistStrategyEngine.js` | Strategy engine (1654 lines) | 763–1077 (determineTherapistStrategy), 1093–1168 (buildStrategyContextSection), 1541–1568 (_buildStrategyState — action_permitted always false from engine) |
| `src/lib/crossSessionContinuity.js` | Cross-session continuity (573 lines) | 213–295 (readCrossSessionContinuity — no type filter) |
| `src/lib/therapistMemoryModel.js` | Memory type constants and schemas (550 lines) | 76 (THERAPIST_MEMORY_TYPE='therapist_session'), 287 (LTS_MEMORY_TYPE='lts'), 371–454 (LTS schema) |
| `src/api/agentWiring.js` | All wiring config objects (1860 lines) | 1383–1442 (V9 wiring — no formulation_led_enabled) |
| `src/api/activeAgentWiring.js` | Routing resolution (452 lines) | 199–354 (resolveTherapistWiring) |
| `src/lib/runtimeCapabilityDiagnostic.js` | Capability diagnostics (355 lines) | 242–256 (formulation_led_effective — different from runtime path) |
| `src/components/utils/validateAgentOutput.js` | Post-generation validation | No `action_permitted` reference — confirmed absence |
| `src/components/utils/validateAgentOutput.jsx` | Guard pipeline and sanitizers | sanitizeConversationMessagesAligned (P0-A safeguard) |
| `src/components/utils/formulationContractGuard.js` | Grounding/formulation guards | buildPendingGroundingCorrectionBlock, buildPendingFormulationCorrectionBlock |
| `base44/functions/writeLTSSnapshot/entry.ts` | LTS write (312 lines) | 243–296 (CompanionMemory.create with memory_type='lts') |
| `base44/functions/retrieveTherapistMemory/entry.ts` | Session memory read (187 lines) | Filters by inner `therapist_memory_version='1'`, not outer memory_type |

---

*End of audit report.*  
*Audit performed by investigation only — no production code modified.*
