import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me().catch(() => null);
    if (!caller?.email) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (caller.role !== 'admin') {
      return Response.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    // Get all active reminders
    const reminders = await base44.asServiceRole.entities.GoalReminder.filter({ active: true });
    const now = new Date();
    const remindersSent = [];
    const errors = [];

    for (const reminder of reminders) {
      try {
        const lastSent = reminder.last_sent ? new Date(reminder.last_sent) : null;
        if (lastSent && !Number.isNaN(lastSent.getTime()) &&
            lastSent.toISOString().slice(0, 10) === now.toISOString().slice(0, 10)) {
          continue;
        }

        // Get the goal
        const goal = await base44.asServiceRole.entities.Goal.get(reminder.goal_id);
        if (!goal) continue;

        // Get goal owner
        const goalOwner = goal.created_by;
        
        let shouldSend = false;
        let message = '';
        let subject = '';

        // Check reminder type
        if (reminder.reminder_type === 'goal_deadline' && goal.target_date) {
          const targetDate = new Date(goal.target_date);
          const daysUntil = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
          
          if (daysUntil === reminder.days_before && daysUntil >= 0) {
            shouldSend = true;
            subject = `🎯 Goal Deadline Reminder: ${goal.title}`;
            message = `Your goal "${goal.title}" is due in ${daysUntil} days (${targetDate.toLocaleDateString()}).\n\nCurrent progress: ${goal.progress}%\n\nKeep going! 💪`;
          }
        } else if (reminder.reminder_type === 'milestone_deadline' && goal.milestones) {
          const milestone = goal.milestones[reminder.milestone_index];
          if (milestone && milestone.due_date && !milestone.completed) {
            const milestoneDate = new Date(milestone.due_date);
            const daysUntil = Math.ceil((milestoneDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysUntil === reminder.days_before && daysUntil >= 0) {
              shouldSend = true;
              subject = `📋 Milestone Reminder: ${milestone.title}`;
              message = `Milestone "${milestone.title}" for goal "${goal.title}" is due in ${daysUntil} days (${milestoneDate.toLocaleDateString()}).\n\nDon't forget to complete it! ✅`;
            }
          }
        } else if (reminder.reminder_type === 'weekly_checkin' && reminder.frequency === 'weekly') {
          const daysSinceLastSent = lastSent ? Math.floor((now - lastSent) / (1000 * 60 * 60 * 24)) : 999;
          
          if (daysSinceLastSent >= 7) {
            shouldSend = true;
            subject = `🔔 Weekly Goal Check-in: ${goal.title}`;
            message = `Time for your weekly check-in on "${goal.title}"!\n\nCurrent progress: ${goal.progress}%\n\nHow are things going? Update your progress to stay on track! 🎯`;
          }
        } else if (reminder.reminder_type === 'custom' && reminder.custom_message) {
          const nextSend = reminder.next_send_date ? new Date(reminder.next_send_date) : null;
          if (nextSend && now >= nextSend) {
            shouldSend = true;
            subject = `🎯 Goal Reminder: ${goal.title}`;
            message = reminder.custom_message;
          }
        }

        if (shouldSend) {
          // Send email if requested
          if (reminder.notification_method === 'email' || reminder.notification_method === 'both') {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: goalOwner,
              subject: subject,
              body: message
            });
          }

          // Create in-app notification if requested
          if (reminder.notification_method === 'in_app' || reminder.notification_method === 'both') {
            await base44.asServiceRole.entities.ProactiveReminder.create({
              created_by: goalOwner,
              title: subject,
              message: message,
              reminder_type: 'goal_follow_up',
              reference_id: goal.id,
              scheduled_date: now.toISOString().split('T')[0],
              status: 'pending',
              suggested_action: `Review and update your goal: ${goal.title}`
            });
          }

          // Update reminder
          const updates = {
            last_sent: now.toISOString()
          };

          // Calculate next send date based on frequency
          if (reminder.frequency === 'daily') {
            const nextDate = new Date(now);
            nextDate.setDate(nextDate.getDate() + 1);
            updates.next_send_date = nextDate.toISOString();
          } else if (reminder.frequency === 'weekly') {
            const nextDate = new Date(now);
            nextDate.setDate(nextDate.getDate() + 7);
            updates.next_send_date = nextDate.toISOString();
          } else if (reminder.frequency === 'monthly') {
            const nextDate = new Date(now);
            nextDate.setMonth(nextDate.getMonth() + 1);
            updates.next_send_date = nextDate.toISOString();
          } else if (reminder.frequency === 'once') {
            updates.active = false;
          }

          await base44.asServiceRole.entities.GoalReminder.update(reminder.id, updates);

          remindersSent.push({
            reminderId: reminder.id,
            goalId: goal.id,
            goalTitle: goal.title,
            type: reminder.reminder_type
          });
        }
      } catch (error) {
        errors.push({
          reminderId: reminder.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      remindersSent: remindersSent.length,
      details: remindersSent,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString()
    });

  } catch (error) {
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
