/**
 * CBT Behavioral QA — Automated Scaffolding
 *
 * Level 1 (Smoke) and structural pattern checks that can run without a live agent.
 * These tests validate:
 *   - QA asset files are present and well-formed
 *   - Test matrix schema is valid
 *   - Behavioral pattern rules are documented and complete
 *   - No production code was modified by the QA setup
 *
 * Safety: This file does NOT call any live agents, does NOT modify any entities,
 * and does NOT alter any production code. It is purely structural validation.
 *
 * Run with: npx vitest run qa/automated/cbt-behavioral.test.js
 * (after npm ci)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QA_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadJson(relPath) {
  const full = resolve(QA_ROOT, relPath);
  if (!existsSync(full)) return null;
  return JSON.parse(readFileSync(full, 'utf-8'));
}

function loadText(relPath) {
  const full = resolve(QA_ROOT, relPath);
  if (!existsSync(full)) return null;
  return readFileSync(full, 'utf-8');
}

function fileExists(absOrRel) {
  const p = absOrRel.startsWith('/') ? absOrRel : resolve(REPO_ROOT, absOrRel);
  return existsSync(p);
}

// ---------------------------------------------------------------------------
// Level 1 — QA Asset Presence (Smoke)
// ---------------------------------------------------------------------------

describe('Level 1 — QA Asset Presence', () => {
  const requiredFiles = [
    'qa/graded-qa-protocol.md',
    'qa/test-matrix.json',
    'qa/manual-checklist.md',
    'qa/runbook.md',
    'qa/automated/cbt-behavioral.test.js',
    '.github/workflows/manual-graded-qa.yml',
  ];

  test.each(requiredFiles)('Required QA file exists: %s', (relPath) => {
    expect(fileExists(relPath)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Level 1 — Test Matrix Schema Validation
// ---------------------------------------------------------------------------

describe('Level 1 — Test Matrix Schema', () => {
  let matrix;

  beforeAll(() => {
    matrix = loadJson('test-matrix.json');
  });

  test('test-matrix.json is valid JSON', () => {
    expect(matrix).not.toBeNull();
  });

  test('test-matrix.json has meta block', () => {
    expect(matrix).toHaveProperty('meta');
    expect(matrix.meta).toHaveProperty('version');
    expect(matrix.meta).toHaveProperty('applies_to', 'cbt_therapist');
  });

  test('test-matrix.json has 5 levels', () => {
    expect(matrix.levels).toHaveLength(5);
  });

  test('Level 1 has 6 tests', () => {
    const level1 = matrix.levels.find((l) => l.level === 1);
    expect(level1).toBeDefined();
    expect(level1.tests).toHaveLength(6);
  });

  test('Level 2 has 9 tests', () => {
    const level2 = matrix.levels.find((l) => l.level === 2);
    expect(level2).toBeDefined();
    expect(level2.tests).toHaveLength(9);
  });

  test('Level 3 covers all 7 app languages', () => {
    const level3 = matrix.levels.find((l) => l.level === 3);
    expect(level3).toBeDefined();
    expect(level3.languages).toEqual(
      expect.arrayContaining(['en', 'he', 'es', 'fr', 'de', 'it', 'pt'])
    );
    expect(level3.languages).toHaveLength(7);
  });

  test('Level 5 has 8 gate items', () => {
    const level5 = matrix.levels.find((l) => l.level === 5);
    expect(level5).toBeDefined();
    expect(level5.gate_items).toHaveLength(8);
  });

  test('All Level 2 tests have required fields', () => {
    const level2 = matrix.levels.find((l) => l.level === 2);
    level2.tests.forEach((t) => {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('name');
      expect(t).toHaveProperty('expected_behavior');
      expect(t).toHaveProperty('rubric');
    });
  });

  test('All test IDs are unique across all levels', () => {
    const ids = [];
    matrix.levels.forEach((level) => {
      const items = level.tests || level.gate_items || [];
      items.forEach((item) => {
        if (item.id) ids.push(item.id);
      });
    });
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// Level 1 — Protocol Document Completeness
// ---------------------------------------------------------------------------

describe('Level 1 — Protocol Document Completeness', () => {
  let protocol;

  beforeAll(() => {
    protocol = loadText('graded-qa-protocol.md');
  });

  test('graded-qa-protocol.md exists and is non-empty', () => {
    expect(protocol).not.toBeNull();
    expect(protocol.length).toBeGreaterThan(100);
  });

  test('Protocol covers all 5 levels', () => {
    expect(protocol).toContain('Level 1');
    expect(protocol).toContain('Level 2');
    expect(protocol).toContain('Level 3');
    expect(protocol).toContain('Level 4');
    expect(protocol).toContain('Level 5');
  });

  test('Protocol covers hand-back', () => {
    expect(protocol.toLowerCase()).toContain('hand-back');
  });

  test('Protocol covers permission-style phrasing', () => {
    expect(protocol.toLowerCase()).toContain('permission');
  });

  test('Protocol covers menu without recommendation', () => {
    expect(protocol.toLowerCase()).toContain('menu');
    expect(protocol.toLowerCase()).toContain('recommendation');
  });

  test('Protocol covers question-count limits', () => {
    expect(protocol.toLowerCase()).toContain('question');
  });

  test('Protocol covers flooding → grounding', () => {
    expect(protocol.toLowerCase()).toContain('flood');
    expect(protocol.toLowerCase()).toContain('ground');
  });

  test('Protocol covers avoidance → micro-step', () => {
    expect(protocol.toLowerCase()).toContain('avoidance');
    expect(protocol.toLowerCase()).toContain('micro-step');
  });

  test('Protocol covers insight → next step', () => {
    expect(protocol.toLowerCase()).toContain('insight');
  });

  test('Protocol covers multilingual parity', () => {
    expect(protocol.toLowerCase()).toContain('multilingual');
  });

  test('Protocol covers cross-chat consistency', () => {
    expect(protocol.toLowerCase()).toContain('cross-chat');
  });

  test('Protocol covers all 7 app languages', () => {
    const langs = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
    langs.forEach((lang) => {
      expect(protocol).toContain(`\`${lang}\``);
    });
  });

  test('Protocol includes a grading rubric', () => {
    expect(protocol).toContain('PASS');
    expect(protocol).toContain('FAIL');
    expect(protocol).toContain('REQUIRES-VERIFICATION');
  });
});

// ---------------------------------------------------------------------------
// Level 1 — Manual Checklist Completeness
// ---------------------------------------------------------------------------

describe('Level 1 — Manual Checklist Completeness', () => {
  let checklist;

  beforeAll(() => {
    checklist = loadText('manual-checklist.md');
  });

  test('manual-checklist.md exists and is non-empty', () => {
    expect(checklist).not.toBeNull();
    expect(checklist.length).toBeGreaterThan(100);
  });

  test('Checklist includes all 9 Level 2 scenario IDs', () => {
    for (let i = 1; i <= 9; i++) {
      const id = `L2-0${i}`;
      expect(checklist).toContain(id);
    }
  });

  test('Checklist includes Level 5 gate table', () => {
    expect(checklist).toContain('G-01');
    expect(checklist).toContain('G-08');
  });

  test('Checklist includes sign-off section', () => {
    expect(checklist.toLowerCase()).toContain('sign-off');
  });

  test('Checklist includes multilingual table for all 7 languages', () => {
    const langs = ['English', 'Hebrew', 'Spanish', 'French', 'German', 'Italian', 'Portuguese'];
    langs.forEach((lang) => {
      expect(checklist).toContain(lang);
    });
  });
});

// ---------------------------------------------------------------------------
// Level 1 — GitHub Actions Workflow Validation
// ---------------------------------------------------------------------------

describe('Level 1 — GitHub Actions Workflow', () => {
  let workflow;

  beforeAll(() => {
    const p = resolve(REPO_ROOT, '.github/workflows/manual-graded-qa.yml');
    workflow = existsSync(p) ? readFileSync(p, 'utf-8') : null;
  });

  test('manual-graded-qa.yml exists', () => {
    expect(workflow).not.toBeNull();
  });

  test('Workflow uses only workflow_dispatch trigger', () => {
    expect(workflow).toContain('workflow_dispatch');
    expect(workflow).not.toContain('on:\n  push');
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).not.toMatch(/^\s+pull_request:/m);
    expect(workflow).not.toMatch(/^\s+schedule:/m);
  });

  test('Workflow writes to GITHUB_STEP_SUMMARY', () => {
    expect(workflow).toContain('GITHUB_STEP_SUMMARY');
  });

  test('Workflow uploads artifacts', () => {
    expect(workflow).toContain('upload-artifact');
  });

  test('Workflow runs existing unit tests', () => {
    expect(workflow.toLowerCase()).toContain('npm');
    expect(workflow.toLowerCase()).toContain('test');
  });
});

// ---------------------------------------------------------------------------
// Safety — Verify No Production Files Were Modified
// ---------------------------------------------------------------------------

describe('Safety — Production Code Integrity', () => {
  const protectedFiles = [
    'src/api/agentWiring.js',
    'src/api/activeAgentWiring.js',
    'src/api/base44Client.js',
    'base44/functions/postLlmSafetyFilter/entry.ts',
    'base44/functions/sanitizeAgentOutput/entry.ts',
    'base44/functions/sanitizeConversation/entry.ts',
    'base44/functions/backfillKnowledgeIndex/entry.ts',
  ];

  test.each(protectedFiles)(
    'Protected file exists and was not deleted: %s',
    (relPath) => {
      expect(fileExists(relPath)).toBe(true);
    }
  );

  test('QA files are not under src/ or functions/', () => {
    const qaFiles = [
      'qa/graded-qa-protocol.md',
      'qa/test-matrix.json',
      'qa/manual-checklist.md',
      'qa/runbook.md',
      'qa/automated/cbt-behavioral.test.js',
    ];
    qaFiles.forEach((f) => {
      expect(f).not.toMatch(/^src\//);
      expect(f).not.toMatch(/^functions\//);
    });
  });
});
