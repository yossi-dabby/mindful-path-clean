# Release Decision Matrix

## Purpose
Every review cycle produces exactly one of four decisions. No other decisions are valid.

---

## The Four Decisions

### 1. Safe to Continue Limited Release
**Condition:** All of the following are true:
- No new high-severity RegressionLog entries
- No confirmed leakage
- No unresolved repeated regressions
- All watchpoints at "monitoring" status

**Action:** Log review completion date. No changes. Continue collecting sessions.

---

### 2. Micro-Fix Eligible
**Condition:** All of the following are true:
- A regression category has 2+ independent confirmed instances (same category + scenario_type)
- Severity is low or medium (not high)
- No leakage or safety failure present

**Action:**
- Apply one narrowly scoped fix targeting only the confirmed regression path
- Log `fix_triggered: true` in the RegressionLog entries
- Re-run focused regression test on the two triggering prompts before merge
- Next review: verify fix holds, then return to "safe to continue"

**Constraint:** Micro-fix scope is one isolated code path only. No collateral changes.

---

### 3. Hold — Escalate
**Condition:** Any one of the following:
- A single high-severity regression confirmed
- Any confirmed internal leakage
- Any safety failure (crisis miss, harmful content)
- 3+ medium regressions in a single review cycle with no clear fix path
- A rollback trigger event (see FULL_RELEASE_GATE.md) is confirmed

**Action:**
- Freeze all deployments immediately
- Document the incident in RegressionLog with severity: high
- Do not apply a micro-fix — escalate to full investigation
- Rollback to prior stable baseline if user impact is confirmed
- Resume only after root cause is identified and resolved

---

### 4. Graduate to Full Release
**Condition:** All gates in FULL_RELEASE_GATE.md pass simultaneously:
- Gate 1 (Safety) ✅
- Gate 2 (Leakage) ✅
- Gate 3 (Repeated Regressions) ✅
- Gate 4 (Language Stability) ✅
- Gate 5 (Watchpoint Status) ✅
- Minimum session volume reached ✅

**Action:**
- Update protocol doc status to "FULL RELEASE"
- Record graduation date and final baseline snapshot
- Archive Limited Release phase as complete
- Carry all watchpoints forward as monitor-only under Full Release rules
- Freeze therapist logic as production baseline

**DECISION TAKEN: 2026-04-06 — Graduated to Full Release.**

---

## Decision Flow (Quick Reference)

```
Review cycle complete
        │
        ▼
Any safety / leakage / rollback trigger? ──YES──► HOLD — ESCALATE
        │ NO
        ▼
Any repeated regression (2+ same category + scenario)? ──YES──► MICRO-FIX ELIGIBLE
        │ NO
        ▼
All Full Release Gates pass + session volume met? ──YES──► GRADUATE TO FULL RELEASE
        │ NO
        ▼
SAFE TO CONTINUE LIMITED RELEASE
`