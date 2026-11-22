# Follow-up verification of the revised store scans

Baseline: `a03bf2b94ad99b69324b1ac05a9ef82b591e6c69` (22 November 2026).
The revised scans recognize the existing mobile shell but leave performance,
optimistic updates, chrome selection, and some iOS quality items as warnings.
Changes in this follow-up belong to a separate PR targeting `main`.

## Findings and changes

| Warning | Verified finding and response |
| --- | --- |
| Production minification | Real configuration gap: any nonempty `CI` value disabled minification. Release builders can set this too. Production builds now always use esbuild minification; CI source maps remain available. |
| Heavy dependencies | Rollup chunk/module inspection finds no shipped `three` or `leaflet` modules. PDF.js is already in a separate, noninitial chunk. No unnecessary dependency or viewer changes were made. Recharts remains in the initial entry; further startup work should be driven by device profiling. |
| Optimistic updates | Already present beyond onboarding: notifications, goals, resources, exercises and other features. The exercise detail favorite still waited for the server; it now updates immediately, restores the previous value on failure, and reconciles cached exercise lists afterward. The existing adapter continues to write owner-scoped `UserExerciseProgress`, not the shared exercise catalog. |
| Selection/callouts | Real CSS cascade gap: generic selectable span rules override navigation-label selection suppression. Explicit chrome rules now cover these labels and preserve editable controls and editable descendants. Chat/content selection and zoom remain available. |
| iOS overscroll | Already explicitly applied to document, body and app scroller. Browser checks confirm computed `overscroll-behavior-y: none` in Chromium and WebKit. Physical WKWebView gestures, especially older iOS versions, remain a device check. |
| Accessibility/localization | The scan does not identify a specific missing label or translation. Existing localized labels are reused; no new strings were introduced. Editable selection, keyboard focus, theme controls and RTL safe areas retain behavioral checks. VoiceOver/TalkBack still need installed-device review. |
| Account deletion marked Pass | The UI exists, but that is not evidence of complete provider erasure. The backend's unconfirmed provider-conversation-erasure state remains unresolved. The historical July RC report now explicitly points readers to the independent November review instead of implying current store approval. |

## Build evidence

Both measured builds used `CI=true`, the same installed dependencies and the
same Vite production configuration except for these changes. An analysis-only
Rollup hook recorded chunk modules and recursively followed static entry imports.
It did not change chunking or shipped source.

| Entry JavaScript measurement | Before | After |
| --- | ---: | ---: |
| Bytes | 4,715,023 | 2,961,677 |
| Bytes after gzip | 1,148,221 | 936,835 |

This is a 37.2% raw-size reduction (18.4% after gzip) **for the CI-enabled build**.
Builds without `CI` were already minified. These numbers are not a measured
startup-time improvement and do not certify performance on a physical device.

## Validation

- Before the fix, production configuration checks failed for `CI=true` and
  `CI=false` (both are nonempty strings). All three cases now pass.
- The actual navigation labels computed to selectable `auto` before the fix
  in both engines. They now compute to `none`; an editable chrome probe and
  the real chat input retain text selection.
- With the favorite request deliberately held open, the old detail screen did
  not change its pressed state. The new screen changes immediately, persists
  a successful response, and rolls back a 500 response. Reload checks verify
  the server result; the test also requires zero shared-catalog writes.
- All 11,502 unit/source checks and full ESLint passed locally.
- All 32 targeted shell/control browser checks passed in Chromium and WebKit.
- The production build with `CI=true` succeeded. All 18 control checks also
  passed against its minified production preview in Chromium and WebKit.
  Full PR CI results are recorded with the pull request.

No real account deletion, native device acceptance or store submission was
performed. Passing the scanner is not a substitute for those checks.
