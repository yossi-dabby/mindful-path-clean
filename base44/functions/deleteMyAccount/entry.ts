import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const USER_OWNED_ENTITIES = [
  'Goal',
  'GoalReminder',
  'MoodEntry',
  'ThoughtJournal',
  'JournalTemplate',
  'JournalReminder',
  'Conversation',
  'CoachingSession',
  'HealthMetric',
  'UserStreak',
  'Badge',
  'SavedResource',
  'ProactiveReminder',
  'AppNotification',
  'UserDeletedConversations',
  'ForumPost',
  'ForumComment',
  'CommunityGroup',
  'GroupMembership',
  'SharedProgress',
  'UserPoints',
  'Subscription',
  'VideoProgress',
  'UserExerciseProgress',
  'Playlist',
  'PlaylistVideo',
  'UserJourneyProgress',
  'ExerciseRecommendationFeedback',
  'SessionSummary',
  'CompanionMemory',
  'TherapyFeedback',
  'CrisisAlert',
  'CaseFormulation',
  'MindGameActivity',
  'DailyFlow',
  'DailyChallenge',
  'ConsentRecord'
];

const BATCH_SIZE = 100;
const MAX_BATCHES_PER_ENTITY = 1000;

async function deleteAllOwnedRecords(base44, entityName, email) {
  const entityApi = base44.asServiceRole.entities[entityName];
  let deleted = 0;

  for (let batchNumber = 0; batchNumber < MAX_BATCHES_PER_ENTITY; batchNumber += 1) {
    const records = await entityApi.filter(
      { created_by: email },
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

  throw new Error(`Deletion safety limit reached for ${entityName}`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role === 'admin') {
      return Response.json(
        { error: 'Admin or app-owner accounts cannot be deleted from inside the app.' },
        { status: 403 }
      );
    }

    const deletedByEntity = {};
    for (const entityName of USER_OWNED_ENTITIES) {
      deletedByEntity[entityName] = await deleteAllOwnedRecords(base44, entityName, user.email);
    }

    // Delete the account only after every owned entity batch completed. If an
    // earlier deletion fails, the account remains accessible so the user can retry.
    await base44.asServiceRole.entities.User.delete(user.id);

    return Response.json({
      success: true,
      accountDeleted: true,
      deletedByEntity
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});