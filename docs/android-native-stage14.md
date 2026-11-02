# Stage 14 — Android Native

## Scope and completion criteria

| Area | Implementation | Automated gate | Live-device gate |
|---|---|---|---|
| Device matrix | Dedicated five-profile Playwright matrix | `npm run test:e2e:android:matrix` | Two physical phones and one tablet |
| Navigation / Back Stack | One Android-only Capacitor bridge; overlay → history → minimize | Architecture test + existing Android navigation suite | Hardware/gesture Back |
| Keyboard / Safe Areas | `adjustResize`, Keyboard listeners, viewport and keyboard CSS variables | Matrix composer test | Gboard in portrait/landscape |
| File upload | Existing Android FileProvider + chat document input | Synthetic TXT selection | Camera/gallery/PDF provider |
| Background / resume | App state drives React Query focus, resumes mutations, refreshes active queries | Architecture test | Background for 30s and process recreation |
| Portrait / landscape | Unlocked, resizable Activity and viewport listener | Portrait/landscape matrix | Rotate on chat, journal, tools |
| Performance / stability | Hardware acceleration, bounded listeners, listener cleanup | Repeated navigation matrix | 15-minute soak and Android Studio profiler |
| Google Play Billing Sandbox | RevenueCat purchase/restore + server entitlement verification, fail-closed flags | Billing architecture test | Play Store tester purchase |

## Device matrix

| Priority | Profile | Android | Viewport / form factor | Required scenarios |
|---|---|---:|---|---|
| P0 | Compact phone | 10+ | Galaxy S9+ class | Login, Home, chat, keyboard, Back, upload |
| P0 | Current phone | 14–16 | Pixel 5/modern Pixel class | Full regression, lifecycle, billing |
| P0 | Tablet | 14+ | 800×1280 | Navigation, split-width layouts, rotation |
| P1 | Current phone landscape | 14–16 | 851×393 | Chat composer, modals, media |
| P1 | Tablet landscape | 14+ | 1280×800 | Tools, journal, file picker |
| P1 | Low-memory physical device | 10–12 | 3–4 GB RAM | Process recreation and restored result |

Automated browser emulation is a release gate, but it does not replace the physical-device gates.

## Commands

```bash
npm install
npm run android:build
npm run test -- test/utils/androidNativeArchitecture.test.js test/utils/billingArchitecture.test.js
npm run test:e2e:android
npm run test:e2e:android:matrix
cd android && ./gradlew testDebugUnitTest assembleDebug bundleRelease
```

## Manual Android checklist

1. Install the synced build on each P0 device.
2. Verify Home, Journal, My Path, Tools and Chat from the bottom navigation.
3. Open a dialog and press Back; verify only the dialog closes.
4. From a subpage press Back; verify the prior page opens.
5. From a tab root press Back; verify the app is minimized.
6. Focus chat and journal inputs with Gboard; verify the active field and send/action button stay visible.
7. Choose one PNG, one PDF and one TXT file; verify selection, removal, upload retry and a repeated selection of the same file.
8. Send an unsaved chat draft, background the app for 30 seconds and return; verify state and active data recover.
9. Repeat step 8 with “Don’t keep activities” enabled to exercise restored plugin results.
10. Rotate Chat, Journal and Tools both ways; verify no blank screen, clipped controls or horizontal overflow.
11. Navigate continuously for 15 minutes while monitoring memory, ANRs and crashes.

## Google Play Billing Sandbox

### One-time configuration

1. In Google Play Console, create/activate subscription product `mindful_path_premium_monthly` for package `me.mindfulpath.app`.
2. Publish an AAB to an Internal testing track (or Internal app sharing) and add the tester Google accounts.
3. Add the same accounts under Play Console license testing.
4. In RevenueCat, connect the Google Play app, import `mindful_path_premium_monthly`, attach it to entitlement `premium`, and place it in the current offering as `$rc_monthly`.
5. Configure Base44 production secrets `REVENUECAT_SECRET_API_KEY` and `REVENUECAT_WEBHOOK_AUTHORIZATION`.
6. Configure the Android build environment:
   - `VITE_SUBSCRIPTIONS_ENABLED=true`
   - `VITE_NATIVE_BILLING_ENABLED=true`
   - `VITE_REVENUECAT_GOOGLE_API_KEY=<RevenueCat Android public SDK key>`
7. Keep web billing independent; `VITE_WEB_BILLING_ENABLED` is not required for Android native purchases.

### Sandbox execution

1. Install the app from the Play-provided tester link with the licensed tester account; do not sideload for billing validation.
2. Open Premium, verify the localized Play price, purchase with a test payment method and confirm entitlement `premium`.
3. Relaunch and verify Premium remains active after server verification.
4. Clear app data or reinstall, sign in as the same application user and run Restore Purchases.
5. Cancel the test subscription in Play, wait for sandbox state propagation and confirm the app follows the verified server state.
6. Exercise user cancellation, unavailable offering, offline purchase attempt, retry, duplicate tap protection and expired entitlement.
7. Confirm RevenueCat webhook delivery is authenticated and deduplicated in Base44.

## Release gate

Stage 14 code readiness is green only when build, unit, Android E2E and matrix E2E pass. Billing is fully green only after the Play Console/RevenueCat live sandbox checklist is recorded for a Play-installed build.
