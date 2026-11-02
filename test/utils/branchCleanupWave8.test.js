import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ARCHIVE_APPROVED_LIST_RELATIVE_PATH,
  ARCHIVE_TAG_PREFIX,
  DIRECT_APPROVED_LIST_RELATIVE_PATH,
  MAX_ARCHIVE_BRANCHES,
  MAX_DIRECT_BRANCHES,
  MAX_TOTAL_BRANCHES,
  REFERENCE_SCAN_EXCLUDED_PATHS,
  REFERENCE_SEARCH_PATHS,
  REQUIRED_ARCHIVE_AUDIT_HEADER,
  REQUIRED_DIRECT_AUDIT_HEADER,
  buildArchiveTag,
  findReferences,
  parseApprovedBranches,
  parseAuditClassifications,
  validateApprovedLists,
} from '../../scripts/branch-cleanup-wave-8.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const WORKFLOW_PATH = resolve(REPO_ROOT, '.github/workflows/branch-cleanup-wave-8.yml');
const DIRECT_LIST_PATH = resolve(REPO_ROOT, DIRECT_APPROVED_LIST_RELATIVE_PATH);
const ARCHIVE_LIST_PATH = resolve(REPO_ROOT, ARCHIVE_APPROVED_LIST_RELATIVE_PATH);
const AUDIT_PATH = resolve(REPO_ROOT, 'docs/post-wave-7c-remaining-branch-audit.md');

describe('branch cleanup wave 8 reference scanning', () => {
  it('excludes Wave 8 branch-audit inventory docs from blocking scans', () => {
    expect([...REFERENCE_SCAN_EXCLUDED_PATHS].sort()).toEqual(
      [
        DIRECT_APPROVED_LIST_RELATIVE_PATH,
        ARCHIVE_APPROVED_LIST_RELATIVE_PATH,
        'docs/post-wave-7c-remaining-branch-audit.md',
        'docs/remaining-branch-reduction-audit.md',
        'docs/branch-cleanup-wave-2-approved-list.txt',
        'docs/branch-cleanup-wave-4-approved-list.txt',
        'docs/branch-cleanup-wave-5-approved-list.txt',
        'docs/branch-cleanup-wave-7b-approved-list.txt',
        'docs/staging-audit-report.md',
        'docs/production-readiness-audit-2026-03-24.md',
        'docs/phase3-audit-report.md',
        'docs/therapeutic-quality-audit.md',
        'docs/ai-capability-rollout-phase1.md',
        'docs/root-cause-audit-production-upgrades.md',
        'docs/trusted-cbt-import-rollout.md',
      ].sort()
    );
  });

  it('excluded branch-audit doc references do not block', () => {
    const refs = findReferences('copilot/example-branch', {
      searchPaths: ['docs'],
      repoRoot: '/virtual/repo',
      pathExists: () => true,
      runCommand: () =>
        `${DIRECT_APPROVED_LIST_RELATIVE_PATH}\n` +
        `${ARCHIVE_APPROVED_LIST_RELATIVE_PATH}\n` +
        'docs/post-wave-7c-remaining-branch-audit.md\n' +
        'docs/remaining-branch-reduction-audit.md\n' +
        'docs/staging-audit-report.md\n',
    });

    expect(refs).toEqual([]);
  });

  it('other docs/workflow references block', () => {
    const refs = findReferences('copilot/example-branch', {
      searchPaths: ['docs', '.github/workflows'],
      repoRoot: '/virtual/repo',
      pathExists: () => true,
      runCommand: () =>
        `${DIRECT_APPROVED_LIST_RELATIVE_PATH}\n` +
        `${ARCHIVE_APPROVED_LIST_RELATIVE_PATH}\n` +
        'docs/branch-cleanup-wave-8.md\n' +
        '.github/workflows/branch-cleanup-wave-8.yml\n',
    });

    expect(refs.sort()).toEqual(
      ['.github/workflows/branch-cleanup-wave-8.yml', 'docs/branch-cleanup-wave-8.md'].sort()
    );
  });

  it('still scans package and deployment config paths', () => {
    expect(REFERENCE_SEARCH_PATHS).toEqual(
      expect.arrayContaining(['package.json', 'railway.toml', 'vercel.json', 'netlify.toml'])
    );
  });
});

describe('branch cleanup wave 8 guardrails', () => {
  it('rejects when both lists are empty', () => {
    expect(() =>
      validateApprovedLists({
        directBranches: [],
        archiveBranches: [],
      })
    ).toThrow(/Both approved lists are empty/);
  });

  it('enforces direct/archive/total caps', () => {
    const directOver = Array.from({ length: MAX_DIRECT_BRANCHES + 1 }, (_, idx) => `copilot/direct-${idx}`);
    expect(() =>
      validateApprovedLists({
        directBranches: directOver,
        archiveBranches: [],
      })
    ).toThrow(new RegExp(`exceeds the limit of ${MAX_DIRECT_BRANCHES}`));

    const archiveOver = Array.from(
      { length: MAX_ARCHIVE_BRANCHES + 1 },
      (_, idx) => `copilot/archive-${idx}`
    );
    expect(() =>
      validateApprovedLists({
        directBranches: [],
        archiveBranches: archiveOver,
      })
    ).toThrow(new RegExp(`exceeds the limit of ${MAX_ARCHIVE_BRANCHES}`));

    const directMax = Array.from({ length: MAX_DIRECT_BRANCHES }, (_, idx) => `copilot/direct-${idx}`);
    const archiveMax = Array.from(
      { length: MAX_ARCHIVE_BRANCHES },
      (_, idx) => `copilot/archive-${idx}`
    );
    expect(() =>
      validateApprovedLists({
        directBranches: directMax,
        archiveBranches: archiveMax,
      })
    ).not.toThrow();

    expect(MAX_DIRECT_BRANCHES + MAX_ARCHIVE_BRANCHES).toBe(MAX_TOTAL_BRANCHES);
  });

  it('rejects duplicates across lists and protected branches', () => {
    expect(() =>
      validateApprovedLists({
        directBranches: ['copilot/dup-branch'],
        archiveBranches: ['copilot/dup-branch'],
      })
    ).toThrow(/appears in both direct and archive approved lists/);

    expect(() =>
      validateApprovedLists({
        directBranches: ['main'],
        archiveBranches: [],
      })
    ).toThrow(/Protected branch "main"/);
  });

  it('archive tags follow required prefix and include date + branch', () => {
    const tag = buildArchiveTag('copilot/example-branch', '20260610');
    expect(tag).toBe(`${ARCHIVE_TAG_PREFIX}/20260610/copilot/example-branch`);
  });

  it('parses required direct and archive audit sections', () => {
    const audit = readFileSync(AUDIT_PATH, 'utf8');
    const { directMap, archiveMap } = parseAuditClassifications(audit);

    expect(REQUIRED_DIRECT_AUDIT_HEADER).toBe('### 3. DIRECT_DELETE_SAFE_MERGED');
    expect(REQUIRED_ARCHIVE_AUDIT_HEADER).toBe(
      '### 4. ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_OLDER_THAN_90D'
    );

    expect(directMap.has('copilot/update-playwright-config')).toBe(true);
    expect(archiveMap.has('copilot/audit-vitest-configuration')).toBe(true);
    expect(archiveMap.get('copilot/audit-vitest-configuration')?.ageDays).toBeGreaterThan(90);
  });
});

describe('branch cleanup wave 8 workflow', () => {
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

    expect(workflow).toContain('CONFIRM_BRANCH_CLEANUP_WAVE_8_LOW_RISK');
    expect(workflow).not.toContain('CONFIRM_ARCHIVE_AND_DELETE_ABANDONED_WIP_WAVE_7C');
    expect(workflow).not.toContain('CONFIRM_DELETE_DIRECT_SAFE_BRANCHES_WAVE_6');
  });
});

describe('branch cleanup wave 8 approved lists', () => {
  function readList(path) {
    return parseApprovedBranches(readFileSync(path, 'utf8'));
  }

  it('direct list has exactly 15 branches', () => {
    const branches = readList(DIRECT_LIST_PATH);
    expect(branches.length).toBe(15);
    expect(branches).not.toContain('main');
    expect(branches).not.toContain('staging-fresh');
  });

  it('archive list has exactly 40 branches', () => {
    const branches = readList(ARCHIVE_LIST_PATH);
    expect(branches.length).toBe(40);
    expect(branches).not.toContain('main');
    expect(branches).not.toContain('staging-fresh');
  });

  it('lists have no cross-duplicates', () => {
    const direct = new Set(readList(DIRECT_LIST_PATH));
    const archive = readList(ARCHIVE_LIST_PATH);
    for (const branch of archive) {
      expect(direct.has(branch)).toBe(false);
    }
  });
});
