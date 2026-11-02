# Stage 6 — Settings and shared UI verification

Base: `27773699e7840f71c5a74d0a25e98abf0380aaa8` (merged PR #1039).
Implementation branch: `fix/settings-stage6-ui`; target: `main`.

The changes address preference overwrites and rollback, appearance mode/palette
persistence, language-save feedback, account confirmation recovery, notification
focus and invalid dates, mobile menu focus, authentication form accessibility,
public-page translation and dark surfaces, admin gating/error recovery,
knowledge editor accessibility/import validation, training draft recovery, and
startup error copy, alert loading/partial-data recovery and clipboard errors. Settings no longer creates points/subscription records just
because a user views the page. Quick navigation stays in document flow so a
short viewport can expose Save.

The palette selection previously updated legacy RGB variables that the active
semantic theme did not consume. Five additional palettes now set accessible
primary/secondary tokens in both light and dark mode; the default palette keeps
its established tokens. Canonical legacy values are shared by selection and
initialization. The light/dark/system choice uses the existing next-themes
storage and does not introduce a new profile field.

Preference patches are serialized, merged with a fresh server profile, checked
against the expected user identity, and written through the existing SDK.
Unknown preference keys survive. A failed write does not block later writes;
local cache failures do not misreport a successful server write.

## Evidence and coverage

- 17 regular-user routes across widths 360, 390, 430, 768, 1024, 1280, 1440;
  English/Hebrew × light/dark (476 route observations).
- Authorized admin views at the same sizes (84 route observations), separate
  from the denied-route checks for regular users.
- CrisisAlerts and TestSetupGuide add 56 observations at the same sizes,
  with separate alert gate/filter/error and clipboard permission tests.
  In total, 19 route/state surfaces and 616 matrix observations are covered.
- Focused behavior tests, seven-language copy checks and synthetic success,
  empty/loading/failure/retry paths. See `qa/stage6/README.md` for commands.
- 180 unique browser cases pass, including 25 existing Settings/sidebar cases
  and two Stage 5 nested-menu regressions. Supplementary reruns replace earlier
  results rather than increasing the unique-case count.
- Unit suite: 11,056 passed, 267 pre-existing skips. Lint, typecheck and build pass.
- The HTML audit, coverage JSON and synthetic screenshot archive are delivered
  separately. Raw layout diagnostics are observations, not automatic passes;
  deliberate truncation, offscreen horizontal quick-navigation items and the
  OTP library's transparent password-manager input are recorded separately.

## Scope boundaries and release checks

No backend functions, entity schemas, agent instructions/wiring, retrieval
algorithms/scope, safety filters or clinical scenario data changed.
Therapeutic Forms remains `under_revision`. Existing technical identifiers,
schema enums and source clinical content keep their language; new UI messages
have EN/HE/ES/FR/DE/IT/PT translations. Public deletion translations retain the
existing retention and ownership-verification instructions.

The live About/Privacy visit was read-only. All mutations, export bytes,
account deletion, OTP/password requests, knowledge records, diagnostics and
training responses in automated tests use isolated synthetic fixtures.

Physical iOS/Android keyboards, native rotation/touch, screen readers, actual
OAuth/email delivery, production persistence/account deletion and live AI
quality remain separate release checks. Browser viewport/touch emulation does
not certify those behaviors. CI status must be assessed on the PR head.

## PR #1040 CI follow-up

Run 5059 passed 676 cases in each full desktop/mobile project but failed the
same five Home notification cases in both. The retained CI error contexts show
the notification button present; the old tests waited for
`aria-haspopup="true"`, while the accessible Dialog trigger correctly exposes
`aria-haspopup="dialog"`. The tests also located the panel through its inline
z-index. Stable notification trigger/panel test IDs now replace those incidental
selectors, and the layout cases explicitly assert the dialog role. Geometry,
clipping, keyboard focus, announcement stability, and Goals navigation checks
are preserved. All 10 affected cases pass locally across the two CI projects;
GitHub must validate the new head before merge. No timeout increase, assertion
removal, skip, or product accessibility rollback was used.

The replacement run 5060 resolved all five notification failures. Its desktop
project then exposed one Journal history race (680 passed, one failed): after
View All and an immediate Back traversal, the URL returned to the focused
summary while local focus state still showed all entries. Journal now derives
its focused entry/summary directly from the route instead of mirroring it in
state and clearing it before navigation commits. The existing end-to-end
edit/delete/PDF/history assertions are unchanged. Additional EN/HE tests
exercise 12 Back/Forward cycles for both entry and summary routes in each CI
project. Entity queries, data ownership and mutations are unchanged.
All 16 Journal action/history cases passed locally across desktop and mobile,
including the original failing case and 96 focused-route history cycles.
The full unit suite, lint, typecheck and build were rerun for this correction.
