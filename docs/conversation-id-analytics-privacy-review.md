# conversation_id Analytics Privacy Review — Mindful Path CBT App

**Audit Type:** Follow-Up Privacy Audit (Audit 4)  
**Scope:** `conversation_id` in analytics and logging payloads only  
**Status:** Audit-only — no runtime code was changed  
**Date:** 2026-03-10  
**Relates to:** `docs/private-entity-data-flow-audit.md` — Risk R1 (user_email in analytics)

---

## 1. Background

A prior audit (see `docs/private-entity-data-flow-audit.md`, Risk R1) identified that `user_email` was being sent in analytics events alongside `conversation_id`. A subsequent fix removed `user_email` from analytics payloads. This audit evaluates whether `conversation_id` remaining in those payloads creates meaningful re-identification risk on its own.

**What this audit covers:**
- All code paths where `conversation_id` is sent to `base44.analytics.track()` or written to server logs
- Whether `conversation_id` can be linked back to a user identity through repository-visible mechanisms
- Classification of findings by risk level

**What this audit does not cover:**
- Removing or modifying any analytics payload (code fix not in scope)
- Entity writes that are scoped to the authenticated user (not analytics sinks)
- Base44 platform internals not visible in this repository

---

## 2. All Identified Analytics / Logging Paths for `conversation_id`

### 2.1 `base44.analytics.track()` — Backend (via `functions/logProtocolMetrics.ts`)

This backend Deno function is invoked by the client-side `protocolMetricsTracker.jsx` helper. It receives a validated, authenticated request and then calls `base44.analytics.track()` for up to five event types.

**Authenticated:** Yes — function requires `base44.auth.me()` and returns 401 if no user.

| Event Name | Fields Sent Alongside `conversation_id` | Has PII? |
|---|---|---|
| `cbt_protocol_started` | `protocol` | No raw PII in analytics payload after email removal |
| `homework_response` | `homework_offered` (bool), `homework_accepted` (bool), `protocol` | No raw PII |
| `metrics_captured` | `has_before` (bool), `has_after` (bool), `protocol` | No raw PII |
| `behavioral_experiment_completed` | `has_prediction` (bool), `has_outcome` (bool), `belief_change` (number), `protocol` | No raw PII |
| `chat_ui_incident` | `loop_detected` (bool), `json_leakage` (bool) | No raw PII |

**Source files:**
- `functions/logProtocolMetrics.ts` (lines 31–90) — server-side analytics calls
- `src/components/utils/protocolMetricsTracker.jsx` (lines 20–57) — client-side caller

**Observation:** After the prior fix removing `user_email`, these events contain only `conversation_id` and protocol-level metadata (booleans and enum strings). No raw PII is visible in the event payload itself.

---

### 2.2 `base44.analytics.track()` — Frontend Crisis Detection (via `src/pages/Chat.jsx`)

The Chat page calls `base44.analytics.track()` directly from the browser when crisis detection fires (both regex and LLM-layer detection paths).

| Event Name | Fields Sent Alongside `conversation_id` | Has PII? |
|---|---|---|
| `crisis_detected_regex` (line 846) | `reason_code`, `surface` | No raw PII in analytics payload; `reason_code` is a clinical category string |
| `crisis_detected_llm_layer2` (line 879) | `severity`, `confidence` (number), `surface` | No raw PII |

**Source file:** `src/pages/Chat.jsx` (lines 846–853, 879–887)

**Observation:** These crisis analytics events are the highest-sensitivity path. The presence of `conversation_id` alongside `crisis_detected` signals is clinically significant because it allows correlation of a crisis event to a specific conversation session. See Section 4.2 for risk analysis.

---

### 2.3 `base44.analytics.track()` — Frontend Feedback (via `src/components/chat/MessageFeedback.jsx`)

When a user submits a thumbs-up or thumbs-down rating on an AI response, `MessageFeedback.jsx` calls `base44.analytics.track()` with `conversation_id`.

| Event Name | Fields Sent Alongside `conversation_id` | Has PII? |
|---|---|---|
| `message_feedback_given` (line 26) | `feedback_type` (helpful/not_helpful), `agent_name`, `context` | No raw PII |

**Source file:** `src/components/chat/MessageFeedback.jsx` (lines 26–34)

**Observation:** Low-clinical-sensitivity event. The `conversation_id` links the feedback to a session but carries no clinical content itself.

---

### 2.4 Analytics Events That Do NOT Include `conversation_id` (Confirmed Safe)

For completeness, the following analytics events were reviewed and confirmed to **not** include `conversation_id`:

| Event Name | Source | Notes |
|---|---|---|
| `consent_accepted` | `src/components/chat/InlineConsentBanner.jsx:18` | Only `surface`, `safety_profile`, `timestamp` |
| `risk_panel_dismissed` | `src/components/chat/InlineRiskPanel.jsx:10` | Only `surface`, `timestamp` |
| `conversation_started` | `src/pages/Chat.jsx:755` | Only `safety_profile`, `intent`, `agent_name` |
| `crisis_detected_llm` | `functions/enhancedCrisisDetector.ts:71` | Only `severity`, `confidence`, `reason` — no `conversation_id` |

---

### 2.5 Server Console Logging (Not an External Analytics Sink)

| Location | What Is Logged | Type |
|---|---|---|
| `functions/sanitizeConversation.ts:72` | `conversation_id` + sanitized message count | Server console log |

**Observation:** This is an operational console log, not sent to `base44.analytics.track()` or any external service visible in the repo. Risk is low (ID only, no content, no user email).

---

### 2.6 Compliance Report Output (Not an Analytics Event)

| Location | What Is Included | Access |
|---|---|---|
| `functions/generateComplianceReport.ts:112` | `conversation_id`, `surface`, `reason_code`, `date` per crisis alert (detailed mode only) | Admin-only report endpoint |

**Observation:** `conversation_id` appears in the detailed compliance report output when `report_type === 'detailed'`. This is an admin-facing report, not a live analytics event stream. The data originates from `CrisisAlert` entity records. See Section 4.3 for risk analysis.

---

### 2.7 Non-Analytics Internal Uses (No External Exposure Visible)

The following uses of `conversation_id` are internal operational lookups and entity writes — they do not send data to an analytics sink and are included here only for completeness:

| Location | Usage | Analytics? |
|---|---|---|
| `functions/normalizeAgentMessage.ts:18–25` | Looks up agent conversation by ID for message normalization | No |
| `functions/sanitizeAgentOutput.ts:85–131` | Looks up conversation by ID to detect LLM reasoning leakage | No |
| `functions/testReasoningLeakage.ts:98–153` | Diagnostic/test function for reasoning leakage | No |
| `src/components/coaching/CoachingChat.jsx:101` | `CrisisAlert.create()` entity write | No (entity write, not analytics) |
| `src/components/ai/DraggableAiCompanion.jsx:446` | `CrisisAlert.create()` entity write | No (entity write, not analytics) |
| `src/components/chat/ThoughtWorkSaveHandler.jsx:57` | `ThoughtJournal.create()` in `custom_fields` | No (entity write, not analytics) |
| `src/pages/CrisisAlerts.jsx:205–209` | Displays `conversation_id` in admin crisis alerts UI | No (display only) |
| `src/components/settings/DataPrivacy.jsx:122` | Uses `agent_conversation_id` for user data deletion flow | No (operational) |

---

## 3. Whether `conversation_id` Can Be Linked Back to a User

### 3.1 What Is Known About `conversation_id`

From the data model (`docs/data-model.md`, `CrisisAlert` entry at line 645):
> "Linked to the authenticated user; may reference Conversation (conversation_id)"

From the entity index (`src/api/entities/index.js`, line 106):
> "Conversation — Real-time AI companion conversation thread with message history."

`conversation_id` is the primary key of a `Conversation` entity, which is:
- User-scoped (linked to the authenticated user who owns it)
- Contains message history (sensitive mental health disclosures)
- Deletable by the user (recorded in `UserDeletedConversations`)

**Each `conversation_id` value uniquely identifies a conversation session belonging to one user.**

### 3.2 Repository-Visible Join Paths

#### Join Path A — CrisisAlert Entity + Analytics Event (Confirmed in Repo)

The most direct re-identification path visible in the repository:

1. **Step 1:** `CrisisAlert.create()` is called in the same code block as `analytics.track()` in `src/pages/Chat.jsx` (lines 838–853 for regex path, 871–887 for LLM path).
2. **Step 2:** The `CrisisAlert` entity record stores: `user_email`, `conversation_id`, `reason_code`, `surface`.
3. **Step 3:** The analytics event (`crisis_detected_regex` or `crisis_detected_llm_layer2`) stores: `reason_code`, `surface`, `conversation_id`.
4. **Step 4:** An operator with read access to both the `CrisisAlert` entity store AND the analytics event store could join on `conversation_id` to link `user_email` to the analytics events.

**This join path is confirmed in the repository code.** It means that even without `user_email` in the analytics payload, the `conversation_id` in crisis analytics events can be cross-referenced against the `CrisisAlert` entity to recover the user email.

#### Join Path B — Base44 Platform Session Auto-Association (Unclear)

It is standard behavior for analytics platforms to automatically associate tracked events with the authenticated user's session or identity (user ID, session token, or device fingerprint). The Base44 SDK (`@base44/sdk@0.8.6`) initializes with an authenticated session via `createClientFromRequest(req)` (backend) or via the client `createClient()` (frontend).

**If the Base44 platform automatically associates tracked events with the authenticated user identity:**
- All `analytics.track()` calls — including those with `conversation_id` — would be linked to the user in the analytics store
- This would make `conversation_id` effectively co-located with user identity in every analytics event
- This is a **standard behavior for SaaS analytics platforms** and should be assumed unless the platform documentation explicitly states otherwise

**This join path cannot be confirmed or denied from the repository alone.** It depends on Base44 platform internals. It is labeled **Unclear** and requires human review of the Base44 configuration.

#### Join Path C — Compliance Report + External Access (Limited Risk)

The compliance report (`functions/generateComplianceReport.ts`) in detailed mode exposes `conversation_id` alongside `reason_code`, `surface`, and `date` for up to 100 crisis alerts. This is admin-only and not an external analytics stream.

**Risk is low** because the report requires admin authentication and does not include `user_email` in its output. However, if an admin can also query `CrisisAlert` entity records directly (which they likely can), Join Path A still applies.

---

## 4. Risk Classification

### 4.1 Confirmed Safe / No Issue

| Finding | Classification |
|---|---|
| `consent_accepted`, `risk_panel_dismissed`, `conversation_started`, `crisis_detected_llm` — analytics events with no `conversation_id` | ✅ **SAFE — No issue** |
| `sanitizeConversation.ts` server log — ID only, internal console | ✅ **SAFE — No issue** |
| Internal operational uses (`normalizeAgentMessage.ts`, `sanitizeAgentOutput.ts`) — no analytics sink | ✅ **SAFE — No issue** |
| `ThoughtWorkSaveHandler.jsx` — entity write scoped to authenticated user | ✅ **SAFE — No issue** |
| `message_feedback_given` analytics event — contains `conversation_id` but no clinical content alongside it | ✅ **LOW — Review later** |
| `chat_ui_incident` analytics event — UI stability incident, not clinical content | ✅ **LOW — Review later** |
| Protocol metrics events (`cbt_protocol_started`, `homework_response`, `metrics_captured`, `behavioral_experiment_completed`) — after email removal, payload contains only booleans and protocol name alongside `conversation_id` | 🟡 **LOW — Review later** (see Section 4.2) |

### 4.2 Low / Review-Later Concerns

**Protocol metrics events in `logProtocolMetrics.ts`:**  
After `user_email` was removed, these events contain `conversation_id` alongside clinical-category metadata (which CBT protocol, whether homework was accepted, whether anxiety was measured). Without user email in the payload, the events are pseudonymous at the payload level. However:
- If Base44 auto-associates events with user identity (Join Path B), the `conversation_id` becomes linked to user identity in the analytics store
- If an operator queries analytics events by `conversation_id`, they can infer clinical information (e.g., "this session used the thought-record protocol, homework was rejected, anxiety was measured")
- This is **low** when considered in isolation but becomes **medium** when combined with Join Path B being likely

**`message_feedback_given` and `chat_ui_incident` analytics events:**  
These carry `conversation_id` but contain no clinical content themselves. The risk is that `conversation_id` is present in the analytics store and could be used for session-level behavioral tracking. Considered low.

### 4.3 Medium Concerns — Human Review Recommended

**Crisis analytics events (`crisis_detected_regex`, `crisis_detected_llm_layer2`) in `src/pages/Chat.jsx`:**

**Classification: 🟠 MEDIUM — Human review recommended**

These events have the highest re-identification potential because:
1. The event name itself signals a crisis (highly sensitive mental health information)
2. `conversation_id` in the same event identifies which session triggered the crisis
3. **Join Path A is confirmed:** In the same code block that fires the analytics event, `CrisisAlert.create()` is called with `user_email` + `conversation_id` together. An internal operator with access to both entity records and analytics data can join on `conversation_id` to link the crisis event to a user email
4. **Join Path B is likely:** The Base44 SDK likely auto-associates the event with the authenticated user session

**The combination of crisis event semantics + a joinable conversation_id creates a meaningful risk, even without explicit email in the analytics payload.**

### 4.4 Unclear Boundaries

The following boundaries cannot be confirmed from the repository alone and require human review of Base44 platform configuration:

| Boundary | Why Unclear |
|---|---|
| Whether `base44.analytics.track()` automatically associates events with the authenticated user identity | The Base44 SDK configuration is not visible in the repo; this is standard SaaS platform behavior but cannot be confirmed |
| Whether `base44.analytics.track()` routes data to any external third-party analytics service (e.g., Mixpanel, Segment, Amplitude) | The routing destination is a Base44 platform configuration, not visible in this repository |
| Whether the Base44 analytics data store is accessible to operators who can also query entity records (enabling Join Path A at scale) | Depends on Base44 platform RBAC configuration |

---

## 5. Summary of Risk Findings

| Path | Event / Location | Risk Level | Join to User Identity |
|---|---|---|---|
| `cbt_protocol_started` in `logProtocolMetrics.ts` | Protocol analytics | 🟡 LOW | Via Platform auto-assoc (unclear) |
| `homework_response` in `logProtocolMetrics.ts` | Protocol analytics | 🟡 LOW | Via Platform auto-assoc (unclear) |
| `metrics_captured` in `logProtocolMetrics.ts` | Protocol analytics | 🟡 LOW | Via Platform auto-assoc (unclear) |
| `behavioral_experiment_completed` in `logProtocolMetrics.ts` | Protocol analytics | 🟡 LOW | Via Platform auto-assoc (unclear) |
| `chat_ui_incident` in `logProtocolMetrics.ts` | UI incident analytics | 🟡 LOW | Via Platform auto-assoc (unclear) |
| `message_feedback_given` in `MessageFeedback.jsx` | Feedback analytics | 🟡 LOW | Via Platform auto-assoc (unclear) |
| `crisis_detected_regex` in `Chat.jsx` | Crisis detection analytics | 🟠 MEDIUM | **Confirmed via CrisisAlert entity join**; also likely via platform auto-assoc |
| `crisis_detected_llm_layer2` in `Chat.jsx` | Crisis detection analytics | 🟠 MEDIUM | **Confirmed via CrisisAlert entity join**; also likely via platform auto-assoc |
| Server console log in `sanitizeConversation.ts` | Operational log | ✅ LOW | No external sink |
| Compliance report in `generateComplianceReport.ts` | Admin report | ✅ LOW | Admin-only; no email in report output |

---

## 6. Whether a Follow-Up Code Fix Is Recommended

**Yes — a follow-up code fix is recommended for the crisis analytics events.**

### 6.1 High-Priority Recommendation: Crisis Events in `src/pages/Chat.jsx`

**Affected files:**
- `src/pages/Chat.jsx` (lines 846–853: `crisis_detected_regex`, lines 879–887: `crisis_detected_llm_layer2`)

**Problem:**  
`conversation_id` in crisis analytics events creates a confirmed triangulation path via the `CrisisAlert` entity (which stores `user_email` + `conversation_id` in the same record). This means an operator with access to both analytics events and entity records can link a user's email to a crisis event in the analytics store, even though `user_email` was removed from the analytics payload.

**Recommended smallest safe fix:**  
Remove `conversation_id` from the `crisis_detected_regex` and `crisis_detected_llm_layer2` analytics events. These events do not require `conversation_id` to be useful — the `reason_code`, `severity`, and `surface` fields provide sufficient signal for aggregate crisis monitoring without creating a user-linkable identifier.

```javascript
// BEFORE (current state)
base44.analytics.track({
  eventName: 'crisis_detected_regex',
  properties: {
    reason_code: reasonCode,
    surface: 'chat',
    conversation_id: currentConversationId || 'none'  // ← remove this
  }
});

// AFTER (recommended)
base44.analytics.track({
  eventName: 'crisis_detected_regex',
  properties: {
    reason_code: reasonCode,
    surface: 'chat'
  }
});
```

The same change should apply to `crisis_detected_llm_layer2` (remove `conversation_id` from properties).

**This fix does not affect:** the `CrisisAlert` entity creation (which legitimately requires `conversation_id` for crisis management purposes), the LLM detection logic, the UI, or any other behavior.

### 6.2 Lower-Priority Recommendation: Protocol Metrics and Feedback Events

**Affected files:**
- `functions/logProtocolMetrics.ts` (lines 35, 48, 61, 75, 87)
- `src/components/chat/MessageFeedback.jsx` (line 30)

**Problem:**  
`conversation_id` in protocol metrics and feedback analytics events creates a session-linkable identifier. If Base44 analytics auto-associates events with user identity (the likely behavior for an authenticated analytics platform), these events are de facto linked to a specific user's session.

**Recommended smallest safe fix:**  
- For protocol metrics events: Remove `conversation_id` from all five event types in `logProtocolMetrics.ts`. The protocol-level metadata (which CBT protocol, boolean completion flags) is sufficient for aggregate quality monitoring.
- For feedback events: Remove `conversation_id` from `message_feedback_given` in `MessageFeedback.jsx`. The `agent_name` and `feedback_type` provide sufficient signal for response quality monitoring.

**However:** This is a lower-priority recommendation. The clinical content of these events is already aggregate (booleans, enum strings) and the events are less sensitive than crisis events. Prioritize the crisis event fix first.

### 6.3 Recommendation: Confirm Base44 Analytics Auto-Association Behavior

**Action required before any code fix:**  
Review Base44 platform analytics configuration to confirm whether `base44.analytics.track()` automatically associates events with the authenticated user's identity. This clarifies whether the risk is:
- **Already fully realized** (if platform auto-associates) — making the fix urgent
- **Contingent on operator cross-referencing** (if platform does not auto-associate) — making the fix still recommended but less urgent for non-crisis events

---

## 7. Confirmed Boundaries (Safe)

The following boundaries are confirmed safe based on repository-visible code:

1. **No raw message content in analytics events** — None of the analytics events containing `conversation_id` include actual conversation message text or thought journal content.
2. **No user email in analytics payloads** — After the prior fix (Audit 3), `user_email` is no longer present in `analytics.track()` payloads in either `logProtocolMetrics.ts` or `enhancedCrisisDetector.ts`.
3. **`enhancedCrisisDetector.ts` is clean** — The backend `crisis_detected_llm` analytics event does not include `conversation_id` (only `severity`, `confidence`, `reason`).
4. **`consent_accepted`, `risk_panel_dismissed`, `conversation_started` are clean** — These events contain no `conversation_id` and no PII.
5. **Internal operational uses are scoped** — `normalizeAgentMessage.ts`, `sanitizeAgentOutput.ts`, and `sanitizeConversation.ts` use `conversation_id` for internal processing only, not for analytics.
6. **Compliance report is admin-only** — The detailed compliance report contains `conversation_id` but requires admin authentication and does not include user email in its output payload.

---

## 8. Unclear Boundaries

1. **Base44 analytics auto-association** — It is not possible to confirm from this repository whether `base44.analytics.track()` automatically includes the authenticated user's identity (user ID, session token) as an implicit field on every tracked event. This is standard behavior for most analytics platforms and should be assumed as likely until confirmed otherwise.

2. **Third-party routing of analytics events** — Whether `base44.analytics.track()` routes event data to an external analytics service (Mixpanel, Segment, Amplitude, etc.) is determined by the Base44 platform configuration and is not visible in this repository.

3. **Operator access model** — Whether analytics operators have simultaneous read access to entity records (enabling Join Path A at scale across all users) depends on Base44 RBAC configuration, not visible in the repository.

---

## 9. Files Audited

| File | Relevant Lines | Finding |
|---|---|---|
| `functions/logProtocolMetrics.ts` | 31–90 | 5 analytics events with `conversation_id`; `user_email` confirmed absent |
| `src/components/utils/protocolMetricsTracker.jsx` | 20–57 | Client-side caller; passes `conversation_id` to backend |
| `src/pages/Chat.jsx` | 836–887 | 2 crisis analytics events with `conversation_id`; confirmed join path via `CrisisAlert` |
| `src/components/chat/MessageFeedback.jsx` | 26–34 | 1 feedback analytics event with `conversation_id` |
| `src/components/ai/DraggableAiCompanion.jsx` | 441–453 | `CrisisAlert.create()` entity write — not analytics |
| `src/components/coaching/CoachingChat.jsx` | 96–109 | `CrisisAlert.create()` entity write — not analytics |
| `src/components/chat/ThoughtWorkSaveHandler.jsx` | 56–58 | `ThoughtJournal.create()` entity write — not analytics |
| `functions/sanitizeConversation.ts` | 72 | Server console log — not external analytics |
| `functions/generateComplianceReport.ts` | 108–113 | Admin-only report — not an analytics stream |
| `functions/enhancedCrisisDetector.ts` | 71–78 | Analytics event confirmed WITHOUT `conversation_id` — safe |
| `src/components/chat/InlineConsentBanner.jsx` | 18–25 | Analytics event confirmed WITHOUT `conversation_id` — safe |
| `src/components/chat/InlineRiskPanel.jsx` | 10–16 | Analytics event confirmed WITHOUT `conversation_id` — safe |
| `src/api/base44Client.js` | All | SDK initialization — analytics routing destination not visible |
| `docs/private-entity-data-flow-audit.md` | R1 section | Prior audit context; `user_email` in analytics confirmed removed |
| `docs/data-model.md` | CrisisAlert, TherapyFeedback | Entity schema context |

---

## 10. No Production Code Was Changed

This document is the only file created or modified as part of this audit. No runtime code, entity schemas, backend functions, analytics behavior, agent wiring, or any other application logic was altered.

---

## 11. Recommended Next Follow-Up Task

If this audit is accepted, the recommended next follow-up task is:

> **AUDIT 4 FOLLOW-UP CODE FIX:** Remove `conversation_id` from crisis detection analytics events in `src/pages/Chat.jsx` (lines 851 and 885). This is the smallest safe fix addressing the highest-risk confirmed join path. A separate, lower-priority task can remove `conversation_id` from protocol metrics events in `functions/logProtocolMetrics.ts` and feedback events in `src/components/chat/MessageFeedback.jsx`.

Both tasks are additive-safe (removing a field from an analytics payload does not break any existing functionality).

---

*Last updated: 2026-03-10 — Audit 4 (conversation_id analytics privacy review)*
