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

async function readAllOwnedRecords(base44, entityName, email) {
  const entityApi = base44.asServiceRole.entities[entityName];
  const records = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const batch = await entityApi.filter(
      { created_by: email },
      'created_date',
      PAGE_SIZE,
      page * PAGE_SIZE
    );
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
