# Encrypted private attachments: verification and rollout

Status: PR36 published; server integration and signed-in desktop PDF upload,
extraction, opening and reopening verified, 10 November 2026. Attachment-link
contrast follow-up and physical-device voice/mobile checks remain open.
**Not a complete production security sign-off.**

## Production activation on 10 November 2026

PR35 was merged at `fe5b79b88690031c391feb67968f0103c678d164`.
Railway deployment `54be2bed-5f04-4f81-a77b-8725f41df673` succeeded with
the attachment relay. The additive encryption fields and client-denying RLS were
present in Base44. However, publishing the repository initially left the older
upload function active: it returned only `file_url`, without an opaque reference.
No real-user data was used while diagnosing this mismatch.

The reviewed `uploadAttachment` and `extractPdfText` sources were explicitly
redeployed using Base44's Save & Redeploy API, then the app was published again
at `2026-11-10T01:48:06Z`. Commit `52ddce2859199ad6261578a7b31c6996b07d7550`
differs from the reviewed merge only by final newlines in the uploader files.
The production responses now identify the expected private-reference handlers.
Do not infer function activation from the presence of a file in GitHub alone.

Observed against the published functions and Railway relay, with two ordinary
test accounts and synthetic PDF/WAV files:

| Production check | Result |
| --- | --- |
| PDF and WAV upload | HTTP 200; opaque references returned |
| Download through Railway | HTTP 200; exact original bytes; `no-store` |
| Another account renews either reference | HTTP 404 |
| Anonymous renewal | HTTP 401 |
| Owner renewal | HTTP 200; download remains byte-identical |
| Either account directly reads the key-bearing record | HTTP 404 |
| Another account signs the provider storage URI | HTTP 200, but only ciphertext is downloaded (original bytes + 16-byte tag) |
| Original PDF capability after 306 seconds | HTTP 403 |
| Renewal after expiry | Other account HTTP 404; owner HTTP 200 with byte-identical fresh download |
| PDF extraction through the relay | HTTP 200; correct synthetic sentence |
| Relay-downloaded WAV sent to authenticated transcription | HTTP 200; `1, 2, 3.` |
| Existing desktop `InvokeLLM` audio path | HTTP 200 but a refusal, not a transcript |

The desktop follow-up uses the existing authenticated multipart transcription
endpoint, as mobile already does. It no longer creates an otherwise unused stored
attachment merely to transcribe a local draft. Sending an audio attachment still
uses encrypted storage. An empty/malformed transcription result preserves the
draft and produces the existing translated error. Browser speech recognition
behavior and clinical prompts are unchanged.

The follow-up also fixes filenames truncated through a UTF-16 surrogate pair,
and makes already-stored malformed filenames safe in download response headers.
All 11,269 unit tests, lint and the production build passed locally. Desktop
browser tests cover multipart delivery, MIME-normalization retry, no automatic
send or storage upload, and recovery after an empty transcript; CI status must
be checked on the follow-up commit.

## PR36 activation and signed-in UI verification

PR36 merged at `2b67435dbf9cd239c830dd63547d1fbf689987c0` after its required
CI passed, including all desktop/mobile shards and critical smoke checks.
The uploader was explicitly redeployed and the app published at
`2026-11-10T07:14:34Z` as `e154daa94ec32905c3c572ebbd30a87b1d207a61`.
The latter differs only by a final newline in the uploader entry file.
Post-publish PDF/WAV GET and HEAD, byte identity, owner renewal, cross-account
denial, PDF extraction and dedicated audio transcription all passed again.

The owner completed sign-in, the age gate and the terms/privacy consent screen
in the live browser at `app.mindful-path.me`. Only synthetic content was sent.
The PDF was selected, sent in a new conversation, correctly quoted by the AI,
and visibly rendered in the browser PDF viewer. After reloading Chat and opening
the saved conversation, a fresh capability was obtained and the PDF rendered
again. The conversation is explicitly named as a technical synthetic PDF test.

Visual inspection found the user attachment link inherited the global teal link
color on the same teal user-bubble background. The focused follow-up explicitly
uses the bubble's contrasting foreground for PDF/general file chips, including
hover, without changing opening or authorization behavior.

The generic attachment picker intentionally rejects WAV files. Voice uses the
recording control instead. In this cloud browser, that control fails with
`NotFoundError: Requested device not found`; there is no microphone device.
No successful physical microphone or mobile-device UI result is claimed.
The successful real-WAV backend test and passing mobile CI are separate evidence.

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

## Remaining release gates

1. Complete required CI and human review on the attachment-link contrast fix,
   publish it and verify the filename/icons remain legible on the user bubble.
2. Complete microphone recording, playback, transcription and send/reopen on a
   physical desktop/mobile device with microphone access. Verify the live mobile
   attachment workflow there; the cloud browser lacks a microphone and its
   desktop PDF result does not establish a physical mobile result.
3. Keep the provider privacy/deletion commitments below tracked separately.

The relay, encrypted uploader, PDF extraction, cross-account checks and actual
five-minute expiry are verified in production as recorded above. Do not publish
the old isolated verification branch or merge its test-only function alias.

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
