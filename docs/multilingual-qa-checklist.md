# Multilingual QA Checklist

Use this checklist when validating chat rendering and assistant output quality across all supported locales.

Supported languages: **en** (English), **he** (Hebrew/RTL), **es** (Spanish), **fr** (French), **de** (German), **it** (Italian), **pt** (Portuguese)

---

## Pre-release Checklist

### 1. i18n Key Completeness

- [ ] All new translation keys are present in all 7 language sections of `src/components/i18n/translations.jsx`
- [ ] Run `npm test` — `test/utils/translations.test.js` validates core key presence
- [ ] No empty string values in non-English languages (fallback to English is silent; it should not be relied on)
- [ ] Keys added in this release: `chat.output_safety.leakage_suppressed`, `chat.forms.shortfall_notice`

### 2. RTL (Hebrew) Rendering

- [ ] Open the app in Hebrew locale (`he`)
- [ ] Verify chat bubble alignment: assistant bubbles left, user bubbles right (or per design)
- [ ] Send a message containing mixed Hebrew + English tokens (e.g., a Hebrew sentence with an English brand name)
- [ ] Verify mixed text wraps cleanly without overlap or clipping
- [ ] Verify no horizontal scroll appears in the chat container
- [ ] Verify long URLs wrap at container boundary without overflow
- [ ] Verify `dir="auto"` is applied on message content elements (inspect DOM)

### 3. Markdown Rendering

- [ ] Verify bold text renders correctly: `**term**` → **term**
- [ ] Verify bullet lists render as a proper list (not as raw `- item` text)
- [ ] Verify no stray `**` characters appear in rendered output
- [ ] Verify intentional blank lines between paragraphs are preserved
- [ ] Test in at least: en, he, fr (all have distinct punctuation conventions)

### 4. Output Safety — Leakage Suppression

- [ ] No assistant message shows meta-analysis text (e.g., "The user is expressing…")
- [ ] No assistant message shows internal policy narration (e.g., "Relevant Constitution principles…")
- [ ] No assistant message shows planning phrases (e.g., "I need to respond with…")
- [ ] On gratitude/closing turns ("Thank you so much"), verify the assistant responds naturally without any internal reasoning visible
- [ ] Check browser console for any `[FinalOutputGovernor] Leakage suppressed` warnings — investigate if present

### 5. Form Recommendation Count

- [ ] If a user requests N forms, verify N cards are rendered (or a localized shortfall notice appears)
- [ ] Each rendered card must have: title, description, and a valid action/link state
- [ ] Test in English and at least one RTL or non-English locale

### 6. Per-Locale Spot-Check Matrix

For each locale, test at minimum:

| Locale | Open chat | Send greeting | Request forms | Closing turn |
|---|---|---|---|---|
| en | ☐ | ☐ | ☐ | ☐ |
| he | ☐ | ☐ | ☐ | ☐ |
| es | ☐ | ☐ | ☐ | ☐ |
| fr | ☐ | ☐ | ☐ | ☐ |
| de | ☐ | ☐ | ☐ | ☐ |
| it | ☐ | ☐ | ☐ | ☐ |
| pt | ☐ | ☐ | ☐ | ☐ |

---

## Automated Test Coverage

The following unit tests cover multilingual rendering concerns:

| Test file | Coverage |
|---|---|
| `test/utils/chatMarkdownNormalization.test.js` | Markdown repair rules for all locales |
| `test/utils/chatLeakagePatternExpansion.test.js` | Leakage detection across pattern categories |
| `test/utils/messageContentSanitizer.test.js` | Core sanitizer behavior |
| `test/utils/internalTextLeakageBoundary.test.js` | Leakage boundary regression |
| `test/utils/translations.test.js` | i18n key completeness (7 languages) |

Run all: `npm test`

---

## Notes for Hebrew (RTL)

- Hebrew UI uses `dir="rtl"` on the outer layout container
- Individual message content uses `dir="auto"` so mixed-script paragraphs resolve direction correctly
- Do NOT add `overflow-x-hidden` to any wrapper inside `#app-scroll-container` — this breaks iOS scroll in RTL mode
- Punctuation in Hebrew strings: use standard Unicode punctuation; avoid ASCII directional overrides
