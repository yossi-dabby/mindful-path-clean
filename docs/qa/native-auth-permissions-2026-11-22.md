# Native recording permissions and iOS authentication

Scope: Android voice-recording permissions and iOS OAuth return. Based on main
`5706c6783ad645be7b398aace9f4aef1935d7887`. No provider erasure, visual polish,
or performance changes are included.

## Android

The app declares RECORD_AUDIO and MODIFY_AUDIO_SETTINGS, which Capacitor's
BridgeWebChromeClient requests for AUDIO_CAPTURE. The existing runtime permission
request and translated chat denial/failure messages are reused. Microphone
hardware is optional so installation remains available on devices without it.

The Android workflow compiles the diagnostic APK and unsigned release bundle,
then verifies permissions in the merged manifests. It uploads the diagnostic APK
for device testing. A successful build does not prove microphone behavior:
install the new APK, test allow / deny / permanently deny / permission revoked
in Settings, and verify recording, playback, and continued text chat. Existing
installed APKs need replacement; publishing web assets cannot add native permissions.

## iOS implementation

Native iOS OAuth now uses the same fixed HTTPS callback domain as Android.
A random, ten-minute native_state is persisted before leaving the app and checked
when handling either appUrlOpen (warm app) or getLaunchUrl (cold app). Only the
pending attempt can set the SDK token. It is consumed once, and navigation uses
the previously stored, sanitized in-app destination. Tokens are never added to
the destination URL or logged. The provider's OAuth state is unchanged.

The Xcode target enables Associated Domains and includes App/App.entitlements
for Debug and Release. AppDelegate already forwards universal links to Capacitor.
No custom URL scheme fallback is added.

The server serves JSON at /.well-known/apple-app-site-association and
/apple-app-site-association, without login, redirect, or SPA fallback. It only
associates /native-auth-callback with me.mindfulpath.app.

## Activation pending Apple enrollment

The owner confirmed that there is currently no Apple Developer account.
The code can be reviewed and compiled for the simulator without that account.
Real-device verified-link activation and signed distribution are not complete.

After enrollment:

1. Register/select bundle ID me.mindfulpath.app and enable Associated Domains.
2. Obtain the application's App ID Prefix from Certificates, Identifiers &
   Profiles. It is usually the Team ID; confirm the exact prefix.
3. Set the Railway server environment variable APPLE_APP_ID_PREFIX to that
   ten-character public prefix. It is not a signing key or password. Until it is
   configured, the association endpoint deliberately returns HTTP 503 JSON.
4. Deploy the merged server changes and verify that the well-known endpoint
   returns HTTP 200 application/json, without redirects, with the exact
   PREFIX.me.mindfulpath.app identifier. Account for Apple's association cache.
5. Select the Apple team in Xcode, refresh the provisioning profile with the
   Associated Domains capability, build and reinstall the app.
6. Test provider sign-in with the app running and cold-started, cancellation,
   a repeat callback, and return to the intended page. Confirm access controls
   still apply after authentication. Use the actual Base44 provider flow; mocks
   cannot establish whether its redirect preserves the callback parameters.

The iOS CI job compiles an unsigned simulator build. It does not validate
provisioning, Apple's domain association, external provider login, or an iPhone.

## Validation

Local validation: 75 targeted tests passed; ESLint, TypeScript, and a minified
CI-mode production build passed. Native build and full CI results are recorded
in the pull request. Targeted tests cover callback
origin/path restrictions, state/expiry/replay protection, safe destinations,
warm/cold listener wiring and cleanup, and public association HTTP behavior.

References:
- https://capacitorjs.com/docs/guides/deep-links
- https://developer.apple.com/documentation/xcode/supporting-associated-domains
- https://developer.android.com/training/permissions/requesting
