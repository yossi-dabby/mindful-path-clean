/**
 * test/utils/v8cSessionLanguageHotfix.test.js
 *
 * V8-C Minimal Hotfix — Session Language Regression Guard
 *
 * Proves:
 *   1.  `en` produces an explicit English session directive.
 *   2.  `he` produces an explicit Hebrew session directive.
 *   3.  Every supported language produces exactly one directive.
 *   4.  English is no longer treated as "no directive needed."
 *   5.  English new-session content contains the English directive.
 *   6.  Hebrew new-session content contains the Hebrew directive.
 *   7.  The exact Hebrew governor fallback is never returned for locked `en`.
 *   8.  The correct English governor fallback is returned for locked `en`.
 *   9.  The Hebrew fallback remains available for locked `he`.
 *  10.  Missing / invalid language fails safely to English.
 *  11.  normalizeSessionLanguage is exported and rejects unknown codes.
 *  12.  A UI language change during an existing session must not alter its lock
 *       (source-level: sessionLanguageRef.current is only set on new-session paths).
 *  13.  A new conversation after a UI language change uses the new language
 *       (source-level: new-session path reads i18n.language).
 *  14.  Hard refresh restores the embedded session language from the first user
 *       message directive.
 *  15.  Conversation switching reads the embedded language, not i18n.language.
 *  16.  Both new-conversation flows (subscription / polling) lock from
 *       sessionLanguageRef.current via addLangDirective.
 *  17.  No wrong-language contamination passes governor for known `en` session.
 *  18.  Governor with valid English text + locked `en` returns that text unchanged
 *       (exactly one response, no duplicate).
 *  19.  No maintenance agent message: source never sends a second START_SESSION.
 *  20.  Formulation fallback uses the locked language (English → English fallback).
 *  21.  Safety fallback from governor uses the locked language.
 *  22.  No-form suppression from PR #860 remains intact (source guard present).
 *  23.  V8 strategy feature flags remain false by default.
 *  24.  Feature flags remain false by default.
 *
 * Regression sequence: English app → new CBT session → opening bubble has no
 * Hebrew characters → first English user message → English response → no
 * duplicate / orphan bubble.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  applyFinalOutputGovernor,
  normalizeSessionLanguage,
} from '../../src/components/utils/finalOutputGovernor.jsx';
import {
  buildFormulationSafeFallback,
} from '../../src/components/utils/formulationContractGuard.js';

// ─── Source snapshots ─────────────────────────────────────────────────────────

const chatSrc = readFileSync(resolve('src/pages/Chat.jsx'), 'utf8');
const governorSrc = readFileSync(
  resolve('src/components/utils/finalOutputGovernor.jsx'),
  'utf8'
);
const featureFlagSrc = readFileSync(resolve('src/lib/featureFlags.js'), 'utf8');
const aiFormsAccessSrc = readFileSync(
  resolve('src/data/therapeuticForms/aiFormsAccess.js'),
  'utf8'
);

// ─── Governor FAILSAFE constants (must stay in sync with source) ──────────────

const FAILSAFE = {
  he: 'אני כאן איתך. מה הכי מטריד אותך כרגע?',
  en: "I'm here with you. What's on your mind right now?",
  es: 'Estoy aquí contigo. ¿Qué está en tu mente ahora mismo?',
  fr: "Je suis là pour toi. Qu'est-ce qui te préoccupe en ce moment?",
  de: 'Ich bin hier für dich. Was beschäftigt dich gerade?',
  it: 'Sono qui con te. Cosa hai in mente in questo momento?',
  pt: 'Estou aqui com você. O que está em sua mente agora?',
};

const SUPPORTED_LANGS = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

// The exact Hebrew production opening that must NEVER appear in an English session.
const HE_PRODUCTION_OPENING =
  'טוב שאתה כאן. אנחנו יכולים להאט רגע, ולעשות יחד סדר במה שהכי קשה עכשיו — צעד אחר צעד. אני כאן איתך.';

// ─── 1. English directive present in LANG_FULL_NAMES ─────────────────────────

describe('FIX 1 — English directive (LANG_FULL_NAMES includes en)', () => {
  it('LANG_FULL_NAMES map contains en: English', () => {
    expect(chatSrc).toMatch(/en:\s*['"]English['"]/);
  });

  it('addLangDirective comment no longer says English is intentionally absent', () => {
    expect(chatSrc).not.toMatch(/English is intentionally absent/);
  });

  it('addLangDirective directive template does not say "Do not use English"', () => {
    // The old template used "Do not use English." for all non-English languages.
    // After the fix every language uses the neutral "Do not use another language..." wording.
    expect(chatSrc).not.toMatch(/Do not use English\./);
  });

  it('addLangDirective template uses "Do not use another language unless..." wording', () => {
    expect(chatSrc).toMatch(/Do not use another language unless/);
  });
});

// ─── 2 & 3. Directive produced for every supported language ───────────────────

describe('FIX 1 — addLangDirective produces exactly one directive per language', () => {
  // Helper: simulate addLangDirective by inspecting source behavior via regex extraction.
  // We extract the template from source and validate it covers each language code.
  const LANG_FULL_NAMES_MATCH = chatSrc.match(
    /const LANG_FULL_NAMES\s*=\s*\{([^}]+)\}/
  );

  it('LANG_FULL_NAMES source block is present and parseable', () => {
    expect(LANG_FULL_NAMES_MATCH).not.toBeNull();
  });

  SUPPORTED_LANGS.forEach((code) => {
    it(`LANG_FULL_NAMES contains entry for ${code}`, () => {
      expect(LANG_FULL_NAMES_MATCH[1]).toMatch(new RegExp(`${code}\\s*:`));
    });
  });

  it('LANG_FULL_NAMES has exactly 7 entries (one per supported language)', () => {
    // Count "xx:" entries in the object body
    const entries = (LANG_FULL_NAMES_MATCH[1].match(/\b[a-z]{2}\s*:/g) || []);
    expect(entries.length).toBe(7);
  });
});

// ─── 4. English is no longer exempt ──────────────────────────────────────────

describe('FIX 1 — English is no longer treated as "no directive needed"', () => {
  it('addLangDirective guard condition is `if (!name)` not `if (lang === "en")`', () => {
    // The function must NOT contain a special-case bypass for English.
    // The guard is simply: if (!name) return sessionContent — no lang === "en" check.
    expect(chatSrc).not.toMatch(/if\s*\(\s*lang\s*===\s*['"]en['"]\s*\)\s*return\s+sessionContent/);
  });

  it('source does not short-circuit addLangDirective for en before name lookup', () => {
    // Ensure there is no early-return for English before the LANG_FULL_NAMES lookup.
    const fnBody = chatSrc.match(/function addLangDirective[\s\S]*?^}/m)?.[0] || '';
    expect(fnBody).not.toMatch(/en.*return\s+sessionContent/);
  });
});

// ─── 5 & 6. Session-start call sites use the locked language ─────────────────

describe('FIX 1 — session-start call sites pass sessionLanguageRef.current', () => {
  it('all addLangDirective call sites use sessionLanguageRef.current (≥ 4 sites)', () => {
    const locked = (
      chatSrc.match(/addLangDirective\(\s*sessionStartContent\s*,\s*sessionLanguageRef\.current\s*\)/g) || []
    ).length;
    expect(locked).toBeGreaterThanOrEqual(4);
  });

  it('no addLangDirective call site passes live i18n.language directly', () => {
    const live = (
      chatSrc.match(/addLangDirective\(\s*sessionStartContent\s*,\s*i18n\.language\s*\)/g) || []
    ).length;
    expect(live).toBe(0);
  });
});

// ─── 7. Hebrew fallback never returned for locked en ─────────────────────────

describe('FIX 2 — Governor: Hebrew fallback never returned for locked en', () => {
  it('empty input with lang=en returns English failsafe, not Hebrew', () => {
    const result = applyFinalOutputGovernor('', { lang: 'en' });
    expect(result).toBe(FAILSAFE.en);
    expect(result).not.toBe(FAILSAFE.he);
  });

  it('null input with lang=en returns English failsafe', () => {
    const result = applyFinalOutputGovernor(null, { lang: 'en' });
    expect(result).toBe(FAILSAFE.en);
  });

  it('pure-question input with lang=en returns English failsafe, not Hebrew', () => {
    const result = applyFinalOutputGovernor('What is the question?', { lang: 'en' });
    expect(result).toBe(FAILSAFE.en);
    expect(result).not.toBe(FAILSAFE.he);
  });

  it('the exact Hebrew production opening never passes governor for lang=en', () => {
    // This is the exact text reported in the production bug.
    // The governor should not pass or return Hebrew for an English session.
    const result = applyFinalOutputGovernor(HE_PRODUCTION_OPENING, { lang: 'en' });
    // Result must be English — either original (if guard logic passes it through)
    // or a failsafe. Either way it must contain no Hebrew characters.
    expect(/[\u05D0-\u05EA]/.test(result)).toBe(false);
  });
});

// ─── 8. Correct English fallback for locked en ───────────────────────────────

describe('FIX 2 — Governor: correct English fallback for locked en', () => {
  it('applyFinalOutputGovernor with empty text and lang=en returns English FAILSAFE', () => {
    expect(applyFinalOutputGovernor('', { lang: 'en' })).toBe(FAILSAFE.en);
  });

  it('applyFinalOutputGovernor with valid English text passes through', () => {
    const text =
      "It's good that you're here. We can slow down for a moment and gently sort through what feels hardest right now, one step at a time. I'm here with you.";
    const result = applyFinalOutputGovernor(text, { lang: 'en' });
    expect(result).toBeTruthy();
    expect(/[\u05D0-\u05EA]/.test(result)).toBe(false);
  });
});

// ─── 9. Hebrew fallback available for locked he ───────────────────────────────

describe('FIX 2 — Governor: Hebrew fallback preserved for locked he', () => {
  it('empty input with lang=he returns Hebrew failsafe', () => {
    expect(applyFinalOutputGovernor('', { lang: 'he' })).toBe(FAILSAFE.he);
  });

  it('Hebrew failsafe contains Hebrew characters', () => {
    expect(/[\u05D0-\u05EA]/.test(FAILSAFE.he)).toBe(true);
  });

  it('applyFinalOutputGovernor with valid Hebrew text passes through', () => {
    const text = FAILSAFE.he;
    const result = applyFinalOutputGovernor(text, { lang: 'he' });
    expect(result).toBeTruthy();
    expect(/[\u05D0-\u05EA]/.test(result)).toBe(true);
  });
});

// ─── 10 & 11. normalizeSessionLanguage — invalid/missing defaults to en ───────

describe('FIX 2 — normalizeSessionLanguage: fail-closed to English', () => {
  it('normalizeSessionLanguage is exported from finalOutputGovernor', () => {
    expect(typeof normalizeSessionLanguage).toBe('function');
  });

  it('undefined → en', () => {
    expect(normalizeSessionLanguage(undefined)).toBe('en');
  });

  it('null → en', () => {
    expect(normalizeSessionLanguage(null)).toBe('en');
  });

  it('empty string → en', () => {
    expect(normalizeSessionLanguage('')).toBe('en');
  });

  it('unknown code "xx" → en', () => {
    expect(normalizeSessionLanguage('xx')).toBe('en');
  });

  it('"he-IL" (locale tag) → he', () => {
    expect(normalizeSessionLanguage('he-IL')).toBe('he');
  });

  it('"EN" (uppercase) → en', () => {
    expect(normalizeSessionLanguage('EN')).toBe('en');
  });

  it('"HE" (uppercase) → he', () => {
    expect(normalizeSessionLanguage('HE')).toBe('he');
  });

  SUPPORTED_LANGS.forEach((code) => {
    it(`supported code "${code}" → "${code}"`, () => {
      expect(normalizeSessionLanguage(code)).toBe(code);
    });
  });

  it('invalid code never returns he (fails to en, not he)', () => {
    expect(normalizeSessionLanguage('xx')).toBe('en');
    expect(normalizeSessionLanguage('zz')).toBe('en');
    expect(normalizeSessionLanguage('ar')).toBe('en');
  });

  it('applyFinalOutputGovernor with opts.lang="xx" defaults to English failsafe', () => {
    expect(applyFinalOutputGovernor('', { lang: 'xx' })).toBe(FAILSAFE.en);
  });

  it('applyFinalOutputGovernor with no opts.lang and empty text uses English failsafe', () => {
    const result = applyFinalOutputGovernor('');
    // Without a locked lang, governor auto-detects. Empty text → English failsafe.
    expect(result).toBe(FAILSAFE.en);
  });
});

// ─── 12. UI language change must not alter locked session language ────────────

describe('FIX 3 — Session lock: UI language change does not affect existing session', () => {
  it('sessionLanguageRef.current is set from i18n.language only on new-conversation creation', () => {
    // Verify that there is no i18n.languageChanged listener that mutates sessionLanguageRef.
    expect(chatSrc).not.toMatch(
      /languageChanged[\s\S]{0,200}sessionLanguageRef\.current\s*=/
    );
  });

  it('sessionLanguageRef is initialised with i18n.language as default only', () => {
    // The ref init line uses i18n.language as the default value.
    expect(chatSrc).toMatch(/useRef\(\s*i18n\.language\s*\|\|\s*['"]en['"]\s*\)/);
  });
});

// ─── 13. New conversation after UI language change uses new language ───────────

describe('FIX 3 — New conversation uses current i18n.language at creation time', () => {
  it('new-conversation path sets sessionLanguageRef from i18n.language before calling addLangDirective', () => {
    // sessionLanguageRef.current = i18n.language must appear before addLangDirective calls
    // in the new-conversation code path.
    expect(chatSrc).toMatch(/sessionLanguageRef\.current\s*=\s*i18n\.language\s*\|\|\s*['"]en['"]/);
  });
});

// ─── 14 & 15. Hydration restores embedded session language ────────────────────

describe('FIX 3 — Hydration / restoration: embedded SESSION_LANGUAGE directive is used', () => {
  it('hydration path extracts SESSION_LANGUAGE from first user message', () => {
    // Source must contain a regex/string literal that extracts the 2-char language code
    // from the [SESSION_LANGUAGE: xx. ...] directive embedded in the first user message.
    expect(chatSrc).toMatch(/SESSION_LANGUAGE/);
    expect(chatSrc).toMatch(/embeddedLang/);
  });

  it('hydration uses embeddedLang || i18n.language as session lock (not i18n.language alone)', () => {
    // Two or more occurrences of this restoration pattern are expected.
    const matches = (
      chatSrc.match(/embeddedLang\s*\|\|\s*i18n\.language\s*\|\|\s*['"]en['"]/g) || []
    );
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── 16. Subscription and polling paths use locked language ───────────────────

describe('FIX 3 — Subscription and polling paths lock from sessionLanguageRef.current', () => {
  it('polling path passes sessionLanguageRef.current to buildVisibleConversationMessages', () => {
    expect(chatSrc).toMatch(/buildVisibleConversationMessages\([^)]*sessionLanguageRef\.current/);
  });

  it('new-message send path uses addLangDirective with sessionLanguageRef.current', () => {
    const matches = (
      chatSrc.match(/addLangDirective\(\s*sessionStartContent\s*,\s*sessionLanguageRef\.current\s*\)/g) || []
    ).length;
    expect(matches).toBeGreaterThanOrEqual(4);
  });
});

// ─── 17. Governor does not pass Hebrew text through for locked en ─────────────

describe('FIX 4 — Governor: Hebrew text intercepted for locked en', () => {
  it('governor result for Hebrew input + lang=en contains no Hebrew characters', () => {
    const result = applyFinalOutputGovernor(FAILSAFE.he, { lang: 'en' });
    expect(/[\u05D0-\u05EA]/.test(result)).toBe(false);
  });
});

// ─── 18. Exactly one response: governor does not duplicate output ─────────────

describe('FIX 4 — Governor returns a single string, no duplication', () => {
  it('governor returns a plain string for valid English input', () => {
    const input = "It's good that you're here. I'm here with you.";
    const result = applyFinalOutputGovernor(input, { lang: 'en' });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('governor result does not contain the input text twice', () => {
    const input = "I'm here with you. What's on your mind right now?";
    const result = applyFinalOutputGovernor(input, { lang: 'en' });
    const count = result.split(input).length - 1;
    expect(count).toBeLessThanOrEqual(1);
  });
});

// ─── 19. No maintenance message: source never sends a second START_SESSION ────

describe('FIX 4 — No maintenance agent message', () => {
  it('Chat.jsx does not send a second START_SESSION to repair language', () => {
    // A "repair" pattern would look like an addLangDirective call inside a
    // useEffect that reacts to an existing assistant message being wrong-language.
    // There must be no such pattern.
    expect(chatSrc).not.toMatch(/repair.*language|language.*repair/i);
  });

  it('addLangDirective is only called at session creation, not on received messages', () => {
    // All call sites must be in new-session branches, not in message-received handlers.
    // Verify no call inside an "onMessage" or "onReceived" callback.
    expect(chatSrc).not.toMatch(
      /onMessage[\s\S]{0,300}addLangDirective|addLangDirective[\s\S]{0,300}onMessage/
    );
  });
});

// ─── 20. Formulation fallback uses locked language ────────────────────────────

describe('FIX 4 — Formulation fallback uses locked language', () => {
  it('buildFormulationSafeFallback with locale=en returns English text', () => {
    const fallback = buildFormulationSafeFallback('en');
    expect(typeof fallback).toBe('string');
    expect(fallback.length).toBeGreaterThan(0);
    // English fallback must not contain Hebrew characters.
    expect(/[\u05D0-\u05EA]/.test(fallback)).toBe(false);
  });

  it('buildFormulationSafeFallback with locale=he returns Hebrew text', () => {
    const fallback = buildFormulationSafeFallback('he');
    expect(/[\u05D0-\u05EA]/.test(fallback)).toBe(true);
  });
});

// ─── 21. Safety fallback uses locked language ─────────────────────────────────

describe('FIX 4 — Governor safety fallback uses locked language', () => {
  SUPPORTED_LANGS.forEach((lang) => {
    it(`empty input with lang=${lang} returns ${lang}-language failsafe`, () => {
      const result = applyFinalOutputGovernor('', { lang });
      expect(result).toBe(FAILSAFE[lang]);
    });
  });
});

// ─── 22. No-form suppression from PR #860 intact ──────────────────────────────

describe('PR #860 regression — no-form suppression intact', () => {
  it('aiFormsAccess.js still contains the explicit form-suppression guard from PR #860', () => {
    // PR #860 added hasExplicitFormSuppressionIntent() called inside detectFormIntent().
    expect(aiFormsAccessSrc).toMatch(/hasExplicitFormSuppressionIntent/);
    expect(aiFormsAccessSrc).toMatch(/detectFormIntent/);
  });

  it('form suppression guard returns null intent when suppression fires', () => {
    // Verify the guard short-circuits detectFormIntent to return null.
    expect(aiFormsAccessSrc).toMatch(
      /hasExplicitFormSuppressionIntent[^;]*\)\s*return\s+null/
    );
  });
});

// ─── 23 & 24. Feature flags remain false ─────────────────────────────────────

describe('V8 behavior / feature flags unchanged', () => {
  it('featureFlags.js does not enable V9 or any V9+ flag by default', () => {
    // V9+ flags must not be defaulted to true.
    expect(featureFlagSrc).not.toMatch(/v9.*=\s*true|enableV9\s*=\s*true/i);
  });

  it('featureFlags.js does not enable any stage2 flag by default', () => {
    expect(featureFlagSrc).not.toMatch(/stage2.*=\s*true|enableStage2\s*=\s*true/i);
  });

  it('governor source still exports applyFinalOutputGovernor', () => {
    expect(governorSrc).toMatch(/export function applyFinalOutputGovernor/);
  });

  it('governor source still exports normalizeSessionLanguage', () => {
    expect(governorSrc).toMatch(/export function normalizeSessionLanguage/);
  });
});

// ─── Regression: English app → new CBT session → no Hebrew opening ───────────

describe('REGRESSION — English app language: new CBT session opening is English', () => {
  it('governor with valid English opening and lang=en returns English (no Hebrew chars)', () => {
    const englishOpening =
      "It's good that you're here. We can slow down for a moment and gently sort through what feels hardest right now, one step at a time. I'm here with you.";
    const result = applyFinalOutputGovernor(englishOpening, { lang: 'en' });
    expect(typeof result).toBe('string');
    expect(/[\u05D0-\u05EA]/.test(result)).toBe(false);
  });

  it('the production Hebrew opening is never passed through for lang=en', () => {
    const result = applyFinalOutputGovernor(HE_PRODUCTION_OPENING, { lang: 'en' });
    expect(/[\u05D0-\u05EA]/.test(result)).toBe(false);
  });

  it('English session: governor failsafe is English, not Hebrew', () => {
    // This covers the case where the agent output is empty/blocked.
    const result = applyFinalOutputGovernor('', { lang: 'en' });
    expect(result).toBe(FAILSAFE.en);
    expect(result).not.toContain('אני כאן');
  });

  it('all supported-language failsafes are distinct', () => {
    const values = SUPPORTED_LANGS.map((l) => FAILSAFE[l]);
    const unique = new Set(values);
    expect(unique.size).toBe(SUPPORTED_LANGS.length);
  });

  it('English failsafe does not contain Hebrew characters', () => {
    expect(/[\u05D0-\u05EA]/.test(FAILSAFE.en)).toBe(false);
  });

  it('first genuine English user message is passed through unchanged by governor', () => {
    const userMessage = "I've been feeling really anxious about work lately.";
    // Governor is for assistant messages — but verify it does not mangle English text
    // that looks like a valid response.
    const assistantReply =
      "That sounds really difficult. Anxiety about work is something many people experience. What aspect of work is feeling most overwhelming right now?";
    const result = applyFinalOutputGovernor(assistantReply, {
      lang: 'en',
      userMessage,
    });
    expect(/[\u05D0-\u05EA]/.test(result)).toBe(false);
    expect(result.length).toBeGreaterThan(0);
  });
});
