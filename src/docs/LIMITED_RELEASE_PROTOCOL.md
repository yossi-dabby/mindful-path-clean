# CBT Therapist — Limited Release Protocol

## Status
**FULL RELEASE — Graduated 2026-04-06**

Baseline: CP11 + CP12 (social anxiety / sleep anxiety ask-back suppression) + CP12-HE (Hebrew semantic anti-worksheet rewrite) + CP13-EN (English reflection trap pass) + Release Hardening Pack (7 components: Fail-Closed output governance, Crisis Threshold recalibration, No-response fallback, Stability guards, Reflection trap kill-switches, Multilingual purity enforcement, Post-learning output compression).

All therapist logic is **production-frozen** at this baseline. No clinical additions, no new CP/C/L levels, no curriculum expansion, no architectural changes are permitted without a formal Hold-Escalate justification.

**Graduation: 2026-04-06.** All Full Release Gates (1–5) passed. All 7 hardening blockers marked clean.

---

## Hard Rules

| Rule | Detail |
|------|--------|
| Production-freeze therapist logic | No clinical changes without escalation justification |
| No new layers | No new CP / C / L levels unless Hold-Escalate event requires it |
| No curriculum expansion | No new CBTCurriculumUnit records without formal review |
| Log regressions | Every observed regression goes into RegressionLog |
| Single bad answer | Monitor only — no fix |
| 2+ independent repetitions of same regression | One targeted micro-fix eligible (narrowest possible scope) |
| Internal leakage | Immediate hold + escalate — do not wait for repetition |
| Critical safety failure | Immediate hold + escalate + incident report |

---

## Primary Monitoring Languages
- Hebrew
- English

## Secondary Monitoring Languages
- Spanish
- French
- German

---

## Active Watchpoints

### 1. Worry not action-first
- **Pattern:** Agent responds to worry/rumination with exploration, reflection, or question instead of a bounded action step.
- **Expected behavior:** Worry postponement window OR one concrete bounded action — no ask-back, no "tell me more".
- **Threshold:** 2 independent confirmed instances → micro-fix eligible.

### 2. Continuity contamination
- **Pattern:** Agent references a prior session's topic/domain when current message does not contain an explicit topic keyword (RULE ZERO violation).
- **Expected behavior:** Suppressed opener — no prior-topic mention whatsoever.
- **Threshold:** 2 independent confirmed instances → micro-fix eligible.

### 3. Product-level disappearing replies
- **Pattern:** Agent reply is sent but does not render in the chat UI, or arrives empty/truncated.
- **Note:** Track separately from CBT logic regressions. This is a platform/rendering issue, not a prompt issue.
- **Escalation:** Any confirmed instance → immediate platform-level investigation.

### 4. Hebrew worksheet drift (watchpoint only)
- **Pattern:** Hebrew response returns tracking homework, belief-rating, evidence loops, or multi-day logging as first move.
- **Expected behavior:** One same-day bounded directive step, no worksheet, no rating, no question ending.
- **Note:** CP12-HE semantic rewrite is now live. Remaining instances are monitoring data only.
- **Threshold:** 2 independent confirmed instances of the same sub-pattern → micro-fix eligible.

### 5. EN/HE long-form reflection trap (watchpoint only)
- **Pattern:** After initial calming or partial progress, agent shifts into worksheet mode, multi-paragraph formulation, gather-info-first, or over-explanation instead of a single bounded action step.
- **Expected behavior:** 1–3 sentences max. One concrete same-day action. No evidence loops, no distortion labeling, no multi-day tracking.
- **Fix status:** CP13-EN implemented 2026-04-05. Verification deferred. Do NOT reopen from hypothetical concern.
- **Reopen rule:** Only if repeated in real live sessions with 2+ independent confirmed instances (same regression_category + scenario_type).
- **Threshold:** 2 independent confirmed real-session instances → micro-fix eligible.

---

## Regression Logging

Use entity: `RegressionLog`

Required fields per entry:
- `date` — session date
- `language` — session language
- `scenario_type` — clinical scenario category
- `user_prompt` — exact user message that triggered the regression
- `model_reply` — exact agent reply that exhibited the regression
- `regression_category` — one of the defined categories
- `severity` — low / medium / high

Optional but recommended:
- `repeated_regression` — true if this is the 2nd+ independent confirmed instance
- `fix_triggered` — true if a micro-fix was applied as a result
- `notes` — reviewer context, mitigation, or resolution

---

## Severity Definitions

| Level | Meaning |
|-------|---------|
| low | Noticeable drift but recoverable within session |
| medium | Clear regression — directive direction lost |
| high | Safety failure, internal leakage, or major clinical failure |

---

## Decision Rules

| Observation | Action |
|-------------|--------|
| Single regression, severity low/medium | Log → monitor only |
| Single regression, severity high | Log → immediate hold + escalate |
| Internal leakage (any severity) | Immediate hold + escalate — no wait |
| 2+ independent confirmed instances, same category + scenario | Log `repeated_regression: true` → micro-fix eligible |
| Micro-fix applied | Log `fix_triggered: true` → re-run focused regression test on that prompt |

---

## Micro-Fix Rules

- Scope: one isolated code path only — the confirmed regression pattern.
- No collateral changes to unrelated CP/C/L rules.
- No broad re-tuning.
- Must pass focused regression test on the two triggering prompts before merge.
- Document the fix in the RegressionLog entry.

---

## Release Stages

| Stage | Status |
|-------|--------|
| Limited Release | ✅ Completed — graduated 2026-04-06 |
| Full Release | ✅ **ACTIVE** — all gates passed, therapist logic production-frozen |

## Graduation Record

| Field | Value |
|-------|-------|
| Graduation date | 2026-04-06 |
| Gate 1 — Safety | ✅ PASS |
| Gate 2 — Leakage | ✅ PASS |
| Gate 3 — Repeated Regressions | ✅ PASS |
| Gate 4 — Language Stability | ✅ PASS |
| Gate 5 — Watchpoint Status | ✅ PASS |
| Hardening blockers | ✅ All 7 clean |
| Therapist logic | Production-frozen at baseline above |

---

## Notes

- Therapist logic is production-frozen. Do not modify without a formal Hold-Escalate event.
- All micro-fixes must be logged in RegressionLog before deployment.
- Disappearing-reply incidents are tracked in a separate incident log, not in RegressionLog.
- This document was formerly LIMITED_RELEASE_PROTOCOL.md. Renamed in-place at graduation.