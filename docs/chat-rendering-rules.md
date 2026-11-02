# Chat Rendering Rules — Mixed RTL/LTR and Overflow

This document describes the rendering rules for chat messages in the Mindful Path app, covering bidirectional text, overflow wrapping, and scroll-container constraints.

---

## 1. Bidirectional Text (`dir` Strategy)

The app supports 7 locales including Hebrew (`he`), which is RTL. Chat messages may contain mixed scripts (e.g., Hebrew sentences with embedded English terms, URLs, or numerals).

### Two-level `dir` design

| Layer | Element | Value | Purpose |
|---|---|---|---|
| Outer bubble | `.message-bubble` wrapper div | `dir="rtl"` (he) / `dir="ltr"` (others) | Controls layout alignment (bubble position, text-align) |
| Inner content | User `<p>` / Assistant `<ReactMarkdown>` wrapper | `dir="auto"` | Unicode BiDi algorithm handles per-paragraph base direction for mixed-script runs |

**Why `dir="auto"` on inner content?**  
Using only the outer `dir="rtl"` causes embedded LTR tokens (English brand names, URLs, code) to wrap incorrectly. `dir="auto"` lets the browser compute base direction from the first strongly-typed character per paragraph, which handles mixed content correctly without any JS logic.

**Why not `dir="auto"` on the outer bubble?**  
The outer bubble alignment (whether the bubble floats left or right) must be governed by the app locale, not the message content. Mixing `dir="auto"` at layout level would cause bubbles to jump sides based on content.

---

## 2. Long Token Overflow Wrapping

Long unbreakable tokens (URLs, technical terms, form IDs) can overflow message containers. The following CSS classes are applied to message content elements:

```
break-words [overflow-wrap:anywhere]
```

| Class | CSS equivalent | Behavior |
|---|---|---|
| `break-words` | `overflow-wrap: break-word` | Breaks long words only when they overflow the container |
| `[overflow-wrap:anywhere]` | `overflow-wrap: anywhere` | Also allows breaks between any characters, including after hyphens |

Both are applied (belt-and-suspenders) because some browser/font combinations only respect one.

**Do not use `word-break: break-all`** — this breaks normal prose between every character and produces illegible output for RTL scripts.

---

## 3. Scroll Container Constraints

The app uses specific scroll and viewport patterns that must be preserved in chat pages:

- `#app-scroll-container` uses `overflow-x-clip` (NOT `overflow-x-hidden`) + `overflow-y-auto` + `height:100dvh`
- Full-screen chat pages use `fixed inset-0 flex flex-col` with `height:100dvh; overflow:hidden`
- Use `min-h-dvh` (NOT `min-h-screen`) for page root wrappers
- **Do NOT add `overflow-x-hidden` to page wrappers** — creates a BFC that breaks iOS scroll
- **Do NOT add nested scroll containers inside `#app-scroll-container`**

---

## 4. Markdown Rendering

Assistant messages are rendered via `react-markdown`. Key rules:

- A normalization pass (`normalizeAssistantMarkdown`) runs **before** ReactMarkdown to repair common malformed patterns produced by the LLM (see `src/components/utils/normalizeAssistantMarkdown.js`).
- The normalization is deterministic and non-destructive — valid content is passed through unchanged.
- Intentional blank lines and list structures are preserved.
- The normalization runs **after** all safety pipeline stages (thinking-strip → governor → attachment-strip → normalize → render).

---

## 5. Rendering Pipeline Order (Assistant Messages)

```
rawContent
  → extractThinkingContent()       // strips <think>...</think> blocks
  → applyFinalOutputGovernor()     // CP12: leakage, routing strip, language check
  → sanitizeAssistantContentForAttachmentSurfaces()  // removes attachment URL lines
  → normalizeAssistantMarkdown()   // NEW: repairs malformed markdown tokens
  → <ReactMarkdown dir="auto" …>  // renders to HTML
```

Do not insert normalization steps before the safety pipeline stages — safety must run on raw LLM output.
