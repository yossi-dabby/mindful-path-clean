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
  resolveRemoteTagTargetSha,
  validateApprovedBranches,
} from '../../scripts/branch-cleanup-wave-7c-archive.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const SCRIPT_PATH = resolve(REPO_ROOT, 'scripts/branch-cleanup-wave-7c-archive.mjs');
const WORKFLOW_PATH = resolve(REPO_ROOT, '.github/workflows/branch-cleanup-wave-7c-archive.yml');
const APPROVED_LIST_PATH = resolve(REPO_ROOT, 'docs/branch-cleanup-wave-7c-approved-list.txt');
const AUDIT_PATH = resolve(REPO_ROOT, 'docs/remaining-branch-reduction-audit.md');

describe('branch cleanup wave 7c reference scanning', () => {
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
        '.github/workflows/branch-cleanup-wave-7c-archive.yml\n',
    });

    expect(refs).toEqual(['.github/workflows/branch-cleanup-wave-7c-archive.yml']);
  });

  it('still scans package and deployment config paths', () => {
    expect(REFERENCE_SEARCH_PATHS).toEqual(
      expect.arrayContaining(['package.json', 'railway.toml', 'vercel.json', 'netlify.toml'])
    );
  });
});

describe('branch cleanup wave 7c guardrails', () => {
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

  it('resolveRemoteTagTargetSha is exported as a function', () => {
    expect(typeof resolveRemoteTagTargetSha).toBe('function');
  });

  it('resolveRemoteTagTargetSha returns peeled commit SHA for annotated tags', () => {
    const commitSha = 'a03d796d9636f10b7839e7e8467dab5b7a231c14';
    const tagObjectSha = '413c358bf33eb0381bd8e66bf453ae090aad38ce';
    const tag = 'archive/branch-cleanup-wave-7c/20260610/copilot/fix-e2e-playwright-errors';

    const runFn = (cmd) => {
      if (cmd.includes(`"refs/tags/${tag}^{}"`)) {
        return `${commitSha}  refs/tags/${tag}^{}`;
      }
      if (cmd.includes(`"refs/tags/${tag}"`)) {
        return `${tagObjectSha}  refs/tags/${tag}`;
      }
      return null;
    };

    const result = resolveRemoteTagTargetSha(tag, { runFn });
    expect(result).toBe(commitSha);
    expect(result).not.toBe(tagObjectSha);
  });

  it('resolveRemoteTagTargetSha falls back to direct SHA for lightweight tags', () => {
    const commitSha = 'a03d796d9636f10b7839e7e8467dab5b7a231c14';
    const tag = 'archive/branch-cleanup-wave-7c/20260610/copilot/fix-e2e-playwright-errors';

    const runFn = (cmd) => {
      if (cmd.includes(`"refs/tags/${tag}^{}"`)) return null;
      if (cmd.includes(`"refs/tags/${tag}"`)) return `${commitSha}  refs/tags/${tag}`;
      return null;
    };

    expect(resolveRemoteTagTargetSha(tag, { runFn })).toBe(commitSha);
  });

  it('resolveRemoteTagTargetSha returns null when tag is not found on remote', () => {
    const tag = 'archive/branch-cleanup-wave-7c/20260610/copilot/nonexistent-branch';
    const result = resolveRemoteTagTargetSha(tag, { runFn: () => null });
    expect(result).toBeNull();
  });

  it('parses abandoned WIP branches from audit section 2c', () => {
    const auditMap = parseAuditAbandonedWipBranches(readFileSync(AUDIT_PATH, 'utf8'));

    expect(auditMap.has('copilot/fix-e2e-playwright-errors')).toBe(true);
    expect(auditMap.get('copilot/fix-e2e-playwright-errors')?.ageDays).toBeGreaterThan(90);
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

describe('branch cleanup wave 7c workflow', () => {
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

    expect(workflow).toContain('CONFIRM_ARCHIVE_AND_DELETE_ABANDONED_WIP_WAVE_7C');
    expect(workflow).not.toContain('CONFIRM_ARCHIVE_AND_DELETE_ABANDONED_WIP_WAVE_7A');
    expect(workflow).not.toContain('CONFIRM_ARCHIVE_AND_DELETE_ABANDONED_WIP_WAVE_7B');
  });

  it('configures git identity before creating archive tags', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    expect(workflow).toContain('Configure git identity for archive tags');
    expect(workflow).toContain('git config user.name "github-actions[bot]"');
    expect(workflow).toContain(
      'git config user.email "41898282+github-actions[bot]@users.noreply.github.com"'
    );
  });

  it('skips tag creation when archive tag already exists on remote (idempotent re-run)', () => {
    const script = readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toMatch(/remoteTagExists\(result\.archiveTag\)/);
    expect(script).toMatch(/skipping create\/push/);
  });
});

describe('branch cleanup wave 7c approved list', () => {
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

  it('does not include branches from wave 7b', () => {
    const wave7bBranches = [
      'copilot/enhance-e2e-chat-test',
      'copilot/enhance-send-button-locator',
      'copilot/fix-chat-send-button-flakiness',
      'copilot/fix-chat-send-button-selector',
      'copilot/fix-chat-smoke-test',
      'copilot/fix-chat-smoke-test-failures',
      'copilot/fix-chat-smoke-test-flake',
      'copilot/fix-chat-smoke-test-flakiness',
      'copilot/fix-chat-ui-send-button',
      'copilot/fix-e2e-playwright-chat-test',
      'copilot/improve-chat-message-test-robustness',
      'copilot/improve-chat-send-button-reliability',
      'copilot/improve-chat-smoke-test-reliability',
      'copilot/improve-chat-smoke-test-robustness',
      'copilot/improve-e2e-test-stability',
      'copilot/improve-error-handling-send-button',
      'copilot/improve-safe-click-helper',
      'copilot/increase-send-button-timeout',
      'copilot/increase-timeout-send-button',
      'copilot/robustify-handle-send-message',
      'copilot/update-chat-e2e-test-resilience',
      'copilot/update-e2e-reliability-tests',
      'copilot/update-playwright-config-again',
      'copilot/update-playwright-config-projects',
      'copilot/update-playwright-projects',
      'copilot/update-playwright-workflow',
      'copilot/add-advanced-diagnostics-send-button',
      'copilot/add-advanced-diagnostics-to-tests',
      'copilot/add-debugging-error-handling',
      'copilot/add-enhanced-diagnostics-e2e-chat',
      'copilot/add-error-handling-logging',
      'copilot/enhance-chat-diagnostics',
      'copilot/enhance-e2e-chat-diagnostics',
      'copilot/fix-chat-smoke-test-issues',
      'copilot/fix-e2e-smoke-test-errors',
      'copilot/fix-e2e-smoke-test-issue',
      'copilot/fix-e2e-test-flakiness',
      'copilot/fix-e2e-test-flakiness-again',
      'copilot/harden-fallback-logic',
      'copilot/improve-e2e-test-robustness',
      'copilot/reduce-test-flakiness-send-message',
      'copilot/stabilize-e2e-chat-test',
      'copilot/update-playwright-smoke-test',
      'copilot/add-playwright-e2e-tests-another-one',
      'copilot/update-chat-input-wait-function',
      'copilot/improve-e2e-test-resilience',
      'copilot/refactor-e2e-test-stability',
      'copilot/revise-e2e-tests-for-stability',
      'copilot/update-e2e-smoke-tests',
      'copilot/update-playwright-e2e-setup',
    ];

    const branches = readBranches();
    for (const wave7bBranch of wave7bBranches) {
      expect(branches).not.toContain(wave7bBranch);
    }
  });
});
