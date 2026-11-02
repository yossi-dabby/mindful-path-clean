# AI Agent Content Mapping

> **Purpose:** Maps all 12 AI Core Content entities to the two existing agent roles — CBT Therapist and AI Companion — defined in the Base44 runtime.
> This is a documentation reference only. No code, schemas, or behavior is changed.
> All entities remain in the `@base44/sdk` runtime as-is.

---

## A. Mapping Table

| Entity | Group | Primary Agent | Secondary Agent | Best Usage | Reason | Caution |
|---|---|---|---|---|---|---|
| **ThoughtJournal** | CBT Therapist First | CBT Therapist | — | Socratic questioning, distortion review, balanced thought generation | Core CBT content; built for structured therapeutic work | — |
| **Goal** | CBT Therapist First | CBT Therapist | AI Companion | Goal setting, progress check-ins, action plan alignment | Goal setting is an explicit CBT Therapist function; AI Companion can reinforce with encouragement | — |
| **CoachingSession** | CBT Therapist First | CBT Therapist | — | Session arc tracking, therapeutic stage management, continuity | Structured coaching sessions are the CBT Therapist's primary domain | — |
| **SessionSummary** | CBT Therapist First | CBT Therapist | AI Companion | Continuity between sessions, recall of prior key insights and action items | CBT Therapist generates these; AI Companion may reference to avoid repeating resolved topics | — |
| **CompanionMemory** | AI Companion First | AI Companion | CBT Therapist | Persistent user context, tone calibration, homework reminders, reflective listening | The AI Companion's active memory layer; must be reliable before other entities layer on top | Must be accurate and current; stale or incorrect memories distort all downstream responses |
| **MoodEntry** | AI Companion First | AI Companion | CBT Therapist | Emotional validation, real-time check-in responses, mood pattern surfacing | Highest-frequency wellbeing signal; maps directly to the AI Companion's emotional validation role | — |
| **Exercise** | Shared Layer | Both | — | CBT Therapist: behavioral experiments; AI Companion: coping skill suggestions | Both agents recommend exercises but with different clinical intentions | — |
| **Resource** | Shared Layer | Both | — | CBT Therapist: psychoeducation; AI Companion: gentle self-help prompts | Curated content library serves both agents; purpose differs by agent and session context | — |
| **AudioContent** | Shared Layer | Both | — | CBT Therapist: psychoeducation audio; AI Companion: guided meditation and relaxation | Complements Exercise and Resource; recommended by both agents for different therapeutic purposes | — |
| **Journey** | Shared Layer | Both | — | CBT Therapist: structured CBT program delivery; AI Companion: gentle step-by-step pacing | Multi-step content paths work for both agents at different clinical depths | — |
| **CaseFormulation** | Caution Layer | CBT Therapist | — | Core belief review, formulation-informed session planning | Contains the most clinically sensitive user formulation in the system | AI should read for context only; must never overwrite or interpret without clinical oversight |
| **Conversation** | Caution Layer | AI Companion | CBT Therapist | Session continuity fallback when SessionSummary is insufficient | Raw conversation history; large in volume and contains unfiltered user disclosures | Privacy risk at scale; prefer SessionSummary for AI recall; enable raw access only where necessary |

---

## B. CBT Therapist First

Priority-ordered shortlist of entities to connect first for the CBT Therapist:

1. **ThoughtJournal** — Core therapeutic content; Socratic questioning and distortion review require this data from the first session.
2. **Goal** — Defines the user's stated direction; every recommendation and session plan should align to active goals.
3. **CoachingSession** — Tracks the coaching arc over time; prevents repetition and guides therapeutic staging.
4. **SessionSummary** — Distilled session memory; enables continuity across sessions without loading full raw conversation history.

---

## C. AI Companion First

Priority-ordered shortlist of entities to connect first for the AI Companion:

1. **CompanionMemory** — Must be the first entity the AI Companion reads; it is the foundation of personalized tone, context, and homework reminders.
2. **MoodEntry** — Highest-frequency signal in the system; drives emotional validation and real-time check-in responses from the first interaction.

---

## D. Shared Layer

Entities both agents should use, with one short line explaining the difference in usage:

| Entity | CBT Therapist Usage | AI Companion Usage |
|---|---|---|
| **Exercise** | Prescribes as behavioral experiments; tracks completion against session goals | Suggests as coping tools in response to distress signals or low mood entries |
| **Resource** | Recommends as psychoeducation to reinforce session content and CBT concepts | Offers as gentle self-help prompts during emotional support moments |
| **AudioContent** | Selects psychoeducation or guided practice audio aligned to CBT session themes | Queues guided meditation or relaxation audio for immediate emotional regulation |
| **Journey** | Guides the user through structured multi-step CBT programs at full clinical depth | Provides gentle step-by-step pacing for users not yet engaged in active coaching sessions |

---

## E. Caution Layer

Entities that require tighter control before AI use:

| Entity | Why Caution |
|---|---|
| **CaseFormulation** | Contains core beliefs, early experiences, and maintaining factors — the most clinically sensitive formulation in the system. AI should read for session context but must never write to or reinterpret this data without clinical review. |
| **Conversation** | Raw unfiltered user message history at full volume. Reading raw threads is less efficient and riskier than reading SessionSummary. Enable only where summarized recall is insufficient, and scope access to the minimum required context window. |

---

## F. Final Rollout Order

Short practical order for connecting content to the two agents:

1. **CompanionMemory** — Wire first for both agents; establishes the personalization and memory foundation.
2. **MoodEntry** — Wire next for AI Companion; enables emotional validation from the first real interaction.
3. **ThoughtJournal** + **Goal** — Wire next for CBT Therapist; covers the core therapeutic content and user direction layer.
4. **CoachingSession** + **SessionSummary** — Wire for CBT Therapist; enables session continuity and prevents repeated work.
5. **Exercise** + **Resource** + **AudioContent** — Wire for both agents; completes the shared recommendation pool.
6. **Journey** — Wire for both agents after the recommendation pool is stable and tested.
7. **CaseFormulation** — Wire for CBT Therapist last, under clinical review; restrict AI to read-only access.
8. **Conversation** — Enable selectively and only where SessionSummary is insufficient for continuity.

---

## G. Step 1 Wiring — What Was Wired

> **Implementation note:** `src/api/agentWiring.js` exports the first-pass wiring
> configurations (`CBT_THERAPIST_WIRING_STEP_1` and `AI_COMPANION_WIRING_STEP_1`).
> Only Preferred entities are included in this step.  All Restricted, caution-layer,
> and prohibited entities are intentionally absent.  The configuration is validated by
> the policy rules in `functions/validateAgentPolicy.ts` and tested in
> `test/utils/agentWiring.test.js`.

### CBT Therapist — Step 1

| source_order | Entity | access_level |
|---|---|---|
| 2 | SessionSummary | preferred |
| 3 | ThoughtJournal | preferred |
| 4 | Goal | preferred |
| 5 | CoachingSession | preferred |

Deferred to later steps: MoodEntry (restricted), CompanionMemory (restricted),
CaseFormulation (restricted/caution), Conversation (caution), and the Allowed layer
(Exercise, Resource, AudioContent, Journey).

### AI Companion — Step 1

| source_order | Entity | access_level | Note |
|---|---|---|---|
| 1 | CompanionMemory | preferred | `use_for_clinical_reasoning: false` enforced |
| 2 | MoodEntry | preferred | |

Deferred to later steps: Goal (restricted), SessionSummary (restricted),
Conversation (caution), and the Allowed layer (Exercise, Resource, AudioContent, Journey).

---

---

## H. V1 Final Baseline — What Is Wired, Deferred, and Prohibited

> **Implementation note:** `src/api/agentWiring.js` exports the complete Steps 1–3
> wiring configurations.  The Step 3 exports (`CBT_THERAPIST_WIRING_STEP_3` and
> `AI_COMPANION_WIRING_STEP_3`) are the canonical V1 final baseline.  No additional
> entities are wired in V1.  All exports are validated by the policy rules in
> `functions/validateAgentPolicy.ts` and tested in
> `test/utils/agentWiring.test.js`, `test/utils/agentWiringStep2.test.js`,
> `test/utils/agentWiringStep3.test.js`, and `test/utils/agentWiringV1Final.test.js`.

### Wired in V1

#### CBT Therapist (`CBT_THERAPIST_WIRING_STEP_3`)

| source_order | Entity | access_level | Guardrail flag |
|---|---|---|---|
| 2 | SessionSummary | preferred | — |
| 3 | ThoughtJournal | preferred | — |
| 4 | Goal | preferred | — |
| 5 | CoachingSession | preferred | — |
| 6 | Exercise | allowed | — |
| 7 | Resource | allowed | — |
| 8 | AudioContent | allowed | — |
| 9 | Journey | allowed | — |
| 10 | CompanionMemory | restricted | `read_only: true` |
| 11 | MoodEntry | restricted | `calibration_only: true` |

#### AI Companion (`AI_COMPANION_WIRING_STEP_3`)

| source_order | Entity | access_level | Guardrail flag |
|---|---|---|---|
| 1 | CompanionMemory | preferred | `use_for_clinical_reasoning: false` |
| 2 | MoodEntry | preferred | — |
| 3 | Exercise | allowed | — |
| 4 | Resource | allowed | — |
| 5 | AudioContent | allowed | — |
| 6 | Journey | allowed | — |
| 7 | Goal | restricted | `reference_only: true` |
| 8 | SessionSummary | restricted | `continuity_check_only: true` |

### Deferred (not wired in V1)

These entities require additional gating before they may be wired.  They must
not appear in any V1 tool access list.

| Entity | Reason for deferral |
|---|---|
| **CaseFormulation** | Requires a clinical-review gate; AI access must be read-only and human-supervised |
| **Conversation** | Requires a privacy gate and minimum-window enforcement; prefer SessionSummary for AI recall |

### Permanently Prohibited

These entities must never appear in any agent tool access list, in V1 or in any future release.

| Entity | Reason |
|---|---|
| **Subscription** | Billing and entitlement data; no therapeutic or companion use case |
| **UserDeletedConversations** | Deleted user data; must never be re-surfaced by AI |
| **AppNotification** | Push notification records; no therapeutic or companion use case |
| **MindGameActivity** | Gamification activity log; no therapeutic or companion use case |

---

> **Note:** This document maps the 12 AI Core Content entities defined in `docs/ai-entity-classification.md` to the two agent roles in the Base44 runtime. No code, schemas, or behavior is changed.
