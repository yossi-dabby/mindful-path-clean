# Readiness corrections — 21 November 2026

Baseline: `6bc0af6e1224cf418f7bd86721c798a5e63914f1`.

## Changes

- Preserve unsent chat text and the selected conversation across tab navigation.
  Drafts are separated by conversation and held only in the authenticated
  session's memory. Logout, account deletion, confirmed authentication loss and
  account changes clear them. A generation guard rejects late writes from a
  previous session, including a later login by the same user. Sent/cleared drafts
  do not reappear. Full reloads do not retain this sensitive text on disk.
- Save scroll before an outgoing animated page unmounts, then restore on the
  incoming page. Resize observation accommodates delayed content; user gestures
  cancel restoration. Retapping the current tab still intentionally goes to top.
- Enforce minimum 48 CSS-pixel controls on mobile/coarse-pointer layouts. Switches
  have an actual 48 × 48 target with a compact track inside it, rather than a
  pseudo-element target assumed by the older test.
- Reverse route transitions for browser Back, respecting RTL and reduced motion.
- Lazy-load PDF and administration routes.

## Verification

The production build of the isolated checkout passed. The initial JS entry
decreased from 3,620,569 to 2,965,419 bytes (18.1%). Gzip decreased from 1,120,149
to 934,410 bytes (16.6%). These are build sizes, not device startup benchmarks.

Final results across the selected Chromium runs: **105 checks passed**:

- 98 navigation, accessibility, pull-to-refresh, settings, mock account-deletion,
  chat refresh and new readiness regression/control checks.
- 3 additional draft checks: restore selected conversation, isolate two
  conversations, and avoid restoring successfully submitted text.
- 4 PDF retry/render/download/return checks in English/Hebrew at 333/768 px.

An additional visual smoke check inspected Home, Settings and Chat in Hebrew.
**All 11,497 project unit/source tests passed**, with no failed or skipped tests
and no failed suites. Coverage includes draft session isolation, stale-session
writes, transition direction, actual draft cleanup on account deletion, and chat
refresh recovery. The full project ESLint and `git diff --check` passed.
The deletion tests use the real in-memory draft store; its relative import also
works in the unit runner, which does not configure the application path alias.

The older switch test assumed a `::after` hitbox and returned NaN after the real
target replaced it. It now measures the actual 48 × 48 box. Native Chromium
downloads bypass the page-level PDF mock, so the isolated static test server was
also given the synthetic PDF fixture; the missing-file/retry fetch remained mocked.
These test-harness issues are not counted as application failures.

## Test entry points

- `tests/e2e/readiness-regressions.spec.ts`
- `tests/e2e/readiness-controls.spec.ts`
- `tests/e2e/readiness-chat-drafts.spec.ts`
- `test/utils/chatDraftSession.test.js`
- `test/utils/pageTransitions.test.js`

Browser tests used synthetic API fixtures and a production web build. No real
account was deleted. The changes still need a physical Android acceptance pass
(Back gestures, keyboard, safe areas, TalkBack, lifecycle and startup performance).
Provider conversation erasure, direct-API age enforcement, training/retention
commitments, business verification and the scheduled real-clock retention check
are separate open items; these frontend changes do not resolve them.
