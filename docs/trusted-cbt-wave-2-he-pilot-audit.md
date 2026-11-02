# Trusted CBT Wave 2 — Hebrew pilot audit

Date: 2026-09-07  
App: `69504b725a07f5aa75aeaf7d`  
Scope: 10 new open-source English canonical records and 10 linked Hebrew draft variants.

## Outcome

- Existing production Trusted CBT records were not modified.
- 10 new English source records were created as `translation_status=source`.
- 10 linked Hebrew variants were created as `translation_status=draft`.
- All 20 records are `is_active=false`, `clinical_review_status=pending`, and `canonical_status=canonical`.
- Every record contains `safety_notes` and `contraindications`.
- Every English record has a self-referencing `source_record_id`; every Hebrew variant references its matching English source.
- No English fallback was introduced or changed.

## Record map

| Translation group | English source ID | Hebrew variant ID |
|---|---|---|
| `trusted-cbt-open::cbt-model` | `6a9e96dd8b9551535d72b048` | `6a9e98763a616120b71ec1d8` |
| `trusted-cbt-open::thinking-patterns` | `6a9e96dd8b9551535d72b049` | `6a9e98763a616120b71ec1d9` |
| `trusted-cbt-open::decatastrophising` | `6a9e96dd8b9551535d72b04a` | `6a9e98763a616120b71ec1da` |
| `trusted-cbt-open::thought-record` | `6a9e96dd8b9551535d72b04b` | `6a9e98763a616120b71ec1db` |
| `trusted-cbt-open::case-map` | `6a9e96dd8b9551535d72b04c` | `6a9e98763a616120b71ec1dc` |
| `trusted-cbt-open::socratic-questions` | `6a9e96dd8b9551535d72b04d` | `6a9e98763a616120b71ec1dd` |
| `trusted-cbt-open::coping-choice` | `6a9e96dd8b9551535d72b04e` | `6a9e98763a616120b71ec1de` |
| `trusted-cbt-open::sleep-architecture` | `6a9e96dd8b9551535d72b04f` | `6a9e98763a616120b71ec1df` |
| `trusted-cbt-open::stress-response` | `6a9e96dd8b9551535d72b050` | `6a9e98763a616120b71ec1e0` |
| `trusted-cbt-open::emotion-acceptance` | `6a9e96dd8b9551535d72b051` | `6a9e98763a616120b71ec1e1` |

## Licensing and provenance

The protected Beck Institute, Guilford and existing adapted records were not used as translation sources and were not changed.

Nine groups use adapted NHS.UK public-sector information under the Open Government Licence v3.0. The required attribution is stored in each record's `source_name`. The record explicitly states that the adaptation/translation is not NHS clinically approved and does not imply NHS endorsement.

The sleep group additionally cites the CC BY 4.0 open-access review:

- Drakatos et al. (2019), NREM parasomnias: https://pmc.ncbi.nlm.nih.gov/articles/PMC6558250/

Primary NHS.UK source pages:

- CBT overview: https://www.nhs.uk/tests-and-treatments/cognitive-behavioural-therapy-cbt/
- Reframing unhelpful thoughts: https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/reframing-unhelpful-thoughts/
- Thought record: https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/thought-record/
- Stress: https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/stress/
- Insomnia: https://www.nhs.uk/conditions/insomnia/
- Mindfulness: https://www.nhs.uk/mental-health/self-help/tips-and-support/mindfulness/
- NHS website terms/OGL: https://www.nhs.uk/our-policies/terms-and-conditions/

## Verification

Entity query after creation:

- Pilot records: 20
- English sources: 10
- Hebrew drafts: 10
- Active records: 0
- Records missing safety notes or contraindications: 0

No E2E or test suite was run, per project instruction. Only repository integrity and production build checks are permitted for this wave.

## Release gate

Do not activate any source or Hebrew variant until:

1. Hebrew language review is complete.
2. Clinical review is approved.
3. Safety notes and contraindications are approved for the product's intended population.
4. Attribution is confirmed in the user-facing presentation.
5. Exact-language retrieval is rechecked in CI without silent English fallback.
