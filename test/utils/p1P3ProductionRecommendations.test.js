import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { translations } from '../../src/components/i18n/translations.jsx';
import { buildExperimentJournalEntry } from '../../src/lib/experimentMetrics.js';
import {
  THERAPIST_INTERVENTION_READINESS_GATES,
  THERAPIST_PLANNER_FIRST_INSTRUCTIONS,
} from '../../src/lib/therapistWorkflowEngine.js';

describe('P1–P3 production recommendations', () => {
  it('keeps the composer locked during opener creation while allowing queued follow-ups', () => {
    const source = readFileSync(new URL('../../src/pages/Chat.jsx', import.meta.url), 'utf8');
    const start = source.slice(source.indexOf('const startNewConversationWithIntent'), source.indexOf('const startNewConversation ='));
    expect(start).toContain('conversationInitializingRef.current = true');
    expect(start).toContain('await base44.agents.addMessage');
    expect(start).not.toContain('setTimeout(async');
    expect(source).toContain('disabled={isConversationInitializing || isUploadingFile}');
    expect(source).toContain('const legacyRapidQueueRef = useRef([])');
    expect(source).toContain('legacyRapidQueueRef.current.push');
    expect(source).toContain('disabled={isLoading || isConversationInitializing || isUploadingFile || isTranscribingAudio}');
    expect(source).toContain("setInputMessage((currentDraft) => currentDraft.trim() ? currentDraft : messageText)");
    expect(source).not.toContain("if (!_isV2QueuedExecution) {\n        setInputMessage((currentDraft) => currentDraft.trim() ? currentDraft : messageText);");
    expect(source).toContain('conversationId: currentConversationIdRef.current');
    expect(source).toContain('if (currentConversationIdRef.current === sendConversationId)');
  });

  it('provides delivery, wait, feedback, voice, and experiment labels in all seven languages', () => {
    for (const locale of ['en', 'he', 'es', 'fr', 'de', 'it', 'pt']) {
      const chat = translations[locale].translation.chat;
      expect(chat.delivery.sent).toBeTruthy();
      expect(chat.wait.still_working).toBeTruthy();
      expect(chat.feedback.prompt).toBeTruthy();
      expect(chat.voice.record_aria).toBeTruthy();
      expect(chat.experiment_metrics.open).toBeTruthy();
    }
  });

  it('requires an explicit experiment readiness handshake and neutral professional care positioning', () => {
    expect(THERAPIST_INTERVENTION_READINESS_GATES.readiness_signal.condition).toContain('explicit present-turn affirmative choice');
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('EXPLICIT EXPERIMENT READINESS HANDSHAKE');
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('valid parallel or immediate option');
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('never requires trying AI support first');
    expect(THERAPIST_PLANNER_FIRST_INSTRUCTIONS).toContain('do not restate the full maintaining loop');
  });

  it('maps experiment results into the existing journal schema with bounded metrics', () => {
    const entry = buildExperimentJournalEntry({
      structuredData: {
        situation: 'team meeting',
        automatic_thought: 'I will fail',
        emotion_ratings: { anxiety: 14 },
        homework: [{ step: 'Speak once', duration_minutes: 90, success_criteria: 'One contribution' }],
      },
      conversationId: 'conv-1',
      messageIndex: 4,
      anxietyAfter: -2,
      beliefAfter: 12,
      observedOutcome: ' I spoke once. ',
      learning: ' The feared outcome did not occur. ',
    });
    expect(entry.entry_type).toBe('custom');
    expect(entry.emotion_ratings.anxiety).toBe(10);
    expect(entry.outcome_emotion_intensity).toBe(0);
    expect(entry.custom_fields.belief_after).toBe(10);
    expect(entry.homework_tasks[0].duration_minutes).toBe(60);
    expect(entry.evidence_against).toBe('I spoke once.');
  });
});
