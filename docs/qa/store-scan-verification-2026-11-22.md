# Independent Android/iOS scan verification — 22 November 2026

Reviewed baseline: `57b847296fe1448009920ca54319aa1b7429fbeb`.
The owner confirmed that both supplied Base44 scans were run after Publish.
Their broad claims that core shell features do not exist are contradicted by
the source and browser behavior. Their internal scoring method and the exact
artifact they inspected are unavailable; this review does not assume why the
scanner missed these features or certify store approval.

## Checklist evidence

| Scan item | Finding and evidence | Remaining boundary |
|---|---|---|
| Dark mode | `ThemeProvider` defaults to system; light/dark CSS and runtime switching/persistence work in Chromium and WebKit. | Native status bars and every optional screen still require device review. |
| Native-like layouts | Fixed mobile header and five bottom tabs; desktop/tablet sidebar. | Native keyboard, rotation and lifecycle need installed-build acceptance. |
| Unified navigation/back | Real cross-tab parent mismatch reproduced and corrected in the header and shared Android Back request. Normal browser history remains in use when it points to the right parent. | OS edge-back/gesture behavior requires physical devices. |
| Bottom tabs/state | `BottomNav`, `TabNavigationProvider`, draft session and scroll restoration already exist. Corrected Back after visiting multiple tab stacks. | No promise to persist unsent sensitive drafts across process death. |
| Overscroll/sticky | Document and app scroller use `overscroll-behavior`; header/sidebar/bottom bar are fixed. | Older iOS WKWebView bounce must be checked on device. |
| Dropdowns | Radix controls plus the settings bottom sheet exist. Selection and keyboard focus work in both browser engines. | Native screen reader acceptance remains manual. |
| Safe areas | Top/bottom handling and `viewport-fit=cover` already exist. Side insets were defined but unused in the shell; now applied to content, mobile chrome and sidebar with RTL mapping. | Injected nonzero-inset tests are not a physical notch test. |
| Optimistic updates | Notifications and goals have optimistic state with rollback. Notification deletion/error rollback verified in both engines. | Not every operation should be optimistic; account deletion waits for the server. |
| Transitions | Framer Motion page transitions, RTL/Back direction and reduced-motion handling already exist. Virtual tab Back now uses reverse transition direction. | Device frame-time profiling remains separate. |
| Performance | Routes are lazy-loaded; the preceding revision reduced the initial JS entry by 18.1%. Build succeeds, but the entry remains substantial. | No measured physical-device startup/frame-rate certification. |
| Responsiveness | Mobile/tablet layouts and orientation emulation are present; new side-inset tests cover English/Hebrew at 390/844px. | Device-specific keyboard/zoom/inset combinations remain manual. |
| Accessibility | Focus handling, labels, text enlargement, reduced motion and 48px mobile controls already exist. | VoiceOver/TalkBack on installed builds remains required. |
| System gestures/selection | Control callouts are scoped; editable text remains selectable. WebKit needs the prefixed computed CSS property in tests. | Blanket disabling of zoom/text selection is not an appropriate fix. |
| Account deletion | Settings confirmation UI and public `/account-deletion` route already exist. Backend deletes app records/account and queues file erasure. | Backend explicitly returns `providerConversationErasure: 'unconfirmed'`; UI tests do not prove complete provider erasure. |
| Pull to refresh | `PullToRefresh` already handles threshold, cancellation, scroll position, editable targets and query refresh. | Installed-platform gesture interference needs device acceptance. |

## Corrections

1. Two tab stacks could leave browser history pointing into the other tab.
   Reproduction: Tools → Exercises → MyPath → Goals → Tools → header Back
   incorrectly reached MyPath. The active tab now supplies its parent; native
   Android Back consults it after overlay dismissal. Existing matching browser
   history still supports Back/Forward normally.
2. Nonzero left/right safe-area values were not used by the shell. The same
   values now protect mobile header/nav, content and sidebar, in LTR and RTL.
3. iOS voice recording lacked `NSMicrophoneUsageDescription`. Added a purpose
   string describing user-initiated chat recording/transcription. This fixes
   the declaration; actual permission and recording behavior needs an iPhone.
4. Added a WebKit readiness job to the existing CI matrix. Browser-neutral
   control tests retain their actual text-selection assertion and read either
   standard or WebKit-prefixed CSS. iOS tests now respect the CI base URL.

## Validation

- All 11,498 unit/source tests passed. Full ESLint and production compilation passed.
- Reproduced the wrong tab parent in both Chromium and WebKit before the fix.
- Nonzero side-inset cases failed before the fix and passed afterward in both engines.
- WebKit readiness gate passed: theme, dropdown/focus, optimistic rollback,
  editable selection, tab restoration, navigation, insets and existing iOS shell cases.
- All 25 WebKit cases across five iPhone/iPad profiles passed. All 24 pull
  handler checks across the two Chromium projects and WebKit passed; all nine
  synthetic account-deletion UI checks passed in WebKit. Three checks also
  confirm that ordinary in-tab Back still decrements browser history and
  supports Forward, rather than always replacing the history entry.
- The production JS entry is 2,966,389 bytes (934,816 bytes gzip), essentially
  unchanged by these corrections; this is a bundle measurement, not a device benchmark.
- API-dependent browser checks use synthetic fixtures, not real account deletion.
- Xcode, a connected iOS device and a connected Android device are unavailable
  in this environment. Browser emulation is not a signed native build test.

## Official requirements versus checklist heuristics

- Android core quality includes light/dark theme support, including web content:
  https://developer.android.com/docs/quality-guidelines/core-app-quality
- Google Play requires discoverable in-app and external account-deletion paths
  for apps with account creation, including associated-data deletion obligations:
  https://support.google.com/googleplay/android-developer/answer/13327111
- Apple 4.2 evaluates sufficient app functionality; 5.1.1 covers account deletion.
  This is not an automatic requirement to use one specific tab bar or refresh pattern:
  https://developer.apple.com/app-store/review/guidelines/
- Apple requires a microphone purpose declaration for microphone APIs:
  https://developer.apple.com/documentation/bundleresources/information-property-list/nsmicrophoneusagedescription

The scans are not reliable evidence that these UI features are absent. The
remaining native-device and provider-data issues still prevent this audit from
declaring the entire app ready for store submission.
