import { hasUnmanagedAttachments } from './legacyFiles.js';

const ALLOWED_RETENTION_DAYS = new Set([30, 90, 365, 999999]);
const BATCH_SIZE = 100;
const MAX_BATCHES = 10;

function listRows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  throw new Error('INVALID_LIST'); // Unknown shapes must never become success.
}

async function deleteExpiredOwnedRecords(client, entityName, user, cutoffISO, progress, key, expired) {
  const email = user.email;
  const entity = client.asServiceRole.entities[entityName];
  const cutoff = Date.parse(cutoffISO);
  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    if (expired()) return false;
    const records = listRows(await entity.filter({ created_by: email, created_date: { $lt: cutoffISO } }, 'created_date', BATCH_SIZE, 0));
    // Validate the entire batch before deleting any row, even if the provider
    // unexpectedly returns an unfiltered, foreign, or malformed result.
    if (records.some(row => !row.id || row.created_by !== email || !Number.isFinite(Date.parse(row.created_date)) || Date.parse(row.created_date) >= cutoff)) throw new Error('OWNERSHIP_OR_DATE');
    // Keep legacy upload references available for an operator's inventory.
    // Managed mp-private references have a separate PrivateAttachment record.
    if (records.some(hasUnmanagedAttachments)) throw Object.assign(new Error('FILE_REVIEW_REQUIRED'), { manualReviewRequired: true });
    if (!records.length) return true;
    for (const record of records) {
      if (expired()) return false;
      try { await entity.delete(record.id); progress[key]++; }
      catch (error) {
        // A concurrent run can already have removed this row.
        if ((error?.status ?? error?.response?.status) !== 404) throw error;
      }
    }
    if (records.length < BATCH_SIZE) return true;
  }
  return false;
}

async function archiveExpiredAgentConversations(client, user, cutoffISO, progress, expired, startOffset) {
  let offset = startOffset;
  for (let page = 0; page < MAX_BATCHES; page++) {
    if (expired()) return { complete: false, nextOffset: offset };
    const conversations = listRows(await client.agents.listConversations({ q: { created_date: { $lt: cutoffISO } }, sort: 'created_date', limit: BATCH_SIZE, skip: offset }));
    if (conversations.some(row => !row.id || !(row.created_by_id === user.id || (!row.created_by_id && row.created_by === user.email)) || !Number.isFinite(Date.parse(row.created_date)))) throw new Error('OWNERSHIP_OR_DATE');
    for (let index = 0; index < conversations.length; index++) {
      if (expired()) return { complete: false, nextOffset: offset + index };
      const conversation = conversations[index];
      if (Date.parse(conversation.created_date) >= Date.parse(cutoffISO)) continue;
      const existing = listRows(await client.entities.UserDeletedConversations.filter({ agent_conversation_id: conversation.id }, 'created_date', 1));
      if (existing.some(row => row.created_by !== user.email || row.agent_conversation_id !== conversation.id)) throw new Error('OWNERSHIP');
      if (existing.length) continue;
      await client.entities.UserDeletedConversations.create({ agent_conversation_id: conversation.id, conversation_title: 'Session' });
      progress.archivedConversations++;
    }
    offset += conversations.length;
    if (conversations.length < BATCH_SIZE) return { complete: true, nextOffset: null };
  }
  return { complete: false, nextOffset: offset };
}

export async function handleRetentionCleanup(req, { createClientFromRequest, now = () => Date.now() }) {
  const reply = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' } });
  if (req.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const client = createClientFromRequest(req);
    let user;
    try { user = await client.auth.me(); } catch { return reply({ error: 'UNAUTHORIZED' }, 401); }
    if (!user?.id || !user.email || user.disabled === true) return reply({ error: 'UNAUTHORIZED' }, 401);
    let input;
    try { input = await req.json(); } catch { return reply({ error: 'INVALID_REQUEST' }, 400); }
    const conversationOffset = input?.conversation_offset ?? 0;
    if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some(key => key !== 'conversation_offset') || !Number.isSafeInteger(conversationOffset) || conversationOffset < 0 || conversationOffset > 1000000) return reply({ error: 'INVALID_REQUEST' }, 400);
    const configuredDays = Number(user.preferences?.data_retention_days);
    const retentionDays = ALLOWED_RETENTION_DAYS.has(configuredDays) ? configuredDays : 365;
    if (retentionDays === 999999) return reply({ success: true, skipped: true, retentionDays });
    const start = now();
    const cutoffISO = new Date(start - retentionDays * 86400000).toISOString();
    const expired = () => now() - start >= 20000;
    const progress = { deletedMoodEntries: 0, deletedJournalEntries: 0, archivedConversations: 0 };
    const errors = []; const pending = []; let manualReviewRequired = false;
    for (const [entity, key] of [['MoodEntry', 'deletedMoodEntries'], ['ThoughtJournal', 'deletedJournalEntries']]) {
      try { if (!await deleteExpiredOwnedRecords(client, entity, user, cutoffISO, progress, key, expired)) pending.push(entity); }
      catch (error) { manualReviewRequired ||= error?.manualReviewRequired === true; errors.push(`${entity}: CLEANUP_FAILED`); }
    }
    let nextConversationOffset = conversationOffset;
    try {
      const archived = await archiveExpiredAgentConversations(client, user, cutoffISO, progress, expired, conversationOffset);
      nextConversationOffset = archived.nextOffset;
      if (!archived.complete) pending.push('Agent conversations');
    } catch { errors.push('Agent conversations: CLEANUP_FAILED'); }

    const success = errors.length === 0 && pending.length === 0;
    return reply({ success, partial: !success, manualReviewRequired, retentionDays, cutoffDate: cutoffISO, ...progress, errors, pending, nextConversationOffset,
      providerConversationErasure: 'unconfirmed',
      message: success ? 'Retention cleanup completed. Managed AI conversations are archived, not physically deleted.' : 'Retention cleanup is incomplete. Retry to continue. Managed AI conversations are archived, not physically deleted.',
    });
  } catch { return reply({ error: 'CLEANUP_UNAVAILABLE', success: false }, 503); }
}
