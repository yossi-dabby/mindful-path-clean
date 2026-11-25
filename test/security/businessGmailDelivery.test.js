import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { describe, it, expect, vi } from 'vitest';

function source(name) {
  const stage = process.env.GMAIL_TEST_SOURCE_ROOT;
  const path = stage
    ? stage + '/' + (name === 'helper' ? 'helper' : name) + '.ts'
    : new URL(name === 'helper' ? '../../base44/shared/businessEmail.ts' : '../../base44/functions/' + name + '/entry.ts', import.meta.url);
  return readFileSync(path, 'utf8');
}

function loadModule(name, dependencies, fetchMock) {
  const exports = {};
  const output = ts.transpileModule(source(name), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  const syntaxErrors = output.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) || [];
  if (syntaxErrors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(syntaxErrors, {
    getCanonicalFileName: f => f, getCurrentDirectory: () => '.', getNewLine: () => '\n',
  }));
  const context = vm.createContext({
    exports, require: specifier => {
      if (!(specifier in dependencies)) throw new Error('Unexpected import: ' + specifier);
      return dependencies[specifier];
    },
    fetch: fetchMock, Response, Request, URL, TextEncoder, btoa, AbortSignal,
    console: { error: vi.fn(), log: vi.fn() },
  });
  new vm.Script(output.outputText).runInContext(context);
  return exports;
}

function setup({ caller = { email: 'member@example.com', role: 'user' }, prefs = {}, reminders = [] } = {}) {
  const fetchMock = vi.fn(async () => Response.json({ id: 'gmail-message-1' }));
  const client = {
    auth: { me: vi.fn(async () => caller) },
    asServiceRole: {
      connectors: { getConnection: vi.fn(async () => ({ accessToken: 'test-token-do-not-log' })) },
      entities: {
        AppNotification: {
          create: vi.fn(async data => ({ ...data, id: 'notification-1' })),
          update: vi.fn(async () => ({})),
        },
        User: { filter: vi.fn(async () => [{ preferences: { emailNotifications: prefs } }]) },
        GoalReminder: { filter: vi.fn(async () => reminders), update: vi.fn(async () => ({})) },
        Goal: { get: vi.fn(async () => ({ id: 'goal-1', created_by: 'member@example.com', title: 'תרגול קצר 🎯', progress: 40 })) },
        ProactiveReminder: { create: vi.fn(async () => ({})) },
      },
    },
  };
  const helper = loadModule('helper', {}, fetchMock);
  const dependencies = {
    'npm:@base44/sdk@0.8.63': { createClientFromRequest: () => client },
    '../../shared/businessEmail.ts': helper,
  };
  return {
    client, helper, fetchMock,
    notification: loadModule('sendNotification', dependencies, fetchMock).default,
    reminders: loadModule('checkGoalReminders', dependencies, fetchMock).default,
  };
}

const payload = { user_email: 'member@example.com', title: 'שלום 🎉', message: 'בדיקת עברית\nשורה שנייה', type: 'system' };
const request = body => new Request('https://app.example.test/functions/test', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const decodeMessage = fetchMock => {
  const raw = JSON.parse(fetchMock.mock.calls[0][1].body).raw;
  const mime = Buffer.from(raw, 'base64url').toString('utf8');
  const separator = mime.indexOf('\r\n\r\n');
  return {
    raw, mime, headers: mime.slice(0, separator),
    body: Buffer.from(mime.slice(separator + 4).replace(/\s/g, ''), 'base64').toString('utf8'),
  };
};

describe('business Gmail delivery through the actual backend handlers', () => {
  it('sends UTF-8 HTML from the fixed business mailbox and confirms delivery', async () => {
    const h = setup();
    const result = await h.notification(request({ ...payload, action_url: '/Goals', message: '<script>private</script>\nשלום' }));
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ success: true, email_sent: true });
    expect(h.client.asServiceRole.connectors.getConnection).toHaveBeenCalledWith('gmail');
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
    expect(h.fetchMock.mock.calls[0][0]).toBe('https://gmail.googleapis.com/gmail/v1/users/contact%40mindful-path.me/messages/send');
    const { headers, body, raw } = decodeMessage(h.fetchMock);
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(headers).toContain('From: Mindful Path <contact@mindful-path.me>');
    expect(headers).toContain('Reply-To: contact@mindful-path.me');
    expect(headers).toContain('To: member@example.com');
    expect(headers).toContain('Content-Type: text/html; charset=UTF-8');
    expect(body).toContain('&lt;script&gt;private&lt;/script&gt;<br/>שלום');
    expect(body).toContain('https://app.mindful-path.me/Goals');
    expect(h.client.asServiceRole.entities.AppNotification.update).toHaveBeenCalledWith('notification-1', { email_sent: true });
  });

  it('preserves long Hebrew subjects and folds MIME headers within RFC encoded-word limits', async () => {
    const h = setup();
    const title = 'שלום 🎯 '.repeat(18);
    await h.notification(request({ ...payload, title }));
    const { headers } = decodeMessage(h.fetchMock);
    const words = headers.match(/=\?UTF-8\?B\?[^?]+\?=/g);
    expect(words.length).toBeGreaterThan(1);
    expect(words.every(word => word.length <= 75)).toBe(true);
    const decoded = words.map(word => Buffer.from(word.slice(10, -2), 'base64').toString('utf8')).join('');
    expect(decoded).toBe('[Mindful Path] ' + title.trim());
  });

  it.each([
    'member@example.com\r\nBcc: stranger@example.com',
    'member@example.com,stranger@example.com',
    'member@example.com;stranger@example.com',
  ])('rejects recipient injection before any write: %s', async user_email => {
    const h = setup({ caller: { email: 'owner@example.com', role: 'admin' } });
    expect((await h.notification(request({ ...payload, user_email }))).status).toBe(400);
    expect(h.client.asServiceRole.entities.AppNotification.create).not.toHaveBeenCalled();
    expect(h.fetchMock).not.toHaveBeenCalled();
  });

  it('requires sign-in and preserves self-only recipients for regular users', async () => {
    const anonymous = setup({ caller: null });
    expect((await anonymous.notification(request(payload))).status).toBe(401);
    const member = setup();
    expect((await member.notification(request({ ...payload, user_email: 'other@example.com' }))).status).toBe(403);
    expect(anonymous.fetchMock).not.toHaveBeenCalled();
    expect(member.fetchMock).not.toHaveBeenCalled();
  });

  it('keeps optional emails off without the existing preference, and honors opt-in', async () => {
    const off = setup();
    expect(await (await off.notification(request({ ...payload, type: 'goal_reminder' }))).json()).toMatchObject({ email_sent: false });
    expect(off.fetchMock).not.toHaveBeenCalled();
    const on = setup({ prefs: { goalReminders: true } });
    expect(await (await on.notification(request({ ...payload, type: 'goal_reminder' }))).json()).toMatchObject({ email_sent: true });
  });

  it('reports a rejected Gmail send as unsent and does not retry or fall back to another sender', async () => {
    const h = setup();
    h.fetchMock.mockResolvedValue(new Response('provider-private-detail', { status: 403 }));
    const result = await (await h.notification(request(payload))).json();
    expect(result).toMatchObject({ success: true, email_sent: false });
    expect(JSON.stringify(result)).not.toContain('provider-private-detail');
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
    expect(h.client.asServiceRole.entities.AppNotification.update).not.toHaveBeenCalled();
  });

  it('does not report an unconfirmed provider response as sent', async () => {
    const h = setup();
    h.fetchMock.mockResolvedValue(Response.json({}));
    expect(await (await h.notification(request(payload))).json()).toMatchObject({ email_sent: false });
    expect(h.client.asServiceRole.entities.AppNotification.update).not.toHaveBeenCalled();
  });

  it('redacts connector errors and does not attempt sending with a missing token', async () => {
    const h = setup();
    h.client.asServiceRole.connectors.getConnection.mockRejectedValue(new Error('test-token-do-not-log'));
    await expect(h.helper.sendBusinessEmail(h.client, { to: 'member@example.com', subject: 'test', body: 'test' })).rejects.toThrow('Business Gmail connection unavailable');
    expect(h.fetchMock).not.toHaveBeenCalled();
  });

  it('encodes subject line breaks as text instead of injecting extra headers', async () => {
    const h = setup();
    await h.helper.sendBusinessEmail(h.client, { to: 'member@example.com', subject: 'Test\r\nBcc: stranger@example.com', body: 'content' });
    const { headers } = decodeMessage(h.fetchMock);
    expect(headers).not.toMatch(/\r\nBcc:/);
    expect(headers.match(/^To:/gm)).toHaveLength(1);
  });

  it('rejects malformed JSON as bad input', async () => {
    const h = setup();
    const response = await h.notification(new Request('https://app.example.test', { method: 'POST', body: '{' }));
    expect(response.status).toBe(400);
    expect(h.fetchMock).not.toHaveBeenCalled();
  });

  it('sends due goal reminders as UTF-8 plain text and records successful delivery', async () => {
    const reminder = { id: 'reminder-1', goal_id: 'goal-1', active: true, reminder_type: 'custom', custom_message: 'זמן לתרגל 🎯', next_send_date: '2020-01-01', notification_method: 'email', frequency: 'once' };
    const h = setup({ caller: { email: 'admin@example.com', role: 'admin' }, reminders: [reminder] });
    const result = await (await h.reminders(request({}))).json();
    expect(result.remindersSent).toBe(1);
    const { headers, body } = decodeMessage(h.fetchMock);
    expect(headers).toContain('Content-Type: text/plain; charset=UTF-8');
    expect(body).toBe('זמן לתרגל 🎯');
    expect(h.client.asServiceRole.entities.GoalReminder.update).toHaveBeenCalledWith('reminder-1', expect.objectContaining({ active: false, last_sent: expect.any(String) }));
  });

  it('keeps reminder processing admin-only and skips a reminder already sent today', async () => {
    const member = setup();
    expect((await member.reminders(request({}))).status).toBe(403);
    const admin = setup({ caller: { email: 'admin@example.com', role: 'admin' }, reminders: [{ id: 'r', last_sent: new Date().toISOString() }] });
    expect(await (await admin.reminders(request({}))).json()).toMatchObject({ remindersSent: 0 });
    expect(admin.client.asServiceRole.entities.Goal.get).not.toHaveBeenCalled();
    expect(admin.fetchMock).not.toHaveBeenCalled();
  });

  it('leaves a failed goal reminder eligible for later delivery', async () => {
    const h = setup({
      caller: { email: 'admin@example.com', role: 'admin' },
      reminders: [{ id: 'r', goal_id: 'goal-1', reminder_type: 'custom', custom_message: 'test', next_send_date: '2020-01-01', notification_method: 'email', frequency: 'once' }],
    });
    h.fetchMock.mockResolvedValue(new Response('', { status: 429 }));
    const result = await (await h.reminders(request({}))).json();
    expect(result.remindersSent).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(h.client.asServiceRole.entities.GoalReminder.update).not.toHaveBeenCalled();
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
  });
});
