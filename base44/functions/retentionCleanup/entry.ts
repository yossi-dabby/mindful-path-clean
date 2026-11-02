import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

const ALLOWED_RETENTION_DAYS = new Set([30, 90, 365, 999999]);
const BATCH_SIZE = 100;
const MAX_BATCHES = 1000;

async function deleteExpiredOwnedRecords(base44, entityName, email, cutoffISO) {
  const entityApi = base44.asServiceRole.entities[entityName];
  let deleted = 0;

  for (let batchNumber = 0; batchNumber < MAX_BATCHES; batchNumber += 1) {
    const records = await entityApi.filter(
      {
        created_by: email,
        created_date: { $lt: cutoffISO }
      },
      'created_date',
      BATCH_SIZE,
      0
    );

    if (records.length === 0) return deleted;

    for (const record of records) {
      await entityApi.delete(record.id);
      deleted += 1;
    }

    if (records.length < BATCH_SIZE) return deleted;
  }

  throw new Error(`Retention safety limit reached for ${entityName}`);
}

async function archiveExpiredAgentConversations(base44, cutoffDate) {
  const conversations = await base44.agents.getConversations();
  const existing = await base44.entities.UserDeletedConversations.list();
  const archivedIds = new Set(existing.map((record) => record.agent_conversation_id));
  let archived = 0;

  for (const conversation of conversations) {
    if (!conversation.created_date || new Date(conversation.created_date) >= cutoffDate) continue;
    if (archivedIds.has(conversation.id)) continue;

    await base44.entities.UserDeletedConversations.create({
      agent_conversation_id: conversation.id,
      conversation_title: conversation.metadata?.name || 'Session'
    });
    archived += 1;
  }

  return archived;
}

/**
 * Applies the signed-in user's retention choice.
 *
 * Structured mood and journal records are deleted in complete, ownership-scoped
 * batches. Managed AI conversations are archived from the user's view because
 * the Base44 agent API does not expose a physical-delete operation.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configuredDays = Number(user.preferences?.data_retention_days);
    const retentionDays = ALLOWED_RETENTION_DAYS.has(configuredDays) ? configuredDays : 365;

    if (retentionDays === 999999) {
      return Response.json({
        success: true,
        skipped: true,
        retentionDays,
        message: 'Retention is set to indefinite.'
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - retentionDays);
    const cutoffISO = cutoffDate.toISOString();
    const errors = [];

    let deletedMoodEntries = 0;
    let deletedJournalEntries = 0;
    let archivedConversations = 0;

    try {
      deletedMoodEntries = await deleteExpiredOwnedRecords(
        base44,
        'MoodEntry',
        user.email,
        cutoffISO
      );
    } catch (error) {
      errors.push(`MoodEntry: ${error.message}`);
    }

    try {
      deletedJournalEntries = await deleteExpiredOwnedRecords(
        base44,
        'ThoughtJournal',
        user.email,
        cutoffISO
      );
    } catch (error) {
      errors.push(`ThoughtJournal: ${error.message}`);
    }

    try {
      archivedConversations = await archiveExpiredAgentConversations(base44, cutoffDate);
    } catch (error) {
      errors.push(`Agent conversations: ${error.message}`);
    }

    return Response.json({
      success: errors.length === 0,
      retentionDays,
      cutoffDate: cutoffISO,
      deletedMoodEntries,
      deletedJournalEntries,
      archivedConversations,
      errors,
      message: 'Retention cleanup completed. Managed AI conversations are archived, not physically deleted.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
