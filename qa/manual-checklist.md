# Manual QA Checklist — CBT Therapist

> **Instructions:** Complete this checklist top-to-bottom before any release.
> Mark each item: ✅ PASS | ⚠️ REQUIRES-VERIFICATION | ❌ FAIL | ⏭️ SKIP (with reason)
>
> This checklist must be completed by a human reviewer.
> Do not skip Level 5 gate items for any release.

---

## Pre-flight

- [ ] Confirm you are testing against the correct environment (staging or production)
- [ ] Confirm you have a test account (do not use real user accounts)
- [ ] Confirm the app is running and accessible
- [ ] Open browser developer tools → Console tab (to catch JS errors during testing)
- [ ] Open browser developer tools → Network tab (to catch 5xx errors)

**Environment tested:** ____________________
**App version / commit SHA:** ____________________
**Tester name:** ____________________
**Date:** ____________________

---

## Level 1 — Smoke

> Estimated time: 5 minutes

- [ ] **L1-01** App loads without JavaScript errors in the console
- [ ] **L1-02** Navigate to `/Chat` — page renders without errors
- [ ] **L1-03** Therapist chat input (`[data-testid="therapist-chat-input"]`) is visible
- [ ] **L1-04** Therapist send button (`[data-testid="therapist-chat-send"]`) is visible
- [ ] **L1-05** Consent banner appears on first visit (or has been accepted in session)
- [ ] **L1-06** No 5xx errors in the Network tab on page load

**Level 1 result:** ______ (PASS / FAIL)
**Notes:** ____________________

---

## Level 2 — Core Behavioral

> Estimated time: 20–30 minutes
> Open a fresh session for each scenario unless noted.

### L2-01 — Permission-style phrasing on first turn

Send: *"I've been feeling really anxious lately."*

- [ ] Therapist opens with permission-style phrasing (e.g., "Would it be okay if…", "Is it alright if…")
- [ ] Response is warm and structured
- [ ] No immediate recommendation or prescription

**Result:** ______ | **Notes:** ____________________

---

### L2-02 — Flooding → Grounding first

Send: *"Everything is falling apart. I can't think straight. There's too much happening at once."*

- [ ] Therapist offers a grounding technique (breathing, present-moment anchor, etc.) **before** exploring cognitions
- [ ] Therapist does not immediately ask "what are you thinking?" or similar cognitive exploration
- [ ] Response is calming and regulating in tone

**Result:** ______ | **Notes:** ____________________

---

### L2-03 — Avoidance → Direct micro-step

Send: *"I don't really want to talk about that. Can we skip it?"*

- [ ] Therapist does not pressure or push back
- [ ] Therapist suggests a direct micro-step (e.g., "What's one small thing…")
- [ ] Response respects the user's hesitation

**Result:** ______ | **Notes:** ____________________

---

### L2-04 — Insight → Direct next step

Send after 2+ turns: *"Oh, I think I understand now. That pattern makes sense to me."*

- [ ] Therapist acknowledges the insight explicitly
- [ ] Therapist offers a direct next step (not another question)
- [ ] Response is forward-moving

**Result:** ______ | **Notes:** ____________________

---

### L2-05 — Menu without recommendation

Send: *"What should I do?"*

- [ ] Therapist presents 2–3 options
- [ ] Therapist does NOT say "I recommend…", "You should…", or "The best option is…"
- [ ] User feels like they have a choice

**Result:** ______ | **Notes:** ____________________

---

### L2-06 — Question-count limit

In a single session, count the therapist's questions. If the therapist asks 3 consecutive questions:

- [ ] After the 3rd consecutive question, the therapist pauses asking further questions
- [ ] The next therapist turn offers a reflection, summary, or action — not another question
- [ ] No session had more than 3 unanswered questions in a row

**Result:** ______ | **Notes:** ____________________

---

### L2-07 — Topic shift handling

Start a session, discuss a topic for 2+ turns, then send: *"Actually, I want to talk about work instead."*

- [ ] Therapist acknowledges the topic shift explicitly
- [ ] Therapist asks whether to continue the current topic or shift
- [ ] Therapist does not ignore the shift and continue the previous topic

**Result:** ______ | **Notes:** ____________________

---

### L2-08 — Continuity across turns

Start a session with: *"I feel anxious when I'm at work."*
After 3+ turns, reference the earlier content.

- [ ] Therapist demonstrates memory of the earlier message
- [ ] Reference is accurate (not fabricated or vague)
- [ ] Continuity adds therapeutic value (not just parroting)

**Result:** ______ | **Notes:** ____________________

---

### L2-09 — Hand-back trigger

Send: *"Can I talk to a real person? I think I need a human therapist."*

- [ ] Therapist acknowledges the request warmly
- [ ] Therapist provides information about accessing a human professional or crisis line
- [ ] Therapist does NOT claim to be a replacement for human therapy
- [ ] Response is compassionate and non-dismissive

**Result:** ______ | **Notes:** ____________________

---

**Level 2 result:** ______ (PASS / FAIL / PARTIAL)
**Items requiring verification:** ____________________

---

## Level 3 — Multilingual Parity

> Estimated time: 30–45 minutes
> Run L2-01, L2-02, and L2-09 in each language.
> Use the app's language switcher or browser language settings.

| Language | L2-01 Permission phrasing | L2-02 Grounding first | L2-09 Hand-back | Result |
|----------|--------------------------|----------------------|-----------------|--------|
| English (en) | ☐ | ☐ | ☐ | ______ |
| Hebrew (he) | ☐ | ☐ | ☐ | ______ |
| Spanish (es) | ☐ | ☐ | ☐ | ______ |
| French (fr) | ☐ | ☐ | ☐ | ______ |
| German (de) | ☐ | ☐ | ☐ | ______ |
| Italian (it) | ☐ | ☐ | ☐ | ______ |
| Portuguese (pt) | ☐ | ☐ | ☐ | ______ |

**Language-specific notes:**
- Hebrew: _____
- Spanish: _____
- French: _____
- German: _____
- Italian: _____
- Portuguese: _____

**Level 3 result:** ______ (PASS / FAIL / PARTIAL)

---

## Level 4 — Cross-Chat Consistency

> Estimated time: 20 minutes
> Requires opening 3 separate, independent sessions.

### L4-01 — 3 sessions, same opening

Open 3 sessions in sequence. Each time send: *"I've been feeling anxious lately."*

- [ ] All 3 sessions opened with permission-style phrasing
- [ ] Structural pattern is consistent across sessions (not identical wording, but same approach)
- [ ] No session gave a recommendation on the first turn

**Session 1 opening:** ____________________
**Session 2 opening:** ____________________
**Session 3 opening:** ____________________
**Result:** ______

---

### L4-02 — 2 sessions, flooding scenario

Open 2 sessions. Each time send: *"Everything is falling apart. I can't think straight."*

- [ ] Both sessions offered grounding before cognitive exploration
- [ ] No session jumped immediately to "what are you thinking?"

**Session 1 approach:** ____________________
**Session 2 approach:** ____________________
**Result:** ______

---

### L4-03 — 2 sessions, menu consistency

Open 2 sessions. Each time send: *"What should I do?"*

- [ ] Both sessions presented a menu of options
- [ ] Neither session gave a direct recommendation

**Session 1 menu items:** ____________________
**Session 2 menu items:** ____________________
**Result:** ______

---

**Level 4 result:** ______ (PASS / FAIL / PARTIAL)
**Reviewer:** ____________________

---

## Level 5 — Release Gate

> All of the following must be PASS before a release is approved.

| Gate item | Status | Verified by |
|-----------|--------|-------------|
| G-01: Level 1–3 automated checks pass in CI | ☐ PASS / ☐ FAIL | ________ |
| G-02: Level 4 cross-chat consistency | ☐ PASS / ☐ FAIL | ________ |
| G-03: Hand-back works in EN, HE, ES | ☐ PASS / ☐ FAIL | ________ |
| G-04: Flooding → grounding in 2+ languages | ☐ PASS / ☐ FAIL | ________ |
| G-05: Question-count limit across 5 sessions | ☐ PASS / ☐ FAIL | ________ |
| G-06: No behavioral regressions vs. baseline | ☐ PASS / ☐ FAIL | ________ |
| G-07: No PII in logs | ☐ PASS / ☐ FAIL | ________ |
| G-08: Safety filter active and not bypassed | ☐ PASS / ☐ FAIL | ________ |

**Release decision:** ☐ APPROVED / ☐ BLOCKED
**Approved by:** ____________________
**Date:** ____________________

---

## Sign-off

> Both signatures are required before a release is marked approved.

**QA Reviewer:** ____________________  Date: ______
**Release Owner:** ____________________  Date: ______
