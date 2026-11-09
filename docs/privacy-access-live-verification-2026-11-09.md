# PR34 live private-file verification

Date: 2026-11-09. Result: **BLOCKED — do not merge or publish as a completed privacy release.**

## Scope and evidence

The initial PR head was `6abac9799e91ebf642f5202235a607ad2951ed55`. Its Test Suite, Playwright E2E Tests and Hebrew Forms Pilot workflows all completed successfully. This report distinguishes those CI results from real provider behavior.

Two newly provisioned, ordinary app users (A and B, role `user`, neither an app admin nor a collaborator) authenticated against the actual Base44 app. Tests used only synthetic images; no real wellness files, conversations or user records were read. Requests exercised the provider's real API, not mocked responses. These were API integration checks, not a browser walkthrough of the updated frontend.

The candidate private-attachment handler ran in a temporary authenticated verification function. Its business logic matched the PR handler after the storage-namespace correction described below. The test deployment used the current runtime's default-export wrapper and an inline copy of that handler. This does not establish that the PR's existing named functions, helper-file deployment or updated frontend are active.

| Check | Observed result |
| --- | --- |
| Authenticate A and B | Both returned their distinct synthetic identities and ordinary-user roles |
| Upload by A with a spoofed B owner field | 200; ownership remained A's; response contained an opaque reference, no raw storage URI |
| Download A's signed link | 200; exact 68 bytes of the synthetic image |
| A resolves its saved reference again | 200 |
| B resolves A's reference through the candidate handler | 404 |
| Anonymous resolution | 401 |
| Direct mapping creation by A or B | 403 |
| Direct mapping read by A or B | List returned no records; individual mapped row returned 404 |
| Direct update of the existing mapped row by A or B | 403 |
| Direct deletion of the existing mapped row by A or B | 404; the record was not deleted |
| Provider signing by B using A's known private storage identifier | **200; returned a signed link** |
| Download using that B-issued link | **200; matched A's synthetic image exactly** |

The last two rows are a separate bypass of the application handler. B was deliberately given the synthetic object's storage identifier to test this boundary. This does **not** prove enumeration of unknown files or exposure of real users' data. However, the corresponding object path appears in the signed download URL (without the provider URI prefix), so the identifier cannot be treated as a durable secret once a link has been disclosed. The five-minute URL setting is not, by itself, proof that another app user cannot obtain a fresh link. Actual expiry after five minutes was not independently completed in this run.

## Corrections made after live checks

1. The provider returned `mp/private/...`, while the original handler accepted only `private/...`. That caused an actual private upload to fail with 503. Accept both private namespaces, still rejecting public paths and arbitrary URLs. Regression tests cover upload, reopening and rejection of public namespaces.
2. The provider's current RLS reference says boolean `false` does not enforce create/update denial. Use an AND of mutually exclusive `admin` and `user` role predicates for those operations. This deliberately denies all client roles; the authenticated server's service role remains the only writer. The real ordinary-user creation and existing-row update attempts were denied.

Neither correction fixes the provider signing bypass. Do not describe the candidate as fully isolated between users until that bypass is closed and retested.

## Deployment state and cleanup

- The previously absent `PrivateAttachment` schema is installed with the corrected RLS rules. It contains only synthetic verification records created by this exercise.
- Base44 runtime preparation automatically synchronized source commits to GitHub main. After cleanup, the net main change from the pre-test baseline is the new mapping schema; the original upload function source is restored.
- The temporary verification function and its source were removed. The temporary private Base44 preview branch was deleted. No frontend publication or PR merge was performed.
- Synthetic accounts and provider objects remain for reproducibility/support-assisted cleanup. Failed uploads can have left an `uploading` mapping or an unlinked synthetic object. No claim of provider object erasure is made.
- The production upload function continued to respond with the old interface during the checks. The other two changed functions (`extractPdfText` and `generateTherapeuticPdf`) were not installed or verified after the provider bypass was confirmed. PDF extraction, generated-PDF delivery, audio transcription and full UI verification remain open.

## Release gate

Obtain an enforceable provider-side ownership restriction for private-file signing, or replace this storage/delivery design with an independently authorized private-file service. Retest with two ordinary users, including direct provider calls with the other user's known identifier, expired links, PDF/audio consumers and the actual production function names. Only then consider merge, deploy server components, verify them, and enable the updated frontend.

The main app and the existing publication were not declared secure by this test. Existing public uploads and the separate age/forms-approval work remain outside this verification.

Reference checked: [Base44 RLS reference](https://github.com/base44/skills/blob/main/skills/base44-platform-entities/references/rls.md).
