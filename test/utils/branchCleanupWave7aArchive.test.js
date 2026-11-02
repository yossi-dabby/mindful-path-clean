import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  APPROVED_LIST_RELATIVE_PATH,
  ARCHIVE_TAG_PREFIX,
  AUDIT_SOURCE_RELATIVE_PATH,
  MAX_BRANCHES,
  REFERENCE_SEARCH_PATHS,
  buildArchiveTag,
  findReferences,
  parseAuditAbandonedWipBranches,
  validateApprovedBranches,
} from '../../scripts/branch-cleanup-wave-7a-archive.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const WORKFLOW_PATH = resolve(REPO_ROOT, '.github/workflows/branch-cleanup-wave-7a-archive.yml');
const APPROVED_LIST_PATH = resolve(REPO_ROOT, 'docs/branch-cleanup-wave-7a-approved-list.txt');
const AUDIT_PATH = resolve(REPO_ROOT, 'docs/remaining-branch-reduction-audit.md');

describe('branch cleanup wave 7a reference scanning', () => {
  it('approved-list and audit-source references do not block', () => {
    const refs = findReferences('copilot/example-branch', {
      searchPaths: ['docs'],
      repoRoot: '/virtual/repo',
      pathExists: () => true,
      runCommand: () => `${APPROVED_LIST_RELATIVE_PATH}\n${AUDIT_SOURCE_RELATIVE_PATH}\n`,
    });

    expect(refs).toEqual([]);
  });

  it('other docs/workflow references block', () => {
    const refs = findReferences('copilot/example-branch', {
      searchPaths: ['docs', '.github/workflows'],
      repoRoot: '/virtual/repo',
      pathExists: () => true,
      runCommand: () =>
        `${APPROVED_LIST_RELATIVE_PATH}\n` +
        'docs/remaining-branch-reduction-audit.md\n' +
        '.github/workflows/branch-cleanup-wave-7a-archive.yml\n',
    });

    expect(refs).toEqual(['.github/workflows/branch-cleanup-wave-7a-archive.yml']);
  });

  it('still scans package and deployment config paths', () => {
    expect(REFERENCE_SEARCH_PATHS).toEqual(
      expect.arrayContaining(['package.json', 'railway.toml', 'vercel.json', 'netlify.toml'])
    );
  });
});

describe('branch cleanup wave 7a guardrails', () => {
  it('empty approved list is rejected', () => {
    expect(() => validateApprovedBranches([])).toThrow(/Approved list is empty/);
  });

  it('more than 25 branches is rejected', () => {
    const branches = Array.from({ length: MAX_BRANCHES + 1 }, (_, index) => `copilot/branch-${index}`);
    expect(() => validateApprovedBranches(branches)).toThrow(/exceeds the limit of 25/);
  });

  it('main and staging-fresh are blocked', () => {
    expect(() => validateApprovedBranches(['main'])).toThrow(/Protected branch "main"/);
    expect(() => validateApprovedBranches(['staging-fresh'])).toThrow(
      /Protected branch "staging-fresh"/
    );
  });

  it('archive tags follow the required prefix and include date + branch', () => {
    const tag = buildArchiveTag('copilot/example-branch', '20260610');
    expect(tag).toBe(`${ARCHIVE_TAG_PREFIX}/20260610/copilot/example-branch`);
  });

  it('parses abandoned WIP branches from audit section 2c', () => {
    const auditMap = parseAuditAbandonedWipBranches(readFileSync(AUDIT_PATH, 'utf8'));

    expect(auditMap.has('copilot/add-debugging-step-to-workflow')).toBe(true);
    expect(auditMap.get('copilot/add-debugging-step-to-workflow')?.ageDays).toBeGreaterThan(90);
    expect(auditMap.has('copilot/add-accessibility-tests-community-page')).toBe(false);
  });
});

describe('branch cleanup wave 7a workflow', () => {
  it('workflow remains workflow_dispatch only', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    expect(workflow).toMatch(/^on:\s*\n\s+workflow_dispatch:/m);
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).not.toMatch(/^\s+pull_request:/m);
    expect(workflow).not.toMatch(/^\s+schedule:/m);
    expect(workflow).not.toMatch(/^\s+workflow_run:/m);
  });

  it('exact confirmation string is required', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    expect(workflow).toContain('CONFIRM_ARCHIVE_AND_DELETE_ABANDONED_WIP_WAVE_7A');
    expect(workflow).not.toContain('CONFIRM_DELETE_DIRECT_SAFE_BRANCHES_WAVE_6');
  });

  it('configures git identity before creating archive tags', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    expect(workflow).toContain('Configure git identity for archive tags');
    expect(workflow).toContain('git config user.name "github-actions[bot]"');
    expect(workflow).toContain(
      'git config user.email "41898282+github-actions[bot]@users.noreply.github.com"'
    );
  });
});

describe('branch cleanup wave 7a approved list', () => {
  function readBranches() {
    return readFileSync(APPROVED_LIST_PATH, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  }

  it('contains at least one branch and stays within the wave cap', () => {
    const branches = readBranches();

    expect(branches.length).toBeGreaterThan(0);
    expect(branches.length).toBeLessThanOrEqual(MAX_BRANCHES);
  });

  it('does not include protected branches', () => {
    expect(readBranches()).not.toContain('main');
    expect(readBranches()).not.toContain('staging-fresh');
  });
});
