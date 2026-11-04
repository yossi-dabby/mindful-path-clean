# Hebrew P3 batch 01: bounded multi-domain expansion

3 November 2026. The owner reported PRs #10–11 merged and verified on the public
site, then requested a larger safe batch and removal of the obsolete maintenance
and planned-library blocks. This document records a new implementation scope;
the recovered plan did not prescribe per-domain quantities.

## Content added

| Unit | Topic | New PDFs | Pages | Track total after batch |
| --- | --- | ---: | ---: | ---: |
| MOOD-02 | Activity constraints, context and support | 9 | 12 | 18 |
| SELF-01 | Event-specific self-criticism and fair description | 9 | 12 | 9 |
| PERF-01 | Helpful requirements versus burdensome standards | 9 | 12 | 9 |
| REG-01 | Early emotional signals and context-appropriate response | 9 | 12 | 9 |
| EXEC-01 | Starting a task with appropriate conditions | 9 | 12 | 9 |
| SOC-01 | Expressing a need or boundary in a safe context | 9 | 12 | 9 |
| **Total additions** | **Five new tracks and a second MOOD unit** | **54** | **72** | |

Each unit: one shared four-page clinician guide + four age-specific worksheets
+ four age-specific practice sheets. These are 18 new material types / 54 PDF
variants, not 54 different clinical units. Original 154 + MOOD-01 9 + this batch
54 = **217 PDFs / 280 pages**. Every original record and every original PDF byte
is preserved. Each age gains 12 variants; shared guides gain six.

All six P3 expansion tracks now have an initial unit; only MOOD has two. This is
not completion of those tracks. P4 topics remain unimplemented. Unit specifications,
age differences, overlap decisions and sources live in `content/hebrew-forms/p3-01`.
Clinical and final rights approvals remain outstanding and are not inferred from
technical tests, GitHub merge or live verification.

## Backend release contract

| Endpoint | Version | Count | Consumer |
| --- | --- | ---: | --- |
| `catalog` | 0.2 | 154 | Original clients |
| `catalog-mood-01` | 0.3-mood-01 | 163 | PR #11 clients |
| `catalog-p3-01` | 0.4-p3-01 | 217 | New P3 clients |

All three releases have independently pinned canonical SHA-256 digests. The
server validates all 217 PDF signatures, byte lengths and hashes at startup and
rejects missing, duplicate or extra assets. The new compact JSON is below the
unchanged 512 KiB proxy read limit. The proxy handler itself needs no logic change:
it uses the existing shared allowlist and catalog validator.

The existing client continues requesting 163 until the companion UI change is
merged. No widening of role/language access, token forwarding, redirect behavior,
cache policy or upstream destination is required. No AI/ALL_FORMS registration,
patient entity, stored answer, public source path or new dependency is added.

## Rollout and rollback

Merge the content/backend PR before its companion UI PR. GitHub is the source
of truth. After synchronization, save the Base44 function with its updated
`releases.js`, publish, then verify in Railway, Base44 preview and published app.
The UI requests 217 and may fall back to 163, then 154, only when the respective
endpoint explicitly returns 400/404. Authentication, network, integrity and
server failures must remain visible; they never justify silent fallback.

To roll back the UI, retain the older catalog endpoints and files. Reverting the
UI returns to 163 without changing the original assets. Do not delete active
files while a client can still select their catalog.

Live acceptance requires an authenticated administrator in Hebrew: count 217,
nine track buttons after selecting an age, MOOD with two units, one unit in each
new track, three cards per unit/age, real PDF opening and matching download hashes,
back navigation and mobile layout. The obsolete maintenance/planned-architecture
blocks should be absent; non-admin/other-language views keep a localized empty
state and no access to draft files. Public-site verification of the earlier
163-file release does not verify this new release.

## Validation boundaries

Offline QA covers all 54 HTML layouts and 72 PDF pages, fictional short/long
filling, original-file preservation and all 217 HTTP/proxy file hashes. Unit tests
also reject changed catalog metadata and cross-release substitution. CI runs both
MOOD and P3 source checks plus the browser suites. Local fixture E2E substitutes
platform identity and service location; it does not prove production networking
or professional content approval. Record final test results in the PR descriptions.
