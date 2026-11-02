import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

import {
  APPROVED_LIST_RELATIVE_PATH,
  MAX_BRANCHES,
  REFERENCE_SEARCH_PATHS,
  evaluateBranch,
  findReferences,
  getRemoteBranchInventory,
  validateApprovedBranches,
} from '../../scripts/branch-cleanup-wave-2.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const WORKFLOW_PATH = resolve(REPO_ROOT, '.github/workflows/branch-cleanup-wave-2.yml');
const APPROVED_LIST_PATH = resolve(REPO_ROOT, 'docs/branch-cleanup-wave-2-approved-list.txt');
const TEST_REPOSITORY = { owner: 'test-owner', repo: 'test-repo' };

/** Wave 1 deleted branches — must not appear in Wave 2. */
const WAVE_1_DELETED = new Set([
  'copilot/featmobile-coach-content-depth',
  'copilot/featmobile-coach-content-depth-again',
  'copilot/featmobile-coach-header-cta-fab',
  'copilot/improve-coach-screen-mobile-copy',
  'feat/mobile-coach-header-cta-fab',
  'copilot/add-ci-playwright-integration',
  'add-playwright-workflow',
  'copilot/add-e2e-test-documentation',
  'copilot/add-playwright-e2e-tests',
  'copilot/add-playwright-e2e-tests-again',
]);

describe('branch cleanup wave 2 reference scanning', () => {
  it('ignores branch references found only in the wave-2 approved-list manifest', () => {
    const refs = findReferences('copilot/example-branch', {
      searchPaths: ['docs'],
      repoRoot: '/virtual/repo',
      pathExists: () => true,
      runCommand: () => `${APPROVED_LIST_RELATIVE_PATH}\n`,
    });

    expect(refs).toEqual([]);
  });

  it('keeps references found in other docs files', () => {
    const refs = findReferences('copilot/example-branch', {
      searchPaths: ['docs'],
      repoRoot: '/virtual/repo',
      pathExists: () => true,
      runCommand: () =>
        `${APPROVED_LIST_RELATIVE_PATH}\n` +
        'docs/branch-cleanup-wave-2.md\n' +
        'docs/some-other-doc.md\n',
    });

    expect(refs).toEqual([
      'docs/branch-cleanup-wave-2.md',
      'docs/some-other-doc.md',
    ]);
  });

  it('keeps references found in workflow files', () => {
    const refs = findReferences('copilot/example-branch', {
      searchPaths: ['.github/workflows'],
      repoRoot: '/virtual/repo',
      pathExists: () => true,
      runCommand: () => '.github/workflows/branch-cleanup-wave-2.yml\n',
    });

    expect(refs).toEqual(['.github/workflows/branch-cleanup-wave-2.yml']);
  });

  it('still scans package and deployment config paths', () => {
    expect(REFERENCE_SEARCH_PATHS).toEqual(
      expect.arrayContaining(['package.json', 'railway.toml', 'vercel.json', 'netlify.toml'])
    );
  });
});

describe('branch cleanup wave 2 guardrails', () => {
  it('blocks main and staging-fresh from the approved list', () => {
    expect(() => validateApprovedBranches(['main'])).toThrow(/Protected branch "main"/);
    expect(() => validateApprovedBranches(['staging-fresh'])).toThrow(
      /Protected branch "staging-fresh"/
    );
  });

  it('blocks approved lists larger than 50 branches', () => {
    const branches = Array.from({ length: MAX_BRANCHES + 1 }, (_, index) => `copilot/branch-${index}`);
    expect(() => validateApprovedBranches(branches)).toThrow(
      /exceeds the limit of 50/
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
        command === 'git ls-remote --heads origin'
          ? null
          : 'origin/HEAD\norigin/main\norigin/feature\n',
    });

    expect(fallbackInventory).toEqual({
      count: 2,
      source: 'git for-each-ref refs/remotes/origin (fallback)',
    });
  });

  it('skips unmerged branches instead of aborting the entire run', async () => {
    const result = await evaluateBranch('copilot/example-branch', TEST_REPOSITORY, {
      remoteExistsFn: () => true,
      isMergedIntoMainFn: () => false,
    });

    expect(result).toMatchObject({
      branch: 'copilot/example-branch',
      exists: true,
      merged: false,
      openPrs: 0,
      refs: [],
      action: 'skipped',
      status: 'SKIP – branch is NOT merged into origin/main',
    });
  });

  it('skips branches with open pull requests instead of aborting the entire run', async () => {
    const result = await evaluateBranch('copilot/example-branch', TEST_REPOSITORY, {
      remoteExistsFn: () => true,
      isMergedIntoMainFn: () => true,
      openPrCountFn: async () => 2,
    });

    expect(result).toMatchObject({
      branch: 'copilot/example-branch',
      exists: true,
      merged: true,
      openPrs: 2,
      refs: [],
      action: 'skipped',
      status: 'SKIP – branch has 2 open PR(s)',
    });
  });
});

describe('branch cleanup wave 2 workflow', () => {
  it('remains workflow_dispatch only', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    expect(workflow).toMatch(/^on:\s*\n\s+workflow_dispatch:/m);
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).not.toMatch(/^\s+pull_request:/m);
    expect(workflow).not.toMatch(/^\s+schedule:/m);
    expect(workflow).not.toMatch(/^\s+workflow_run:/m);
  });

  it('requires the exact Wave 2 confirmation string', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    expect(workflow).toContain('CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_2');
    expect(workflow).not.toContain('CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_3');
    // Must not accept the Wave 1 confirmation string
    expect(workflow).not.toMatch(/CONFIRM_DELETE_SAFE_MERGED_BRANCHES(?!_WAVE_)/);
  });
});

describe('branch cleanup wave 2 approved list', () => {
  it('does not include any Wave 1 deleted branches', () => {
    const content = readFileSync(APPROVED_LIST_PATH, 'utf8');
    const branches = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    for (const branch of branches) {
      expect(WAVE_1_DELETED.has(branch)).toBe(false);
    }
  });

  it('does not exceed 50 branches', () => {
    const content = readFileSync(APPROVED_LIST_PATH, 'utf8');
    const branches = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    expect(branches.length).toBeLessThanOrEqual(MAX_BRANCHES);
  });
});
