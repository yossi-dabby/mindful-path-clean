# Hebrew forms administrator review pilot

Last updated: 2026-11-03. PRs #2, #3 and #4 are merged. PR #4 restored the
Railway transport: its live catalog returned 200 after deployment. Base44
function requests still return 503 with `upstream / TypeError`. The focused
diagnostics below await review/deployment; they are not a repair of that error.

## Scope and content provenance

The owner authorized a Hebrew-only, administrator-only review of package 0.2,
`MindfulPath_All_Hebrew_Forms_App_Candidates_v02.zip`. The private bundle contains
the exact 154 candidate PDFs from `01_app_candidates/forms/`: 2,501,394 bytes,
34 age-specific files for each of CH, TE, AD and OA, plus 18 shared files.
Editable HTML, filled examples and review reports are not served as forms.
Original form IDs and PDF bytes are preserved. The catalog retains titles,
age, track, unit, audience, draft status, byte length and SHA-256 per file.
The 18 shared files appear under each applicable age without duplicate storage.

All content remains a draft for professional review, not approved for clinical
distribution. The owner-authorized pilot is a deliberate, temporary exception
to the public ingestion contract in `therapeutic-forms-ingestion.md` and the
final-content requirement in `therapeutic-forms-upload-readiness.md`. It does
not activate the public catalog or populate `ALL_FORMS`, AI search, indexing,
chat attachments, private patient entities or Base44 schemas. Public content
status and multilingual catalog behavior remain unchanged.

## Runtime and authorization

`server/index.mjs` replaces the prior standalone static server for Railway.
It still serves only `dist/`, uses SPA fallback, and applies `serve.json`
security headers. Directory listings, source routes and unknown API routes
are denied. The Base44-host correction adds one backend function,
`base44/functions/getHebrewFormsPilot/entry.ts`, with no schema changes.

`server/private/hebrew-pilot-catalog.json` and
`server/private/forms/{original-id}.pdf` are server-only repository files,
outside Vite's public directory and client imports. Each original PDF is stored
separately so uploads and later changes remain small and independently verifiable.
The files are **not encrypted**. The source repository must remain private.
Do not copy these files into `public/`, `dist/` or client source maps.

`GET /api/hebrew-forms-pilot/catalog` and
`GET /api/hebrew-forms-pilot/files/{original-id}` require a bearer session.
Every request validates that session against the fixed Base44 app's current
`User/me` response; only `role === 'admin'` with a user ID succeeds. Premium
membership alone grants no access. App ID, role and identity are never taken
from query strings, request-supplied roles or decoded-but-unverified JWTs.
No service-role credential is used. Authentication is not cached.

The server reads `BASE44_APP_ID`, falling back to the existing
`VITE_BASE44_APP_ID`. Missing/invalid configuration fails closed with 503 for
pilot requests while the rest of the site keeps working. Upstream timeout,
invalid session and role removal deny access. Responses are private/no-store.
Downloads use `?download=1` and attachment disposition; open uses inline.
Both server and browser check file integrity. Session tokens stay in request
headers and are not embedded in PDF URLs.

On the exact `https://mindful-path-production-7704.up.railway.app` origin, the
browser uses the existing same-origin private API with the current stored
Base44 session token. This restores the working PR #2 transport independently
of Base44 function availability. No hostname suffix matching, cross-origin
fallback or caller-selected destination is allowed. Missing credentials fail
closed; every API request retains the server-side administrator verification.

On Base44 preview/published hosts, the browser calls
`base44.functions.invoke('getHebrewFormsPilot', { path,
download })` using the existing SDK's current session and functions version.
The Base44 function rechecks the caller with `auth.me()` and requires the fixed
app ID, a user ID and the current administrator role. It forwards only the
caller's bearer token to the fixed Railway API origin; the Railway server
independently rechecks authorization. No service-role credential, cookie,
caller-selected destination or public PDF URL is forwarded. Redirects are
disabled, requests time out after 15 seconds, and response sizes are bounded.
PDFs travel in a base64 JSON envelope to work with SDK `invoke`; the browser
decodes them and retains the original byte-length/SHA-256 checks.

## User interface and rollout

The existing forms page includes `HebrewFormsPilot` inside its current shell.
It appears only for an authenticated administrator in Hebrew mode. The flow
is age → shared/Core/anxiety track → unit → individual form. PDF.js renders
the original PDF on mobile and desktop; downloading retains its original ID
as the filename. Preview blobs are revoked when closed/unmounted or when
the active identity/language changes. Failed authorization clears the preview.

The original same-origin `/api/hebrew-forms-pilot` request only worked on the
Node/Railway host. Base44 preview and published frontend hosts do not implement
that Node route, which caused the reported unavailable message after PR #2.
The SDK function transport supports these hosts without browser-to-Railway
cross-origin requests or permissive CORS. Backend availability failures now
display a retry message; only authentication failures request a new login.
An HTTP 401 probe alone does not prove administrator access or successful
rendering. Authenticated preview and public-host smoke checks remain required.

### PR #3 regression evidence and diagnostics

The merged commit `021a54e1d3f031f2c99ad3076f20bfc4b03dc77a` was deployed by
Railway successfully. Base44's synced entry, handler and frontend match it.
On November 3 at 13:10 UTC, function logs recorded 503s while Railway's HTTP
logs showed the forms UI loading successfully and no pilot API requests in
that window. No corresponding HTTP request was recorded by Railway; this does
not alone prove where the connection failed. The local fixture substitutes Base44
identity verification, so passing fixture tests cannot prove live SDK auth.

Unexpected function failures now log only a closed-set stage/error type and
an optional numeric upstream HTTP status. Credentials, SDK error messages,
request data, identities and response bodies are never logged. After deployment,
read `hebrew_forms_pilot_failure` to distinguish client initialization, auth,
upstream fetch, response reading and decoding failures. Base44's underlying
503 is still unresolved until that evidence and an authenticated smoke check
confirm the cause and repair. Do not treat restored Railway access as proof
that the Base44 hosts are repaired.

### Focused runtime diagnostics (version 2)

PR #4 merged as `9673d2cf9a984434e7a7cda4d6031f8c8c2cd9a7`. Railway deployment
`69dd28c2-fd8b-42e9-9847-dcd654f00f2b` succeeded, and its catalog returned 200
at 13:53:43 UTC. Base44 logged `upstream / TypeError` at 14:02:55 and 14:03:20
UTC, with no matching Railway pilot HTTP requests in the inspected interval.
The old `upstream` stage covered both timeout construction and the fetch call.

The diagnostic-only change separates these operations:

| Stage | Meaning |
|---|---|
| `timeout` | Constructing `AbortSignal.timeout(15000)` failed. |
| `request` | Preparing URL/options or validating them with the runtime's native `Request` constructor failed; fetch has not been called. |
| `fetch` | Request construction passed, but fetch threw. This can still be fetch-specific validation, redirect, DNS, TLS or another network/runtime failure. |
| `upstream_response` | Fetch returned an HTTP response; the numeric error status is available. |

`new Request(url, options)` performs local validation only. The subsequent
fetch still uses the original URL and options. There is one network attempt,
no fallback, no relaxed cache/redirect policy and no alternate host. The extra
validation may fail earlier on a runtime with an incompatible Request API;
that is logged separately, without claiming a network outage.

Every unexpected failure includes `diagnosticVersion: 2`, the closed-set stage
and error type, `timeoutAvailable` (whether the timeout method exists), a
strictly allowlisted direct/nested `causeCode` or `unknown`, and a `reason` of
`cache_option_unsupported` or `unknown`. Cache-error text is classified locally
and never printed. These are diagnostic hints, not proof of a platform setting.
No URL, credentials, identity, stack, raw exception, free-form error code or
response body is logged. Missing cause codes are expected on some runtimes.

After reviewed deployment, have an already authenticated administrator repeat
the catalog and one PDF read separately in Base44 preview and published hosts.
Confirm version-2 logs for the actual environment, correlate UTC timestamps
with Railway HTTP logs, and use the stage/category to select the next narrow
fix. Do not test by creating users, changing roles, or using service-role auth.
Do not change transcription, network policy or other functions on this evidence.
Completion still requires live catalog count 154 and PDF byte-length/SHA-256
checks on both Base44 hosts. Node fixture tests cannot certify platform egress.

This PR does not change service sources, environment variables, public access,
or publish settings. Review and passing CI precede merge/deployment. Runtime
startup overrides in Railway must be checked before rollout, because an
override of `railway.toml` would keep the old static server and disable the API.
Deploy the backend function and frontend from the same reviewed commit. Verify
the function version in both preview and published Base44 environments. If
Base44 GitHub sync does not deploy backend functions automatically, deploy the
reviewed function through the platform before publishing the frontend. Rollback
to PR #2 retains Railway's private API but restores the Base44-host limitation.

## Validation and review checklist

- [x] Source recovery matches every tracked blob in current GitHub main.
- [x] 154 IDs unique; source PDF bytes, sizes and SHA-256 preserved.
- [x] 18 shared files stored once; 34 variants per age.
- [x] Real HTTP tests cover missing/forged credentials, premium denial,
  administrator removal, upstream failure, all PDFs, HEAD, download headers,
  traversal, source-path denial and SPA security headers.
- [x] Public forms index remains empty/under revision; no pilot IDs in AI registry.
- [x] Existing anti-framing test now checks the new launch command and retained
  security-header configuration; HTTP assertions independently verify headers.
- [x] PR #2 unit suite, lint, typecheck, build, forms-index and all CI passed.
- [x] Base44 proxy tests verify both authorization boundaries and all 154 PDF hashes.
- [x] Transport correction: 352 unit files / 11,050 tests, lint, typecheck,
  production build and forms-index checks pass locally.
- [x] Transport correction: ten dedicated desktop/mobile Playwright scenarios
  pass locally with real PDF rendering and downloads.
- [x] PR #3: existing full desktop/mobile E2E CI passed before merge.
- [x] Railway regression correction: 353 unit files / 11,056 tests, lint,
  typecheck, configured production build and forms-index checks pass locally.
  The new real-server transport regression fails against PR #3 and passes
  with the correction. This run does not substitute for live authentication.
- [x] PR #4 required CI; deployed Railway catalog returned 200.
- [x] Diagnostic version 2: 353 unit files / 11,060 tests, lint, typecheck,
  configured build and forms-index checks pass locally. Four new diagnostic
  scenarios fail against PR #4 and pass with the change. Local Chromium
  crashes before test execution; dedicated and full E2E CI remain required.
- [ ] Authenticated live PDF open/download checks in each deployment.
- [ ] Human review and authenticated Base44 preview/public-host smoke checks.

The dedicated Playwright configuration uses an isolated component harness and
the real SDK request, Base44 handler and Node API/PDF bundle. Only external
identity verification and the fixed service location are substituted with local
fixtures. There is deliberately no Vite `/api/hebrew-forms-pilot` proxy, which
masked the host mismatch in the original test harness. There is no production
auth-bypass environment flag. The workflow executes ten scenarios for desktop
and mobile, including corrupted PDFs, expired sessions and backend outages.
The regular E2E suite is not weakened or skipped.

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`,
`npm run check:forms-index`, and
`npx playwright test --config hebrew-pilot.playwright.config.ts`.
No clinical approval or final rights approval is implied by technical checks.
