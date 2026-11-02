/**
 * Multilingual parity for the cross-session continuity behavioral contract.
 *
 * This suite verifies language guidance only. It intentionally does not alter
 * or make claims about persistence, record selection, ownership, or diagnostics.
 */

import { describe, expect, it } from 'vitest';
import { buildCrossSessionContinuityBlock } from '../../src/lib/crossSessionContinuity.js';
import {
  THERAPIST_MEMORY_TYPE,
  THERAPIST_MEMORY_VERSION,
  THERAPIST_MEMORY_VERSION_KEY,
} from '../../src/lib/therapistMemoryModel.js';

const LANGUAGE_PHRASES = Object.freeze({
  es: Object.freeze([
    'Recuerdo que hablamos de',
    'Puede que me falte una parte',
    'Dejaremos ese tema de lado',
    '¿Cómo te sientes ahora',
    'Tengo un registro de',
  ]),
  fr: Object.freeze([
    'Je me souviens que nous avons abordé',
    'Il me manque peut-être une partie',
    'Nous laisserons ce sujet de côté',
    'Comment vous sentez-vous maintenant',
    "J'ai un dossier indiquant",
  ]),
  de: Object.freeze([
    'Ich erinnere mich, dass wir',
    'Vielleicht fehlt mir ein Teil',
    'Wir lassen dieses Thema beiseite',
    'Wie fühlen Sie sich gerade',
    'Ich habe einen Eintrag darüber',
  ]),
  it: Object.freeze([
    'Ricordo che avevamo accennato a',
    'Potrebbe mancarmi una parte',
    'Lasceremo da parte questo tema',
    'Come ti senti adesso',
    'Ho una registrazione di',
  ]),
  pt: Object.freeze([
    'Lembro que falamos sobre',
    'Talvez esteja faltando uma parte',
    'Vamos deixar esse tema de lado',
    'Como você está se sentindo agora',
    'Tenho um registro de',
  ]),
});

function makeTherapistRecord() {
  return {
    id: 'cm-multilingual-continuity',
    memory_type: THERAPIST_MEMORY_TYPE,
    content: JSON.stringify({
      [THERAPIST_MEMORY_VERSION_KEY]: THERAPIST_MEMORY_VERSION,
      session_id: 'multilingual-session-001',
      session_date: '2026-08-19',
      session_summary: 'Discussed a current concern and preserved explicit unknowns.',
      core_patterns: ['uncertainty loop'],
      triggers: [],
      automatic_thoughts: [],
      emotions: ['anxiety'],
      urges: [],
      actions: [],
      consequences: [],
      working_hypotheses: [],
      interventions_used: [],
      risk_flags: [],
      safety_plan_notes: '',
      follow_up_tasks: ['Ask whether the person wants to return to the topic'],
      goals_referenced: [],
      last_summarized_date: '2026-08-19T00:00:00Z',
    }),
  };
}

function makeEntities() {
  return {
    CompanionMemory: {
      list: async () => [makeTherapistRecord()],
    },
    CaseFormulation: {
      list: async () => [],
    },
  };
}

describe('Multilingual cross-session continuity behavioral contract', () => {
  it('contains bounded guidance for every additional supported language', async () => {
    const block = await buildCrossSessionContinuityBlock(makeEntities());

    expect(Object.keys(LANGUAGE_PHRASES)).toEqual(['es', 'fr', 'de', 'it', 'pt']);
    expect(block).toContain('quoted English and Hebrew examples are not language restrictions');
    for (const [locale, phrases] of Object.entries(LANGUAGE_PHRASES)) {
      for (const phrase of phrases) {
        expect(block, `missing ${locale} continuity phrase: ${phrase}`).toContain(phrase);
      }
    }
  });

  it('preserves the existing source-honesty, current-turn, and size guardrails', async () => {
    const block = await buildCrossSessionContinuityBlock(makeEntities());

    expect(block).toContain('Previously, we touched on');
    expect(block).toContain('current user message always overrides');
    expect(block).toContain('Never expose the name of any internal system');
    expect(block.length).toBeLessThan(10000);
  });
});
