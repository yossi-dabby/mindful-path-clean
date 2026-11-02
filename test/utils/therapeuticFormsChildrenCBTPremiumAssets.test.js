import { describe, it, expect } from 'vitest';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from '../../src/data/therapeuticForms/availability.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_FORMS } from '../../src/data/therapeuticForms/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('therapeuticFormsChildrenCBTPremiumAssets.test.js', () => {

  it('keeps the runtime catalog empty after package retirement', () => {
    expect(ALL_FORMS).toEqual([]);
  });
});
