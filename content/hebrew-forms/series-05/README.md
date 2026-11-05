# Hebrew continuation series — batch 5

90 original blank review PDFs in ten units. Each unit has a four-page shared clinician guide and eight one-page age-specific sheets (W/P × CH/TE/AD/OA): 120 new pages. Catalog `0.11-series-05` contains 730 PDFs, preserving the previous 640 records and binaries.

| Unit | Focus | New PDFs |
| --- | --- | ---: |
| FAMILY-02 | צרכים, ציפיות ותפקידים | 9 |
| FAMILY-03 | הקשבה ותיקוף בלי חובה להסכים | 9 |
| FAMILY-04 | גבולות ופתרון בעיה משותפת | 9 |
| FAMILY-05 | אחים, מעברים וקונפליקטים | 9 |
| FAMILY-06 | שימור הסכמות ותיקונן | 9 |
| SCREEN-02 | מצב, טריגר והרגל דיגיטלי | 9 |
| SCREEN-03 | סביבה דיגיטלית ופרטיות | 9 |
| SCREEN-04 | חלופות למילוי צורך | 9 |
| SCREEN-05 | הסכמות, קשרים וגבולות שיתוף | 9 |
| SCREEN-06 | איזון דיגיטלי לאורך זמן | 9 |

`units.json` contains 400 distinct authored questions, purpose, limits, references to existing forms, fictional examples, anticipated difficulties and age adaptations. `forms.json` maps generated HTML/PDF identifiers and page counts. `review.json` records technical findings independently of professional review. Clinical/rights reviewer names and dates remain null, and age-adaptation/release approvals remain false. Unit order does not prescribe a treatment-session schedule.

Children's sheets use concrete choices with adult support; adolescents retain agreed privacy and choice; adult sheets account for work and care responsibilities; older-adult sheets retain autonomy without assuming impairment. The companion supports the person's own answer rather than answering on their behalf.

FAMILY supports voluntary communication and shared agreements without making children responsible for adult conflict, requiring reconciliation or overriding safety. SCREEN supports chosen changes to digital habits; it does not collect passwords, messages, browsing history or location, prescribe a universal time limit, or introduce hidden monitoring. These are supportive draft resources, not clinically validated complete treatment programs. Terms of use do not confer clinical or rights approval.

## Background sources

- https://www.nhs.uk/every-mind-matters/lifes-challenges/maintaining-healthy-relationships-and-mental-wellbeing/
- https://www.unicef.org/eca/stories/how-communicate-effectively-your-young-child
- https://www.unicef.org/eca/10-ways-create-healthy-digital-habits-home
- https://www.unicef.org/parenting/child-care/supporting-child-negative-online-experience

The questions and examples are original project content. No third-party worksheet or proprietary translation was reproduced. These sources provide background, not complete manuals, validation of these forms or permissions to reproduce source worksheets. Per-form professional and rights review remains outstanding.

## Reproduce and verify

```sh
python3 scripts/build-hebrew-p4.py --wave series-05
node scripts/render-hebrew-p4.mjs --wave=series-05
```

Rendering checks blank fields, fonts, page count, footer clearance, short fictional-answer fit and long-answer print blocking/export preservation. PDFs are rewritten only with explicit `--write-pdfs`; intentional binary changes require new lengths, SHA-256 values, review records and canonical catalog pins. Chromium PDFs are not byte-reproducible across timestamps/versions. `PILOT_CHROMIUM_PATH` selects a browser; `HEBREW_FORMS_QA_DIR` optionally writes HTML screenshots.

All 90 PDFs passed structural checks (A4, expected 4/1 page counts, no filled form fields, annotations or opening actions). All 120 pages were rendered with Poppler and visually reviewed, including full-size child, older-adult and guide samples. These checks do not approve clinical content or age adaptation.

The app continues to serve these assets through its administrator-authorized API; they remain excluded from the public/AI forms registry. The GitHub repository itself is public, so committed source and blank PDFs are publicly accessible there. This distinction does not change their draft review status.
