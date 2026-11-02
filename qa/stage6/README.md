# Stage 6 — Settings and shared surfaces

Synthetic data only. The fixture holds User/profile preferences, notifications,
knowledge records, exports, and mocked account deletion in memory. No real
account, clinical content, feature flag, or production record is changed.

## Run

```sh
npm test
npm run lint
npm run typecheck
VITE_BASE44_APP_ID=test-app-id npm run build
npx playwright test -c stage6.playwright.config.ts
STAGE6_ADMIN=1 npx playwright test -c stage6.playwright.config.ts stage6-matrix
STAGE6_REGRESSION=1 PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:5186 npx playwright test -c stage6.playwright.config.ts
```

Install Chromium through Playwright first; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can
select an existing executable. `STAGE5_ARTIFACT_ROOT`, `STAGE5_EVIDENCE_DIR`, and
`STAGE5_RUN` retain the shared Stage 5 reporter/helper names and can point to a
Stage 6 output directory. Do not commit generated reports or screenshots.

The regular matrix covers 17 routes × 7 widths × EN/HE × light/dark. The admin
matrix separately checks authorized KnowledgeStudio, AdminFeatureFlags, and
TherapistTraining at the same sizes. The regular matrix checks denied admin
routes for a regular user. CrisisAlerts and TestSetupGuide have a separate
seven-width matrix plus gate/filter/error and clipboard tests. Focused flows cover profile/preference persistence,
rollback, language retry, mode and all six palettes, export download bytes,
account confirmation/cancel/error/synthetic success, OTP and password recovery,
notification and menu focus, support regions, 404 paths, knowledge editing,
import validation and draft creation, training error recovery, and startup
errors. Copy-key parity is checked for all seven languages; a browser sweep
also covers public/settings/auth surfaces in all seven.

A browser resize with touch emulation is a simulation. Physical iOS/Android
keyboards, screen readers, device rotation, actual email/OAuth delivery,
production persistence/deletion and live clinical AI are separate release
checks. The production visit was read-only (About and Privacy).

Technical diagnostic identifiers, schema enum values, pre-existing clinical
training cases and retrieved content keep their source language. New UI copy
has seven translations. Therapeutic Forms remains `under_revision`.
