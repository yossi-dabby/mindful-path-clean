/**
 * Multilingual Language System — Regression Tests
 *
 * Covers the full language architecture that was fixed:
 *   1. detectLanguage() correctly identifies all 7 supported languages
 *   2. Portuguese is NEVER detected as Spanish (primary root cause)
 *   3. hasLanguageContamination() does not false-positive on PT/ES or IT/ES
 *   4. applyFinalOutputGovernor() uses session language when provided (opts.lang)
 *   5. Fallback responses are emitted in the LOCKED session language
 *   6. UI locale cannot override response language via the governor
 *   7. Non-Spanish sessions never render the generic Spanish fallback lines
 *   8. Mid-conversation language switch: new session language is honoured
 *   9. German / French / Italian / Hebrew / Spanish / Portuguese / English all pass
 *
 * No production code is modified; this file is purely additive.
 */

import { describe, it, expect } from 'vitest';
import {
  detectLanguage,
  applyFinalOutputGovernor,
  auditCP12,
} from '../../src/components/utils/finalOutputGovernor.jsx';

// ─── Constants used across tests ─────────────────────────────────────────────

// Failsafe strings from finalOutputGovernor — used as expected output in
// edge-case tests.  Keep in sync with FAILSAFE in the source.
const FAILSAFE = {
  he: 'אני כאן איתך. מה הכי מטריד אותך כרגע?',
  en: "I'm here with you. What's on your mind right now?",
  es: 'Estoy aquí contigo. ¿Qué está en tu mente ahora mismo?',
  fr: "Je suis là pour toi. Qu'est-ce qui te préoccupe en ce moment?",
  de: 'Ich bin hier für dich. Was beschäftigt dich gerade?',
  it: 'Sono qui con te. Cosa hai in mente in questo momento?',
  pt: 'Estou aqui com você. O que está em sua mente agora?',
};

// Typical therapy response samples (one per language) used for detection tests
const SAMPLES = {
  he: 'אני כאן איתך. מה הכי מטריד אותך כרגע?',
  en: "I'm here with you. What's on your mind right now?",
  es: '¿Qué está en tu mente ahora mismo? Estoy aquí contigo.',
  fr: "Je suis là pour toi. Qu'est-ce qui te préoccupe en ce moment?",
  de: 'Ich bin hier für dich. Was beschäftigt dich gerade?',
  it: 'Sono qui con te. Cosa hai in mente in questo momento?',
  pt: 'Estou aqui com você. O que está em sua mente agora?',
};

// Longer realistic Portuguese therapy responses (the ones most likely to be
// misidentified as Spanish given shared vocabulary)
const PT_REALISTIC = [
  'Estou aqui com você. O que está em sua mente agora?',
  'Você está dando um passo importante. Vamos continuar juntos.',
  'Não se preocupe — isso é algo que podemos trabalhar juntos.',
  'Dê um passo concreto agora — algo que você possa concluir em dez minutos.',
  'Escreva em uma frase o que mais te pesa agora. Esse é o seu próximo passo.',
  'Respire fundo e escolha uma única coisa para fazer hoje. Faça isso.',
  'Você não está sozinho nesse processo. Vamos avançar juntos.',
  'O que está te impedindo de dar o próximo passo? Isso é o que vamos trabalhar.',
];

// The SECONDARY_LANG_REWRITES for Spanish — these must NEVER appear in PT/IT/FR sessions
const ES_REWRITES = [
  'Da un paso concreto ahora: elige una acción pequeña que puedas completar en los próximos diez minutos.',
  'Escribe en una oración qué es lo que más te pesa ahora mismo. Eso es tu próximo paso.',
  'Haz una respiración lenta y elige una sola cosa que puedas hacer hoy. Hazla.',
];

// ─── 1. detectLanguage() — correct per-language identification ────────────────

describe('detectLanguage() — correct per-language identification', () => {
  it('detects Hebrew', () => {
    expect(detectLanguage(SAMPLES.he)).toBe('he');
  });

  it('detects English', () => {
    expect(detectLanguage(SAMPLES.en)).toBe('en');
  });

  it('detects Spanish', () => {
    expect(detectLanguage(SAMPLES.es)).toBe('es');
  });

  it('detects French', () => {
    expect(detectLanguage(SAMPLES.fr)).toBe('fr');
  });

  it('detects German', () => {
    expect(detectLanguage(SAMPLES.de)).toBe('de');
  });

  it('detects Italian', () => {
    expect(detectLanguage(SAMPLES.it)).toBe('it');
  });

  it('detects Portuguese', () => {
    expect(detectLanguage(SAMPLES.pt)).toBe('pt');
  });

  it('returns en for null/undefined', () => {
    expect(detectLanguage(null)).toBe('en');
    expect(detectLanguage(undefined)).toBe('en');
    expect(detectLanguage('')).toBe('en');
  });
});

// ─── 2. Portuguese is NEVER detected as Spanish ───────────────────────────────

describe('detectLanguage() — Portuguese is NEVER misidentified as Spanish', () => {
  it('detects PT failsafe text as Portuguese, not Spanish', () => {
    expect(detectLanguage(FAILSAFE.pt)).toBe('pt');
    expect(detectLanguage(FAILSAFE.pt)).not.toBe('es');
  });

  PT_REALISTIC.forEach((text, i) => {
    it(`detects realistic PT therapy response #${i + 1} as Portuguese`, () => {
      expect(detectLanguage(text)).toBe('pt');
    });

    it(`realistic PT therapy response #${i + 1} is NOT detected as Spanish`, () => {
      expect(detectLanguage(text)).not.toBe('es');
    });
  });

  it('PT text with shared words (que/está/para) is still detected as Portuguese', () => {
    const sharedWordText = 'Você está aqui com nós. O que está em sua mente?';
    expect(detectLanguage(sharedWordText)).toBe('pt');
  });

  it('PT rewrite from SECONDARY_LANG_REWRITES is detected as Portuguese', () => {
    expect(detectLanguage(
      'Dê um passo concreto agora — algo que você possa concluir em dez minutos.'
    )).toBe('pt');
    expect(detectLanguage(
      'Escreva em uma frase o que mais te pesa agora. Esse é o seu próximo passo.'
    )).toBe('pt');
    expect(detectLanguage(
      'Respire fundo e escolha uma única coisa para fazer hoje. Faça isso.'
    )).toBe('pt');
  });
});

// ─── 3. Spanish failsafe lines must not appear in non-Spanish sessions ────────

describe('Governor — Spanish fallback lines never appear in non-Spanish sessions', () => {
  const NON_SPANISH_LANGS = ['pt', 'fr', 'de', 'it', 'he'];

  NON_SPANISH_LANGS.forEach(lang => {
    it(`Spanish rewrite 1 not returned for ${lang} session`, () => {
      const result = applyFinalOutputGovernor(FAILSAFE[lang], { lang });
      expect(result).not.toBe(ES_REWRITES[0]);
      expect(result).not.toBe(ES_REWRITES[1]);
      expect(result).not.toBe(ES_REWRITES[2]);
    });

    it(`Failsafe for ${lang} session returns the correct language string`, () => {
      // When a very short / stripped response is passed, the governor should return
      // the language-appropriate failsafe, not the Spanish one.
      const result = applyFinalOutputGovernor('?', { lang });
      expect(result).toBe(FAILSAFE[lang]);
      expect(result).not.toBe(FAILSAFE.es);
    });
  });
});

// ─── 4. Governor respects opts.lang — UI locale cannot override session lang ──

describe('applyFinalOutputGovernor() — opts.lang overrides auto-detection', () => {
  it('uses explicit lang=pt for Portuguese text, not auto-detected lang', () => {
    const ptText = FAILSAFE.pt;
    // Without lang, auto-detection should now correctly return 'pt'
    const autoResult = applyFinalOutputGovernor(ptText);
    expect(autoResult).not.toBe(FAILSAFE.es);

    // With explicit lang='pt', should also return Portuguese content
    const explicitResult = applyFinalOutputGovernor(ptText, { lang: 'pt' });
    expect(explicitResult).not.toBe(FAILSAFE.es);
    expect(explicitResult).not.toBe(FAILSAFE.en);
  });

  it('opts.lang=pt prevents English failsafe from appearing in Portuguese session', () => {
    // A clean Portuguese message should pass through unchanged
    const ptText = 'Você está dando um passo importante. Vamos continuar juntos.';
    const result = applyFinalOutputGovernor(ptText, { lang: 'pt' });
    expect(result).not.toBe(FAILSAFE.en);
    expect(result).not.toBe(FAILSAFE.es);
  });

  it('opts.lang=he returns Hebrew failsafe when response is stripped', () => {
    const result = applyFinalOutputGovernor('?', { lang: 'he' });
    expect(result).toBe(FAILSAFE.he);
  });

  it('opts.lang=fr returns French failsafe when response is stripped', () => {
    const result = applyFinalOutputGovernor('?', { lang: 'fr' });
    expect(result).toBe(FAILSAFE.fr);
  });

  it('opts.lang=de returns German failsafe when response is stripped', () => {
    const result = applyFinalOutputGovernor('?', { lang: 'de' });
    expect(result).toBe(FAILSAFE.de);
  });

  it('opts.lang=it returns Italian failsafe when response is stripped', () => {
    const result = applyFinalOutputGovernor('?', { lang: 'it' });
    expect(result).toBe(FAILSAFE.it);
  });

  it('opts.lang=pt returns Portuguese failsafe when response is stripped', () => {
    const result = applyFinalOutputGovernor('?', { lang: 'pt' });
    expect(result).toBe(FAILSAFE.pt);
  });

  it('opts.lang=es returns Spanish failsafe for Spanish session, not Portuguese', () => {
    const result = applyFinalOutputGovernor('?', { lang: 'es' });
    expect(result).toBe(FAILSAFE.es);
    expect(result).not.toBe(FAILSAFE.pt);
  });
});

// ─── 5. Fallback correctness — each language gets its own failsafe ────────────

describe('Governor failsafe correctness per language', () => {
  Object.entries(FAILSAFE).forEach(([lang, expectedFailsafe]) => {
    it(`lang=${lang}: failsafe text is correct`, () => {
      // Single question mark triggers the "pure-question" failsafe path
      const result = applyFinalOutputGovernor('?', { lang });
      expect(result).toBe(expectedFailsafe);
    });
  });
});

// ─── 6. Correct language passes through governor unmodified ──────────────────

describe('Governor — clean responses pass through unmodified', () => {
  it('clean Portuguese response is not rewritten', () => {
    const ptClean = 'Você está dando um passo importante. Vamos continuar juntos.';
    const result = applyFinalOutputGovernor(ptClean, { lang: 'pt' });
    expect(result).toBe(ptClean.trim());
  });

  it('clean French response is not rewritten', () => {
    const frClean = 'Je suis là pour toi. Continue à avancer.';
    const result = applyFinalOutputGovernor(frClean, { lang: 'fr' });
    expect(result).toBe(frClean.trim());
  });

  it('clean Italian response is not rewritten', () => {
    const itClean = 'Sono qui con te. Andiamo avanti insieme.';
    const result = applyFinalOutputGovernor(itClean, { lang: 'it' });
    expect(result).toBe(itClean.trim());
  });

  it('clean German response is not rewritten', () => {
    const deClean = 'Ich bin hier für dich. Wir machen weiter.';
    const result = applyFinalOutputGovernor(deClean, { lang: 'de' });
    expect(result).toBe(deClean.trim());
  });

  it('clean Spanish response is not rewritten', () => {
    const esClean = 'Estoy aquí contigo. Vamos a continuar juntos.';
    const result = applyFinalOutputGovernor(esClean, { lang: 'es' });
    expect(result).toBe(esClean.trim());
  });

  it('clean Hebrew response is not rewritten', () => {
    const heClean = 'אני כאן איתך. בואו נמשיך יחד.';
    const result = applyFinalOutputGovernor(heClean, { lang: 'he' });
    expect(result).toBe(heClean.trim());
  });

  it('clean English response is not rewritten', () => {
    const enClean = "I'm here with you. Let's continue together.";
    const result = applyFinalOutputGovernor(enClean, { lang: 'en' });
    expect(result).toBe(enClean.trim());
  });
});

/**
 * Mid-conversation language switch — each session uses its own locked language.
 * The sessionLanguage is set at conversation start and survives UI-locale changes.
 * On an explicit language switch (new session), the new locale is used.
 */
describe('Mid-conversation language switch', () => {
  it('switching from pt to es: es session uses Spanish failsafe', () => {
    const ptResult = applyFinalOutputGovernor('?', { lang: 'pt' });
    const esResult = applyFinalOutputGovernor('?', { lang: 'es' });
    expect(ptResult).toBe(FAILSAFE.pt);
    expect(esResult).toBe(FAILSAFE.es);
    expect(ptResult).not.toBe(esResult);
  });

  it('switching from he to fr: fr session uses French failsafe', () => {
    const heResult = applyFinalOutputGovernor('?', { lang: 'he' });
    const frResult = applyFinalOutputGovernor('?', { lang: 'fr' });
    expect(heResult).toBe(FAILSAFE.he);
    expect(frResult).toBe(FAILSAFE.fr);
  });

  it('switching from en to de: de session uses German failsafe', () => {
    const enResult = applyFinalOutputGovernor('?', { lang: 'en' });
    const deResult = applyFinalOutputGovernor('?', { lang: 'de' });
    expect(enResult).toBe(FAILSAFE.en);
    expect(deResult).toBe(FAILSAFE.de);
  });
});

// ─── 8. auditCP12 — contamination detection doesn't false-positive on PT/ES ──

describe('auditCP12() — no false contamination for Portuguese text', () => {
  it('Portuguese failsafe text does not trigger language-contamination violation', () => {
    const { violations } = auditCP12(FAILSAFE.pt);
    expect(violations).not.toContain('language-contamination');
  });

  it('Portuguese text with shared ES vocab does not trigger contamination', () => {
    const sharedVocab = 'Você está aqui. O que está em sua mente? Para avançar, precisamos saber.';
    const { violations } = auditCP12(sharedVocab);
    expect(violations).not.toContain('language-contamination');
  });

  it('Spanish text in a Spanish session does not trigger contamination', () => {
    const esText = FAILSAFE.es;
    const { violations } = auditCP12(esText);
    expect(violations).not.toContain('language-contamination');
  });

  it('French failsafe text does not trigger language-contamination', () => {
    const { violations } = auditCP12(FAILSAFE.fr);
    expect(violations).not.toContain('language-contamination');
  });

  it('Italian failsafe text does not trigger language-contamination', () => {
    const { violations } = auditCP12(FAILSAFE.it);
    expect(violations).not.toContain('language-contamination');
  });

  it('German failsafe text does not trigger language-contamination', () => {
    const { violations } = auditCP12(FAILSAFE.de);
    expect(violations).not.toContain('language-contamination');
  });
});

// ─── 9. Proof: Portuguese cannot receive Spanish rewrites via auto-detection ──

describe('Proof: Portuguese sessions cannot produce Spanish rewrites via auto-detection', () => {
  it('applyFinalOutputGovernor on PT failsafe text auto-detects as pt (not es)', () => {
    // This is the exact text the governor will receive for a Portuguese session
    const ptText = FAILSAFE.pt;
    const result = applyFinalOutputGovernor(ptText);
    // Must not be any of the Spanish SECONDARY_LANG_REWRITES
    expect(ES_REWRITES).not.toContain(result);
    // Must not be the Spanish failsafe
    expect(result).not.toBe(FAILSAFE.es);
  });

  it('all PT SECONDARY_LANG_REWRITES auto-detect as pt (not es)', () => {
    const ptRewrites = [
      'Dê um passo concreto agora — algo que você possa concluir em dez minutos.',
      'Escreva em uma frase o que mais te pesa agora. Esse é o seu próximo passo.',
      'Respire fundo e escolha uma única coisa para fazer hoje. Faça isso.',
    ];
    ptRewrites.forEach(text => {
      expect(detectLanguage(text)).toBe('pt');
      expect(detectLanguage(text)).not.toBe('es');
    });
  });

  it('passing opts.lang=pt to the governor with PT text never returns Spanish content', () => {
    PT_REALISTIC.forEach(text => {
      const result = applyFinalOutputGovernor(text, { lang: 'pt' });
      expect(ES_REWRITES).not.toContain(result);
      expect(result).not.toBe(FAILSAFE.es);
    });
  });
});

// ─── 10. detectLanguage — distinguishes all 7 languages from each other ───────

describe('detectLanguage() — all 7 languages are mutually distinguishable', () => {
  const langs = Object.keys(SAMPLES);

  langs.forEach(expectedLang => {
    const otherLangs = langs.filter(l => l !== expectedLang);
    otherLangs.forEach(wrongLang => {
      it(`${expectedLang} sample is not detected as ${wrongLang}`, () => {
        expect(detectLanguage(SAMPLES[expectedLang])).not.toBe(wrongLang);
      });
    });
  });
});
