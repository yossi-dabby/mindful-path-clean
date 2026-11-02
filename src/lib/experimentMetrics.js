const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value)));

export function buildExperimentJournalEntry({ structuredData, conversationId, messageIndex, anxietyAfter, beliefAfter, observedOutcome, learning }) {
  const before = structuredData?.emotion_ratings?.anxiety;
  const homework = Array.isArray(structuredData?.homework) ? structuredData.homework : [];
  return {
    entry_type: 'custom',
    situation: structuredData?.situation || homework[0]?.step || '',
    automatic_thoughts: structuredData?.automatic_thought || '',
    emotion_ratings: { anxiety: before == null ? null : clamp(before, 0, 10) },
    outcome_emotion_intensity: clamp(anxietyAfter, 0, 10),
    evidence_against: observedOutcome.trim(),
    balanced_thought: learning.trim(),
    homework_tasks: homework.map((item) => ({
      task: String(item.step || ''),
      duration_minutes: clamp(item.duration_minutes || 10, 1, 60),
      success_criteria: String(item.success_criteria || ''),
      completed: true,
    })),
    custom_fields: {
      conversation_id: conversationId,
      source_message_index: messageIndex,
      experiment_type: 'behavioral_experiment',
      belief_after: clamp(beliefAfter, 0, 10),
      completed_at: new Date().toISOString(),
    },
  };
}
