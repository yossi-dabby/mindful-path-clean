# Private Entity Data Flow Audit — Mindful Path CBT App

**Audit type:** Read-only data flow analysis  
**Scope:** All private/user-scoped entity data flows across the repository  
**Date:** 2026-03-10  
**Status:** Complete — no production code was changed  

---

## Contents

1. [Private / User-Scoped Entities Identified](#1-private--user-scoped-entities-identified)
2. [Entity-by-Entity Data Flow Trace](#2-entity-by-entity-data-flow-trace)
3. [Sensitive Boundary Crossing Audit](#3-sensitive-boundary-crossing-audit)
4. [Confirmed Safe Boundaries](#4-confirmed-safe-boundaries)
5. [Unclear Boundaries — Human Review Recommended](#5-unclear-boundaries--human-review-recommended)
6. [Confirmed Risks](#6-confirmed-risks)
7. [Not Found / No Evidence of Flow](#7-not-found--no-evidence-of-flow)
8. [Recommended Next Actions](#8-recommended-next-actions)
9. [Audit Scope Notes](#9-audit-scope-notes)

---

## 1. Private / User-Scoped Entities Identified

### 1.1 Core Private Entities (Policy-Designated)

These six entities are explicitly designated as private in `docs/copilot-safety-rules.md`,
`docs/repository-architecture-map.md`, `docs/copilot-repo-handoff.md`, and
`docs/ai-entity-classification.md`. They must **never** appear in shared retrieval
pipelines or be exposed cross-user.

| Entity | Domain | Why Private |
|---|---|---|
| `ThoughtJournal` | CBT Work | CBT thought records: situation, automatic thoughts, distortions, evidence, balanced thought |
| `Conversation` | Coaching and Sessions | Real-time AI companion conversation thread with message history |
| `CaseFormulation` | CBT Work | CBT case conceptualization: core beliefs, early experiences, maintaining factors |
| `MoodEntry` | Emotional Tracking | Daily mood logs with emotions, intensity, energy, sleep, triggers |
| `CompanionMemory` | Coaching and Sessions | Persistent AI companion memory for long-term context continuity |
| `UserDeletedConversations` | System and Supporting | Tombstone log of deleted conversation IDs |

**Source of designation:** `src/api/entities/index.js`, `docs/ai-entity-classification.md`,
`docs/ai-agent-access-policy.md`, `docs/repository-architecture-map.md`

### 1.2 Additional Sensitive / Semi-Private Entities

These entities are not in the strict private list but contain user-specific or
clinically sensitive data that warrants careful handling.

| Entity | Domain | Sensitivity Rationale |
|---|---|---|
| `CoachingSession` | Coaching and Sessions | Structured AI coaching records with session stage and arc |
| `SessionSummary` | Coaching and Sessions | AI-generated summary of completed coaching sessions |
| `CrisisAlert` | Safety and Crisis | Crisis signal records with severity and context |
| `Goal` | Goals and Progress | User's personal SMART goals, milestones, progress |
| `Subscription` | System and Supporting | Billing tier, Stripe IDs, subscription status |
| `HealthMetric` | Emotional Tracking | Physical wellness metrics (sleep, exercise, hydration) |
| `ExerciseRecommendationFeedback` | Exercises | User rating/feedback on AI-recommended exercises |
| `TherapyFeedback` | Coaching and Sessions | User feedback on therapy or coaching sessions |
| `SavedResource` | Resources and Media | Resources bookmarked by the user |
| `VideoProgress` | Resources and Media | User's video watch progress |
| `UserStreak` | Gamification | Consecutive-day activity streaks per user |
| `UserPoints` | Gamification | Accumulated points per user |
| `MindGameActivity` | Gamification | Cognitive/therapeutic mind game session records |
| `UserJourneyProgress` | Journeys and Flows | Progress through structured therapeutic programs |
| `ProactiveReminder` | Reminders | AI-generated proactive nudges for re-engagement |
| `JournalReminder` | Reminders | Scheduled reminders tied to journaling habits |
| `GoalReminder` | Reminders | Scheduled reminders tied to goals |
| `AppNotification` | System | In-app notification records |
| `SharedProgress` | Community | Progress milestones explicitly shared by the user |

---

## 2. Entity-by-Entity Data Flow Trace

### 2.1 ThoughtJournal

**Classification:** PRIVATE (policy-designated)

**Reads:**
- `src/pages/Journal.jsx` — lists and renders thought records for the authenticated user
- `src/pages/JournalDashboard.jsx` — aggregated journal dashboard view
- `src/pages/ThoughtCoach.jsx` — reads and creates thought records
- `src/components/journal/ThoughtRecordCard.jsx` — renders individual records
- `src/components/journal/ThoughtRecordForm.jsx` — read/write for editing
- `src/components/journal/AiEntrySummary.jsx` — reads entries to generate AI summary
- `src/components/journal/AiJournalPrompts.jsx` — reads entries to generate prompts
- `src/components/journal/AiJournalSuggestions.jsx` — reads for suggestions
- `src/components/journal/AiTrendsSummary.jsx` — reads for trend analysis
- `src/components/goals/LinkedJournalEntries.jsx` — reads entries linked to a goal
- `src/components/coaching/PersonalizedInsights.jsx` — reads for insights
- `src/components/progress/EnhancedProgressDashboard.jsx` — reads for progress
- `src/components/home/PersonalizedFeed.jsx` — reads for feed personalization
- `functions/checkProactiveNudges.ts` (line 77) — reads to check days since last entry

**Writes:**
- `src/components/chat/ThoughtWorkSaveHandler.jsx` (line 62) — creates a `ThoughtJournal` record after CBT chat session (uses structured data extracted from conversation)
- `src/components/journal/ThoughtCoachWizard.jsx` — creates records from wizard
- `src/pages/ThoughtCoach.jsx` (line 83) — creates records
- `functions/retentionCleanup.ts` (line 65–71) — deletes old records per user retention setting

**Agent wiring:** Not present in `ALLOWED_ENTITY_TYPES` for backfill or retrieval. Included in CBT Therapist wiring as `preferred` entity at `source_order: 3` (highest priority working material). Not in AI Companion wiring (prohibited).

**Indexing/retrieval pipeline:** Not indexed. Not in `ALLOWED_ENTITY_TYPES` in `backfillKnowledgeIndex.ts` or `retrieveRelevantContent.ts`.

**Frontend state exposure:** Displayed on Journal and JournalDashboard pages. Content is user-only (Base44 SDK enforces `created_by` scoping per authenticated session).

**Analytics/logging:**
- `functions/checkProactiveNudges.ts` (line 86): `lastJournal.created_date` is used for date comparison only (not logged). The entry's creation date is used to determine inactivity, not to log the entry content.
- No raw thought journal content is logged.

---

### 2.2 Conversation

**Classification:** PRIVATE (policy-designated)

**Reads:**
- `src/pages/Chat.jsx` — reads via `base44.agents.getConversation`, `base44.agents.listConversations`
- `src/components/chat/ConversationsList.jsx` — lists conversations
- `functions/sanitizeAgentOutput.ts` (line 98) — reads via `base44.asServiceRole.agents.getConversation` for admin cleanup
- `functions/sanitizeConversation.ts` (line 25) — reads via `base44.agents.getConversation` for message sanitization
- `functions/retentionCleanup.ts` (line 85) — reads via `base44.agents.listConversations` for archiving

**Writes (creates/updates):**
- `src/pages/Chat.jsx` — creates via `base44.agents.createConversation`; updates via `base44.agents.updateConversation` (message content)
- `functions/sanitizeAgentOutput.ts` (line 123) — updates messages in a conversation (admin function, requires ownership check)
- `functions/retentionCleanup.ts` (line 96) — creates `UserDeletedConversations` record for archiving (not actual Conversation write)

**Agent wiring:** Included in both `CBT_THERAPIST_WIRING_HYBRID` and `AI_COMPANION_WIRING_HYBRID` as caution-layer entity (`caution_layer: true`, `secondary_only: true`, lowest source_order). Not in Steps 1–3 wiring.

**Indexing/retrieval pipeline:** Not indexed. Not in `ALLOWED_ENTITY_TYPES`.

**Frontend state exposure:** Message history rendered in Chat.jsx. `sanitizeConversationMessages` utility in `src/components/utils/validateAgentOutput.jsx` processes messages client-side for display. Conversation messages are not stored in external state stores or caches beyond React Query.

**Cross-boundary flows:**
- `functions/extractThoughtWorkData.ts` — receives `conversation_messages` array from the caller (ThoughtWorkSaveHandler) and passes the message content to `base44.integrations.Core.InvokeLLM` for structured extraction. The LLM call occurs within the Base44 platform runtime. See Risk R3 below.
- `functions/postLlmSafetyFilter.ts` — receives `message_content` and `conversation_metadata` (including language only, not full conversation) for LLM output filtering. No conversation content is stored externally.

**Console logging:**
- `functions/sanitizeConversation.ts` (line 72): Logs `conversation_id` and sanitized count — no message content.
- `src/pages/Chat.jsx` (line 482): Logs `currentConversationId` (ID only, not content).

---

### 2.3 MoodEntry

**Classification:** PRIVATE (policy-designated)

**Reads:**
- `src/pages/MoodTracker.jsx` — lists and renders mood entries
- `src/components/mood/DetailedMoodForm.jsx` — create/read for mood logging
- `src/components/home/MoodCheckIn.jsx` — reads recent mood
- `src/components/home/StandaloneDailyCheckIn.jsx` — reads/creates mood entries
- `src/components/home/TodaysFocus.jsx` — reads mood for personalized focus
- `src/components/home/PersonalizedFeed.jsx` — reads for feed personalization
- `src/components/home/AiPersonalizedFeed.jsx` — reads for AI feed
- `src/components/health/HealthInsights.jsx` — reads for health trend analysis
- `src/components/progress/EnhancedProgressDashboard.jsx` — reads for progress dashboard
- `src/pages/AdvancedAnalytics.jsx` — reads for analytics visualizations
- `src/pages/Progress.jsx` — reads for progress display
- `functions/checkProactiveNudges.ts` (line 49) — reads to check days since last mood log

**Writes:**
- `src/components/mood/DetailedMoodForm.jsx` — creates mood entries
- `src/components/home/MoodCheckIn.jsx` — creates mood entries
- `functions/retentionCleanup.ts` (lines 45–58) — deletes old entries per user retention setting

**Agent wiring:** Included in AI Companion wiring as `preferred` at `source_order: 2`. Included in CBT Therapist restricted layer (`calibration_only: true`, `source_order: 11`).

**Indexing/retrieval pipeline:** Not indexed. Not in `ALLOWED_ENTITY_TYPES`.

**Tests:** `tests/helpers/ui.ts` (line 256) — mock intercepts `MoodEntry` endpoint returning an empty array. No real mood data in test fixtures.

**Frontend state exposure:** Displayed on MoodTracker, Progress, and Home pages. User-scoped by Base44 SDK authentication.

---

### 2.4 CompanionMemory

**Classification:** PRIVATE (policy-designated)

**Reads:**
- `src/components/ai/DraggableAiCompanion.jsx` (line 168) — reads to hydrate companion context (`base44.entities.CompanionMemory.filter(...)`)
- `src/components/ai/AiCompanion.jsx` — reads companion memory

**Writes:**
- Not found in direct entity write calls from the frontend. CompanionMemory is written by the AI Companion agent itself (via agent tool_configs in the Base44 runtime).
- `src/components/ai/DraggableAiCompanion.jsx` — sends messages to AI Companion agent which may write memories as part of agent execution

**Agent wiring:** CBT Therapist — restricted layer (`read_only: true`, `source_order: 10`). AI Companion — **preferred** at `source_order: 1` (highest priority, non-clinical role).

**Indexing/retrieval pipeline:** Not indexed. Not in `ALLOWED_ENTITY_TYPES`.

**Frontend state exposure:** Used by AI Companion to personalize responses. Not directly rendered to users as raw data; only influences companion's tone and responses.

---

### 2.5 CaseFormulation

**Classification:** PRIVATE (policy-designated)

**Reads:**
- `src/components/coaching/CoachingSessionWizard.jsx` — reads or references case formulation in coaching context
- `src/api/agentWiring.js` — referenced in wiring config only

**Writes:**
- `src/components/coaching/CoachingSessionWizard.jsx` — creates formulation records during coaching

**Agent wiring:** CBT Therapist — caution-layer entity (`read_only: true`, `unrestricted: false`, `secondary_only: true`, `caution_layer: true`, `source_order: 12`). AI Companion — **prohibited** (confirmed absent from all AI Companion wiring configs).

**Indexing/retrieval pipeline:** Not indexed. Not in `ALLOWED_ENTITY_TYPES`.

**Frontend state exposure:** Limited — appears in coaching context only. The entity contains the most clinically sensitive data in the system (core beliefs, early experiences).

---

### 2.6 UserDeletedConversations

**Classification:** PRIVATE (policy-designated)

**Reads:**
- `src/pages/Chat.jsx` — reads to filter out deleted conversations from the list
- `functions/retentionCleanup.ts` (lines 89–90) — reads to build a set of already-archived IDs

**Writes:**
- `functions/retentionCleanup.ts` (lines 96–99) — creates tombstone records for archived conversations

**Agent wiring:** Not present in any agent wiring configuration. Prohibited.

**Indexing/retrieval pipeline:** Not indexed. Not in `ALLOWED_ENTITY_TYPES`.

**Tests:** `tests/helpers/ui.ts` (line 191) — mock intercepts endpoint returning empty array. No real deletion records in test fixtures.

**Frontend state exposure:** Only used to filter out deleted conversations. Not displayed as raw data.

---

### 2.7 Subscription

**Classification:** Semi-private (billing / access control)

**Reads:**
- `src/components/subscription/PremiumPaywall.jsx` — checks subscription status for feature gating
- `src/pages/Settings.jsx` — displays subscription info
- `functions/stripeWebhook.ts` (lines 40, 69, 88) — reads/writes subscription records based on Stripe events
- `functions/createCheckoutSession.ts` — reads to check existing subscriptions before creating Stripe session

**Writes:**
- `functions/stripeWebhook.ts` — updates/creates Subscription records on Stripe webhook events (checkout.session.completed, customer.subscription.updated, customer.subscription.deleted)
- `functions/createCheckoutSession.ts` — may create initial subscription record

**External service calls:** Stripe webhook events (signed with `STRIPE_WEBHOOK_SECRET`). Subscription entity contains `stripe_customer_id` and `stripe_subscription_id`. No health data flows through Stripe — only billing metadata.

**Indexing/retrieval pipeline:** Not indexed. Not in `ALLOWED_ENTITY_TYPES`.

---

### 2.8 CrisisAlert

**Classification:** Semi-private / Safety-critical

**Reads:**
- `functions/generateComplianceReport.ts` (line 22) — admin-only aggregate read for compliance metrics. Returns aggregate counts, not individual user details, in summary mode. In `report_type === 'detailed'` mode (line 108), returns `conversation_id`, `surface`, `reason_code`, and `date` per alert — no message content, no user identity.

**Writes:**
- `src/components/ai/DraggableAiCompanion.jsx` (line 451) — creates `CrisisAlert` record when crisis is detected in AI Companion

**Analytics:** `functions/enhancedCrisisDetector.ts` (lines 71–79) — calls `base44.analytics.track` with `user_email` when a crisis is detected. See Risk R1 below.

**Indexing/retrieval pipeline:** Not indexed.

---

### 2.9 CoachingSession, SessionSummary, Goal, TherapyFeedback

**Classification:** Semi-private (user-specific clinical/progress data)

**CoachingSession:**
- Read/written by coaching components (`CoachingSessionWizard`, `CoachingChat`, `CoachingSessionList`)
- CBT Therapist wiring: preferred at `source_order: 5`
- Not indexed

**SessionSummary:**
- Read/written by coaching components (`CoachingChat`, `SessionSummary`)
- CBT Therapist wiring: preferred at `source_order: 2` (highest priority context)
- AI Companion wiring: restricted at `source_order: 8` (`continuity_check_only: true`)
- Not indexed

**Goal:**
- Read/written by Goals pages, coaching components, home feed
- CBT Therapist wiring: preferred at `source_order: 4`
- AI Companion wiring: restricted at `source_order: 7` (`reference_only: true`)
- Not indexed
- `checkProactiveNudges.ts` reads active Goals by `user.email` for nudge generation

**TherapyFeedback:**
- Read by `generateComplianceReport.ts` (admin only) for aggregate quality metrics
- Not indexed

---

## 3. Sensitive Boundary Crossing Audit

### 3.1 Knowledge Indexing Pipeline

| Entity | Indexed? | Evidence |
|---|---|---|
| ThoughtJournal | ❌ NO | Not in `ALLOWED_ENTITY_TYPES` in `backfillKnowledgeIndex.ts` or `retrieveRelevantContent.ts` |
| Conversation | ❌ NO | Not in `ALLOWED_ENTITY_TYPES` |
| MoodEntry | ❌ NO | Not in `ALLOWED_ENTITY_TYPES` |
| CompanionMemory | ❌ NO | Not in `ALLOWED_ENTITY_TYPES` |
| CaseFormulation | ❌ NO | Not in `ALLOWED_ENTITY_TYPES` |
| UserDeletedConversations | ❌ NO | Not in `ALLOWED_ENTITY_TYPES` |

The `ALLOWED_ENTITY_TYPES` constant in both `functions/backfillKnowledgeIndex.ts` (line 48) and `functions/retrieveRelevantContent.ts` (line 36) is:

```typescript
const ALLOWED_ENTITY_TYPES = ['Exercise', 'Resource', 'JournalTemplate', 'Psychoeducation'];
```

No private entity appears in the indexing allow-list. The tests in `test/utils/knowledgePipeline.allowList.test.js` explicitly enforce this rule with a `PRIVATE_ENTITY_TYPES` deny-list.

**Status: CONFIRMED SAFE** ✅

### 3.2 Vector Index Payloads (Pinecone)

All Pinecone upsert payloads in `backfillKnowledgeIndex.ts` (lines 216–236) are built exclusively from `ENTITY_FIELD_MAP` entries for `Exercise`, `Resource`, `JournalTemplate`, and `Psychoeducation`. No user-identifying data, no private entity fields appear in vector payloads.

**Status: CONFIRMED SAFE** ✅

### 3.3 Analytics / External Service Calls

| Location | Data Sent | Private? | Notes |
|---|---|---|---|
| `functions/enhancedCrisisDetector.ts:71–79` | `user_email`, `severity`, `confidence`, `reason` | ⚠️ YES — user email sent to analytics on crisis events | See Risk R1 |
| `functions/logProtocolMetrics.ts:31–95` | `user_email`, `conversation_id`, protocol metadata | ⚠️ YES — user email sent to analytics for multiple event types | See Risk R1 |
| `functions/stripeWebhook.ts` | Stripe billing metadata only | NO — no health data | Stripe events are signed and verified |
| `functions/createCheckoutSession.ts:52` | `user_email` as Stripe session metadata | YES — but expected; used for subscription linking | |
| `functions/sendNotification.ts` | `user_email`, notification title/message | YES — but expected; used for targeted notifications | Admin/automation only |

### 3.4 Logging (Console / Server)

| Location | What Is Logged | Risk |
|---|---|---|
| `functions/postLlmSafetyFilter.ts:85` | Blocked line (first 50 chars of blocked output) | LOW — LLM output content, not raw user data |
| `functions/sanitizeConversation.ts:72` | `conversation_id`, sanitized count | LOW — ID only, no message content |
| `functions/sanitizeConversation.ts:84` | `error.message`, `error.stack` | LOW — implementation details in error response |
| `functions/retrieveRelevantContent.ts:241–244` | Result count, score, language, top_k — no content | NONE |
| `src/components/journal/ThoughtCoachWizard.jsx:160–165` | `situation`, `automatic_thoughts`, `emotions` from formData | ⚠️ MEDIUM-LOW — CBT thought data logged to browser console | See Risk R2 |

### 3.5 LLM Boundary Crossings (Non-Indexing)

| Location | Data Sent to LLM | Notes |
|---|---|---|
| `functions/enhancedCrisisDetector.ts:30–67` | User message content | Expected crisis detection function; message is classified, not stored by LLM |
| `functions/extractThoughtWorkData.ts:29–81` | Full `conversation_messages` array | See Risk R3; CBT session content sent to LLM for structured extraction |
| `src/components/journal/ThoughtRecordForm.jsx` | Thought journal content | Passes journal content to LLM for CBT analysis suggestions |
| `src/components/journal/AiEntrySummary.jsx` | ThoughtJournal entry content | LLM summarization of journal entries |
| `src/components/journal/AiJournalSuggestions.jsx` | Journal context | LLM for journaling suggestions |
| `src/components/journal/AiTrendsSummary.jsx` | Multiple journal entries | LLM for trend analysis |

All LLM calls are made via `base44.integrations.Core.InvokeLLM` or the Base44 agent runtime, which is the platform's built-in LLM integration. No direct API calls to OpenAI or other LLM providers are made from the frontend. Backend functions that do call OpenAI directly (embedding generation in `backfillKnowledgeIndex.ts`) operate only on non-private content.

### 3.6 Agent Retrieval / Caution-Layer Entities

The active wiring (`activeAgentWiring.js`) uses hybrid configurations:

**CBT Therapist (active: `CBT_THERAPIST_WIRING_HYBRID`):**
- `CaseFormulation`: `caution_layer: true`, `read_only: true`, `secondary_only: true` at `source_order: 12`
- `Conversation`: `caution_layer: true`, `secondary_only: true` at `source_order: 13`

**AI Companion (active: `AI_COMPANION_WIRING_HYBRID`):**
- `Conversation`: `caution_layer: true`, `secondary_only: true` at `source_order: 9`
- `CaseFormulation`: **ABSENT** (confirmed prohibited per enforcement spec §E)

These caution-layer entities are documented in `docs/ai-agent-hybrid-model.md §B, §D` and are access-controlled by the Base44 runtime according to the guardrail flags. The wiring configuration is correct per the enforcement spec.

**Status: POLICY-COMPLIANT** (with caution layer active per design) ✅

### 3.7 Test Fixtures and Mock Data

All test fixtures and mocks that reference private entities contain either:
- Empty array responses (`[]`) for `UserDeletedConversations` and `MoodEntry` intercepts in `tests/helpers/ui.ts`
- Policy enforcement references (entity names as string constants) in `test/utils/` files

No real user data, no actual conversation content, no health records appear in any test fixture.

**Status: CONFIRMED SAFE** ✅

---

## 4. Confirmed Safe Boundaries

The following boundaries are confirmed safe based on code evidence.

| Boundary | Finding | Evidence Path |
|---|---|---|
| Knowledge indexing allow-list | Private entities excluded from all indexing | `functions/backfillKnowledgeIndex.ts:48`, `test/utils/knowledgePipeline.allowList.test.js:25–35` |
| Retrieval pipeline allow-list | Private entities excluded from all retrieval | `functions/retrieveRelevantContent.ts:36` |
| Pinecone vector payloads | No user-identifying data or private entity fields | `functions/backfillKnowledgeIndex.ts:216–236` |
| Stripe integration | Only `Subscription` entity touched; no health data | `functions/stripeWebhook.ts`, `functions/createCheckoutSession.ts` |
| AI Companion — CaseFormulation | Correctly absent from all AI Companion wiring configs | `src/api/agentWiring.js` all AI Companion entries |
| Test fixtures | No real private user data in mocks or fixtures | `tests/helpers/ui.ts:191,256`, `test/utils/*.test.js` |
| Retrieval function KNOWLEDGE_RETRIEVAL_ENABLED flag | No-op when disabled; cannot return private data | `functions/retrieveRelevantContent.ts:207–217` |
| Backfill feature flag gating | No-op when KNOWLEDGE_BACKFILL_ENABLED is false | `functions/backfillKnowledgeIndex.ts:346–360` |
| Backfill admin guard | Admin-only; cannot be triggered by regular users | `functions/backfillKnowledgeIndex.ts:314–316` |
| Data retention cleanup | User-scoped; only deletes the authenticated user's own data | `functions/retentionCleanup.ts:15–17` |
| sanitizeAgentOutput.ts ownership check | Verifies `conversation.created_by === user.email` before writing | `functions/sanitizeAgentOutput.ts:105` |
| Compliance report — no PII in aggregate summary | Summary mode returns counts, severities, surfaces — no user IDs or emails | `functions/generateComplianceReport.ts:52–70` |

---

## 5. Unclear Boundaries — Human Review Recommended

### 5.1 checkProactiveNudges.ts — Admin Scope vs. Per-User Intent

**File:** `functions/checkProactiveNudges.ts`  
**Lines:** 36–39, 49–50, 77–78, 113–114  
**Severity:** 🟠 MEDIUM — HUMAN REVIEW RECOMMENDED

**Description:**  
The function is marked admin-only (`user.role !== 'admin'` check at line 37–39). It then queries private entities (`MoodEntry`, `ThoughtJournal`, `Goal`) filtered by `created_by: user.email`. When an automated system calls this function, `user.email` resolves to the service/admin account's email, not individual users' emails.

This means:
- If the function is **called by an admin account manually**: it only checks the admin's own activity — no cross-user private data access.
- If the function is **intended to generate nudges for all users**: it cannot do so using the current admin email filter. It would need service-role queries across all users, which is a different design.

**Unclear element:** The design intent is not documented in the function. The comment says "CRITICAL: Admin-only function (scheduled automation only)". If the intended behavior is per-user nudge generation across all users, the current implementation does not achieve that goal. If the intended behavior is limited to admin self-testing, the implementation is correct.

**No privacy violation is confirmed** — the admin filter prevents cross-user data access. But the feature may not be working as intended.

**Recommended action:** Human review of the intended behavior. If per-user automation is needed, the function needs to be redesigned with appropriate service-role multi-user iteration.

### 5.2 sanitizeConversation.ts — Error Stack Exposure

**File:** `functions/sanitizeConversation.ts`  
**Lines:** 83–85  
**Severity:** 🟡 LOW — REVIEW LATER

**Description:**  
The error response includes `error.stack`:

```typescript
return Response.json({
  error: error.message,
  stack: error.stack
}, { status: 500 });
```

Stack traces may expose internal file paths or implementation details. This is in an authenticated endpoint, but it could still aid in reconstructing internal system architecture. This pattern is an HTTP response exposure, not a user data exposure.

**Recommended action:** Future code fix — remove `error.stack` from HTTP response bodies in production. Return only `error.message`.

### 5.3 Caution-Layer Entity Access in Hybrid Wiring

**File:** `src/api/activeAgentWiring.js`, `src/api/agentWiring.js`  
**Severity:** 🟠 MEDIUM — HUMAN REVIEW RECOMMENDED (documented caution)

**Description:**  
The active wiring includes `CaseFormulation` and `Conversation` for the CBT Therapist and `Conversation` for the AI Companion as caution-layer entities. These are explicitly flagged with `caution_layer: true`, `secondary_only: true`, and additional guardrails (`read_only`, `unrestricted: false`).

The guardrail flags are configuration-level controls declared in the wiring config object. Their enforcement depends on the Base44 runtime honoring these flags. This repository contains no code that validates whether the Base44 runtime actually enforces `read_only: true` or `secondary_only: true` at the platform level.

**What the repo confirms:** The wiring config correctly declares the guardrails.  
**What the repo cannot confirm:** Whether the Base44 runtime enforces the guardrail flags as intended.

**Recommended action:** Human review with Base44 platform owner to confirm that `caution_layer`, `read_only`, `secondary_only`, and `unrestricted` flags are actively enforced by the platform runtime before caution entities are used in production at scale.

---

## 6. Confirmed Risks

### R1 — User Email Included in Analytics Events for Mental Health Triggers

**Files:**  
- `functions/enhancedCrisisDetector.ts` (lines 71–79)  
- `functions/logProtocolMetrics.ts` (lines 31–95)

**Severity:** 🟠 MEDIUM — HUMAN REVIEW RECOMMENDED

**Description:**  
Both functions call `base44.analytics.track` with `user_email: user.email` as a property. The events being tracked are sensitive:

- **`crisis_detected_llm`** — tracks that a crisis was detected for a user, with severity level, confidence, and reason string
- **`cbt_protocol_started`** — links user email to which CBT protocol they are using
- **`homework_response`** — links user email to whether they accepted CBT homework
- **`metrics_captured`** — links user email to anxiety measurement events
- **`behavioral_experiment_completed`** — links user email to belief-change measurements
- **`chat_ui_incident`** — links user email to UI/JSON issues in chat

**Specific code:**
```typescript
// functions/enhancedCrisisDetector.ts
base44.analytics.track({
  eventName: 'crisis_detected_llm',
  properties: {
    severity: response.severity,
    confidence: response.confidence,
    reason: response.reason,
    user_email: user.email   // ← PII linked to mental health crisis event
  }
});

// functions/logProtocolMetrics.ts
base44.analytics.track({
  eventName: 'cbt_protocol_started',
  properties: {
    protocol: protocol_selected,
    conversation_id,
    user_email: user.email   // ← PII linked to clinical protocol usage
  }
});
```

**Risk:** The `base44.analytics.track` call may route data to a third-party analytics backend (such as Mixpanel, Segment, or a similar service). If it does, user email (PII) is being transmitted alongside sensitive mental health event data. This could:
1. Create linkable records between user identities and mental health events in an external analytics system
2. Potentially expose crisis severity information associated with user emails if the analytics platform has a breach
3. Be subject to stricter regulations (HIPAA-adjacent, GDPR) depending on jurisdiction

**What is uncertain:** The exact destination of `base44.analytics.track` events is determined by the Base44 platform configuration, not visible in this repository. The risk depends on where these events are routed.

**Recommended next action:**  
- Human review of where `base44.analytics.track` events are routed in the Base44 configuration
- If routed to a third-party analytics service, consider replacing `user_email` with a non-identifying user hash or removing it from analytics properties
- This is a **future code fix recommended** for both files

---

### R2 — Browser Console Logging of CBT Thought Journal Data

**File:** `src/components/journal/ThoughtCoachWizard.jsx` (lines 160–165)  
**Severity:** 🟡 LOW — REVIEW LATER

**Description:**  
The `canProceed` function contains a development debug log:

```javascript
console.log('ThoughtCoach canProceed - step:', step, 'formData:', {
  thought_type: formData.thought_type,
  situation: formData.situation,         // private CBT thought record
  automatic_thoughts: formData.automatic_thoughts,  // private CBT thought record
  emotions: formData.emotions            // private emotional data
});
```

This `console.log` is called every time the user navigates between wizard steps. The log is visible in browser developer tools and can be captured by browser extensions with access to the console.

**Risk:** Low in isolation — browser console logs are not transmitted and are not easily accessible without physical device access or a malicious extension. However, it is generally not best practice to log private CBT therapy content in a production application.

**Recommended next action:** Future code fix recommended — remove this development debug log from production code.

---

### R3 — Conversation Messages Passed to LLM for Structured Extraction

**File:** `functions/extractThoughtWorkData.ts` (lines 16–81)  
**Severity:** 🟡 LOW / NO ISSUE FOUND (expected behavior, documented for awareness)

**Description:**  
`ThoughtWorkSaveHandler.jsx` calls `base44.functions.invoke('extractThoughtWorkData', { conversation_messages })`, passing the full CBT conversation messages array to the backend function. The function then passes the conversation text to `base44.integrations.Core.InvokeLLM` for structured CBT data extraction.

This is the expected and documented mechanism for saving CBT thought work from chat sessions to `ThoughtJournal`. The LLM call is made via the Base44 platform integration (`base44.integrations.Core.InvokeLLM`), not to a raw external API endpoint.

**Risk:** Very low — the LLM call is within the Base44 platform boundary. No conversation content is stored externally beyond what the platform's LLM integration typically processes. The function's purpose (CBT data extraction) requires access to the conversation content.

**Confirmed safe aspects:**
- Only called for explicit user-initiated "Save to Journal" actions
- Result is stored in `ThoughtJournal` under the authenticated user
- Error handling is non-blocking; extraction failure does not prevent the save flow

**Recommended next action:** No immediate action. Document this as an accepted, intentional flow.

---

## 7. Not Found / No Evidence of Flow

The following potential risk areas were audited and **no evidence of flow** was found:

| Risk Area Checked | Finding |
|---|---|
| Private entities in Pinecone vector index | Not found — ALLOWED_ENTITY_TYPES excludes all private entities |
| Private entities in retrieval query results | Not found — ALLOWED_ENTITY_TYPES excludes all private entities |
| ThoughtJournal content in console or server logs | Not found — only error messages (no content) logged |
| MoodEntry content in console or server logs | Not found — only IDs referenced in error messages |
| CompanionMemory content in logs | Not found |
| CaseFormulation in AI Companion wiring | Not found — correctly absent from all AI Companion configs |
| Private entities in test fixture data | Not found — fixtures use empty arrays or policy-enforcement string constants |
| Private entities in Stripe webhook events | Not found — webhook only touches Subscription entity |
| Raw user PII in compliance report output | Not found in summary mode — aggregate counts only |
| Cross-user data access in retentionCleanup | Not found — function scoped to authenticated user's own records |
| Cross-user data access in DataPrivacy.jsx | Not found — user can only act on their own account |
| Private entity writes in retrieveRelevantContent | Not found — function is read-only |
| CrisisAlert content (message text) in analytics | Not found — only severity, reason code, and confidence are tracked |

---

## 8. Recommended Next Actions

| Priority | Action | Affected Files | Severity |
|---|---|---|---|
| **Human review recommended** | Review `base44.analytics.track` routing destination to determine if `user_email` is sent to a third-party analytics service | `functions/enhancedCrisisDetector.ts`, `functions/logProtocolMetrics.ts` | 🟠 MEDIUM |
| **Human review recommended** | Confirm that Base44 runtime enforces caution-layer guardrail flags (`read_only`, `secondary_only`, `caution_layer`) in the hybrid wiring | `src/api/agentWiring.js`, `src/api/activeAgentWiring.js` | 🟠 MEDIUM |
| **Human review recommended** | Clarify the design intent of `checkProactiveNudges.ts` — admin self-test or per-user automation? | `functions/checkProactiveNudges.ts` | 🟠 MEDIUM |
| **Future test coverage recommended** | Add tests that verify analytics events do NOT include raw message content or full thought journal fields | `functions/enhancedCrisisDetector.ts`, `functions/logProtocolMetrics.ts` | 🟡 LOW |
| **Future code fix recommended** | Remove or replace `user_email` in analytics track events — use a non-identifying hash or user ID instead of email | `functions/enhancedCrisisDetector.ts`, `functions/logProtocolMetrics.ts` | 🟠 MEDIUM |
| **Future code fix recommended** | Remove development debug console.log from ThoughtCoachWizard.jsx canProceed | `src/components/journal/ThoughtCoachWizard.jsx:160–165` | 🟡 LOW |
| **Future code fix recommended** | Remove `error.stack` from HTTP error response in sanitizeConversation.ts | `functions/sanitizeConversation.ts:84` | 🟡 LOW |
| **No action needed** | Knowledge indexing allow-list is correctly enforced | `functions/backfillKnowledgeIndex.ts`, `functions/retrieveRelevantContent.ts` | ✅ NONE |
| **No action needed** | Test fixtures contain no real private user data | `tests/helpers/ui.ts`, `test/utils/*.test.js` | ✅ NONE |
| **No action needed** | Stripe integration does not touch health data | `functions/stripeWebhook.ts`, `functions/createCheckoutSession.ts` | ✅ NONE |
| **No action needed** | CaseFormulation correctly absent from AI Companion wiring | `src/api/agentWiring.js` | ✅ NONE |

---

## 9. Audit Scope Notes

### What Was Audited

- All files in `functions/` (backend Deno functions)
- `src/api/entities/index.js` — entity definitions and groupings
- `src/api/agentWiring.js` and `src/api/activeAgentWiring.js` — agent entity wiring
- `src/api/base44Client.js` — SDK client (no private entity data observed)
- All frontend files (`src/`) that reference private entity names or `Conversation`
- All test files (`test/`, `tests/`) that reference private entity names
- Documentation cross-references in `docs/`

### What Was Not Changed

No production code was modified. No entity schemas were changed. No agent wiring was changed. No backend function logic was changed. No frontend components were changed. No tests were modified. No secrets or environment variables were changed.

### Audit Limitations

1. **Base44 runtime internals** — This audit cannot observe what the Base44 platform runtime does with agent wiring guardrail flags, analytics routing, or LLM integration calls at the platform level. These are external to the repository.
2. **Live traffic** — This is a static code analysis. No live network traffic was observed.
3. **Automations** — Base44 automations (scheduled jobs, triggers) are not visible as source code in this repository. Their behavior with respect to private entities can only be inferred from function interfaces.
4. **`base44.analytics.track` destination** — The third-party destination of analytics events (if any) is determined by the Base44 platform configuration, not visible in this repository.

---

*Last updated: 2026-03-10*  
*Audit performed by: GitHub Copilot Coding Agent (read-only, documentation-only task)*  
*No existing app behavior was changed.*
