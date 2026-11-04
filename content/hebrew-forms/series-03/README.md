# Hebrew continuation series — batch 3

90 original blank review PDFs in ten units: EXEC-02–06 and SOC-02–06. Each unit has a four-page shared clinician guide and eight one-page age-specific sheets (W/P × CH/TE/AD/OA): 120 pages in total. Catalog `0.9-series-03` contains 550 PDFs, preserving the previous 460 records and binaries unchanged.

`units.json` contains the authored source: 400 separately worded questions, age adaptations, purpose, limits, existing-form references, fictional examples and anticipated difficulties. `forms.json` maps generated HTML/PDF identifiers and page counts. `review.json` records technical checks separately from professional review. Clinical/rights reviewer names and dates remain null; age-adaptation and release approvals remain false. These are supportive drafts for review, not a validated treatment protocol or prescribed session sequence.

| Unit | Focus | New PDFs |
| --- | --- | ---: |
| EXEC-02 | Breaking a task into steps and planning time | 9 |
| EXEC-03 | Adapting the environment and choosing reminders | 9 |
| EXEC-04 | Emotion and avoidance before a task | 9 |
| EXEC-05 | Persistence and changing a plan | 9 |
| EXEC-06 | An independent routine with suitable accommodations | 9 |
| SOC-02 | Listening and checking an interpretation | 9 |
| SOC-03 | Requests, refusal and negotiation | 9 |
| SOC-04 | Disagreement and conflict | 9 |
| SOC-05 | Initiating and maintaining a relationship | 9 |
| SOC-06 | Applying learning across relationships | 9 |

Children's versions use concrete questions and a safe adult's support; adolescents' versions address autonomy and sharing; adult versions account for practical demands and power differences; older-adult versions preserve choice without assuming impairment. Guides describe caregiver roles separately. Attention/organization sheets neither diagnose ADHD nor recommend changing medication or withdrawing existing accommodations. Communication sheets do not require eye contact, disclosure, reconciliation or contact with an unsafe person. OCD exposure/response prevention, trauma processing and crisis planning remain outside this batch.

Background sources are the [NICE ADHD recommendations](https://www.nice.org.uk/guidance/ng87/chapter/recommendations), [NHS inform work and education guidance](https://www.nhsinform.scot/illnesses-and-conditions/adhd/managing-adhd-symptoms-in-work-and-education) and [CCI assertiveness information page](https://www.cci.health.wa.gov.au/Resources/Looking-After-Yourself/Assertiveness). Questions and examples were authored for this project; no third-party worksheet, proprietary translation or rights approval is claimed. These sources do not validate every age adaptation or supply a complete treatment manual for this series. Per-form professional and rights review remains outstanding.

## Reproduce and verify

```sh
python3 scripts/build-hebrew-p4.py --wave series-03
node scripts/render-hebrew-p4.mjs --wave=series-03
```

The render command checks blank fields, loaded fonts, page count, footer clearance, a short fictional answer and long-answer print blocking/export preservation. It does not rewrite PDFs unless `--write-pdfs` is explicitly supplied. An intentional binary update requires new byte lengths, hashes, canonical catalog pin and review records. Chromium's PDF output is not byte-reproducible across timestamps/versions. `PILOT_CHROMIUM_PATH` selects a browser; `HEBREW_FORMS_QA_DIR` optionally writes HTML screenshots.

All 90 PDFs passed structural checks (A4, expected 4/1 page counts, no populated fields, annotations or opening actions). All 120 pages were rendered with Poppler and visually inspected, with full-size checks of representative child, older-adult and guide pages. These are technical findings, not clinical approval. Private assets remain excluded from the public and AI attachment registry.

The shared guide is `MP-{UNIT}-G-ALL-HE.pdf`. Choose the matching worksheet `MP-{UNIT}-W-{AGE}-HE.pdf` and practice sheet `MP-{UNIT}-P-{AGE}-HE.pdf`, using CH (approximately 6–11), TE (approximately 12–17), AD or OA. Editable counterparts are under `forms/`; exact titles and identifiers are in `forms.json`. Choose a unit and age variant with the clinician; a unit number does not prescribe a treatment session number.
