/**
 * Focused deterministic tests for explicit no-form suppression.
 *
 * These tests verify that hasExplicitFormSuppressionIntent (called inside
 * detectFormIntent) correctly suppresses form delivery when the current user
 * turn explicitly rejects forms/worksheets/exercises/homework, and that
 * positive form requests remain unaffected.
 *
 * See: src/data/therapeuticForms/aiFormsAccess.js
 */
import { describe, it, expect } from 'vitest';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from '../../src/data/therapeuticForms/availability.js';
import {
  detectFormIntent,
  resolveFormForAIRequest,
  getAllTherapeuticForms,
  MAX_GENERATED_FILES_PER_RESPONSE,
} from '../../src/data/therapeuticForms/index.js';

// Exact production reproduction message
const PRODUCTION_REPRODUCTION =
  'Right now I feel overwhelmed and I am having trouble thinking clearly, but ' +
  'I am safe and I am not thinking about harming myself. Please slow down with ' +
  'me. Do not analyse the deeper pattern yet, and do not suggest or attach an ' +
  'exercise, worksheet, therapeutic form, or homework.';

// ─────────────────────────────────────────────────────────────────────────────
// 1–3  Production reproduction
// ─────────────────────────────────────────────────────────────────────────────
describe('no-form suppression — production reproduction (tests 1–3)', () => {
  it('1. exact production message: detectFormIntent returns null', () => {
    expect(detectFormIntent(PRODUCTION_REPRODUCTION)).toBeNull();
  });

  it('2. exact production message: resolveFormForAIRequest.generatedFile is null', () => {
    const result = resolveFormForAIRequest(PRODUCTION_REPRODUCTION, { language: 'en' });
    expect(result.intent).toBeNull();
    expect(result.generatedFile).toBeNull();
  });

  it('3. exact production message: resolveFormForAIRequest.generatedFiles is empty', () => {
    const result = resolveFormForAIRequest(PRODUCTION_REPRODUCTION, { language: 'en' });
    expect(result.generatedFiles).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4–7  English suppression examples
// ─────────────────────────────────────────────────────────────────────────────
describe('no-form suppression — English suppression examples (tests 4–7)', () => {
  it('4. "Do not send me a form" is suppressed', () => {
    expect(detectFormIntent('Do not send me a form.')).toBeNull();
  });

  it("5. \"Don't attach a worksheet\" is suppressed", () => {
    expect(detectFormIntent("Don't attach a worksheet.")).toBeNull();
  });

  it('6. "No exercises or homework right now" is suppressed', () => {
    expect(detectFormIntent('No exercises or homework right now.')).toBeNull();
  });

  it('7. "I am not asking for a form" is suppressed', () => {
    expect(detectFormIntent('I am not asking for a form.')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8–9  Hebrew suppression examples
// ─────────────────────────────────────────────────────────────────────────────
describe('no-form suppression — Hebrew suppression examples (tests 8–9)', () => {
  it('8. Hebrew "אל תשלח טופס" is suppressed', () => {
    expect(detectFormIntent('אל תשלח טופס.')).toBeNull();
  });

  it('9. Hebrew "בלי תרגילים או דפי עבודה כרגע" is suppressed', () => {
    expect(detectFormIntent('בלי תרגילים או דפי עבודה כרגע.')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10  Current-turn only
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 11–15  Positive requests remain positive
// ─────────────────────────────────────────────────────────────────────────────
describe('no-form suppression — positive requests must not be suppressed (tests 11–15)', () => {
  it('11. "Please attach a worksheet" still routes positively', () => {
    const result = resolveFormForAIRequest('Please attach a worksheet.', { language: 'en' });
    expect(result.intent).not.toBeNull();
  });

  it('13. "What forms do you have?" still produces a list intent', () => {
    const result = resolveFormForAIRequest('What forms do you have?', { language: 'en' });
    expect(result.intent).not.toBeNull();
    expect(result.intent.type).toBe('list_all_forms');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 16–17  Unrelated negation must not suppress a positive request
// ─────────────────────────────────────────────────────────────────────────────
describe('no-form suppression — unrelated negation must not suppress (tests 16–17)', () => {
  it('16. "I do not want to wait; send me the worksheet" remains positive', () => {
    const result = resolveFormForAIRequest(
      'I do not want to wait; send me the worksheet.',
      { language: 'en' }
    );
    expect(result.intent).not.toBeNull();
  });

  it('17. "I am not sure which form fits; show me options" remains positive', () => {
    const result = resolveFormForAIRequest(
      'I am not sure which form fits; show me options.',
      { language: 'en' }
    );
    expect(result.intent).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 18  "Instead" replacement remains positive
// ─────────────────────────────────────────────────────────────────────────────
describe('no-form suppression — "instead" replacement remains positive (test 18)', () => {
  it('18a. English "instead" replacement remains positive', () => {
    const result = resolveFormForAIRequest(
      'Do not send a child form; send an adult form instead.',
      { language: 'en' }
    );
    expect(result.intent).not.toBeNull();
  });

  it("18b. English \"but send\" replacement remains positive", () => {
    const result = resolveFormForAIRequest(
      "Don't attach the worry worksheet; send the thought record instead.",
      { language: 'en' }
    );
    expect(result.intent).not.toBeNull();
  });

  it('18c. Hebrew "במקום" replacement remains positive', () => {
    const result = resolveFormForAIRequest(
      'אל תשלח טופס ילדים; שלח במקום זאת טופס למבוגרים.',
      { language: 'he' }
    );
    expect(result.intent).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 19  Maximum generated-file count is unchanged
// ─────────────────────────────────────────────────────────────────────────────
describe('no-form suppression — infrastructure unchanged (tests 19–24)', () => {
  it('19. MAX_GENERATED_FILES_PER_RESPONSE remains 5', () => {
    expect(MAX_GENERATED_FILES_PER_RESPONSE).toBe(5);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 20  Audience/language filtering is unchanged
  // ─────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // 21  Catalog entries are unchanged
  // ─────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // 22  No generated manifest changes — the suppression check is in-memory only
  // ─────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // 23  No policy-refresh behavior changes
  // ─────────────────────────────────────────────────────────────────────────
  it('23. policy-refresh behavior is unchanged (suppression does not alter registry stats)', () => {
    // Confirm stats after a suppressed message are identical to stats from a
    // neutral call, verifying the suppression is stateless.
    const afterSuppressed = resolveFormForAIRequest(
      'Do not send me any worksheets.',
      { language: 'en' }
    );
    const neutral = resolveFormForAIRequest('What forms do you have?', { language: 'en' });
    expect(afterSuppressed.stats?.total).toBe(neutral.stats?.total);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 24  No extra Agent message behavior
  // ─────────────────────────────────────────────────────────────────────────
  it('24. suppressed response has null responseText and no FORM_ROUTER_CONTEXT injected', () => {
    const result = resolveFormForAIRequest(PRODUCTION_REPRODUCTION, { language: 'en' });
    expect(result.intent).toBeNull();
    expect(result.responseText).toBeNull();
    expect(result.generatedFile).toBeNull();
    expect(result.generatedFiles).toEqual([]);
    // matches and nearestMatches are empty so no FORM_ROUTER_CONTEXT is produced
    expect(result.matches).toEqual([]);
    expect(result.nearestMatches).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Additional Hebrew regression tests
// ─────────────────────────────────────────────────────────────────────────────
describe('no-form suppression — additional Hebrew suppression coverage', () => {
  it('Hebrew "אל תציע לי תרגיל או טופס" is suppressed', () => {
    expect(detectFormIntent('אל תציע לי תרגיל או טופס.')).toBeNull();
  });

  it('Hebrew "אני לא רוצה דף עבודה כרגע" is suppressed', () => {
    expect(detectFormIntent('אני לא רוצה דף עבודה כרגע.')).toBeNull();
  });

  it('Hebrew "אל תצרף טופס טיפולי" is suppressed', () => {
    expect(detectFormIntent('אל תצרף טופס טיפולי.')).toBeNull();
  });

  it('Hebrew "אני לא מבקש טופס" is suppressed', () => {
    expect(detectFormIntent('אני לא מבקש טופס.')).toBeNull();
  });

  it('Hebrew "בלי תרגילים, טפסים או שיעורי בית" is suppressed', () => {
    expect(detectFormIntent('בלי תרגילים, טפסים או שיעורי בית.')).toBeNull();
  });

  it('Hebrew "בבקשה אל תשלח טופס" is suppressed', () => {
    expect(detectFormIntent('בבקשה אל תשלח טופס.')).toBeNull();
  });

  it('Hebrew "אני לא בטוח איזה טופס מתאים, תראה לי את האפשרויות" is NOT suppressed', () => {
    const result = resolveFormForAIRequest(
      'אני לא בטוח איזה טופס מתאים, תראה לי את האפשרויות.',
      { language: 'he' }
    );
    expect(result.intent).not.toBeNull();
  });

  it('Hebrew "שלח לי טפסים" (positively phrased) is NOT suppressed', () => {
    const result = resolveFormForAIRequest('שלח לי כמה טפסים לילד', { language: 'he' });
    expect(result.intent).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Additional English regression tests
// ─────────────────────────────────────────────────────────────────────────────
describe('no-form suppression — additional English positive-request regression', () => {
  it('"Can you give me a worry worksheet?" is NOT suppressed', () => {
    const result = resolveFormForAIRequest('Can you give me a worry worksheet?', { language: 'en' });
    expect(result.intent).not.toBeNull();
  });

  it('"I do not want an exercise or homework right now" is suppressed', () => {
    expect(detectFormIntent('I do not want an exercise or homework right now.')).toBeNull();
  });

  it('"Please do not offer a structured exercise right now" is suppressed', () => {
    expect(detectFormIntent('Please do not offer a structured exercise right now.')).toBeNull();
  });

  it('"No worksheets or forms for now" is suppressed', () => {
    expect(detectFormIntent('No worksheets or forms for now.')).toBeNull();
  });
});
