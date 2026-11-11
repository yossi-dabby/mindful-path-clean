# PR #40 live verification — 2026-11-11

Baseline: merged commit `d1b4acbc7d8f95f8722a14b2f6f8c2de7f8a41d5`.
Base44 reported that revision ready. These checks used two existing synthetic QA
accounts and synthetic PDF/audio data against the deployed service. No patient
records, account credentials, signed links or storage identifiers are included here.
API results are not a desktop/Android UI certification.

## Observed passing checks

| Area | Live observation |
| --- | --- |
| Backend availability | `accountAccess`, `fileDeletion`, `uploadAttachment`, `extractPdfText` and `transcribeMobileAudio` responded to actual requests. |
| Record rules | All 39 affected remote RLS definitions matched the merged definitions. Live CRUD was sampled on MoodEntry and ThoughtJournal, not on all 39 entities. |
| Protected fields | Both ordinary accounts were denied first assignment of the protected policy/latch fields (403). A temporarily elevated app administrator was also denied changes. |
| Existing adults | Status synchronized the locked User projection without requiring another declaration. |
| Two-account isolation | Both accounts could create/read their own mood and journal rows. Cross-account read/update/delete attempts were denied in both directions; original rows remained unchanged. |
| Ineligible accounts | Stale age policy, declined age and account-deletion latch each blocked private record access and server file/extraction/transcription calls. Privacy deletion status remained available. Declined/deleting users could not re-enable themselves. |
| Concurrency sample | A decline overlapping four status calls completed, and subsequent direct record reads were denied. This is a bounded observation, not proof of transactional isolation. |
| Private attachments | Own PDF/audio upload, opening and renewal returned matching bytes. Foreign and anonymous renewal were denied. |
| Extraction | Owner PDF extraction found the synthetic text; foreign/anonymous extraction was denied. The server audio route returned nonempty transcription. |
| Expiry | Original capabilities returned 403 after more than five minutes. This was tested separately from deletion or age revocation. |
| File deletion request | A synthetic file request was durable and idempotent. Its earlier capability was denied within its validity period, and renewal/new upload were blocked. |
| Deletion isolation/operations | The other account could still open its own file and could not see the request in its own status. Ordinary operator actions returned 403. A temporarily elevated QA administrator exported the one-file manifest; premature confirmation and reference cleanup returned 409. The request remained `requested`, with no fabricated provider confirmation. |
| Forms review permission | Both eligible adult accounts without forms-review approval were denied the pilot route. An ordinary user could not grant forms permission to the other account. This does not replace a positive authorized-library UI test. |

## Found: an issued link outlived age revocation

Before this follow-up, a newly issued PDF link still returned the original plaintext
84 seconds after issuance, even though its owner had declined age eligibility.
New server calls and record reads were correctly blocked. The GET/HEAD download
path validated capability expiry and file-deletion state but did not re-read the
owner's age eligibility.

The follow-up checks the authoritative declaration and locked User fields using
the service role. Missing, foreign, duplicate, expired or revoked state fails closed.
The handler checks before storage access and again before returning decrypted bytes
or HEAD metadata. Regression tests exercise real encryption, an already-issued
capability, a stale positive projection, absent caller session, provider failure,
and revocation while storage is being fetched. Existing byte-range, expiry, owner
renewal and cross-account denial tests remain intact.

This correction is **not yet verified on the live service**. After reviewed merge
and backend publication, repeat valid -> issue link -> revoke age -> open the same
link, including GET and HEAD, and confirm 403. Restore the synthetic account and
verify PDF/audio opening, byte ranges and renewal still work.

## Remaining acceptance work

- Complete the provider-assisted erasure lifecycle with a real support receipt and
  written confirmation before clearing references. No support confirmation may be
  fabricated to make this test pass.
- Exercise a legacy/plaintext + encrypted replacement pair and an upload racing
  with a deletion request. Unit tests cover these paths; they are not yet claimed
  as live passes here.
- Complete desktop/Android UI checks for entry states, account switching, request
  reload and upload/open/refresh/reopen on the final deployed revision.
- Get Base44's app-specific answer for direct agent and storage/integration gates,
  permanent conversation/memory erasure, backups, retention and contractual use.
- Multi-record changes are not a documented provider transaction. The extra reads
  narrow races but do not provide a transactional or provider-wide guarantee.

Temporary privilege/age/latch changes are restored after their test phases. The
synthetic file-deletion request deliberately stays pending until actual provider
erasure; test records and storage references must not be discarded prematurely.

## Local regression validation for the follow-up

- All 11,423 unit tests in 378 files passed (including 19 new download regressions).
- The 505 focused attachment/access/deletion/packaging tests passed.
- ESLint, TypeScript and the production build passed. The build retained the local
  unset-app-ID and outdated Browserslist warnings; no deployment was performed.
- Required browser CI and the post-deployment live retest remain separate gates.

## Browser CI environment failure

Run `43033652838` passed shared checks, then all nine browser jobs failed in
`Install Playwright browsers`, before the server or tests started. The smoke,
desktop and mobile logs report `Temporary failure resolving 'azure.archive.ubuntu.com'`
while apt fetched browser fonts/dependencies; there were no Playwright artifacts.
The separate Test Suite passed on Node 20 and 22. A retry of failed jobs was started
on the same revision; the environment follow-up supersedes that retry.

The browser jobs now use the official Playwright `v1.58.2-noble` image, pinned by
registry digest and matched to the lockfile. Its browsers and OS dependencies are
preinstalled. A startup check rejects version mismatch or a missing Chromium
executable. All nine browser jobs, assertions, shards, timeouts and mandatory shared
checks are retained. The container follows the vendor's GitHub Actions guidance:
https://playwright.dev/docs/ci#via-containers
and version-matching guidance: https://playwright.dev/docs/docker#image-tags.
The new environment still requires a full successful CI run; installation success
alone is not an E2E pass.
