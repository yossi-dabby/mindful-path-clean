# P3 Hebrew review batch 01

54 blank PDFs / 72 A4 pages: MOOD-02, SELF-01, PERF-01, REG-01,
EXEC-01 and SOC-01. Each unit contains one four-page clinician guide and
one worksheet plus one practice sheet for each of CH, TE, AD and OA.
Content version 0.1; private catalog release 0.4-p3-01 (217 PDFs total).

This is a new bounded implementation choice following the owner's request to
increase batch size after PRs #10–11 passed live verification. The recovered
roadmap did not specify these unit counts, titles or questions. This batch
starts five additional P3 tracks and extends MOOD; it does not finish any track
or the P4 roadmap. All new content remains draft material for administrator
review, with human clinical, age-adaptation and final rights review outstanding.

## Authorship and sources

`units.json` is the authored specification, with different questions for all four
ages, unit-specific scope, limitations, overlap notes, adaptations and follow-up.
Questions are original draft language, not translations of external worksheets.
The primary reference pages listed per unit provide background only, not evidence
that these forms or age adaptations are validated. No questionnaire, scoring
scale or treatment protocol has been copied. No claim of clinical efficacy is made.

References checked 2026-11-03: CCI overview pages on self-esteem, perfectionism
and assertiveness; NICE NG87 recommendations and environmental modifications;
NHS anger guidance. MOOD continues the NG222/NG134 background documented in the
merged MOOD-01 specification. No adult recommendation is automatically applied
to children. The repository's actual Core catalog was checked to distinguish
CORE-03 (identifying patterns), CORE-04 (examining interpretations), CORE-05
(action planning), CORE-06 (problem solving), and CORE-07 (experiments).

Existing MOOD-01 local CSS, fonts, font license and print guard are reused via
relative paths, without changing them. Their user-provided v0.2 package provenance
is documented in `../mood-01/README.md`. Design stays A4, Hebrew RTL, a 7 mm border,
watermark, generous writing space and no illustrations. PDF files are blank print
forms, not AcroForms. Editable HTML sources block network connections/submissions
and do not save answers automatically. Use only fictional data for testing.

## Reproduction and review

```sh
python3 scripts/build-hebrew-p3.py
node scripts/render-hebrew-p3.mjs
# Only after deliberately revising and reviewing this release:
node scripts/render-hebrew-p3.mjs --write-pdfs
```

`PILOT_CHROMIUM_PATH` optionally selects Chromium; `P3_QA_DIR` writes temporary
HTML screenshots. The render check validates blank fields, local fonts, expected
page count, footer clearance and short/long fictional answer handling for all 54
forms. PDF generation changes bytes: review the rendered PDF pages and update
catalog fingerprints, the pinned release digest and `review.json` together.
Do not regenerate the 163 pre-existing PDFs.

`review.json` keeps technical QA separate from human approvals. Missing reviewers
and dates remain null, and clinical/rights/age/release approvals remain false.
Filled examples and QA screenshots are temporary, never committed patient data.

These development sources are not bundled into production assets. The server
blocks `/content/` and `/server/`; the PDFs are available only through the existing
authenticated administrator API. No public/AI registration or answer storage is
introduced.
