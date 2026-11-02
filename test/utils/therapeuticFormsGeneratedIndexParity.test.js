import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import generatedFormsIndex from '../../src/generated/therapeutic-forms-index.json';
import { ALL_FORMS, getAllTherapeuticForms, getTherapeuticFormsForAI } from '../../src/data/therapeuticForms/index.js';

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}

describe('empty canonical forms index parity after content retirement', () => {
  it('has no installed PDFs or generated metadata', () => {
    expect(files('public/forms').filter(file => /\.pdf$/i.test(file))).toEqual([]);
    expect(generatedFormsIndex).toEqual([]);
    expect(ALL_FORMS).toEqual([]);
  });
  it('returns the same empty canonical source in preview and production', () => {
    expect(getAllTherapeuticForms({ environment: 'preview' })).toBe(ALL_FORMS);
    expect(getAllTherapeuticForms({ environment: 'production' })).toBe(ALL_FORMS);
  });
  it.each(['en', 'he', 'es', 'fr', 'de', 'it', 'pt'])('exposes no AI form in %s in either environment', language => {
    expect(getTherapeuticFormsForAI({ language, environment: 'preview' })).toEqual([]);
    expect(getTherapeuticFormsForAI({ language, environment: 'production' })).toEqual([]);
  });
});
