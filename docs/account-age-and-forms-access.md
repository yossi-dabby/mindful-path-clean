# Account age declaration and scoped forms review access

Status: implementation for review; **not a production security sign-off**.
The application is 18+ across all protected tools. An age declaration is a
self-attestation, not documentary age or identity verification.

## Implemented boundary

- `AccountAccess` is a service-owned entity keyed by authenticated user ID. It
  stores the adult/under-18 declaration, policy version, server timestamp,
  language, a forms-review capability, and the latest grant/revocation actor/time.
  It collects no birth date, identity document, or additional email copy.
- `accountAccess` accepts self-status/self-attestation and exact-account admin
  lookup/grant/revoke operations. The actor always comes from `auth.me()`.
  Client-supplied identities, roles, grants and timestamps cannot attest for
  another account. Admin actions require an adult declaration too.
- Under-18 declarations remain blocked on subsequent sessions. A mistaken
  declaration requires support review; there is no client reset operation.
- The entity uses impossible role predicates for **all four** RLS operations.
  Boolean `false` create/update rules were previously found unreliable in this
  provider. The predicates still need an actual two-account deployment test.
- `ProtectedRoute` gates all authenticated screens, including Google sign-ins,
  before mounting Layout, tools or either AI UI. `age_verified`, query-string
  test flags and webdriver checks no longer authorize age or bypass consent.
  Public information routes remain accessible outside this gate.
- The initial account-service failure blocks entry with retry. A transient
  *background* failure retains a previously admitted screen to preserve an
  in-flight draft/recording. Server operations listed below recheck eligibility
  on every call; this is not an offline authorization claim.
- Uploading, renewing private links, extracting PDFs, generating PDFs and
  transcribing audio check the account service using the **caller's** client.
  Already issued bearer download links retain their existing five-minute
  lifetime, ownership binding and encrypted storage semantics.
- Both the Base44 forms proxy and the direct Railway catalog/PDF endpoint
  independently require current adult eligibility plus a forms-review grant.
  Administrators retain review access after attesting; approved ordinary users
  do not receive an administrator role. Every new file request rechecks access.
- `/AdminFeatureFlags` includes the review-access panel. Look up an existing
  account by email, inspect its declared age/access, then explicitly grant or
  revoke. Revocation cannot remove files already downloaded.
- Export/delete handlers handle service-created rows by `subject_user_id`
  rather than `created_by`. Exports omit grantor/service metadata. Account
  deletion stops if these rows cannot be removed. This does **not** solve
  provider conversation, stored-file, log or backup erasure.
- Draft notices, seven interface languages, public/AI registry exclusions and
  existing worksheet contents remain intact. Access grants are review permission,
  not clinical, licensing or professional approval.

## Boundaries that this PR cannot close

1. **Direct provider APIs.** The Base44 agent APIs, direct entity/integration
   endpoints and other legacy functions do not automatically consult this custom
   entity. The app route gate must not be represented as platform-wide server
   enforcement. Obtain a supported provider-side policy/interception mechanism
   (and test it with ordinary tokens), or design a separate protected backend
   boundary before claiming comprehensive enforcement. No agent prompts, tools,
   retrieval scope or safety rules are changed in this phase.
2. **Public repository copies.** Previously published worksheet PDFs/source
   materials remain in this public Git repository and its history. The runtime
   grant protects app delivery endpoints, not those copies, forks or downloads.
   A distribution/licensing decision is required separately. No repository or
   history deletion is part of this PR.
3. **Provider contractual limits.** Permanent agent-conversation erasure, internal
   training scope, retrospective exclusions, platform log/backup retention and
   any Terms 4.3 agreement remain pending Enterprise clarification. No paid plan
   or contractual commitment is made by this change.
4. **Concurrency.** Base44 has no verified atomic upsert/unique-key contract here.
   Simultaneous first attestations can create duplicate rows. The service re-reads
   and fails closed on duplicates; an operator must reconcile them after review.
   Do not silently choose the most permissive record. Before changing the age
   policy version, review concurrent renewal/decline handling as well.

## Required deployment order and checks

Do not publish the new UI before the new account service is installed. A missing
service deliberately blocks protected screens instead of granting access.

1. Review the PR and complete CI. Deploy **only** the `AccountAccess` schema and
   `accountAccess` function first through the existing Base44 app configuration.
   Do not run a broad deployment that accidentally publishes the new UI early.
2. With synthetic accounts A and B (ordinary roles) and the app administrator,
   verify anonymous rejection; direct entity list/get/create/update/delete denial
   (including attempted role/custom-field forgery); self-only age records; a
   second browser/device; under-18 persistence; and duplicate/error handling.
   If direct RLS manipulation succeeds, stop and do not enable the interface.
3. Confirm the admin declaration, then A's declaration. Grant A review access;
   verify B cannot mint a grant or read A's access row. Exercise grant/revoke
   through `accountAccess` before installing the dependent functions below.
4. Install the changed `uploadAttachment`, `extractPdfText`,
   `generateTherapeuticPdf`, `transcribeMobileAudio`, `getHebrewFormsPilot`,
   `exportMyData` and `deleteMyAccount` functions with their local helper files.
   Verify each deployed function version; repository merge alone is not proof.
   Deploy the updated Railway verifier and coordinate the UI publication so
   users can make their account declaration before attempting new operations.
   Now verify allowed A vs unapproved B through both Base44 and direct Railway
   catalog/PDF endpoints. Revoke A and verify the next request is denied even
   if its previously approved UI remains open.
5. Publish the UI only after the new account service/RLS and guarded functions
   have passed the deployment checks. On desktop and Android, verify Google
   sign-in, first declaration, reload, account switch, lost connection/retry,
   and access to privacy/support/sign-out from the gate. Confirm no UI test
   flag can bypass age or chat consent.
6. Repeat upload → open → refresh → reopen for a synthetic PDF; recording →
   playback → transcription; preserved drafts during reconnect; current-owner
   vs other-owner attachment checks; five-minute link expiry; and exact PDF
   open/download for an approved ordinary reviewer. Verify export/delete with a
   disposable synthetic account, retaining no sensitive material in test logs.

Portable guard copies live within each function because the deployed bundler's
cross-function imports have not been verified. The unit packaging gate requires
exact byte parity with `accountAccess/guard.js`; edit the canonical file and copy
it to the five consumers together.
