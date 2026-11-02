# AI Agent Enforcement Spec

> **Purpose:** Converts the decision matrix in `docs/ai-agent-decision-matrix.md` into a strict enforcement-ready specification for the two existing agents — CBT Therapist and AI Companion.
> This is a documentation and policy-enforcement reference only. No code, schemas, or behavior is changed.
> Builds on `docs/ai-entity-classification.md`, `docs/ai-agent-content-mapping.md`, `docs/ai-agent-access-policy.md`, and `docs/ai-agent-decision-matrix.md`.

---

## A. Enforcement Purpose

This spec protects two things:

1. **Clinical safety.** The CBT Therapist must never surrender clinical entities to the AI Companion, and the AI Companion must never perform clinical reasoning. Blurring these boundaries introduces risk of misapplied therapy content.
2. **Policy consistency.** As new entities and agents are added, access decisions must be made deliberately against a written standard — not inherited silently from whatever is technically available.

This spec provides the enforceable rules, validation checklist, and drift-prevention guidelines needed to audit, configure, and maintain both agents at any point in the product lifecycle.

---

## B. Per-Agent Allowed Entity Set

### CBT Therapist

| Category | Entities |
|---|---|
| **Preferred** | ThoughtJournal, Goal, CoachingSession, SessionSummary |
| **Allowed** | Exercise, Resource, AudioContent, Journey |
| **Restricted** | MoodEntry, CompanionMemory, CaseFormulation, Conversation |
| **Prohibited** | ThoughtJournal *(via Companion)*, CoachingSession *(via Companion)*, CaseFormulation *(via Companion)*, Subscription, UserDeletedConversations, AppNotification, MindGameActivity |

> **Prohibited column note:** The last four entities are prohibited for both agents. The first three are prohibited for the AI Companion only; for the CBT Therapist, CaseFormulation is restricted and the others are preferred.

### AI Companion

| Category | Entities |
|---|---|
| **Preferred** | CompanionMemory, MoodEntry |
| **Allowed** | Exercise, Resource, AudioContent, Journey |
| **Restricted** | Goal, SessionSummary, Conversation |
| **Prohibited** | ThoughtJournal, CoachingSession, CaseFormulation, Subscription, UserDeletedConversations, AppNotification, MindGameActivity |

---

## C. Per-Agent Source Order Rules

### CBT Therapist — approved source order

1. **CompanionMemory** — read first for personalization baseline and known user facts.
2. **SessionSummary** — read second for prior session continuity and action item recall.
3. **ThoughtJournal** — load as primary clinical working material.
4. **Goal** — align all recommendations and plans to the user's active goals.
5. **CoachingSession** — confirm stage, arc position, and what has already been covered.
6. **Exercise / Resource / AudioContent / Journey** — pull from the shared content pool as the session requires.
7. **MoodEntry** — use only to calibrate session tone; load after structured sources.
8. **CaseFormulation** — access only when deeper session planning requires it; treat as read-only fallback context.
9. **Conversation** — access only when SessionSummary is insufficient; scope to minimum required context window.

### AI Companion — approved source order

1. **CompanionMemory** — read first, always; no other entity is loaded before this.
2. **MoodEntry** — load second for the current real-time emotional picture.
3. **Exercise / Resource / AudioContent / Journey** — pull from the shared content pool to support emotional regulation or pacing.
4. **Goal** *(restricted)* — reference only to reinforce encouragement or recall homework; do not load unless needed.
5. **SessionSummary** *(restricted)* — reference only to avoid repeating resolved topics; do not use as the primary driver.
6. **Conversation** *(restricted)* — access only when CompanionMemory and SessionSummary are both insufficient; scope to minimum required context window.

---

## D. Restricted Usage Rules

### MoodEntry — restricted for CBT Therapist

- **Why restricted:** The CBT Therapist's primary inputs are structured clinical entities. MoodEntry is high-frequency but unstructured and does not substitute for formal assessment.
- **Acceptable usage:** Load after structured sources to calibrate the opening tone of a session; acknowledge emotional state before engaging with cognitive content.
- **Must not:** Treat a single mood entry as a complete emotional or clinical picture; replace ThoughtJournal or CoachingSession data with mood signals.
- **Safer source to prefer first:** ThoughtJournal (for cognitive content), CoachingSession (for session arc).

### CompanionMemory — restricted for CBT Therapist

- **Why restricted:** CompanionMemory is the AI Companion's primary layer. The CBT Therapist may read it to avoid repeating known context, but it is not the therapist's reasoning foundation.
- **Acceptable usage:** Read to personalize tone and avoid restating facts the user has already disclosed; use as supporting context only.
- **Must not:** Write to, overwrite, or delete CompanionMemory entries; treat it as a substitute for SessionSummary or ThoughtJournal.
- **Safer source to prefer first:** SessionSummary for session-level continuity.

### CaseFormulation — restricted for CBT Therapist

- **Why restricted:** Contains the most clinically sensitive formulation in the system — core beliefs, early experiences, and maintaining factors. Misuse carries direct clinical risk.
- **Acceptable usage:** Read as fallback context when session planning requires deeper personalization; use to inform (not dictate) how structured clinical content is framed.
- **Must not:** Write to, reinterpret, or surface raw formulation text to the user without clinical oversight; use as a dominant reasoning source.
- **Safer source to prefer first:** Goal + ThoughtJournal for working clinical context.

### Goal — restricted for AI Companion

- **Why restricted:** Goals exist primarily in the CBT Therapist domain. The AI Companion may reference goal progress to encourage the user, but must not manage or evaluate goals.
- **Acceptable usage:** Reference to reinforce encouragement, surface homework reminders, or acknowledge milestone progress.
- **Must not:** Set, modify, formally evaluate, or structure plans around goals; fall back to CoachingSession as a proxy for goal data (CoachingSession is prohibited).
- **Safer source to prefer first:** CompanionMemory for relational continuity.

### SessionSummary — restricted for AI Companion

- **Why restricted:** Session summaries are CBT Therapist-generated and contain clinical distillations. The AI Companion may use them as a guardrail but must not treat them as its core context.
- **Acceptable usage:** Reference to avoid re-raising topics already resolved in coaching; use as a continuity check only.
- **Must not:** Drive conversation direction from session summaries; interpret clinical insights surfaced in summaries as the companion's own reasoning.
- **Safer source to prefer first:** CompanionMemory for day-to-day continuity.

### Conversation — restricted for both agents

- **Why restricted:** Raw conversation history is high-volume, unfiltered, and carries elevated privacy risk. Both agents have cleaner, more structured alternatives.
- **Acceptable usage:** Use as a last resort when all preferred and restricted structured sources are insufficient to answer a continuity need; scope access to the minimum required context window.
- **Must not:** Load full conversation history as a default context source; surface unfiltered raw messages in responses; prefer Conversation over SessionSummary or CompanionMemory.
- **Safer source to prefer first:** SessionSummary (both agents); CompanionMemory (AI Companion).

---

## E. Prohibited Usage Rules

### Subscription

- **Why prohibited:** Billing and tier metadata carries no therapeutic or emotional value. Allowing access creates risk of AI behavior being shaped by commercial state rather than clinical or relational need.
- **What a violation looks like:** Agent checks subscription tier before recommending content; agent adjusts response depth based on plan level; agent references upgrade prompts.
- **Applies to:** Both agents.

### UserDeletedConversations

- **Why prohibited:** This is a data hygiene record of conversation IDs the user explicitly chose to remove. Accessing it violates user intent and carries direct privacy risk.
- **What a violation looks like:** Agent reads deleted conversation references to reconstruct context; agent uses deletion history to infer behavioral patterns.
- **Applies to:** Both agents.

### AppNotification

- **Why prohibited:** Notification delivery logs are system operational metadata with no clinical or relational content.
- **What a violation looks like:** Agent reads notification history to infer engagement or interest; agent references sent notifications as if they are user interactions.
- **Applies to:** Both agents.

### MindGameActivity

- **Why prohibited:** Game session logs and scores are engagement records, not therapeutic or emotional content. Using them as wellbeing or progress signals produces misleading context.
- **What a violation looks like:** Agent references game score or streak as a positive wellbeing indicator; agent uses game activity as a proxy for therapeutic engagement.
- **Applies to:** Both agents.

### ThoughtJournal — additionally prohibited for AI Companion

- **Why prohibited:** ThoughtJournal requires structured clinical reasoning — Socratic questioning, distortion identification, and balanced thought generation. This is outside the AI Companion's defined role.
- **What a violation looks like:** Companion reads or references a thought record; companion attempts distortion identification from journal content; companion surfaces raw cognitive records in an emotional support response.
- **Applies to:** AI Companion only. (CBT Therapist: Preferred.)

### CoachingSession — additionally prohibited for AI Companion

- **Why prohibited:** Structured coaching arcs, therapeutic stages, and session plans belong exclusively to the CBT Therapist domain.
- **What a violation looks like:** Companion reads session stage data to guide its response; companion references which CBT stage the user is in; companion uses coaching arc to determine what to say next.
- **Applies to:** AI Companion only. (CBT Therapist: Preferred.)

### CaseFormulation — additionally prohibited for AI Companion

- **Why prohibited:** Core beliefs, early experiences, and maintaining factors are the most clinically sensitive data in the system. The AI Companion is not designed to handle this data safely.
- **What a violation looks like:** Companion reads or references core beliefs; companion personalizes emotional responses using formulation data; companion surfaces early experience content in a supportive chat.
- **Applies to:** AI Companion only. (CBT Therapist: Restricted.)

---

## F. Validation Rules

The following checklist can be used to verify agent configuration at any point. A configuration is non-compliant if any item fails.

**CBT Therapist**
- [ ] No prohibited entity (Subscription, UserDeletedConversations, AppNotification, MindGameActivity) appears in the allowed tool access list.
- [ ] No restricted entity (MoodEntry, CompanionMemory, CaseFormulation, Conversation) is marked as Preferred.
- [ ] ThoughtJournal, Goal, CoachingSession, and SessionSummary are all present in the Preferred list.
- [ ] CaseFormulation access is flagged as read-only and is gated behind clinical review confirmation.
- [ ] Conversation is not the default context source; SessionSummary appears earlier in the source order.
- [ ] CompanionMemory is present in the Restricted list, not the Preferred list.
- [ ] MoodEntry is not used as a substitute for structured clinical assessment.

**AI Companion**
- [ ] No prohibited entity (ThoughtJournal, CoachingSession, CaseFormulation, Subscription, UserDeletedConversations, AppNotification, MindGameActivity) appears in the allowed tool access list.
- [ ] No restricted entity (Goal, SessionSummary, Conversation) is marked as Preferred.
- [ ] CompanionMemory is the first entity loaded; MoodEntry is the second.
- [ ] CompanionMemory is marked as Preferred, not Restricted.
- [ ] Conversation is not preferred over CompanionMemory or SessionSummary.
- [ ] CompanionMemory is not used as a clinical reasoning source — it drives personalization and tone only.
- [ ] No clinical entity (ThoughtJournal, CoachingSession, CaseFormulation) appears anywhere in the companion's configuration.

**Both agents**
- [ ] Raw Conversation is not preferred over SessionSummary in either agent's source order.
- [ ] The four system-prohibited entities (Subscription, UserDeletedConversations, AppNotification, MindGameActivity) are absent from both agents' tool access lists.
- [ ] CaseFormulation is not used as an unrestricted live guidance source by any agent.
- [ ] No agent writes to CompanionMemory entries it does not own.

---

## G. Drift Prevention Rules

Apply these rules any time a new entity or new agent is proposed.

1. **Classify before wiring.** Every new entity must be assigned to one of the four categories — Preferred, Allowed, Restricted, or Prohibited — for each agent before it is connected to either agent. No entity may be wired in an unclassified state.

2. **Prohibited is the default for new system entities.** Any entity that carries billing, notification, admin, or game-session data is Prohibited for both agents by default. Override requires explicit justification.

3. **Restricted is the default for new clinical entities.** Any new entity that carries psychological formulation, raw conversation history, or sensitive user disclosure data starts as Restricted, not Preferred or Allowed.

4. **A new agent must have a complete entity set defined before activation.** No agent may be activated without a full Preferred / Allowed / Restricted / Prohibited table covering every entity that exists at the time of launch.

5. **Cross-agent access requires explicit approval.** If a new entity is shared between agents, its usage intent for each agent must be documented separately. Identical access levels for both agents are not assumed.

6. **This spec must be updated before the change goes live.** Any change to entity classification, agent access, or source order must be reflected in this file and in `docs/ai-agent-decision-matrix.md` before deployment.

---

## H. Default Enforcement Recommendation

For the current product stage, enforce the following as the minimum viable policy:

1. **AI Companion:** Load CompanionMemory first, MoodEntry second. Grant Allowed access to the shared content pool (Exercise, Resource, AudioContent, Journey). Enforce strict prohibition on ThoughtJournal, CoachingSession, and CaseFormulation. Restrict Goal, SessionSummary, and Conversation as context-only fallbacks. Do not grant the companion access to any entity not listed in Section B.

2. **CBT Therapist:** Load CompanionMemory and SessionSummary first for context, then ThoughtJournal, Goal, and CoachingSession as the primary clinical layer. Grant Allowed access to the shared content pool. Gate CaseFormulation behind a read-only, clinical-review-confirmed restriction. Restrict Conversation to a minimum context window and enforce SessionSummary as the default recall source. Do not grant the therapist write access to CompanionMemory.

3. **Both agents:** Permanently exclude Subscription, UserDeletedConversations, AppNotification, and MindGameActivity from all tool access lists. Run the validation checklist in Section F before each agent configuration update. Apply the drift prevention rules in Section G before adding any new entity or agent to the system.

---

> **Note:** This document enforces the policy defined across `docs/ai-entity-classification.md`, `docs/ai-agent-content-mapping.md`, `docs/ai-agent-access-policy.md`, and `docs/ai-agent-decision-matrix.md`. No code, schemas, or behavior is changed.

---

## I. Wiring Rollout Log

### Step 1 — Preferred entities only (completed)

Wired the Preferred entity set for both agents in `src/api/agentWiring.js`
(`CBT_THERAPIST_WIRING_STEP_1`, `AI_COMPANION_WIRING_STEP_1`).

| Agent | Entities wired | Access level |
|---|---|---|
| CBT Therapist | SessionSummary, ThoughtJournal, Goal, CoachingSession | preferred |
| AI Companion | CompanionMemory, MoodEntry | preferred |

### Step 2 — Allowed shared content pool (completed)

Added the four Allowed shared entities for both agents
(`CBT_THERAPIST_WIRING_STEP_2`, `AI_COMPANION_WIRING_STEP_2`).
All Step 1 preferred entities are carried forward unchanged.
Shared entities are placed at higher source_order numbers so they remain
lower priority than each agent's preferred layer.

| Agent | Entities added | Access level | Source order |
|---|---|---|---|
| CBT Therapist | Exercise | allowed | 6 |
| CBT Therapist | Resource | allowed | 7 |
| CBT Therapist | AudioContent | allowed | 8 |
| CBT Therapist | Journey | allowed | 9 |
| AI Companion | Exercise | allowed | 3 |
| AI Companion | Resource | allowed | 4 |
| AI Companion | AudioContent | allowed | 5 |
| AI Companion | Journey | allowed | 6 |

### Step 3 — Non-caution restricted entities (completed)

Added the approved non-caution Restricted entities for both agents
(`CBT_THERAPIST_WIRING_STEP_3`, `AI_COMPANION_WIRING_STEP_3`).
All Step 1 preferred and Step 2 allowed entities are carried forward unchanged.
Restricted entities are placed at higher source_order numbers, keeping them
lower priority than all preferred and allowed entities.
Hard guardrail flags are set per §D to enforce usage constraints.

| Agent | Entity added | Access level | Source order | Guardrail |
|---|---|---|---|---|
| CBT Therapist | CompanionMemory | restricted | 10 | `read_only: true` |
| CBT Therapist | MoodEntry | restricted | 11 | `calibration_only: true` |
| AI Companion | Goal | restricted | 7 | `reference_only: true` |
| AI Companion | SessionSummary | restricted | 8 | `continuity_check_only: true` |

### Deferred — not wired in Steps 1–3

The following entities remain intentionally absent and must not be added
without an explicit caution-layer policy review:

| Category | Entities | Reason |
|---|---|---|
| Caution layer — CBT Therapist | CaseFormulation | Requires clinical-review gate; must remain read-only and gated before wiring |
| Caution layer — both agents | Conversation | Requires privacy gate and minimum-window enforcement before wiring |
| Prohibited — both agents | Subscription, UserDeletedConversations, AppNotification, MindGameActivity | Permanently excluded per §E |
| Prohibited — AI Companion only | ThoughtJournal, CoachingSession, CaseFormulation | Clinical entities outside Companion's role (§E) |
