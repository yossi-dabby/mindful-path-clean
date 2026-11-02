import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const DIRECT_APPROVED_LIST_RELATIVE_PATH = 'docs/branch-cleanup-wave-8-direct-approved-list.txt';
const ARCHIVE_APPROVED_LIST_RELATIVE_PATH = 'docs/branch-cleanup-wave-8-archive-approved-list.txt';
const DIRECT_APPROVED_LIST_PATH = resolve(REPO_ROOT, DIRECT_APPROVED_LIST_RELATIVE_PATH);
const ARCHIVE_APPROVED_LIST_PATH = resolve(REPO_ROOT, ARCHIVE_APPROVED_LIST_RELATIVE_PATH);
const AUDIT_SOURCE_RELATIVE_PATH = 'docs/post-wave-7c-remaining-branch-audit.md';
const AUDIT_SOURCE_PATH = resolve(REPO_ROOT, AUDIT_SOURCE_RELATIVE_PATH);
const REPORT_PATH = resolve(REPO_ROOT, 'branch-cleanup-wave-8-report.md');

const MAX_DIRECT_BRANCHES = 15;
const MAX_ARCHIVE_BRANCHES = 40;
const MAX_TOTAL_BRANCHES = 55;
const ARCHIVE_TAG_PREFIX = 'archive/branch-cleanup-wave-8';

const REQUIRED_DIRECT_AUDIT_HEADER = '### 3. DIRECT_DELETE_SAFE_MERGED';
const REQUIRED_ARCHIVE_AUDIT_HEADER =
  '### 4. ARCHIVE_THEN_DELETE_CLOSED_UNMERGED_OLDER_THAN_90D';

const OPEN_PR_CHECK_MAX_ATTEMPTS = 3;
const OPEN_PR_CHECK_RETRY_DELAY_MS = 1000;
const RETRYABLE_OPEN_PR_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const PROTECTED_BRANCHES = new Set(['main', 'origin/main', 'staging-fresh', 'origin/staging-fresh']);
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
  DIRECT_APPROVED_LIST_RELATIVE_PATH,
  ARCHIVE_APPROVED_LIST_RELATIVE_PATH,
  AUDIT_SOURCE_RELATIVE_PATH,
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

function parseApprovedBranches(rawContent) {
  return splitLines(rawContent).filter((line) => !line.startsWith('#'));
}

function hasDangerousChars(name) {
  return /[^a-zA-Z0-9\-_/.]/u.test(name);
}

function isSpecialProtectedBranch(name) {
  return SPECIAL_BRANCH_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function assertUniqueWithinList(branches, label) {
  const seen = new Set();
  for (const branch of branches) {
    if (seen.has(branch)) {
      throw new Error(`${label} list contains duplicate branch: "${branch}".`);
    }
    seen.add(branch);
  }
}

function validateApprovedLists({ directBranches, archiveBranches, currentBranch = '' }) {
  if (directBranches.length === 0 && archiveBranches.length === 0) {
    throw new Error('Both approved lists are empty. Add at least one Wave 8 branch before running cleanup.');
  }

  if (directBranches.length > MAX_DIRECT_BRANCHES) {
    throw new Error(
      `Direct approved list contains ${directBranches.length} branches, which exceeds the limit of ${MAX_DIRECT_BRANCHES}.`
    );
  }

  if (archiveBranches.length > MAX_ARCHIVE_BRANCHES) {
    throw new Error(
      `Archive approved list contains ${archiveBranches.length} branches, which exceeds the limit of ${MAX_ARCHIVE_BRANCHES}.`
    );
  }

  const total = directBranches.length + archiveBranches.length;
  if (total > MAX_TOTAL_BRANCHES) {
    throw new Error(`Total approved branches (${total}) exceeds the overall limit of ${MAX_TOTAL_BRANCHES}.`);
  }

  assertUniqueWithinList(directBranches, 'Direct');
  assertUniqueWithinList(archiveBranches, 'Archive');

  const archiveSet = new Set(archiveBranches);
  for (const branch of directBranches) {
    if (archiveSet.has(branch)) {
      throw new Error(`Branch "${branch}" appears in both direct and archive approved lists.`);
    }
  }

  const allBranches = [...directBranches, ...archiveBranches];
  for (const branch of allBranches) {
    if (!branch) {
      throw new Error('Approved lists contain an empty branch name.');
    }

    if (PROTECTED_BRANCHES.has(branch)) {
      throw new Error(`Protected branch "${branch}" found in approved lists.`);
    }

    if (isSpecialProtectedBranch(branch)) {
      throw new Error(`Special/protected branch "${branch}" found in approved lists.`);
    }

    if (hasDangerousChars(branch)) {
      throw new Error(`Branch name "${branch}" contains disallowed characters.`);
    }

    if (currentBranch && branch === currentBranch) {
      throw new Error(`Current branch "${currentBranch}" is in the approved lists.`);
    }
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

function parseAuditSection(auditContent, sectionHeader) {
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

    const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/u);
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
    throw new Error(`Could not parse audit section "${sectionHeader}" from ${AUDIT_SOURCE_RELATIVE_PATH}.`);
  }

  return records;
}

function parseAuditClassifications(auditContent) {
  const directMap = parseAuditSection(auditContent, REQUIRED_DIRECT_AUDIT_HEADER);
  const archiveMap = parseAuditSection(auditContent, REQUIRED_ARCHIVE_AUDIT_HEADER);
  return { directMap, archiveMap };
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

function isMergedIntoMain(branch) {
  const command = `git merge-base --is-ancestor "origin/${branch}" "origin/main"`;
  try {
    execSync(command, { cwd: REPO_ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function buildArchiveTag(branch, dateStr) {
  return `${ARCHIVE_TAG_PREFIX}/${dateStr}/${branch}`;
}

function formatDateUtc() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function createAnnotatedTag(tag, sha, branch) {
  run(`git tag -a "${tag}" "${sha}" -m "Archive: ${branch} before Wave 8 branch deletion"`, {
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
          'User-Agent': 'branch-cleanup-wave-8',
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
            new Error(`Failed to delete branch "${branch}": HTTP ${res.statusCode} ${body.trim()}`)
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
  const encodedBranch = encodeURIComponent(branch);
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&head=${owner}:${encodedBranch}&per_page=1`;

  return new Promise((resolvePromise, rejectPromise) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token,
          'User-Agent': 'branch-cleanup-wave-8',
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
              const parsed = JSON.parse(body);
              resolvePromise(Array.isArray(parsed) ? parsed.length : 0);
            } catch {
              rejectPromise(new Error(`Failed to parse GitHub API response for branch "${branch}".`));
            }
            return;
          }

          const err = new Error(
            `GitHub API error checking open PRs for branch "${branch}": ${res.statusCode} ${body.trim()}`
          );
          err.statusCode = res.statusCode;
          rejectPromise(err);
        });
      }
    );

    req.on('error', (error) => {
      error.isNetworkError = true;
      rejectPromise(error);
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
  sleepFn = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms)),
}) {
  let attempt = 0;
  let lastError;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await (openPrCountFn ? openPrCountFn() : fetchOpenPrCount(owner, repo, branch, token));
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

async function evaluateCommonBranchChecks(
  branch,
  { owner, repo, currentBranch },
  {
    remoteExistsFn = remoteExists,
    findReferencesFn = findReferences,
    openPrCountFn = null,
    openPrMaxAttempts = OPEN_PR_CHECK_MAX_ATTEMPTS,
    openPrRetryDelayMs = OPEN_PR_CHECK_RETRY_DELAY_MS,
    sleepFn = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms)),
  } = {}
) {
  const token = process.env.GITHUB_TOKEN;

  const row = {
    branch,
    exists: false,
    openPrs: 0,
    refs: [],
    classification: null,
    phase: null,
    action: 'blocked',
    status: 'PENDING',
  };

  if (PROTECTED_BRANCHES.has(branch) || isSpecialProtectedBranch(branch)) {
    row.status = 'FAIL – branch is protected/special';
    return row;
  }

  if (currentBranch === branch) {
    row.status = 'FAIL – branch is the current branch';
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

  return row;
}

async function evaluateDirectBranch(branch, context, dependencies = {}) {
  const row = await evaluateCommonBranchChecks(branch, context, dependencies);
  row.phase = 'direct';

  if (row.status.startsWith('FAIL')) return row;

  if (isMergedIntoMain(branch)) {
    row.classification = 'safe merged into origin/main';
    row.status = 'READY';
    row.action = 'pending';
    return row;
  }

  const auditRecord = context.directAuditMap.get(branch);
  if (!auditRecord) {
    row.status = `FAIL – branch is not listed in ${AUDIT_SOURCE_RELATIVE_PATH} direct-safe section`;
    return row;
  }

  row.classification = `PR-merged-safe from audit (${auditRecord.ageDays}d)`;
  row.status = 'READY';
  row.action = 'pending';
  return row;
}

async function evaluateArchiveBranch(branch, context, dependencies = {}) {
  const row = await evaluateCommonBranchChecks(branch, context, dependencies);
  row.phase = 'archive';

  if (row.status.startsWith('FAIL')) return row;

  const auditRecord = context.archiveAuditMap.get(branch);
  if (!auditRecord) {
    row.status = `FAIL – branch is not listed in ${AUDIT_SOURCE_RELATIVE_PATH} archive >90d section`;
    return row;
  }

  if (auditRecord.ageDays <= 90) {
    row.status = `FAIL – branch age ${auditRecord.ageDays}d is not older than 90d`;
    return row;
  }

  row.classification = `closed-unmerged >90d (${auditRecord.ageDays}d)`;
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
  directRequested,
  archiveRequested,
  directResults,
  archiveResults,
  directPhaseDeleted,
  archivePhaseDeleted,
  directPhaseValidationPassed,
  archivePhaseValidationPassed,
  runFailed,
  failureReason,
  archiveTagDate,
}) {
  const endTime = new Date().toISOString();
  const directSummary = summarize(directResults);
  const archiveSummary = summarize(archiveResults);
  const excludedPathsForReport = [...REFERENCE_SCAN_EXCLUDED_PATHS]
    .sort()
    .map((path) => `\`${path}\``)
    .join(', ');

  const lines = [
    '# Branch Cleanup Wave 8 — Report',
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
    `- Direct list requested: ${directRequested.length} branch(es)`,
    `- Archive list requested: ${archiveRequested.length} branch(es)`,
    `- Total requested: ${directRequested.length + archiveRequested.length} branch(es)`,
    '',
    '## Phase Outcomes',
    '',
    `- Direct phase validation passed: ${directPhaseValidationPassed ? 'YES' : 'no'}`,
    `- Direct phase branches deleted: ${directPhaseDeleted}`,
    `- Archive phase validation passed: ${archivePhaseValidationPassed ? 'YES' : 'no'}`,
    `- Archive phase branches deleted: ${archivePhaseDeleted}`,
    '',
    '## Safety Confirmations',
    '',
    '- ✅ Both approved lists were loaded and validated with strict caps',
    '- ✅ Duplicate branch names across lists were rejected',
    '- ✅ Protected/special/current/dangerous branch names were blocked',
    '- ✅ Open PR checks ran through GitHub REST API before any deletion',
    `- ✅ Reference scanning used workflows/docs/README/package/deployment paths excluding: ${excludedPathsForReport}`,
    '- ✅ Direct phase required safe-merged or PR-merged-safe validation before deletion',
    '- ✅ Archive phase required closed-unmerged >90d validation before deletion',
    '- ✅ Archive tags were created, pushed, and verified before archive-branch deletion',
    '- ✅ Archive branch SHA was re-checked immediately before deletion',
    '- ✅ Branch deletion occurred one branch at a time',
    '',
    '## Direct Phase Requested Branches',
    '',
    ...directRequested.map((branch) => `- \`${branch}\``),
    '',
    '## Direct Phase Results',
    '',
    '| Branch | Classification | Action | Notes |',
    '|---|---|---|---|',
    ...directResults.map(
      (row) =>
        `| \`${row.branch}\` | ${row.classification ?? '—'} | ${row.action} | ${row.status} |`
    ),
    '',
    '## Archive Phase Requested Branches',
    '',
    ...archiveRequested.map((branch) => `- \`${branch}\``),
    '',
    '## Archive Phase Results',
    '',
    '| Branch | Classification | Original SHA | Archive Tag | Archive SHA Check | Action | Notes |',
    '|---|---|---|---|---|---|---|',
    ...archiveResults.map(
      (row) =>
        `| \`${row.branch}\` | ${row.classification ?? '—'} | ${row.originalSha ?? '—'} | ${row.archiveTag ?? '—'} | ${row.tagShaMatch ?? '—'} | ${row.action} | ${row.status} |`
    ),
    '',
  ].filter(Boolean);

  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');

  const shouldFail = runFailed || !directPhaseValidationPassed || !archivePhaseValidationPassed;
  if (shouldFail) {
    process.exitCode = 1;
  }
}

async function main() {
  const startTime = new Date().toISOString();
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '/').split('/');
  if (!owner || !repo) {
    throw new Error('GITHUB_REPOSITORY env var must be set to "owner/repo".');
  }

  if (!existsSync(DIRECT_APPROVED_LIST_PATH)) {
    throw new Error(`Direct approved list not found at ${DIRECT_APPROVED_LIST_PATH}`);
  }

  if (!existsSync(ARCHIVE_APPROVED_LIST_PATH)) {
    throw new Error(`Archive approved list not found at ${ARCHIVE_APPROVED_LIST_PATH}`);
  }

  if (!existsSync(AUDIT_SOURCE_PATH)) {
    throw new Error(`Audit source not found at ${AUDIT_SOURCE_PATH}`);
  }

  const directBranches = parseApprovedBranches(readFileSync(DIRECT_APPROVED_LIST_PATH, 'utf8'));
  const archiveBranches = parseApprovedBranches(readFileSync(ARCHIVE_APPROVED_LIST_PATH, 'utf8'));
  const currentBranch = run('git rev-parse --abbrev-ref HEAD') ?? '';

  validateApprovedLists({
    directBranches,
    archiveBranches,
    currentBranch,
  });

  const { directMap, archiveMap } = parseAuditClassifications(readFileSync(AUDIT_SOURCE_PATH, 'utf8'));

  const context = {
    owner,
    repo,
    currentBranch,
    directAuditMap: directMap,
    archiveAuditMap: archiveMap,
  };

  const directResults = [];
  for (const branch of directBranches) {
    const row = await evaluateDirectBranch(branch, context);
    directResults.push(row);
  }

  const directPhaseValidationPassed = directResults.every((row) => row.status === 'READY');
  let directPhaseDeleted = 0;

  if (directPhaseValidationPassed) {
    for (const row of directResults) {
      await deleteRemoteBranch(owner, repo, row.branch);
      row.action = 'deleted';
      row.status = 'DELETED';
      directPhaseDeleted += 1;
    }
  } else {
    for (const row of directResults) {
      row.action = row.status === 'READY' ? 'blocked' : row.action;
      if (row.status === 'READY') {
        row.status = 'BLOCKED – direct phase validation failed';
      }
    }
  }

  const archiveResults = [];
  for (const branch of archiveBranches) {
    const row = await evaluateArchiveBranch(branch, context);
    row.originalSha = null;
    row.archiveTag = null;
    row.tagShaMatch = 'NO';
    archiveResults.push(row);
  }

  const archivePhaseValidationPassed = archiveResults.every((row) => row.status === 'READY');
  const archiveTagDate = formatDateUtc();
  let archivePhaseDeleted = 0;
  let runFailed = false;
  let failureReason = '';

  if (archivePhaseValidationPassed) {
    for (const row of archiveResults) {
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
        archivePhaseDeleted += 1;
      } catch (error) {
        row.action = 'failed';
        row.status = `FAIL – ${error.message}`;
        runFailed = true;
        failureReason = `Stopped archive phase at branch "${row.branch}" due to archive verification failure.`;

        const index = archiveResults.indexOf(row);
        for (let i = index + 1; i < archiveResults.length; i += 1) {
          if (archiveResults[i].status === 'READY') {
            archiveResults[i].action = 'blocked';
            archiveResults[i].status = 'BLOCKED – archive phase halted after prior failure';
          }
        }

        deleteLocalTagIfExists(row.archiveTag ?? '');
        break;
      }

      deleteLocalTagIfExists(row.archiveTag ?? '');
    }
  } else {
    for (const row of archiveResults) {
      row.action = row.status === 'READY' ? 'blocked' : row.action;
      if (row.status === 'READY') {
        row.status = 'BLOCKED – archive phase validation failed';
      }
    }
  }

  await writeReport({
    startTime,
    owner,
    repo,
    directRequested: directBranches,
    archiveRequested: archiveBranches,
    directResults,
    archiveResults,
    directPhaseDeleted,
    archivePhaseDeleted,
    directPhaseValidationPassed,
    archivePhaseValidationPassed,
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
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  });
}

export {
  ARCHIVE_APPROVED_LIST_RELATIVE_PATH,
  ARCHIVE_TAG_PREFIX,
  AUDIT_SOURCE_RELATIVE_PATH,
  DIRECT_APPROVED_LIST_RELATIVE_PATH,
  MAX_ARCHIVE_BRANCHES,
  MAX_DIRECT_BRANCHES,
  MAX_TOTAL_BRANCHES,
  PROTECTED_BRANCHES,
  REFERENCE_SCAN_EXCLUDED_PATHS,
  REFERENCE_SEARCH_PATHS,
  REQUIRED_ARCHIVE_AUDIT_HEADER,
  REQUIRED_DIRECT_AUDIT_HEADER,
  SPECIAL_BRANCH_PREFIXES,
  buildArchiveTag,
  filterReferenceHits,
  findReferences,
  hasDangerousChars,
  isSpecialProtectedBranch,
  parseApprovedBranches,
  parseAuditClassifications,
  parseAuditSection,
  resolveRemoteTagTargetSha,
  validateApprovedLists,
};
