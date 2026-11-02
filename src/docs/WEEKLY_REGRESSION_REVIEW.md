# Weekly Regression Review Process

## Purpose
A simple, repeatable weekly process to monitor live session quality and produce exactly one decision per cycle.

---

## Cadence
- Frequency: Weekly (every 7 days)
- Duration: ~30 minutes
- Output: One decision from RELEASE_DECISION_MATRIX.md + a log entry

---

## Step 1 — Pull RegressionLog Entries
Query all RegressionLog entries from the past 7 days:
- Filter: `date >= [last review date]`
- Sort: `severity desc, scenario_type asc`

If zero entries: skip to Step 4 (Safe to Continue).

---

## Step 2 — Cluster by Category + Scenario
Group entries by:
- `regression_category` + `scenario_type` combination

For each cluster:
- Count entries
- Note if any have `repeated_regression: true`
- Note severity distribution (low / medium / high)

---

## Step 3 — Identify Repeated Regressions
A regression is **repeated** when:
- Same `regression_category` + `scenario_type`
- 2 or more independent confirmed instances
- Not already marked `fix_triggered: true`

Flag these for decision in Step 4.

---

## Step 4 — Apply Decision Matrix
Using the clusters from Step 3, apply RELEASE_DECISION_MATRIX.md in order:

1. **Any safety / leakage / high-severity entry?** → HOLD — ESCALATE
2. **Any repeated regression (not yet fixed)?** → MICRO-FIX ELIGIBLE
3. **All Full Release Gates pass?** → GRADUATE TO FULL RELEASE
4. **None of the above** → SAFE TO CONTINUE LIMITED RELEASE

---

## Step 5 — Execute Decision
| Decision | Action |
|----------|--------|
| Safe to Continue | Log review date. No changes. |
| Micro-Fix Eligible | Identify narrowest fix. Apply. Verify. Log `fix_triggered: true`. |
| Hold — Escalate | Freeze. Investigate. Rollback if needed. |
| Graduate | Complete graduation checklist in FULL_RELEASE_GATE.md. |

---

## Step 6 — Update Watchpoints
After each review:
- Open WATCHPOINTS.md
- Update `Current Status` for any watchpoint that had new activity
- Note the review date in each updated watchpoint's status field

---

## Review Log Format
Record each completed review as a short entry:

```
## Review [YYYY-MM-DD]
- Entries reviewed: [N]
- Clusters identified: [list]
- Repeated regressions: [none / list]
- Decision: [one of four]
- Action taken: [description or "none"]
- Watchpoints updated: [list or "none"]
```

---

## Anti-Rules
- Do not reopen a watchpoint based on hypothetical concern
- Do not apply a micro-fix without 2+ confirmed independent instances
- Do not skip a review cycle — log "zero entries" if nothing to review
- Do not produce a fifth decision type — the matrix has exactly four