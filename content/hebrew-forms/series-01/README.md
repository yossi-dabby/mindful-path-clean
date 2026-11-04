# Hebrew continuation series — batch 1

81 original blank review PDFs in nine units: MOOD-03–06 and SELF-02–06. Each unit contains one four-page shared clinician guide and eight one-page age-specific worksheets/practice sheets (W/P × CH/TE/AD/OA). Total: 108 pages. The catalog is `0.7-series-01`, containing 370 PDFs including the unchanged 289 previously installed forms.

`units.json` is the authored source: separate questions, language, examples and guidance for children approximately 6–11, adolescents approximately 12–17, adults and older adults. `forms.json` lists generated files/page counts; `forms/` contains editable local HTML; `review.json` records technical checks and outstanding professional/rights review. These are proposed supportive resources, not a validated complete treatment protocol, a prescribed session count or approved clinical materials. The project owner will arrange professional review. All clinical/rights reviewer fields remain null and approval flags false.

The source references are background resources only: NICE NG222, NICE NG134 and CCI's self-esteem information page. Questions were authored for this project; no workbook pages, translations of proprietary worksheets or third-party rights approvals are claimed. Existing baseline forms are referenced by their repository identifiers to avoid duplicating intake, session and core worksheets. The young-child OCD and trauma processing series are outside this batch.

## Reproduce and verify

```sh
python3 scripts/build-hebrew-p4.py --wave series-01
node scripts/render-hebrew-p4.mjs --wave=series-01
```

Rendering without `--write-pdfs` checks blank layout, fonts, page count, footer clearance, short fictional answers and overflow blocking/export preservation without changing pinned PDFs. Use `--write-pdfs` only for an intentional new binary release, then refresh the catalog byte lengths, SHA-256 values, canonical catalog pin and review records. Chromium PDF generation is not byte-reproducible across versions/timestamps. `PILOT_CHROMIUM_PATH` optionally selects the local browser; `HEBREW_FORMS_QA_DIR` optionally writes page screenshots.

All 81 PDFs were structurally checked (A4, 4/1 page counts, no populated fields/annotations/actions), rendered with Poppler, and visually inspected across all 108 pages. Editable HTML checks are technical checks only; they do not approve content or age adaptation. PDFs remain private server assets and are excluded from the public registry and AI attachment flow.
