# Dependency security and retention verification

## Dependency changes (2026-11-13)

The lockfile audit decreased from 31 findings (4 critical, 13 high, 13 moderate,
1 low) to 2 low findings, with no moderate, high or critical findings. This is
an npm advisory result, not a claim that the application has no vulnerabilities.

- Patch compatible dependencies, including the static server and Vite.
- Upgrade React Router to 7.18.5; remove the v7 future flags already enabled in v6.
- Replace unmaintained ReactQuill with react-quill-new 3.8.3 / Quill 2.0.3.
- Restrict all five journal editors to bold, italic, underline, lists and indent.
  Keep DOMPurify on loading, changing and saving rich text.
- Upgrade Vitest and its UI together to 4.1.12, compatible with the Node 20/22 CI.
- Remove the unused direct Zod dependency; preserve Playwright 1.58.2 to match CI.

### Remaining advisory

[GHSA-v3m3-f69x-jf25](https://github.com/advisories/GHSA-v3m3-f69x-jf25)
affects Quill 2.0.3; no patched version was listed during this review. npm reports
Quill and its wrapper as two low findings for this dependency chain. The
[researcher's disclosure](https://fluidattacks.com/advisories/diomedes) describes
unescaped formula/video values in HTML export. Those embed formats are now
excluded from the journal editor; HTML sanitization remains in place. This is
mitigation, not an upstream fix or justification to dismiss the advisory.

## Validation

- 382 unit-test files / 11,473 tests passed after dependency migration.
- Lint and typecheck passed; production build and Capacitor Android sync passed.
- Added browser regression coverage for unsafe pasted embeds, safe formatting,
  save/reload, and a single settings cleanup action/result.
- Local browser execution was blocked by the environment before application
  launch. Browser regressions must pass GitHub CI before merging.
- No signed Android artifact or Play Store release was produced by these checks.

## Retention boundary and remaining live checks

The current client starts cleanup when Chat mounts, throttled to once per day
following success. It is not a background scheduled job while the app is closed.
The manual settings action uses the same authenticated server function.

Server code scopes old mood/journal records to the authenticated owner, preserves
legacy file references for support review, and hides old agent conversations.
Hiding a conversation is not permanent deletion from Base44 storage or backups.

Read-only checks found no mood, journal or hidden-conversation records in the two
designated synthetic security accounts. This does not prove that deletion works.
The live destructive cleanup invocation was not completed: automatic approval
review blocked it because the empty request can delete records. Obtain explicit
permission for deletion of synthetic records in the two test accounts before
running a controlled expired/new-record and cross-account isolation scenario.
Do not use real user accounts or delete attachment mappings needed by support.

The signed-in live Settings check also remains pending browser authentication.
These live checks and Base44's storage-erasure confirmation are not replaced by
mocked browser or controlled-clock unit tests.
