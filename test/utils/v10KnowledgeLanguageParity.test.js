import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  CBT_KNOWLEDGE_SUPPORTED_LANGUAGES,
  retrieveBoundedCBTKnowledgeBlock,
} from '../../src/lib/cbtKnowledgeRetrieval.js';

const seedPath = fileURLToPath(
  new URL('../../src/data/cbt-curriculum-seed-wave4.json', import.meta.url),
);
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const eligible = seed.filter((unit) => unit.runtime_eligible_first_wave === true);
const excluded = seed.filter((unit) => unit.runtime_eligible_first_wave !== true);

const requiredTakeawayPatterns = {
  'Anxiety Disorder Psychoeducation: The Fear System': [
    /בהפרעות חרדה|trastornos de ansiedad|troubles anxieux|Angststörungen|disturbi d’ansia|transtornos de ansiedade/i,
    /חשיפ|exposici|exposit|Exposition|esposizi|exposiç/i,
    /קוגניט|cognitiv|kognitiv/i,
  ],
  'Cognitive Restructuring: Examining the Evidence': [
    /אינה חשיבה חיובית|no es pensar en positivo|n’est pas de penser positivement|nicht positives|non è pensare positivo|não é pensar positivamente/i,
    /מדויקת|precisi[oó]n|justesse|genaues|accurato|precisão/i,
  ],
  'Depression: The Withdrawal-Mood Spiral': [
    /הפעלה התנהגותית|activaci[oó]n conductual|activation comportementale|Verhaltensaktivierung|attivazione comportamentale|ativação comportamental/i,
    /מוטיב|motiv/i,
  ],
  'Behavioural Activation: Activity Scheduling': [
    /אנרג|energ|énerg|Energie/i,
    /בהדרגה|gradual|progress|schrittweise/i,
  ],
  'Social Anxiety: The Self-Focused Attention Trap': [
    /החוצה|conversaci[oó]n y el entorno|l’échange et l’environnement|nach außen|conversazione e ambiente|conversa e ao ambiente/i,
    /להפחית|reduc|rédu|reduz|verringern|ridurre/i,
  ],
  'Grief: The Dual Process Model': [
    /שני הכיוונים נחוצים|ambas.*necesarias|deux.*nécessaires|beide.*nötig|entrambi.*necessari|ambas.*necessárias/i,
    /מקובע|fijad|figé|fixierung|bloccati|preso/i,
  ],
  'Self-Esteem: Positive Data Log': [
    /אינו.*הצהרות|no son afirmaciones|ne sont pas des affirmations|nicht um Affirmationen|non sono affermazioni|não são afirmações/i,
    /אמונת ליבה שלילית|creencia nuclear negativa|croyance centrale négative|negative Grundüberzeugung|convinzione negativa|crença central negativa/i,
  ],
  'General CBT Model: Thoughts, Feelings, Behaviours': [
    /השערות|hip[oó]tesis|hypothèses|Hypothesen|ipotesi|hipóteses/i,
    /לא עובדות|no hechos|non des faits|keine.*Tatsachen|non fatti|não fatos/i,
  ],
};

function makePlan(domainHint) {
  return {
    shouldRetrieve: true,
    domainHint,
    unitTypePreference: 'any',
    distressFilter: 'any',
    treatmentArcFilter: 'any',
    skipReason: '',
  };
}

function makeEntities(unit) {
  return {
    CBTCurriculumUnit: {
      filter: vi.fn().mockResolvedValue([unit]),
    },
  };
}

describe('V10 Knowledge — seven-language seed retrieval parity', () => {
  it('retrieves all eight eligible rows in English from canonical content', async () => {
    expect(eligible).toHaveLength(8);

    for (const unit of eligible) {
      const block = await retrieveBoundedCBTKnowledgeBlock(
        makeEntities(unit),
        makePlan(unit.planner_domain),
        'en',
      );

      expect(block).toContain(unit.title);
      expect(block).toContain(unit.content.slice(0, 80));
    }
  });

  it.each(CBT_KNOWLEDGE_SUPPORTED_LANGUAGES.filter((language) => language !== 'en'))(
    'retrieves all eight eligible rows in %s from exact variants only',
    async (language) => {
      for (const unit of eligible) {
        const variant = unit.language_variants[language];
        const block = await retrieveBoundedCBTKnowledgeBlock(
          makeEntities(unit),
          makePlan(unit.planner_domain),
          language,
        );

        expect(variant.length).toBeLessThanOrEqual(300);
        expect(variant).toMatch(/[.!?]$/);
        for (const takeawayPattern of requiredTakeawayPatterns[unit.title]) {
          expect(variant).toMatch(takeawayPattern);
        }
        expect(block).toContain(variant);
        expect(block).not.toContain(unit.title);
        expect(block).not.toContain(unit.content.slice(0, 80));
      }
    },
  );

  it.each(CBT_KNOWLEDGE_SUPPORTED_LANGUAGES)(
    'keeps all three deferred or safety-tagged rows excluded in %s',
    async (language) => {
      for (const unit of excluded) {
        const block = await retrieveBoundedCBTKnowledgeBlock(
          makeEntities(unit),
          makePlan(unit.planner_domain),
          language,
        );
        expect(block).toBe('');
      }
    },
  );
});
