import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Send an in-app notification (and optionally an email) to a user.
 * 
 * Payload:
 *   user_email: string       - recipient email
 *   title: string            - notification title
 *   message: string          - notification body
 *   type: string             - notification type (goal_reminder | progress_update | etc.)
 *   priority?: string        - low | normal | high | critical (default: normal)
 *   action_url?: string      - optional in-app link
 *   reference_id?: string    - related entity ID
 *   send_email?: boolean     - force email even if not a critical type (default: false)
 */

// Types that always trigger an email regardless of user prefs override
const ALWAYS_EMAIL_TYPES = ['mention', 'system'];
const ALLOWED_TYPES = new Set([
  'goal_reminder',
  'progress_update',
  'exercise_reminder',
  'daily_checkin',
  'streak_alert',
  'session_summary',
  'mention',
  'system',
]);
const ALLOWED_PRIORITIES = new Set(['low', 'normal', 'high', 'critical']);
const TRUSTED_ACTION_ORIGINS = new Set([
  'https://app.mindful-path.me',
  'https://mindful-path-production-7704.up.railway.app',
]);

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeActionUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 500) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return `https://app.mindful-path.me${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    return TRUSTED_ACTION_ORIGINS.has(parsed.origin) ? parsed.toString() : null;
  } catch (_error) {
    return null;
  }
}

// Maps notification type → user preference key
const TYPE_TO_PREF = {
  goal_reminder: 'goalReminders',
  exercise_reminder: 'exerciseReminders',
  daily_checkin: 'dailyReminders',
  progress_update: 'progressUpdates',
  streak_alert: 'progressUpdates',
  session_summary: 'progressUpdates',
  mention: 'emailMentions',
  system: 'emailCritical'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me().catch(() => null);
    if (!caller?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const {
      user_email,
      title,
      message,
      type = 'system',
      priority = 'normal',
      action_url: requestedActionUrl,
      reference_id,
      send_email = false
    } = body;

    if (!user_email || !title || !message) {
      return Response.json({ error: 'user_email, title and message are required' }, { status: 400 });
    }

    const recipient = String(user_email).trim().toLowerCase();
    const callerEmail = String(caller.email).trim().toLowerCase();
    if (caller.role !== 'admin' && recipient !== callerEmail) {
      return Response.json({ error: 'Forbidden: notifications may only be sent to your own account' }, { status: 403 });
    }
    if (typeof title !== 'string' || title.trim().length === 0 || title.length > 160) {
      return Response.json({ error: 'title must be between 1 and 160 characters' }, { status: 400 });
    }
    if (typeof message !== 'string' || message.trim().length === 0 || message.length > 4000) {
      return Response.json({ error: 'message must be between 1 and 4000 characters' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(type) || !ALLOWED_PRIORITIES.has(priority)) {
      return Response.json({ error: 'Invalid notification type or priority' }, { status: 400 });
    }

    const action_url = normalizeActionUrl(requestedActionUrl);
    if (requestedActionUrl && !action_url) {
      return Response.json({ error: 'action_url must point to the Mindful Path application' }, { status: 400 });
    }

    const safeTitle = escapeHtml(title.trim());
    const safeMessage = escapeHtml(message.trim()).replaceAll('\n', '<br/>');
    const safeActionUrl = action_url ? escapeHtml(action_url) : null;

    // Create the in-app notification (service role so it works for any user)
    const notification = await base44.asServiceRole.entities.AppNotification.create({
      created_by: recipient,
      title: title.trim(),
      message: message.trim(),
      type,
      priority,
      action_url: action_url || null,
      reference_id: reference_id || null,
      is_read: false,
      email_sent: false
    });

    // Determine whether to send email
    // Fetch target user's notification preferences
    let shouldSendEmail = send_email || ALWAYS_EMAIL_TYPES.includes(type) || priority === 'critical';

    if (!shouldSendEmail) {
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email: recipient });
        const targetUser = users?.[0];
        const prefs = targetUser?.preferences?.notifications || {};
        const emailPrefs = targetUser?.preferences?.emailNotifications || {};

        const prefKey = TYPE_TO_PREF[type];
        // Check if user has enabled email for this notification type
        if (prefKey && emailPrefs[prefKey]) {
          shouldSendEmail = true;
        }
      } catch (_e) {
        // non-blocking
      }
    }

    if (shouldSendEmail) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: recipient,
          subject: `[MindCompanion] ${title.trim()}`,
          body: `
<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f8fffe; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #26A69A; margin: 0; font-weight: 600;">MindCompanion</h2>
  </div>
  <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <h3 style="color: #1A3A34; margin-top: 0;">${safeTitle}</h3>
    <p style="color: #5A7A72; line-height: 1.6;">${safeMessage}</p>
    ${safeActionUrl ? `<a href="${safeActionUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #26A69A; color: white; text-decoration: none; border-radius: 24px; font-weight: 500;">Open App</a>` : ''}
  </div>
  <p style="text-align: center; color: #9AA8A4; font-size: 12px; margin-top: 24px;">
    You're receiving this because you enabled email notifications in your MindCompanion settings.<br/>
    <a href="#" style="color: #26A69A;">Manage preferences</a>
  </p>
</div>`
        });

        // Mark email as sent
        await base44.asServiceRole.entities.AppNotification.update(notification.id, { email_sent: true });
      } catch (emailErr) {
        console.error('[sendNotification] Email failed:', emailErr.message);
      }
    }

    return Response.json({ success: true, notification_id: notification.id, email_sent: shouldSendEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
