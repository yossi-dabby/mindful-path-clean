# Multilingual forms: readiness wave 1

## Result and scope

The shared structure now has a verified editing source for every one of the
970 Hebrew forms, across all 17 tracks. A stable family ID links the same form
across `he`, `en`, `es`, `fr`, `de`, `it`, and `pt`. The existing age, track, and
unit assignments are retained, including the 24 child-only OCDYC forms.

This is the readiness PR required before translated form uploads by
`therapeutic-forms-upload-readiness.md`, section L. It adds editing sources,
the localization contract, translation drafts, rendering checks and CI. It does
not register an English runtime release. The installed administrator library
still has 970 Hebrew forms; the public catalog remains under revision. No
agents, AI search/attachments, authorization, schemas, PDF reader or deployment
settings change.

## Recovered sources

The repository previously contained 816 editing sources. The missing 154 were
found in `02_editable_sources/` of
`MindfulPath_All_Hebrew_Forms_App_Candidates_v02.zip`, archive SHA-256
`d0dd066d98d78e8f6a9c4e598a2b55c85aa67b25a7c662b4310b3424795ecf14`.

All 154 corresponding archive PDFs match the installed original catalog's
hashes and sizes. `content/hebrew-forms/original-v02/` restores those HTML files,
their two fonts, font license and print guard byte-for-byte. Its provenance
manifest records every imported file hash. No PDF is replaced. The second
catalog package was also inspected; it contains catalog/guide material rather
than the individual editing sources.

`scripts/audit-form-sources.mjs` maps all 970 IDs to one HTML source, verifies
each installed PDF, and rejects missing or duplicate mappings. The generated
`content/forms-localization/source-map.json` records source content versions,
HTML/PDF hashes and rendering dependency hashes. It is an offline source map,
not a client import or a public catalog.

## English sample

`content/forms-localization/en/mood-03.json` contains an AI-assisted English
translation draft of the complete MOOD-03 unit, with 126 exact source-string
mappings. It retains all questions, instructions, reference links, age
adaptations, review notices and writing areas.

| Type | Ages | Files | Pages |
| --- | --- | ---: | ---: |
| Worksheet W | CH, TE, AD, OA | 4 | 4 |
| Practice P | CH, TE, AD, OA | 4 | 4 |
| Therapist guide G | ALL | 1 | 4 |
| Total | Four age groups and shared guide | 9 | 12 |

Each translation is explicitly a draft, with clinical and rights review pending;
reviewer and review date are null. Automated checks do not approve a translation
or therapeutic content. Independent language and clinical review remain needed.

The renderer reuses the Hebrew layout and font assets. A shared direction
stylesheet mirrors the note border and alignment for LTR while preserving A4,
font sizes, page counts, numbered section order and every writing field's size.
The shared offline print guard uses messages supplied by the language packet.
It retains long answers, blocks clipped printing, and exports the complete
answers as text. Review uses fictional data only; no network or automatic saving.

## Version and language contract

`src/lib/formsLocalization.js` has no asset imports or network side effects.
It supports the seven language codes and their regional tags, assigns RTL only
to Hebrew, and keeps family IDs stable. Unknown languages are rejected. A
missing translation is `unavailable`; changed source content, PDF, HTML or
rendering dependencies make it `stale`. Neither state falls back to Hebrew or
another language. Wrong age/track/unit/language mappings and duplicate/unknown
source links fail validation.

The offline review catalog includes only current drafts for the requested
language plus explicit unavailable/stale IDs. English currently has 9 drafts
and 961 unavailable variants. Each of the other five target languages has
970 unavailable variants. This does not create 6,790 completed forms.

## Reproduce the checks

```sh
node scripts/audit-form-sources.mjs
npx vitest run test/utils/formsLocalization.test.js
npx playwright install chromium
node scripts/render-forms-translation.mjs --screenshots
```

The renderer fails on changed sources, missing text/accessible labels, leftover
Hebrew, missing fonts, any HTTP request, overflow, changed page/field geometry,
clipped short answers, failed long-answer print protection, or incomplete answer
downloads. It writes review HTML, blank PDF, optional images, an offline review
catalog and QA metadata only under ignored `tmp/forms-localization/en/mood-03/`.
It never writes to `public/`, `dist/` or `server/private/`.

The `Forms localization readiness` workflow runs source parity, unit tests and
all nine real browser rendering/fill/download checks. Its seven-day review
artifact contains generated drafts, not an application release. Local PDFs
were additionally checked for A4 page dimensions and selectable English text;
all 12 rasterized PDF pages were visually inspected.

## Next wave after this readiness PR

1. Review the nine English drafts, then generate/pin their actual PDF hashes in
   a separate server-only English release. Preserve the existing Hebrew release
   paths and catalog hashes for older clients.
2. Add language-specific catalog selection to the private server, Base44 proxy
   and administrator UI. Keep session/role checks, bounded responses, no-store
   behavior and PDF integrity validation. Load only the selected language's
   catalog and requested PDF; do not bundle all language PDFs into the app.
3. Localize the remaining Hebrew-only library controls in all seven languages;
   distinguish unavailable translations from errors. Preserve the current
   navigation hierarchy and PDF reading mode, using language-appropriate labels
   and direction. Never serve a different language as a fallback.
4. Add real transport/UI tests for English open/download, authorization,
   language switching/cancellation, no cross-language leakage, and device
   layouts before activating the sample. Keep each catalog within the existing
   512 KiB transport limit; split future releases if needed.
5. Expand English in reviewed units, then Spanish, French, German, Italian and
   Portuguese with the same source-linking and per-language review checks.

The owner handles merge and publication. No public/native deployment or
clinical release is performed by this wave.
