import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

const EXPORTABLE_ENTITIES = [
  'Goal', 'GoalReminder', 'MoodEntry', 'ThoughtJournal', 'JournalTemplate',
  'JournalReminder', 'Conversation', 'CoachingSession', 'HealthMetric',
  'UserStreak', 'Badge', 'SavedResource', 'ProactiveReminder', 'AppNotification',
  'UserDeletedConversations', 'ForumPost', 'ForumComment', 'CommunityGroup',
  'GroupMembership', 'SharedProgress', 'UserPoints', 'Subscription',
  'VideoProgress', 'PlaylistVideo', 'Playlist', 'UserJourneyProgress',
  'ExerciseRecommendationFeedback', 'SessionSummary', 'CompanionMemory',
  'TherapyFeedback', 'CrisisAlert', 'CaseFormulation', 'MindGameActivity',
  'DailyFlow', 'DailyChallenge', 'ConsentRecord'
];

const PAGE_SIZE = 500;
const MAX_PAGES = 100;

async function readAllOwnedRecords(base44, entityName, email, subjectUserId = null) {
  const entityApi = base44.asServiceRole.entities[entityName];
  const records = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const batch = await entityApi.filter(
      subjectUserId ? { subject_user_id: subjectUserId } : { created_by: email },
      'created_date',
      PAGE_SIZE,
      page * PAGE_SIZE
    );
    if (subjectUserId && batch.some(record => record.subject_user_id !== subjectUserId)) throw new Error('Account access ownership mismatch');
    records.push(...batch);
    if (batch.length < PAGE_SIZE) return { records, truncated: false };
  }

  return { records, truncated: true };
}

function sanitizeMessage(message) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    created_date: message.created_date,
    updated_date: message.updated_date,
    file_urls: message.file_urls || []
  };
}

function sanitizeConversation(conversation) {
  return {
    id: conversation.id,
    agent_name: conversation.agent_name,
    created_date: conversation.created_date,
    updated_date: conversation.updated_date,
    metadata: {
      name: conversation.metadata?.name,
      description: conversation.metadata?.description,
      type: conversation.metadata?.type,
      intent: conversation.metadata?.intent,
      session_id: conversation.metadata?.session_id
    },
    messages: Array.isArray(conversation.messages)
      ? conversation.messages.map(sanitizeMessage)
      : []
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entities = {};
    const warnings = [];
    const truncatedEntities = [];

    for (const entityName of EXPORTABLE_ENTITIES) {
      try {
        const result = await readAllOwnedRecords(base44, entityName, user.email);
        entities[entityName] = result.records;
        if (result.truncated) truncatedEntities.push(entityName);
      } catch (error) {
        entities[entityName] = [];
        warnings.push(`${entityName}: ${error.message}`);
      }
    }

    try {
      const result = await readAllOwnedRecords(base44, 'AccountAccess', user.email, user.id);
      entities.AccountAccess = result.records.map(record => ({
        adult_status: record.adult_status, policy_version: record.policy_version,
        attested_at: record.attested_at, attestation_language: record.attestation_language,
        forms_review_allowed: record.forms_review_allowed, forms_updated_at: record.forms_updated_at,
      }));
      if (result.truncated) truncatedEntities.push('AccountAccess');
    } catch {
      entities.AccountAccess = [];
      warnings.push('AccountAccess: export unavailable');
    }

    try {
      const result = await readAllOwnedRecords(base44, 'FileDeletionRequest', user.email, user.id);
      entities.FileDeletionRequest = result.records.map(record => ({
        status: record.status, requested_at: record.requested_at, submitted_at: record.submitted_at,
        confirmed_at: record.confirmed_at, cleared_at: record.cleared_at,
        coverage: record.coverage, file_count: record.file_uris?.length || 0,
      }));
      if (result.truncated) truncatedEntities.push('FileDeletionRequest');
    } catch {
      entities.FileDeletionRequest = [];
      warnings.push('FileDeletionRequest: export unavailable');
    }

    let agentConversations = [];
    try {
      const conversations = await base44.agents.getConversations();
      agentConversations = conversations.map(sanitizeConversation);
    } catch (error) {
      warnings.push(`Agent conversations: ${error.message}`);
    }

    return Response.json({
      schema_version: '1.0',
      exported_at: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_date: user.created_date,
        language: user.preferences?.language,
        preferences: user.preferences || {}
      },
      data: {
        entities,
        agent_conversations: agentConversations
      },
      integrity: {
        complete: warnings.length === 0 && truncatedEntities.length === 0,
        warnings,
        truncated_entities: truncatedEntities,
        omitted_fields: [
          'AI internal reasoning',
          'tool calls',
          'service credentials',
          'security-only platform metadata'
        ]
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
