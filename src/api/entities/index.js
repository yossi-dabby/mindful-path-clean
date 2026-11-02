/**
 * @file src/api/entities/index.js
 *
 * Organizational re-export layer for all data model entities.
 *
 * This file groups entities by domain for clarity and maintainability.
 * It does NOT change entity behavior, schemas, or API contracts.
 * All existing imports from '@/api/base44Client' continue to work unchanged.
 *
 * Usage (new, optional — both resolve to the same underlying SDK entity):
 *   import { EmotionalTracking } from '@/api/entities';
 *   EmotionalTracking.MoodEntry.list('-date');
 *
 * Usage (existing, unchanged):
 *   import { base44 } from '@/api/base44Client';
 *   base44.entities.MoodEntry.list('-date');
 *
 * Lazy getters are used throughout so that entities are always resolved
 * through the live SDK client rather than cached at module load time.
 *
 * See docs/data-model.md for the full domain reference, entity-by-entity
 * documentation, and the safe implementation order.
 */

import { base44 } from '@/api/base44Client';

// ============================================================
// DOMAIN: Emotional Tracking
// Entities for mood logging, emotions, and physical wellness data.
// ============================================================

export const EmotionalTracking = {
  /** MoodEntry — Daily mood logs with emotions, intensity, energy, sleep, triggers, and activities. */
  get MoodEntry() { return base44.entities.MoodEntry; },
  /** HealthMetric — Physical wellness metrics (sleep hours, exercise, hydration) that complement mood data. */
  get HealthMetric() { return base44.entities.HealthMetric; },
};

// ============================================================
// DOMAIN: CBT Work
// Entities for cognitive behavioral therapy exercises and templates.
// ============================================================

export const CBTWork = {
  /** ThoughtJournal — CBT thought records: situation, automatic thoughts, distortions, evidence, balanced thought. */
  get ThoughtJournal() { return base44.entities.ThoughtJournal; },
  /** JournalTemplate — Reusable CBT templates for structured thought journaling. */
  get JournalTemplate() { return base44.entities.JournalTemplate; },
  /** CaseFormulation — CBT case conceptualization for longitudinal clinical framing. */
  get CaseFormulation() { return base44.entities.CaseFormulation; },
};

// ============================================================
// DOMAIN: Goals and Progress
// Entities for goal setting, templates, reminders, and journey progress.
// ============================================================

export const GoalsAndProgress = {
  /** Goal — SMART goals with milestones, progress percentage, category, and motivational context. */
  get Goal() { return base44.entities.Goal; },
  /** GoalTemplate — Pre-made goal definitions users can adopt as a starting point. */
  get GoalTemplate() { return base44.entities.GoalTemplate; },
  /** GoalReminder — Scheduled reminders tied to a specific Goal. (Also in RemindersAndNotifications.) */
  get GoalReminder() { return base44.entities.GoalReminder; },
  /** UserJourneyProgress — Tracks how far a user has progressed through a Journey. (Also in JourneysAndFlows.) */
  get UserJourneyProgress() { return base44.entities.UserJourneyProgress; },
};

// ============================================================
// DOMAIN: Exercises and Recommendations
// Entities for the therapeutic exercise library and recommendation feedback.
// ============================================================

export const ExercisesAndRecommendations = {
  /** Exercise — Therapeutic exercises (grounding, breathing, meditation, behavioral activation). */
  get Exercise() { return base44.entities.Exercise; },
  /** ExerciseRecommendationFeedback — User rating or feedback on an AI-recommended exercise. */
  get ExerciseRecommendationFeedback() { return base44.entities.ExerciseRecommendationFeedback; },
  /** DailyChallenge — Daily gamified therapeutic challenge. (Also in GamificationAndMotivation.) */
  get DailyChallenge() { return base44.entities.DailyChallenge; },
};

// ============================================================
// DOMAIN: Reminders and Notifications
// Entities for scheduled reminders and in-app notifications.
// ============================================================

export const RemindersAndNotifications = {
  /** JournalReminder — Scheduled reminders for journaling habit formation. */
  get JournalReminder() { return base44.entities.JournalReminder; },
  /** GoalReminder — Scheduled reminders for goal check-ins. (Also in GoalsAndProgress.) */
  get GoalReminder() { return base44.entities.GoalReminder; },
  /** ProactiveReminder — AI-generated proactive nudges to re-engage users based on patterns. */
  get ProactiveReminder() { return base44.entities.ProactiveReminder; },
  /** AppNotification — In-app notification records (read status, message, target action). (Also in SystemAndSupporting.) */
  get AppNotification() { return base44.entities.AppNotification; },
};

// ============================================================
// DOMAIN: Coaching and Sessions
// Entities for AI coaching sessions, session history, feedback, and memory.
// ============================================================

export const CoachingAndSessions = {
  /** Conversation — Real-time AI companion conversation thread with message history. */
  get Conversation() { return base44.entities.Conversation; },
  /** CoachingSession — Structured AI coaching session records. */
  get CoachingSession() { return base44.entities.CoachingSession; },
  /** SessionSummary — AI-generated summary of a completed CoachingSession. */
  get SessionSummary() { return base44.entities.SessionSummary; },
  /** TherapyFeedback — User feedback on a therapy or coaching session. */
  get TherapyFeedback() { return base44.entities.TherapyFeedback; },
  /** CompanionMemory — Persistent AI companion memory for long-term context continuity. */
  get CompanionMemory() { return base44.entities.CompanionMemory; },
};

// ============================================================
// DOMAIN: Resources and Media
// Entities for the content library: articles, audio, video, and playlists.
// ============================================================

export const ResourcesAndMedia = {
  /** Resource — Curated mental health articles, guides, and reference materials. */
  get Resource() { return base44.entities.Resource; },
  /** SavedResource — Resources bookmarked by the user. */
  get SavedResource() { return base44.entities.SavedResource; },
  /** AudioContent — Guided audio sessions (meditations, breathing exercises, psychoeducation). */
  get AudioContent() { return base44.entities.AudioContent; },
  /** Video — Video content items for psychoeducation and skill-building. */
  get Video() { return base44.entities.Video; },
  /** Playlist — Curated collections of Videos grouped by theme. */
  get Playlist() { return base44.entities.Playlist; },
  /** PlaylistVideo — Junction record linking a Video to a Playlist with an ordering index. */
  get PlaylistVideo() { return base44.entities.PlaylistVideo; },
  /** VideoProgress — Tracks a user's watch progress for a specific Video. */
  get VideoProgress() { return base44.entities.VideoProgress; },
};

// ============================================================
// DOMAIN: Community and Sharing
// Entities for forums, groups, memberships, and public progress sharing.
// ============================================================

export const CommunityAndSharing = {
  /** ForumPost — Community forum posts with content, category, and reaction metadata. */
  get ForumPost() { return base44.entities.ForumPost; },
  /** ForumComment — Replies to a ForumPost. */
  get ForumComment() { return base44.entities.ForumComment; },
  /** CommunityGroup — Named community groups with descriptions and membership counts. */
  get CommunityGroup() { return base44.entities.CommunityGroup; },
  /** GroupMembership — Records that a user has joined a CommunityGroup. */
  get GroupMembership() { return base44.entities.GroupMembership; },
  /** SharedProgress — Progress milestones a user has chosen to share with the community. */
  get SharedProgress() { return base44.entities.SharedProgress; },
};

// ============================================================
// DOMAIN: Gamification and Motivation
// Entities for streaks, badges, points, mind games, and daily challenges.
// ============================================================

export const GamificationAndMotivation = {
  /** Badge — Achievement badges earned by completing milestones. */
  get Badge() { return base44.entities.Badge; },
  /** UserStreak — Consecutive-day activity streaks per user. */
  get UserStreak() { return base44.entities.UserStreak; },
  /** UserPoints — Accumulated points from app activities and challenges. */
  get UserPoints() { return base44.entities.UserPoints; },
  /** MindGameActivity — Records of cognitive/therapeutic mind game sessions and scores. */
  get MindGameActivity() { return base44.entities.MindGameActivity; },
  /** DailyChallenge — Daily gamified therapeutic challenges. (Also in ExercisesAndRecommendations.) */
  get DailyChallenge() { return base44.entities.DailyChallenge; },
};

// ============================================================
// DOMAIN: Journeys and Flows
// Entities for structured multi-step programs, onboarding, and daily plans.
// ============================================================

export const JourneysAndFlows = {
  /** Journey — Structured multi-step therapeutic programs or learning paths. */
  get Journey() { return base44.entities.Journey; },
  /** UserJourneyProgress — User's progress through a Journey. (Also in GoalsAndProgress.) */
  get UserJourneyProgress() { return base44.entities.UserJourneyProgress; },
  /** StarterPath — Curated onboarding path assigned to a new user based on their goals. */
  get StarterPath() { return base44.entities.StarterPath; },
  /** DailyFlow — Daily structured content plan (one exercise, one resource, one reflection). */
  get DailyFlow() { return base44.entities.DailyFlow; },
};

// ============================================================
// DOMAIN: Safety and Crisis
// Entities for crisis detection, alerts, and risk management.
// ============================================================

export const SafetyAndCrisis = {
  /** CrisisAlert — Recorded crisis signal with severity, context, and escalation status. */
  get CrisisAlert() { return base44.entities.CrisisAlert; },
};

// ============================================================
// DOMAIN: Knowledge Infrastructure
// Entities for trusted external knowledge ingestion and storage
// (Phase 4.2 — Therapist Upgrade Stage 2).
//
// These entities are the real app-owned, first-class storage surfaces for
// external trusted-knowledge source records and chunk records. They are
// completely separate from internal app-authored content entities (Exercise,
// Resource, JournalTemplate, Psychoeducation).
//
// SOURCE SEPARATION: Every record in these entities carries
//   content_source_type = 'external_trusted'
// which is the primary runtime separator between external and internal content.
//
// ISOLATION: These entities are NOT connected to the current therapist runtime,
// agent wiring, or any retrieval pipeline. They are passive storage surfaces.
// The flag gate lives at the ingestion call site (externalKnowledgePersistence.js).
//
// See src/api/entities/ExternalKnowledgeSource.js for field schema.
// See src/api/entities/ExternalKnowledgeChunk.js for field schema.
// ============================================================

export const KnowledgeInfrastructure = {
  /**
   * ExternalKnowledgeSource — Durable storage for approved external trusted-knowledge
   * source metadata. One record per approved source. Keyed by source_id.
   * Phase 4.2 — Therapist Upgrade Stage 2.
   */
  get ExternalKnowledgeSource() { return base44.entities.ExternalKnowledgeSource; },

  /**
   * ExternalKnowledgeChunk — Durable storage for atomic text chunks extracted
   * from approved external trusted-knowledge sources. Each chunk carries full
   * provenance and links back to its parent ExternalKnowledgeSource via source_id
   * and external_source_record_id.
   * Phase 4.2 — Therapist Upgrade Stage 2.
   */
  get ExternalKnowledgeChunk() { return base44.entities.ExternalKnowledgeChunk; },
};

// ============================================================
// DOMAIN: System and Supporting
// Entities for subscriptions, data hygiene, and app infrastructure.
// ============================================================

export const SystemAndSupporting = {
  /** Subscription — User subscription tier, status, billing provider, and renewal metadata. */
  get Subscription() { return base44.entities.Subscription; },
  /** UserDeletedConversations — Log of conversation IDs deleted by the user. */
  get UserDeletedConversations() { return base44.entities.UserDeletedConversations; },
  /** AppNotification — In-app notification records. (Also in RemindersAndNotifications.) */
  get AppNotification() { return base44.entities.AppNotification; },
};
