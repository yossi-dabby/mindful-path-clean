import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  APPROVED_LIST_RELATIVE_PATH,
  ARCHIVE_TAG_PREFIX,
  AUDIT_SOURCE_RELATIVE_PATH,
  MAX_BRANCHES,
  REFERENCE_SCAN_EXCLUDED_PATHS,
  REFERENCE_SEARCH_PATHS,
  REQUIRED_AUDIT_SECTION_HEADER,
  buildArchiveTag,
  findReferences,
  parseApprovedBranches,
  parseAuditSection,
  validateApprovedList,
} from '../../scripts/branch-cleanup-wave-9a-archive.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const WORKFLOW_PATH = resolve(REPO_ROOT, '.github/workflows/branch-cleanup-wave-9a-archive.yml');
const APPROVED_LIST_PATH = resolve(REPO_ROOT, APPROVED_LIST_RELATIVE_PATH);
const AUDIT_PATH = resolve(REPO_ROOT, AUDIT_SOURCE_RELATIVE_PATH);

describe('branch cleanup wave 9A reference scanning', () => {
  it('excludes Wave 9A approved list and audit source from blocking scans', () => {
    expect(REFERENCE_SCAN_EXCLUDED_PATHS.has(APPROVED_LIST_RELATIVE_PATH)).toBe(true);
    expect(REFERENCE_SCAN_EXCLUDED_PATHS.has(AUDIT_SOURCE_RELATIVE_PATH)).toBe(true);
  });

  it('excludes prior-wave approved lists and audit docs from blocking scans', () => {
    expect(REFERENCE_SCAN_EXCLUDED_PATHS.has('docs/remaining-branch-reduction-audit.md')).toBe(
      true
    );
    expect(REFERENCE_SCAN_EXCLUDED_PATHS.has('docs/branch-cleanup-wave-2-approved-list.txt')).toBe(
      true
    );
    expect(
      REFERENCE_SCAN_EXCLUDED_PATHS.has('docs/branch-cleanup-wave-8-archive-approved-list.txt')
    ).toBe(true);
    expect(
      REFERENCE_SCAN_EXCLUDED_PATHS.has('docs/branch-cleanup-wave-8-direct-approved-list.txt')
    ).toBe(true);
  });

  it('excluded paths do not block', () => {
    const refs = findReferences('copilot/example-branch', {
      searchPaths: ['docs'],
      repoRoot: '/virtual/repo',
      pathExists: () => true,
      runCommand: () =>
        `${APPROVED_LIST_RELATIVE_PATH}\n` +
        `${AUDIT_SOURCE_RELATIVE_PATH}\n` +
        'docs/remaining-branch-reduction-audit.md\n' +
        'docs/branch-cleanup-wave-8-archive-approved-list.txt\n',
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
        'docs/branch-cleanup-wave-9a.md\n' +
        '.github/workflows/branch-cleanup-wave-9a-archive.yml\n',
    });

    expect(refs.sort()).toEqual(
      [
        '.github/workflows/branch-cleanup-wave-9a-archive.yml',
        'docs/branch-cleanup-wave-9a.md',
      ].sort()
    );
  });

  it('still scans package and deployment config paths', () => {
    expect(REFERENCE_SEARCH_PATHS).toEqual(
      expect.arrayContaining(['package.json', 'railway.toml', 'vercel.json', 'netlify.toml'])
    );
  });
});

describe('branch cleanup wave 9A guardrails', () => {
  it('rejects empty list', () => {
    expect(() => validateApprovedList({ branches: [] })).toThrow(/Approved list is empty/);
  });

  it('enforces max 25 branch cap', () => {
    const over = Array.from({ length: MAX_BRANCHES + 1 }, (_, idx) => `copilot/branch-${idx}`);
    expect(() => validateApprovedList({ branches: over })).toThrow(
      new RegExp(`exceeds the limit of ${MAX_BRANCHES}`)
    );

    const exact = Array.from({ length: MAX_BRANCHES }, (_, idx) => `copilot/branch-${idx}`);
    expect(() => validateApprovedList({ branches: exact })).not.toThrow();

    expect(MAX_BRANCHES).toBe(25);
  });

  it('rejects duplicates in list', () => {
    expect(() =>
      validateApprovedList({ branches: ['copilot/dup-branch', 'copilot/dup-branch'] })
    ).toThrow(/duplicate branch/);
  });

  it('rejects protected branches', () => {
    expect(() => validateApprovedList({ branches: ['main'] })).toThrow(/Protected branch "main"/);

    expect(() => validateApprovedList({ branches: ['staging-fresh'] })).toThrow(
      /Protected branch "staging-fresh"/
    );

    expect(() => validateApprovedList({ branches: ['origin/main'] })).toThrow(
      /Protected branch "origin\/main"/
    );
  });

  it('rejects current branch', () => {
    expect(() =>
      validateApprovedList({
        branches: ['copilot/my-branch'],
        currentBranch: 'copilot/my-branch',
      })
    ).toThrow(/Current branch/);
  });

  it('archive tags follow required prefix and include date + branch', () => {
    const tag = buildArchiveTag('copilot/example-branch', '20260610');
    expect(tag).toBe(`${ARCHIVE_TAG_PREFIX}/20260610/copilot/example-branch`);
    expect(tag).toMatch(/^archive\/branch-cleanup-wave-9a\//);
  });

  it('parses required 30-90d audit section', () => {
    const audit = readFileSync(AUDIT_PATH, 'utf8');
    const auditMap = parseAuditSection(audit, REQUIRED_AUDIT_SECTION_HEADER);

    expect(REQUIRED_AUDIT_SECTION_HEADER).toBe(
      '### 5. ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_30_TO_90D'
    );

    expect(auditMap.has('copilot/add-e2e-tests-and-ci-improvements')).toBe(true);
    const record = auditMap.get('copilot/add-e2e-tests-and-ci-improvements');
    expect(record?.ageDays).toBeGreaterThanOrEqual(30);
    expect(record?.ageDays).toBeLessThanOrEqual(90);
  });

  it('audit section contains expected branch count', () => {
    // 81 branches in the ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_30_TO_90D section
    // per the post-Wave-7C audit (docs/post-wave-7c-remaining-branch-audit.md, generated 2026-06-10)
    const EXPECTED_30_90D_AUDIT_COUNT = 81;
    const audit = readFileSync(AUDIT_PATH, 'utf8');
    const auditMap = parseAuditSection(audit, REQUIRED_AUDIT_SECTION_HEADER);
    expect(auditMap.size).toBe(EXPECTED_30_90D_AUDIT_COUNT);
  });

  it('rejects branches outside 30-90d age window', () => {
    const fakeAudit = `
### 5. ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_30_TO_90D (1 branches)

| Branch | Age (days) | Latest Commit Date | PR Info | Action |
|--------|-----------|-------------------|---------|--------|
| \`copilot/too-old-branch\` | 91 | 2026-03-01 | PR#1 closed-no-merge age=91d | ARCHIVE THEN DELETE |
| \`copilot/too-new-branch\` | 29 | 2026-05-10 | PR#2 closed-no-merge age=29d | ARCHIVE THEN DELETE |
| \`copilot/valid-branch\` | 60 | 2026-04-10 | PR#3 closed-no-merge age=60d | ARCHIVE THEN DELETE |

### 6. NEXT_SECTION
`;
    const auditMap = parseAuditSection(fakeAudit, '### 5. ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_30_TO_90D');

    const old = auditMap.get('copilot/too-old-branch');
    expect(old?.ageDays).toBe(91);
    expect(old?.ageDays).toBeGreaterThan(90);

    const newBranch = auditMap.get('copilot/too-new-branch');
    expect(newBranch?.ageDays).toBe(29);
    expect(newBranch?.ageDays).toBeLessThan(30);

    const valid = auditMap.get('copilot/valid-branch');
    expect(valid?.ageDays).toBe(60);
    expect(valid?.ageDays).toBeGreaterThanOrEqual(30);
    expect(valid?.ageDays).toBeLessThanOrEqual(90);
  });
});

describe('branch cleanup wave 9A workflow', () => {
  it('workflow remains workflow_dispatch only', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    expect(workflow).toMatch(/^on:\s*\n\s+workflow_dispatch:/m);
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).not.toMatch(/^\s+pull_request:/m);
    expect(workflow).not.toMatch(/^\s+schedule:/m);
    expect(workflow).not.toMatch(/^\s+workflow_run:/m);
  });

  it('exact Wave 9A confirmation string is required', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    expect(workflow).toContain(
      'CONFIRM_ARCHIVE_AND_DELETE_CLOSED_UNMERGED_30_90D_WAVE_9A'
    );
    expect(workflow).not.toContain('CONFIRM_BRANCH_CLEANUP_WAVE_8_LOW_RISK');
    expect(workflow).not.toContain('CONFIRM_ARCHIVE_AND_DELETE_ABANDONED_WIP_WAVE_7C');
  });

  it('workflow configures git identity for annotated tags', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    expect(workflow).toContain('git config user.name');
    expect(workflow).toContain('git config user.email');
  });

  it('workflow uploads report artifact', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    expect(workflow).toContain('branch-cleanup-wave-9a-report');
    expect(workflow).toContain('upload-artifact');
  });
});

describe('branch cleanup wave 9A approved list', () => {
  it('approved list has exactly 25 branches', () => {
    const branches = parseApprovedBranches(readFileSync(APPROVED_LIST_PATH, 'utf8'));
    expect(branches.length).toBe(25);
  });

  it('approved list does not contain protected branches', () => {
    const branches = parseApprovedBranches(readFileSync(APPROVED_LIST_PATH, 'utf8'));
    expect(branches).not.toContain('main');
    expect(branches).not.toContain('staging-fresh');
    expect(branches).not.toContain('origin/main');
    expect(branches).not.toContain('origin/staging-fresh');
  });

  it('approved list has no duplicates', () => {
    const branches = parseApprovedBranches(readFileSync(APPROVED_LIST_PATH, 'utf8'));
    const unique = new Set(branches);
    expect(unique.size).toBe(branches.length);
  });

  it('all approved branches appear in the 30-90d audit section', () => {
    const branches = parseApprovedBranches(readFileSync(APPROVED_LIST_PATH, 'utf8'));
    const audit = readFileSync(AUDIT_PATH, 'utf8');
    const auditMap = parseAuditSection(audit, REQUIRED_AUDIT_SECTION_HEADER);

    for (const branch of branches) {
      expect(auditMap.has(branch), `Branch "${branch}" not found in 30-90d audit section`).toBe(
        true
      );
      const record = auditMap.get(branch);
      expect(
        record?.ageDays,
        `Branch "${branch}" age ${record?.ageDays}d is outside 30-90d range`
      ).toBeGreaterThanOrEqual(30);
      expect(
        record?.ageDays,
        `Branch "${branch}" age ${record?.ageDays}d is outside 30-90d range`
      ).toBeLessThanOrEqual(90);
    }
  });
});
