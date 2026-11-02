# Mobile action captions — 2026-10-12

Environment: MAIN Base44 Preview, app 69504b725a07f5aa75aeaf7d. No public Publish was performed.

## Changes
- Mobile action buttons show short visible captions alongside their icons; existing visible captions are retained without duplication.
- Captioned controls wrap, remain within their container, and keep a minimum 44px touch target. Desktop/tablet icon styles remain at the existing breakpoints.
- Goals calendar, timeline and kanban controls move into a localized More actions menu on mobile.
- Thought record and session summary secondary actions use the same mobile menu; original desktop controls and action handlers remain.
- Exercise AI practice plans are now available on mobile. Exercise, analytics and practice tabs retain visible captions.
- Chat sending, attachments, conversation menus, coaching controls, navigation menu and notifications have mobile captions.
- Journal rich text formatting buttons have localized visible captions on mobile.
- Captions support English, Hebrew, Spanish, French, German, Italian and Portuguese.
- Familiar back, close and calendar arrows retain standard icon controls.

## Validation
- 92 route/overlay browser cases passed: 44 routes in both configured browser projects plus four goal-overlay cases; width checks include 360, 768 and 1440px.
- 20 flow browser cases passed: seven language/menu cases, five journal cases, two coach save flows and six resource layout cases.
- Five journal cases rerun after the final toolbar CSS change passed.
- 56 targeted localization/UI unit tests passed across eight test files.
- ESLint passed; final production build passed.
- Earlier flow runs exceeded the 30s case timeout under concurrent load; the stable sequential run passed with a 120s case budget. Menu height assertions now wait for the opening animation to settle while retaining the 44px requirement.

## Live MAIN Preview checks
- Hebrew mobile Goals: primary labels visible; More actions opens with labeled calendar/timeline/kanban items and closes on selection.
- Document width and scroll width both 373px on the live Goals screen.
- Journal template editor: visible edit/delete captions and form navigation verified without saving test data.
- Standard CBT journal editor: Hebrew bold/italic/underline/list/clear captions visibly present; sampled toolbar controls at least 44px in width and 46px in height.
- Proof screenshot: mobile-actions-main-preview-20261012.jpg.

Automated API responses are mocked; route checks do not establish every possible data-dependent state or replace physical-device usability review.
