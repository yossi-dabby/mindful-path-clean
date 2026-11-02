/**
 * Gate 0 regression guards for the multilingual Trusted CBT/Psychoeducation foundation.
 * Static source checks are intentional because Base44 backend functions run in Deno.
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = relativePath => JSON.parse(read(relativePath));

const MULTILINGUAL_FIELDS = [
  'translation_group_id',
  'source_record_id',
  'source_language',
  'variant_language',
  'translation_status',
  'clinical_review_status',
  'translation_version',
  'canonical_status',
];
const SUPPORTED_LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

describe('Gate 0 multilingual content schemas', () => {
  for (const entity of ['TrustedCBTChunk', 'Psychoeducation']) {
    it(`${entity} exposes the complete optional multilingual metadata contract`, () => {
      const schema = readJson(`base44/entities/${entity}.jsonc`);
      for (const field of MULTILINGUAL_FIELDS) {
        expect(schema.properties).toHaveProperty(field);
        expect(schema.required || []).not.toContain(field);
      }
      expect(schema.properties.source_language.enum).toEqual(SUPPORTED_LANGUAGES);
      expect(schema.properties.variant_language.enum).toEqual(SUPPORTED_LANGUAGES);
    });
  }
});

describe('Gate 0 exact-language Trusted CBT retrieval', () => {
  const source = read('base44/functions/retrieveTrustedCBTContent/entry.ts');

  it('rejects missing or unsupported languages instead of falling back', () => {
    expect(source).toContain("reason: 'missing_or_unsupported_language'");
    expect(source).toContain('const requestedLanguage = normalizeLanguage(language || locale)');
  });

  it('filters active records by the exact normalized language', () => {
    expect(source).toMatch(/TrustedCBTChunk\.filter\(\{[\s\S]*?is_active:\s*true,[\s\S]*?language:\s*requestedLanguage/);
  });

  it('supports all seven configured language codes', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(source).toContain(`'${language}'`);
    }
  });

  it('requires the therapist agent to pass the exact session language', () => {
    const agent = readJson('base44/agents/cbt_therapist.jsonc');
    expect(agent.instructions).toContain('Always include language as the exact active session language code');
    expect(agent.instructions).toContain('Never substitute English for another or missing language');
  });
});

describe('Gate 0 Psychoeducation index metadata', () => {
  const indexFiles = [
    'base44/functions/buildContentDocument/entry.ts',
    'base44/functions/indexContentRecord/entry.ts',
    'base44/functions/backfillKnowledgeIndex/entry.ts',
  ];

  for (const file of indexFiles) {
    it(`${file} carries multilingual lineage into index metadata`, () => {
      const source = read(file);
      for (const field of MULTILINGUAL_FIELDS) {
        expect(source).toContain(`'${field}'`);
      }
    });
  }
});
