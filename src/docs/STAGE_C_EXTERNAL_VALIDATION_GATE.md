# Stage C External Clinical and Legal Validation Gate

**Status:** READY FOR EXTERNAL REVIEW — NOT CLOSED  
**Prepared:** 2026-09-06  
**Code baseline:** `dd8cd72e662cf078f22288cc989a915d7d5bd709`  
**Base44 checkpoint:** `6a9d3272c8b6869287d0425f`

## Purpose

This gate defines the evidence required to close Stage C. It does not authorize a clinical-efficacy claim, diagnose users, or replace independent review. Stage C remains open until the sign-offs below are completed by qualified external reviewers.

## Implemented Product Evidence

| Area | Evidence | Current status |
|---|---|---|
| Human-help path | Explicit country selection independent of display language; verified official sources; emergency, urgent, and additional support tiers | Implemented |
| Country coverage | United States, Israel, Spain, France, Germany, Italy, Portugal, plus IASP global directory | Implemented |
| Language coverage | English, Hebrew, Spanish, French, German, Italian, Portuguese | Automated parity tests pass |
| Outcome tracking | Voluntary 0–10 self-report for wellbeing, distress, and daily functioning; device-local storage; first-to-latest deltas | Implemented, non-diagnostic |
| Progress export | User-initiated JSON; per-file consent; no account identifier; narrative fields excluded by default and allowlisted after opt-in | Implemented |
| Data flow | Outcome check-ins remain on the device; export is created locally; no new Base44 entity or backend write | Verified by code review |
| Build evidence | Focused tests 9/9, typecheck report clean, production build successful | Pass |
| Live preview | Hebrew Progress screen rendered; export controls disabled before consent and re-disabled after consent withdrawal | Pass |

## Clinical Review Gate

A licensed mental-health professional with relevant CBT and digital-mental-health experience must review the exact baseline above.

### Required determinations

- [ ] The three self-report dimensions are described as reflection tools, not validated diagnostic or screening instruments.
- [ ] Labels, scale direction, trend wording, and the first-to-latest comparison cannot reasonably be read as proof of treatment efficacy.
- [ ] Worsening distress is not presented as improvement and improving function/wellbeing is not presented as deterioration.
- [ ] The crisis and urgent-help hierarchy is understandable under stress.
- [ ] The country selector does not infer emergency jurisdiction from language and does not silently default.
- [ ] The product makes clear that users must contact local emergency services when danger is immediate.
- [ ] The export is suitable as a user-controlled discussion aid and is not presented as a clinical record.
- [ ] No new clinical recommendation is introduced by the Stage C UI.

### Reviewer record

| Field | Required value |
|---|---|
| Reviewer name | Pending |
| License / professional registration | Pending |
| Jurisdiction | Pending |
| Relevant specialty | Pending |
| Review date | Pending |
| Baseline commit reviewed | Must equal the code baseline above |
| Decision | Approved / Approved with conditions / Blocked |
| Findings and required changes | Pending |
| Signature or traceable written approval | Pending |

## Legal and Privacy Review Gate

Qualified privacy/legal counsel for the intended launch jurisdictions must review the exact baseline above.

### Required determinations

- [ ] Device-local storage disclosure is accurate for supported webviews and browsers.
- [ ] Per-export consent is sufficiently specific, freely given, and repeatable.
- [ ] Narrative inclusion is off by default and the warning accurately describes the selected fields.
- [ ] Exported identifiers and metadata are appropriately minimized.
- [ ] Users understand that a downloaded/shared file leaves the app's protection and may be accessible to the selected recipient or other apps on the device.
- [ ] The existing privacy policy and terms accurately cover local outcome storage and user-initiated export/share.
- [ ] Retention, deletion, and account-deletion wording is consistent with the fact that device-local check-ins are separate from server-side data.
- [ ] Emergency-service source attribution and regional disclaimers meet launch-market requirements.
- [ ] Child/adolescent use, consent capacity, and guardian requirements are resolved for each target market.

### Counsel record

| Field | Required value |
|---|---|
| Reviewer / firm | Pending |
| Jurisdictions covered | Pending |
| Review date | Pending |
| Baseline commit reviewed | Must equal the code baseline above |
| Decision | Approved / Approved with conditions / Blocked |
| Required policy or product changes | Pending |
| Traceable written approval | Pending |

## Seven-Language Human Review Matrix

Automated parity prevents missing keys; it does not establish linguistic or clinical quality. Each row requires review by a fluent reviewer familiar with mental-health terminology.

| Locale | Language | Crisis wording | Outcome wording | Consent/export wording | Reviewer and date |
|---|---|---:|---:|---:|---|
| en | English | ☐ | ☐ | ☐ | Pending |
| he | Hebrew | ☐ | ☐ | ☐ | Pending |
| es | Spanish | ☐ | ☐ | ☐ | Pending |
| fr | French | ☐ | ☐ | ☐ | Pending |
| de | German | ☐ | ☐ | ☐ | Pending |
| it | Italian | ☐ | ☐ | ☐ | Pending |
| pt | Portuguese | ☐ | ☐ | ☐ | Pending |

For every locale, the reviewer must confirm meaning, tone under distress, reading level, number formatting, layout direction, truncation on 390×844 mobile, and absence of English fallback.

## Validation Session Protocol

Run at least five scripted sessions per locale, including:

1. Immediate danger: country not yet selected.
2. Immediate danger: country selected.
3. Urgent but not immediate support.
4. Saving two outcome check-ins with improvement and worsening patterns.
5. Export consent off, consent on, narrative off, narrative on, consent reset after action.

Record the app version, device, locale, selected country, observed text, expected result, pass/fail, reviewer, and evidence link. Any crisis-routing error, misleading clinical claim, cross-account data exposure, or missing-language fallback is a blocking finding.

## Outcome-Measurement Limits

The current three-item check-in is a transparent product metric, not a validated instrument. Before any public claim that Mindful Path improves symptoms or clinical outcomes:

- define the intended population and outcome;
- select appropriately validated instruments and confirm licensing/translation rights;
- obtain ethics/IRB review when the work constitutes human-subjects research;
- predefine endpoints, time windows, missing-data handling, adverse-event monitoring, and statistical analysis;
- use an independent clinical/statistical reviewer;
- report limitations and avoid causal language unless the study design supports it.

## Closure Rule

Stage C closes only when all of the following are true:

- [x] Human-help flow implemented with country choice and seven-language parity.
- [x] Consent-based local progress export implemented.
- [x] Non-diagnostic device-local outcome framework implemented.
- [x] Automated tests, typecheck, build, and live preview pass.
- [ ] Clinical reviewer approves the exact baseline.
- [ ] Legal/privacy reviewer approves the exact baseline.
- [ ] Seven-language human review matrix is complete.
- [ ] All blocking findings are fixed and the reviewers approve the resulting new baseline.

Until those four external items are complete, the decision is **Stage C open; Stage D not started under the user's sequencing rule**.
