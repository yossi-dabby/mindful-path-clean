# Android 1.0.4 — internal testing release

Status: preparation only. No signed bundle, Play upload, rollout, or physical-device acceptance is claimed by this change.

## Release identity

| Item | Value |
| --- | --- |
| Repository | `yossi-dabby/mindful-path-clean` |
| Package | `me.mindfulpath.app` |
| New version | `1.0.4` / `versionCode 5` |
| Existing Play version | `1.0.3` / `versionCode 4`, verified in Play Console on 2026-11-06 |
| Track | Existing Internal testing track |
| Signing | Existing upload keystore, retained on the owner's Windows computer |
| Forms prerequisite | [PR #32](https://github.com/yossi-dabby/mindful-path-clean/pull/32), final English release `0.4-en-series-03` |

Recheck Play's latest version code before building if another release has been uploaded in the meantime. Keep the package and upload signing identity unchanged.

## Merge and deployment prerequisites

1. Finish required CI and human review, then merge PR #32 and this release preparation through the normal `main` PR workflow. Do not build the final bundle from a checkout that lacks either change.
2. Publish the merged Node server/private assets, frontend, and Base44 `getHebrewFormsPilot` proxy with the matching shared release pins. Follow [English forms publication checks](english-forms-pilot.md). Repository source is authoritative; do not edit code independently in Base44.
3. Verify the deployed administrator library reports `0.4-en-series-03`, 970/970 English forms and 17 tracks. Verify Hebrew still has 970 forms, other target languages remain unavailable, and regular users cannot access the review library. Check opening and downloading an English PDF through the hosting path used by Android.

The forms remain administrator-only review drafts with professional and rights review pending. This update does not enable them for ordinary users. PDF files stay under `server/private/` and are not copied into the mobile assets. A new AAB alone cannot publish the server-side catalog.

## Build on Windows

Use the current **mindful-path-clean** checkout. The older handoff's `mindful-path` directory may point to the retired repository; check the remote before pulling. If needed, clone `https://github.com/yossi-dabby/mindful-path-clean.git` into a new, empty directory rather than overwriting an existing project.

Run the following checks in PowerShell at the repository root. Stop and inspect any unexpected local changes; do not reset or restore them wholesale.

```powershell
git remote get-url origin
git status --short
git fetch origin
git switch main
git pull --ff-only origin main
git rev-parse HEAD
git rev-parse origin/main
Select-String -Path .\android\app\build.gradle -Pattern 'applicationId|versionCode|versionName'
Test-Path .\server\private\english-pilot-series-03-index.json
```

Confirm the remote is `yossi-dabby/mindful-path-clean`, the worktree is clean, both commit hashes match, the version is 1.0.4/code 5, and `Test-Path` returns `True`.

Use the project's compatible Android Studio/JDK 21 setup and installed Android SDK 36. Keep signing passwords in Android Studio's existing secure workflow, never in source files or chat.

```powershell
$ErrorActionPreference = 'Stop'
$env:VITE_BASE44_APP_ID = '69504b725a07f5aa75aeaf7d'
$env:VITE_BASE44_APP_BASE_URL = 'https://mindful-path-production-7704.up.railway.app'
$env:VITE_BASE44_AUTH_BASE_URL = 'https://mindful-path-75aeaf7d.base44.app'

npm ci
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' }
npm run lint
if ($LASTEXITCODE -ne 0) { throw 'Lint failed' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'Unit tests failed' }
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Typecheck failed' }
npm run android:build
if ($LASTEXITCODE -ne 0) { throw 'Web build or Android sync failed' }

git diff --stat
git diff -- android/app/capacitor.build.gradle android/capacitor.settings.gradle src/generated/therapeutic-forms-index.json
@('.\public', '.\dist', '.\android\app\src\main\assets\public') | ForEach-Object {
    $pdfCount = @(Get-ChildItem -LiteralPath $_ -Recurse -File -Filter *.pdf).Count
    [PSCustomObject]@{ Path = $_; PdfCount = $pdfCount }
    if ($pdfCount -ne 0) { throw "Unexpected bundled PDF in $_" }
}
```

The public forms index remains empty while review content is restricted. Do not copy `server/private` into `public`, `dist`, or Android assets to make the library appear.

Open this checkout's `android` folder in Android Studio. Select **Build → Generate Signed Bundle / APK → Android App Bundle**, choose the existing upload keystore and alias, and build the **release** variant. Do not create a new signing key. Record the generated bundle's actual path; do not select an older `app-release.aab` left in another checkout.

For the new bundle, record its timestamp, byte size and SHA-256 using `Get-Item` and `Get-FileHash -Algorithm SHA256`. Verify the bundle signature, package `me.mindfulpath.app`, version code 5/name 1.0.4, and absence of packaged review PDFs before upload.

## Upload and acceptance

In the existing Mindful Path app in Play Console, open **Testing → Internal testing → Create new release**. Upload the newly signed AAB. Confirm Google accepts the existing upload certificate and displays version 5 (1.0.4). Keep the existing tester list and track settings. Review the release summary, resolve any reported blockers, and roll out to the existing internal testers.

Suggested internal release notes:

```text
<en-US>
Completes the administrator English worksheet review library with 970 forms. Includes language isolation, PDF viewing and download checks. Worksheets remain restricted to administrators while professional review is pending.
</en-US>
```

After Play makes the release available, update through the existing internal-test link and verify on a physical Android device:

- App startup, email/Google sign-in, and session persistence after restart.
- Administrator English library reports 970/970, with Open, zoom, fullscreen and Download working; Hebrew remains intact.
- A regular user cannot access the administrator review library.
- Existing chat, journal, subscription/restore and offline recovery flows still work.

Record the source commit, AAB hash, accepted Play version, rollout status and device results. Browser emulation does not substitute for these native checks. This procedure does not change the closed-testing or production-access setup.
