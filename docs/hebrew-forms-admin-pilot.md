# Hebrew forms administrator review pilot

Last updated: 2026-11-03. Status: proposed change; not deployed.

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
are denied. No backend Base44 function or schema deployment is needed.

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

## User interface and rollout

The existing forms page includes `HebrewFormsPilot` inside its current shell.
It appears only for an authenticated administrator in Hebrew mode. The flow
is age → shared/Core/anxiety track → unit → individual form. PDF.js renders
the original PDF on mobile and desktop; downloading retains its original ID
as the filename. Preview blobs are revoked when closed/unmounted or when
the active identity/language changes. Failed authorization clears the preview.

This endpoint exists on the Node/Railway host, not on Base44's frontend host
or a static-only preview. An administrator on a host without the endpoint sees
an unavailable message. Review the pilot on the Railway-hosted app before
considering other hosts, mobile native origins or therapist access. Do not
configure permissive cross-origin access to work around that limitation.

This PR does not change service sources, environment variables, public access,
or publish settings. Review and passing CI precede merge/deployment. Runtime
startup overrides in Railway must be checked before rollout, because an
override of `railway.toml` would keep the old static server and disable the API.
Rollback uses the preceding application version and its static start command.

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
- [x] Local full unit suite: 351 files / 11,041 tests passed.
- [x] Local lint, typecheck, production build and forms-index checks passed.
- [x] Eight dedicated desktop/mobile browser scenarios passed locally using
  Chromium 153, including real PDF rendering and byte-for-byte downloads.
- [ ] Dedicated desktop/mobile Playwright scenarios pass in CI.
- [ ] Existing full desktop/mobile E2E CI passes for this PR.
- [ ] Human review and authenticated Railway-host smoke check before rollout.

The dedicated Playwright configuration uses an isolated component harness and
the real Node API/PDF bundle. Only external identity verification is stubbed
with synthetic accounts. There is no production auth-bypass environment flag.
The new workflow installs browsers and executes eight scenarios for desktop and
mobile. The regular E2E suite is not weakened or skipped.

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`,
`npm run check:forms-index`, and
`npx playwright test --config hebrew-pilot.playwright.config.ts`.
No clinical approval or final rights approval is implied by technical checks.
