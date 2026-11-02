/**
 * Branch Cleanup Wave 9C (Archive Tag + Delete)
 *
 * Safely archives and deletes only explicitly approved closed-unmerged Copilot branches
 * aged 30–90 days (medium-risk bucket, final batch of Wave 9 splits).
 *
 * Safety rules (all must pass before any branch deletion):
 *   - Approved list must be non-empty and must not exceed 25 entries
 *   - Branch must not be protected/special, current branch, or dangerous
 *   - Branch must exist on origin and have no open PRs
 *   - Branch must be classified as ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_30_TO_90D in audit
 *   - Branch age must satisfy: 30 ≤ ageDays ≤ 90
 *   - Branch must not have been processed in Wave 9A or Wave 9B
 *   - Branch must have no blocking references in workflows/docs/README/package/deploy config
 *     (excluding docs/branch-cleanup-wave-9c-approved-list.txt and the audit source)
 *   - For each branch: resolve tip SHA -> create annotated archive tag -> push tag ->
 *     verify remote tag -> verify tag points to exact original SHA ->
 *     re-verify branch SHA has not changed -> delete branch
 *   - Process one branch at a time; stop immediately on any tag verification failure
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

export const APPROVED_LIST_RELATIVE_PATH = 'docs/branch-cleanup-wave-9c-approved-list.txt';
export const AUDIT_SOURCE_RELATIVE_PATH = 'docs/post-wave-7c-remaining-branch-audit.md';
const WAVE_9A_APPROVED_LIST_RELATIVE_PATH = 'docs/branch-cleanup-wave-9a-approved-list.txt';
const WAVE_9B_APPROVED_LIST_RELATIVE_PATH = 'docs/branch-cleanup-wave-9b-approved-list.txt';
const APPROVED_LIST_PATH = resolve(REPO_ROOT, APPROVED_LIST_RELATIVE_PATH);
const AUDIT_SOURCE_PATH = resolve(REPO_ROOT, AUDIT_SOURCE_RELATIVE_PATH);
const WAVE_9A_APPROVED_LIST_PATH = resolve(REPO_ROOT, WAVE_9A_APPROVED_LIST_RELATIVE_PATH);
const WAVE_9B_APPROVED_LIST_PATH = resolve(REPO_ROOT, WAVE_9B_APPROVED_LIST_RELATIVE_PATH);
const REPORT_PATH = resolve(REPO_ROOT, 'branch-cleanup-wave-9c-report.md');

export const MAX_BRANCHES = 25;
export const ARCHIVE_TAG_PREFIX = 'archive/branch-cleanup-wave-9c';
export const REQUIRED_AUDIT_SECTION_HEADER =
  '### 5. ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_30_TO_90D';

const OPEN_PR_CHECK_MAX_ATTEMPTS = 3;
const OPEN_PR_CHECK_RETRY_DELAY_MS = 1000;
const RETRYABLE_OPEN_PR_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const PROTECTED_BRANCHES = new Set(['main', 'origin/main', 'staging-fresh', 'origin/staging-fresh']);
const SPECIAL_BRANCH_PREFIXES = ['release/', 'hotfix/'];

export const REFERENCE_SEARCH_PATHS = [
  '.github/workflows',
  'docs',
  'README.md',
  'README',
  'package.json',
  'railway.toml',
  'vercel.json',
  'netlify.toml',
];

export const REFERENCE_SCAN_EXCLUDED_PATHS = new Set([
  APPROVED_LIST_RELATIVE_PATH,
  AUDIT_SOURCE_RELATIVE_PATH,
  WAVE_9A_APPROVED_LIST_RELATIVE_PATH,
  WAVE_9B_APPROVED_LIST_RELATIVE_PATH,
  'docs/remaining-branch-reduction-audit.md',
  'docs/branch-cleanup-wave-2-approved-list.txt',
  'docs/branch-cleanup-wave-4-approved-list.txt',
  'docs/branch-cleanup-wave-5-approved-list.txt',
  'docs/branch-cleanup-wave-7b-approved-list.txt',
  'docs/branch-cleanup-wave-8-direct-approved-list.txt',
  'docs/branch-cleanup-wave-8-archive-approved-list.txt',
  'docs/staging-audit-report.md',
  'docs/production-readiness-audit-2026-03-24.md',
  'docs/phase3-audit-report.md',
  'docs/therapeutic-quality-audit.md',
  'docs/ai-capability-rollout-phase1.md',
  'docs/root-cause-audit-production-upgrades.md',
  'docs/trusted-cbt-import-rollout.md',
]);

function run(command, { throws = false } = {}) {
  try {
    return execSync(command, { encoding: 'utf8', cwd: REPO_ROOT }).trim();
  } catch (error) {
    if (throws) throw error;
    return null;
  }
}

function splitLines(value) {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseApprovedBranches(rawContent) {
  return splitLines(rawContent).filter((line) => !line.startsWith('#'));
}

function hasDangerousChars(name) {
  return /[^a-zA-Z0-9\-_/.]/u.test(name);
}

function isSpecialProtectedBranch(name) {
  return SPECIAL_BRANCH_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function validateApprovedList({
  branches,
  currentBranch = '',
  wave9aBranches = new Set(),
  wave9bBranches = new Set(),
}) {
  if (branches.length === 0) {
    throw new Error(
      'Approved list is empty. Add at least one Wave 9C branch before running cleanup.'
    );
  }

  if (branches.length > MAX_BRANCHES) {
    throw new Error(
      `Approved list contains ${branches.length} branches, which exceeds the limit of ${MAX_BRANCHES}.`
    );
  }

  const seen = new Set();
  for (const branch of branches) {
    if (seen.has(branch)) {
      throw new Error(`Approved list contains duplicate branch: "${branch}".`);
    }
    seen.add(branch);
  }

  for (const branch of branches) {
    if (!branch) {
      throw new Error('Approved list contains an empty branch name.');
    }

    if (PROTECTED_BRANCHES.has(branch)) {
      throw new Error(`Protected branch "${branch}" found in approved list.`);
    }

    if (isSpecialProtectedBranch(branch)) {
      throw new Error(`Special/protected branch "${branch}" found in approved list.`);
    }

    if (hasDangerousChars(branch)) {
      throw new Error(`Branch name "${branch}" contains disallowed characters.`);
    }

    if (currentBranch && branch === currentBranch) {
      throw new Error(`Current branch "${currentBranch}" is in the approved list.`);
    }

    if (wave9aBranches.size > 0 && wave9aBranches.has(branch)) {
      throw new Error(`Branch "${branch}" was already processed in Wave 9A.`);
    }

    if (wave9bBranches.size > 0 && wave9bBranches.has(branch)) {
      throw new Error(`Branch "${branch}" was already processed in Wave 9B.`);
    }
  }
}

function filterReferenceHits(hits, { excludedPaths = REFERENCE_SCAN_EXCLUDED_PATHS } = {}) {
  return [...new Set(splitLines(hits).filter((hit) => !excludedPaths.has(hit)))];
}

export function findReferences(
  branch,
  {
    searchPaths = REFERENCE_SEARCH_PATHS,
    repoRoot = REPO_ROOT,
    pathExists = existsSync,
    runCommand = run,
    excludedPaths = REFERENCE_SCAN_EXCLUDED_PATHS,
  } = {}
) {
  const hits = [];
  for (const searchPath of searchPaths) {
    const fullPath = resolve(repoRoot, searchPath);
    if (!pathExists(fullPath)) continue;
    const result = runCommand(
      `git grep -rl --fixed-strings "${branch}" -- "${fullPath}" 2>/dev/null || true`
    );
    if (result) {
      hits.push(...filterReferenceHits(result, { excludedPaths }));
    }
  }
  return [...new Set(hits)];
}

export function parseAuditSection(auditContent, sectionHeader) {
  const lines = auditContent.split('\n');
  const records = new Map();
  let inSection = false;

  for (const line of lines) {
    if (!inSection && line.trim().startsWith(sectionHeader)) {
      inSection = true;
      continue;
    }

    if (!inSection) continue;

    if (line.startsWith('### ') && line.trim() !== sectionHeader) {
      break;
    }

    if (!line.startsWith('| `')) continue;

    const match = line.match(
      /^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/u
    );
    if (!match) continue;

    const [, branch, ageDaysStr, commitDate, prInfo, action] = match;
    records.set(branch, {
      branch,
      ageDays: Number(ageDaysStr),
      commitDate: commitDate.trim(),
      prInfo: prInfo.trim(),
      action: action.trim(),
    });
  }

  if (records.size === 0) {
    throw new Error(
      `Could not parse audit section "${sectionHeader}" from ${AUDIT_SOURCE_RELATIVE_PATH}.`
    );
  }

  return records;
}

function remoteExists(branch) {
  const result = run(`git ls-remote --heads origin "${branch}"`);
  return Boolean(result && result.trim().length > 0);
}

function resolveRemoteBranchSha(branch) {
  const result = run(`git ls-remote --heads origin "${branch}"`);
  const line = splitLines(result)[0] ?? '';
  const sha = line.split(/\s+/u)[0] ?? '';
  if (!sha) {
    throw new Error(`Could not resolve remote SHA for branch "${branch}".`);
  }
  return sha;
}

export function buildArchiveTag(branch, dateStr) {
  return `${ARCHIVE_TAG_PREFIX}/${dateStr}/${branch}`;
}

function formatDateUtc() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function createAnnotatedTag(tag, sha, branch) {
  run(`git tag -a "${tag}" "${sha}" -m "Archive: ${branch} before Wave 9C branch deletion"`, {
    throws: true,
  });
}

function deleteLocalTagIfExists(tag) {
  if (!tag) return;
  run(`git tag -d "${tag}" 2>/dev/null || true`);
}

function pushTag(tag) {
  run(`git push origin "${tag}"`, { throws: true });
}

function remoteTagExists(tag) {
  const result = run(`git ls-remote --tags origin "refs/tags/${tag}"`);
  return Boolean(result && result.trim().length > 0);
}

function resolveRemoteTagTargetSha(tag, { runFn = run } = {}) {
  const peeled = runFn(`git ls-remote --tags origin "refs/tags/${tag}^{}"`, { throws: false });
  if (peeled) {
    const line = splitLines(peeled)[0];
    if (line) return line.split(/\s+/u)[0];
  }

  const direct = runFn(`git ls-remote --tags origin "refs/tags/${tag}"`, { throws: false });
  if (direct) {
    const line = splitLines(direct)[0];
    if (line) return line.split(/\s+/u)[0];
  }

  return null;
}

async function deleteRemoteBranch(owner, repo, branch) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set.');

  const { default: https } = await import('node:https');
  const url = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`;

  await new Promise((resolvePromise, rejectPromise) => {
    const req = https.request(
      url,
      {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer ' + token,
          'User-Agent': 'branch-cleanup-wave-9c',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
      (res) => {
        if (res.statusCode === 204) {
          resolvePromise();
          return;
        }
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          rejectPromise(
            new Error(
              `Failed to delete branch "${branch}": HTTP ${res.statusCode} ${body.slice(0, 200)}`
            )
          );
        });
      }
    );

    req.on('error', rejectPromise);
    req.end();
  });
}

async function fetchOpenPrCount(owner, repo, branch, token) {
  const { default: https } = await import('node:https');
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&head=${owner}:${encodeURIComponent(branch)}&per_page=1`;

  return new Promise((resolvePromise, rejectPromise) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token,
          'User-Agent': 'branch-cleanup-wave-9c',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(body);
              resolvePromise({ count: data.length, statusCode: res.statusCode });
            } catch {
              rejectPromise(new Error(`Failed to parse PR response for "${branch}": ${body.slice(0, 200)}`));
            }
          } else {
            resolvePromise({ count: 0, statusCode: res.statusCode });
          }
        });
      }
    );

    req.on('error', rejectPromise);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function checkOpenPrsWithRetry({
  owner,
  repo,
  branch,
  token,
  openPrCountFn = fetchOpenPrCount,
  maxAttempts = OPEN_PR_CHECK_MAX_ATTEMPTS,
  retryDelayMs = OPEN_PR_CHECK_RETRY_DELAY_MS,
  sleepFn = sleep,
}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const { count, statusCode } = await openPrCountFn(owner, repo, branch, token);
      if (RETRYABLE_OPEN_PR_STATUS_CODES.has(statusCode) && attempt < maxAttempts) {
        await sleepFn(retryDelayMs * attempt);
        continue;
      }
      return count;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleepFn(retryDelayMs * attempt);
      }
    }
  }
  throw lastError ?? new Error(`Open PR check failed for "${branch}" after ${maxAttempts} attempts.`);
}

async function evaluateBranch(
  branch,
  {
    owner,
    repo,
    currentBranch,
    auditMap,
    wave9aBranches,
    wave9bBranches,
    token = process.env.GITHUB_TOKEN ?? '',
    remoteExistsFn = remoteExists,
    openPrCountFn = fetchOpenPrCount,
    findReferencesFn = (b) => findReferences(b),
    openPrMaxAttempts = OPEN_PR_CHECK_MAX_ATTEMPTS,
    openPrRetryDelayMs = OPEN_PR_CHECK_RETRY_DELAY_MS,
    sleepFn = sleep,
  }
) {
  const row = {
    branch,
    exists: false,
    openPrs: 0,
    refs: [],
    classification: null,
    originalSha: null,
    archiveTag: null,
    tagShaMatch: null,
    action: 'pending',
    status: 'PENDING',
  };

  if (!branch) {
    row.status = 'FAIL – empty branch name';
    return row;
  }

  if (hasDangerousChars(branch)) {
    row.status = `FAIL – branch name "${branch}" contains disallowed characters`;
    return row;
  }

  if (PROTECTED_BRANCHES.has(branch) || isSpecialProtectedBranch(branch)) {
    row.status = 'FAIL – branch is protected/special';
    return row;
  }

  if (currentBranch === branch) {
    row.status = 'FAIL – branch is the current branch';
    return row;
  }

  if (wave9aBranches.has(branch)) {
    row.status = 'FAIL – branch was already processed in Wave 9A';
    return row;
  }

  if (wave9bBranches.has(branch)) {
    row.status = 'FAIL – branch was already processed in Wave 9B';
    return row;
  }

  if (!remoteExistsFn(branch)) {
    row.status = 'FAIL – branch does not exist on origin';
    return row;
  }
  row.exists = true;

  row.openPrs = await checkOpenPrsWithRetry({
    owner,
    repo,
    branch,
    token,
    openPrCountFn,
    maxAttempts: openPrMaxAttempts,
    retryDelayMs: openPrRetryDelayMs,
    sleepFn,
  });
  if (row.openPrs > 0) {
    row.status = `FAIL – branch has ${row.openPrs} open PR(s)`;
    return row;
  }

  row.refs = findReferencesFn(branch);
  if (row.refs.length > 0) {
    row.status = `FAIL – referenced in: ${row.refs.join(', ')}`;
    return row;
  }

  const auditRecord = auditMap.get(branch);
  if (!auditRecord) {
    row.status = `FAIL – branch is not listed in ${AUDIT_SOURCE_RELATIVE_PATH} 30-90d section`;
    return row;
  }

  if (auditRecord.ageDays > 90) {
    row.status = `FAIL – branch age ${auditRecord.ageDays}d exceeds 90d (use Wave 8 for >90d branches)`;
    return row;
  }

  if (auditRecord.ageDays < 30) {
    row.status = `FAIL – branch age ${auditRecord.ageDays}d is under the 30d minimum`;
    return row;
  }

  row.classification = `closed-unmerged 30-90d (${auditRecord.ageDays}d)`;
  row.status = 'READY';
  row.action = 'pending';
  return row;
}

function summarize(results) {
  return {
    total: results.length,
    ready: results.filter((result) => result.status === 'READY').length,
    deleted: results.filter((result) => result.action === 'deleted').length,
    blocked: results.filter((result) => result.action === 'blocked').length,
    failed: results.filter((result) => result.action === 'failed').length,
  };
}

async function writeReport({
  startTime,
  owner,
  repo,
  requested,
  results,
  phaseDeleted,
  phaseValidationPassed,
  runFailed,
  failureReason,
  archiveTagDate,
}) {
  const endTime = new Date().toISOString();
  const summary = summarize(results);
  const excludedPathsForReport = [...REFERENCE_SCAN_EXCLUDED_PATHS]
    .sort()
    .map((path) => `\`${path}\``)
    .join(', ');

  const lines = [
    '# Branch Cleanup Wave 9C — Report',
    '',
    `**Timestamp (start):** ${startTime}`,
    `**Timestamp (end):** ${endTime}`,
    `**Repository:** ${owner}/${repo}`,
    `**Run failed:** ${runFailed ? 'YES' : 'no'}`,
    failureReason ? `**Failure reason:** ${failureReason}` : null,
    `**Archive tag date prefix:** ${archiveTagDate}`,
    '',
    '## Scope',
    '',
    `- Branches requested: ${requested.length}`,
    `- Total cap: ${MAX_BRANCHES}`,
    '',
    '## Phase Outcome',
    '',
    `- Validation passed: ${phaseValidationPassed ? 'YES' : 'no'}`,
    `- Branches deleted: ${phaseDeleted}`,
    `- Branches ready: ${summary.ready}`,
    `- Branches blocked: ${summary.blocked}`,
    `- Branches failed: ${summary.failed}`,
    '',
    '## Safety Confirmations',
    '',
    '- ✅ Approved list was loaded and validated with strict cap of 25',
    '- ✅ Duplicate branch names were rejected',
    '- ✅ Protected/special/current/dangerous branch names were blocked',
    '- ✅ Wave 9A branches were verified absent from Wave 9C list',
    '- ✅ Wave 9B branches were verified absent from Wave 9C list',
    '- ✅ Open PR checks ran through GitHub REST API before any deletion',
    `- ✅ Reference scanning used workflows/docs/README/package/deployment paths excluding: ${excludedPathsForReport}`,
    '- ✅ Audit section required: closed-unmerged 30–90d validation before deletion',
    '- ✅ Branches with age >90d or <30d were rejected',
    '- ✅ Archive tags were created, pushed, and verified before branch deletion',
    '- ✅ Archive branch SHA was re-checked immediately before deletion',
    '- ✅ Branch deletion occurred one branch at a time',
    '',
    '## Requested Branches',
    '',
    ...requested.map((branch) => `- \`${branch}\``),
    '',
    '## Results',
    '',
    '| Branch | Classification | Original SHA | Archive Tag | Archive SHA Check | Action | Notes |',
    '|---|---|---|---|---|---|---|',
    ...results.map(
      (row) =>
        `| \`${row.branch}\` | ${row.classification ?? '—'} | ${row.originalSha ?? '—'} | ${row.archiveTag ?? '—'} | ${row.tagShaMatch ?? '—'} | ${row.action} | ${row.status} |`
    ),
    '',
    '## Recovery Instructions',
    '',
    'If a branch was deleted and needs to be restored:',
    '',
    '```bash',
    `# List Wave 9C archive tags`,
    `git fetch origin --tags`,
    `git tag -l "archive/branch-cleanup-wave-9c/*"`,
    '',
    '# Restore a specific branch from its archive tag',
    '# Replace <tag> with the full archive tag name from the Results table above',
    `git checkout -b <branch-name> <tag>`,
    `git push origin <branch-name>`,
    '```',
  ].filter(Boolean);

  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');

  if (runFailed || !phaseValidationPassed) {
    process.exitCode = 1;
  }
}

async function main() {
  const startTime = new Date().toISOString();
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '/').split('/');
  if (!owner || !repo) {
    throw new Error('GITHUB_REPOSITORY env var must be set to "owner/repo".');
  }

  if (!existsSync(APPROVED_LIST_PATH)) {
    throw new Error(`Approved list not found at ${APPROVED_LIST_PATH}`);
  }

  if (!existsSync(AUDIT_SOURCE_PATH)) {
    throw new Error(`Audit source not found at ${AUDIT_SOURCE_PATH}`);
  }

  if (!existsSync(WAVE_9A_APPROVED_LIST_PATH)) {
    throw new Error(`Wave 9A approved list not found at ${WAVE_9A_APPROVED_LIST_PATH}`);
  }

  if (!existsSync(WAVE_9B_APPROVED_LIST_PATH)) {
    throw new Error(`Wave 9B approved list not found at ${WAVE_9B_APPROVED_LIST_PATH}`);
  }

  const branches = parseApprovedBranches(readFileSync(APPROVED_LIST_PATH, 'utf8'));
  const wave9aBranches = new Set(
    parseApprovedBranches(readFileSync(WAVE_9A_APPROVED_LIST_PATH, 'utf8'))
  );
  const wave9bBranches = new Set(
    parseApprovedBranches(readFileSync(WAVE_9B_APPROVED_LIST_PATH, 'utf8'))
  );
  const currentBranch = run('git rev-parse --abbrev-ref HEAD') ?? '';

  validateApprovedList({ branches, currentBranch, wave9aBranches, wave9bBranches });

  const auditMap = parseAuditSection(
    readFileSync(AUDIT_SOURCE_PATH, 'utf8'),
    REQUIRED_AUDIT_SECTION_HEADER
  );

  const context = { owner, repo, currentBranch, auditMap, wave9aBranches, wave9bBranches };

  const results = [];
  for (const branch of branches) {
    const row = await evaluateBranch(branch, context);
    results.push(row);
  }

  const phaseValidationPassed = results.every((row) => row.status === 'READY');
  const archiveTagDate = formatDateUtc();
  let phaseDeleted = 0;
  let runFailed = false;
  let failureReason = '';

  if (phaseValidationPassed) {
    for (const row of results) {
      try {
        const originalSha = resolveRemoteBranchSha(row.branch);
        const tag = buildArchiveTag(row.branch, archiveTagDate);

        row.originalSha = originalSha;
        row.archiveTag = tag;

        if (!remoteTagExists(tag)) {
          deleteLocalTagIfExists(tag);
          createAnnotatedTag(tag, originalSha, row.branch);
          pushTag(tag);
        }

        if (!remoteTagExists(tag)) {
          throw new Error(`Archive tag "${tag}" was not found on remote after push.`);
        }

        const remoteTagSha = resolveRemoteTagTargetSha(tag);
        if (!remoteTagSha) {
          throw new Error(`Could not resolve remote target SHA for archive tag "${tag}".`);
        }

        if (remoteTagSha !== originalSha) {
          throw new Error(
            `Archive tag SHA mismatch for "${row.branch}": expected ${originalSha}, got ${remoteTagSha}.`
          );
        }

        const beforeDeleteSha = resolveRemoteBranchSha(row.branch);
        if (beforeDeleteSha !== originalSha) {
          throw new Error(
            `Branch tip changed before deletion for "${row.branch}": expected ${originalSha}, got ${beforeDeleteSha}.`
          );
        }

        row.tagShaMatch = 'YES';
        await deleteRemoteBranch(owner, repo, row.branch);
        row.action = 'deleted';
        row.status = 'ARCHIVED_AND_DELETED';
        phaseDeleted += 1;
      } catch (error) {
        row.action = 'failed';
        row.status = `FAIL – ${error.message}`;
        runFailed = true;
        failureReason = `Stopped at branch "${row.branch}" due to archive verification failure.`;

        const index = results.indexOf(row);
        for (let i = index + 1; i < results.length; i += 1) {
          if (results[i].status === 'READY') {
            results[i].action = 'blocked';
            results[i].status = 'BLOCKED – archive phase halted after prior failure';
          }
        }

        deleteLocalTagIfExists(row.archiveTag ?? '');
        break;
      }

      deleteLocalTagIfExists(row.archiveTag ?? '');
    }
  } else {
    for (const row of results) {
      if (row.status === 'READY') {
        row.action = 'blocked';
        row.status = 'BLOCKED – validation failed for one or more branches';
      }
    }
  }

  await writeReport({
    startTime,
    owner,
    repo,
    requested: branches,
    results,
    phaseDeleted,
    phaseValidationPassed,
    runFailed,
    failureReason,
    archiveTagDate,
  });
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isDirectExecution) {
  main().catch((error) => {
    console.error('Fatal error:', error.message);
    process.exitCode = 1;
  });
}
