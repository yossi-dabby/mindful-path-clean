# Record-level adult access and support-assisted file erasure

Status: implementation for PR review, **not deployed or a provider-wide security sign-off**.
Authorization: the owner requested both follow-up improvements on 2026-11-11 after
Base44 support explained User field write locks and support-assisted storage deletion.

## Record access

`AccountAccess` remains the sole declaration/grant source. The `accountAccess`
function projects current adult eligibility into `User.mp_adult_policy` and
initializes `User.mp_account_deletion_pending`. Both fields have the documented
property-level `rls.update.user_condition.collaborator_role = editor` lock. App
users, including app administrators, must be unable to set them through
`auth.updateMe` or entity APIs, including the first assignment. Only service-role
code or app editors may set them. The lock and the live enforcement must be tested.

The 39 personal/community entities enumerated in
`base44/functions/accountAccess/recordEntities.js` require the current policy and
an explicit false deletion latch, in addition to their existing ownership or
administrator rules. Intentionally shared community visibility remains shared
among eligible adults. Shared catalog/retrieval sources and agent configurations
are unchanged. Subscription writes and ConsentRecord updates use enforced
service-only predicates instead of provider-unsupported `false` write rules.
Privacy export/deletion functions use authenticated service-role operations and
remain available without an adult declaration; public information routes remain open.

Existing approved users synchronize on their next status request without another
age declaration. Missing/stale/declined eligibility fails closed. A projection
write failure blocks initial entry. Deleting an account latches access off before
record deletion. A partial deletion shows a support message instead of another
age prompt. Editors must revoke the User projection **before** manually changing
or deleting an AccountAccess row; dashboard changes do not trigger synchronization.

Base44 has no verified multi-record transaction or unique constraint here. The
function re-reads the source and user after synchronization, rejects disagreement,
and attempts revocation on failures. This detects ordinary races but does not
prove atomic enforcement across overlapping requests or provider outages. A live
concurrency test is a deployment gate; do not describe this as transactional RLS.

## File deletion workflow

- An authenticated user may request deletion of their managed private attachments
  in Settings. A separate service-only `FileDeletionRequest` retains the current
  `file_uri` and the `superseded_file_uri` for encrypted replacements, before links
  are disabled. The response contains only status/counts, not paths or keys.
- `deleteMyAccount` creates/reuses this queue entry before deleting account data.
  Source attachment rows and queue references are not deleted with the account.
  Legacy attachment fields that are not managed private references stop automatic
  record deletion for manual inventory, avoiding loss of their remaining references.
- Opening/renewing a managed private link or uploading another private attachment
  fails while an open request exists, including already-issued download capabilities.
  In-flight uploads persist their returned URI before checking revocation and are
  held as deletion-pending. Incomplete uploads block support completion.
- An adult administrator uses `/AdminFeatureFlags` to list requests and download a
  manifest for the existing **private support ticket**. No email/ticket is sent
  automatically. The manifest includes app name/id and storage paths only; it
  omits patient filenames, encryption keys and conversation content.
- The operator records submission with a ticket reference, then explicit written
  confirmation that **every URI in that exact manifest** was deleted. A fingerprint
  binds submission/confirmation to its contents. New/changed files invalidate the
  previous confirmation and require a fresh manifest/submission. Missing source
  rows, duplicate requests, malformed URIs and incomplete uploads fail closed.
- Only after confirmation can the operator scrub source storage paths, filenames,
  owner email and encryption/signing keys and then clear the queue manifest.
  This uses explicit empty-field updates, not an assumed permanent-delete API.
  Partial cleanup is retryable. Minimal request status, dates, owner ID and operator
  audit fields remain for follow-up; define their retention after provider guidance.

Coverage is **managed PrivateAttachment objects only**. This does not discover all
historic uploads, direct provider uploads, agent memories/conversations, external
processors, logs, trash or backups. Provider-side conversations are not deleted by
this feature. Support confirmation is recorded by an authorized operator, not
independently proved by a successful HTTP check. Legal/privacy notices must not
promise full provider erasure. The seven-language account confirmation was corrected
accordingly. Export includes self-owned deletion status without support/operator data.

## Deployment sequence and live acceptance gates

Do not publish broad schema changes ahead of their dependent server functions.
Use a reviewed deployment window and test-only files/accounts.

1. Install the two locked User fields, FileDeletionRequest schema and additive
   PrivateAttachment state; retain existing record RLS until the next steps pass.
2. Install `accountAccess`, `fileDeletion`, `uploadAttachment`, `deleteMyAccount`
   and `exportMyData`, including all local helper copies. Missing queue/service
   deliberately blocks sensitive operations; publish neither side alone.
3. Call status for the administrator and an existing adult test account. Verify
   the server sets the locked projection and does not ask again for age. Verify
   ordinary/admin tokens cannot write either field, even for a fresh User field.
4. Activate the 39 record rules. With accounts A and B, test direct CRUD before
   age confirmation, after confirmation, after a decline and during deletion;
   verify own-record access and cross-user denial in both directions. Verify
   consent, journal, mood, community and existing agent tool flows. Verify
   concurrent status/decline/deletion cannot leave a stale usable projection.
5. Publish the UI and test desktop/Android: pending/declined/approved entry,
   account switching, file request/reload, upload -> open -> refresh -> reopen,
   PDF extraction and audio transcription, and support links during partial deletion.
6. Exercise a synthetic legacy+encrypted pair through request -> manifest ->
   support submission -> written confirmation -> cleanup. Do not fake support
   confirmation in production or erase real-user files as a deployment test.
   Verify an upload completing during the request appears in the next manifest;
   old fingerprints and incomplete records must refuse completion.

Local unit/contract tests and mocked browser tests cannot replace these live gates.
Direct agent APIs, direct storage/integration permissions and other service-role
functions still require the provider-specific answer requested from Liran. No agent
prompt/tool changes, paid subscription or contractual acceptance are included.

Reference for field locks and platform RLS:
https://github.com/base44/skills/blob/main/skills/base44-platform-entities/references/rls.md
Support deletion guidance: Liran's app-specific ticket response, 2026-11-11.
