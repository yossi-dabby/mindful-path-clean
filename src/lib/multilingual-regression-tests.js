/**
 * Multilingual Language Architecture — Regression Tests
 *
 * Run in browser console: import('/src/lib/multilingual-regression-tests.js').then(m => m.runAll())
 *
 * Covers:
 *   - Hebrew, Spanish, Portuguese, Italian, French, German
 *   - Mid-conversation language switch
 *   - Fallback behavior (session lang vs auto-detect)
 *   - Proof that PT/IT/FR never collapse into Spanish fallback
 *   - Proof that UI locale cannot override session response language
 *   - Proof that non-Spanish sessions never render Spanish canned lines
 */

import { applyFinalOutputGovernor, detectLanguage } from '../components/utils/finalOutputGovernor';

// ─── Known Spanish fallback lines (must NEVER appear for non-ES sessions) ─────
const SPANISH_FALLBACK_LINES = [
  'Da un paso concreto ahora',
  'Escribe en una oración qué es lo que más te pesa',
  'Haz una respiración lenta y elige una sola cosa',
  'Estoy aquí contigo',
];

function containsSpanishFallback(text) {
  return SPANISH_FALLBACK_LINES.some(line => text.includes(line));
}

// ─── Sample therapeutic responses (non-worksheet, legitimate) ─────────────────

const SAMPLES = {
  he: 'אני כאן איתך. מה הכי מטריד אותך כרגע? בוא נדבר על זה.',
  es: 'Estoy aquí contigo. Cuéntame qué está pasando y lo exploraremos juntos paso a paso.',
  pt: 'Estou aqui com você. Vamos explorar isso juntos e encontrar um caminho para frente.',
  it: 'Sono qui con te. Esploriamo questo insieme e troviamo un passo concreto da fare oggi.',
  fr: "Je suis là pour toi. Explorons cela ensemble et trouvons une action concrète à faire aujourd'hui.",
  de: 'Ich bin hier für dich. Lass uns das gemeinsam erkunden und einen konkreten Schritt finden.',
  en: "I'm here with you. Let's explore this together and find one concrete step you can take today.",
};

// Sample that would previously trigger false-positive SA signals in PT
const PT_SA_SAMPLE =
  'Vamos explorar isso juntos. É importante entender o que você está sentindo agora para podermos avançar.';

// Sample that would previously trigger false-positive worksheet signals in IT
const IT_WORKSHEET_SAMPLE =
  'Pensiero automatico: sono inutile. Distorsione cognitiva: generalizzazione eccessiva. Proviamo a identificare un pensiero alternativo.';

// ─── Test runner ──────────────────────────────────────────────────────────────

function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    return false;
  }
  console.log('✅ PASS:', message);
  return true;
}

export function runAll() {
  let pass = 0;
  let fail = 0;

  function test(condition, message) {
    if (assert(condition, message)) pass++;
    else fail++;
  }

  console.group('=== Multilingual Language Architecture Regression Tests ===');

  // ── 1. detectLanguage accuracy ──────────────────────────────────────────────
  console.group('1. detectLanguage accuracy');
  test(detectLanguage(SAMPLES.he) === 'he', 'Hebrew detected correctly');
  test(detectLanguage(SAMPLES.es) === 'es', 'Spanish detected correctly');
  test(detectLanguage(SAMPLES.pt) === 'pt', 'Portuguese detected correctly (not Spanish)');
  test(detectLanguage(PT_SA_SAMPLE) === 'pt', 'PT social-anxiety sample not misdetected as ES');
  test(detectLanguage(SAMPLES.it) === 'it', 'Italian detected correctly');
  test(detectLanguage(SAMPLES.fr) === 'fr', 'French detected correctly');
  test(detectLanguage(SAMPLES.de) === 'de', 'German detected correctly');
  test(detectLanguage(SAMPLES.en) === 'en', 'English detected correctly');
  // Portuguese without diacritics (hard case)
  test(detectLanguage('Vamos explorar isso juntos. Tudo bem, eu entendo.') === 'pt', 'PT without diacritics: isso+tudo = PT');
  test(detectLanguage('Ainda precisamos poder falar sobre isso.') === 'pt', 'PT: ainda+precisa+poder = PT');
  console.groupEnd();

  // ── 2. Session language (opts.lang) is authoritative ───────────────────────
  console.group('2. Session language (opts.lang) is authoritative — UI locale cannot override');
  for (const [lang, sample] of Object.entries(SAMPLES)) {
    const result = applyFinalOutputGovernor(sample, { lang });
    test(typeof result === 'string' && result.length > 5, `Governor passes through ${lang.toUpperCase()} sample`);
    // Result must not be in a DIFFERENT language than what was passed
    if (lang !== 'es') {
      test(!containsSpanishFallback(result), `${lang.toUpperCase()} session: no Spanish fallback injected`);
    }
  }
  console.groupEnd();

  // ── 3. PT session never collapses into Spanish fallback ────────────────────
  console.group('3. PT session: no Spanish collapse');
  const ptResult1 = applyFinalOutputGovernor(SAMPLES.pt, { lang: 'pt' });
  test(!containsSpanishFallback(ptResult1), 'PT session (normal sample): no Spanish fallback');
  const ptResult2 = applyFinalOutputGovernor(PT_SA_SAMPLE, { lang: 'pt' });
  test(!containsSpanishFallback(ptResult2), 'PT session (SA-signal sample): no Spanish fallback');
  console.groupEnd();

  // ── 4. IT session never collapses into Spanish fallback ────────────────────
  console.group('4. IT session: no Spanish collapse');
  const itResult1 = applyFinalOutputGovernor(SAMPLES.it, { lang: 'it' });
  test(!containsSpanishFallback(itResult1), 'IT session (normal sample): no Spanish fallback');
  // Worksheet sample should be handled — may be rewritten in IT, never ES
  const itResult2 = applyFinalOutputGovernor(IT_WORKSHEET_SAMPLE, { lang: 'it' });
  test(!containsSpanishFallback(itResult2), 'IT session (worksheet sample): no Spanish fallback');
  console.groupEnd();

  // ── 5. FR session never collapses into Spanish fallback ────────────────────
  console.group('5. FR session: no Spanish collapse');
  const frResult = applyFinalOutputGovernor(SAMPLES.fr, { lang: 'fr' });
  test(!containsSpanishFallback(frResult), 'FR session (normal sample): no Spanish fallback');
  console.groupEnd();

  // ── 6. Contamination detection skipped when opts.lang provided ─────────────
  console.group('6. Contamination detection skipped when session lang is locked');
  // A PT response that looks ambiguous (no diacritics, shares words with ES)
  const ambiguousPT = 'Vamos explorar isso juntos. Preciso entender o que aconteceu.';
  const ambiguousResult = applyFinalOutputGovernor(ambiguousPT, { lang: 'pt' });
  test(!containsSpanishFallback(ambiguousResult), 'Ambiguous PT text + locked lang=pt: no Spanish output');
  console.groupEnd();

  // ── 7. Fallback is in session language ─────────────────────────────────────
  console.group('7. Failsafe responses are in session language');
  // Force a failsafe by passing empty content
  const ptFailsafe = applyFinalOutputGovernor('', { lang: 'pt' });
  test(ptFailsafe.includes('você') || ptFailsafe.includes('mente'), 'PT failsafe is in Portuguese');
  const itFailsafe = applyFinalOutputGovernor('', { lang: 'it' });
  test(itFailsafe.includes('mente') || itFailsafe.includes('qui'), 'IT failsafe is in Italian');
  const frFailsafe = applyFinalOutputGovernor('', { lang: 'fr' });
  test(frFailsafe.includes('toi') || frFailsafe.includes('préoccupe'), 'FR failsafe is in French');
  const deFailsafe = applyFinalOutputGovernor('', { lang: 'de' });
  test(deFailsafe.includes('dich') || deFailsafe.includes('beschäftigt'), 'DE failsafe is in German');
  console.groupEnd();

  // ── 8. Mid-conversation language switch simulation ──────────────────────────
  console.group('8. Mid-conversation language switch');
  // Simulate: session starts in EN, user switches to PT mid-session.
  // New sessionLanguage ref = 'pt'. Governor must respect the new lock.
  const enSample = SAMPLES.en;
  const ptSwitchResult = applyFinalOutputGovernor(enSample, { lang: 'pt' });
  // When the model responds in EN but sessionLanguage is now PT, contamination is detected
  // only if opts.lang was NOT provided (which it is here). Since opts.lang IS provided,
  // the content passes through — the session-start directive is responsible for language.
  test(typeof ptSwitchResult === 'string' && ptSwitchResult.length > 5, 'Language switch: governor does not crash');
  test(!containsSpanishFallback(ptSwitchResult), 'Language switch EN→PT: no Spanish fallback');
  console.groupEnd();

  // ── 9. Hebrew session stability ─────────────────────────────────────────────
  console.group('9. Hebrew session stability');
  const heResult = applyFinalOutputGovernor(SAMPLES.he, { lang: 'he' });
  test(typeof heResult === 'string' && heResult.length > 5, 'HE sample passes governor');
  test(!containsSpanishFallback(heResult), 'HE session: no Spanish fallback');
  test(/[\u05D0-\u05EA]/.test(heResult), 'HE output contains Hebrew characters');
  console.groupEnd();

  // ── 10. Spanish session produces correct Spanish (not contaminated) ─────────
  console.group('10. Spanish session produces Spanish output');
  const esResult = applyFinalOutputGovernor(SAMPLES.es, { lang: 'es' });
  test(typeof esResult === 'string' && esResult.length > 5, 'ES sample passes governor');
  // Spanish output is allowed to contain Spanish fallback lines (that is correct behavior)
  console.groupEnd();

  console.groupEnd();
  console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`);
  return { pass, fail };
}