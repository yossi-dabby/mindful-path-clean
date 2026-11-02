# AI Agent Access Policy

> **Purpose:** Defines explicit content access and usage boundaries for the two existing AI agents — CBT Therapist and AI Companion.
> This is a policy reference only. No code, schemas, or behavior is changed.
> All entities remain in the `@base44/sdk` runtime as-is.

---

## A. Policy Overview

### CBT Therapist
The CBT Therapist is a structured, clinically-oriented agent. Its access policy prioritizes entities that carry direct therapeutic content: thought records, goals, coaching arcs, and session memory. It may reference emotional context (mood, companion memory) to personalize responses but must not adopt the AI Companion's emotionally-led style. Clinically sensitive entities (CaseFormulation, Conversation) are restricted to read-only, session-scoped access only.

### AI Companion
The AI Companion is a supportive, emotionally-present agent. Its access policy prioritizes entities that carry emotional and relational context: mood entries and companion memory. It may reference goal progress and session summaries for continuity and encouragement, but must not perform clinical analysis, interpret thought records, or access case formulations. Its role ends where structured clinical work begins.

---

## B. CBT Therapist Access Table

| Entity | Policy | Best Permitted Usage | Reason | Boundary Note |
|---|---|---|---|---|
| **ThoughtJournal** | Allowed | Socratic questioning, cognitive distortion review, balanced thought generation | Core CBT content; built for structured therapeutic reasoning | Do not share raw journal entries in conversation without clear relevance to the current session |
| **Goal** | Allowed | Goal setting, progress check-ins, action plan alignment | Explicit CBT Therapist function; goals define the user's direction across all sessions | Do not surface goals that have been marked complete as active priorities |
| **CoachingSession** | Allowed | Session arc tracking, therapeutic stage management, continuity across sessions | Primary domain of the CBT Therapist; defines what was covered and what comes next | Do not skip stage progression; do not reset the session arc without user consent |
| **SessionSummary** | Allowed | Continuity between sessions; recall prior insights and action items without reloading raw history | AI-generated distillations are the cleanest form of session memory | Prefer SessionSummary over Conversation for recall; do not treat summaries as verbatim records |
| **Exercise** | Allowed | Prescribe as behavioral experiments; track completion against session goals | Shared content pool; CBT Therapist uses exercises with clinical intent | Do not recommend exercises that contradict the current session stage or formulation |
| **Resource** | Allowed | Psychoeducation to reinforce session content and CBT concepts | Curated library aligned to therapeutic goals | Match resource category to the current session focus; do not recommend generic content |
| **AudioContent** | Allowed | Psychoeducation audio, guided CBT practice aligned to session themes | Complements Exercise and Resource in the shared recommendation pool | Do not use relaxation-only audio as a substitute for structured CBT work |
| **Journey** | Allowed | Guide user through structured multi-step CBT programs at full clinical depth | Multi-step content paths are appropriate for the CBT Therapist's structured approach | Respect the user's current step; do not skip ahead without completing prior steps |
| **MoodEntry** | Restricted | Contextualize session tone; acknowledge emotional state before structured work | High-frequency wellbeing signal; secondary for CBT Therapist but useful for calibration | Do not treat mood data as a replacement for structured assessment; do not over-index on a single entry |
| **CompanionMemory** | Restricted | Reference persistent user facts to avoid repeating known context | Companion memory is the AI Companion's primary layer; CBT Therapist may read for continuity | Read only; do not write to or overwrite companion memory entries |
| **CaseFormulation** | Restricted | Inform session planning with core beliefs and maintaining factors; read for context only | Clinically sensitive formulation; enables deeper personalization when accessed responsibly | Read only; never reinterpret, overwrite, or surface raw formulation text to the user without clinical oversight |
| **Conversation** | Restricted | Fallback continuity when SessionSummary is insufficient | Raw interaction history provides detail unavailable in summaries | Scope to the minimum required context window; prefer SessionSummary; never surface unfiltered raw messages |
| **Subscription** | Prohibited | — | Billing metadata; carries no therapeutic value | Do not use to gate, shape, or modify clinical responses |
| **UserDeletedConversations** | Prohibited | — | System data hygiene log; no therapeutic content | Do not access under any circumstances |
| **AppNotification** | Prohibited | — | System operational metadata; no therapeutic content | Do not access under any circumstances |
| **MindGameActivity** | Prohibited | — | Engagement game records; no therapeutic content | Do not use as a signal for progress or wellbeing |

---

## C. AI Companion Access Table

| Entity | Policy | Best Permitted Usage | Reason | Boundary Note |
|---|---|---|---|---|
| **CompanionMemory** | Allowed | Persistent user context, tone calibration, homework reminders, reflective listening | Primary memory layer for the AI Companion; must be read before any other entity | Must be accurate and current; stale entries distort all downstream responses |
| **MoodEntry** | Allowed | Emotional validation, real-time check-in responses, mood pattern acknowledgement | Highest-frequency wellbeing signal; directly maps to the AI Companion's core role | Do not treat mood entries as a complete emotional picture; pair with companion memory for context |
| **Exercise** | Allowed | Suggest coping tools in response to distress signals or low mood | Shared content pool; AI Companion uses exercises to support emotional regulation | Do not prescribe exercises as clinical assignments; frame as gentle suggestions only |
| **Resource** | Allowed | Offer gentle self-help prompts during emotional support moments | Curated content library serves both agents; AI Companion uses it at a supportive level | Do not recommend resources that imply clinical diagnosis or formal assessment |
| **AudioContent** | Allowed | Queue guided meditation or relaxation audio for immediate emotional regulation | Complements the AI Companion's supportive role; directly relevant to in-the-moment needs | Do not use psychoeducation-heavy audio as the primary response to emotional distress |
| **Journey** | Allowed | Provide gentle step-by-step pacing for users not yet engaged in active coaching sessions | Multi-step paths are appropriate at a non-clinical depth for the AI Companion | Do not advance the user past their current step; do not use Journey as a substitute for active coaching |
| **Goal** | Restricted | Gentle encouragement and progress reinforcement; homework reminders | Secondary for AI Companion; goals exist primarily in the CBT Therapist domain | Do not set, modify, or formally evaluate goals; reference only to reinforce encouragement |
| **SessionSummary** | Restricted | Reference to avoid repeating topics already resolved in coaching | Distilled session memory helps the AI Companion maintain continuity | Do not rely on session summaries as the primary driver of conversation; they are continuity context only |
| **Conversation** | Restricted | Recall specific prior exchanges when companion memory is insufficient | Raw history is available but carries privacy risk and volume | Scope to the minimum required context; prefer companion memory and session summaries over raw conversation logs |
| **ThoughtJournal** | Prohibited | — | Core CBT content requiring structured clinical reasoning | AI Companion must not access, interpret, or reference thought records; this is the CBT Therapist's domain |
| **CoachingSession** | Prohibited | — | Structured coaching arcs are the CBT Therapist's primary domain | AI Companion must not read session stages or therapeutic arc data |
| **CaseFormulation** | Prohibited | — | Most clinically sensitive entity in the system; requires clinical oversight | AI Companion must never access core beliefs or early experience data under any circumstances |
| **Subscription** | Prohibited | — | Billing metadata; carries no emotional or relational value | Do not use to gate, shape, or modify supportive responses |
| **UserDeletedConversations** | Prohibited | — | System data hygiene log; no relational content | Do not access under any circumstances |
| **AppNotification** | Prohibited | — | System operational metadata; no relational content | Do not access under any circumstances |
| **MindGameActivity** | Prohibited | — | Engagement game records; no emotional or therapeutic content | Do not use as a wellbeing or engagement signal |

---

## D. Cross-Agent Rules

### Safe Shared Entities
These entities are safe for both agents to access in normal operation, each with its own usage intent:

| Entity | CBT Therapist Usage | AI Companion Usage |
|---|---|---|
| **Exercise** | Clinical prescription, behavioral experiments | Coping skill suggestions, emotional regulation support |
| **Resource** | Psychoeducation aligned to session content | Gentle self-help prompts during emotional support |
| **AudioContent** | Guided CBT practice, psychoeducation audio | Guided meditation, relaxation for in-the-moment needs |
| **Journey** | Structured CBT program delivery at full clinical depth | Gentle pacing for users not in active coaching |

### Entities That Should Not Be Shared Equally
These entities have a clear primary owner. The secondary agent may reference them only under the stated restrictions:

| Entity | Primary Owner | Secondary Agent Access |
|---|---|---|
| **ThoughtJournal** | CBT Therapist (Allowed) | AI Companion — Prohibited |
| **CoachingSession** | CBT Therapist (Allowed) | AI Companion — Prohibited |
| **CompanionMemory** | AI Companion (Allowed) | CBT Therapist — Restricted (read only) |
| **MoodEntry** | AI Companion (Allowed) | CBT Therapist — Restricted (contextual calibration only) |
| **CaseFormulation** | CBT Therapist (Restricted) | AI Companion — Prohibited |

### Entities Requiring Stronger Oversight
Both agents must treat these with elevated care regardless of their individual policy level:

- **CaseFormulation** — read-only; never surfaced raw; never interpreted without clinical review
- **Conversation** — minimum context window; prefer summaries; privacy risk increases with volume
- **CompanionMemory** — must be accurate and current before any other entity is layered on top

---

## E. Absolute Prohibitions

The following entities must remain prohibited for both agents under all circumstances:

| Entity | Reason |
|---|---|
| **Subscription** | Billing and tier data; no therapeutic or emotional value; must never influence AI behavior |
| **UserDeletedConversations** | System data hygiene record; contains references to content the user explicitly chose to remove |
| **AppNotification** | Notification delivery logs; system operational metadata only |
| **MindGameActivity** | Engagement game session logs; not therapeutic or emotional content |

Additionally, **CaseFormulation** and **ThoughtJournal** are absolutely prohibited for the AI Companion specifically, as they require clinical reasoning beyond the companion's defined role.

---

## F. Usage Guardrails

1. **Prefer summaries over raw conversations.** Both agents must read SessionSummary before falling back to Conversation. Raw conversation history is a last resort, not a default context source.

2. **Use CaseFormulation as restricted read-only context only.** The CBT Therapist may read case formulation to inform session planning. Neither agent may write to, reinterpret, or surface raw formulation content to the user without clinical oversight.

3. **Do not use billing, system, or admin entities as therapeutic knowledge.** Subscription, AppNotification, UserDeletedConversations, and MindGameActivity carry no clinical or emotional value and must not influence AI responses.

4. **Do not over-rely on historical conversation logs when cleaner structured context exists.** CompanionMemory, SessionSummary, and ThoughtJournal are more reliable context sources than raw Conversation history, which is high-volume and unfiltered.

5. **The AI Companion must not perform clinical work.** It must not access ThoughtJournal, CoachingSession, or CaseFormulation. Any entity that requires clinical reasoning belongs to the CBT Therapist.

6. **The CBT Therapist must not adopt the AI Companion's emotional-support role as its primary mode.** MoodEntry and CompanionMemory are available to the CBT Therapist for calibration only, not as the foundation of its responses.

7. **Scope conversation access to the minimum required context window.** Neither agent should load full conversation history by default. Define a maximum context window appropriate to the session and use it consistently.

8. **CompanionMemory must be accurate before anything else is layered on top.** If companion memory is stale or incorrect, all downstream personalization is distorted. Treat it as the highest-priority accuracy requirement for the AI Companion.

---

## G. Recommended Policy Outcome

Adopt the following as the safest first policy set:

1. **Wire CompanionMemory first for the AI Companion** — it is the foundation of all personalized responses and must be accurate before any other entity is enabled.
2. **Wire ThoughtJournal and Goal next for the CBT Therapist** — these are the core clinical content layer and are safe with no additional guardrails.
3. **Enable the shared layer (Exercise, Resource, AudioContent, Journey) for both agents** — these are safe for concurrent use; usage intent differs by agent.
4. **Enable CoachingSession and SessionSummary for the CBT Therapist** — enables session continuity and prevents repeated work.
5. **Enable MoodEntry for the AI Companion (Allowed) and CBT Therapist (Restricted)** — add a context-only constraint in the CBT Therapist prompt before enabling.
6. **Enable CaseFormulation for the CBT Therapist under read-only restriction** — do not enable until clinical review of the access control is confirmed.
7. **Enable Conversation for both agents under minimum-window restriction** — do not enable as a default context source; use only where SessionSummary is insufficient.
8. **Keep all four prohibited system entities (Subscription, UserDeletedConversations, AppNotification, MindGameActivity) permanently excluded** from both agents.

---

> **Note:** This document defines access and usage policy for the two AI agents present in the Base44 runtime. It builds on `docs/ai-entity-classification.md` and `docs/ai-agent-content-mapping.md`. No code, schemas, or behavior is changed.
