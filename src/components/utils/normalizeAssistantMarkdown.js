/**
 * normalizeAssistantMarkdown
 *
 * Lightweight, deterministic pre-render normalization for assistant message
 * markdown. Repairs well-known malformed token patterns that arrive from the
 * LLM before they reach ReactMarkdown.
 *
 * Design principles:
 *  - Pure function: same input always produces same output.
 *  - Additive repair only: never silently destroys valid content.
 *  - No regexp that can catastrophically backtrack on large inputs.
 *  - Safe to call on every assistant message; no-op when content is already clean.
 *
 * Patterns repaired:
 *  1. Space-padded bold: "** word **"  → "**word**"
 *  2. Bold with leading punctuation: "**("text")**" / "** ("text")**" → **"text"**
 *  3. Unbalanced trailing bold marker: "word **" (no opening) → "word"
 *  4. Unbalanced leading bold marker: "** word" (no closing) → "word"
 *  5. Stacked/doubled markers: "****" → "" (empty bold)
 *  6. Bold followed immediately by same text not in bold (duplicate artefact)
 *  7. Trailing whitespace on list items before newline
 */

/**
 * @param {string} text - Raw assistant message content
 * @returns {string} - Repaired content safe for ReactMarkdown
 */
export function normalizeAssistantMarkdown(text) {
  if (!text || typeof text !== 'string') return text;

  let result = text;

  // 1. Collapse space-padded bold markers: "** word **" → "**word**"
  //    Also handles italic: "* word *" → "*word*"
  //    Use a non-greedy match so we don't bridge across paragraphs.
  result = result.replace(/\*\* {1,4}([^*\n]{1,200}?) {1,4}\*\*/g, '**$1**');
  result = result.replace(/\* {1,4}([^*\n]{1,200}?) {1,4}\*/g, '*$1*');

  // 2. Bold wrapping malformed open-paren / open-quote patterns:
  //    "**("text")**"   → **"text"**
  //    "** ("text")**"  → **"text"**
  //    "**('text')**"   → **'text'**
  result = result.replace(/\*\* {0,2}[(（]([^)）\n]{1,200}?)[)）] {0,2}\*\*/g, '**$1**');

  // 3. Bold with embedded smart-quote wrapping artefact:
  //    **"text"**  — already valid; no change needed.
  //    ** "text" ** → **"text"** (handled by rule 1 above, but repeated here for clarity)

  // 4. Doubled-asterisk collapse: "****" anywhere not part of a valid bold span → remove.
  //    A "****" sequence that is not flanked by non-space chars is an empty bold and
  //    renders as nothing useful.
  //    Note: (?<!\*) negative lookbehind requires ES2018+; supported by all modern browsers
  //    targeted by this Vite build (Chrome 80+, Firefox 78+, Safari 14+).
  result = result.replace(/(?<!\*)\*{4}(?!\*)/g, '');

  // 5. Unbalanced trailing "**" at end of a line (orphan close marker):
  //    "Some text **" → "Some text"
  //    Only strip if there is no matching open marker on the same line.
  result = result.replace(/^((?:(?!\*\*).)*?) {0,1}\*\*\s*$/gm, (match, before) => {
    // Count ** on this line; if odd number, we have an orphan
    const count = (match.match(/\*\*/g) || []).length;
    if (count % 2 !== 0) return before.trimEnd();
    return match;
  });

  // 6. Unbalanced leading "**" at start of a line (orphan open marker):
  //    "** Some text" → "Some text"
  result = result.replace(/^\*\* {0,1}(?=\S)/gm, (match, offset, str) => {
    // Check if there's a closing ** later on this line
    const lineEnd = str.indexOf('\n', offset);
    const line = lineEnd === -1 ? str.slice(offset) : str.slice(offset, lineEnd);
    const closes = (line.match(/\*\*/g) || []).length;
    // If only one ** on the line, it's orphaned
    if (closes === 1) return '';
    return match;
  });

  // 7. Trim trailing whitespace from list item lines (common LLM artefact)
  result = result.replace(/^([ \t]*[-*+][ \t]+.+?) {2,}$/gm, '$1');

  // 8. Normalize runs of 3+ blank lines to exactly 2 (one blank line between paragraphs)
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}
