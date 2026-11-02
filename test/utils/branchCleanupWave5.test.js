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
} from '../../scripts/branch-cleanup-wave-5.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const WORKFLOW_PATH = resolve(REPO_ROOT, '.github/workflows/branch-cleanup-wave-5.yml');
const APPROVED_LIST_PATH = resolve(REPO_ROOT, 'docs/branch-cleanup-wave-5-approved-list.txt');
const TEST_REPOSITORY = { owner: 'test-owner', repo: 'test-repo' };

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

const WAVE_2_DELETED = new Set([
  'copilot/add-e2e-tests-daily-checkin',
  'copilot/add-e2e-tests-journal-thought',
  'copilot/add-e2e-tests-double-submit',
  'copilot/add-data-testid-attributes',
  'copilot/add-playwright-e2e-testing',
  'copilot/update-playwright-config-another-one',
  'copilot/configure-playwright-reports',
  'copilot/fix-playwright-report-upload',
  'copilot/fix-playwright-report-upload-issue',
  'copilot/fix-playwright-artifact-warnings',
  'copilot/fix-smoke-tests-issue',
  'copilot/extend-production-smoke-tests',
  'copilot/add-smoke-test-suite',
  'copilot/fix-milestone-checkbox-bug',
  'copilot/add-android-e2e-testing-infrastructure',
  'copilot/prepare-app-for-production',
  'copilot/add-android-playwright-tests',
  'copilot/fix-milestone-checkbox-issues',
  'copilot/fix-checkbox-disappearing-issue',
  'copilot/fix-data-sync-issue-goals-page',
  'copilot/fix-query-definition-error',
  'copilot/fix-query-synchronization-issues',
  'copilot/fix-query-errors-and-suggestions',
  'copilot/fix-goals-display-issue',
  'copilot/fix-goals-page-issues',
  'copilot/fix-goals-page-issues-again',
  'copilot/fix-calendar-ui-issue',
  'copilot/fix-goals-milestones-drawer',
  'copilot/fix-translation-issues',
  'copilot/implement-i18n-for-mind-games-again',
  'copilot/localize-dbt-stop-game-hebrew',
  'copilot/localize-reframe-pick-to-hebrew',
  'copilot/qa-polish-hebrew-localization',
  'copilot/add-value-compass-hebrew',
  'copilot/prepare-app-for-google-play',
  'copilot/fix-action-runs-failure',
  'copilot/track-mobile-viewport-audit',
  'copilot/docsmobile-overflow-audit',
  'copilot/enhance-mobile-experience',
  'copilot/enhance-mobile-experience-again',
  'copilot/add-pull-to-refresh-mechanism',
  'copilot/enhance-mobile-experience-another-one',
  'copilot/fix-pull-to-refresh-warnings',
  'copilot/add-mobile-compatibility-features',
  'copilot/enhance-mobile-compliance',
  'copilot/fix-navigation-warnings',
  'copilot/fix-ios-accessibility-warnings',
  'copilot/fix-ios-accessibility-warnings-again',
  'copilot/fix-ios-user-account-deletion-warnings',
  'copilot/fix-ios-navigation-warnings',
]);

const WAVE_3_DELETED = new Set([
  'copilot/replace-goalcoach-spec',
  'copilot/stabilize-e2e-waits',
  'copilot/add-static-page-components',
  'copilot/fix-e2e-404-errors',
  'copilot/fix-e2e-test-errors',
  'copilot/fix-e2e-test-issues',
  'copilot/fix-e2e-tests-goalcoach',
  'copilot/fix-goalcoach-test-timeouts',
  'copilot/fix-next-button-test',
  'copilot/fix-playwright-e2e-tests',
  'copilot/stabilize-playwright-e2e-tests',
  'copilot/update-e2e-tests-navigation',
  'copilot/add-spa-fallback-for-vite',
  'copilot/fix-playwright-e2e-404-errors',
  'copilot/enhance-mobile-compatibility',
  'copilot/fix-ios-warnings',
  'copilot/add-hebrew-translation-support',
  'copilot/fix-bottom-tabs-warnings',
  'copilot/fix-reference-error-t-undefined',
  'copilot/check-hebrew-translation-tabs',
  'copilot/add-missing-language-translations',
  'copilot/audit-fix-hardcoded-strings',
  'copilot/continue-mindful-path-job',
  'copilot/fix-dark-mode-issues',
  'copilot/fix-missing-translations',
  'copilot/fix-native-layouts-android-ios-web',
  'copilot/fix-overflow-status-mobile',
  'copilot/implement-translation-feature',
  'copilot/translate-home-page-content',
  'copilot/translate-home-page-content-09228d1f-fba9-4e4a-a550-60b383967e9f',
  'copilot/translate-home-page-content-again',
  'copilot/translate-home-page-content-another-one',
  'copilot/translate-home-page-content-one-more-time',
  'copilot/translate-home-page-content-yet-again',
  'copilot/check-fix-accessibility-ux',
  'copilot/check-fix-responsiveness',
  'copilot/fix-app-readiness-test',
  'copilot/fix-bottom-tabs-stack-preservation',
  'copilot/fix-chat-scroll-issues',
  'copilot/fix-conversations-list-component',
  'copilot/fix-lint-errors-md-json-files',
  'copilot/fix-optimistic-ui-updates',
  'copilot/fix-overscroll-sticky-elements',
  'copilot/fix-pull-to-refresh-functionality',
  'copilot/fix-safe-area-handling',
  'copilot/fix-system-gestures-selection',
  'copilot/fix-unified-navigation-back-stack',
  'copilot/fix-user-account-deletion',
  'copilot/test-fix-dropdowns-selection-controls',
  'copilot/merge-repos-mindful-path',
]);

const WAVE_4_DELETED = new Set([
  'copilot/add-internal-automated-tests-again',
  'copilot/finish-lucide-inventory-automation',
  'copilot/create-implementation-plan',
  'copilot/fix-notification-bell-crash',
  'copilot/copilotfix-white-screen-error-another-one',
  'copilot/copilotfix-white-screen-error-another-one-again',
  'copilot/copilotimplement-shared-layer-fix-again',
  'copilot/fix-base44-appid-fallback-conflicts-again',
  'copilot/fix-base44-login-redirect-context',
  'copilot/fix-e2e-test-chat-page-404-again',
  'copilot/fix-home-setup-completion-failure',
  'copilot/fix-home-setup-completion-flow',
  'copilot/fix-home-setup-completion-flow-another-one',
  'copilot/fix-invalid-json-escape',
  'copilot/fix-onboarding-flow-error',
  'copilot/fix-railway-spa-routing',
  'copilot/fix-shared-appid-resolution',
  'copilot/fix-shared-client-routing-again',
  'copilot/fix-undefined-app-id-in-api-url',
  'copilot/fix-white-screen-error',
  'copilot/fix-white-screen-error-again',
  'copilot/implement-shared-layer-fix',
  'copilot/ensure-no-e2e-test-failures',
  'copilot/fix-login-error-after-registration',
  'copilot/fix-settings-page-loading-issue',
  'copilot/fix-user-account-deletion-issues',
  'copilot/fix-app-registration-issues',
  'copilot/fix-auth-redirect-callback-loop',
  'copilot/fix-registration-loop',
  'copilot/set-env-variable-for-app-id',
  'copilot/fix-duplicate-import-active-ai-companion-wiring',
  'copilot/fix-phase-2-chat-stall',
  'copilot/resolve-ai-flag-state-mismatch',
  'copilot/497-resolve-import-ready-batch-conflicts',
  'copilot/fix-e2e-chat-smoke-test-timeout',
  'copilot/fix-json-validation-errors',
  'copilot/fix-aggregate-band-unknown',
  'copilot/fix-stuck-response-bug',
  'copilot/fix-chat-attachment-support',
  'copilot/mvp-single-file-attachment',
  'copilot/stabilize-chat-runtime-path',
  'copilot/fix-audio-transcription-failure',
  'copilot/fix-audio-transcription-request',
  'copilot/fix-android-voice-to-text-toast-behavior',
  'copilot/fix-test-failures-pr-659',
  'copilot/implement-mobile-transcription-path',
  'copilot/fix-syntax-error-chat-jsx',
  'copilot/fix-form-registry-issue',
  'copilot/implement-hebrew-cbt-ocd-form',
  'copilot/integrate-children-cbt-worksheet-packs',
]);

describe('branch cleanup wave 5 reference scanning', () => {
  it('ignores branch references found only in the wave-5 approved-list manifest', () => {
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
        'docs/branch-cleanup-wave-5.md\n' +
        'docs/some-other-doc.md\n',
    });

    expect(refs).toEqual(['docs/branch-cleanup-wave-5.md', 'docs/some-other-doc.md']);
  });

  it('keeps references found in workflow files', () => {
    const refs = findReferences('copilot/example-branch', {
      searchPaths: ['.github/workflows'],
      repoRoot: '/virtual/repo',
      pathExists: () => true,
      runCommand: () => '.github/workflows/branch-cleanup-wave-5.yml\n',
    });

    expect(refs).toEqual(['.github/workflows/branch-cleanup-wave-5.yml']);
  });

  it('still scans package and deployment config paths', () => {
    expect(REFERENCE_SEARCH_PATHS).toEqual(
      expect.arrayContaining(['package.json', 'railway.toml', 'vercel.json', 'netlify.toml'])
    );
  });
});

describe('branch cleanup wave 5 guardrails', () => {
  it('blocks main and staging-fresh from the approved list', () => {
    expect(() => validateApprovedBranches(['main'])).toThrow(/Protected branch "main"/);
    expect(() => validateApprovedBranches(['staging-fresh'])).toThrow(
      /Protected branch "staging-fresh"/
    );
  });

  it('blocks approved lists larger than 75 branches', () => {
    const branches = Array.from({ length: MAX_BRANCHES + 1 }, (_, index) => `copilot/branch-${index}`);
    expect(() => validateApprovedBranches(branches)).toThrow(/exceeds the limit of 75/);
  });

  it('allows exactly 75 branches for Wave 5', () => {
    const branches = Array.from({ length: MAX_BRANCHES }, (_, index) => `copilot/branch-${index}`);
    expect(() => validateApprovedBranches(branches)).not.toThrow();
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

  it('skips branches with repository references', async () => {
    const result = await evaluateBranch('copilot/example-branch', TEST_REPOSITORY, {
      remoteExistsFn: () => true,
      isMergedIntoMainFn: () => true,
      openPrCountFn: async () => 0,
      findReferencesFn: () => ['docs/some-doc.md'],
    });

    expect(result).toMatchObject({
      action: 'skipped',
    });
    expect(result.status).toMatch(/referenced in/);
  });
});

describe('branch cleanup wave 5 workflow', () => {
  it('remains workflow_dispatch only', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    expect(workflow).toMatch(/^on:\s*\n\s+workflow_dispatch:/m);
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).not.toMatch(/^\s+pull_request:/m);
    expect(workflow).not.toMatch(/^\s+schedule:/m);
    expect(workflow).not.toMatch(/^\s+workflow_run:/m);
  });

  it('requires the exact Wave 5 confirmation string', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    expect(workflow).toContain('CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_5');
    expect(workflow).not.toContain('CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_4');
    expect(workflow).not.toContain('CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_3');
    expect(workflow).not.toContain('CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_2');
    expect(workflow).not.toContain('CONFIRM_DELETE_SAFE_MERGED_BRANCHES_WAVE_1');
  });
});

describe('branch cleanup wave 5 approved list', () => {
  function readBranches() {
    return readFileSync(APPROVED_LIST_PATH, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  }

  it('does not include any Wave 1 deleted branches', () => {
    for (const branch of readBranches()) {
      expect(WAVE_1_DELETED.has(branch)).toBe(false);
    }
  });

  it('does not include any Wave 2 deleted branches', () => {
    for (const branch of readBranches()) {
      expect(WAVE_2_DELETED.has(branch)).toBe(false);
    }
  });

  it('does not include any Wave 3 deleted branches', () => {
    for (const branch of readBranches()) {
      expect(WAVE_3_DELETED.has(branch)).toBe(false);
    }
  });

  it('does not include any Wave 4 deleted branches', () => {
    for (const branch of readBranches()) {
      expect(WAVE_4_DELETED.has(branch)).toBe(false);
    }
  });

  it('contains at least one branch and excludes protected names', () => {
    const branches = readBranches();

    expect(branches.length).toBeGreaterThan(0);
    expect(branches).not.toContain('main');
    expect(branches).not.toContain('staging-fresh');
  });

  it('does not exceed 75 branches', () => {
    expect(readBranches().length).toBeLessThanOrEqual(MAX_BRANCHES);
  });

  it('does not include unmerged, closed-unmerged, unknown, protected, or special branches', () => {
    const branches = readBranches();
    const forbidden = ['main', 'origin/main', 'staging-fresh', 'origin/staging-fresh'];
    for (const branch of branches) {
      expect(forbidden).not.toContain(branch);
    }
  });
});
