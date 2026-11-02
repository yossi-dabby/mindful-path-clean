import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { buildConversationSummaryInput } from '../../src/lib/sessionEndSummarization.js';
import { buildCrossSessionContinuityBlockWithDiagnostic } from '../../src/lib/crossSessionContinuity.js';

const backendSource = readFileSync(
  resolve('base44/functions/generateSessionSummary/entry.ts'),
  'utf8',
);

const CASES = [
  {
    locale: 'es',
    summary: 'El usuario corrigió el dato: la ansiedad permaneció en 6/10.',
    pattern: 'La búsqueda de certeza alivia brevemente y después la duda regresa.',
  },
  {
    locale: 'fr',
    summary: 'L’utilisateur a précisé que l’anxiété est restée à 6/10.',
    pattern: 'La recherche de certitude soulage brièvement, puis le doute revient.',
  },
  {
    locale: 'de',
    summary: 'Der Nutzer stellte klar: Die Angst blieb bei 6/10.',
    pattern: 'Die Suche nach Gewissheit erleichtert kurz, danach kehrt der Zweifel zurück.',
  },
  {
    locale: 'it',
    summary: 'L’utente ha corretto il dato: l’ansia è rimasta a 6/10.',
    pattern: 'La ricerca di certezza dà un breve sollievo, poi il dubbio ritorna.',
  },
  {
    locale: 'pt',
    summary: 'O usuário corrigiu o dado: a ansiedade permaneceu em 6/10.',
    pattern: 'A busca por certeza alivia brevemente, depois a dúvida retorna.',
  },
];

function makeMemoryRecord(sample) {
  const sessionDate = '2026-08-19T00:00:00.000Z';
  return {
    therapist_memory_version: '1',
    session_id: `multilingual-${sample.locale}`,
    session_date: sessionDate,
    session_summary: sample.summary,
    core_patterns: [sample.pattern],
    triggers: [],
    automatic_thoughts: [],
    emotions: [],
    urges: [],
    actions: [],
    consequences: [],
    working_hypotheses: [],
    interventions_used: [],
    risk_flags: [],
    safety_plan_notes: '',
    follow_up_tasks: [],
    goals_referenced: [],
    last_summarized_date: sessionDate,
  };
}

describe('Stage 7 — multilingual therapist memory continuity', () => {
  it('makes USER turns authoritative for memory language and preserves original wording', () => {
    expect(backendSource).toContain(
      'Determine the memory language from USER turns only. Do not let assistant language override it.',
    );
    expect(backendSource).toContain(
      'Preserve user-authored names, exact numbers, corrections, and material quotes in their original language; never translate or transliterate them.',
    );
  });

  it.each(CASES)(
    'preserves the latest $locale user wording in bounded summary input',
    (sample) => {
      const result = buildConversationSummaryInput([
        { role: 'assistant', content: 'English assistant wording must not set the memory language.' },
        { role: 'user', content: sample.summary },
      ]);

      expect(result.turns.at(-1)).toEqual({ role: 'user', content: sample.summary });
      expect(JSON.stringify(result)).toContain(sample.summary);
    },
  );

  it.each(CASES)(
    'injects stored $locale summary and pattern without translation or transliteration',
    async (sample) => {
      const record = makeMemoryRecord(sample);
      const entities = {
        CompanionMemory: {
          list: vi.fn().mockResolvedValue([
            { memory_type: 'therapist_session', content: JSON.stringify(record) },
          ]),
        },
      };

      const result = await buildCrossSessionContinuityBlockWithDiagnostic(entities);

      expect(result.block).toContain(sample.summary);
      expect(result.block).toContain(sample.pattern);
      expect(result.diagnostic).toMatchObject({
        memory_read_attempted: true,
        valid_therapist_memory_record_count: 1,
        selected_prior_session_count: 1,
        recurring_pattern_count: 1,
        continuity_block_emitted: true,
        continuity_fail_safe: false,
        continuity_failure_reason_code: 'none',
      });
    },
  );
});
