# Retired therapeutic forms: active-content cleanup

Date: 2026-10-30. Baseline: `4be2eb8bb263d62ce76be7eb3b6be91e2bf9d30d`.

## Result and scope

The owner authorized removing the old illustrated content while retaining the
Forms Library architecture for lighter replacement PDFs. This change removes
active catalog/source material. It does not rewrite Git history, merge, deploy,
purge historical releases/backups/CDN caches, or edit user conversations.

The baseline tree already contained zero PDFs. Its historical removal inventory
records 383 PDFs / 673,530,263 bytes; those binary bytes are **not** counted as
newly removed by this PR.

| Item | Before | After |
| --- | ---: | ---: |
| Standby catalog records | 493, unapproved | 0 |
| Installed generated-index records | 0 | 0 |
| Legacy populated package modules | 8 | 0 (empty named-export compatibility slots retained) |
| Old public manifests/readmes/upload-wrapper files | 41 / 216,275 bytes | 0 |
| Illustrated PDF binaries in current tree | 0 | 0 |
| Old workbook keyword metadata / built-in package intent aliases | present | removed |

The deleted standby JSON was 508,043 bytes; populated package definitions were
382,983 bytes before replacement with small empty compatibility exports. This
is source-content cleanup, not a claim of a 674 MB reduction in this release.

## Architecture retained

`src/pages/TherapeuticForms.jsx`, all `src/components/forms/` components,
taxonomy, routes, view-mode storage, navigation history, PDF viewer and shared
open/download implementations remain byte-for-byte unchanged. The maintenance
page keeps the same audience/collection architecture; one explanatory line is
updated in all seven languages to accurately say that no forms are installed.

The generator, canonical generated index, registry APIs, language/audience
filters, eligibility gates and AI file-metadata contract remain. Compatibility
collection exports are empty/frozen; no removed file locations, titles or
clinical matching descriptions remain in those modules. Forms policy version
changes naturally with the catalog; the existing session policy-refresh
mechanism remains intact.

The generic resolver derives approved IDs, slugs and intent phrases from current
installed metadata only. Old package-ID/number-conversion tables and hardcoded
workbook shortcuts were removed. Unknown identifiers do not fall through to
nearby keyword matches. The disabled-content state is a valid empty registry;
active-content mode still reports a broken empty registry as an error.

Temporary future-content tests discovered an existing `SUPPORTED_LANGUAGES`
ReferenceError in fallback PDF discovery. It now uses the already-declared
`SUPPORTED_FORM_LANGUAGES` set. New manifest-backed PDFs were ingested in an
isolated temporary directory for all seven languages; no test file was
installed into the application.

## Runtime/source attribution checks

Read-only queries against the connected production app found zero matching
records using retired form path/ID patterns (`/forms/`, `children[-_]cbt`,
`adolescents[-_]cbt`) in:

- Resource: URL / slug / source
- Psychoeducation: slug / source
- Exercise: slug / source / media URLs
- JournalTemplate: slug
- ExternalKnowledgeSource: source ID / URL
- ExternalKnowledgeChunk: source ID / source URL

No entity record, vector, schema, backend function, agent definition, credential
or clinical prompt was changed. These are bounded attribution checks, not an
assertion that every external storage object or unlabelled historical copy was
purged. The static registry was the confirmed active source of retired metadata.

A scan of every one of the 493 retired IDs found zero hits in application
`src/`, `public/`, `base44/`, `scripts/` text and in built production JavaScript.
Historical audit documentation and test-only negative/historical-message
fixtures can still name old identifiers. They are not installed content and do
not ship in the application bundle.

## Test changes and evidence

Removing content deliberately invalidated 49 old installation/count assertions
in the first local run. The failure log was inspected before changing tests.
Six obsolete package-content suites now check frozen empty compatibility
exports. Mixed-purpose suites retain their general assertions and explicitly
check the empty state instead of requiring withdrawn catalog entries.

180 already-disabled old-package installation cases were retired. Empty suite
shells and seven files containing only retired installation cases were removed.
No new `skip`/`fixme` was added. Replacement tests execute future ingestion and
real registry/resolver behavior on isolated synthetic metadata, including strict
language/audience selection, unknown IDs, original file metadata, policy and
open/download separation. Existing clinical, crisis and authorization behavior
is not relaxed.

Five previously installation-gated browser suites now run against test-only
synthetic future content. Their navigation, view mode, layout, viewer and
download assertions remain active. The fixture helper serves PDF bytes only for
the exact synthetic paths declared in the test registry; other asset URLs go to
the real server. No production PDF is replaced by a mock. Two browser cases requiring the removed
installed package were retired; their generic contracts are covered by the
future-content suite. Historical generated-file cards retain their independent
browser coverage. Seven-language light/dark maintenance tests additionally
assert four audience cards, two collection types, empty registry, no PDF links,
RTL/LTR and viewport fit.

Local validation:

- Full Vitest: **11,032 passed**, zero skips.
- Final forms browser cohort: **94 passed**, zero skips, across desktop/mobile.
- Future-content unit cohort: 20 passed, including real generator execution.
- Lint, type check, build and canonical forms-index check passed.
- No change to the Forms Library page/components/taxonomy/viewer/open/download
  source implementations.

GitHub's full required workflows are tracked on the PR and must complete before
merge. Local browser tests are Chromium desktop/Pixel emulation with synthetic
services, not physical-device or live-model acceptance.

## Release and later work

Merge and publish through the owner's normal workflow. After publication verify
the unchanged maintenance page and explicit forms-unavailable responses in
English/Hebrew; ordinary clinical turns must continue without unsolicited forms
notices. Existing conversation text and historical file metadata are retained.

Git history cleanup and deletion of old deployment/storage copies are separate
later operations. Replacement-content activation is also separate. The normal
empty baseline and reusable metadata/ingestion APIs are ready for that work.
