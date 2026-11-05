# Hebrew continuation series — batch 6

90 original blank review PDFs in ten units. Each unit has a four-page shared clinician guide and eight one-page age-specific sheets (W/P × CH/TE/AD/OA): 120 new pages. Catalog `0.12-series-06` contains 820 PDFs, preserving the previous 730 records and binaries.

| Unit | Focus | New PDFs |
| --- | --- | ---: |
| SHAME-02 | מסרים והקשר של בושה | 9 |
| SHAME-03 | תגובה פנימית מכבדת | 9 |
| SHAME-04 | תיקון אפשרי וגבולותיו | 9 |
| SHAME-05 | קשר ותמיכה לפי בחירה | 9 |
| SHAME-06 | תוכנית למצבי חזרה של בושה | 9 |
| MEANING-02 | ערכים לעומת ציפיות | 9 |
| MEANING-03 | משאבים וחוזקות בהקשר | 9 |
| MEANING-04 | מתח בין ערכים ובחירות | 9 |
| MEANING-05 | פעולה בעלת משמעות | 9 |
| MEANING-06 | בדיקה מחדש והמשך הדרך | 9 |

`units.json` contains 400 distinct authored questions, purpose, limits, references to existing forms, fictional examples, anticipated difficulties and age adaptations. `forms.json` maps generated HTML/PDF identifiers and page counts. `review.json` records technical findings independently of professional review. Clinical/rights reviewer names and dates remain null, and age-adaptation/release approvals remain false. Unit order does not prescribe a treatment-session schedule.

Children's sheets use concrete choices with adult support; adolescents retain agreed privacy and choice; adult sheets account for work and care responsibilities; older-adult sheets retain autonomy without assuming impairment. The companion supports the person's own answer rather than answering on their behalf.

SHAME supports respectful reflection, realistic responsibility and optional support; it does not demand confession, repeated reassurance, compensation, disclosure or trauma processing. MEANING explores freely chosen values, resources and feasible actions; it does not impose faith, positive meaning, a purpose for suffering, or a full ACT protocol. These are supportive draft resources, not clinically validated complete treatment programs. Terms of use do not confer clinical or rights approval.

## Background sources

- https://www.nhs.uk/mental-health/self-help/tips-and-support/raise-low-self-esteem/
- https://www.nhs.uk/every-mind-matters/lifes-challenges/maintaining-healthy-relationships-and-mental-wellbeing/
- https://www.matrix.nhs.scot/self-assessment/?programmeId=2244
- https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/

The questions and examples are original project content. No third-party worksheet or proprietary translation was reproduced. These sources provide background, not complete manuals, validation of these forms or permissions to reproduce source worksheets. Per-form professional and rights review remains outstanding.

## Reproduce and verify

```sh
python3 scripts/build-hebrew-p4.py --wave series-06
node scripts/render-hebrew-p4.mjs --wave=series-06
```

Rendering checks blank fields, fonts, page count, footer clearance, short fictional-answer fit and long-answer print blocking/export preservation. PDFs are rewritten only with explicit `--write-pdfs`; intentional binary changes require new lengths, SHA-256 values, review records and canonical catalog pins. Chromium PDFs are not byte-reproducible across timestamps/versions. `PILOT_CHROMIUM_PATH` selects a browser; `HEBREW_FORMS_QA_DIR` optionally writes HTML screenshots.

All 90 PDFs passed structural checks (A4, expected 4/1 page counts, no filled form fields, annotations or opening actions). All 120 pages were rendered with Poppler and visually reviewed, including full-size child, older-adult and guide samples. These checks do not approve clinical content or age adaptation.

The app continues to serve these assets through its administrator-authorized API; they remain excluded from the public/AI forms registry. The GitHub repository itself is public, so committed source and blank PDFs are publicly accessible there. This distinction does not change their draft review status.
