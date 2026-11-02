import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Numeric safety utilities
const safeDaysDiff = (date1, date2) => {
  const ms1 = date1 instanceof Date ? date1.getTime() : Date.parse(date1);
  const ms2 = date2 instanceof Date ? date2.getTime() : Date.parse(date2);
  
  if (!Number.isFinite(ms1) || !Number.isFinite(ms2)) {
    return 0;
  }
  
  const diffMs = ms1 - ms2;
  if (!Number.isFinite(diffMs)) {
    return 0;
  }
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Number.isSafeInteger(days) ? Math.max(0, days) : 0;
};

const validateProgress = (progress) => {
  const num = Number(progress);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, num));
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CRITICAL: Admin-only function (scheduled automation only)
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const nudges = [];

    // Check mood entry inactivity
    const recentMoods = await base44.entities.MoodEntry.filter({
      created_by: user.email,
      date: { $gte: threeDaysAgo.toISOString().split('T')[0] }
    });

    if (recentMoods.length === 0) {
      const existingNudge = await base44.asServiceRole.entities.ProactiveReminder.filter({
        created_by: user.email,
        reminder_type: 'mood_trend',
        status: 'pending'
      });

      if (existingNudge.length === 0) {
        nudges.push({
          title: 'Check In With Your Mood',
          message: "I haven't seen you track your mood lately. How are you feeling today? Taking a moment to check in can help you stay aware of your emotional patterns.",
          reminder_type: 'mood_trend',
          scheduled_date: now.toISOString().split('T')[0],
          status: 'pending',
          suggested_action: 'Track your mood and reflect on what might be affecting it',
          context: {
            days_since_last: safeDaysDiff(now, threeDaysAgo)
          }
        });
      }
    }

    // Check journal entry inactivity
    const recentJournals = await base44.entities.ThoughtJournal.filter({
      created_by: user.email
    });
    const sortedJournals = recentJournals.sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    );

    if (sortedJournals.length > 0) {
      const lastJournal = sortedJournals[0];
      const daysSinceJournal = safeDaysDiff(now, new Date(lastJournal.created_date));

      if (daysSinceJournal >= 5) {
        const existingNudge = await base44.asServiceRole.entities.ProactiveReminder.filter({
          created_by: user.email,
          reminder_type: 'journal_insight',
          status: 'pending'
        });

        if (existingNudge.length === 0) {
          nudges.push({
            title: 'Journal Your Thoughts',
            message: "It's been a while since you've journaled. Writing down your thoughts can help you process emotions and identify patterns. What's been on your mind?",
            reminder_type: 'journal_insight',
            scheduled_date: now.toISOString().split('T')[0],
            status: 'pending',
            suggested_action: 'Create a new thought record to process recent experiences',
            context: {
              days_since_last: daysSinceJournal,
              last_entry_date: lastJournal.created_date
            }
          });
        }
      }
    }

    // Check goal progress
    const activeGoals = await base44.entities.Goal.filter({
      created_by: user.email,
      status: 'active'
    });

    for (const goal of activeGoals) {
      const daysSinceUpdate = safeDaysDiff(now, new Date(goal.updated_date));

      if (daysSinceUpdate >= 7) {
        const existingNudge = await base44.asServiceRole.entities.ProactiveReminder.filter({
          created_by: user.email,
          reminder_type: 'goal_follow_up',
          reference_id: goal.id,
          status: 'pending'
        });

        if (existingNudge.length === 0) {
          nudges.push({
            title: `Update on: ${goal.title}`,
            message: `I noticed you haven't updated your goal "${goal.title}" in ${daysSinceUpdate} days. How's your progress? Even small steps forward are worth celebrating!`,
            reminder_type: 'goal_follow_up',
            reference_id: goal.id,
            scheduled_date: now.toISOString().split('T')[0],
            status: 'pending',
            suggested_action: 'Update your goal progress or adjust your milestones',
            context: {
              goal_title: goal.title,
              days_since_update: daysSinceUpdate,
              current_progress: validateProgress(goal.progress || 0)
            }
          });
        }
      }
    }

    // Create nudges
    if (nudges.length > 0) {
      for (const nudge of nudges) {
        await base44.asServiceRole.entities.ProactiveReminder.create(nudge);
      }
    }

    return Response.json({
      success: true,
      nudges_created: nudges.length,
      message: `Generated ${nudges.length} proactive reminder(s)`
    });

  } catch (error) {
    console.error('Error checking proactive nudges:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});