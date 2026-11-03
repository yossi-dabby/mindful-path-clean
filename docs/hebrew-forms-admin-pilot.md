# Hebrew forms administrator review pilot

Last updated: 2026-11-03. PR #2 is merged and its Railway service is deployed.
The Base44-host transport correction described below is awaiting review/deployment.

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

The browser calls `base44.functions.invoke('getHebrewFormsPilot', { path,
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
- [ ] Transport correction: existing full desktop/mobile E2E CI.
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
