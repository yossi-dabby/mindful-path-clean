# AI Entity Classification — Readiness Reference

> **Purpose:** This document classifies all existing entities into three AI-readiness groups.
> It is an analysis-only reference. No code, schemas, or behavior is changed.
> All entities remain in the `@base44/sdk` runtime as-is.

---

## Classification Groups

| Group | Meaning |
|---|---|
| **AI Core Content** | Entities containing real user-facing content the AI should rely on directly as a knowledge source |
| **AI Context Only** | Entities that should not be treated as core knowledge, but may help personalize, contextualize, prioritize, or guide AI responses |
| **Not for AI Knowledge** | Entities that should not be used by AI as knowledge sources |

---

## A. AI Core Content

These 12 entities form the primary knowledge foundation the AI should read, index, and reason over directly.

| Entity | Rationale |
|---|---|
| **MoodEntry** | User's mood, emotions, intensity, triggers, and free-text notes — the highest-frequency real-time wellbeing signal |
| **ThoughtJournal** | CBT thought records with automatic thoughts, cognitive distortions, evidence, and balanced views — the therapeutic core |
| **Goal** | SMART goals, problem definitions, obstacles, action plans, and milestone tracking — defines what the user is working toward |
| **Exercise** | Curated exercise library with descriptions, step-by-step instructions, and categories — the AI's primary recommendation pool for skills practice |
| **Resource** | Curated article, audio, and media library with titles, descriptions, and categories — AI recommends directly from this |
| **Conversation** | Full AI conversation message history — the primary interaction record for continuity and context recall across sessions |
| **CoachingSession** | Session focus areas, therapeutic stages, and action plans — tracks the user's coaching arc over time |
| **SessionSummary** | AI-generated distillations with key insights and action items — the AI's own memory of what was learned in previous sessions |
| **CompanionMemory** | Explicit persistent facts the AI stores about the user — the AI's active memory layer; must be reliable before any other entity |
| **CaseFormulation** | Core beliefs, early experiences, and maintaining factors — the deepest psychological formulation of the user |
| **Journey** | Structured therapeutic content paths with step-by-step exercises, resources, and reflection prompts |
| **AudioContent** | Guided audio library with descriptions and categories — AI recommends directly from this alongside Exercise and Resource |

---

## B. AI Context Only

These 26 entities should not be treated as primary content knowledge, but may inform personalization, prioritization, safety, or response tone.

| Entity | Rationale |
|---|---|
| **JournalTemplate** | Template structures and fields — guides the AI on what prompts are available, not user content itself |
| **JournalReminder** | Journaling schedule settings — signals the user's intended journaling cadence |
| **ProactiveReminder** | Messages already sent to the user — prevents redundant or repetitive AI outreach |
| **SavedResource** | User's saved resources — signals content interest areas for future recommendations |
| **HealthMetric** | Sleep hours, exercise minutes, and hydration data — contextualizes current wellbeing state quantitatively |
| **ForumPost** | Community posts with titles and content — provides peer-context and psychoeducation signals but is user-generated and unvetted |
| **ForumComment** | Community replies — peer support context; lower signal quality than ForumPost |
| **CommunityGroup** | Group names and descriptions — indicates which communities the user is part of |
| **GroupMembership** | Group membership records — social context for understanding the user's peer environment |
| **SharedProgress** | User's publicly shared achievements — motivational and milestone context |
| **UserStreak** | Current and longest streaks by type — consistency and habit-adherence signals |
| **Badge** | Achievement state and progress toward earning — motivational and engagement context |
| **DailyChallenge** | Today's assigned challenge — guides AI to reinforce or follow up on the active challenge |
| **DailyFlow** | Daily assigned exercise and resource — indicates what the user is meant to focus on today |
| **StarterPath** | Onboarding path status and day count — indicates experience level and program stage |
| **Video** | Video content library with descriptions and categories — AI may reference when recommending media content |
| **Playlist** | Curated playlist metadata — indicates how video content is organized |
| **PlaylistVideo** | Video ordering within playlists — content sequencing context |
| **VideoProgress** | Seconds watched and completion flags per video — signals content engagement and interest |
| **ExerciseRecommendationFeedback** | User ratings and comments on recommended exercises — improves future recommendation targeting |
| **UserPoints** | Total accumulated points by category — indicates overall engagement level |
| **GoalTemplate** | Template structures for goal categories — guides AI on available goal types; not user-authored content |
| **GoalReminder** | Goal reminder schedule settings — signals user's preferred engagement patterns |
| **UserJourneyProgress** | Steps completed and current position in a Journey — progress and pacing context |
| **TherapyFeedback** | User feedback on AI message quality — calibrates AI behavior and response style |
| **CrisisAlert** | Crisis detection signals, severity, and escalation status — critical safety context that must shape every AI response |

---

## C. Not for AI Knowledge

These 4 entities are system infrastructure or administrative records. They carry no therapeutic or content value for AI.

| Entity | Rationale |
|---|---|
| **Subscription** | Billing tier and renewal data — irrelevant to therapeutic AI responses |
| **UserDeletedConversations** | Log of user-deleted conversation IDs — system metadata for data hygiene only |
| **AppNotification** | Notification delivery records — system operational metadata; not content |
| **MindGameActivity** | Individual game session logs with scores — engagement game records, not therapeutic content |

---

## D. Priority Recommendation

From **AI Core Content** only — the order in which entities should be wired into the AI knowledge layer for maximum early impact:

| Priority | Entity | Reason |
|---|---|---|
| 1 | **CompanionMemory** | The AI's own persistent memory layer — must be accurate and trustworthy before anything else is layered on top |
| 2 | **MoodEntry** | Highest-frequency real-time signal — reflects the user's current emotional state and is generated almost daily |
| 3 | **ThoughtJournal** | Contains the deepest user-authored content — automatic thoughts, distortions, and balanced views reveal cognitive patterns directly |
| 4 | **Goal** | Defines the user's stated direction — once goals are known, the AI can align every recommendation to user intent |
| 5 | **CaseFormulation** | Psychological foundation — core beliefs and early experiences inform the personalization of everything above |
| 6 | **CoachingSession** + **SessionSummary** | Session arcs and distilled insights — enable the AI to maintain continuity and not repeat resolved work |
| 7 | **Exercise** + **Resource** + **AudioContent** | The content recommendation pool — must be indexed before the AI can suggest specific skills or media |
| 8 | **Conversation** | Raw interaction history — valuable for continuity but large in volume; session-level summarization (SessionSummary) should be preferred at scale |
| 9 | **Journey** | Structured paths — useful context once the core emotional and goal layer is established |

---

> **Note:** This document classifies all 42 entities present in the codebase at the time of writing.
