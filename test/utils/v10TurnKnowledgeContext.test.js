import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildV10TurnKnowledgeContextAsync,
  V10_KNOWLEDGE_RUNTIME_AUTHORITY_END,
  V10_KNOWLEDGE_RUNTIME_AUTHORITY_START,
} from '../../src/lib/workflowContextInjector.js';
import { stripAgentOnlyRuntimeBlocksFromUserContent } from '../../src/components/utils/validateAgentOutput.jsx';

const V10 = Object.freeze({ knowledge_layer_enabled: true });
const CONVERSATION_ID = 'conv-v10';
const SESSION_ID = 'session-v10';
const TARGET = 'Speak once in the team meeting';

function formulation(overrides = {}) {
  return {
    conversation_id: CONVERSATION_ID,
    session_instance_id: SESSION_ID,
    presenting_themes: ['Fear of judgment in team meetings'],
    core_belief_hypotheses: [{ belief: 'Others will judge me', status: 'working_hypothesis' }],
    maintaining_behaviors: { avoidance: ['Staying silent'] },
    goals: [TARGET],
    cbt_domain: 'social_anxiety',
    treatment_phase: 'middle',
    ...overrides,
  };
}

function entities(record, units = []) {
  return {
    CaseFormulation: {
      filter: vi.fn().mockResolvedValue(record ? [record] : []),
      list: vi.fn().mockResolvedValue(record ? [record] : []),
    },
    CompanionMemory: { list: vi.fn().mockResolvedValue([]) },
    CBTCurriculumUnit: { filter: vi.fn().mockResolvedValue(units) },
  };
}

const options = {
  conversation_id: CONVERSATION_ID,
  continuation_session_id: SESSION_ID,
  sessionLanguage: 'en',
  message_text: 'I understand the loop and I am ready for the next step.',
};

describe('V10 per-turn knowledge authority', () => {
  it('does not expose the legacy curriculum function as a callable agent tool', () => {
    const agentConfig = JSON.parse(readFileSync(
      new URL('../../base44/agents/cbt_therapist.jsonc', import.meta.url),
      'utf8',
    ));
    expect(agentConfig.tool_configs).not.toContainEqual({
      function_name: 'retrieveCurriculumUnit',
    });
  });

  it('is inert outside V10', async () => {
    const result = await buildV10TurnKnowledgeContextAsync({}, entities(null), options);
    expect(result).toBe('');
  });

  it('keeps retrieval closed when formulation exists but intervention readiness is absent', async () => {
    const store = entities(formulation());
    const result = await buildV10TurnKnowledgeContextAsync(V10, store, options);
    expect(result).toContain(V10_KNOWLEDGE_RUNTIME_AUTHORITY_START);
    expect(result).toContain('Do NOT call retrieveCurriculumUnit');
    expect(result).not.toContain('=== CBT KNOWLEDGE REFERENCE');
    expect(store.CBTCurriculumUnit.filter).not.toHaveBeenCalled();
  });

  it('retrieves exact-domain, exact-language, safety-clean knowledge after current-session readiness', async () => {
    const readyRecord = formulation({
      understanding_confirmed: {
        confirmed: true,
        session_id: SESSION_ID,
        confirmed_at: '2026-08-29T10:00:00.000Z',
      },
      pending_move: {
        ready: true,
        rationale_clear: true,
        move_id: 'move-1',
        target_ref: TARGET,
        rationale: 'A bounded social approach tests the maintaining prediction.',
        session_id: SESSION_ID,
        set_at: '2026-08-29T10:01:00.000Z',
      },
    });
    const safeEnglish = {
      title: 'Social prediction test',
      content_summary: 'Use a small, bounded behavioral experiment tied to the feared prediction.',
      unit_type: 'intervention',
      cbt_domain: 'social_anxiety',
      languages: ['en'],
      evidence_level: 'established',
      distress_suitability: 'any',
      treatment_arc_position: 'any',
      runtime_eligible_first_wave: true,
      safety_tags: [],
      is_active: true,
    };
    const wrongLanguage = { ...safeEnglish, title: 'Hebrew only', languages: ['he'] };
    const tagged = { ...safeEnglish, title: 'Tagged', safety_tags: ['not_for_crisis'] };
    const store = entities(readyRecord, [wrongLanguage, tagged, safeEnglish]);

    const result = await buildV10TurnKnowledgeContextAsync(V10, store, options);
    expect(result).toContain('=== CBT KNOWLEDGE REFERENCE');
    expect(result).toContain('Social prediction test');
    expect(result).not.toContain('Hebrew only');
    expect(result).not.toContain('Tagged');
  });

  it('strips authority and localized knowledge blocks from persisted visible user content', () => {
    const knowledgeBounds = [
      ['=== CBT KNOWLEDGE REFERENCE (supporting context, read-only) ===', '=== END CBT KNOWLEDGE REFERENCE ==='],
      ['=== הפניית ידע CBT (הקשר תומך, לקריאה בלבד) ===', '=== סוף הפניית הידע של CBT ==='],
    ];
    for (const [start, end] of knowledgeBounds) {
      const content = [
        V10_KNOWLEDGE_RUNTIME_AUTHORITY_START,
        'internal',
        V10_KNOWLEDGE_RUNTIME_AUTHORITY_END,
        '',
        start,
        'internal knowledge',
        end,
        '',
        'Visible user text',
      ].join('\n');
      expect(stripAgentOnlyRuntimeBlocksFromUserContent(content)).toBe('Visible user text');
    }
  });
});
