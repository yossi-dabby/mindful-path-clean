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

## Authorized two-account verification (2026-11-13)

Following explicit permission to create/delete synthetic records, eight marked
mood/journal records were created through two ordinary test users (four each).
Fourteen live-service checks passed:

- Both identities and the complete mood/journal inventory were checked first.
- Neither account could GET, PUT or DELETE the other's mood or journal record.
  The owner reread each record and confirmed it was unchanged.
- The deployed cleanup endpoint rejected a caller-supplied owner with HTTP 400.
- The deployed cleanup endpoint succeeded for each user with zero deletions;
  all fresh records in both accounts remained intact after each invocation.
- Existing recent conversations remained unchanged; no archive rows were added.

Base44 ignored attempts to backdate synthetic created_date values, including an
editor API update that reported success. Readback confirmed the server timestamps
remained current. Therefore expired-record deletion by the deployed endpoint's
real clock is **not yet verified**.

Separately, the unchanged cleanup handler ran locally with a controlled clock
against actual app-user entity APIs and an allowlist of these fixture IDs. For
both entity types in both accounts, the older fixture was deleted, the newer one
was preserved, and the other account's records were preserved. This is hybrid
integration evidence, not an end-to-end test of production service-role deletion.

The four surviving fixtures were then deleted by their owners, with marker and
ownership assertions before each DELETE. Independent editor queries confirmed
zero mood, journal and archive rows across both test accounts. All eight fixtures
were removed; no stored files, real users, or existing conversations were deleted.

## Browser regression follow-up

The first GitHub browser run exposed two issues that are addressed in this PR:
Quill 2 exports ordinary spaces as nonbreaking HTML spaces, so sanitized journal
HTML now normalizes those spaces to preserve existing wrapping and plain-text
consumers. The retention and file-deletion panels used the same sibling React
key, which produced a duplicate cleanup panel after user data loaded. Their keys
now have distinct prefixes while retaining per-user state reset.

Lint/typecheck and the new GitHub browser run must be checked on the final commit.
Signed-in live Settings verification still requires browser authentication.
Base44 storage-erasure confirmation remains separate from record cleanup.
