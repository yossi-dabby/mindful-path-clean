# AI Agent Decision Matrix

> **Purpose:** Defines a strict decision matrix for the two existing AI agents — CBT Therapist and AI Companion — specifying access priority, usage role, source preference, and fallback logic for every relevant entity.
> This is a documentation and policy-enforcement reference only. No code, schemas, or behavior is changed.
> Builds on `docs/ai-entity-classification.md`, `docs/ai-agent-content-mapping.md`, and `docs/ai-agent-access-policy.md`.

---

## A. Decision Philosophy

### CBT Therapist
Start with structured clinical content. Read CompanionMemory and SessionSummary first for context, then load ThoughtJournal, Goal, and CoachingSession as the primary working layer. Reach for CaseFormulation only when session planning requires it, and treat it as read-only context — never a dominant voice. Fall back to raw Conversation only when SessionSummary is insufficient. Mood data is calibration, not a foundation. Reject everything that does not carry direct therapeutic value.

### AI Companion
Start with CompanionMemory — always. Layer MoodEntry on top for the real-time emotional picture. Reference Goal and SessionSummary only to maintain continuity and avoid repeating resolved topics. Fall back to Conversation only when the memory and summary layers are insufficient. Do not touch clinical entities. Reject everything that requires clinical reasoning or structured assessment.

---

## B. CBT Therapist Decision Matrix

| Entity | Access Status | Usage Role | Why | Safer Alternative | Boundary Note |
|---|---|---|---|---|---|
| **ThoughtJournal** | Preferred | Primary source | Core CBT content: automatic thoughts, distortions, evidence, balanced views — the clinical working material | — | Do not surface raw entries without session relevance; do not share across sessions without context |
| **Goal** | Preferred | Primary source | Defines the user's stated direction; every recommendation and action plan must align to active goals | — | Do not surface completed goals as active priorities |
| **CoachingSession** | Preferred | Primary source | Tracks the coaching arc, stage, and what has already been covered; prevents repeated or regressive work | — | Do not skip stage progression or reset the arc without user consent |
| **SessionSummary** | Preferred | Primary source | AI-generated distillations of prior sessions; cleanest memory layer for continuity | — | Prefer over Conversation for recall; do not treat as verbatim records |
| **Exercise** | Allowed | Supporting source | Shared content pool; CBT Therapist prescribes exercises as behavioral experiments with clinical intent | — | Do not recommend exercises that contradict the current session stage or formulation |
| **Resource** | Allowed | Supporting source | Curated psychoeducation library aligned to CBT session themes | — | Match category to current session focus; do not recommend generic content |
| **AudioContent** | Allowed | Supporting source | Psychoeducation and guided CBT practice audio; complements Exercise and Resource | — | Do not use relaxation-only audio as a substitute for structured CBT work |
| **Journey** | Allowed | Supporting source | Structured multi-step CBT program delivery at full clinical depth | — | Respect the user's current step; do not skip ahead |
| **MoodEntry** | Restricted | Supporting source | Contextualizes session tone and calibrates opening; secondary to structured content | ThoughtJournal for cognitive content; CoachingSession for session arc | Do not treat as a replacement for structured assessment; do not over-index on a single entry |
| **CompanionMemory** | Restricted | Supporting source | Provides persistent user facts to avoid repeating known context; read for personalization only | SessionSummary for session-level continuity | Read only; do not write to or overwrite companion memory entries |
| **CaseFormulation** | Restricted | Fallback source | Informs session planning with core beliefs and maintaining factors when deeper personalization is needed | Goal + ThoughtJournal for working clinical context | Read only; never reinterpret, overwrite, or surface raw formulation text to the user without clinical oversight |
| **Conversation** | Restricted | Fallback source | Last-resort continuity when SessionSummary is insufficient; provides raw exchange detail | SessionSummary (always prefer first) | Scope to minimum required context window; never surface unfiltered raw messages |
| **Subscription** | Prohibited | Do not use | Billing metadata; no therapeutic value | — | Do not use to gate, shape, or modify clinical responses |
| **UserDeletedConversations** | Prohibited | Do not use | System data hygiene log; references content the user explicitly chose to remove | — | Do not access under any circumstances |
| **AppNotification** | Prohibited | Do not use | System operational metadata; no therapeutic content | — | Do not access under any circumstances |
| **MindGameActivity** | Prohibited | Do not use | Engagement game records; no therapeutic content | — | Do not use as a progress or wellbeing signal |

---

## C. AI Companion Decision Matrix

| Entity | Access Status | Usage Role | Why | Safer Alternative | Boundary Note |
|---|---|---|---|---|---|
| **CompanionMemory** | Preferred | Primary source | The AI Companion's active memory layer; establishes tone, context, and personalization before anything else is loaded | — | Must be accurate and current; stale entries distort all downstream responses |
| **MoodEntry** | Preferred | Primary source | Highest-frequency real-time wellbeing signal; directly drives emotional validation and check-in responses | — | Do not treat a single entry as the complete emotional picture; pair with CompanionMemory |
| **Exercise** | Allowed | Supporting source | Shared content pool; AI Companion suggests exercises as coping tools for distress or low mood | — | Frame as gentle suggestions only; do not prescribe as clinical assignments |
| **Resource** | Allowed | Supporting source | Curated self-help content; AI Companion offers gently during emotional support moments | — | Do not recommend resources that imply clinical diagnosis or formal assessment |
| **AudioContent** | Allowed | Supporting source | Guided meditation and relaxation audio for immediate emotional regulation | — | Do not use psychoeducation-heavy audio as the primary response to emotional distress |
| **Journey** | Allowed | Supporting source | Gentle step-by-step pacing for users not yet engaged in active coaching | — | Do not advance past the user's current step; do not use as a substitute for active coaching |
| **Goal** | Restricted | Supporting source | Reinforces encouragement and homework reminders; secondary continuity context | CompanionMemory for relational continuity | Do not set, modify, or formally evaluate goals; reference only to encourage progress |
| **SessionSummary** | Restricted | Supporting source | Helps avoid repeating resolved topics; continuity context only | CompanionMemory for day-to-day continuity | Do not rely on session summaries as the primary driver of conversation |
| **Conversation** | Restricted | Fallback source | Recalls specific prior exchanges when CompanionMemory and SessionSummary are insufficient | CompanionMemory + SessionSummary (always prefer first) | Scope to minimum required context; privacy risk increases with volume |
| **ThoughtJournal** | Prohibited | Do not use | Core CBT content requiring structured clinical reasoning; outside the companion's defined role | CompanionMemory + MoodEntry for emotional context | Do not access, interpret, or reference thought records under any circumstances |
| **CoachingSession** | Prohibited | Do not use | Structured coaching arcs are the CBT Therapist's primary domain | SessionSummary (restricted) for continuity signals only | Do not read session stages or therapeutic arc data |
| **CaseFormulation** | Prohibited | Do not use | Most clinically sensitive entity in the system; requires clinical oversight the companion cannot provide | — | Do not access core beliefs or early experience data under any circumstances |
| **Subscription** | Prohibited | Do not use | Billing metadata; no emotional or relational value | — | Do not use to gate, shape, or modify supportive responses |
| **UserDeletedConversations** | Prohibited | Do not use | System data hygiene log; references content the user explicitly chose to remove | — | Do not access under any circumstances |
| **AppNotification** | Prohibited | Do not use | System operational metadata; no relational content | — | Do not access under any circumstances |
| **MindGameActivity** | Prohibited | Do not use | Engagement game records; no emotional or therapeutic content | — | Do not use as a wellbeing or engagement signal |

---

## D. Source Preference Rules

1. **Prefer SessionSummary over raw Conversation.** Both agents must load SessionSummary before falling back to Conversation. Raw conversation history is always a last resort.
2. **Prefer ThoughtJournal over inferred cognitive interpretation from chat history.** Structured CBT records are more reliable and clinically safer than patterns extracted from raw conversation text.
3. **Prefer CompanionMemory for continuity, not for clinical reasoning.** CompanionMemory is the personalization and tone layer; it is not a substitute for ThoughtJournal, CoachingSession, or CaseFormulation.
4. **Use CaseFormulation only as restricted context, not as a dominant voice.** It informs session planning; it does not drive responses or get surfaced directly to the user.
5. **Prefer structured entities over noisy historical text whenever possible.** ThoughtJournal, Goal, SessionSummary, and CompanionMemory are higher-quality inputs than Conversation history at any scale.
6. **Prefer MoodEntry for immediate emotional calibration; prefer ThoughtJournal for cognitive work.** Do not conflate emotional state with cognitive pattern — they are separate inputs for separate purposes.
7. **Prefer CoachingSession for arc continuity; prefer SessionSummary for content recall.** CoachingSession tracks stage and progress; SessionSummary recalls what was said. Use each for its specific job.

---

## E. Fallback Rules

### CBT Therapist

| Preferred Source | Fallback | Second Fallback | Note |
|---|---|---|---|
| ThoughtJournal | MoodEntry (for emotional context only) | None | Do not substitute chat inference for structured CBT records |
| SessionSummary | Conversation (minimum window) | None | Never load full conversation history by default |
| CoachingSession | SessionSummary (for continuity signals) | Conversation (minimum window) | Maintain stage awareness; do not skip ahead |
| Goal | SessionSummary (for last known goal state) | None | Do not infer goals from conversation |
| CaseFormulation | Goal + ThoughtJournal (for working clinical context) | None | Do not attempt clinical formulation from raw data |

### AI Companion

| Preferred Source | Fallback | Second Fallback | Note |
|---|---|---|---|
| CompanionMemory | MoodEntry (for real-time state) | SessionSummary (for topic continuity) | Never fall back to Conversation before trying SessionSummary |
| MoodEntry | CompanionMemory (for historical emotional pattern) | None | Do not infer emotional state from Conversation text |
| SessionSummary | Conversation (minimum window) | None | Minimum context window only; prefer summaries always |
| Goal (restricted) | CompanionMemory (for relational continuity) | None | Do not fall back to CoachingSession; it is prohibited |

---

## F. Shared-Source Rules

The following entities are safe for both agents to use in normal operation, but with different intent:

| Entity | CBT Therapist Intent | AI Companion Intent | Key Distinction |
|---|---|---|---|
| **Exercise** | Clinical prescription and behavioral experiment; tied to session goals | Coping skill suggestion in response to distress or low mood | Clinical assignment vs. gentle suggestion |
| **Resource** | Psychoeducation aligned to session content and CBT concepts | Gentle self-help prompts during emotional support | Structured learning vs. supportive offer |
| **AudioContent** | Guided CBT practice and psychoeducation audio | Guided meditation and relaxation for in-the-moment regulation | Clinical practice vs. immediate comfort |
| **Journey** | Structured CBT program delivery at full clinical depth | Gentle step-by-step pacing for users not in active coaching | Clinical program vs. soft onboarding |
| **SessionSummary** | Primary continuity source for session arc recall | Restricted continuity reference to avoid repeating resolved topics | Primary tool vs. guardrail context |
| **Conversation** | Restricted fallback when SessionSummary is insufficient | Restricted fallback when CompanionMemory and SessionSummary are insufficient | Both restricted; scope to minimum window |

---

## G. Hard Prohibitions

The following entities must remain prohibited for both agents under all circumstances:

| Entity | Reason |
|---|---|
| **Subscription** | Billing and tier data; no therapeutic or emotional value; must never influence AI behavior |
| **UserDeletedConversations** | System data hygiene record; contains references to content the user explicitly chose to remove |
| **AppNotification** | Notification delivery logs; system operational metadata only |
| **MindGameActivity** | Engagement game session logs; no therapeutic or emotional content |

Additionally, the following entities are hard-prohibited specifically for the AI Companion:

| Entity | Reason |
|---|---|
| **ThoughtJournal** | Requires structured clinical reasoning; outside the companion's defined role |
| **CoachingSession** | Structured coaching arcs belong exclusively to the CBT Therapist domain |
| **CaseFormulation** | Most clinically sensitive entity in the system; requires clinical oversight the companion must not provide |

---

## H. Final Recommended Default Matrix

The recommended default operating policy for the current product stage:

| Entity | CBT Therapist Default | AI Companion Default |
|---|---|---|
| **CompanionMemory** | Restricted — read only, supporting source | Preferred — primary source, load first |
| **MoodEntry** | Restricted — calibration only, supporting source | Preferred — primary source, load second |
| **ThoughtJournal** | Preferred — primary source | Prohibited — do not use |
| **Goal** | Preferred — primary source | Restricted — encouragement reference only |
| **CoachingSession** | Preferred — primary source | Prohibited — do not use |
| **SessionSummary** | Preferred — primary source for recall | Restricted — continuity guardrail only |
| **Exercise** | Allowed — supporting source, clinical intent | Allowed — supporting source, coping intent |
| **Resource** | Allowed — supporting source, psychoeducation | Allowed — supporting source, self-help |
| **AudioContent** | Allowed — supporting source, CBT practice | Allowed — supporting source, relaxation |
| **Journey** | Allowed — supporting source, full clinical depth | Allowed — supporting source, gentle pacing |
| **CaseFormulation** | Restricted — read only, fallback context, clinical review required | Prohibited — do not use |
| **Conversation** | Restricted — fallback only, minimum window | Restricted — fallback only, minimum window |
| **Subscription** | Prohibited — do not use | Prohibited — do not use |
| **UserDeletedConversations** | Prohibited — do not use | Prohibited — do not use |
| **AppNotification** | Prohibited — do not use | Prohibited — do not use |
| **MindGameActivity** | Prohibited — do not use | Prohibited — do not use |

**Default operating rule:** Both agents must load their preferred sources first, respect their restricted sources as context-only, and treat prohibited sources as permanently unavailable. When no preferred source is available, follow the fallback chain defined in Section E before attempting to use any restricted source.

---

> **Note:** This document defines the practical decision matrix for the two AI agents present in the Base44 runtime. It enforces the policy defined in `docs/ai-agent-access-policy.md` as a source-selection decision tool. No code, schemas, or behavior is changed.
