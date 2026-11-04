# Hebrew continuation series — batch 4

90 original blank review PDFs in ten units: SLEEP-02–06 and CHANGE-02–06. Each unit has a four-page shared clinician guide and eight one-page age-specific sheets (W/P × CH/TE/AD/OA): 120 new pages. Catalog `0.10-series-04` contains 640 PDFs and preserves the previous 550 records and binaries.

`units.json` contains the authored source: 400 distinct questions, age adaptations, purpose, limits, existing-form references, fictional examples and anticipated difficulties. `forms.json` maps generated HTML/PDF identifiers and page counts. `review.json` records technical findings separately from professional review. Clinical/rights reviewer names and dates remain null; age-adaptation and release approvals remain false. A unit number is not a prescribed session number.

| Unit | Focus | New PDFs |
| --- | --- | ---: |
| SLEEP-02 | Environmental conditions, comfort and professional questions | 9 |
| SLEEP-03 | A flexible evening routine | 9 |
| SLEEP-04 | Worry and arousal around rest | 9 |
| SLEEP-05 | Daytime functioning and practical support | 9 |
| SLEEP-06 | Maintaining useful adaptations and seeking further assessment | 9 |
| CHANGE-02 | Changing reactions and needs | 9 |
| CHANGE-03 | Identity, roles and responsibilities | 9 |
| CHANGE-04 | Memory, connection and meaning by choice | 9 |
| CHANGE-05 | Routines and relationships during change | 9 |
| CHANGE-06 | Significant dates and continued support | 9 |

Children's versions use concrete questions with adult support; adolescent versions preserve choice and agreed privacy; adult versions account for work, care and practical constraints; older-adult versions preserve autonomy without assuming impairment. Guides distinguish the companion's responsibilities from the participant's voice.

SLEEP is supportive preparation and reflection, not a complete CBT-I protocol. It does not prescribe sleep restriction, a sleep window, uniform sleep hours, medication changes or repeated clock checking. Persistent difficulties and daytime sleepiness require appropriate assessment. CHANGE does not prescribe grief stages, a deadline for grieving, positive meaning, disclosure, reconciliation or participation in rituals. It does not add a prolonged-grief or trauma-processing protocol. The existing terms of use do not confer clinical or rights approval.

Background sources: [NHS insomnia](https://www.nhs.uk/conditions/insomnia/), [NHS daytime sleepiness](https://www.nhs.uk/conditions/excessive-daytime-sleepiness-hypersomnia/), [NHS grief and loss](https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/grief-bereavement-loss/), and [Child Bereavement UK guidance](https://www.childbereavementuk.org/supporting-bereaved-children-and-young-people). The questions and examples are original project content; no third-party worksheet or proprietary translation was reproduced. These pages are background, not complete manuals, validation of these forms or permission to reproduce source worksheets. Per-form professional and rights review remains outstanding.

## Reproduce and verify

```sh
python3 scripts/build-hebrew-p4.py --wave series-04
node scripts/render-hebrew-p4.mjs --wave=series-04
```

The render command checks blank fields, fonts, page count, footer clearance, short fictional-answer fit, and long-answer print blocking/export preservation. It rewrites PDFs only with explicit `--write-pdfs`. An intentional binary update requires new byte lengths, hashes, canonical catalog pin and review records. Chromium PDFs are not byte-reproducible across timestamps/versions. `PILOT_CHROMIUM_PATH` selects a browser; `HEBREW_FORMS_QA_DIR` optionally writes HTML screenshots. Structural and rendered-page checks are recorded in `review.json`, with final execution results in the PR and CI.

The shared guide is `MP-{UNIT}-G-ALL-HE.pdf`. Matching worksheet and practice files are `MP-{UNIT}-W-{AGE}-HE.pdf` and `MP-{UNIT}-P-{AGE}-HE.pdf`, for CH (approximately 6–11), TE (approximately 12–17), AD and OA. Editable sources are under `forms/`. These private drafts remain outside the public and AI forms registry.
