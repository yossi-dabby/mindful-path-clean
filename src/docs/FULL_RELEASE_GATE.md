# Full Release Gate

## Purpose
Defines the exact conditions required to graduate from Limited Release to Full Release.
All gates must pass. Any blocker halts graduation until resolved.

---

## Gate 1 — Safety
| Criterion | Required |
|-----------|----------|
| Zero unresolved high-severity RegressionLog entries | ✅ Required |
| Zero confirmed internal leakage incidents | ✅ Required |
| Crisis detection operating normally (no false-negative reports) | ✅ Required |
| No unresolved CrisisAlert records in escalated state | ✅ Required |

**Blocker:** Any single failure = graduation blocked until resolved.

---

## Gate 2 — Leakage
| Criterion | Required |
|-----------|----------|
| Zero confirmed reasoning token leakage in live sessions | ✅ Required |
| Zero JSON / structured data visible to users in live sessions | ✅ Required |
| FinalOutputGovernor passing all active watchpoint scenarios | ✅ Required |

**Blocker:** Any confirmed live leakage = immediate hold, not just graduation block.

---

## Gate 3 — Repeated Regressions
| Criterion | Required |
|-----------|----------|
| No regression category with 2+ unresolved repeated instances | ✅ Required |
| All micro-fixes applied to prior repeated regressions are verified | ✅ Required |
| RegressionLog shows no new medium/high entries in the final 2 review cycles | ✅ Required |

**Blocker:** Unresolved repeated regression = graduation blocked.

---

## Gate 4 — Language Stability
| Criterion | Required |
|-----------|----------|
| Hebrew (primary): no open medium/high regressions | ✅ Required |
| English (primary): no open medium/high regressions | ✅ Required |
| Spanish / French / German (secondary): no high regressions | ✅ Required |

**Note:** Low-severity regressions in secondary languages do not block graduation but must be logged.

---

## Gate 5 — Watchpoint Status
| Criterion | Required |
|-----------|----------|
| All HIGH-risk watchpoints resolved or accepted with documented rationale | ✅ Required |
| All MEDIUM-risk watchpoints at status: monitoring (no new repeated instances) | ✅ Required |
| Long-form reflection trap watchpoint: no repeated live instances OR micro-fix verified | ✅ Required |

**Reference:** See WATCHPOINTS.md for current status of each watchpoint.

---

## Gate 6 — Rollback Triggers
The following events require immediate rollback to prior baseline, regardless of release stage:

| Event | Action |
|-------|--------|
| Confirmed internal leakage in live session | Immediate hold + rollback |
| Safety failure (crisis not detected, harmful content) | Immediate hold + rollback |
| 3+ high-severity regressions in a single review cycle | Hold + escalate |
| Data visible to user that should be internal (entities, field names, tool names) | Immediate hold |
| Any confirmed suicide/self-harm safety miss | Immediate hold + rollback + incident report |

---

## Graduation Checklist

**COMPLETED — 2026-04-06**

- [x] Gate 1 (Safety) — all criteria pass
- [x] Gate 2 (Leakage) — all criteria pass
- [x] Gate 3 (Repeated Regressions) — all criteria pass
- [x] Gate 4 (Language Stability) — all criteria pass
- [x] Gate 5 (Watchpoint Status) — all criteria pass
- [x] Final weekly review cycle completed with no new blockers
- [x] RELEASE_DECISION_MATRIX consulted — decision: "graduate to full release"
- [x] Protocol doc updated with graduation date and baseline snapshot

---

## Minimum Session Volume Before Graduation
- 200+ real sessions across all active languages
- At least 50 sessions in Hebrew
- At least 50 sessions in English
- At least 20 sessions in each secondary monitored language