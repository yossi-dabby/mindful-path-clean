# AI reporting and retention release checklist

This document describes implementation and release checks. It contains no live
account audit results, store-console settings, support correspondence or credentials.

## Deployment order

1. Complete code review and CI before merging.
2. Install the `AIContentReport` entity and deploy `aiContentReports`,
   `retentionCleanup`, `exportMyData` and `deleteMyAccount` before the frontend.
3. With disposable synthetic accounts, verify report submission, administrator
   review, account export/deletion and denial of cross-account report access.
4. Publish the frontend and updated public privacy page after those checks pass.
5. Verify desktop and Android reporting, failed-submit retry with preserved input,
   and manual retention cleanup. Never use real user records for deletion tests.

## Functional acceptance

- Every visible text assistant response in Chat, Coach and the companion has a
  report action, independent of thumbs feedback.
- The dialog previews the excerpt and submits it with a reason and optional details.
  A failed submission preserves the draft; success requires server confirmation.
- Administrators can filter, page through and resolve reports. Closing a report
  requires a resolution note. Reports are not an emergency channel.
- Account export and account-record deletion include only the caller's reports.
- Retention counts remain accurate after partial failure. A failed or incomplete
  attempt does not prevent a retry for 24 hours. Progress can resume across batches.
- Retention state is isolated by account and saved policy. Manual retry is available
  in Data Privacy. Apply the notice describing which records are removed and which
  conversations are hidden; do not describe this as comprehensive storage erasure.
- Test all seven interface languages, including right-to-left layout.

## Store preparation

Review Data Safety purposes against enabled runtime behavior, including report
submission. Verify dedicated review-account access using a fresh session and the
exact submitted build. Keep account-specific results and credentials outside the
public repository. Update store declarations only after the evidence is complete.
