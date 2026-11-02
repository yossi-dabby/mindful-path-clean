/**
 * Tests for goal reminder scheduling logic (mirrors functions/checkGoalReminders.ts).
 *
 * That file is a Deno serverless function excluded from vitest, so the pure
 * decision logic is reproduced inline below.
 *
 * Covers:
 *   - goal_deadline: fires when daysUntil matches days_before and deadline not passed
 *   - milestone_deadline: fires when milestone daysUntil matches days_before and is not completed
 *   - weekly_checkin: fires when daysSinceLastSent >= 7
 *   - custom: fires when now >= next_send_date and custom_message is present
 *   - Next send date calculation for daily / weekly / monthly / once frequencies
 *   - Notification subject and message content for goal_deadline and weekly_checkin
 *
 * If the scheduling logic in functions/checkGoalReminders.ts changes,
 * update this file to match.
 */

import { describe, it, expect } from 'vitest';

// ─── MIRRORED LOGIC (from functions/checkGoalReminders.ts) ────────────────────

/** Pure: compute ceil-days until a target date from a reference date. */
function daysUntilDate(targetDate, now) {
  return Math.ceil((new Date(targetDate) - now) / (1000 * 60 * 60 * 24));
}

/** Pure: should a goal_deadline reminder fire? */
function shouldFireGoalDeadlineReminder(reminder, goal, now) {
  if (!goal.target_date) return false;
  const daysUntil = daysUntilDate(goal.target_date, now);
  return daysUntil === reminder.days_before && daysUntil >= 0;
}

/** Pure: should a milestone_deadline reminder fire? */
function shouldFireMilestoneDeadlineReminder(reminder, goal, now) {
  if (!goal.milestones) return false;
  const milestone = goal.milestones[reminder.milestone_index];
  if (!milestone || !milestone.due_date || milestone.completed) return false;
  const daysUntil = daysUntilDate(milestone.due_date, now);
  return daysUntil === reminder.days_before && daysUntil >= 0;
}

/** Pure: should a weekly_checkin reminder fire? */
function shouldFireWeeklyCheckin(reminder, now) {
  if (reminder.frequency !== 'weekly') return false;
  const lastSent = reminder.last_sent ? new Date(reminder.last_sent) : null;
  const daysSinceLastSent = lastSent
    ? Math.floor((now - lastSent) / (1000 * 60 * 60 * 24))
    : 999;
  return daysSinceLastSent >= 7;
}

/** Pure: should a custom reminder fire? */
function shouldFireCustomReminder(reminder, now) {
  if (!reminder.custom_message) return false;
  const nextSend = reminder.next_send_date ? new Date(reminder.next_send_date) : null;
  return nextSend !== null && now >= nextSend;
}

/**
 * Pure: compute the next_send_date update fields based on frequency.
 * Returns an object with next_send_date and optionally active.
 */
function computeNextSendUpdate(frequency, now) {
  if (frequency === 'daily') {
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + 1);
    return { next_send_date: nextDate.toISOString() };
  }
  if (frequency === 'weekly') {
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + 7);
    return { next_send_date: nextDate.toISOString() };
  }
  if (frequency === 'monthly') {
    const nextDate = new Date(now);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return { next_send_date: nextDate.toISOString() };
  }
  if (frequency === 'once') {
    return { active: false };
  }
  return {};
}

/** Pure: build notification content for goal_deadline reminder. */
function buildGoalDeadlineNotification(goal, daysUntil) {
  const targetDate = new Date(goal.target_date);
  return {
    subject: `🎯 Goal Deadline Reminder: ${goal.title}`,
    message: `Your goal "${goal.title}" is due in ${daysUntil} days (${targetDate.toLocaleDateString()}).\n\nCurrent progress: ${goal.progress}%\n\nKeep going! 💪`,
  };
}

/** Pure: build notification content for weekly_checkin reminder. */
function buildWeeklyCheckinNotification(goal) {
  return {
    subject: `🔔 Weekly Goal Check-in: ${goal.title}`,
    message: `Time for your weekly check-in on "${goal.title}"!\n\nCurrent progress: ${goal.progress}%\n\nHow are things going? Update your progress to stay on track! 🎯`,
  };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const NOW = new Date('2024-06-15T12:00:00Z');

function makeDaysFromNow(days, base = NOW) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function makeDaysAgo(days, base = NOW) {
  const d = new Date(base);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ─── TESTS — goal_deadline reminder ──────────────────────────────────────────

describe('goalReminderLogic – goal_deadline reminder', () => {
  it('fires when daysUntil matches days_before exactly', () => {
    const reminder = { reminder_type: 'goal_deadline', days_before: 3 };
    const goal = { target_date: makeDaysFromNow(3) };
    expect(shouldFireGoalDeadlineReminder(reminder, goal, NOW)).toBe(true);
  });

  it('does not fire when daysUntil is one day off from days_before', () => {
    const reminder = { reminder_type: 'goal_deadline', days_before: 3 };
    const goal = { target_date: makeDaysFromNow(4) };
    expect(shouldFireGoalDeadlineReminder(reminder, goal, NOW)).toBe(false);
  });

  it('does not fire when daysUntil does not match days_before', () => {
    const reminder = { reminder_type: 'goal_deadline', days_before: 3 };
    const goal = { target_date: makeDaysFromNow(5) };
    expect(shouldFireGoalDeadlineReminder(reminder, goal, NOW)).toBe(false);
  });

  it('does not fire when the deadline has already passed', () => {
    const reminder = { reminder_type: 'goal_deadline', days_before: 0 };
    const goal = { target_date: makeDaysAgo(1) };
    expect(shouldFireGoalDeadlineReminder(reminder, goal, NOW)).toBe(false);
  });

  it('fires on the deadline day itself when days_before is 0', () => {
    const reminder = { reminder_type: 'goal_deadline', days_before: 0 };
    const goal = { target_date: NOW.toISOString() };
    expect(shouldFireGoalDeadlineReminder(reminder, goal, NOW)).toBe(true);
  });

  it('does not fire when goal has no target_date', () => {
    const reminder = { reminder_type: 'goal_deadline', days_before: 3 };
    const goal = {};
    expect(shouldFireGoalDeadlineReminder(reminder, goal, NOW)).toBe(false);
  });

  it('fires at days_before: 7 when exactly 7 days remain', () => {
    const reminder = { reminder_type: 'goal_deadline', days_before: 7 };
    const goal = { target_date: makeDaysFromNow(7) };
    expect(shouldFireGoalDeadlineReminder(reminder, goal, NOW)).toBe(true);
  });
});

// ─── TESTS — milestone_deadline reminder ─────────────────────────────────────

describe('goalReminderLogic – milestone_deadline reminder', () => {
  it('fires when milestone daysUntil matches days_before', () => {
    const reminder = { reminder_type: 'milestone_deadline', days_before: 2, milestone_index: 0 };
    const goal = {
      milestones: [{ title: 'Step 1', due_date: makeDaysFromNow(2), completed: false }],
    };
    expect(shouldFireMilestoneDeadlineReminder(reminder, goal, NOW)).toBe(true);
  });

  it('does not fire when milestone is already completed', () => {
    const reminder = { reminder_type: 'milestone_deadline', days_before: 2, milestone_index: 0 };
    const goal = {
      milestones: [{ title: 'Step 1', due_date: makeDaysFromNow(2), completed: true }],
    };
    expect(shouldFireMilestoneDeadlineReminder(reminder, goal, NOW)).toBe(false);
  });

  it('does not fire when milestone_index is out of bounds', () => {
    const reminder = { reminder_type: 'milestone_deadline', days_before: 2, milestone_index: 5 };
    const goal = {
      milestones: [{ title: 'Step 1', due_date: makeDaysFromNow(2), completed: false }],
    };
    expect(shouldFireMilestoneDeadlineReminder(reminder, goal, NOW)).toBe(false);
  });

  it('does not fire when goal has no milestones', () => {
    const reminder = { reminder_type: 'milestone_deadline', days_before: 2, milestone_index: 0 };
    const goal = {};
    expect(shouldFireMilestoneDeadlineReminder(reminder, goal, NOW)).toBe(false);
  });

  it('does not fire when milestone has no due_date', () => {
    const reminder = { reminder_type: 'milestone_deadline', days_before: 2, milestone_index: 0 };
    const goal = {
      milestones: [{ title: 'Step 1', completed: false }],
    };
    expect(shouldFireMilestoneDeadlineReminder(reminder, goal, NOW)).toBe(false);
  });

  it('does not fire when milestone daysUntil does not match days_before', () => {
    const reminder = { reminder_type: 'milestone_deadline', days_before: 2, milestone_index: 0 };
    const goal = {
      milestones: [{ title: 'Step 1', due_date: makeDaysFromNow(5), completed: false }],
    };
    expect(shouldFireMilestoneDeadlineReminder(reminder, goal, NOW)).toBe(false);
  });

  it('fires for a second milestone when index is 1', () => {
    const reminder = { reminder_type: 'milestone_deadline', days_before: 3, milestone_index: 1 };
    const goal = {
      milestones: [
        { title: 'Step 1', due_date: makeDaysFromNow(10), completed: false },
        { title: 'Step 2', due_date: makeDaysFromNow(3), completed: false },
      ],
    };
    expect(shouldFireMilestoneDeadlineReminder(reminder, goal, NOW)).toBe(true);
  });
});

// ─── TESTS — weekly_checkin reminder ─────────────────────────────────────────

describe('goalReminderLogic – weekly_checkin reminder', () => {
  it('fires when no last_sent date (first ever send)', () => {
    const reminder = { reminder_type: 'weekly_checkin', frequency: 'weekly' };
    expect(shouldFireWeeklyCheckin(reminder, NOW)).toBe(true);
  });

  it('fires when last_sent was exactly 7 days ago', () => {
    const reminder = {
      reminder_type: 'weekly_checkin',
      frequency: 'weekly',
      last_sent: makeDaysAgo(7),
    };
    expect(shouldFireWeeklyCheckin(reminder, NOW)).toBe(true);
  });

  it('fires when last_sent was more than 7 days ago', () => {
    const reminder = {
      reminder_type: 'weekly_checkin',
      frequency: 'weekly',
      last_sent: makeDaysAgo(10),
    };
    expect(shouldFireWeeklyCheckin(reminder, NOW)).toBe(true);
  });

  it('does not fire when last_sent was 6 days ago', () => {
    const reminder = {
      reminder_type: 'weekly_checkin',
      frequency: 'weekly',
      last_sent: makeDaysAgo(6),
    };
    expect(shouldFireWeeklyCheckin(reminder, NOW)).toBe(false);
  });

  it('does not fire when last_sent was 1 day ago', () => {
    const reminder = {
      reminder_type: 'weekly_checkin',
      frequency: 'weekly',
      last_sent: makeDaysAgo(1),
    };
    expect(shouldFireWeeklyCheckin(reminder, NOW)).toBe(false);
  });

  it('does not fire when frequency is not "weekly"', () => {
    const reminder = {
      reminder_type: 'weekly_checkin',
      frequency: 'daily',
      last_sent: makeDaysAgo(10),
    };
    expect(shouldFireWeeklyCheckin(reminder, NOW)).toBe(false);
  });
});

// ─── TESTS — custom reminder ──────────────────────────────────────────────────

describe('goalReminderLogic – custom reminder', () => {
  it('fires when next_send_date is in the past', () => {
    const reminder = {
      reminder_type: 'custom',
      custom_message: 'Keep at it!',
      next_send_date: makeDaysAgo(1),
    };
    expect(shouldFireCustomReminder(reminder, NOW)).toBe(true);
  });

  it('fires when next_send_date equals now', () => {
    const reminder = {
      reminder_type: 'custom',
      custom_message: 'Keep at it!',
      next_send_date: NOW.toISOString(),
    };
    expect(shouldFireCustomReminder(reminder, NOW)).toBe(true);
  });

  it('does not fire when next_send_date is in the future', () => {
    const reminder = {
      reminder_type: 'custom',
      custom_message: 'Keep at it!',
      next_send_date: makeDaysFromNow(1),
    };
    expect(shouldFireCustomReminder(reminder, NOW)).toBe(false);
  });

  it('does not fire when custom_message is absent', () => {
    const reminder = {
      reminder_type: 'custom',
      next_send_date: makeDaysAgo(1),
    };
    expect(shouldFireCustomReminder(reminder, NOW)).toBe(false);
  });

  it('does not fire when next_send_date is absent', () => {
    const reminder = {
      reminder_type: 'custom',
      custom_message: 'Keep at it!',
    };
    expect(shouldFireCustomReminder(reminder, NOW)).toBe(false);
  });

  it('does not fire when both custom_message and next_send_date are absent', () => {
    const reminder = { reminder_type: 'custom' };
    expect(shouldFireCustomReminder(reminder, NOW)).toBe(false);
  });
});

// ─── TESTS — computeNextSendUpdate ───────────────────────────────────────────

describe('goalReminderLogic – computeNextSendUpdate', () => {
  it('daily: next_send_date is 1 day later', () => {
    const update = computeNextSendUpdate('daily', NOW);
    const nextDate = new Date(update.next_send_date);
    const expected = new Date(NOW);
    expected.setDate(expected.getDate() + 1);
    expect(nextDate.toDateString()).toBe(expected.toDateString());
  });

  it('weekly: next_send_date is 7 days later', () => {
    const update = computeNextSendUpdate('weekly', NOW);
    const nextDate = new Date(update.next_send_date);
    const expected = new Date(NOW);
    expected.setDate(expected.getDate() + 7);
    expect(nextDate.toDateString()).toBe(expected.toDateString());
  });

  it('monthly: next_send_date is 1 month later', () => {
    const update = computeNextSendUpdate('monthly', NOW);
    const nextDate = new Date(update.next_send_date);
    const expected = new Date(NOW);
    expected.setMonth(expected.getMonth() + 1);
    expect(nextDate.toDateString()).toBe(expected.toDateString());
  });

  it('once: sets active to false (deactivates the reminder after sending)', () => {
    const update = computeNextSendUpdate('once', NOW);
    expect(update.active).toBe(false);
  });

  it('once: does not set a next_send_date', () => {
    const update = computeNextSendUpdate('once', NOW);
    expect(update.next_send_date).toBeUndefined();
  });

  it('unknown frequency: returns empty object', () => {
    const update = computeNextSendUpdate('biannually', NOW);
    expect(update).toEqual({});
  });

  it('daily: returned next_send_date is a valid ISO string', () => {
    const update = computeNextSendUpdate('daily', NOW);
    expect(typeof update.next_send_date).toBe('string');
    expect(new Date(update.next_send_date).toISOString()).toBe(update.next_send_date);
  });
});

// ─── TESTS — notification content construction ────────────────────────────────

describe('goalReminderLogic – buildGoalDeadlineNotification', () => {
  const goal = { title: 'Learn Spanish', progress: 45, target_date: '2024-07-01T00:00:00Z' };

  it('subject contains the goal title', () => {
    const { subject } = buildGoalDeadlineNotification(goal, 3);
    expect(subject).toContain('Learn Spanish');
  });

  it('message contains the number of days remaining', () => {
    const { message } = buildGoalDeadlineNotification(goal, 3);
    expect(message).toContain('3 days');
  });

  it('message contains the goal progress percentage', () => {
    const { message } = buildGoalDeadlineNotification(goal, 3);
    expect(message).toContain('45%');
  });

  it('message contains the goal title', () => {
    const { message } = buildGoalDeadlineNotification(goal, 3);
    expect(message).toContain('Learn Spanish');
  });
});

describe('goalReminderLogic – buildWeeklyCheckinNotification', () => {
  const goal = { title: 'Exercise Daily', progress: 60 };

  it('subject contains the goal title', () => {
    const { subject } = buildWeeklyCheckinNotification(goal);
    expect(subject).toContain('Exercise Daily');
  });

  it('message contains the goal title', () => {
    const { message } = buildWeeklyCheckinNotification(goal);
    expect(message).toContain('Exercise Daily');
  });

  it('message contains the progress percentage', () => {
    const { message } = buildWeeklyCheckinNotification(goal);
    expect(message).toContain('60%');
  });
});
