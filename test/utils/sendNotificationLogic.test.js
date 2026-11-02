/**
 * Tests for send-notification routing logic (mirrors functions/sendNotification.ts).
 *
 * That file is a Deno serverless function excluded from vitest, so pure
 * constants and decision logic are reproduced inline below.
 *
 * Covers:
 *   - ALWAYS_EMAIL_TYPES: 'mention' and 'system' always trigger email
 *   - TYPE_TO_PREF: every notification type maps to the correct preference key
 *   - shouldAlwaysSendEmail: short-circuit email decision before fetching user prefs
 *   - shouldSendEmailByPrefs: pref-based email decision for non-always types
 *
 * If ALWAYS_EMAIL_TYPES, TYPE_TO_PREF, or the email routing logic in
 * functions/sendNotification.ts changes, update this file to match.
 */

import { describe, it, expect } from 'vitest';

// ─── MIRRORED LOGIC (from functions/sendNotification.ts) ──────────────────────

/** Types that always trigger an email regardless of user preference overrides. */
const ALWAYS_EMAIL_TYPES = ['mention', 'system'];

/** Maps notification type → user email-preference key. */
const TYPE_TO_PREF = {
  goal_reminder: 'goalReminders',
  exercise_reminder: 'exerciseReminders',
  daily_checkin: 'dailyReminders',
  progress_update: 'progressUpdates',
  streak_alert: 'progressUpdates',
  session_summary: 'progressUpdates',
  mention: 'emailMentions',
  system: 'emailCritical',
};

/**
 * Pure: determine whether email should always be sent without checking user prefs.
 * Mirrors: `send_email || ALWAYS_EMAIL_TYPES.includes(type) || priority === 'critical'`
 */
function shouldAlwaysSendEmail(type, priority, sendEmail) {
  return sendEmail === true || ALWAYS_EMAIL_TYPES.includes(type) || priority === 'critical';
}

/**
 * Pure: determine whether user's stored email prefs allow email for this notification type.
 * Mirrors the pref-lookup branch in functions/sendNotification.ts.
 */
function shouldSendEmailByPrefs(type, emailPrefs) {
  const prefKey = TYPE_TO_PREF[type];
  if (!prefKey) return false;
  return !!(emailPrefs && emailPrefs[prefKey]);
}

// ─── TESTS — ALWAYS_EMAIL_TYPES ───────────────────────────────────────────────

describe('sendNotificationLogic – ALWAYS_EMAIL_TYPES', () => {
  it('contains exactly two entries', () => {
    expect(ALWAYS_EMAIL_TYPES).toHaveLength(2);
  });

  it('includes "mention"', () => {
    expect(ALWAYS_EMAIL_TYPES).toContain('mention');
  });

  it('includes "system"', () => {
    expect(ALWAYS_EMAIL_TYPES).toContain('system');
  });
});

// ─── TESTS — TYPE_TO_PREF mapping ─────────────────────────────────────────────

describe('sendNotificationLogic – TYPE_TO_PREF mapping', () => {
  it('maps goal_reminder to goalReminders', () => {
    expect(TYPE_TO_PREF['goal_reminder']).toBe('goalReminders');
  });

  it('maps exercise_reminder to exerciseReminders', () => {
    expect(TYPE_TO_PREF['exercise_reminder']).toBe('exerciseReminders');
  });

  it('maps daily_checkin to dailyReminders', () => {
    expect(TYPE_TO_PREF['daily_checkin']).toBe('dailyReminders');
  });

  it('maps progress_update to progressUpdates', () => {
    expect(TYPE_TO_PREF['progress_update']).toBe('progressUpdates');
  });

  it('maps streak_alert to progressUpdates', () => {
    expect(TYPE_TO_PREF['streak_alert']).toBe('progressUpdates');
  });

  it('maps session_summary to progressUpdates', () => {
    expect(TYPE_TO_PREF['session_summary']).toBe('progressUpdates');
  });

  it('maps mention to emailMentions', () => {
    expect(TYPE_TO_PREF['mention']).toBe('emailMentions');
  });

  it('maps system to emailCritical', () => {
    expect(TYPE_TO_PREF['system']).toBe('emailCritical');
  });

  it('streak_alert and session_summary share the progressUpdates preference key', () => {
    expect(TYPE_TO_PREF['streak_alert']).toBe(TYPE_TO_PREF['session_summary']);
  });

  it('returns undefined for an unmapped type', () => {
    expect(TYPE_TO_PREF['unknown_type']).toBeUndefined();
  });
});

// ─── TESTS — shouldAlwaysSendEmail ────────────────────────────────────────────

describe('sendNotificationLogic – shouldAlwaysSendEmail', () => {
  it('returns true when send_email flag is explicitly true', () => {
    expect(shouldAlwaysSendEmail('goal_reminder', 'normal', true)).toBe(true);
  });

  it('returns true when type is "mention"', () => {
    expect(shouldAlwaysSendEmail('mention', 'normal', false)).toBe(true);
  });

  it('returns true when type is "system"', () => {
    expect(shouldAlwaysSendEmail('system', 'normal', false)).toBe(true);
  });

  it('returns true when priority is "critical"', () => {
    expect(shouldAlwaysSendEmail('goal_reminder', 'critical', false)).toBe(true);
  });

  it('returns false for a regular type with normal priority and no override', () => {
    expect(shouldAlwaysSendEmail('goal_reminder', 'normal', false)).toBe(false);
  });

  it('returns false for progress_update with low priority and no override', () => {
    expect(shouldAlwaysSendEmail('progress_update', 'low', false)).toBe(false);
  });

  it('returns false for daily_checkin with high (non-critical) priority and no override', () => {
    expect(shouldAlwaysSendEmail('daily_checkin', 'high', false)).toBe(false);
  });

  it('returns true when both send_email and critical priority are set', () => {
    expect(shouldAlwaysSendEmail('goal_reminder', 'critical', true)).toBe(true);
  });

  it('returns false when send_email is false, type is not in ALWAYS_EMAIL_TYPES, and priority is normal', () => {
    expect(shouldAlwaysSendEmail('exercise_reminder', 'normal', false)).toBe(false);
  });

  it('returns true for "mention" even when send_email is false and priority is low', () => {
    expect(shouldAlwaysSendEmail('mention', 'low', false)).toBe(true);
  });
});

// ─── TESTS — shouldSendEmailByPrefs ───────────────────────────────────────────

describe('sendNotificationLogic – shouldSendEmailByPrefs', () => {
  it('returns true when the preference key is enabled', () => {
    const emailPrefs = { goalReminders: true };
    expect(shouldSendEmailByPrefs('goal_reminder', emailPrefs)).toBe(true);
  });

  it('returns false when the preference key is disabled', () => {
    const emailPrefs = { goalReminders: false };
    expect(shouldSendEmailByPrefs('goal_reminder', emailPrefs)).toBe(false);
  });

  it('returns false when the preference key is not present', () => {
    expect(shouldSendEmailByPrefs('goal_reminder', {})).toBe(false);
  });

  it('returns false when emailPrefs is null', () => {
    expect(shouldSendEmailByPrefs('goal_reminder', null)).toBe(false);
  });

  it('returns false when emailPrefs is undefined', () => {
    expect(shouldSendEmailByPrefs('goal_reminder', undefined)).toBe(false);
  });

  it('returns false for an unknown notification type', () => {
    expect(shouldSendEmailByPrefs('unknown_type', { goalReminders: true })).toBe(false);
  });

  it('returns true for streak_alert when progressUpdates is enabled', () => {
    const emailPrefs = { progressUpdates: true };
    expect(shouldSendEmailByPrefs('streak_alert', emailPrefs)).toBe(true);
  });

  it('returns true for session_summary when progressUpdates is enabled', () => {
    const emailPrefs = { progressUpdates: true };
    expect(shouldSendEmailByPrefs('session_summary', emailPrefs)).toBe(true);
  });

  it('returns false for exercise_reminder when only goalReminders is enabled', () => {
    const emailPrefs = { goalReminders: true };
    expect(shouldSendEmailByPrefs('exercise_reminder', emailPrefs)).toBe(false);
  });

  it('returns true for mention when emailMentions is enabled', () => {
    const emailPrefs = { emailMentions: true };
    expect(shouldSendEmailByPrefs('mention', emailPrefs)).toBe(true);
  });

  it('returns true for system when emailCritical is enabled', () => {
    const emailPrefs = { emailCritical: true };
    expect(shouldSendEmailByPrefs('system', emailPrefs)).toBe(true);
  });

  it('returns false for system when emailCritical is disabled', () => {
    const emailPrefs = { emailCritical: false };
    expect(shouldSendEmailByPrefs('system', emailPrefs)).toBe(false);
  });
});
