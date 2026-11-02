import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from '../../src/data/therapeuticForms/availability.js';

import generatedFormsIndex from '../../src/generated/therapeutic-forms-index.json';

const ROOT = process.cwd();
const GENERATOR_SCRIPT = path.join(ROOT, 'scripts/generate-therapeutic-forms-index.mjs');
const GENERATED_INDEX_PATH = path.join(ROOT, 'src/generated/therapeutic-forms-index.json');

function toAbsoluteFromRepoPath(filePath) {
  return path.join(ROOT, String(filePath || ''));
}

describe('therapeutic forms generated index safety', () => {
  it('regenerates therapeutic forms index successfully', () => {
    const result = spawnSync('node', [GENERATOR_SCRIPT], {
      cwd: ROOT,
      env: process.env,
      encoding: 'utf8',
    });

    expect(result.status, `Generator failed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(GENERATED_INDEX_PATH)).toBe(true);
  });

});
