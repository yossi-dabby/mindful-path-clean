# Native security update

Capacitor core, CLI, Android and iOS are locked to 8.4.3. This patches
[GHSA-rvm3-566m-v7fv](https://github.com/ionic-team/capacitor/security/advisories/GHSA-rvm3-566m-v7fv),
which can load remote documents under the app's origin through the native HTTP
proxy path. Disabling CapacitorHttp alone does not fix affected native binaries.

DOMPurify is locked to 3.4.17 to address
[GHSA-cg2g-xh64-v4q7](https://github.com/cure53/DOMPurify/security/advisories/GHSA-cg2g-xh64-v4q7).
The application currently sanitizes strings and does not enable the advisory's
non-default SAFE_FOR_TEMPLATES plus DOM-returning configuration. The dependency
update is preventive; this change does not assert an observed exploit.

## Verification and release

1. Run `npm ci`, lint, typecheck and the test suite. Build with the documented
   production app/auth URLs, then run `npm run android:build`.
2. The Android Native Build workflow compiles a diagnostic APK and an unsigned
   release bundle on pull requests that change native configuration or packages.
   Successful compilation is not a signed release or a physical-device test.
3. Before a store release, check the latest uploaded Play version code and choose
   a larger unused code. Keep the existing package and upload signing identity.
   This dependency patch does not change the version code or signing settings.
4. Build a new signed AAB using the existing upload key. Upload it to internal
   testing and verify sign-in, session restore, chat/reporting, PDF opening,
   recording/playback/transcription, keyboard/back navigation and purchases.
5. Distribute the rebuilt Android application. A web publication alone does not
   update Capacitor in an installed app. iOS also needs a native rebuild before
   distributing an updated iOS application.

Other dependency advisories must be assessed separately; fixing these two does
not mean the entire dependency audit is clear.
