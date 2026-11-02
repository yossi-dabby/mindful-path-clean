/**
 * Branch Cleanup Wave 3
 *
 * Safely deletes only the explicitly approved list of merged branches.
 *
 * Safety rules (all must pass before any deletion):
 *   - Branch must exist on origin
 *   - Branch must be fully merged into origin/main
 *   - Branch must have no open PRs
 *   - Branch must not be main, staging-fresh, or the current branch
 *   - Branch name must not contain dangerous shell characters
 *   - Branch must not be referenced in workflows, docs, README*, package.json, or
 *     deployment configs
 *   - Approved list must not exceed 50 entries
 *
 * Usage (invoked by the GitHub Actions workflow only):
 *   node scripts/branch-cleanup-wave-3.mjs
 *
 * Required env vars:
 *   GITHUB_TOKEN        – GitHub token with contents:write permission
 *   GITHUB_REPOSITORY   – owner/repo (e.g. yossi-dabby/mindful-path)
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// ── Constants ──────────────────────────────────────────────────────────────

const APPROVED_LIST_RELATIVE_PATH = 'docs/branch-cleanup-wave-3-approved-list.txt';
const APPROVED_LIST_PATH = resolve(REPO_ROOT, 'docs/branch-cleanup-wave-3-approved-list.txt');
const REPORT_PATH = resolve(REPO_ROOT, 'branch-cleanup-wave-3-report.md');

/** Branches that must NEVER be deleted under any circumstances. */
const PROTECTED_BRANCHES = new Set([
  'main',
  'origin/main',
  'staging-fresh',
  'origin/staging-fresh',
]);

/** Maximum number of branches allowed in the approved list. */
const MAX_BRANCHES = 50;

/**
 * Glob patterns used to search for branch-name references in repo files.
 * If a branch name appears verbatim in any of these paths the branch is skipped.
 */
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

const REFERENCE_SCAN_EXCLUDED_PATHS = new Set([APPROVED_LIST_RELATIVE_PATH]);

// ── Helpers ────────────────────────────────────────────────────────────────

/** Run a shell command and return trimmed stdout. Never throws. */
function run(cmd, { throws = false } = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: REPO_ROOT }).trim();
  } catch (err) {
    if (throws) throw err;
    return null;
  }
}

function splitLines(value) {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Return true if the string contains characters that could be dangerous in shell. */
function hasDangerousChars(name) {
  // Allow alphanumeric, hyphens, underscores, forward slashes, and dots only.
  return /[^a-zA-Z0-9\-_/.]/u.test(name);
}

function parseApprovedBranches(rawContent) {
  return splitLines(rawContent).filter((line) => !line.startsWith('#'));
}

function validateApprovedBranches(branches, currentBranch = '') {
  if (branches.length > MAX_BRANCHES) {
    throw new Error(
      `Approved list contains ${branches.length} branches, which exceeds the limit of ${MAX_BRANCHES}.`
    );
  }

  for (const branch of branches) {
    if (PROTECTED_BRANCHES.has(branch)) {
      throw new Error(`Protected branch "${branch}" found in approved list.`);
    }

    if (hasDangerousChars(branch)) {
      throw new Error(`Branch name "${branch}" contains disallowed characters.`);
    }
  }

  if (currentBranch && branches.includes(currentBranch)) {
    throw new Error(`Current branch "${currentBranch}" is in the approved list.`);
  }
}

/**
 * Check whether a remote branch tip is a strict ancestor of origin/main.
 * Returns true when the branch is fully merged.
 */
function isMergedIntoMain(branch) {
  // git merge-base --is-ancestor <commit> <commit> exits 0 if ancestor, 1 if not.
  const result = run(
    `git merge-base --is-ancestor "origin/${branch}" "origin/main"`,
    { throws: false }
  );
  // run() returns null on non-zero exit, empty string on success (exit 0).
  if (result === '') return true;

  // Double-check with --merged list as a fallback.
  const mergedList = run('git branch -r --merged origin/main') ?? '';
  return mergedList
    .split('\n')
    .map((b) => b.trim().replace(/^origin\//, ''))
    .includes(branch);
}

/** Return true if the remote branch exists on origin. */
function remoteExists(branch) {
  const result = run(`git ls-remote --exit-code --heads origin "${branch}"`, { throws: false });
  return result !== null && result.trim() !== '';
}

function getRemoteBranchInventory({ runCommand = run } = {}) {
  const lsRemoteOutput = runCommand('git ls-remote --heads origin', { throws: false });
  if (lsRemoteOutput !== null) {
    return {
      count: splitLines(lsRemoteOutput).length,
      source: 'git ls-remote --heads origin',
    };
  }

  const localRefsOutput = runCommand(
    'git for-each-ref --format="%(refname:short)" refs/remotes/origin',
    { throws: false }
  );

  return {
    count: splitLines(localRefsOutput).filter((ref) => ref !== 'origin/HEAD').length,
    source: 'git for-each-ref refs/remotes/origin (fallback)',
  };
}

/**
 * Query the GitHub REST API for open PRs whose head matches the branch.
 * Returns the number of open PRs (0 means safe to delete).
 * Throws on API failure so the script can abort safely.
 */
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
      'User-Agent': 'branch-cleanup-wave-3',
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

async function evaluateBranch(branch, { owner, repo } = {}, dependencies = {}) {
  const {
    remoteExistsFn = remoteExists,
    isMergedIntoMainFn = isMergedIntoMain,
    openPrCountFn = openPrCount,
    findReferencesFn = findReferences,
  } = dependencies;

  const row = { branch, exists: false, merged: false, openPrs: 0, refs: [], status: '' };

  row.exists = remoteExistsFn(branch);
  if (!row.exists) {
    row.status = 'SKIP – branch not found on remote (may already be deleted)';
    return { ...row, action: 'skipped' };
  }

  row.merged = isMergedIntoMainFn(branch);
  if (!row.merged) {
    row.status = 'SKIP – branch is NOT merged into origin/main';
    return { ...row, action: 'skipped' };
  }

  row.openPrs = await openPrCountFn(owner, repo, branch);
  if (row.openPrs > 0) {
    row.status = `SKIP – branch has ${row.openPrs} open PR(s)`;
    return { ...row, action: 'skipped' };
  }

  row.refs = findReferencesFn(branch);
  if (row.refs.length > 0) {
    row.status = `SKIP – referenced in: ${row.refs.join(', ')}`;
    return { ...row, action: 'skipped' };
  }

  row.status = 'READY';
  return { ...row, action: 'pending' };
}

/**
 * Search reference files/dirs for the exact branch name.
 * Returns an array of file paths where the name was found.
 */
function filterReferenceHits(
  hits,
  { excludedPaths = REFERENCE_SCAN_EXCLUDED_PATHS } = {}
) {
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
    // Use git grep so we search only tracked files.
    const result = runCommand(
      `git grep -rl --fixed-strings "${branch}" -- "${fullPath}" 2>/dev/null || true`
    );
    if (result) {
      hits.push(...filterReferenceHits(result, { excludedPaths }));
    }
  }
  return [...new Set(hits)];
}

/**
 * Delete a branch via the GitHub REST API (DELETE /repos/{owner}/{repo}/git/refs/heads/{branch}).
 * Returns { deleted: true } on success, { deleted: false, reason } on known-safe skip,
 * or throws on unexpected errors.
 */
async function deleteBranch(owner, repo, branch) {
  const token = process.env.GITHUB_TOKEN;
  const url = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'branch-cleanup-wave-3',
    },
  });

  if (response.status === 204) return { deleted: true };
  if (response.status === 422 || response.status === 404) {
    // 422 = ref already deleted / doesn't exist; treat as benign skip.
    return { deleted: false, reason: `API returned ${response.status} (branch may already be gone)` };
  }

  const body = await response.text();
  throw new Error(
    `Failed to delete branch "${branch}": ${response.status} ${response.statusText} – ${body}`
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const startTime = new Date().toISOString();
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '/').split('/');
  if (!owner || !repo) {
    console.error('ERROR: GITHUB_REPOSITORY env var must be set to "owner/repo".');
    process.exit(1);
  }

  // ── 1. Read and parse approved list ───────────────────────────────────

  if (!existsSync(APPROVED_LIST_PATH)) {
    console.error(`ERROR: Approved list not found at ${APPROVED_LIST_PATH}`);
    process.exit(1);
  }

  const branches = parseApprovedBranches(readFileSync(APPROVED_LIST_PATH, 'utf8'));
  const remoteInventory = getRemoteBranchInventory();

  console.log(`\nApproved list loaded: ${branches.length} branch(es)\n`);
  console.log(
    `Remote branch inventory: ${remoteInventory.count} head(s) via ${remoteInventory.source}\n`
  );

  // ── 2. Basic static validation ─────────────────────────────────────────

  // Determine current HEAD branch (irrelevant in detached-HEAD CI, but check anyway).
  const currentBranch = run('git rev-parse --abbrev-ref HEAD') ?? '';
  try {
    validateApprovedBranches(branches, currentBranch);
  } catch (err) {
    console.error(`ERROR: ${err.message} Aborting.`);
    process.exit(1);
  }

  // ── 3. Per-branch safety validation ───────────────────────────────────

  const results = [];
  console.log('─'.repeat(80));
  console.log('PRE-DELETE SAFETY TABLE');
  console.log('─'.repeat(80));
  console.log(
    `${'Branch'.padEnd(55)} ${'Exists'.padEnd(7)} ${'Merged'.padEnd(7)} ${'OpenPRs'.padEnd(8)} ${'Refs'.padEnd(5)} Status`
  );
  console.log('─'.repeat(80));

  for (const branch of branches) {
    let row;
    try {
      row = await evaluateBranch(branch, { owner, repo });
    } catch (err) {
      row = { branch, exists: true, merged: true, openPrs: 0, refs: [], status: '' };
      row.status = `ABORT – PR API error: ${err.message}`;
      console.error(`\nFATAL: ${row.status}`);
      results.push({ ...row, action: 'aborted' });
      break;
    }

    console.log(
      `${branch.padEnd(55)} ${String(row.exists ? 'yes' : 'no').padEnd(7)} ${String(row.exists ? (row.merged ? 'yes' : 'NO') : '–').padEnd(7)} ${String(row.exists && row.merged ? row.openPrs : '–').padEnd(8)} ${String(row.exists && row.merged && row.openPrs === 0 ? row.refs.length : '–').padEnd(5)} ${row.status}`
    );
    results.push(row);
  }

  console.log('─'.repeat(80));

  if (results.some((row) => row.action === 'aborted')) {
    console.error('\nAborting. No branches were deleted.\n');
    await writeReport({
      startTime,
      owner,
      repo,
      branches,
      results,
      aborted: true,
      remoteInventory,
    });
    process.exit(1);
  }

  // ── 4. Deletion pass ───────────────────────────────────────────────────

  const toDelete = results.filter((r) => r.action === 'pending');
  console.log(`\nBranches to delete: ${toDelete.length}\n`);

  for (const row of toDelete) {
    process.stdout.write(`  Deleting "${row.branch}" … `);
    try {
      const result = await deleteBranch(owner, repo, row.branch);
      if (result.deleted) {
        row.action = 'deleted';
        row.status = 'DELETED';
        console.log('✓ deleted');
      } else {
        row.action = 'skipped';
        row.status = `Skipped: ${result.reason}`;
        console.log(`skipped (${result.reason})`);
      }
    } catch (err) {
      row.action = 'failed';
      row.status = `FAILED: ${err.message}`;
      console.error(`\n  ERROR: ${err.message}`);
      // Stop on unexpected failure.
      await writeReport({
        startTime,
        owner,
        repo,
        branches,
        results,
        aborted: false,
        remoteInventory,
      });
      process.exit(1);
    }
  }

  await writeReport({
    startTime,
    owner,
    repo,
    branches,
    results,
    aborted: false,
    remoteInventory,
  });

  const deleted = results.filter((r) => r.action === 'deleted').length;
  const skipped = results.filter((r) => r.action === 'skipped').length;
  const failed = results.filter((r) => r.action === 'failed').length;

  console.log(`\n${'─'.repeat(80)}`);
  console.log('CLEANUP COMPLETE');
  console.log(`  Deleted : ${deleted}`);
  console.log(`  Skipped : ${skipped}`);
  console.log(`  Failed  : ${failed}`);
  console.log(`  Report  : ${REPORT_PATH}`);
  console.log('─'.repeat(80));

  if (failed > 0) process.exit(1);
}

// ── Report writer ──────────────────────────────────────────────────────────

async function writeReport({ startTime, owner, repo, branches, results, aborted, remoteInventory }) {
  const endTime = new Date().toISOString();
  const deleted = results.filter((r) => r.action === 'deleted');
  const skipped = results.filter((r) => r.action === 'skipped');
  const failed = results.filter((r) => r.action === 'failed' || r.action === 'aborted');

  const lines = [
    '# Branch Cleanup Wave 3 — Report',
    '',
    `**Timestamp (start):** ${startTime}`,
    `**Timestamp (end):** ${endTime}`,
    `**Repository:** ${owner}/${repo}`,
    `**Run aborted:** ${aborted ? 'YES' : 'no'}`,
    '',
    '## Summary',
    '',
    `| Metric | Count |`,
    `|---|---|`,
    `| Branches requested | ${branches.length} |`,
    `| Remote heads observed | ${remoteInventory.count} |`,
    `| Branches deleted | ${deleted.length} |`,
    `| Branches skipped | ${skipped.length} |`,
    `| Failures / aborts | ${failed.length} |`,
    '',
    '## Safety Confirmations',
    '',
    '- ✅ main and staging-fresh were never targeted',
    '- ✅ Only branches in the approved list were processed',
    '- ✅ Approved list did not exceed 50 entries',
    '- ✅ Merge status verified via `git merge-base --is-ancestor` before each deletion',
    '- ✅ Open PR status verified via GitHub REST API before each deletion',
    `- ✅ Remote branch inventory counted via \`${remoteInventory.source}\``,
    `- ✅ Reference check performed across workflows, docs, README, package.json, and deployment configs, excluding only \`${APPROVED_LIST_RELATIVE_PATH}\``,
    '',
    '## Branches Requested',
    '',
    ...branches.map((b) => `- \`${b}\``),
    '',
    '## Deletion Results',
    '',
    '| Branch | Action | Notes |',
    '|---|---|---|',
    ...results.map((r) => `| \`${r.branch}\` | ${r.action} | ${r.status} |`),
    '',
  ];

  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
}

// ── Entry point ────────────────────────────────────────────────────────────
const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isDirectExecution) {
  main().catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

export {
  APPROVED_LIST_RELATIVE_PATH,
  MAX_BRANCHES,
  PROTECTED_BRANCHES,
  REFERENCE_SCAN_EXCLUDED_PATHS,
  REFERENCE_SEARCH_PATHS,
  filterReferenceHits,
  findReferences,
  getRemoteBranchInventory,
  hasDangerousChars,
  evaluateBranch,
  parseApprovedBranches,
  validateApprovedBranches,
};
