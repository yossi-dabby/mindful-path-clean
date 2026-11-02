import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

import {
  APPROVED_LIST_RELATIVE_PATH,
  MAX_BRANCHES,
  REFERENCE_SEARCH_PATHS,
  findReferences,
  getRemoteBranchInventory,
  validateApprovedBranches,
} from '../../scripts/branch-cleanup-wave-1.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const WORKFLOW_PATH = resolve(REPO_ROOT, '.github/workflows/branch-cleanup-wave-1.yml');

describe('branch cleanup wave 1 reference scanning', () => {
  it('ignores branch references found only in the approved-list manifest', () => {
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
        'docs/branch-cleanup-wave-1.md\n' +
        'docs/branch-cleanup-wave-1-approved-list.txt.backup\n',
    });

    expect(refs).toEqual([
      'docs/branch-cleanup-wave-1.md',
      'docs/branch-cleanup-wave-1-approved-list.txt.backup',
    ]);
  });

  it('keeps references found in workflow files', () => {
    const refs = findReferences('copilot/example-branch', {
      searchPaths: ['.github/workflows'],
      repoRoot: '/virtual/repo',
      pathExists: () => true,
      runCommand: () => '.github/workflows/branch-cleanup-wave-1.yml\n',
    });

    expect(refs).toEqual(['.github/workflows/branch-cleanup-wave-1.yml']);
  });

  it('still scans package and deployment config paths', () => {
    expect(REFERENCE_SEARCH_PATHS).toEqual(
      expect.arrayContaining(['package.json', 'railway.toml', 'vercel.json', 'netlify.toml'])
    );
  });
});

describe('branch cleanup wave 1 guardrails', () => {
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
});

describe('branch cleanup wave 1 workflow', () => {
  it('remains workflow_dispatch only', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    expect(workflow).toMatch(/^on:\s*\n\s+workflow_dispatch:/m);
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).not.toMatch(/^\s+pull_request:/m);
    expect(workflow).not.toMatch(/^\s+schedule:/m);
    expect(workflow).not.toMatch(/^\s+workflow_run:/m);
  });
});
