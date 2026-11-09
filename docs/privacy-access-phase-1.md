# Private attachments and public information: phase 1

Last updated: 2026-11-09

This change starts the approved privacy/access remediation. It is a code change for review, not evidence that the live Base44 runtime or Railway deployment has been updated.

## Behavior

- Chat, desktop voice transcription, journal uploads and generated personal PDFs use `uploadAttachment`, which calls `UploadPrivateFile`. There is no fallback to public `UploadFile`.
- `PrivateAttachment` holds an owner ID, owner email, storage URI and file metadata. Ordinary entity operations, including admin operations, are denied by RLS. Only server service-role code manages this mapping. No retrieval or agent entity scope is expanded.
- The function assigns ownership from `auth.me()`, returns an opaque `mp-private:<id>` reference, and signs access only after checking the stored owner. Signed URLs expire after five minutes. A signed URL is a bearer capability during that period; it should not be shared.
- The app stores references in journal records and chat attachment metadata. Temporary URLs are delivered to the configured AI processing service for the requested turn. Private media renews URLs while mounted; PDF downloads request a fresh URL. Client diagnostics no longer print signed PDF URLs.
- PDF extraction accepts an owned reference, not an arbitrary remote URL or a claimed owner segment in a URL. Legacy raw private URIs fail closed until mapped to a verified owner.
- Uploads are limited to 10 MiB and an explicit document/image/audio MIME allowlist. Actual request bytes are bounded even without Content-Length.
- The existing Node/Railway service serves `/privacy`, `/terms`, `/contact`, `/account-deletion` and `/data-deletion` as HTML in all seven languages, without authentication, scripts or analytics. Private-form/API routes remain authenticated. Login and registration link to this public origin.
- Business identity and support email use the owner-confirmed details. All-service 18+ policy replaces the previous 13–17 exception. This wording does **not** implement server age enforcement; that is the next phase.
- The unverified 90-day backup promise and automatic file/conversation-erasure implication are removed. Provider training exclusions and retention periods remain unconfirmed. The legal-consent version advances to 2026-11-09.

## Deployment order and live verification

1. Review and merge through the normal `main` PR workflow. Ensure CI lint, unit, build and browser checks pass.
2. Deploy the `PrivateAttachment` entity and all three changed Base44 functions (`uploadAttachment`, `extractPdfText`, `generateTherapeuticPdf`) with their helper files before enabling the updated client. A frontend-only publication is insufficient.
3. With two synthetic test accounts, check that A can upload/open/reopen an image, audio and PDF, that B cannot resolve A's reference, that an anonymous request is rejected, and that direct entity reads/writes cannot reveal or forge mappings. Confirm the provider honors RLS and URL expiry. Do not use real wellness records for this check.
4. Verify that the actual Base44 provider can consume the signed URL for PDF extraction and desktop audio transcription. Unit tests use provider mocks; they cannot establish this runtime behavior.
5. Publish the updated web client and Node service, then verify all information URLs in a signed-out browser. Their public origin is currently `https://mindful-path-production-7704.up.railway.app`. Update the Play Console policy/deletion/support URLs only after the deployed pages are verified.
6. Update the native build through the usual tested release process. Installed older app builds still contain the previous upload path until updated. Do not claim that this PR retroactively protects old uploads or all installed clients.

Do not roll back to public uploads if a private-provider call fails. Keep attachments unavailable while the failure is investigated. Preserve `PrivateAttachment` mappings if a release is rolled back; otherwise existing private references would be lost.

## Remaining work and deletion handling

- Inventory and migrate previously public personal files, then coordinate removal of the old public objects with Base44. No existing files, accounts or conversations are deleted by this PR.
- Public repository form assets remain publicly obtainable independently of app access control. Restricting that distribution requires a separate, explicit repository/storage decision. The forms pilot remains admin-only; no ordinary user is granted admin rights or new form access.
- Complete account-bound adult eligibility and explicit forms approvals as phase 2. Keep draft materials unavailable for normal use until reviewed and approved.
- Confirm provider deletion APIs or a support-assisted procedure, log/analytics/backup retention and model-training exclusions. Account deletion and the removal of a database record do not themselves erase provider objects. Mapping records are deliberately retained for support-assisted cleanup; they must not be described as erased by the current account-delete function.
- A failed metadata write after a successful private object upload can leave an inaccessible orphan. The handler reserves an `uploading` record first and retries the mapping write once. Provider-side cleanup/reconciliation remains necessary; no public URL is returned on this failure.
- A public business postal address is still needed for the final business disclosures. Do not invent an address or assert complete EU/UK legal compliance.

The Base44 support inquiry was sent on 2026-11-09 with a request for privacy/security review. No provider answer or deletion completion has been assumed in these changes.

## Validation

- Automated ownership, failure, bounded upload, private reference round-trip, PDF extraction and public HTTP tests cover the changed boundaries.
- The full unit suite, lint, typecheck and production build are run for the PR. Exact run results are recorded in its description.
- Local browser tests could not start because the Chromium executable was unavailable and its download failed. GitHub Actions browser results and the live provider checks above remain required before release.
