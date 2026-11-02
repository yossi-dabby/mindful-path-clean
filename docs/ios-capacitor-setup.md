# iOS Capacitor Setup Guide

This document describes how to set up, build, and test the Mindful Path app on iOS using Capacitor.

---

## Prerequisites

- macOS with Xcode 15+ installed (Xcode 15 ships with iOS 17 SDK; Xcode 16+ ships with iOS 18 SDK)
  - This project targets **iOS 15.0** (matching the generated Capacitor 8 Swift package)
  - Recommended: Xcode 16+ to test on iOS 18 devices/simulators
- Node.js 22+ and npm installed (required by Capacitor 8.x)  
- `@capacitor/cli` installed (already in devDependencies)  
- `@capacitor/ios` installed (already in dependencies as of Phase 2)
- RevenueCat product, entitlement and public Apple SDK key configured before purchase testing  
- Apple Developer account (for device/simulator testing and App Store submission)

---

## First-Time iOS Platform Setup

The native Xcode project is committed under `ios/App/App.xcodeproj` as part of Stage 15. Do not run `ios:add` again while that directory exists.

After cloning, run:

```bash
npm install
npm run ios:build
```

This builds the web app and synchronizes its assets plus all Capacitor plugins into the existing iOS project. Generated build products, user-specific Xcode data and copied web assets remain ignored by `ios/.gitignore`.

For the complete signing, device-matrix and Apple IAP Sandbox procedure, see `docs/ios-native-stage15.md`.

---

## Opening in Xcode

```bash
npm run ios:open
# Equivalent to: npx cap open ios
```

This opens Xcode with the `App.xcworkspace` project. From Xcode you can:
- Select a simulator or physical device
- Build and run (`⌘R`)
- Run UI tests
- Archive for TestFlight / App Store distribution

---

## Subsequent Builds (after web changes)

```bash
npm run ios:build
```

This rebuilds the web bundle and syncs the latest assets into the existing `ios/` project.

---

## CI Limitations

Xcode and iOS SDK are only available on macOS runners.  
CI (`playwright.yml` / `webpack.yml`) runs on Linux and therefore **cannot** perform a full iOS native build.

**CI validation covers:**
- Web build (`npm run build`)
- Unit tests (`npm test`)
- E2E tests against the Vite dev server (covers web/WebView layout)

**Local validation required before App Store submission:**
- Open in Xcode on macOS
- Build and test on iOS Simulator (iPhone 14 or newer)
- Verify on a physical device with a notch (e.g. iPhone 12/13/14)
- Check safe-area insets, pinch-to-zoom, long-press callout, back navigation

---

## Smoke Checklist (manual, pre-submission)

| Check | Pass criteria |
|---|---|
| App launches on iPhone Simulator | No crash, loading spinner resolves |
| Pinch-to-zoom works in content areas | Browser zoom activates |
| Long-press callout appears on text | iOS native copy/share menu appears |
| Safe-area insets respected | No content hidden behind notch or home indicator |
| Back navigation closes overlays | Overlay closes before routing back |
| Tab switching preserves state | Active tab data is retained on return |
| Account deletion path works | User is logged out and redirected correctly |

---

## Capacitor Config Reference

See `capacitor.config.ts` in the repository root for the full configuration:
- `appId`: `me.mindfulpath.app`
- `appName`: `Mindful Path`
- `webDir`: `dist`
- iOS: `allowsLinkPreview: false` (prevents unintended link previews in WKWebView)
