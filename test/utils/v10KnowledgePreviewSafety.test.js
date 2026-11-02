import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  CBT_KNOWLEDGE_SUPPORTED_LANGUAGES,
  retrieveBoundedCBTKnowledgeBlock,
} from '../../src/lib/cbtKnowledgeRetrieval.js';

const PLAN = Object.freeze({
  shouldRetrieve: true,
  domainHint: 'anxiety',
  unitTypePreference: 'any',
  distressFilter: 'any',
  treatmentArcFilter: 'any',
  skipReason: '',
});

function makeEntities(units) {
  return {
    CBTCurriculumUnit: {
      filter: vi.fn().mockResolvedValue(units),
    },
  };
}

function makeLegacyUnit(overrides = {}) {
  return {
    id: 'legacy-unit',
    title: 'Legacy anxiety unit',
    clinical_topic: 'anxiety',
    content_summary: 'Legacy summary',
    cbt_domain: 'anxiety',
    evidence_level: 'established',
    distress_suitability: 'any',
    safety_tags: [],
    treatment_arc_position: 'any',
    runtime_eligible_first_wave: true,
    languages: ['en'],
    ...overrides,
  };
}

function makeSeedContractUnit(overrides = {}) {
  return {
    id: 'seed-unit',
    title: 'Seed anxiety unit',
    clinical_topic: 'general_anxiety',
    content_summary: 'Seed summary',
    planner_domain: 'anxiety',
    evidence_level: 'gold_standard',
    distress_suitability: 'not_in_crisis',
    safety_tags: [],
    treatment_arc_position: 'any',
    runtime_eligible_first_wave: true,
    languages: ['en'],
    ...overrides,
  };
}

describe('V10 Knowledge Preview - contract and language safety', () => {
  it('accepts the current seed contract for a matching English session', async () => {
    const block = await retrieveBoundedCBTKnowledgeBlock(
      makeEntities([makeSeedContractUnit()]),
      PLAN,
      'en',
    );

    expect(block).toContain('Seed anxiety unit');
  });

  it('returns an empty block when session language is missing', async () => {
    const block = await retrieveBoundedCBTKnowledgeBlock(
      makeEntities([makeLegacyUnit()]),
      PLAN,
    );

    expect(block).toBe('');
  });

  it('does not inject an English unit into a Hebrew session', async () => {
    const block = await retrieveBoundedCBTKnowledgeBlock(
      makeEntities([makeLegacyUnit()]),
      PLAN,
      'he',
    );

    expect(block).toBe('');
  });

  it('does not treat languages=[all] as permission to inject English into Hebrew', async () => {
    const block = await retrieveBoundedCBTKnowledgeBlock(
      makeEntities([makeLegacyUnit({ languages: ['all'] })]),
      PLAN,
      'he',
    );

    expect(block).toBe('');
  });

  it('uses the exact Hebrew variant without leaking English title, topic, or content', async () => {
    const block = await retrieveBoundedCBTKnowledgeBlock(
      makeEntities([makeLegacyUnit({
        languages: ['en', 'he'],
        language_variants: { he: 'חרדה היא מערכת הגנה פעילה מדי, ולא סימן לפגם באדם.' },
      })]),
      PLAN,
      'he',
    );

    expect(block).toContain('חרדה היא מערכת הגנה פעילה מדי');
    expect(block).toContain('תקציר:');
    expect(block).not.toContain('Legacy anxiety unit');
    expect(block).not.toContain('Legacy summary');
    expect(block).not.toContain('Topic: anxiety');
  });

  it.each(['he', 'es', 'fr', 'de', 'it', 'pt'])(
    'fails closed for %s when the exact language variant is missing or blank',
    async (language) => {
      for (const language_variants of [undefined, {}, { [language]: '   ' }]) {
        const block = await retrieveBoundedCBTKnowledgeBlock(
          makeEntities([makeLegacyUnit({
            languages: CBT_KNOWLEDGE_SUPPORTED_LANGUAGES,
            language_variants,
          })]),
          PLAN,
          language,
        );
        expect(block).toBe('');
      }
    },
  );

  it('fails closed for unsupported session languages', async () => {
    const block = await retrieveBoundedCBTKnowledgeBlock(
      makeEntities([makeLegacyUnit({
        languages: ['en', 'nl'],
        language_variants: { nl: 'Nederlandse inhoud' },
      })]),
      PLAN,
      'nl',
    );

    expect(block).toBe('');
  });

  it('fails closed when planner_domain and cbt_domain conflict', async () => {
    const conflictingUnit = makeLegacyUnit({
      planner_domain: 'depression',
      cbt_domain: 'anxiety',
    });

    const block = await retrieveBoundedCBTKnowledgeBlock(
      makeEntities([conflictingUnit]),
      PLAN,
      'en',
    );

    expect(block).toBe('');
  });

  it('excludes every unit carrying any safety tag', async () => {
    const taggedUnit = makeLegacyUnit({
      safety_tags: ['cardiac_precaution'],
    });

    const block = await retrieveBoundedCBTKnowledgeBlock(
      makeEntities([taggedUnit]),
      PLAN,
      'en',
    );

    expect(block).toBe('');
  });

  it('fails closed for malformed non-empty safety tag arrays', async () => {
    const malformedUnit = makeLegacyUnit({
      safety_tags: [null],
    });

    const block = await retrieveBoundedCBTKnowledgeBlock(
      makeEntities([malformedUnit]),
      PLAN,
      'en',
    );

    expect(block).toBe('');
  });

  it('threads sessionLanguage and the authenticated function client into retrieval', () => {
    const injectorPath = fileURLToPath(
      new URL('../../src/lib/workflowContextInjector.js', import.meta.url),
    );
    const injectorSource = readFileSync(injectorPath, 'utf8');

    expect(injectorSource).toMatch(
      /retrieveBoundedCBTKnowledgeBlock\(\s*entities,\s*plan,\s*options\?\.sessionLanguage,\s*baseClient\?\.functions,?\s*\)/,
    );
  });

  it('injects clinical content from a real eligible seed unit', async () => {
    const seedPath = fileURLToPath(
      new URL('../../src/data/cbt-curriculum-seed-wave4.json', import.meta.url),
    );
    const seedUnits = JSON.parse(readFileSync(seedPath, 'utf8'));
    const realSeedUnit = seedUnits.find(unit => (
      unit.planner_domain === 'anxiety' &&
      unit.runtime_eligible_first_wave === true &&
      unit.is_active === true &&
      Array.isArray(unit.languages) &&
      unit.languages.includes('en') &&
      Array.isArray(unit.safety_tags) &&
      unit.safety_tags.length === 0
    ));

    expect(realSeedUnit).toBeTruthy();
    expect(realSeedUnit.content_summary).toBeUndefined();
    expect(typeof realSeedUnit.content).toBe('string');
    expect(realSeedUnit.content.trim().length).toBeGreaterThan(0);

    const block = await retrieveBoundedCBTKnowledgeBlock(
      makeEntities([realSeedUnit]),
      PLAN,
      'en',
    );

    const expectedExcerpt = realSeedUnit.content.trim().slice(0, 80);

    expect(block).toContain(realSeedUnit.title);
    expect(block).toContain(expectedExcerpt);
    expect(block).not.toContain(realSeedUnit.admin_notes);
  });

  it.each(['he', 'es', 'fr', 'de', 'it', 'pt'])(
    'injects the exact %s variant from a real eligible seed without English fallback',
    async (language) => {
      const seedPath = fileURLToPath(
        new URL('../../src/data/cbt-curriculum-seed-wave4.json', import.meta.url),
      );
      const seedUnits = JSON.parse(readFileSync(seedPath, 'utf8'));
      const realSeedUnit = seedUnits.find(unit => (
        unit.planner_domain === 'anxiety' &&
        unit.runtime_eligible_first_wave === true &&
        unit.is_active === true &&
        Array.isArray(unit.safety_tags) &&
        unit.safety_tags.length === 0
      ));

      const block = await retrieveBoundedCBTKnowledgeBlock(
        makeEntities([realSeedUnit]),
        PLAN,
        language,
      );

      expect(block).toContain(realSeedUnit.language_variants[language].slice(0, 80));
      expect(block).not.toContain(realSeedUnit.title);
      expect(block).not.toContain(realSeedUnit.content.slice(0, 80));
      expect(block).not.toContain(realSeedUnit.admin_notes);
    },
  );

  it('bounds the content fallback to 300 characters', async () => {
    const boundedPrefix = 'A'.repeat(300);
    const contentBeyondBound = `${boundedPrefix}BIDDEN_AFTER_LIMIT`;

    const block = await retrieveBoundedCBTKnowledgeBlock(
      makeEntities([
        makeSeedContractUnit({
          content_summary: '',
          content: contentBeyondBound,
        }),
      ]),
      PLAN,
      'en',
    );

    expect(block).toContain(`Summary: ${boundedPrefix}`);
    expect(block).not.toContain(`${boundedPrefix}B`);
    expect(block).not.toContain('BIDDEN_AFTER_LIMIT');
  });

  it('prefers content_summary over content when both are present', async () => {
    const block = await retrieveBoundedCBTKnowledgeBlock(
      makeEntities([
        makeSeedContractUnit({
          content_summary: 'Preferred bounded summary',
          content: 'Fallback content must not be selected',
        }),
      ]),
      PLAN,
      'en',
    );

    expect(block).toContain('Summary: Preferred bounded summary');
    expect(block).not.toContain('Fallback content must not be selected');
  });
  it.each([
    'distress_suitability',
    'evidence_level',
    'safety_tags',
  ])('defines schema key "%s" exactly once', (key) => {
    const schemaPath = fileURLToPath(
      new URL('../../base44/entities/CBTCurriculumUnit.jsonc', import.meta.url),
    );
    const schemaSource = readFileSync(schemaPath, 'utf8');
    const keyPattern = new RegExp(`^\\s*"${key}"\\s*:`, 'gm');
    const definitions = schemaSource.match(keyPattern) ?? [];

    expect(definitions).toHaveLength(1);
  });
});
