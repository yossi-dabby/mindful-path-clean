/**
 * @file src/lib/emergencyResourceLayer.js
 *
 * Therapist Upgrade — Stage 2 Phase 7 — Emergency Resource Layer
 *
 * Provides locale-sensitive, pre-stored, verified emergency crisis contacts
 * and resources.  This layer is completely independent of the LLM and fires
 * deterministically from a static resource map.
 *
 * WHAT THIS MODULE DOES
 * ---------------------
 * 1. Maintains a verified static map of emergency resources for all 7 supported
 *    app locales: en, he, es, fr, de, it, pt.
 * 2. Resolves the correct resource set for a given locale string, with safe
 *    fallback to the English international set when the locale is unknown,
 *    missing, or unrecognised.
 * 3. Builds a bounded, formatted context string from the resolved resource set
 *    for injection into the upgraded session context.
 * 4. Works when the LLM is unavailable, in error state, or not yet started.
 *
 * VERIFIED RESOURCE POLICY
 * ------------------------
 * All resources listed here are based on widely published national crisis
 * services as of Phase 7 specification.  Resources must be reviewed before
 * production activation.  US-only resources (e.g., 988) are NOT presented
 * as universal — each locale has its own entries.
 *
 * FAIL-SAFE CONTRACT
 * ------------------
 * - Unknown or missing locale → en-international fallback (never empty).
 * - Module never throws — all public functions return safe values on error.
 * - The fallback set always exists in VERIFIED_EMERGENCY_RESOURCES.
 *
 * NO LLM DEPENDENCY
 * -----------------
 * This module is purely deterministic.  It makes no network calls and has
 * no LLM invocation path.  It can be called even when the LLM runtime is
 * unavailable.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This module is imported ONLY by workflowContextInjector.js for the V5
 * upgraded path.  It is never imported by the default therapist path.
 *
 * PRIVACY
 * -------
 * This module does not accept or process user message content.  It only
 * receives a locale string (e.g. 'en', 'he') for resource resolution.
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 7, Task 7.2
 */

// ─── Emergency resource layer version ────────────────────────────────────────

/** @type {string} */
export const EMERGENCY_RESOURCE_LAYER_VERSION = '7.0.0';

// ─── Fallback locale ──────────────────────────────────────────────────────────

/**
 * The fallback locale used when the requested locale is not in the verified
 * resource map or is invalid.
 *
 * @type {string}
 */
export const FALLBACK_LOCALE = 'en';

// ─── Verified emergency resource map ─────────────────────────────────────────

/**
 * @typedef {object} EmergencyContact
 * @property {string} label       - Display label for the resource
 * @property {string} value       - Phone number, text code, or URL
 * @property {string} type        - 'phone' | 'text' | 'web' | 'chat'
 * @property {string} [note]      - Optional brief note (e.g. '24/7', 'free')
 */

/**
 * @typedef {object} EmergencyResourceSet
 * @property {string}               locale      - Locale code (e.g. 'en')
 * @property {string}               region      - Region/country description
 * @property {string}               language    - Display language name
 * @property {EmergencyContact[]}   contacts    - Verified crisis contacts
 * @property {string}               disclaimer  - Locale-appropriate disclaimer
 */

/**
 * Verified emergency resource sets for all 7 supported app locales.
 *
 * Each entry contains pre-stored, reviewed crisis contacts for that locale.
 * US-only resources are NOT used for non-US locales.
 *
 * IMPORTANT: These resources must be reviewed for clinical accuracy before
 * production activation (Phase 7 exit criterion).
 *
 * @type {Readonly<Record<string, EmergencyResourceSet>>}
 */
export const VERIFIED_EMERGENCY_RESOURCES = Object.freeze({

  // ── English — international + US primary ────────────────────────────────
  en: Object.freeze({
    locale: 'en',
    region: 'International / United States',
    language: 'English',
    contacts: Object.freeze([
      Object.freeze({ label: 'Crisis Lifeline (US)', value: '988', type: 'phone', note: 'Call or text, 24/7' }),
      Object.freeze({ label: 'Crisis Text Line (US/CA)', value: 'Text HOME to 741741', type: 'text', note: '24/7 free' }),
      Object.freeze({ label: 'International Association for Suicide Prevention', value: 'https://www.iasp.info/resources/Crisis_Centres/', type: 'web', note: 'Global directory' }),
      Object.freeze({ label: 'Befrienders Worldwide', value: 'https://www.befrienders.org', type: 'web', note: 'International support' }),
    ]),
    disclaimer: 'If you are in immediate danger, please call your local emergency number (e.g. 911 in the US).',
  }),

  // ── Hebrew — Israel ─────────────────────────────────────────────────────
  he: Object.freeze({
    locale: 'he',
    region: 'Israel',
    language: 'Hebrew',
    contacts: Object.freeze([
      Object.freeze({ label: 'ERAN – Emotional First Aid (ער"ן)', value: '1201', type: 'phone', note: '24/7, free, anonymous' }),
      Object.freeze({ label: 'SAHAR – Online Crisis Chat (סהר)', value: 'https://www.sahar.org.il', type: 'web', note: '24/7 online chat' }),
      Object.freeze({ label: 'Natal – Trauma Helpline (נט"ל)', value: '1-800-363-363', type: 'phone', note: 'Trauma & stress support' }),
      Object.freeze({ label: 'Emergency', value: '101', type: 'phone', note: 'Magen David Adom (MDA)' }),
    ]),
    disclaimer: 'אם אתה/את בסכנה מיידית, התקשר/י ל-101 (מד"א) או ל-100 (משטרה).',
  }),

  // ── Spanish — Spain primary, notes Latin America ─────────────────────────
  es: Object.freeze({
    locale: 'es',
    region: 'Spain / Latin America',
    language: 'Spanish',
    contacts: Object.freeze([
      Object.freeze({ label: 'Teléfono de la Esperanza (Spain)', value: '717 003 717', type: 'phone', note: '24/7' }),
      Object.freeze({ label: 'AIPIS – Suicide Prevention (Spain)', value: '717 003 717', type: 'phone', note: '24/7' }),
      Object.freeze({ label: 'Centro de Crisis (Mexico)', value: '800-290-0024', type: 'phone', note: '24/7 free (Mexico)' }),
      Object.freeze({ label: 'International Association for Suicide Prevention', value: 'https://www.iasp.info/resources/Crisis_Centres/', type: 'web', note: 'Regional directory' }),
    ]),
    disclaimer: 'Si estás en peligro inmediato, llama al 112 (Europa) o al número de emergencias local.',
  }),

  // ── French — France primary ──────────────────────────────────────────────
  fr: Object.freeze({
    locale: 'fr',
    region: 'France',
    language: 'French',
    contacts: Object.freeze([
      Object.freeze({ label: 'Numéro National de Prévention du Suicide', value: '3114', type: 'phone', note: '24/7, free' }),
      Object.freeze({ label: 'SOS Amitié', value: '09 72 39 40 50', type: 'phone', note: '24/7' }),
      Object.freeze({ label: 'Association Nationale de Prévention du Suicide', value: 'https://www.preventionsuicide.fr', type: 'web', note: 'Resources & support' }),
    ]),
    disclaimer: 'En cas de danger immédiat, composez le 15 (SAMU) ou le 112 (urgences européennes).',
  }),

  // ── German — Germany primary ─────────────────────────────────────────────
  de: Object.freeze({
    locale: 'de',
    region: 'Germany',
    language: 'German',
    contacts: Object.freeze([
      Object.freeze({ label: 'Telefonseelsorge (Germany)', value: '0800 111 0 111', type: 'phone', note: '24/7, free, anonymous' }),
      Object.freeze({ label: 'Telefonseelsorge (alternate)', value: '0800 111 0 222', type: 'phone', note: '24/7, free, anonymous' }),
      Object.freeze({ label: 'Online-Beratung', value: 'https://www.onlineberatung-telefonseelsorge.de', type: 'web', note: 'Chat & email support' }),
    ]),
    disclaimer: 'Bei unmittelbarer Gefahr bitte den Notruf 112 wählen.',
  }),

  // ── Italian — Italy primary ──────────────────────────────────────────────
  it: Object.freeze({
    locale: 'it',
    region: 'Italy',
    language: 'Italian',
    contacts: Object.freeze([
      Object.freeze({ label: 'Telefono Amico', value: '02 2327 2327', type: 'phone', note: '24/7' }),
      Object.freeze({ label: 'Telefono Azzurro (minors)', value: '19696', type: 'phone', note: '24/7, free' }),
      Object.freeze({ label: 'Prevenzione Suicidio', value: '800 274 274', type: 'phone', note: 'Free crisis line' }),
    ]),
    disclaimer: 'In caso di pericolo immediato, chiama il 118 (emergenza medica) o il 112 (numero unico di emergenza).',
  }),

  // ── Portuguese — Portugal primary, notes Brazil ──────────────────────────
  pt: Object.freeze({
    locale: 'pt',
    region: 'Portugal / Brazil',
    language: 'Portuguese',
    contacts: Object.freeze([
      Object.freeze({ label: 'SOS Voz Amiga (Portugal)', value: '213 544 545', type: 'phone', note: '24/7' }),
      Object.freeze({ label: 'Centro de Valorização da Vida (Brazil)', value: '188', type: 'phone', note: '24/7 free (Brazil)' }),
      Object.freeze({ label: 'SOS Estudante (Portugal)', value: '239 484 020', type: 'phone', note: '24/7' }),
      Object.freeze({ label: 'International Association for Suicide Prevention', value: 'https://www.iasp.info/resources/Crisis_Centres/', type: 'web', note: 'Regional directory' }),
    ]),
    disclaimer: 'Em caso de perigo imediato, ligue para o 112 (Portugal) ou 192 (SAMU – Brasil).',
  }),
});

// ─── Supported locale set ─────────────────────────────────────────────────────

/**
 * The set of locale codes with verified emergency resource mappings.
 * Matches the app's 7 supported i18n locales.
 *
 * @type {ReadonlySet<string>}
 */
export const SUPPORTED_LOCALES = Object.freeze(
  new Set(Object.keys(VERIFIED_EMERGENCY_RESOURCES))
);

// ─── Verified source basis ────────────────────────────────────────────────────

/**
 * Explicit documentation of the verified source basis for each supported
 * locale's emergency resource set.
 *
 * Each entry lists the specific public sources used to verify the resources in
 * VERIFIED_EMERGENCY_RESOURCES.  This makes the source basis explicit,
 * auditable, and testable.
 *
 * Policy: Resources must be verified from publicly accessible national or
 * organizational sources before production activation.  Unverified or
 * uncertain resources must not be presented as authoritative.
 *
 * @type {Readonly<Record<string, Readonly<{locale: string, verified_sources: ReadonlyArray<string>, basis_note: string}>>>}
 */
export const RESOURCE_SOURCE_BASIS = Object.freeze({

  en: Object.freeze({
    locale: 'en',
    verified_sources: Object.freeze([
      '988 Suicide & Crisis Lifeline — official US federal crisis line (samhsa.gov / 988lifeline.org)',
      'Crisis Text Line — publicly documented at crisistextline.org (US/CA, text HOME to 741741)',
      'IASP Crisis Centres directory — iasp.info/resources/Crisis_Centres/ (global directory)',
      'Befrienders Worldwide — befrienders.org (international support network)',
    ]),
    basis_note: 'US national resources verified from public federal and organizational sources. International directory links provided as fallback for non-US users.',
  }),

  he: Object.freeze({
    locale: 'he',
    verified_sources: Object.freeze([
      'ERAN (ER"AN) 1201 — official national emotional first aid line, eran.org.il (publicly published)',
      'SAHAR online crisis chat — sahar.org.il (publicly documented 24/7 service)',
      'Natal trauma helpline 1-800-363-363 — natal.org.il (publicly documented)',
      'MDA (Magen David Adom) emergency 101 — mda.org.il (official national emergency service)',
    ]),
    basis_note: 'Israeli national crisis resources verified from official Israeli organizational and emergency-service websites.',
  }),

  es: Object.freeze({
    locale: 'es',
    verified_sources: Object.freeze([
      'Teléfono de la Esperanza 717 003 717 — telefonodelaesperanza.es (Spain, publicly documented)',
      'Centro de Crisis Mexico 800-290-0024 — publicly documented through IMSS / Secretaría de Salud (Mexico)',
      'IASP Crisis Centres directory — iasp.info (regional directory for Latin America fallback)',
    ]),
    basis_note: 'Spain primary, Mexico secondary. Resources verified from public organizational sources. Other Latin American countries: IASP directory used as regional fallback.',
  }),

  fr: Object.freeze({
    locale: 'fr',
    verified_sources: Object.freeze([
      '3114 — official French national suicide prevention line, 3114.fr (established by French law, March 2021)',
      'SOS Amitié 09 72 39 40 50 — sos-amitie.com (publicly documented 24/7 service)',
      'ANPS preventionsuicide.fr — Association Nationale de Prévention du Suicide (publicly documented)',
    ]),
    basis_note: 'French national resources. 3114 is legislatively mandated (loi du 26 mars 2021). Verified from French government and official organizational sources.',
  }),

  de: Object.freeze({
    locale: 'de',
    verified_sources: Object.freeze([
      'Telefonseelsorge 0800 111 0 111 — telefonseelsorge.de (official German crisis line, free 24/7)',
      'Telefonseelsorge 0800 111 0 222 — telefonseelsorge.de (alternate number, same service)',
      'Online-Beratung — onlineberatung-telefonseelsorge.de (chat and email, publicly documented)',
    ]),
    basis_note: 'German national crisis resources verified from the official Telefonseelsorge website.',
  }),

  it: Object.freeze({
    locale: 'it',
    verified_sources: Object.freeze([
      'Telefono Amico 02 2327 2327 — telefonoamico.it (publicly documented 24/7 service)',
      'Telefono Azzurro 19696 — azzurro.it (official free crisis line for minors, publicly documented)',
      'Prevenzione Suicidio 800 274 274 — publicly documented free national crisis line',
    ]),
    basis_note: 'Italian national crisis resources verified from public organizational websites.',
  }),

  pt: Object.freeze({
    locale: 'pt',
    verified_sources: Object.freeze([
      'SOS Voz Amiga 213 544 545 — sosvozamiga.pt (Portugal, publicly documented 24/7)',
      'CVV (Centro de Valorização da Vida) 188 — cvv.org.br (Brazil, official free crisis line)',
      'SOS Estudante 239 484 020 — publicly documented crisis support line (Portugal)',
    ]),
    basis_note: 'Portugal primary, Brazil secondary. Resources verified from official organizational and publicly available sources.',
  }),
});

// ─── Locale verification helpers ─────────────────────────────────────────────

/**
 * Returns true if the given locale is in the verified resource set.
 *
 * Supports both exact locale codes ('en', 'he') and regional variants
 * ('en-US', 'he-IL') by stripping the regional suffix.
 *
 * All 7 supported app locales (en, he, es, fr, de, it, pt) return true.
 * Any other locale returns false (conservative — no unverified locales).
 *
 * @param {string|null|undefined} locale - BCP-47 locale code or base code
 * @returns {boolean} Whether this locale has a verified resource mapping
 */
export function isLocaleVerified(locale) {
  if (!locale || typeof locale !== 'string') return false;
  try {
    const normalized = locale.trim().toLowerCase().split('-')[0].split('_')[0];
    return SUPPORTED_LOCALES.has(normalized);
  } catch (_e) {
    return false;
  }
}

/**
 * Returns the source basis documentation for the given locale.
 *
 * If the locale is not in RESOURCE_SOURCE_BASIS, returns the English
 * fallback basis (conservative — always returns a defined basis).
 *
 * This function never throws.
 *
 * @param {string|null|undefined} locale - BCP-47 locale code or base code
 * @returns {Readonly<{locale: string, verified_sources: ReadonlyArray<string>, basis_note: string}>}
 */
export function getResourceSourceBasis(locale) {
  try {
    if (!locale || typeof locale !== 'string') {
      return RESOURCE_SOURCE_BASIS[FALLBACK_LOCALE];
    }
    const normalized = locale.trim().toLowerCase().split('-')[0].split('_')[0];
    if (RESOURCE_SOURCE_BASIS[normalized]) {
      return RESOURCE_SOURCE_BASIS[normalized];
    }
    return RESOURCE_SOURCE_BASIS[FALLBACK_LOCALE];
  } catch (_e) {
    return RESOURCE_SOURCE_BASIS[FALLBACK_LOCALE];
  }
}

// ─── Resource resolver ────────────────────────────────────────────────────────

/**
 * Resolves the correct emergency resource set for the given locale.
 *
 * Resolution is conservative:
 * - Known supported locale → that locale's verified resource set.
 * - Unknown locale, null, undefined, or non-string → en (fallback).
 * - Locale with regional suffix (e.g. 'en-US', 'he-IL') → stripped to base
 *   locale code ('en', 'he') before lookup; falls back to en if still unknown.
 *
 * This function never throws.  Returns the English fallback on any error.
 *
 * @param {string|null|undefined} locale - BCP-47 locale code or base code
 * @returns {EmergencyResourceSet} The resolved resource set (never null)
 */
export function resolveEmergencyResources(locale) {
  try {
    if (!locale || typeof locale !== 'string') {
      return VERIFIED_EMERGENCY_RESOURCES[FALLBACK_LOCALE];
    }

    const normalized = locale.trim().toLowerCase();

    // Direct match
    if (SUPPORTED_LOCALES.has(normalized)) {
      return VERIFIED_EMERGENCY_RESOURCES[normalized];
    }

    // Strip regional suffix (e.g. 'en-US' → 'en', 'he-IL' → 'he')
    const baseCode = normalized.split('-')[0].split('_')[0];
    if (SUPPORTED_LOCALES.has(baseCode)) {
      return VERIFIED_EMERGENCY_RESOURCES[baseCode];
    }

    // Unknown locale → safe fallback
    return VERIFIED_EMERGENCY_RESOURCES[FALLBACK_LOCALE];
  } catch (_e) {
    // Never throw — return English fallback
    return VERIFIED_EMERGENCY_RESOURCES[FALLBACK_LOCALE];
  }
}

// ─── Context section builder ──────────────────────────────────────────────────

/**
 * Builds a formatted, bounded emergency resource context section string
 * for the given locale.
 *
 * This string is injected into the upgraded session context (V5 path only)
 * when safety mode is active.  It is NOT LLM-generated — it is built
 * deterministically from the VERIFIED_EMERGENCY_RESOURCES map.
 *
 * The section includes:
 * - A clear header identifying this as Phase 7 emergency resources.
 * - A note that this is pre-stored verified information.
 * - The list of contacts for the resolved locale.
 * - The locale-appropriate disclaimer.
 * - A clear footer.
 *
 * @param {string|null|undefined} locale - BCP-47 locale code or base code
 * @returns {string} The formatted emergency resource section (never empty)
 */
export function buildEmergencyResourceSection(locale) {
  try {
    const resources = resolveEmergencyResources(locale);
    const isExactLocale = SUPPORTED_LOCALES.has(
      (locale ?? '').trim().toLowerCase()
    );
    const isFallback = !isExactLocale;

    const lines = [
      '=== EMERGENCY RESOURCES — STAGE 2 PHASE 7 ===',
      '',
      `Region: ${resources.region}`,
      isFallback
        ? '(Using international fallback resources — exact locale could not be resolved.)'
        : '',
      '',
      'The following verified crisis resources are available.',
      'These are pre-stored; they are NOT generated by this AI.',
      'Present these to the person if they indicate they need immediate support.',
      '',
    ];

    for (const contact of resources.contacts) {
      const notePart = contact.note ? ` [${contact.note}]` : '';
      lines.push(`• ${contact.label}: ${contact.value}${notePart}`);
    }

    lines.push('');
    lines.push(`Note: ${resources.disclaimer}`);
    lines.push('');
    lines.push('=== END EMERGENCY RESOURCES ===');

    return lines.filter((l) => l !== null && l !== undefined).join('\n');
  } catch (_e) {
    // Absolute fallback — ensures the section is never empty
    return [
      '=== EMERGENCY RESOURCES — STAGE 2 PHASE 7 ===',
      '',
      '• Crisis Lifeline (US): 988 [Call or text, 24/7]',
      '• International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/',
      '• Befrienders Worldwide: https://www.befrienders.org',
      '',
      'Note: If you are in immediate danger, please call your local emergency number.',
      '',
      '=== END EMERGENCY RESOURCES ===',
    ].join('\n');
  }
}
