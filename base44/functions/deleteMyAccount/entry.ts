import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { requestFileDeletion } from './fileDeletionQueue.js';
import { checkLegacyReferences } from './legacyFiles.js';

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

async function deleteAllOwnedRecords(base44, entityName, email, subjectUserId = null) {
  const entityApi = base44.asServiceRole.entities[entityName];
  let deleted = 0;

  for (let batchNumber = 0; batchNumber < MAX_BATCHES_PER_ENTITY; batchNumber += 1) {
    const records = await entityApi.filter(
      subjectUserId ? { subject_user_id: subjectUserId } : { created_by: email },
      'created_date',
      BATCH_SIZE,
      0
    );

    if (records.length === 0) return deleted;

    for (const record of records) {
      if (subjectUserId && record.subject_user_id !== subjectUserId) throw new Error('Account access ownership mismatch');
      await entityApi.delete(record.id);
      deleted += 1;
    }

    if (records.length < BATCH_SIZE) return deleted;
  }

  throw new Error(`Deletion safety limit reached for ${entityName}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
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

    await checkLegacyReferences(base44, USER_OWNED_ENTITIES, user.email);
    // Capture and retain private storage references before deleting any source
    // rows. Customer Care confirmation is a separate tracked operation.
    const fileRequest = await requestFileDeletion(base44, user);
    await base44.asServiceRole.entities.User.update(user.id, {
      mp_account_deletion_pending: true, mp_adult_policy: '',
    });
    const deletedByEntity = {};
    for (const entityName of USER_OWNED_ENTITIES) {
      deletedByEntity[entityName] = await deleteAllOwnedRecords(base44, entityName, user.email);
    }

    // Service-created age/grant rows are owned by subject ID, not created_by.
    deletedByEntity.AccountAccess = await deleteAllOwnedRecords(base44, 'AccountAccess', user.email, user.id);

    // Delete the account only after every owned entity batch completed. If an
    // earlier deletion fails, sign-in/privacy support remains available, while
    // the deletion latch keeps ordinary tools closed until support resolves it.
    await base44.asServiceRole.entities.User.delete(user.id);

    return Response.json({
      success: true,
      accountDeleted: true,
      fileDeletionPending: !!fileRequest,
      fileDeletionRequestId: fileRequest?.id || null,
      providerConversationErasure: 'unconfirmed',
      deletedByEntity
    });
  } catch (error) {
    return Response.json({ error: 'Account deletion could not be completed. Contact support or retry.' }, { status: 500 });
  }
});
