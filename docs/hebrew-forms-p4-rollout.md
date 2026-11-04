# P4: two private administrator review waves

The owner confirmed P3 publication and live verification on 2026-11-04 and requested P4 in two waves. The original expansion plan names domains and age adaptations, but does not prescribe form counts. These are opening units, not complete treatment curricula or clinical release approval.

| Wave | Units | New PDFs / pages | Cumulative PDFs / pages | Catalog |
| --- | --- | --- | --- | --- |
| A | SLEEP-01, CHANGE-01, FAMILY-01, SCREEN-01 | 36 / 48 | 253 / 328 | `catalog-p4-01`, `0.5-p4-01` |
| B (separate follow-up) | SHAME-01, MEANING-01, OCD-01, TRAUMA-01 | 36 / 48 | 289 / 376 | `catalog-p4-02`, `0.6-p4-02` |

Each unit has one shared four-page clinician guide and eight one-page sheets: W and P for CH, TE, AD and OA. The installed 217 records and PDF bytes are preserved exactly. No PDFs enter the public registry, AI search, chat attachment pipeline or user entities. All new content remains Hebrew-only, administrator-only, draft review material.

## Wave A content and provenance

- SLEEP: one evening/morning and a chosen comfort/context adjustment. No sleep restriction, medication advice, fixed sleep target or repeated clock checking. Persistent difficulty/daytime impact and medical concerns need appropriate professional assessment. Background: [NHS insomnia](https://www.nhs.uk/conditions/insomnia/).
- CHANGE: a chosen loss/transition, present needs and optional support. No required grief sequence, deadline, positive reframing or forced meaning. Background: [NHS grief and loss](https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/grief-bereavement-loss/).
- FAMILY: CH/TE sheets use the participant's voice. AD/OA sheets explicitly address a parent or accompanying family adult, as the original plan requests. Participation and sharing are optional; the clinician assesses whether a shared conversation is appropriate. No coerced disclosure or joint-conversation exercise in a context of fear, coercion or violence. Background: [UNICEF communication](https://www.unicef.org/eca/11-tips-communicating-your-teen).
- SCREEN: the function and context of one digital-use situation, what to preserve and one voluntary adjustment. No universal minutes quota, assumption of addiction or request for private messages/passwords. Background: [AAP 5Cs](https://www.aap.org/5Cs) and [AAP family media plan](https://www.healthychildren.org/English/family-life/Media/Pages/How-to-Make-a-Family-Media-Use-Plan.aspx).

Sources were consulted on 2026-11-04 as background, not copied questionnaires or licensed translations. Adult adaptations of family/child sources are original proposals requiring separate clinical review; source citation does not validate a new age adaptation. `units.json` is the authored source; HTML is deterministically generated. Shared local fonts, CSS and print protection remain unchanged. No remote requests or patient answers are embedded.

## Publication order and acceptance

1. Review and merge Wave A backend/assets, then its UI PR. All PRs target `main`; stacked UI diffs include their backend prerequisite until it is merged.
2. Confirm Railway serves the pinned 253-record catalog. Synchronize/save the Base44 function and publish the frontend using the established process.
3. In both authenticated administrator preview and published app, verify version `0.5-p4-01`, 253 records, all four new tracks, age navigation, back navigation, guide pages and a W/P open/download from each new track. Match downloaded byte lengths and SHA-256 against the catalog. Verify non-admin/other-language exclusion.
4. Only after that live acceptance, review/merge/publish Wave B backend and UI. Repeat the same acceptance for `0.6-p4-02` and 289 records. Do not merge the Wave B stack early: it contains Wave A prerequisites.

The UI selects a prior pinned release only on unsupported-release 400/404 responses. Authentication, network, 5xx or integrity failures must remain visible and must not trigger fallback. Existing catalog endpoints remain independently pinned for older clients. A client rollback can select the preceding catalog without deleting already shipped private assets.

## Technical and clinical review are distinct

The 36 Wave A PDFs were rendered and inspected across all 48 A4 pages, with blank-field, footer fit, font load, short fictional input and long-answer print/export protection checks. PDF structure has no form fields, annotations or launch action. Per-file hashes and technical checks are in `content/hebrew-forms/p4-01/review.json`.

Clinical reviewer/date and rights reviewer/date remain null. Age-adaptation and release approvals remain false. These flags are intentionally not satisfied by test results, a merge or publication of the private review surface. No named patient data was used. CI exercises real private PDF bytes with fixture identity/upstream routing; it does not prove the production Base44/Railway network path or replace the live acceptance above.

Wave B's OCD and trauma units require specialized review. Their scope must remain preparation, choice and communication; they must not introduce self-directed exposure, trauma processing or treatment protocols through a generic form expansion.
