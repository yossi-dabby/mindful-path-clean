# Active Watchpoints

## Status
**FULL RELEASE — Graduated 2026-04-06. All watchpoints carried forward as monitor-only.**

## Purpose
All active monitoring targets for the Full Release phase.
Each watchpoint has a defined reopen rule — do not reopen from hypothetical concern.

---

## Watchpoint 1 — Worry Not Action-First

| Field | Value |
|-------|-------|
| **Name** | Worry Not Action-First |
| **Risk Level** | MEDIUM |
| **Languages** | Hebrew, English |
| **Scenario Type** | worry_overthinking |
| **Pattern** | Agent responds to worry/rumination with exploration, reflection, or a question instead of a bounded action step (worry postponement window or one concrete step) |
| **Expected Behavior** | Worry postponement frame OR one concrete bounded action — no ask-back, no "tell me more" |
| **Current Status** | Monitoring — no confirmed repeated instances as of 2026-04-05 |
| **Reopen Rule** | 2 independent confirmed real-session instances (same regression_category + scenario_type) |
| **Owner** | Weekly Regression Review |

---

## Watchpoint 2 — Continuity Contamination

| Field | Value |
|-------|-------|
| **Name** | Continuity Contamination |
| **Risk Level** | MEDIUM |
| **Languages** | Hebrew, English |
| **Scenario Type** | session_opener, continuity_return |
| **Pattern** | Agent references a prior session's topic/domain when current message does not contain an explicit topic keyword (RULE ZERO violation) |
| **Expected Behavior** | Suppressed opener — no prior-topic mention unless user explicitly reintroduces it |
| **Current Status** | Monitoring — no confirmed repeated instances as of 2026-04-05 |
| **Reopen Rule** | 2 independent confirmed real-session instances |
| **Owner** | Weekly Regression Review |

---

## Watchpoint 3 — Hebrew Worksheet Drift

| Field | Value |
|-------|-------|
| **Name** | Hebrew Worksheet Drift |
| **Risk Level** | LOW (mitigated) |
| **Languages** | Hebrew |
| **Scenario Type** | work_task, worry_overthinking, social_anxiety |
| **Pattern** | Hebrew response returns tracking homework, belief-rating, evidence loops, or multi-day logging as first move |
| **Expected Behavior** | One same-day bounded directive step — no worksheet, no rating scale, no question ending |
| **Fix Applied** | CP12-HE semantic rewrite — live as of 2026-04-05 |
| **Current Status** | Monitoring — CP12-HE active. Remaining instances are monitoring data only. |
| **Reopen Rule** | 2 independent confirmed real-session instances of the same sub-pattern post-fix |
| **Owner** | Weekly Regression Review |

---

## Watchpoint 4 — Long-Form Reflection Trap (EN + HE)

| Field | Value |
|-------|-------|
| **Name** | Long-Form Reflection Trap |
| **Risk Level** | LOW (mitigated) |
| **Languages** | Hebrew, English |
| **Scenario Type** | worry_overthinking, work_task, partial_completion, social_anxiety |
| **Pattern** | After initial calming or partial progress, agent shifts into worksheet mode, multi-paragraph formulation, gather-info-first, or over-explanation instead of a single bounded action step |
| **Expected Behavior** | 1–3 sentences max. One concrete same-day action. No evidence loops, no distortion labeling, no multi-day tracking. |
| **Fix Applied** | CP13-EN English reflection trap pass — implemented 2026-04-05. Verification deferred. |
| **Current Status** | **Monitored watchpoint — NOT a blocker.** No confirmed repeated live instances as of 2026-04-05. |
| **Reopen Rule** | Only if repeated in real live sessions — 2+ independent confirmed instances (same regression_category + scenario_type). Do NOT reopen from hypothetical concern or synthetic test results. |
| **Owner** | Weekly Regression Review |

---

## Watchpoint 5 — Product-Level Disappearing Replies

| Field | Value |
|-------|-------|
| **Name** | Disappearing / Empty Replies |
| **Risk Level** | HIGH (platform-level) |
| **Languages** | All |
| **Scenario Type** | any |
| **Pattern** | Agent reply is sent but does not render in the chat UI, or arrives empty/truncated |
| **Expected Behavior** | Every sent message renders fully and immediately |
| **Current Status** | Monitoring — tracked separately from CBT logic regressions. Any confirmed instance = immediate platform-level investigation. |
| **Reopen Rule** | Any single confirmed instance — this watchpoint does not require 2+ instances. |
| **Owner** | Platform / Engineering |

---

## Summary Table

| # | Name | Risk | Status | Blocker? |
|---|------|------|--------|----------|
| 1 | Worry Not Action-First | MEDIUM | Monitoring | No (unless repeated) |
| 2 | Continuity Contamination | MEDIUM | Monitoring | No (unless repeated) |
| 3 | Hebrew Worksheet Drift | LOW | Monitoring (fix live) | No (unless repeated post-fix) |
| 4 | Long-Form Reflection Trap | LOW | Monitoring (fix live, verification deferred) | No (unless repeated in live) |
| 5 | Disappearing Replies | HIGH | Monitoring | Any single instance |

---

## Operational Rules
- Do not reopen a watchpoint from hypothetical concern or synthetic tests
- Reopen only on real-session evidence meeting the stated reopen rule
- Update status field after each weekly review cycle
- A HIGH-risk watchpoint with a confirmed instance triggers HOLD — ESCALATE immediately
- Therapist logic is production-frozen — micro-fixes remain the only permitted response to repeated regressions
- Internal leakage or critical safety failure → Immediate hold + escalate (no wait for 2nd instance)