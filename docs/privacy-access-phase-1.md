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
- The unverified 90-day backup promise and automatic file/conversation-erasure implication are removed. The privacy notice, AI consent and deletion pages reflect the provider response below in all seven languages. The legal-consent version advances to 2026-11-09; this draft has not been released.

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
- Obtain a confirmed conversation-erasure process, log/platform-backup retention and the precise scope of training/anonymization. Account deletion and the removal of a database record do not themselves erase provider objects. Mapping records are deliberately retained for support-assisted cleanup; they must not be described as erased by the current account-delete function.
- A failed metadata write after a successful private object upload can leave an inaccessible orphan. The handler reserves an `uploading` record first and retries the mapping write once. Provider-side cleanup/reconciliation remains necessary; no public URL is returned on this failure.
- A public business postal address is still needed for the final business disclosures. Do not invent an address or assert complete EU/UK legal compliance.

## Provider response and unresolved release conditions

Base44 Technical Support replied on 2026-11-09. The owner supplied the reply; it was also verified in the existing support conversation. This is a summary, not a claim that any user data has been deleted:

| Topic | Confirmed response | Still unresolved |
| --- | --- | --- |
| Uploaded files | Support can permanently delete files when supplied with the app name and file links. Copy links before removing database records. | Whether stable private storage identifiers are accepted after signed URLs expire; bulk/API workflow and completion evidence. |
| Agent conversations | No documented deletion method or API was supplied. Dashboard removal is not proof of provider erasure. | Whether support staff can erase conversations, how to request it, and retention if erasure is unavailable. |
| Analytics | Automatically deleted after 60 days. | This does not establish the retention of other data categories. |
| Table Backup & Restore | 7 days on the current Elite plan; 28 on Business/Enterprise. | Separate platform-wide backups, file/chat copies and logs; no log retention period was supplied. |
| AI training | Customer data may train/improve Base44 internal AI/ML models. Base44 says it does not train third-party models with this data. Complete training exclusion is offered on Enterprise, which this app does not currently have. | Exact end-user data categories, anonymization under the DPA, prior collected data and separately configured AI providers. |
| Sensitive wellness data and EU/UK | Support supplied general policy links. | No app-specific written approval or agreement was supplied. Terms section 4.3 requires prior written approval and an appropriate agreement for the protected/sensitive data it covers. Clarify applicability to this app. |

The response distinguishes account access from generated model output and does not rule out content overlap in generated outputs. It is **not** evidence that an actual disclosure occurred. Private-file access controls address unauthorized retrieval; they do not create a training exclusion or an erasure mechanism.

A follow-up was sent in the same ticket on 2026-11-09 covering the unresolved items above. It requests clarification only, with no deletion or subscription change. Keep development and verification on synthetic records while the sensitive-data arrangements are unresolved. Do not treat an Enterprise upgrade, a changed privacy notice or passing tests as sufficient authorization for a real sensitive-data rollout. No production shutdown or data migration is performed by this PR.

Public references checked on 2026-11-09:

- [Deleting app user data](https://docs.base44.com/Community-and-support/Deleting-user-data)
- [Removing live app uploads](https://docs.base44.com/Building-your-app/Using-media#removing-live-app-uploads)
- [Privacy, security and training choices](https://docs.base44.com/Community-and-support/Privacy-and-security)
- [Base44 Terms, sections 4.2–4.3](https://base44.com/about-us/legal/terms-of-service)
- [Data Processing Addendum](https://base44.com/about-us/legal/dpa)

## Validation

- Automated ownership, failure, bounded upload, private reference round-trip, PDF extraction and public HTTP tests cover the changed boundaries.
- The full unit suite, lint, typecheck and production build are run for the PR. Exact run results are recorded in its description.
- Local browser tests could not start because the Chromium executable was unavailable and its download failed. GitHub Actions browser results and the live provider checks above remain required before release.
