# Hebrew continuation series — batch 2

90 original blank review PDFs in ten units: PERF-02–06 and REG-02–06. Each unit has a four-page shared clinician guide and eight one-page age-specific sheets (W/P × CH/TE/AD/OA): 120 pages in total. Catalog `0.8-series-02` contains 460 PDFs, preserving the previous 370 records and binaries unchanged.

`units.json` contains the authored source, including 400 separately worded questions, age adaptations, purpose, limits, existing-form references, fictional examples and anticipated difficulties. `forms.json` maps generated HTML/PDF identifiers and page counts. `review.json` records technical checks independently of professional review. Clinical/rights reviewer names and dates remain null; age-adaptation and release approvals remain false. These are supportive drafts for review, not a validated treatment protocol or prescribed session sequence.

| Unit | Focus | New PDFs |
| --- | --- | ---: |
| PERF-02 | Useful standards, costs and a sufficient result | 9 |
| PERF-03 | Fear of mistakes and their personal meaning | 9 |
| PERF-04 | A jointly planned, low-risk flexibility experiment | 9 |
| PERF-05 | Starting, checking and finishing a task | 9 |
| PERF-06 | Learning and maintenance under changing demands | 9 |
| REG-02 | Emotion, need and context | 9 |
| REG-03 | Choosing between response options | 9 |
| REG-04 | Expressing emotion, a request or a boundary | 9 |
| REG-05 | Responsibility and repair after conflict | 9 |
| REG-06 | Applying and maintaining tools and support | 9 |

Children's versions use concrete questions and a safe adult's support; adolescents' versions address autonomy and sharing; adult versions account for practical demands and power differences; older-adult versions preserve choice without assuming impairment. Guides describe caregiver roles separately. No worksheet requires intentional harm, dropping mandatory checks, emotional suppression, forced reconciliation or contact with an unsafe person. OCD exposure/response prevention, trauma processing and crisis planning remain outside this batch.

Background sources are the [CCI perfectionism information page](https://www.cci.health.wa.gov.au/Resources/Looking-After-Yourself/Perfectionism) and [NHS anger information page](https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/anger/). Questions and examples were authored for this project; no third-party worksheet, proprietary translation or rights approval is claimed. These background pages do not validate the child/adolescent adaptations or constitute full treatment manuals. Per-form professional and rights review remains outstanding.

## Reproduce and verify

```sh
python3 scripts/build-hebrew-p4.py --wave series-02
node scripts/render-hebrew-p4.mjs --wave=series-02
```

The render command checks blank fields, loaded fonts, page count, footer clearance, a short fictional answer and long-answer print blocking/export preservation. It does not rewrite PDFs unless `--write-pdfs` is explicitly supplied. An intentional binary update requires new byte lengths, hashes, canonical catalog pin and review records. Chromium's PDF output is not byte-reproducible across timestamps/versions. `PILOT_CHROMIUM_PATH` selects a browser; `HEBREW_FORMS_QA_DIR` optionally writes HTML screenshots.

All 90 PDFs passed structural checks (A4, expected 4/1 page counts, no populated fields, annotations or opening actions). All 120 pages were rendered with Poppler and visually inspected, with full-size checks of representative child, older-adult and guide pages. These are technical findings, not clinical approval. Private assets remain excluded from the public and AI attachment registry.

The shared guide is `MP-{UNIT}-G-ALL-HE.pdf`. Choose the matching worksheet `MP-{UNIT}-W-{AGE}-HE.pdf` and practice sheet `MP-{UNIT}-P-{AGE}-HE.pdf`, using CH (approximately 6–11), TE (approximately 12–17), AD or OA. Editable counterparts are under `forms/`; exact titles and identifiers are in `forms.json`. Choose a unit and age variant with the clinician; a unit number does not prescribe a treatment session number.
