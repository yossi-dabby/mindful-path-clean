# PDF readability on phones and tablets

The shared PDF.js viewer previously rendered one bitmap pixel per CSS pixel and
shrunk A4 pages into the library card. A 390px-wide phone rendered the sample
worksheet at only 308 bitmap pixels despite a device pixel ratio of 2.75. The
same PDF contains embedded text and does not need to be replaced with an image.

## Result

- Inline pages use the display's pixel ratio and respond to container resizing.
- “Read in full screen” opens a portaled, focus-trapped reader outside the app
  shell, with safe-area padding, a close control and Escape handling. The existing
  Android bridge dismisses this Radix dialog before navigating Back.
- Fit width, 25% zoom steps through 300%, two-finger pinch and Ctrl/Meta-wheel
  zoom redraw from the PDF. One-finger panning remains native. Zoom preserves an
  anchor on the current page rather than jumping according to document height.
- The document is loaded once. Zoom and orientation changes reuse it. Closing or
  changing files cancels work and destroys the PDF document.
- Canvas allocation is capped at 8 million pixels / 4096 pixels per side. Pages
  farther than 240px from the visible area release their bitmap while keeping a
  layout placeholder. Inline previews keep the first page rendered so a page
  below the fold cannot leave the loading indicator stuck. The fullscreen reader
  releases all distant pages, including the first.
- Controls have translations in all seven app languages.

PDF files, their hashes, the 970-form catalog, authorization, public registry,
download behavior and clinical review status are unchanged. This is a PDF viewer
improvement; responsive HTML forms are a separate future feature. Zooming a
fixed-layout page still requires panning to read different parts of the page.

## Validation and handoff

`pdf-reader.playwright.config.ts` tests the compiled app at desktop, tablet and
phone widths. Identity is a fixture; the existing server/proxy supplies the real
catalog and PDF bytes. Tests check canvas resolution, full-width reading, zoom,
orientation changes, no extra catalog/PDF API requests, pinch, native panning,
off-screen bitmap release, Escape/focus restoration, navigation and downloaded
byte identity. The Hebrew forms workflow runs these checks in a separate job.

Run after building:

```sh
npx playwright test --config pdf-reader.playwright.config.ts
```

These are Chromium emulations, not physical-device Safari/WebView validation.
After the owner merges and publishes, verify the reader on an actual iPad and
Android/iPhone: open a worksheet and a four-page guide, enter reading mode, pinch,
rotate, scroll, close, use Back, and download the original PDF. No native package
or public deployment is produced by this change.
