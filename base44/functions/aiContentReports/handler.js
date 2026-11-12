import { requireAccountAccess } from './accountAccessGuard.js';

const REASONS = ['harmful_advice', 'hate_or_harassment', 'sexual_content', 'privacy', 'other'];
const STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'];
const fail = (code, status = 400) => Object.assign(new Error(code), { code, status });
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const rows = value => {
  if (!Array.isArray(value)) throw fail('REPORT_UNAVAILABLE', 503);
  return value;
};

async function readInput(req) {
  const reader = req.body?.getReader();
  if (!reader) throw fail('INVALID_REQUEST');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 40000) { await reader.cancel(); throw fail('INVALID_REQUEST', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let input;
  try { input = JSON.parse(await new Blob(chunks).text()); } catch { throw fail('INVALID_REQUEST'); }
  const allowed = {
    submit: ['action', 'conversation_id', 'message_id', 'message_index', 'reason', 'details', 'response_text'],
    list: ['action', 'offset', 'status'],
    review: ['action', 'report_id', 'status', 'resolution'],
  };
  if (!input || Array.isArray(input) || !Object.hasOwn(allowed, input.action) ||
      Object.keys(input).some(key => !allowed[input.action].includes(key))) throw fail('INVALID_REQUEST');
  return input;
}

export async function handleAIContentReports(req, { createClientFromRequest, now = () => new Date().toISOString() }) {
  const reply = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' } });
  if (req.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const client = createClientFromRequest(req);
    let user;
    try { user = await client.auth.me(); } catch { throw fail('UNAUTHORIZED', 401); }
    if (!validId(user?.id) || !user.email || user.disabled === true) throw fail('UNAUTHORIZED', 401);
    const input = await readInput(req);
    if (input.action !== 'submit' && user.role !== 'admin') throw fail('FORBIDDEN', 403);
    await requireAccountAccess(client, user);
    const entity = client.asServiceRole.entities.AIContentReport;
    if (input.action === 'submit') {
      if (!validId(input.conversation_id) ||
          (input.message_id !== undefined && input.message_id !== null && !validId(input.message_id)) ||
          !Number.isSafeInteger(input.message_index) || input.message_index < 0 || input.message_index > 100000 ||
          !REASONS.includes(input.reason) || typeof input.response_text !== 'string' ||
          !input.response_text.trim() || input.response_text.length > 6000 ||
          (input.details !== undefined && (typeof input.details !== 'string' || input.details.length > 1000))) throw fail('INVALID_REQUEST');

      // Always use caller-scoped agent access, never the service role. The
      // explicit owner check also rejects a provider that ignores its filter.
      let conversation;
      try { conversation = await client.agents.getConversation(input.conversation_id); }
      catch (error) {
        const status = error?.status ?? error?.response?.status;
        throw fail([403, 404].includes(status) ? 'MESSAGE_UNAVAILABLE' : 'REPORT_UNAVAILABLE', [403, 404].includes(status) ? 404 : 503);
      }
      if (!conversation || conversation.id !== input.conversation_id ||
          !(conversation.created_by_id === user.id || (!conversation.created_by_id && conversation.created_by === user.email))) throw fail('MESSAGE_UNAVAILABLE', 404);
      const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      const index = input.message_id ? messages.findIndex(message => message.id === input.message_id) : input.message_index;
      const message = messages[index];
      if (!message || message.role !== 'assistant' || message.hidden === true) throw fail('MESSAGE_UNAVAILABLE', 404);
      const messageKey = message.id || `index-${index}`;
      const existing = rows(await entity.filter({ subject_user_id: user.id, conversation_id: conversation.id, message_id: messageKey, reason: input.reason }, '-created_date', 1));
      if (existing.some(row => row.subject_user_id !== user.id || row.conversation_id !== conversation.id || row.message_id !== messageKey || row.reason !== input.reason)) throw fail('REPORT_UNAVAILABLE', 503);
      if (existing.length) return reply({ success: true, report_id: existing[0].id });
      const cutoff = new Date(new Date(now()).getTime() - 86400000).toISOString();
      const recent = rows(await entity.filter({ subject_user_id: user.id, reported_at: { $gte: cutoff } }, '-created_date', 20));
      if (recent.some(row => row.subject_user_id !== user.id)) throw fail('REPORT_UNAVAILABLE', 503);
      if (recent.length >= 20) throw fail('REPORT_LIMIT', 429);
      const record = await entity.create({
        subject_user_id: user.id, conversation_id: conversation.id, message_id: messageKey, message_index: index,
        agent_name: String(conversation.agent_name || '').slice(0, 100), reason: input.reason,
        // This is explicitly the user-shared, already-rendered excerpt. Do not
        // copy raw messages, tool results, reasoning, files, or the conversation.
        response_text: input.response_text.trim(), details: (input.details || '').trim(),
        status: 'open', reported_at: now(), resolution: '', reviewed_by: '', reviewed_at: '',
      });
      if (!validId(record?.id)) throw fail('REPORT_UNAVAILABLE', 503);
      // Account deletion sets its durable access latch before scanning reports.
      // Recheck after the write: if deletion won the race, remove this late row
      // rather than acknowledging a report that escaped the deletion scan.
      try { await requireAccountAccess(client, user); }
      catch (error) {
        try { await entity.delete(record.id); }
        catch (cleanupError) {
          if ((cleanupError?.status ?? cleanupError?.response?.status) !== 404) throw fail('REPORT_UNAVAILABLE', 503);
        }
        throw error;
      }
      return reply({ success: true, report_id: record.id });
    }
    if (input.action === 'list') {
      const offset = input.offset ?? 0;
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000 || (input.status && !STATUSES.includes(input.status))) throw fail('INVALID_REQUEST');
      const records = rows(await entity.filter(input.status ? { status: input.status } : {}, '-created_date', 50, offset));
      return reply({ reports: records.map(record => ({
        id: record.id, reason: record.reason, response_text: record.response_text, details: record.details,
        agent_name: record.agent_name, status: record.status, reported_at: record.reported_at,
        resolution: record.resolution, reviewed_at: record.reviewed_at,
      })), next_offset: records.length === 50 ? offset + 50 : null });
    }
    if (!validId(input.report_id) || !STATUSES.includes(input.status) || typeof input.resolution !== 'string' ||
        input.resolution.length > 1000 || (['resolved', 'dismissed'].includes(input.status) && !input.resolution.trim())) throw fail('INVALID_REQUEST');
    const record = await entity.get(input.report_id);
    if (!record || record.id !== input.report_id) throw fail('NOT_FOUND', 404);
    await entity.update(record.id, { status: input.status, resolution: input.resolution.trim(), reviewed_by: user.id, reviewed_at: now() });
    return reply({ success: true });
  } catch (error) {
    const known = ['INVALID_REQUEST', 'UNAUTHORIZED', 'FORBIDDEN', 'MESSAGE_UNAVAILABLE', 'REPORT_LIMIT', 'REPORT_UNAVAILABLE', 'NOT_FOUND'];
    if (error?.safe) return reply({ error: 'ACCESS_REQUIRED' }, error.status);
    return reply({ error: known.includes(error?.code) ? error.code : 'REPORT_UNAVAILABLE' }, known.includes(error?.code) ? error.status : 503);
  }
}
