/**
 * Branch Cleanup Wave 6
 *
 * Safely deletes only the explicitly approved direct-safe branches for Wave 6.
 *
 * Safety rules (all must pass before any deletion):
 *   - Approved list must not be empty and must not exceed 30 entries
 *   - Branch must exist on origin
 *   - Branch must have no open PRs
 *   - Branch must not be main, staging-fresh, origin/main, origin/staging-fresh,
 *     or the current branch
 *   - Branch name must not contain dangerous shell characters
 *   - Branch must not be referenced in workflows, docs, README, package.json, or
 *     deployment configs, excluding only docs/branch-cleanup-wave-6-approved-list.txt
 *   - Branch must be either git-merged into origin/main or explicitly listed in the
 *     audit-approved PR-merged safe-delete set
 *
 * Usage (invoked by the GitHub Actions workflow only):
 *   node scripts/branch-cleanup-wave-6.mjs
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const APPROVED_LIST_RELATIVE_PATH = 'docs/branch-cleanup-wave-6-approved-list.txt';
const APPROVED_LIST_PATH = resolve(REPO_ROOT, APPROVED_LIST_RELATIVE_PATH);
const REPORT_PATH = resolve(REPO_ROOT, 'branch-cleanup-wave-6-report.md');

const PROTECTED_BRANCHES = new Set([
  'main',
  'origin/main',
  'staging-fresh',
  'origin/staging-fresh',
]);

const MAX_BRANCHES = 30;

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

const SAFE_DELETE_MERGED_PR_BRANCHES = new Set([
  'copilot/add-playwright-e2e-workflow',
  'copilot/fix-data-sync-issue-goals-page',
  'copilot/fix-e2e-routing-issue',
  'copilot/fix-e2e-test-404-errors',
  'copilot/fix-e2e-test-selectors',
  'copilot/restore-missing-features-fix-routing',
  'copilot/stabilize-e2e-tests-for-ci',
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

function hasDangerousChars(name) {
  return /[^a-zA-Z0-9\-_/.]/u.test(name);
}

function parseApprovedBranches(rawContent) {
  return splitLines(rawContent).filter((line) => !line.startsWith('#'));
}

function validateApprovedBranches(branches, currentBranch = '') {
  if (branches.length === 0) {
    throw new Error('Approved list is empty. Add at least one Wave 6 branch before running cleanup.');
  }

  if (branches.length > MAX_BRANCHES) {
    throw new Error(
      `Approved list contains ${branches.length} branches, which exceeds the limit of ${MAX_BRANCHES}.`
    );
  }

  for (const branch of branches) {
    if (!branch) {
      throw new Error('Approved list contains an empty branch name.');
    }

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

function isMergedIntoMain(branch) {
  const result = run(`git merge-base --is-ancestor "origin/${branch}" "origin/main"`, {
    throws: false,
  });

  if (result === '') return true;

  const mergedList = run('git branch -r --merged origin/main') ?? '';
  return mergedList
    .split('\n')
    .map((value) => value.trim().replace(/^origin\//, ''))
    .includes(branch);
}

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
      'User-Agent': 'branch-cleanup-wave-6',
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

function classifyBranch(branch, { isMergedIntoMainFn = isMergedIntoMain } = {}) {
  if (isMergedIntoMainFn(branch)) {
    return 'git-merged into main';
  }

  if (SAFE_DELETE_MERGED_PR_BRANCHES.has(branch)) {
    return 'PR-merged via squash/rebase';
  }

  return null;
}

async function evaluateBranch(branch, { owner, repo } = {}, dependencies = {}) {
  const {
    remoteExistsFn = remoteExists,
    openPrCountFn = openPrCount,
    findReferencesFn = findReferences,
    classifyBranchFn = classifyBranch,
  } = dependencies;

  const row = {
    branch,
    exists: false,
    openPrs: 0,
    refs: [],
    classification: null,
    status: '',
  };

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

  row.refs = findReferencesFn(branch);
  if (row.refs.length > 0) {
    row.status = `FAIL – referenced in: ${row.refs.join(', ')}`;
    return row;
  }

  row.classification = classifyBranchFn(branch);
  if (!row.classification) {
    row.status = 'FAIL – branch is neither git-merged nor in the approved PR-merged audit set';
    return row;
  }

  row.status = 'READY';
  return row;
}

async function deleteBranch(owner, repo, branch) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN environment variable is not set.');

  const url = `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'branch-cleanup-wave-6',
    },
  });

  if (response.status === 204) return { deleted: true };

  const body = await response.text();
  throw new Error(
    `Failed to delete branch "${branch}": ${response.status} ${response.statusText} – ${body}`
  );
}

async function writeReport({
  startTime,
  owner,
  repo,
  branches,
  results,
  aborted,
  remoteInventory,
}) {
  const endTime = new Date().toISOString();
  const deleted = results.filter((row) => row.action === 'deleted');
  const failed = results.filter((row) => row.action !== 'deleted');

  const lines = [
    '# Branch Cleanup Wave 6 — Report',
    '',
    `**Timestamp (start):** ${startTime}`,
    `**Timestamp (end):** ${endTime}`,
    `**Repository:** ${owner}/${repo}`,
    `**Run aborted:** ${aborted ? 'YES' : 'no'}`,
    '',
    '## Summary',
    '',
    '| Metric | Count |',
    '|---|---|',
    `| Branches requested | ${branches.length} |`,
    `| Remote heads observed | ${remoteInventory.count} |`,
    `| Branches deleted | ${deleted.length} |`,
    `| Branches blocked / failed | ${failed.length} |`,
    '',
    '## Safety Confirmations',
    '',
    '- ✅ Wave 6 list was non-empty and did not exceed 30 entries',
    '- ✅ main and staging-fresh were never targeted',
    '- ✅ Only branches in the approved list were processed',
    '- ✅ Open PR status was verified via GitHub REST API before deletion',
    '- ✅ Classification required either git-merged ancestry or the explicit audit PR-merged allowlist',
    `- ✅ Reference checks scanned workflows, docs, README, package, and deployment configs, excluding only \`${APPROVED_LIST_RELATIVE_PATH}\``,
    `- ✅ Remote branch inventory counted via \`${remoteInventory.source}\``,
    '',
    '## Branches Requested',
    '',
    ...branches.map((branch) => `- \`${branch}\``),
    '',
    '## Validation and Deletion Results',
    '',
    '| Branch | Classification | Action | Notes |',
    '|---|---|---|---|',
    ...results.map(
      (row) =>
        `| \`${row.branch}\` | ${row.classification ?? '—'} | ${row.action} | ${row.status} |`
    ),
    '',
  ];

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

  const branches = parseApprovedBranches(readFileSync(APPROVED_LIST_PATH, 'utf8'));
  const remoteInventory = getRemoteBranchInventory();
  const currentBranch = run('git rev-parse --abbrev-ref HEAD') ?? '';

  try {
    validateApprovedBranches(branches, currentBranch);
  } catch (error) {
    console.error(`ERROR: ${error.message} Aborting.`);
    process.exit(1);
  }

  console.log(`\nApproved list loaded: ${branches.length} branch(es)\n`);
  console.log(`Remote branch inventory: ${remoteInventory.count} head(s) via ${remoteInventory.source}\n`);
  console.log('─'.repeat(110));
  console.log('PRE-DELETE SAFETY TABLE');
  console.log('─'.repeat(110));
  console.log(
    `${'Branch'.padEnd(50)} ${'Exists'.padEnd(7)} ${'OpenPRs'.padEnd(8)} ${'Refs'.padEnd(5)} ${'Classification'.padEnd(28)} Status`
  );
  console.log('─'.repeat(110));

  const results = [];
  for (const branch of branches) {
    let row;
    try {
      row = await evaluateBranch(branch, { owner, repo });
    } catch (error) {
      row = {
        branch,
        exists: true,
        openPrs: 0,
        refs: [],
        classification: null,
        status: `FAIL – PR API error: ${error.message}`,
      };
    }

    row.action = row.status === 'READY' ? 'pending' : 'blocked';
    console.log(
      `${branch.padEnd(50)} ${String(row.exists ? 'yes' : 'no').padEnd(7)} ${String(row.exists ? row.openPrs : '–').padEnd(8)} ${String(row.exists ? row.refs.length : '–').padEnd(5)} ${String(row.classification ?? '—').padEnd(28)} ${row.status}`
    );
    results.push(row);
  }

  console.log('─'.repeat(110));

  if (results.some((row) => row.action !== 'pending')) {
    console.error('\nAborting. All branches must pass validation before any deletion occurs.\n');
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

  console.log(`\nAll ${results.length} branches passed validation. Starting deletions.\n`);

  for (const row of results) {
    process.stdout.write(`  Deleting "${row.branch}" … `);
    await deleteBranch(owner, repo, row.branch);
    row.action = 'deleted';
    row.status = 'DELETED';
    console.log('✓ deleted');
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

  console.log(`\n${'─'.repeat(110)}`);
  console.log('CLEANUP COMPLETE');
  console.log(`  Deleted : ${results.length}`);
  console.log(`  Report  : ${REPORT_PATH}`);
  console.log('─'.repeat(110));
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
  MAX_BRANCHES,
  PROTECTED_BRANCHES,
  REFERENCE_SCAN_EXCLUDED_PATHS,
  REFERENCE_SEARCH_PATHS,
  SAFE_DELETE_MERGED_PR_BRANCHES,
  classifyBranch,
  evaluateBranch,
  filterReferenceHits,
  findReferences,
  getRemoteBranchInventory,
  hasDangerousChars,
  parseApprovedBranches,
  validateApprovedBranches,
};
