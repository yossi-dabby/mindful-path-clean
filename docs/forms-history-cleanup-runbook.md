# Retired forms: history and stored-copy cleanup

Date: 2026-10-30. Active-content retirement PR #1043 was merged and published.

## Status

The history rewrite is **prepared and verified locally only**. No existing GitHub
branch/tag was rewritten; tooling is delivered on a separate maintenance branch.
No asset, checkpoint, deployment or cache was changed. The live source
is `f42cbc102a2b59a6372aca619070e553a1caa3b7` with tree
`a29ffb451da6209aeba68593dc62e6dd2c796130` at the time of the audit.

| Finding | Verified result |
| --- | --- |
| Remote refs | 136 branches, 208 tags, 1,041 read-only pull refs |
| Local rewrite | All 5,974 commits retained, including merge topology |
| Retired historical paths | 1,837, including 1,763 PDF locations/renames |
| Unique historical PDF blobs | 968 / 902,010,187 uncompressed bytes |
| Total removed content blobs | 1,239 / 959,481,635 uncompressed bytes |
| Reachable retired paths/blobs after local rewrite | 0 / 0 |
| Published main tree after local rewrite | Identical, byte for byte |
| Filtered mirror pack | Approximately 15.72 MiB |
| Verified branches/tags bundle | 15,516,046 bytes in this audit |
| Baseline local pack / GitHub reported size | About 775 MiB / 793,546 KiB |

The smaller pack is a **local result**, not a measurement of reclaimed GitHub
server storage. Historical versions and moves explain why these PDF counts and
uncompressed bytes exceed the 383 PDFs / 673,530,263 bytes removed from the
then-current tree in September.

The rewrite removes retired form assets/manifests/catalogs and old content-bearing
versions of package definitions, the generated index, workbook metadata and the
intent resolver. It preserves every blob present at the published tip, including
empty compatibility exports and the reusable ingestion architecture. Negative
test fixtures and historical audit prose can still name retired IDs.

## Storage audit

Connected Base44 app: `69504b725a07f5aa75aeaf7d`.

- The complete returned media library contained 20 assets, well below the
  endpoint's 500-item cap. PDF, ZIP, `cbt` and `forms` queries returned zero.
  The 20 other images/document assets were left intact.
- The newest 340 checkpoints were enumerated and their referenced Git trees
  independently inspected. 237 contained 383 PDFs each; four contained 388;
  99 contained no PDFs. 98 of those 99 retained the withdrawn standby catalog.
  Only the latest audited checkpoint had neither PDFs nor that catalog.
- This is a **bounded sample, not a complete checkpoint inventory**. A separate
  query confirmed checkpoints exist beyond offset 2,000. The snapshot range
  inspected was 2026-08-28 through 2026-10-30.
- The current published checkpoint is `6ae46c95fcf79872ffd81090`, created at
  2026-10-30T10:08:21.615Z and deployed at 2026-10-30T10:09:31.932Z. Preserve it
  and any newer clean checkpoints.
- A representative older checkpoint, `6a914275b8ea80c2077ecb32`, points to
  `44c884b00fe92a4876477400ba899d6b4e9b38bb`, whose tree has 383 PDFs.
  Unauthenticated HTTP probes of both current/old preview hosts returned 401;
  downloadable bytes and cache invalidation were not verified by those probes.
- GitHub Releases: zero. Actions artifacts: 141, totaling 3,085,998,687 bytes,
  created from 2026-10-08 onward. They are typecheck logs, E2E results/server
  logs and one live-agent diagnostic artifact. No artifact was proven to contain
  retired PDFs. They were not deleted merely because they were large.
- GitHub Actions caches: two npm caches, totaling 231,495,960 bytes. Their keys
  identify package-manager caches, not app build archives. They were retained.

Do not delete user uploads, conversations, recordings, general app illustrations,
test evidence or unrelated knowledge records as part of form retirement.

## Current blockers

1. `main` is protected. Reading its protection settings through the current
   GitHub connection returned **403 Resource not accessible by integration**.
   Normal repository content access does not confer administration access.
2. A Git push dry run through the available shell failed because no authenticated
   Git transport is configured. The connected tools cannot upload an entire
   rewritten Git object graph through Git transport or update all tag refs.
3. GitHub pull refs are read-only. Updating branches/tags does not remove the old
   pull refs, cached SHA views or provider-held objects. GitHub documents that
   support does not purge non-sensitive data on request. These retired worksheets
   have not been represented as a credential leak or sensitive-data incident.
4. The discovered Base44 checkpoint API has list, read, create, restore and retry
   operations, with **no delete/purge operation**. Its catalog also exposes no
   deployment-history/CDN-purge operation. Removing a media-library item cannot
   remove a saved code checkpoint/build.

Consequently, force-updating `main` alone would leave the stated full-cleanup
goal incomplete. No partial remote rewrite was attempted. Completing provider
storage cleanup requires a provider-supported operation. A separate clean
repository/hosting migration would be an additional architecture/administration
decision and has not been performed.

## Repeat the verified preparation

The manual **Prepare forms history cleanup (read only)** Actions workflow has
only `contents: read`. Run it on main with the full current main SHA after this
tooling is merged. It checks the pinned filter-repo download, exercises synthetic
Git repositories, scans a fresh mirror, verifies the unchanged published tree,
runs full Git integrity checks and saves a sanitized bundle/report for three
days. It cannot publish a rewrite or delete anything remotely.

Equivalent local commands, from a clean checkout, with git-filter-repo v2.47.0
downloaded and checked against SHA-256
`67447413e273fc76809289111748870b6f6072f08b17efe94863a92d810b7d94`:

```bash
git clone --mirror https://github.com/yossi-dabby/mindful-path.git /tmp/forms-history.git
python scripts/maintenance/prepare_forms_history_cleanup.py \
  --mirror /tmp/forms-history.git \
  --expected-main FULL_CURRENT_MAIN_SHA \
  --output-dir /tmp/forms-history-plan \
  --filter-repo /absolute/path/to/git-filter-repo.py
```

The output directory must be new. Use a disposable bare mirror. A stale main,
active replacement forms, unattributed PDF paths, changed published tree, missing
objects or unexpected ref/commit loss abort preparation. Never use a working
repository or an unreviewed `git push --mirror` for publication.

## Publication when the administrative blockers are resolved

Coordinate writers, including Base44 sync, so old clones cannot reintroduce the
withdrawn object graph. The source tree stays identical, but commit/tag signatures
cannot survive a rewrite; tooling that pins historical SHAs needs the new map.
Check that no new pull request or branch work appeared and regenerate the plan
if any writable remote ref changed.

An administrator must provide an authenticated Git transport authorized for the
affected branches/tags. Repository protections remain in force; the tool never
edits, disables or bypasses them. When the owner has arranged an authorized
maintenance window and resolved the provider-retention scope, the reviewed
publication command is:

```bash
python scripts/maintenance/publish_forms_history_cleanup.py \
  --mirror /tmp/forms-history.git \
  --report /tmp/forms-history-plan/report.json \
  --apply
```

It checks every branch/tag against the saved snapshot, then uses one **atomic
push with explicit per-ref leases**. A server/protection rejection gets no
per-ref fallback. It does not delete branches/tags or push PR refs. After success
it independently verifies every writable remote ref. Even that success reports
PR/provider storage as not purged.

After publication, verify a fresh clone has no targeted paths/blobs, verify
Base44 against the rewritten main, preserve the existing Forms Library UI,
and test unavailable-form responses without modifying personal data. Re-clone
developer/agent workspaces before resuming writes. A smaller fresh clone does
not establish that GitHub's server GC or Base44's storage/CDN purge completed.

## Base44 provider request to complete the blocked part

For app `69504b725a07f5aa75aeaf7d`, remove the withdrawn therapeutic-form PDF
objects and their older source/build/checkpoint/CDN copies. Match retired Git
blob/path inventories, including old moves under `public/forms/`,
`public/children_cbt_core_en/`, `adolescents_cbt_core_he_series_1/` and `cbt-core/`.
Use the prepared report/path/blob inventories for attribution. The 340-checkpoint
sample above demonstrates retained versions but is not the full purge list.

Preserve the currently published clean checkpoint `6ae46c95fcf79872ffd81090`,
newer clean versions, the current app's source/UI/agents/entities, personal data,
unrelated uploads and general app media. Please identify an operation that can
remove those historical objects without restoring an old version, disconnecting
the app or deleting the entire application; confirm CDN invalidation and the
retention/garbage-collection result. No support message has been sent by the agent.

## Primary references

- [GitHub: removing data from repository history, side effects and provider limits](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [git-filter-repo v2.47.0](https://github.com/newren/git-filter-repo/tree/v2.47.0)
- [Base44: delete asset scope](https://docs.base44.com/api-reference/delete-asset)

## Validation

Six Python integration tests cover branch/tag/PR-ref filtering, unchanged main
tree/commit count, stale-main and installed-content rejection, moved-remote
rejection, a real atomic push to a throwaway bare repository, and the absence of
partial retries after a simulated protected-branch rejection. The actual
5,974-commit mirror passed the same prepare/verify pipeline and full Git fsck.

Application lint, types, unit suite and build are recorded on the PR. This change
adds maintenance tooling/documentation only; it does not edit application source,
clinical prompts, entity schemas, safety filters, production functions or data.
