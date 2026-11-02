import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * @file base44/functions/emergencyResourceLayer/entry.ts
 *
 * Therapist Upgrade — Phase 7 — Emergency Resource Layer (Backend Function)
 *
 * Returns pre-stored, verified, locale-appropriate crisis contacts and
 * resources.  This function has NO LLM dependency and fires deterministically
 * from a static resource map.
 *
 * WHAT THIS FUNCTION DOES
 * -----------------------
 * 1. Accepts a locale code (e.g. 'en', 'he', 'fr') and resolves the correct
 *    pre-stored emergency resource set for that locale.
 * 2. Falls back to the English international resource set when the locale is
 *    unknown, missing, or unrecognised.
 * 3. Returns the full resource set including contact details and a
 *    locale-appropriate disclaimer.
 * 4. Works when the LLM runtime is unavailable, in error state, or unstarted.
 *
 * VERIFIED RESOURCE POLICY
 * ------------------------
 * All resources listed here are pre-stored (not LLM-generated) and are
 * based on widely published national crisis services.  Resources must be
 * reviewed before production activation.  US-only resources (e.g., 988)
 * are NOT presented as universal — each locale has its own entries.
 *
 * FAIL-SAFE CONTRACT
 * ------------------
 * - Unknown locale → English international fallback (never empty).
 * - Function never throws — always returns a valid resource set.
 *
 * ACTIVATION
 * ----------
 * Gated by both THERAPIST_UPGRADE_ENABLED and THERAPIST_UPGRADE_SAFETY_MODE_ENABLED
 * environment variables.  Returns 503 when either flag is not 'true'.
 *
 * ISOLATION
 * ---------
 * This function has no effect on the current default therapist path.
 *
 * INPUT (JSON body)
 * -----------------
 * {
 *   locale?: string,   // BCP-47 locale or base code (e.g. 'en', 'he', 'fr-FR')
 * }
 *
 * OUTPUT
 * ------
 * {
 *   success: true,
 *   locale: string,             // Resolved locale code
 *   region: string,             // Region description
 *   language: string,           // Language name
 *   contacts: EmergencyContact[],
 *   disclaimer: string,
 *   is_fallback: boolean,       // true when locale was not recognised (en fallback used)
 * }
 * { success: false, error: string, gated: true }   — flag off (HTTP 503)
 *
 * See docs/therapist-upgrade-stage2-plan.md — Phase 7, Task 7.2
 */

// ─── Verified resource map ────────────────────────────────────────────────────

interface EmergencyContact {
  label: string;
  value: string;
  type: 'phone' | 'text' | 'web' | 'chat';
  note?: string;
}

interface EmergencyResourceSet {
  locale: string;
  region: string;
  language: string;
  contacts: EmergencyContact[];
  disclaimer: string;
}

const FALLBACK_LOCALE = 'en';

const VERIFIED_EMERGENCY_RESOURCES: Record<string, EmergencyResourceSet> = {

  en: {
    locale: 'en',
    region: 'International / United States',
    language: 'English',
    contacts: [
      { label: 'Crisis Lifeline (US)', value: '988', type: 'phone', note: 'Call or text, 24/7' },
      { label: 'Crisis Text Line (US/CA)', value: 'Text HOME to 741741', type: 'text', note: '24/7 free' },
      { label: 'International Association for Suicide Prevention', value: 'https://www.iasp.info/resources/Crisis_Centres/', type: 'web', note: 'Global directory' },
      { label: 'Befrienders Worldwide', value: 'https://www.befrienders.org', type: 'web', note: 'International support' },
    ],
    disclaimer: 'If you are in immediate danger, please call your local emergency number (e.g. 911 in the US).',
  },

  he: {
    locale: 'he',
    region: 'Israel',
    language: 'Hebrew',
    contacts: [
      { label: 'ERAN – Emotional First Aid (ער"ן)', value: '1201', type: 'phone', note: '24/7, free, anonymous' },
      { label: 'SAHAR – Online Crisis Chat (סהר)', value: 'https://www.sahar.org.il', type: 'web', note: '24/7 online chat' },
      { label: 'Natal – Trauma Helpline (נט"ל)', value: '1-800-363-363', type: 'phone', note: 'Trauma & stress support' },
      { label: 'Emergency', value: '101', type: 'phone', note: 'Magen David Adom (MDA)' },
    ],
    disclaimer: 'אם אתה/את בסכנה מיידית, התקשר/י ל-101 (מד"א) או ל-100 (משטרה).',
  },

  es: {
    locale: 'es',
    region: 'Spain / Latin America',
    language: 'Spanish',
    contacts: [
      { label: 'Teléfono de la Esperanza (Spain)', value: '717 003 717', type: 'phone', note: '24/7' },
      { label: 'Centro de Crisis (Mexico)', value: '800-290-0024', type: 'phone', note: '24/7 free (Mexico)' },
      { label: 'International Association for Suicide Prevention', value: 'https://www.iasp.info/resources/Crisis_Centres/', type: 'web', note: 'Regional directory' },
    ],
    disclaimer: 'Si estás en peligro inmediato, llama al 112 (Europa) o al número de emergencias local.',
  },

  fr: {
    locale: 'fr',
    region: 'France',
    language: 'French',
    contacts: [
      { label: 'Numéro National de Prévention du Suicide', value: '3114', type: 'phone', note: '24/7, free' },
      { label: 'SOS Amitié', value: '09 72 39 40 50', type: 'phone', note: '24/7' },
      { label: 'Association Nationale de Prévention du Suicide', value: 'https://www.preventionsuicide.fr', type: 'web', note: 'Resources & support' },
    ],
    disclaimer: 'En cas de danger immédiat, composez le 15 (SAMU) ou le 112 (urgences européennes).',
  },

  de: {
    locale: 'de',
    region: 'Germany',
    language: 'German',
    contacts: [
      { label: 'Telefonseelsorge (Germany)', value: '0800 111 0 111', type: 'phone', note: '24/7, free, anonymous' },
      { label: 'Telefonseelsorge (alternate)', value: '0800 111 0 222', type: 'phone', note: '24/7, free, anonymous' },
      { label: 'Online-Beratung', value: 'https://www.onlineberatung-telefonseelsorge.de', type: 'web', note: 'Chat & email support' },
    ],
    disclaimer: 'Bei unmittelbarer Gefahr bitte den Notruf 112 wählen.',
  },

  it: {
    locale: 'it',
    region: 'Italy',
    language: 'Italian',
    contacts: [
      { label: 'Telefono Amico', value: '02 2327 2327', type: 'phone', note: '24/7' },
      { label: 'Telefono Azzurro (minors)', value: '19696', type: 'phone', note: '24/7, free' },
      { label: 'Prevenzione Suicidio', value: '800 274 274', type: 'phone', note: 'Free crisis line' },
    ],
    disclaimer: 'In caso di pericolo immediato, chiama il 118 (emergenza medica) o il 112 (numero unico di emergenza).',
  },

  pt: {
    locale: 'pt',
    region: 'Portugal / Brazil',
    language: 'Portuguese',
    contacts: [
      { label: 'SOS Voz Amiga (Portugal)', value: '213 544 545', type: 'phone', note: '24/7' },
      { label: 'Centro de Valorização da Vida (Brazil)', value: '188', type: 'phone', note: '24/7 free (Brazil)' },
      { label: 'SOS Estudante (Portugal)', value: '239 484 020', type: 'phone', note: '24/7' },
      { label: 'International Association for Suicide Prevention', value: 'https://www.iasp.info/resources/Crisis_Centres/', type: 'web', note: 'Regional directory' },
    ],
    disclaimer: 'Em caso de perigo imediato, ligue para o 112 (Portugal) ou 192 (SAMU – Brasil).',
  },
};

const SUPPORTED_LOCALES = new Set(Object.keys(VERIFIED_EMERGENCY_RESOURCES));

// ─── Resolver ─────────────────────────────────────────────────────────────────

function resolveLocale(locale: string | undefined | null): { resourceSet: EmergencyResourceSet; isFallback: boolean } {
  if (!locale || typeof locale !== 'string') {
    return { resourceSet: VERIFIED_EMERGENCY_RESOURCES[FALLBACK_LOCALE], isFallback: true };
  }

  const normalized = locale.trim().toLowerCase();

  if (SUPPORTED_LOCALES.has(normalized)) {
    return { resourceSet: VERIFIED_EMERGENCY_RESOURCES[normalized], isFallback: false };
  }

  const baseCode = normalized.split('-')[0].split('_')[0];
  if (SUPPORTED_LOCALES.has(baseCode)) {
    return { resourceSet: VERIFIED_EMERGENCY_RESOURCES[baseCode], isFallback: false };
  }

  return { resourceSet: VERIFIED_EMERGENCY_RESOURCES[FALLBACK_LOCALE], isFallback: true };
}

// ─── Request handler ─────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed.' }),
      { status: 405, headers: { 'Content-Type': 'application/json', 'Allow': 'POST' } },
    );
  }

  // Emergency contacts remain available before sign-in through the bundled
  // static resource map in src/lib/emergencyResourceLayer.js. This unused
  // backend mirror is authenticated to remove an unnecessary public endpoint.
  let user;
  try {
    const base44 = createClientFromRequest(req);
    user = await base44.auth.me();
  } catch {
    user = null;
  }

  if (!user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── Feature flag gate ────────────────────────────────────────────────────
  const masterEnabled = Deno.env.get('THERAPIST_UPGRADE_ENABLED') === 'true';
  const safetyModeEnabled = Deno.env.get('THERAPIST_UPGRADE_SAFETY_MODE_ENABLED') === 'true';

  if (!masterEnabled || !safetyModeEnabled) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Phase 7 emergency resource layer is not enabled.',
        gated: true,
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const declaredLength = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 1_024) {
    return new Response(
      JSON.stringify({ success: false, error: 'Request too large.' }),
      { status: 413, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── Parse request body ───────────────────────────────────────────────────
  let locale: string | undefined;
  try {
    const body = await req.json();
    locale = typeof body?.locale === 'string' && body.locale.length <= 35
      ? body.locale
      : undefined;
  } catch (_e) {
    // Missing or invalid body — use fallback locale
    locale = undefined;
  }

  // ── Resolve resources ─────────────────────────────────────────────────────
  try {
    const { resourceSet, isFallback } = resolveLocale(locale);

    return new Response(
      JSON.stringify({
        success: true,
        locale: resourceSet.locale,
        region: resourceSet.region,
        language: resourceSet.language,
        contacts: resourceSet.contacts,
        disclaimer: resourceSet.disclaimer,
        is_fallback: isFallback,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    // Absolute fallback — return English resources even on unexpected error
    const fallback = VERIFIED_EMERGENCY_RESOURCES[FALLBACK_LOCALE];
    return new Response(
      JSON.stringify({
        success: true,
        locale: fallback.locale,
        region: fallback.region,
        language: fallback.language,
        contacts: fallback.contacts,
        disclaimer: fallback.disclaimer,
        is_fallback: true,
        error_recovered: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
