# MOOD-01 Hebrew review sources

Nine blank draft PDFs / twelve A4 pages implement the first unit specified in
`docs/hebrew-forms-expansion-mood-draft.md` (merged PR #9). Content version 0.1;
catalog release 0.3-mood-01. This is one expansion unit, not completion of the
fourteen-domain roadmap. Clinical and final rights review remain outstanding.

## Sources and authorship

- Questions and age adaptations: the merged MOOD draft specification. The four
  guide pages are newly authored from its outline, not a translated external form.
- Layout, print guard and local DejaVu fonts: user-provided
  `MindfulPath_All_Hebrew_Forms_App_Candidates_v02.zip`, SHA-256
  `d0dd066d98d78e8f6a9c4e598a2b55c85aa67b25a7c662b4310b3424795ecf14`.
  The package's original font license is included unchanged in `fonts/LICENSE.txt`.
  CSS preserves A4, RTL, the 7 mm border and watermark; question text was enlarged.
- Primary background references: NICE NG222 recommendations 1.5.2 / treatment
  options, and NG134 recommendations 1.5.4–1.5.5 (checked 2026-11-03). These support
  limited background and separate age review; they do not validate this unit.
  Links are in the specification and guide. No third-party questionnaire copied.
- Compared actual v0.2 editable sources for ASM-A01, CORE-02 and CORE-05:
  broad mapping, thought/response mapping and action planning already exist.
  This unit's narrower purpose is observation of activity, feeling and support.
  Reuse SES-S01/S02 and Core when appropriate; no duplicates of those PDFs.

## Review and reproduction

`forms/*.html` are editable, offline review sources. They load only local CSS,
fonts and `print_guard.js`; CSP prohibits network connections and submissions.
Use fictional data for QA. Nothing is automatically saved. Long answers block
printing and remain available in the explicit text export. PDF assets are blank
print forms, not interactive AcroForms. Do not commit filled answers or screenshots.

With the repository's Playwright Chromium installed:

```sh
node scripts/render-hebrew-mood.mjs
# Explicitly replace the nine PDFs after an intentional source revision:
node scripts/render-hebrew-mood.mjs --write-pdfs
```

`PILOT_CHROMIUM_PATH` can select a local browser; `MOOD_QA_DIR` optionally writes
temporary screenshots. The default checks HTML page count, local fonts, blank
fields, footer clearance and short/long fictional filling. It does not modify PDFs.
PDF generation changes bytes: review rendered PDF pages, then deliberately update
the new catalog's bytes/SHA-256, pinned release digest and review record together.
Never regenerate or change the 154 original PDFs to update this unit.

`review.json` has one record per variant. Technical results are recorded separately
from clinical reviewer/date, rights reviewer/date and release approval. Unperformed
human reviews remain null/false. Do not infer approval from CI or merge.

## Access

Only the authenticated Hebrew administrator pilot exposes these PDFs. HTML sources,
fonts and reviews are development files, absent from the production `dist` assets.
No public forms registry, AI retrieval, patient entity, answer storage or therapist
entitlement is added. Wider access remains a separate reviewed step.
