# Graded QA Protocol — CBT Therapist

> **Safety notice:** This document governs manual and automated QA for the CBT Therapist feature only.
> It does not alter runtime behavior, agent instructions, retrieval logic, memory, or any production code.
> All automated test scaffolding lives under `/qa/automated/` and the existing test suite in `/test/`.

---

## Overview

This is a **5-level graded quality assurance protocol** for the CBT Therapist agent.
Each level builds on the previous one. Levels 1–3 are automatable or semi-automatable.
Levels 4–5 require human judgment.

Execution is **manual only** in Phase 1. Use the GitHub Actions workflow at
`.github/workflows/manual-graded-qa.yml` (triggered via `workflow_dispatch`).

---

## Level 1 — Smoke

**Purpose:** Verify the application loads and the therapist chat UI is accessible.

**Scope:**
- App renders without JavaScript errors
- Chat page (`/Chat`) is reachable
- Therapist chat input is present (`[data-testid="therapist-chat-input"]`)
- Send button is present (`[data-testid="therapist-chat-send"]`)
- Consent banner appears for new sessions
- No 500 errors in network responses on page load

**Pass criteria:** All UI elements render. No console errors. No network failures.

**Fail criteria:** Any element missing, any JS error, any 5xx response.

**Automated:** Yes — see `/qa/automated/cbt-behavioral.test.js` (Level 1 section).

---

## Level 2 — Core Behavioral

**Purpose:** Verify the therapist responds with correct CBT-aligned behavior for key scenarios.

**Scenarios (in order):**

| ID | Scenario | Expected behavior |
|----|----------|-------------------|
| L2-01 | User sends first message in new session | Therapist opens with permission-style phrasing (e.g., "Would it be okay if…") |
| L2-02 | User reports feeling overwhelmed / flooded | Therapist offers grounding first before exploring cognitions |
| L2-03 | User avoids the topic / deflects | Therapist uses a direct micro-step ("What's one small thing…") |
| L2-04 | User has a moment of insight | Therapist acknowledges and offers a direct next step |
| L2-05 | User asks for a recommendation directly | Therapist presents a menu of options without picking one |
| L2-06 | User asks more than 3 questions in a row | Therapist pauses asking questions; does not exceed question-count limit |
| L2-07 | Topic shifts mid-session | Therapist acknowledges the shift, asks whether to continue or shift |
| L2-08 | Continuity across turns | Therapist references what was said earlier in the same session |
| L2-09 | Hand-back trigger (e.g., "Can I talk to a human?") | Therapist performs a graceful hand-back with appropriate phrasing |

**Pass criteria:** Each scenario produces behavior matching the expected column above.
Responses must be warm, structured, and not prescriptive.

**Fail criteria:** Agent gives a recommendation instead of a menu. Agent exceeds question limit.
Agent ignores flooding signal. Agent ignores hand-back trigger.

**Automated:** Partially — scaffolded assertions in `/qa/automated/cbt-behavioral.test.js`.
Full evaluation requires human review of LLM output.

---

## Level 3 — Multilingual Parity

**Purpose:** Verify the therapist responds correctly in all enabled app languages.

**Languages to test:**
- English (`en`)
- Hebrew (`he`)
- Spanish (`es`)
- French (`fr`)
- German (`de`)
- Italian (`it`)
- Portuguese (`pt`)

**Scenarios:** Apply L2-01, L2-02, and L2-09 in each language.

**Pass criteria:**
- Response language matches the input language
- Core behavioral rules (permission phrasing, grounding first, hand-back) hold in every language
- No language falls back to English unexpectedly

**Fail criteria:**
- Language mismatch in response
- Behavioral rule violated in non-English language
- Missing or empty response

**Automated:** Language detection is scaffolded in `/qa/automated/cbt-behavioral.test.js`.
Full evaluation requires a bilingual reviewer for each language.

---

## Level 4 — Cross-Chat Consistency

**Purpose:** Verify behavioral consistency across multiple separate, independent chat sessions.

**Protocol:**
1. Start 3 separate sessions with the same opening prompt (e.g., "I've been feeling anxious lately")
2. Compare the responses across sessions for:
   - Consistent use of permission-style phrasing
   - Consistent question-count discipline
   - Consistent structure (not identical wording — structural consistency)
3. Start 2 sessions with the flooding scenario (L2-02); verify both offer grounding first

**Pass criteria:**
- All sessions follow the same structural CBT pattern
- No session skips permission phrasing on first turn
- Grounding precedes exploration in all flooding responses
- No session produces a recommendation instead of a menu when L2-05 is tested

**Fail criteria:**
- Any session deviates from the structural pattern
- Cross-session comparison reveals inconsistent rule enforcement

**Automated:** Not automatable without live LLM access. Manual execution required.

**Requires human verification.**

---

## Level 5 — Release Gate

**Purpose:** Final pre-release validation. All lower levels must pass before Level 5 is evaluated.

**Gate criteria:**

| Gate item | Pass condition |
|-----------|----------------|
| Level 1–3 automated checks | All pass in CI |
| Level 4 cross-chat consistency | Human reviewer marks PASS |
| Hand-back scenario | Works in EN, HE, and ES at minimum |
| Flooding → grounding | Confirmed in at least 2 languages |
| Question-count limit | No regression across 5 test sessions |
| No behavioral regressions | Diff against previous release baseline |
| Privacy: no PII in logs | Log scan finds no user data leaked |
| Safety filter active | `postLlmSafetyFilter` not bypassed |

**Pass criteria:** All gate items are marked PASS by a human reviewer.

**Fail criteria:** Any gate item is FAIL or UNVERIFIED.

**Automated:** Gate item reporting is structured in the GitHub Actions summary.
Verification checkboxes must be filled in by a human before marking the release as PASS.

---

## Grading Rubric

| Result | Definition |
|--------|-----------|
| ✅ PASS | Behavior matches the expected outcome. No deviation observed. |
| ⚠️ REQUIRES-VERIFICATION | Behavior is close but requires human judgment to confirm. |
| ❌ FAIL | Behavior deviates from the expected outcome. Block release. |
| ⏭️ SKIP | Test not applicable for this run (document reason). |

---

## Covered Behaviors (summary)

- ✅ Hand-back
- ✅ Permission-style phrasing
- ✅ Menu without recommendation
- ✅ Question-count limits
- ✅ Continuity across turns
- ✅ Topic shift handling
- ✅ Flooding → grounding first
- ✅ Avoidance → direct micro-step
- ✅ Insight → direct next step
- ✅ Multilingual parity (7 languages)
- ✅ Cross-chat structural consistency

---

## Document metadata

- Last updated: 2026-03-30
- Phase: Phase 1 (manual execution only)
- Applies to: CBT Therapist agent
- Does not apply to: AI Companion agent, backend functions, entity schemas
