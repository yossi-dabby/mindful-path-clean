import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  APPROVED_LIST_RELATIVE_PATH,
  MAX_BRANCHES,
  REFERENCE_SEARCH_PATHS,
  SAFE_DELETE_MERGED_PR_BRANCHES,
  classifyBranch,
  findReferences,
  getRemoteBranchInventory,
  validateApprovedBranches,
} from '../../scripts/branch-cleanup-wave-6.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const WORKFLOW_PATH = resolve(REPO_ROOT, '.github/workflows/branch-cleanup-wave-6.yml');
const APPROVED_LIST_PATH = resolve(REPO_ROOT, 'docs/branch-cleanup-wave-6-approved-list.txt');

const ABANDONED_WIP_BRANCH = 'copilot/add-advanced-diagnostics-send-button';
const CLOSED_UNMERGED_BRANCH = 'copilot/add-accessibility-tests-community-page';
const NO_PR_STALE_BRANCH = 'copilot/2394-audit-repair-test-infra';

describe('branch cleanup wave 6 reference scanning', () => {
  it('approved-list-only reference does not block', () => {
    const refs = findReferences('copilot/example-branch', {
      searchPaths: ['docs'],
      repoRoot: '/virtual/repo',
      pathExists: () => true,
      runCommand: () => `${APPROVED_LIST_RELATIVE_PATH}\n`,
    });

    expect(refs).toEqual([]);
  });

  it('other docs reference blocks', () => {
    const refs = findReferences('copilot/example-branch', {
      searchPaths: ['docs'],
      repoRoot: '/virtual/repo',
      pathExists: () => true,
      runCommand: () =>
        `${APPROVED_LIST_RELATIVE_PATH}\n` +
        'docs/branch-cleanup-wave-6.md\n' +
        'docs/some-other-doc.md\n',
    });

    expect(refs).toEqual(['docs/branch-cleanup-wave-6.md', 'docs/some-other-doc.md']);
  });

  it('workflow reference blocks', () => {
    const refs = findReferences('copilot/example-branch', {
      searchPaths: ['.github/workflows'],
      repoRoot: '/virtual/repo',
      pathExists: () => true,
      runCommand: () => '.github/workflows/branch-cleanup-wave-6.yml\n',
    });

    expect(refs).toEqual(['.github/workflows/branch-cleanup-wave-6.yml']);
  });

  it('still scans package and deployment config paths', () => {
    expect(REFERENCE_SEARCH_PATHS).toEqual(
      expect.arrayContaining(['package.json', 'railway.toml', 'vercel.json', 'netlify.toml'])
    );
  });
});

describe('branch cleanup wave 6 guardrails', () => {
  it('empty approved list is rejected', () => {
    expect(() => validateApprovedBranches([])).toThrow(/Approved list is empty/);
  });

  it('more than 30 branches is rejected', () => {
    const branches = Array.from({ length: MAX_BRANCHES + 1 }, (_, index) => `copilot/branch-${index}`);
    expect(() => validateApprovedBranches(branches)).toThrow(/exceeds the limit of 30/);
  });

  it('main and staging-fresh are blocked', () => {
    expect(() => validateApprovedBranches(['main'])).toThrow(/Protected branch "main"/);
    expect(() => validateApprovedBranches(['staging-fresh'])).toThrow(
      /Protected branch "staging-fresh"/
    );
  });

  it('prefers git ls-remote for remote head counts and falls back safely', () => {
    const remoteInventory = getRemoteBranchInventory({
      runCommand: (command) =>
        command === 'git ls-remote --heads origin'
          ? 'sha1\trefs/heads/main\nsha2\trefs/heads/feature\n'
          : null,
    });

    expect(remoteInventory).toEqual({
      count: 2,
      source: 'git ls-remote --heads origin',
    });

    const fallbackInventory = getRemoteBranchInventory({
      runCommand: (command) =>
        command === 'git ls-remote --heads origin' ? null : 'origin/HEAD\norigin/main\norigin/feature\n',
    });

    expect(fallbackInventory).toEqual({
      count: 2,
      source: 'git for-each-ref refs/remotes/origin (fallback)',
    });
  });

  it('only allows non-merged branches from the audit-approved PR-merged set', () => {
    expect(classifyBranch('copilot/fix-e2e-test-selectors', { isMergedIntoMainFn: () => false })).toBe(
      'PR-merged via squash/rebase'
    );
    expect(
      classifyBranch(ABANDONED_WIP_BRANCH, { isMergedIntoMainFn: () => false })
    ).toBeNull();
    expect(
      classifyBranch(CLOSED_UNMERGED_BRANCH, { isMergedIntoMainFn: () => false })
    ).toBeNull();
    expect(classifyBranch(NO_PR_STALE_BRANCH, { isMergedIntoMainFn: () => false })).toBeNull();
    expect(SAFE_DELETE_MERGED_PR_BRANCHES.has('copilot/fix-data-sync-issue-goals-page')).toBe(true);
  });
});

describe('branch cleanup wave 6 workflow', () => {
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

    expect(workflow).toContain('CONFIRM_DELETE_DIRECT_SAFE_BRANCHES_WAVE_6');
    expect(workflow).not.toContain('CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_5');
    expect(workflow).not.toContain('CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_4');
  });
});

describe('branch cleanup wave 6 approved list', () => {
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

  it('abandoned WIP branch category is not allowed in Wave 6', () => {
    expect(readBranches()).not.toContain(ABANDONED_WIP_BRANCH);
  });

  it('closed-unmerged branch category is not allowed in Wave 6', () => {
    expect(readBranches()).not.toContain(CLOSED_UNMERGED_BRANCH);
  });

  it('no-PR stale branch category is not allowed in Wave 6', () => {
    expect(readBranches()).not.toContain(NO_PR_STALE_BRANCH);
  });
});
