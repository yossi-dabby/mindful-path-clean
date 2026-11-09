# Encrypted private attachments: verification and rollout

Status: candidate implementation, 9 November 2026. **Not a production security sign-off.**

## Why PR34 needs this follow-up

The application owner check rejects another user's file reference, but Base44's
storage-signing integration can issue a link for a known private storage URI.
Owner checks alone therefore do not protect the stored plaintext. This change
encrypts file bytes with AES-256-GCM before storage and keeps the keys in the
service-role-only attachment row. Storage signing yields ciphertext. An
authenticated owner can obtain a separate, five-minute HMAC capability for the
application's decryption endpoint. A valid capability is a bearer link: anyone
given that link can use it until it expires. Knowing a storage URI does not mint
that capability. This is not end-to-end encryption against Base44: the application
backend and its selected AI processors still handle plaintext when requested.

## Evidence collected with synthetic data

| Check | Observed result |
| --- | --- |
| Upload and download as ordinary account A | HTTP 200, bytes identical |
| Resolve A's opaque reference as ordinary account B | HTTP 404 |
| Resolve without login | HTTP 401 |
| B signs A's encrypted storage object through provider API | Download is ciphertext; known plaintext marker absent |
| A/B directly read the key-bearing attachment entity | HTTP 404 |
| Original capability after 314 seconds | HTTP 403 |
| B renews expired access | HTTP 404 |
| A renews expired access | HTTP 200; new download matches original |
| Encrypted PDF upload/download | HTTP 200, bytes identical |
| Encrypted WAV upload/download | HTTP 200, bytes identical |
| Mobile multipart transcription of public test speech | HTTP 200, nonempty transcription |

The live checks used a separate, test-account-restricted backend function. It was
removed from main after verification, and its source was removed. The production
`uploadAttachment` was not replaced or published during these checks.

Local validation of the candidate: all 11,266 unit tests passed (JSON reporter),
ESLint passed, and the production build exited successfully with the app ID set.
The HTTP suites include tampered capabilities, wrong owners, key/ciphertext
tampering, bounded downloads, ranges, legacy migration and public-page content
without login. These do not replace live provider integration or UI checks.

## Outstanding release gates

1. Complete CI and human review on the candidate commit. PR34's earlier green CI
   does not validate this new implementation.
2. Install the additive Railway relay before activating the encrypted uploader.
   Check that an unauthenticated request to its file route returns 403, not the
   SPA HTML. The relay only contacts the fixed Base44 function, strips caller
   credentials, bounds responses to 10 MiB and never redirects to storage.
3. Verify the additive entity fields and deny-all client RLS, then deploy the
   candidate `uploadAttachment` function. Verify both POST owner resolution and
   GET capability handling against the actual published runtime before claiming
   success. A file's presence in the repository is not proof of deployment.
4. Verify PDF extraction and desktop audio consumption using the complete public
   relay URL. Base44's extraction API rejected an otherwise valid PDF served
   directly by an extensionless function URL with `Unsupported file type`.
   The relay supplies a `.pdf` / `.wav` / other supported extension; local HTTP
   tests pass, but real provider consumption through that relay is still pending.
5. Complete desktop and mobile UI upload, open, reopen and voice workflows with
   synthetic files. The isolated Base44 branch reached Home but failed loading
   `src/pages/Chat.jsx` dynamically; one preview refresh did not repair it.
   This is an uncompleted UI check, not a passing result. Local Playwright browser
   installation was also blocked by unsuccessful browser-binary downloads.
6. Repeat the A/B storage-signing, owner-renewal and five-minute expiry checks on
   the final published code, including reloading old conversation attachments.

The production frontend already consumes opaque references and does not need an
early switch. Keep the current public uploader until the server component exists.
Do not publish the isolated verification branch or merge its test-only alias.

## Legacy files, deletion and rollback

The authenticated owner's first resolve encrypts a legacy file into a new object
and preserves `superseded_file_uri`. This does **not** erase or secure the older
plaintext copy at Base44. Inventory both `file_uri` and `superseded_file_uri`
privately and request Customer Care deletion; keep identifiers until confirmed.
Do not put identifiers, keys, tokens or signed links in GitHub or ordinary logs.
Concurrent first resolves can create extra encrypted copies because the provider
has no compare-and-swap in this path; inventory and deletion must account for
orphaned copies. No real user's files were migrated or erased in this verification.

Do not roll the uploader back to the pre-encryption implementation after encrypted
records exist: it would serve ciphertext and break existing files. Roll back the
frontend independently if needed and retain the encryption-aware backend. If
backend availability fails, stop new attachment operations and fix forward; never
fall back to public/plaintext uploads. Keep the new fields and keys intact.

## Provider commitments still unresolved

The operator supplied Base44's written support response. It states there is no
built-in permanent erasure of one user's in-app agent conversations. Removing a
message is not permanent erasure. Upload deletion is a manual Customer Care task,
not an application API. App-specific AI training, earlier-data exclusions, logs,
platform backups and any required prior agreement remain for Enterprise to answer.
No Enterprise purchase, agreement, exclusion or erasure guarantee was obtained.
The privacy and deletion pages now disclose these limits in all seven languages.
The seven-day table backup window is not a universal deletion deadline.

Until the technical release gates and provider commitments are resolved, use
synthetic material for verification and do not treat this change as approval to
collect sensitive therapeutic information.
