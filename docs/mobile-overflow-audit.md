# Playwright Mobile Overflow Audit Runbook (iOS + Android)

This runbook describes how to manually test and record mobile viewport overflow issues using Playwright and a DevTools overflow-offender snippet.

---

## Setup

```bash
npm ci
npx playwright install --with-deps
```

---

## Run Commands

### Default config (iOS viewports)

```bash
npx playwright test
```

### Android config

```bash
npx playwright test --config=playwright.android.config.ts
```

### If the dev server is not already running

Start the dev server in one terminal:

```bash
npm run dev
```

Then rerun Playwright in a second terminal:

```bash
npx playwright test
# or
npx playwright test --config=playwright.android.config.ts
```

---

## Optional Interactive Runs

```bash
# Open the Playwright UI mode
npx playwright test --ui

# Run tests in headed (visible browser) mode
npx playwright test --headed
```

---

## Target Viewports

| Device | Width | Height |
|---|---|---|
| iPhone SE | 375 | 667 |
| iPhone 14 Pro | 393 | 852 |
| Pixel 7 | 412 | 915 |
| Small landscape | 667 | 375 |

---

## DevTools Overflow Offender Snippet

Open the browser DevTools Console on the page under test and paste the following snippet. It logs all elements that cause horizontal or vertical overflow.

```js
(() => {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;

  const elems = Array.from(document.querySelectorAll('body *'));
  const offenders = [];

  for (const el of elems) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;

    const cw = el.clientWidth, sw = el.scrollWidth;
    const ch = el.clientHeight, sh = el.scrollHeight;

    const rect = el.getBoundingClientRect();
    const horizontalOverflow = (sw - cw) > 1;
    const verticalOverflow = (sh - ch) > 1;
    const offscreenRight = rect.right > vw + 1;
    const offscreenLeft = rect.left < -1;

    if (horizontalOverflow || offscreenRight || offscreenLeft || verticalOverflow) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        class: el.className || null,
        horizontalOverflow,
        verticalOverflow,
        cw, sw, ch, sh,
        rect: {
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      });
    }
  }

  offenders.sort((a, b) => ((b.sw - b.cw) - (a.sw - a.cw)));
  console.table(offenders.slice(0, 50));
  console.log(`Total potential overflow offenders: ${offenders.length}`);
  return offenders;
})();
```

---

## Findings Table Template

Use this table to record issues discovered during the audit. Add one row per reproducible overflow finding.

| Route | Navigation steps | Viewport/device | Symptom | Offender element id/class | Screenshot/video paths | Reproducible in default config? | Reproducible in android config? | Notes |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |
