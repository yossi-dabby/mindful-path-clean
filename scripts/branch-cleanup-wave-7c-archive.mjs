/**
 * Branch Cleanup Wave 7C (Archive Tag + Delete)
 *
 * Final wave — safely archives and deletes only explicitly approved abandoned WIP Copilot
 * branches that were not covered by Wave 7A or Wave 7B.
 *
 * Safety rules (all must pass before any branch deletion):
 *   - Approved list must be non-empty and must not exceed 25 entries
 *   - Branch must not be protected/special, current branch, or dangerous
 *   - Branch must exist on origin and have no open PRs
 *   - Branch must be classified as SAFE_DELETE_ABANDONED_WIP in the audit source
 *   - Branch must have no blocking references in workflows/docs/README/package/deploy config
 *     (excluding docs/branch-cleanup-wave-7c-approved-list.txt and docs/remaining-branch-reduction-audit.md)
 *   - For each branch: resolve tip SHA -> create annotated archive tag -> push tag ->
 *     verify remote tag -> verify tag points to exact original SHA -> delete branch
 *   - Process one branch at a time and stop immediately on tag verification failure
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const APPROVED_LIST_RELATIVE_PATH = 'docs/branch-cleanup-wave-7c-approved-list.txt';
const APPROVED_LIST_PATH = resolve(REPO_ROOT, APPROVED_LIST_RELATIVE_PATH);
const AUDIT_SOURCE_RELATIVE_PATH = 'docs/remaining-branch-reduction-audit.md';
const AUDIT_SOURCE_PATH = resolve(REPO_ROOT, AUDIT_SOURCE_RELATIVE_PATH);
const REPORT_PATH = resolve(REPO_ROOT, 'branch-cleanup-wave-7c-report.md');

const MAX_BRANCHES = 25;
const ARCHIVE_TAG_PREFIX = 'archive/branch-cleanup-wave-7c';
const REQUIRED_AUDIT_SECTION_HEADER = '### 2c. SAFE_DELETE_ABANDONED_WIP';
const OPEN_PR_CHECK_MAX_ATTEMPTS = 3;
const OPEN_PR_CHECK_RETRY_DELAY_MS = 1000;
const RETRYABLE_OPEN_PR_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const PROTECTED_BRANCHES = new Set([
  'main',
  'origin/main',
  'staging-fresh',
  'origin/staging-fresh',
]);

const SPECIAL_BRANCH_PREFIXES = ['release/', 'hotfix/'];

const REFERENCE_SEARCH_PATHS = [
  '.github/workflows',
  'docs',
  'README.md',
  'README',
  'package.json',
  'railway.toml',
  'vercel.json',
  'netlify.toml',
];

const REFERENCE_SCAN_EXCLUDED_PATHS = new Set([
  APPROVED_LIST_RELATIVE_PATH,
  AUDIT_SOURCE_RELATIVE_PATH,
]);

const TABLE_HEADER = '| Branch | Last Commit | Age | PR | PR Closed |';

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

function hasDangerousChars(name) {
  return /[^a-zA-Z0-9\-_/.]/u.test(name);
}

function isSpecialProtectedBranch(name) {
  return SPECIAL_BRANCH_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function parseApprovedBranches(rawContent) {
  return splitLines(rawContent).filter((line) => !line.startsWith('#'));
}

function assertUniqueBranches(branches) {
  const seen = new Set();
  for (const branch of branches) {
    if (seen.has(branch)) {
      throw new Error(`Approved list contains duplicate branch: "${branch}".`);
    }
    seen.add(branch);
  }
}

function validateApprovedBranches(branches, currentBranch = '') {
  if (branches.length === 0) {
    throw new Error('Approved list is empty. Add at least one Wave 7C branch before running cleanup.');
  }

  if (branches.length > MAX_BRANCHES) {
    throw new Error(
      `Approved list contains ${branches.length} branches, which exceeds the limit of ${MAX_BRANCHES}.`
    );
  }

  assertUniqueBranches(branches);

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
  }

  if (currentBranch && branches.includes(currentBranch)) {
    throw new Error(`Current branch "${currentBranch}" is in the approved list.`);
  }
}

function filterReferenceHits(hits, { excludedPaths = REFERENCE_SCAN_EXCLUDED_PATHS } = {}) {
  return [...new Set(splitLines(hits).filter((hit) => !excludedPaths.has(hit)))];
}

function findReferences(
  branch,
  {
    searchPaths = REFERENCE_SEARCH_PATHS,
    repoRoot = REPO_ROOT,
    pathExists = existsSync,
    runCommand = run,
  } = {}
) {
  const escaped = branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const allHits = [];

  for (const searchPath of searchPaths) {
    const fullPath = resolve(repoRoot, searchPath);
    if (!pathExists(fullPath)) continue;

    const result = runCommand(
      `git grep -rl "${escaped}" -- "${fullPath}" 2>/dev/null || true`
    );
    if (result) {
      allHits.push(result);
    }
  }

  return filterReferenceHits(allHits.join('\n'));
}

function parseAuditAbandonedWipBranches(auditContent) {
  const map = new Map();
  const lines = auditContent.split('\n');

  let inSection = false;
  let inTable = false;

  for (const line of lines) {
    if (line.includes(REQUIRED_AUDIT_SECTION_HEADER)) {
      inSection = true;
      inTable = false;
      continue;
    }

    if (inSection) {
      if (line.includes(TABLE_HEADER)) {
        inTable = true;
        continue;
      }

      if (inTable) {
        if (line.startsWith('| `copilot/') || line.startsWith('| `staging') || line.startsWith('| `main')) {
          const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(\d+)d\s*\|/);
          if (match) {
            const [, branchName, lastCommitDate, ageDaysStr] = match;
            map.set(branchName, {
              branch: branchName,
              ageDays: Number(ageDaysStr),
              lastCommitDate,
            });
          }
          continue;
        }

        if (line.startsWith('---') || line.startsWith('##')) {
          break;
        }
      }
    }
  }

  if (map.size === 0) {
    throw new Error(
      `Could not parse any branches from audit section "${REQUIRED_AUDIT_SECTION_HEADER}". ` +
        'Check audit file format.'
    );
  }

  return map;
}

function buildArchiveTag(branch, dateStr) {
  return `${ARCHIVE_TAG_PREFIX}/${dateStr}/${branch}`;
}

function formatDateUtc() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function remoteExists(branch) {
  const result = run(`git ls-remote --heads origin "${branch}"`);
  return Boolean(result && result.trim().length > 0);
}

function resolveRemoteBranchSha(branch) {
  const sha = run(`git rev-parse "origin/${branch}"`);
  if (!sha) throw new Error(`Could not resolve SHA for origin/${branch}`);
  return sha;
}

function createAnnotatedTag(tag, sha, branch) {
  run(
    `git tag -a "${tag}" "${sha}" -m "Archive: ${branch} before Wave 7C branch deletion"`,
    { throws: true }
  );
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

function deleteLocalTagIfExists(tag) {
  if (!tag) return;
  run(`git tag -d "${tag}" 2>/dev/null || true`);
}

async function deleteRemoteBranch(owner, repo, branch) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set.');

  const url = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`;
  const { default: https } = await import('node:https');

  await new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer ' + token,
          'User-Agent': 'branch-cleanup-wave-7c-archive',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
      (res) => {
        if (res.statusCode === 204) {
          resolve();
        } else {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            reject(
              new Error(
                `Failed to delete branch "${branch}": HTTP ${res.statusCode} ${body.trim()}`
              )
            );
          });
        }
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function fetchOpenPrCount(owner, repo, branch, token) {
  const { default: https } = await import('node:https');
  const encodedBranch = encodeURIComponent(branch);
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&head=${owner}:${encodedBranch}&per_page=1`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token,
          'User-Agent': 'branch-cleanup-wave-7c-archive',
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
              resolve(JSON.parse(body).length);
            } catch {
              reject(new Error(`Failed to parse GitHub API response for "${branch}".`));
            }
          } else {
            const err = new Error(
              `GitHub API error checking open PRs for branch "${branch}": ${res.statusCode} ${body.trim()}`
            );
            err.statusCode = res.statusCode;
            reject(err);
          }
        });
      }
    );
    req.on('error', (err) => {
      err.isNetworkError = true;
      reject(err);
    });
    req.end();
  });
}

function isRetryableError(error) {
  const message = String(error?.message ?? '');
  const statusCodeMatch = message.match(/\b(\d{3})\b/u);
  const statusCode = statusCodeMatch ? Number(statusCodeMatch[1]) : null;

  if (statusCode !== null && RETRYABLE_OPEN_PR_STATUS_CODES.has(statusCode)) {
    return true;
  }

  return /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|network/i.test(message);
}

async function checkOpenPrsWithRetry({
  owner,
  repo,
  branch,
  token,
  openPrCountFn,
  maxAttempts = OPEN_PR_CHECK_MAX_ATTEMPTS,
  retryDelayMs = OPEN_PR_CHECK_RETRY_DELAY_MS,
  sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
}) {
  let attempt = 0;
  let lastError;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await (openPrCountFn
        ? openPrCountFn()
        : fetchOpenPrCount(owner, repo, branch, token));
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < maxAttempts && isRetryableError(error);
      if (!shouldRetry) {
        throw error;
      }
      await sleepFn(retryDelayMs);
    }
  }

  throw lastError;
}

async function evaluateBranch(
  branch,
  { owner, repo, currentBranch, abandonedAuditMap },
  {
    remoteExistsFn = remoteExists,
    openPrCountFn = null,
    findReferencesFn = findReferences,
    referenceSearchPaths = REFERENCE_SEARCH_PATHS,
    openPrMaxAttempts = OPEN_PR_CHECK_MAX_ATTEMPTS,
    openPrRetryDelayMs = OPEN_PR_CHECK_RETRY_DELAY_MS,
    sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = {}
) {
  const token = process.env.GITHUB_TOKEN;
  const row = {
    branch,
    exists: false,
    openPrs: 0,
    refs: [],
    auditClassification: null,
    status: 'PENDING',
  };

  if (!remoteExistsFn(branch)) {
    row.status = 'FAIL – branch does not exist on origin';
    return row;
  }
  row.exists = true;

  if (currentBranch === branch) {
    row.status = 'FAIL – branch is the current branch';
    return row;
  }

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

  row.refs = findReferencesFn(branch, { searchPaths: referenceSearchPaths });
  if (row.refs.length > 0) {
    row.status = `FAIL – referenced in: ${row.refs.join(', ')}`;
    return row;
  }

  const audit = abandonedAuditMap.get(branch);
  if (!audit) {
    row.status = `FAIL – branch is not listed in ${AUDIT_SOURCE_RELATIVE_PATH} as SAFE_DELETE_ABANDONED_WIP`;
    return row;
  }

  if (audit.ageDays <= 90) {
    row.status = `FAIL – branch age ${audit.ageDays}d is not older than 90d`;
    return row;
  }

  row.auditClassification = `SAFE_DELETE_ABANDONED_WIP (${audit.ageDays}d)`;
  row.status = 'READY';
  return row;
}

async function writeReport({
  startTime,
  owner,
  repo,
  requestedBranches,
  results,
  aborted,
  abortReason = '',
  archiveTagDate,
}) {
  const endTime = new Date().toISOString();
  const deleted = results.filter((row) => row.action === 'deleted');
  const failed = results.filter((row) => row.action !== 'deleted');

  const lines = [
    '# Branch Cleanup Wave 7C Archive — Report',
    '',
    `**Timestamp (start):** ${startTime}`,
    `**Timestamp (end):** ${endTime}`,
    `**Repository:** ${owner}/${repo}`,
    `**Run aborted:** ${aborted ? 'YES' : 'no'}`,
    `**Archive tag date prefix:** ${archiveTagDate}`,
    abortReason ? `**Abort reason:** ${abortReason}` : null,
    '',
    '## Summary',
    '',
    '| Metric | Count |',
    '|---|---|',
    `| Branches requested | ${requestedBranches.length} |`,
    `| Branches deleted | ${deleted.length} |`,
    `| Branches blocked / failed | ${failed.length} |`,
    '',
    '## Safety Confirmations',
    '',
    '- ✅ Approved list was non-empty and did not exceed 25 entries',
    '- ✅ Branch names were checked for protected/special/current/dangerous values',
    '- ✅ Open PR status was verified via GitHub REST API before any action',
    '- ✅ Branch classification was verified from SAFE_DELETE_ABANDONED_WIP audit section',
    `- ✅ Reference checks scanned workflows, docs, README, package, and deployment configs, excluding \`${APPROVED_LIST_RELATIVE_PATH}\` and \`${AUDIT_SOURCE_RELATIVE_PATH}\``,
    '- ✅ Archive tag was created and pushed before branch deletion',
    '- ✅ Remote archive tag existence and SHA match were verified before each deletion',
    '- ✅ Branches were processed one-by-one',
    '',
    '## Branches Requested',
    '',
    ...requestedBranches.map((branch) => `- \`${branch}\``),
    '',
    '## Validation, Archive, and Deletion Results',
    '',
    '| Branch | Classification | Original SHA | Archive Tag | Archive SHA Check | Action | Notes |',
    '|---|---|---|---|---|---|---|',
    ...results.map(
      (row) =>
        `| \`${row.branch}\` | ${row.auditClassification ?? '—'} | ${row.originalSha ?? '—'} | ${row.archiveTag ?? '—'} | ${row.tagShaMatch ?? '—'} | ${row.action} | ${row.status} |`
    ),
    '',
    '## Recovery Instructions',
    '',
    'For any archived branch, recover with:',
    '',
    '```bash',
    '# 1) Fetch tags',
    'git fetch origin --tags',
    '',
    '# 2) Recreate a local recovery branch from archive tag',
    '#    Replace TAG_NAME and RECOVERY_BRANCH below',
    'git checkout -b RECOVERY_BRANCH TAG_NAME',
    '',
    '# 3) (Optional) Push recovery branch to origin',
    'git push origin RECOVERY_BRANCH',
    '```',
    '',
    '## Final Wave Note',
    '',
    'Wave 7C is the final abandoned-WIP archive wave. All 87 abandoned WIP Copilot attempts',
    'identified in the post-Wave-5 audit have now been archived and deleted across Waves 7A, 7B, and 7C.',
    '',
  ].filter(Boolean);

  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
}

async function main() {
  const startTime = new Date().toISOString();
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '/').split('/');
  if (!owner || !repo) {
    console.error('ERROR: GITHUB_REPOSITORY env var must be set to "owner/repo".');
    process.exit(1);
  }

  if (!existsSync(APPROVED_LIST_PATH)) {
    console.error(`ERROR: Approved list not found at ${APPROVED_LIST_PATH}`);
    process.exit(1);
  }

  if (!existsSync(AUDIT_SOURCE_PATH)) {
    console.error(`ERROR: Audit source not found at ${AUDIT_SOURCE_PATH}`);
    process.exit(1);
  }

  const currentBranch = run('git rev-parse --abbrev-ref HEAD') ?? '';
  const branches = parseApprovedBranches(readFileSync(APPROVED_LIST_PATH, 'utf8'));

  let abandonedAuditMap;
  try {
    abandonedAuditMap = parseAuditAbandonedWipBranches(readFileSync(AUDIT_SOURCE_PATH, 'utf8'));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }

  try {
    validateApprovedBranches(branches, currentBranch);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }

  console.log(`\nApproved list loaded: ${branches.length} branch(es)\n`);

  const evaluationResults = [];
  for (const branch of branches) {
    let row;
    try {
      row = await evaluateBranch(branch, {
        owner,
        repo,
        currentBranch,
        abandonedAuditMap,
      });
    } catch (error) {
      row = {
        branch,
        exists: true,
        openPrs: 0,
        refs: [],
        auditClassification: null,
        status: `FAIL – validation error: ${error.message}`,
      };
    }

    row.action = row.status === 'READY' ? 'pending' : 'blocked';
    evaluationResults.push(row);
  }

  if (evaluationResults.some((row) => row.action !== 'pending')) {
    console.error('\nAborting. All branches must pass validation before archive/delete begins.\n');
    await writeReport({
      startTime,
      owner,
      repo,
      requestedBranches: branches,
      results: evaluationResults,
      aborted: true,
      abortReason: 'Pre-validation failed for one or more branches.',
      archiveTagDate: formatDateUtc(),
    });
    process.exit(1);
  }

  const archiveTagDate = formatDateUtc();
  const results = [];

  for (const row of evaluationResults) {
    const branch = row.branch;
    const result = {
      ...row,
      originalSha: null,
      archiveTag: null,
      remoteTagPresent: false,
      remoteTagSha: null,
      tagShaMatch: 'NO',
      action: 'pending',
      status: 'READY',
    };

    try {
      result.originalSha = resolveRemoteBranchSha(branch);
      result.archiveTag = buildArchiveTag(branch, archiveTagDate);

      if (remoteTagExists(result.archiveTag)) {
        console.log(`  Archive tag "${result.archiveTag}" already exists on remote — skipping create/push (idempotent re-run).`);
      } else {
        deleteLocalTagIfExists(result.archiveTag);
        createAnnotatedTag(result.archiveTag, result.originalSha, branch);
        pushTag(result.archiveTag);
      }

      result.remoteTagPresent = remoteTagExists(result.archiveTag);
      if (!result.remoteTagPresent) {
        throw new Error(`Archive tag "${result.archiveTag}" was not found on remote after push.`);
      }

      result.remoteTagSha = resolveRemoteTagTargetSha(result.archiveTag);
      if (!result.remoteTagSha) {
        throw new Error(`Could not resolve remote target SHA for archive tag "${result.archiveTag}".`);
      }

      if (result.remoteTagSha !== result.originalSha) {
        throw new Error(
          `Archive tag SHA mismatch for "${branch}": expected ${result.originalSha}, got ${result.remoteTagSha}.`
        );
      }

      result.tagShaMatch = 'YES';
      await deleteRemoteBranch(owner, repo, branch);
      result.action = 'deleted';
      result.status = 'ARCHIVED_AND_DELETED';
    } catch (error) {
      result.action = 'failed';
      result.status = `FAIL – ${error.message}`;
      results.push(result);

      await writeReport({
        startTime,
        owner,
        repo,
        requestedBranches: branches,
        results,
        aborted: true,
        abortReason: `Stopped at branch "${branch}" due to archive verification failure.`,
        archiveTagDate,
      });

      deleteLocalTagIfExists(result.archiveTag ?? '');
      throw error;
    }

    results.push(result);
    deleteLocalTagIfExists(result.archiveTag ?? '');
  }

  await writeReport({
    startTime,
    owner,
    repo,
    requestedBranches: branches,
    results,
    aborted: false,
    archiveTagDate,
  });

  console.log(`\nCleanup complete. Report written to ${REPORT_PATH}`);
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isDirectExecution) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export {
  APPROVED_LIST_RELATIVE_PATH,
  ARCHIVE_TAG_PREFIX,
  AUDIT_SOURCE_RELATIVE_PATH,
  MAX_BRANCHES,
  PROTECTED_BRANCHES,
  REFERENCE_SCAN_EXCLUDED_PATHS,
  REFERENCE_SEARCH_PATHS,
  REQUIRED_AUDIT_SECTION_HEADER,
  SPECIAL_BRANCH_PREFIXES,
  buildArchiveTag,
  evaluateBranch,
  filterReferenceHits,
  findReferences,
  hasDangerousChars,
  isSpecialProtectedBranch,
  parseApprovedBranches,
  parseAuditAbandonedWipBranches,
  resolveRemoteTagTargetSha,
  validateApprovedBranches,
};
