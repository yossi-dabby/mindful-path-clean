/**
 * Branch Cleanup Wave 7A (Archive Tag + Delete)
 *
 * Safely archives and deletes only explicitly approved abandoned WIP Copilot branches.
 *
 * Safety rules (all must pass before any branch deletion):
 *   - Approved list must be non-empty and must not exceed 25 entries
 *   - Branch must not be protected/special, current branch, or dangerous
 *   - Branch must exist on origin and have no open PRs
 *   - Branch must be classified as SAFE_DELETE_ABANDONED_WIP in the audit source
 *   - Branch must have no blocking references in workflows/docs/README/package/deploy config
 *     (excluding docs/branch-cleanup-wave-7a-approved-list.txt and docs/remaining-branch-reduction-audit.md)
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

const APPROVED_LIST_RELATIVE_PATH = 'docs/branch-cleanup-wave-7a-approved-list.txt';
const APPROVED_LIST_PATH = resolve(REPO_ROOT, APPROVED_LIST_RELATIVE_PATH);
const AUDIT_SOURCE_RELATIVE_PATH = 'docs/remaining-branch-reduction-audit.md';
const AUDIT_SOURCE_PATH = resolve(REPO_ROOT, AUDIT_SOURCE_RELATIVE_PATH);
const REPORT_PATH = resolve(REPO_ROOT, 'branch-cleanup-wave-7a-report.md');

const MAX_BRANCHES = 25;
const ARCHIVE_TAG_PREFIX = 'archive/branch-cleanup-wave-7a';
const REQUIRED_AUDIT_SECTION_HEADER = '### 2c. SAFE_DELETE_ABANDONED_WIP';

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
    throw new Error('Approved list is empty. Add at least one Wave 7A branch before running cleanup.');
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

function remoteExists(branch) {
  const result = run(`git ls-remote --exit-code --heads origin "${branch}"`, { throws: false });
  return result !== null && result.trim() !== '';
}

async function openPrCount(owner, repo, branch) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN environment variable is not set.');

  const url =
    `https://api.github.com/repos/${owner}/${repo}/pulls` +
    `?head=${encodeURIComponent(owner + ':' + branch)}&state=open&per_page=5`;

  const response = await fetch(url, {
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'branch-cleanup-wave-7a-archive',
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API error checking open PRs for branch "${branch}": ` +
        `${response.status} ${response.statusText}`
    );
  }

  const prs = await response.json();
  return Array.isArray(prs) ? prs.length : 0;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseAuditAbandonedWipBranches(auditContent) {
  const lines = String(auditContent ?? '').split('\n');
  const sectionIndex = lines.findIndex((line) =>
    line.trim().startsWith(REQUIRED_AUDIT_SECTION_HEADER)
  );

  if (sectionIndex < 0) {
    throw new Error(`Required audit section "${REQUIRED_AUDIT_SECTION_HEADER}" was not found.`);
  }

  const tableHeaderIndex = lines.findIndex(
    (line, index) => index > sectionIndex && line.trim() === TABLE_HEADER
  );

  if (tableHeaderIndex < 0) {
    throw new Error('Could not find abandoned WIP audit table header.');
  }

  const abandoned = new Map();

  for (let i = tableHeaderIndex + 2; i < lines.length; i += 1) {
    const line = lines[i].trim();

    if (!line) continue;
    if (line.startsWith('---')) break;
    if (line.startsWith('### ')) break;
    if (!line.startsWith('|')) continue;

    const cells = line.split('|').map((cell) => cell.trim());
    if (cells.length < 7) continue;

    const branchCell = cells[1] ?? '';
    if (!branchCell.startsWith('`') || !branchCell.endsWith('`')) continue;

    const branch = branchCell.slice(1, -1);
    const ageMatch = (cells[3] ?? '').match(/^(\d+)d$/);
    if (!ageMatch) continue;

    abandoned.set(branch, {
      branch,
      lastCommitDate: cells[2],
      ageDays: Number(ageMatch[1]),
      pr: cells[4],
      closedDate: cells[5],
    });
  }

  return abandoned;
}

function resolveRemoteBranchSha(branch) {
  const escaped = escapeRegExp(branch);
  const output = run(`git ls-remote --heads origin "${branch}"`, { throws: true });
  const line = splitLines(output).find((value) => value.endsWith(`refs/heads/${branch}`));

  if (!line || !new RegExp(`^[0-9a-f]{40}\\s+refs/heads/${escaped}$`, 'u').test(line)) {
    throw new Error(`Could not resolve remote SHA for branch "${branch}".`);
  }

  return line.split(/\s+/u)[0];
}

function formatDateUtc() {
  const now = new Date();
  const y = String(now.getUTCFullYear());
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function buildArchiveTag(branch, datePart = formatDateUtc()) {
  return `${ARCHIVE_TAG_PREFIX}/${datePart}/${branch}`;
}

function createAnnotatedTag(tagName, targetSha, branch) {
  const message = [
    'Branch Cleanup Wave 7A archive tag',
    `Branch: ${branch}`,
    `Original SHA: ${targetSha}`,
    `Created at: ${new Date().toISOString()}`,
  ].join('\n');

  run(`git tag -a "${tagName}" "${targetSha}" -m "${message}"`, { throws: true });
}

function pushTag(tagName) {
  run(`git push origin "refs/tags/${tagName}"`, { throws: true });
}

function remoteTagExists(tagName) {
  const output = run(`git ls-remote --tags origin "refs/tags/${tagName}"`, { throws: false });
  return output !== null && splitLines(output).length > 0;
}

function resolveRemoteTagTargetSha(tagName) {
  const peeled = run(`git ls-remote --tags origin "refs/tags/${tagName}^{}"`, { throws: false });
  if (peeled) {
    const line = splitLines(peeled)[0];
    if (line) return line.split(/\s+/u)[0];
  }

  const direct = run(`git ls-remote --tags origin "refs/tags/${tagName}"`, { throws: false });
  if (direct) {
    const line = splitLines(direct)[0];
    if (line) return line.split(/\s+/u)[0];
  }

  return null;
}

function deleteLocalTagIfExists(tagName) {
  run(`git tag -d "${tagName}"`, { throws: false });
}

async function deleteRemoteBranch(owner, repo, branch) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN environment variable is not set.');

  const url = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'branch-cleanup-wave-7a-archive',
    },
  });

  if (response.status === 204) return;

  const body = await response.text();
  throw new Error(
    `Failed to delete branch "${branch}": ${response.status} ${response.statusText} – ${body}`
  );
}

async function evaluateBranch(branch, context, dependencies = {}) {
  const {
    owner,
    repo,
    currentBranch,
    abandonedAuditMap,
    referenceSearchPaths = REFERENCE_SEARCH_PATHS,
  } = context;

  const {
    remoteExistsFn = remoteExists,
    openPrCountFn = openPrCount,
    findReferencesFn = findReferences,
  } = dependencies;

  const row = {
    branch,
    exists: false,
    openPrs: 0,
    refs: [],
    auditClassification: null,
    status: '',
  };

  if (PROTECTED_BRANCHES.has(branch)) {
    row.status = 'FAIL – protected branch name';
    return row;
  }

  if (isSpecialProtectedBranch(branch)) {
    row.status = 'FAIL – special/protected branch prefix';
    return row;
  }

  if (currentBranch && branch === currentBranch) {
    row.status = 'FAIL – current branch cannot be targeted';
    return row;
  }

  row.exists = remoteExistsFn(branch);
  if (!row.exists) {
    row.status = 'FAIL – branch not found on remote';
    return row;
  }

  row.openPrs = await openPrCountFn(owner, repo, branch);
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
    '# Branch Cleanup Wave 7A Archive — Report',
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

      createAnnotatedTag(result.archiveTag, result.originalSha, branch);
      pushTag(result.archiveTag);

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
  validateApprovedBranches,
};
