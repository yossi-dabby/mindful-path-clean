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
  evaluateBranch,
  findReferences,
  parseAuditAbandonedWipBranches,
  validateApprovedBranches,
} from '../../scripts/branch-cleanup-wave-7b-archive.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const WORKFLOW_PATH = resolve(REPO_ROOT, '.github/workflows/branch-cleanup-wave-7b-archive.yml');
const APPROVED_LIST_PATH = resolve(REPO_ROOT, 'docs/branch-cleanup-wave-7b-approved-list.txt');
const AUDIT_PATH = resolve(REPO_ROOT, 'docs/remaining-branch-reduction-audit.md');

describe('branch cleanup wave 7b reference scanning', () => {
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
        '.github/workflows/branch-cleanup-wave-7b-archive.yml\n',
    });

    expect(refs).toEqual(['.github/workflows/branch-cleanup-wave-7b-archive.yml']);
  });

  it('still scans package and deployment config paths', () => {
    expect(REFERENCE_SEARCH_PATHS).toEqual(
      expect.arrayContaining(['package.json', 'railway.toml', 'vercel.json', 'netlify.toml'])
    );
  });
});

describe('branch cleanup wave 7b guardrails', () => {
  it('empty approved list is rejected', () => {
    expect(() => validateApprovedBranches([])).toThrow(/Approved list is empty/);
  });

  it('more than 50 branches is rejected', () => {
    const branches = Array.from({ length: MAX_BRANCHES + 1 }, (_, index) => `copilot/branch-${index}`);
    expect(() => validateApprovedBranches(branches)).toThrow(/exceeds the limit of 50/);
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

    expect(auditMap.has('copilot/fix-chat-smoke-test-flakiness')).toBe(true);
    expect(auditMap.get('copilot/fix-chat-smoke-test-flakiness')?.ageDays).toBeGreaterThan(90);
    expect(auditMap.has('copilot/add-accessibility-tests-community-page')).toBe(false);
  });

  it('retries transient open PR API failures before succeeding', async () => {
    const branch = 'copilot/retryable-open-pr-check';
    const sleepCalls = [];
    const context = {
      owner: 'yossi-dabby',
      repo: 'mindful-path',
      currentBranch: '',
      abandonedAuditMap: new Map([
        [
          branch,
          {
            branch,
            ageDays: 120,
            lastCommitDate: '2025-01-01',
            pr: 'no',
            closedDate: '2025-01-02',
          },
        ],
      ]),
    };

    let attempts = 0;
    const row = await evaluateBranch(branch, context, {
      remoteExistsFn: () => true,
      openPrCountFn: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error(
            'GitHub API error checking open PRs for branch "copilot/retryable-open-pr-check": 500 Internal Server Error'
          );
        }
        return 0;
      },
      findReferencesFn: () => [],
      sleepFn: async (ms) => {
        sleepCalls.push(ms);
      },
    });

    expect(attempts).toBe(2);
    expect(sleepCalls).toEqual([1000]);
    expect(row.status).toBe('READY');
  });

  it('does not retry non-transient open PR API failures', async () => {
    const branch = 'copilot/non-retryable-open-pr-check';
    const context = {
      owner: 'yossi-dabby',
      repo: 'mindful-path',
      currentBranch: '',
      abandonedAuditMap: new Map([
        [
          branch,
          {
            branch,
            ageDays: 120,
            lastCommitDate: '2025-01-01',
            pr: 'no',
            closedDate: '2025-01-02',
          },
        ],
      ]),
    };

    let attempts = 0;
    await expect(
      evaluateBranch(branch, context, {
        remoteExistsFn: () => true,
        openPrCountFn: async () => {
          attempts += 1;
          throw new Error(
            'GitHub API error checking open PRs for branch "copilot/non-retryable-open-pr-check": 404 Not Found'
          );
        },
        findReferencesFn: () => [],
        sleepFn: async () => {},
      })
    ).rejects.toThrow(/404 Not Found/);

    expect(attempts).toBe(1);
  });

  it('retries only up to configured max attempts for transient errors', async () => {
    const branch = 'copilot/retry-budget-open-pr-check';
    const sleepCalls = [];
    const context = {
      owner: 'yossi-dabby',
      repo: 'mindful-path',
      currentBranch: '',
      abandonedAuditMap: new Map([
        [
          branch,
          {
            branch,
            ageDays: 120,
            lastCommitDate: '2025-01-01',
            pr: 'no',
            closedDate: '2025-01-02',
          },
        ],
      ]),
    };

    let attempts = 0;
    await expect(
      evaluateBranch(branch, context, {
        remoteExistsFn: () => true,
        openPrCountFn: async () => {
          attempts += 1;
          throw new Error(
            'GitHub API error checking open PRs for branch "copilot/retry-budget-open-pr-check": 500 Internal Server Error'
          );
        },
        findReferencesFn: () => [],
        openPrMaxAttempts: 2,
        openPrRetryDelayMs: 25,
        sleepFn: async (ms) => {
          sleepCalls.push(ms);
        },
      })
    ).rejects.toThrow(/500 Internal Server Error/);

    expect(attempts).toBe(2);
    expect(sleepCalls).toEqual([25]);
  });
});

describe('branch cleanup wave 7b workflow', () => {
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

    expect(workflow).toContain('CONFIRM_ARCHIVE_AND_DELETE_ABANDONED_WIP_WAVE_7B');
    expect(workflow).not.toContain('CONFIRM_ARCHIVE_AND_DELETE_ABANDONED_WIP_WAVE_7A');
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

describe('branch cleanup wave 7b approved list', () => {
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

  it('does not include branches from wave 7a', () => {
    const wave7aBranches = [
      'copilot/fix-e2e-tests-playwright',
      'copilot/fix-playwright-e2e-tests-again',
      'copilot/improve-e2e-tests-robustness',
      'copilot/fix-404-errors-e2e-tests',
      'copilot/fix-e2e-job-404-errors',
      'copilot/fix-spa-fallback-routes',
      'copilot/fix-e2e-test-goalcoach',
      'copilot/fix-next-button-enable-issue',
      'copilot/add-console-error-logging',
      'copilot/add-debugging-step-to-ci',
      'copilot/add-debugging-step-to-workflow',
      'copilot/add-debugging-steps-to-playwright-workflow',
      'copilot/add-deep-diagnostics-chat-e2e',
      'copilot/add-deep-diagnostics-web-chat',
      'copilot/add-deep-diagnostics-web-chat-e2e',
      'copilot/fix-e2e-playwright-tests',
      'copilot/fix-playwright-ci-test-structure',
      'copilot/fix-playwright-e2e-tests-another-one',
      'copilot/fix-syntax-error-in-ui-tests',
      'copilot/fix-syntax-error-in-ui-tests-again',
      'copilot/move-tests-to-top-level-directory',
      'copilot/patch-chat-page-improvements',
      'copilot/patch-e2e-smoke-tests',
      'copilot/remove-invalid-code-block',
      'copilot/restore-missing-e2e-tests',
    ];

    const branches = readBranches();
    for (const wave7aBranch of wave7aBranches) {
      expect(branches).not.toContain(wave7aBranch);
    }
  });
});
