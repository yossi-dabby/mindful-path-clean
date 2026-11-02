# Data Model — Organizational Reference

> **Purpose:** This document is a pure organizational and documentation reference.
> It does NOT define schemas, change behavior, or introduce migrations.
> All entities remain in the `@base44/sdk` runtime as-is.
> This file exists to make the data layer easier to understand, navigate, and maintain.

---

## A. Domain Grouping Table

| Domain | Entities | Short Reason |
|---|---|---|
| **Emotional Tracking** | MoodEntry, HealthMetric | Record how a user feels (mood, emotions, triggers) and physical wellness data that complements emotional state |
| **CBT Work** | ThoughtJournal, JournalTemplate, CaseFormulation | Core CBT tools: thought records, reusable templates, and clinical case formulation |
| **Goals and Progress** | Goal, GoalTemplate, GoalReminder, UserJourneyProgress | Everything related to what the user wants to achieve and how far they have come |
| **Exercises and Recommendations** | Exercise, ExerciseRecommendationFeedback, DailyChallenge | Therapeutic exercise library, AI recommendation loop, and daily challenge assignments |
| **Reminders and Notifications** | JournalReminder, GoalReminder, ProactiveReminder, AppNotification | All scheduled and triggered messages that re-engage or nudge the user |
| **Coaching and Sessions** | Conversation, CoachingSession, SessionSummary, TherapyFeedback, CompanionMemory | AI-driven conversation layer: live sessions, summaries, feedback, and persistent memory |
| **Resources and Media** | Resource, SavedResource, AudioContent, Video, Playlist, PlaylistVideo, VideoProgress | Content library: articles, guided audio, video, playlists, and consumption tracking |
| **Community and Sharing** | ForumPost, ForumComment, CommunityGroup, GroupMembership, SharedProgress | Social features: forums, groups, memberships, and public progress sharing |
| **Gamification and Motivation** | Badge, UserStreak, UserPoints, MindGameActivity, DailyChallenge | Engagement mechanics: badges, streaks, points, mind games, and daily challenges |
| **Journeys and Flows** | Journey, UserJourneyProgress, StarterPath, DailyFlow | Structured multi-step programs, onboarding paths, and daily content plans |
| **Safety and Crisis** | CrisisAlert | Crisis detection, escalation alerts, and risk management |
| **System and Supporting** | Subscription, UserDeletedConversations, AppNotification | Billing, data hygiene, and app-level infrastructure entities |

> **Note on cross-domain entities:**
> `GoalReminder` belongs primarily to **Reminders and Notifications** but is listed in **Goals and Progress** for discoverability.
> `DailyChallenge` belongs primarily to **Gamification and Motivation** but surfaces in **Exercises and Recommendations**.
> `UserJourneyProgress` is listed in both **Goals and Progress** and **Journeys and Flows**.
> `AppNotification` is listed in both **Reminders and Notifications** and **System and Supporting**.
> Each entity has one canonical home (its section in Part D below) — duplicates above are for navigation only.

---

## B. Safe Organization Plan

### Guiding Principle

All entities live in the `@base44/sdk` runtime. No schema file, migration, or local definition exists — and none should be added. Any organization work must be **purely additive** and must not alter imports already used in the app.

### Suggested Structure

```
src/
  api/
    base44Client.js          ← unchanged; remains the single source of truth
    entities/
      index.js               ← NEW: non-breaking organizational re-export layer
                                     groups entities by domain using lazy getters
                                     existing imports (@/api/base44Client) still work
docs/
  data-model.md              ← THIS FILE: comprehensive entity documentation
  mobile-overflow-audit.md   ← existing, unchanged
```

### What Changes

| File | Change Type | Risk |
|---|---|---|
| `src/api/entities/index.js` | New file (additive) | Zero — existing imports untouched |
| `docs/data-model.md` | New file (documentation) | Zero |

### What Does NOT Change

- `src/api/base44Client.js` — no edits
- All existing `import { base44 } from '@/api/base44Client'` statements — no edits
- All `base44.entities.EntityName.method()` call sites — no edits
- No schema changes, no migrations, no runtime behavior changes

### How to Use the New Entities Index (Optional)

```javascript
// Existing pattern — continues to work unchanged:
import { base44 } from '@/api/base44Client';
const moods = await base44.entities.MoodEntry.list('-date');

// New optional pattern for domain-aware navigation:
import { EmotionalTracking } from '@/api/entities';
const moods = await EmotionalTracking.MoodEntry.list('-date');
```

Both patterns resolve to the same underlying SDK entity — there is no behavior difference.

### Suggested Documentation Grouping

If additional per-domain documentation is ever needed, create files under `docs/domains/`:

```
docs/
  domains/
    emotional-tracking.md
    cbt-work.md
    goals-and-progress.md
    exercises-and-recommendations.md
    reminders-and-notifications.md
    coaching-and-sessions.md
    resources-and-media.md
    community-and-sharing.md
    gamification-and-motivation.md
    journeys-and-flows.md
    safety-and-crisis.md
    system-and-supporting.md
```

This is **not required now** — `docs/data-model.md` is sufficient as a single reference.

---

## C. Uniform Entity Documentation Template

Use this template for every entity. Keep each field short and concrete.

```
### EntityName

| Field | Value |
|---|---|
| **Entity Name** | EntityName |
| **Domain** | Domain name |
| **Main Purpose** | One sentence: what this entity stores and why |
| **Key Relationships** | Other entities this one links to (foreign keys or logical ties) |
| **Main App Usage** | Where this entity is created, read, or mutated in the app |
| **Notes** | Edge cases, cross-domain membership, or things to watch |
```

---

## D. Entity-by-Entity Documentation

### MoodEntry

| Field | Value |
|---|---|
| **Entity Name** | MoodEntry |
| **Domain** | Emotional Tracking |
| **Main Purpose** | Stores a user's daily mood log including emotions, intensity, energy level, sleep quality, triggers, and activities |
| **Key Relationships** | Linked to the authenticated user; may reference a ThoughtJournal entry |
| **Main App Usage** | Created from the Mood Tracker page; read in Home, Progress, and Journal pages |
| **Notes** | The primary emotional health signal — feeds AI coaching context and progress analytics |

---

### HealthMetric

| Field | Value |
|---|---|
| **Entity Name** | HealthMetric |
| **Domain** | Emotional Tracking |
| **Main Purpose** | Stores physical wellness data (sleep hours, exercise minutes, hydration, etc.) that contextualizes emotional health |
| **Key Relationships** | Linked to the authenticated user; complements MoodEntry for the same date |
| **Main App Usage** | Created and read from the Health tracking section; displayed in Progress dashboard |
| **Notes** | Physical metrics are treated as supporting context for emotional patterns, not as standalone health records |

---

### ThoughtJournal

| Field | Value |
|---|---|
| **Entity Name** | ThoughtJournal |
| **Domain** | CBT Work |
| **Main Purpose** | Stores a CBT thought record: situation, automatic thoughts, cognitive distortions, evidence for/against, and balanced thought |
| **Key Relationships** | May reference a JournalTemplate (template_id); may link to a Goal (linked_goal_id) |
| **Main App Usage** | Created in the Journal page; read in Journal list, Session summaries, and Progress page |
| **Notes** | Core CBT entity — the richest structured clinical data in the app |

---

### JournalTemplate

| Field | Value |
|---|---|
| **Entity Name** | JournalTemplate |
| **Domain** | CBT Work |
| **Main Purpose** | Stores a reusable journaling template that pre-fills or customizes ThoughtJournal fields |
| **Key Relationships** | Referenced by ThoughtJournal (template_id) |
| **Main App Usage** | Created and managed in Journal settings; selected when creating a new ThoughtJournal entry |
| **Notes** | Allows therapist-style customization without changing the core ThoughtJournal schema |

---

### CaseFormulation

| Field | Value |
|---|---|
| **Entity Name** | CaseFormulation |
| **Domain** | CBT Work |
| **Main Purpose** | Stores a CBT case conceptualization — longitudinal summary of a user's core beliefs, early experiences, and maintaining factors |
| **Key Relationships** | Linked to the authenticated user; may reference CoachingSession or ThoughtJournal entries |
| **Main App Usage** | Generated or edited in the Coaching or Therapy sections |
| **Notes** | Clinical-level entity; handle with care — contains sensitive formulation data |

---

### Goal

| Field | Value |
|---|---|
| **Entity Name** | Goal |
| **Domain** | Goals and Progress |
| **Main Purpose** | Stores a SMART goal with milestones, progress percentage, category, target date, and motivational context |
| **Key Relationships** | May reference a GoalTemplate; linked to GoalReminder; may reference ThoughtJournal (linked_goal_id) |
| **Main App Usage** | Created via the Goals page or GoalCoachWizard; read in Goals, Home, and Progress pages |
| **Notes** | Central to the CBT behavioral activation loop — goals link cognition to action |

---

### GoalTemplate

| Field | Value |
|---|---|
| **Entity Name** | GoalTemplate |
| **Domain** | Goals and Progress |
| **Main Purpose** | Stores a pre-made goal definition that users can adopt as a starting point |
| **Key Relationships** | Referenced by Goal at creation time |
| **Main App Usage** | Displayed in the Goal creation flow as selectable templates |
| **Notes** | Read-heavy, rarely mutated; likely populated by admin/content seeding |

---

### GoalReminder

| Field | Value |
|---|---|
| **Entity Name** | GoalReminder |
| **Domain** | Goals and Progress (primary); Reminders and Notifications (secondary) |
| **Main Purpose** | Stores a scheduled reminder tied to a specific Goal |
| **Key Relationships** | References Goal (goal_id); linked to the authenticated user |
| **Main App Usage** | Created in the Goal detail view; triggers push or in-app notifications |
| **Notes** | Cross-domain: listed under Reminders for notification pipeline, under Goals for goal context |

---

### UserJourneyProgress

| Field | Value |
|---|---|
| **Entity Name** | UserJourneyProgress |
| **Domain** | Journeys and Flows (primary); Goals and Progress (secondary) |
| **Main Purpose** | Tracks how far a user has progressed through a Journey program (steps completed, current step) |
| **Key Relationships** | References Journey (journey_id); linked to the authenticated user |
| **Main App Usage** | Read and updated in the Journeys page and StarterPath flow |
| **Notes** | Progress data here is separate from Goal.progress — both represent progress but at different levels |

---

### Exercise

| Field | Value |
|---|---|
| **Entity Name** | Exercise |
| **Domain** | Exercises and Recommendations |
| **Main Purpose** | Stores a therapeutic exercise (grounding, breathing, meditation, behavioral activation) with steps, difficulty, duration, and completion data |
| **Key Relationships** | Referenced in DailyFlow (exercise_id); rated via ExerciseRecommendationFeedback |
| **Main App Usage** | Displayed in Exercises library; assigned in DailyFlow; launched from Home |
| **Notes** | Some exercise data is static (defined in exercisesData.js); completion tracking persists per user |

---

### ExerciseRecommendationFeedback

| Field | Value |
|---|---|
| **Entity Name** | ExerciseRecommendationFeedback |
| **Domain** | Exercises and Recommendations |
| **Main Purpose** | Stores a user's rating or feedback on an AI-recommended exercise |
| **Key Relationships** | References Exercise; linked to the authenticated user |
| **Main App Usage** | Submitted after completing or viewing an AI-recommended exercise |
| **Notes** | Feeds the recommendation feedback loop — important for AI quality improvement |

---

### DailyChallenge

| Field | Value |
|---|---|
| **Entity Name** | DailyChallenge |
| **Domain** | Gamification and Motivation (primary); Exercises and Recommendations (secondary) |
| **Main Purpose** | Stores a daily therapeutic challenge assigned to the user with completion status and reward metadata |
| **Key Relationships** | May reference Exercise; linked to the authenticated user |
| **Main App Usage** | Displayed on the Home screen; completed challenges award UserPoints or Badge progress |
| **Notes** | Cross-domain: therapeutic content (Exercises) + engagement mechanic (Gamification) |

---

### JournalReminder

| Field | Value |
|---|---|
| **Entity Name** | JournalReminder |
| **Domain** | Reminders and Notifications |
| **Main Purpose** | Stores a scheduled reminder to prompt the user to complete a journaling entry |
| **Key Relationships** | Linked to the authenticated user; may specify a JournalTemplate |
| **Main App Usage** | Created in Journal settings; triggers push or in-app notifications |
| **Notes** | Habit-formation entity — frequency and timing are key fields |

---

### ProactiveReminder

| Field | Value |
|---|---|
| **Entity Name** | ProactiveReminder |
| **Domain** | Reminders and Notifications |
| **Main Purpose** | Stores an AI-generated proactive nudge that re-engages a user based on inactivity or patterns |
| **Key Relationships** | Linked to the authenticated user; may reference MoodEntry or Goal context |
| **Main App Usage** | Generated by the AI layer; delivered as push or in-app notifications |
| **Notes** | Distinct from JournalReminder and GoalReminder — these are dynamic, not user-scheduled |

---

### AppNotification

| Field | Value |
|---|---|
| **Entity Name** | AppNotification |
| **Domain** | Reminders and Notifications (primary); System and Supporting (secondary) |
| **Main Purpose** | Stores an in-app notification record (read status, message, type, target action) |
| **Key Relationships** | Linked to the authenticated user; may reference any entity as the notification subject |
| **Main App Usage** | Read in the Notifications panel; created by the backend on trigger events |
| **Notes** | This is the delivery record — ProactiveReminder/GoalReminder/JournalReminder are the scheduling sources |

---

### Conversation

| Field | Value |
|---|---|
| **Entity Name** | Conversation |
| **Domain** | Coaching and Sessions |
| **Main Purpose** | Stores a real-time AI companion conversation thread with message history |
| **Key Relationships** | Linked to the authenticated user; may spawn CrisisAlert; linked to CompanionMemory |
| **Main App Usage** | Created and read in the Chat page |
| **Notes** | Sensitive — contains raw user disclosures; see also UserDeletedConversations for deletion handling |

---

### CoachingSession

| Field | Value |
|---|---|
| **Entity Name** | CoachingSession |
| **Domain** | Coaching and Sessions |
| **Main Purpose** | Stores a structured AI coaching session with session type, goals addressed, and session data |
| **Key Relationships** | Linked to the authenticated user; may link to Goal and SessionSummary |
| **Main App Usage** | Created via the Coach page or CoachingSessionWizard; read in Journal and Progress pages |
| **Notes** | More structured than Conversation — has defined phases (check-in, exploration, action planning) |

---

### SessionSummary

| Field | Value |
|---|---|
| **Entity Name** | SessionSummary |
| **Domain** | Coaching and Sessions |
| **Main Purpose** | Stores an AI-generated summary of a completed CoachingSession including key insights and action items |
| **Key Relationships** | References CoachingSession (session_id); linked to the authenticated user |
| **Main App Usage** | Read in the Journal page and session history views |
| **Notes** | Derived entity — always created as a result of a completed CoachingSession |

---

### TherapyFeedback

| Field | Value |
|---|---|
| **Entity Name** | TherapyFeedback |
| **Domain** | Coaching and Sessions |
| **Main Purpose** | Stores user feedback on a therapy or coaching session (helpfulness rating, comments) |
| **Key Relationships** | References CoachingSession or Conversation; linked to the authenticated user |
| **Main App Usage** | Submitted at the end of a session via a feedback prompt |
| **Notes** | Aggregated for AI quality monitoring; not shown back to the user |

---

### CompanionMemory

| Field | Value |
|---|---|
| **Entity Name** | CompanionMemory |
| **Domain** | Coaching and Sessions |
| **Main Purpose** | Stores persistent facts the AI companion has learned about the user for long-term context continuity |
| **Key Relationships** | Linked to the authenticated user; populated from Conversation and CoachingSession analysis |
| **Main App Usage** | Read by the AI context builder before each session; not directly surfaced in UI |
| **Notes** | Privacy-sensitive — contains inferred user preferences and history; deletion should cascade with user data |

---

### Resource

| Field | Value |
|---|---|
| **Entity Name** | Resource |
| **Domain** | Resources and Media |
| **Main Purpose** | Stores a curated mental health resource (article, guide, tool link) with category, tags, and content |
| **Key Relationships** | Saved by users via SavedResource |
| **Main App Usage** | Displayed in the Resources library; filterable by category and tag |
| **Notes** | Mostly read-only for end users; populated by admin/content team |

---

### SavedResource

| Field | Value |
|---|---|
| **Entity Name** | SavedResource |
| **Domain** | Resources and Media |
| **Main Purpose** | Records that a user has bookmarked a specific Resource |
| **Key Relationships** | References Resource (resource_id); linked to the authenticated user |
| **Main App Usage** | Created when user taps "Save" on a Resource; read in the Saved Resources view |
| **Notes** | Junction record pattern — lightweight, no additional fields beyond the link |

---

### AudioContent

| Field | Value |
|---|---|
| **Entity Name** | AudioContent |
| **Domain** | Resources and Media |
| **Main Purpose** | Stores a guided audio session (meditation, breathing exercise, psychoeducation) with URL and metadata |
| **Key Relationships** | May appear in Playlist via PlaylistVideo; linked to Exercise (optional) |
| **Main App Usage** | Played in the Audio player component; listed in audio library |
| **Notes** | Playback progress is not tracked per-entity (unlike Video/VideoProgress) — add if needed |

---

### Video

| Field | Value |
|---|---|
| **Entity Name** | Video |
| **Domain** | Resources and Media |
| **Main Purpose** | Stores a video content item with URL, thumbnail, title, category, and ordering |
| **Key Relationships** | Linked to Playlist via PlaylistVideo; progress tracked via VideoProgress |
| **Main App Usage** | Listed and played in the Videos page |
| **Notes** | Ordered by an `order` field — maintain this when adding new videos |

---

### Playlist

| Field | Value |
|---|---|
| **Entity Name** | Playlist |
| **Domain** | Resources and Media |
| **Main Purpose** | Stores a named collection of Videos grouped by theme or purpose |
| **Key Relationships** | Contains Videos via PlaylistVideo |
| **Main App Usage** | Displayed in the Playlists section; each playlist expands to show its videos |
| **Notes** | Curator-created; users do not create custom playlists in current version |

---

### PlaylistVideo

| Field | Value |
|---|---|
| **Entity Name** | PlaylistVideo |
| **Domain** | Resources and Media |
| **Main Purpose** | Junction record linking a Video to a Playlist with an ordering index |
| **Key Relationships** | References Playlist (playlist_id) and Video (video_id) |
| **Main App Usage** | Queried to build playlist content in the Videos page |
| **Notes** | Pure relational join table — no behavior of its own |

---

### VideoProgress

| Field | Value |
|---|---|
| **Entity Name** | VideoProgress |
| **Domain** | Resources and Media |
| **Main Purpose** | Tracks a user's watch progress (seconds watched, completion flag) for a specific Video |
| **Key Relationships** | References Video (video_id); linked to the authenticated user |
| **Main App Usage** | Updated during video playback; read to show "continue watching" state |
| **Notes** | One record per user per video — upsert semantics on playback |

---

### ForumPost

| Field | Value |
|---|---|
| **Entity Name** | ForumPost |
| **Domain** | Community and Sharing |
| **Main Purpose** | Stores a community forum post with content, category, author, and reaction metadata |
| **Key Relationships** | Linked to the authenticated user; has child ForumComments |
| **Main App Usage** | Created and read in the Community page |
| **Notes** | Moderation controls and content safety rules apply — crisis language must trigger CrisisAlert |

---

### ForumComment

| Field | Value |
|---|---|
| **Entity Name** | ForumComment |
| **Domain** | Community and Sharing |
| **Main Purpose** | Stores a reply comment on a ForumPost |
| **Key Relationships** | References ForumPost (post_id); linked to the authenticated user |
| **Main App Usage** | Created and read in the post detail view within the Community page |
| **Notes** | Threaded comments not currently supported — all comments are flat replies to the post |

---

### CommunityGroup

| Field | Value |
|---|---|
| **Entity Name** | CommunityGroup |
| **Domain** | Community and Sharing |
| **Main Purpose** | Stores a named community group with description, rules, and membership count |
| **Key Relationships** | Members linked via GroupMembership |
| **Main App Usage** | Listed in the Community page; users join via the group detail view |
| **Notes** | Groups are topic-based (e.g., "Anxiety Support") — not user-created in current version |

---

### GroupMembership

| Field | Value |
|---|---|
| **Entity Name** | GroupMembership |
| **Domain** | Community and Sharing |
| **Main Purpose** | Records that a user has joined a CommunityGroup with their role and join date |
| **Key Relationships** | References CommunityGroup (group_id); linked to the authenticated user |
| **Main App Usage** | Created on group join; read to filter community content by membership |
| **Notes** | Junction record — delete on leave (no soft delete needed) |

---

### SharedProgress

| Field | Value |
|---|---|
| **Entity Name** | SharedProgress |
| **Domain** | Community and Sharing |
| **Main Purpose** | Stores a progress milestone or achievement that a user has chosen to share with the community |
| **Key Relationships** | May reference Goal, Badge, or UserStreak; linked to the authenticated user |
| **Main App Usage** | Created when user taps "Share" on a milestone; displayed in the community feed |
| **Notes** | User-initiated sharing — never auto-shared; privacy must be respected |

---

### Badge

| Field | Value |
|---|---|
| **Entity Name** | Badge |
| **Domain** | Gamification and Motivation |
| **Main Purpose** | Stores an achievement badge definition and the user's earned status |
| **Key Relationships** | May be referenced by SharedProgress; linked to UserPoints for reward context |
| **Main App Usage** | Displayed in the Gamification/Profile section; earned on milestone completion |
| **Notes** | Badge definitions may be static content; earned badges are user-specific records |

---

### UserStreak

| Field | Value |
|---|---|
| **Entity Name** | UserStreak |
| **Domain** | Gamification and Motivation |
| **Main Purpose** | Tracks the user's current and longest consecutive activity streak |
| **Key Relationships** | Linked to the authenticated user; may update on MoodEntry or Exercise completion |
| **Main App Usage** | Displayed on Home and Profile; updated daily on qualifying activity |
| **Notes** | Streak reset logic must be timezone-aware — handle carefully |

---

### UserPoints

| Field | Value |
|---|---|
| **Entity Name** | UserPoints |
| **Domain** | Gamification and Motivation |
| **Main Purpose** | Accumulates points earned from completing exercises, challenges, journaling, and other activities |
| **Key Relationships** | Linked to the authenticated user; awards may reference Badge or DailyChallenge |
| **Main App Usage** | Displayed on Home and Profile; updated on each rewarded action |
| **Notes** | Points are additive — no deduction logic currently; treat as append-only ledger |

---

### MindGameActivity

| Field | Value |
|---|---|
| **Entity Name** | MindGameActivity |
| **Domain** | Gamification and Motivation |
| **Main Purpose** | Records a session of a cognitive/therapeutic mind game including game type, score, and duration |
| **Key Relationships** | Linked to the authenticated user; may award UserPoints |
| **Main App Usage** | Created on game completion in the experiential games section |
| **Notes** | 20+ game types exist — game_type field is the discriminator |

---

### Journey

| Field | Value |
|---|---|
| **Entity Name** | Journey |
| **Domain** | Journeys and Flows |
| **Main Purpose** | Stores a structured multi-step therapeutic program or learning path with steps, goals, and content references |
| **Key Relationships** | Progress tracked via UserJourneyProgress |
| **Main App Usage** | Listed and launched from the Journeys page |
| **Notes** | Content-heavy entity — step definitions may include exercises, resources, and reflections |

---

### StarterPath

| Field | Value |
|---|---|
| **Entity Name** | StarterPath |
| **Domain** | Journeys and Flows |
| **Main Purpose** | Stores a curated onboarding path tailored to a new user's stated goals and needs |
| **Key Relationships** | Linked to the authenticated user; may reference Journey |
| **Main App Usage** | Assigned during onboarding; read in the StarterPath walkthrough component |
| **Notes** | One per user — created at onboarding, not editable after completion |

---

### DailyFlow

| Field | Value |
|---|---|
| **Entity Name** | DailyFlow |
| **Domain** | Journeys and Flows |
| **Main Purpose** | Stores a daily structured content plan for the user: one exercise, one resource, one reflection prompt |
| **Key Relationships** | References Exercise (exercise_id); linked to the authenticated user |
| **Main App Usage** | Generated and read on the Home page; regenerated daily |
| **Notes** | One per user per date — filter by date field; create if missing for today |

---

### CrisisAlert

| Field | Value |
|---|---|
| **Entity Name** | CrisisAlert |
| **Domain** | Safety and Crisis |
| **Main Purpose** | Records a detected crisis signal from user input with severity, context, and escalation status |
| **Key Relationships** | Linked to the authenticated user; may reference Conversation (conversation_id) |
| **Main App Usage** | Created by the AI safety layer during Conversation; triggers a crisis intervention UI |
| **Notes** | Highest-sensitivity entity in the system — never auto-delete, audit all access |

---

### Subscription

| Field | Value |
|---|---|
| **Entity Name** | Subscription |
| **Domain** | System and Supporting |
| **Main Purpose** | Stores the user's subscription tier, status, billing provider, and renewal metadata |
| **Key Relationships** | Linked to the authenticated user; gates premium features throughout the app |
| **Main App Usage** | Read on app load to determine feature access; updated by Stripe webhook handler |
| **Notes** | Source of truth for premium vs. free access — never use client-side flags as substitute |

---

### UserDeletedConversations

| Field | Value |
|---|---|
| **Entity Name** | UserDeletedConversations |
| **Domain** | System and Supporting |
| **Main Purpose** | Logs the IDs of Conversations deleted by the user for data hygiene and audit purposes |
| **Key Relationships** | Linked to the authenticated user; references Conversation (conversation_id) |
| **Main App Usage** | Written when user deletes a conversation; read to filter conversation list |
| **Notes** | Tombstone pattern — actual conversation data should be deleted separately per privacy policy |

---

## E. Non-Breaking Implementation Order

Follow this order to apply the organizational improvements safely. Each step is independently safe.

### Step 1 — Documentation First (Zero Risk)

Create `docs/data-model.md` (this file).

- No code changes
- No import changes
- Can be done and committed independently
- Reviewable without running the app

### Step 2 — Create the Entities Index File (Zero Risk)

Create `src/api/entities/index.js` with domain-grouped lazy getters.

- New file only — no edits to existing files
- All existing `import { base44 } from '@/api/base44Client'` imports continue to work
- New file provides an optional alternative import path
- Verify with: `npm run lint` and `npm test`

### Step 3 — Validate the New Index (Low Risk)

Run lint and unit tests to confirm no regressions:

```bash
npm run lint
npm test
```

No test changes are needed — the new file adds no behavior.

### Step 4 — Team Review (Organizational)

- Share `docs/data-model.md` with the team for domain consensus
- Adjust domain assignments if the team disagrees with any grouping
- Update entity documentation entries as needed

### Step 5 — Gradual Adoption (Optional, Future)

If desired, new code written after this point may optionally import via `@/api/entities` instead of `@/api/base44Client`. This is purely a style preference — both work identically.

**Do NOT migrate existing call sites in bulk** — that is a risky mass refactor with no runtime benefit.

---

## F. Final Caution Notes

1. **Do not touch `src/api/base44Client.js`.**
   It is the single initialization point for the SDK. Any change here affects the entire app.

2. **Do not move, rename, or delete any entity.**
   Entities are defined in the `@base44/sdk` runtime. They cannot be renamed locally.

3. **CrisisAlert is safety-critical.**
   Any code path that creates, reads, or updates CrisisAlert must be reviewed with extra care. Do not add caching layers that could delay crisis detection.

4. **CompanionMemory and Conversation contain sensitive user data.**
   Any cleanup, archiving, or export of these entities must follow the privacy policy. Ensure UserDeletedConversations is updated whenever a Conversation is deleted.

5. **Subscription gates premium features.**
   Do not add client-side overrides. The Subscription entity is the canonical source of access truth.

6. **UserStreak has timezone sensitivity.**
   Streak reset logic depends on date comparison. Any changes to streak evaluation must account for the user's local timezone, not UTC.

7. **DailyFlow is a per-user-per-date record.**
   Always filter by both user and date. Creating duplicates will break the Home page flow.

8. **GoalReminder and JournalReminder are cross-domain.**
   They appear in both the Goals/Journal domains and the Reminders/Notifications domain. When querying them, use the context that makes sense (goal context vs. notification pipeline context).

9. **The entities index file uses lazy getters.**
   This ensures entities are always accessed through the live SDK client, not cached at module load time. Do not refactor to direct property assignment (`const MoodEntry = base44.entities.MoodEntry`) without verifying SDK initialization order.

10. **This document is a living reference.**
    Update it when new entities are added or when domain boundaries shift. Stale documentation is worse than no documentation.
