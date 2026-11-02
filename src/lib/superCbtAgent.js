/**
 * @file src/lib/superCbtAgent.js
 *
 * SuperCbtAgent — Scaffold Module
 *
 * This module defines the wiring configuration and feature descriptor for the
 * SuperCbtAgent — an opt-in, non-breaking upgrade path intended to bring full
 * multilingual CBT coverage and advanced session orchestration to the CBT
 * Therapist agent in all 7 app languages (en, he, es, fr, de, it, pt).
 *
 * SCAFFOLD ONLY — NOT ACTIVE
 * --------------------------
 * This module exists for planning and future activation only.  It is NOT
 * referenced by src/api/activeAgentWiring.js and has zero effect on the
 * current production therapist path.  No user traffic routes here.
 *
 * This file may be imported freely in tests and utilities — it has no side
 * effects and never mutates any existing constant or wiring.
 *
 * HOW TO ACTIVATE (FUTURE — not in this PR)
 * -----------------------------------------
 * Activation requires ALL of the following steps in separate, reviewed PRs:
 *   1. Add SUPER_CBT_AGENT_ENABLED to THERAPIST_UPGRADE_FLAGS in featureFlags.js
 *      (double-gated: master gate + super agent flag, both default false).
 *   2. Add the super-agent routing branch to resolveTherapistWiring() in
 *      activeAgentWiring.js (placed last — highest priority only when enabled).
 *   3. Complete the i18n pass (all 7 languages; Task 3 of the super agent plan).
 *   4. Complete Phase 9 / regression testing for the super agent path.
 *   5. Human review and explicit approval before any flag is enabled.
 *
 * COMPOSITION APPROACH
 * --------------------
 * SUPER_CBT_AGENT_WIRING composes CBT_THERAPIST_WIRING_STAGE2_V5 (the highest
 * existing phase) by inheriting all its tool_configs and flags, then layering
 * the super_agent marker on top.  The entity access matrix is identical to V5 —
 * no new entity access is introduced at scaffold time.
 *
 * See docs/super-agent/README.md for the vision and roadmap.
 * See docs/super-agent/architecture.md for the composition approach.
 *
 * Source of truth:
 *   docs/super-agent/README.md
 *   docs/super-agent/architecture.md
 *   docs/therapist-upgrade-stage2-plan.md
 */

import { CBT_THERAPIST_WIRING_STAGE2_V5 } from '../api/agentWiring.js';

// ─── Version ──────────────────────────────────────────────────────────────────

/**
 * Semver version for the SuperCbtAgent scaffold.
 * Increment when scaffold-level structure changes.
 * @type {string}
 */
export const SUPER_CBT_AGENT_VERSION = '0.1.0';

// ─── Identity ─────────────────────────────────────────────────────────────────

/**
 * Canonical Base44 agent name.
 * Matches the existing CBT Therapist agent identity — the super agent is an
 * upgrade path for the same agent, not a separate agent.
 * @type {string}
 */
export const SUPER_CBT_AGENT_NAME = 'cbt_therapist';

/**
 * Super agent phase identifier.
 * Placed beyond all existing Stage 2 phases (1–10) to prevent collisions.
 * @type {string}
 */
export const SUPER_CBT_AGENT_PHASE = 'super.1';

// ─── Supported languages ──────────────────────────────────────────────────────

/**
 * All app languages targeted by the SuperCbtAgent multilingual capability.
 * Matches the 7 languages defined in src/components/i18n/translations.jsx.
 * @type {ReadonlyArray<string>}
 */
export const SUPER_CBT_AGENT_LANGUAGES = Object.freeze([
  'en', // English
  'he', // Hebrew
  'es', // Spanish
  'fr', // French
  'de', // German
  'it', // Italian
  'pt', // Portuguese
]);

// ─── Feature descriptor ───────────────────────────────────────────────────────

/**
 * Feature descriptor for the planned SuperCbtAgent capabilities.
 *
 * Each entry is a named capability with a status and description.
 * No capability listed here is currently active.
 *
 * Status values:
 *   'planned'   — not yet implemented; design stage only
 *   'scaffold'  — structure exists; no active code paths
 *   'inactive'  — implemented but not yet activated (behind a disabled flag)
 *
 * @type {Readonly<Record<string, Readonly<object>>>}
 */
export const SUPER_CBT_AGENT_FEATURES = Object.freeze({
  /**
   * Full multilingual CBT support in all 7 app languages.
   * All workflow instructions, emergency resources, and agent prompts will
   * be language-aware and route through the app i18n layer.
   */
  multilingual_cbt: Object.freeze({
    status: 'planned',
    description:
      'Full CBT session delivery in all 7 app languages (en, he, es, fr, de, it, pt). ' +
      'All workflow instructions, correction-pass rules, and emergency resource ' +
      'sections are language-aware. Language is resolved from user locale at ' +
      'session start and is stable for the lifetime of the session.',
    languages: SUPER_CBT_AGENT_LANGUAGES,
  }),

  /**
   * Dynamic CBT sub-protocol selection per session.
   * Protocol is derived from CaseFormulation and session context.
   */
  protocol_selection: Object.freeze({
    status: 'planned',
    description:
      'Dynamic CBT sub-protocol selection per session: standard CBT, ACT-informed, ' +
      'DBT-skills, MBSR-adjacent, or schema-focused. Protocol is selected from ' +
      'CaseFormulation and session context, never from user self-report alone. ' +
      'Defaults to standard CBT when formulation is absent or incomplete.',
  }),

  /**
   * Super-session context spanning multiple prior sessions.
   */
  cross_session_continuity: Object.freeze({
    status: 'planned',
    description:
      'Super-session context window synthesizing structured memory across ' +
      'multiple prior sessions (beyond the most recent summary) to enable ' +
      'longitudinal CBT case formulation tracking and arc-level goal alignment.',
  }),

  /**
   * Extended workflow orchestration building on Phase 3 engine.
   */
  advanced_workflow_orchestration: Object.freeze({
    status: 'planned',
    description:
      'Extends the existing Phase 3 workflow engine with protocol-specific ' +
      'response rules, session-arc tracking at the super-session level, and ' +
      'structured homework assignment integration.',
  }),
});

// ─── Wiring configuration ─────────────────────────────────────────────────────

/**
 * Wiring configuration for the SuperCbtAgent.
 *
 * Composes CBT_THERAPIST_WIRING_STAGE2_V5 (the highest existing phase) with
 * the super_agent marker.  The entity access matrix is inherited from V5 and
 * is IDENTICAL — no new entity access is introduced at scaffold time.
 *
 * INACTIVE — this config is not referenced in src/api/activeAgentWiring.js.
 * It becomes reachable only when:
 *   1. A SUPER_CBT_AGENT_ENABLED flag is added to featureFlags.js, AND
 *   2. resolveTherapistWiring() is updated to route to this config.
 * Neither step is performed in this scaffold PR.
 *
 * All super_agent_* fields are additive markers — they do not change any
 * entity access rule, retrieval bound, or safety constraint inherited from V5.
 *
 * @type {object}
 */
export const SUPER_CBT_AGENT_WIRING = {
  // ── Inherit all V5 fields (memory, workflow, retrieval, live, safety) ──────
  ...CBT_THERAPIST_WIRING_STAGE2_V5,

  // ── Super agent markers (additive) ─────────────────────────────────────────
  super_agent: true,
  super_agent_phase: SUPER_CBT_AGENT_PHASE,
  super_agent_version: SUPER_CBT_AGENT_VERSION,

  // ── Planned super agent capabilities (all false until activation PRs) ──────
  multilingual_context_enabled: false,
  protocol_selection_enabled: false,
  cross_session_continuity_enabled: false,
};

// ─── Super agent feature flag (independent of THERAPIST_UPGRADE_FLAGS) ────────
//
// This registry is kept SEPARATE from THERAPIST_UPGRADE_FLAGS intentionally.
// Many existing tests assert that THERAPIST_UPGRADE_FLAGS contains exactly
// 8 keys.  Adding a new key there would break those tests.  The super agent
// flag is therefore self-contained here and evaluated independently.

/**
 * Feature flag registry for SuperCbtAgent capabilities.
 *
 * Kept separate from THERAPIST_UPGRADE_FLAGS to avoid breaking existing
 * phase-test assertions on flag count.  All flags default to false.
 *
 * Staging enablement:
 *   Set the environment variable VITE_SUPER_CBT_AGENT_ENABLED=true in a
 *   staging build to enable without changing source code.
 *
 * @type {Readonly<Record<string, boolean>>}
 */
export const SUPER_CBT_AGENT_FLAGS = Object.freeze({
  /**
   * Master gate for all SuperCbtAgent logic paths.
   * When false, isSuperAgentEnabled() returns false and all super agent
   * code paths are completely bypassed.  Default: false.
   */
  SUPER_CBT_AGENT_ENABLED:
    import.meta.env?.VITE_SUPER_CBT_AGENT_ENABLED === 'true',
});

/**
 * Returns true only when SUPER_CBT_AGENT_ENABLED is true.
 *
 * This is the single gating function for all SuperCbtAgent logic.  Every
 * super agent code path must call this before executing.  It is analogous
 * to isUpgradeEnabled() in featureFlags.js but is independent of the
 * Stage 2 upgrade gate.
 *
 * @returns {boolean} True only when SUPER_CBT_AGENT_ENABLED flag is on
 */
export function isSuperAgentEnabled() {
  return SUPER_CBT_AGENT_FLAGS.SUPER_CBT_AGENT_ENABLED === true;
}

// ─── Language resolution ──────────────────────────────────────────────────────

/**
 * Resolves the active session locale from a session context object.
 *
 * Reads the `locale` field first, then `language`, from the provided context.
 * Falls back to 'en' (English) when:
 *   - The context is null or undefined
 *   - The locale/language field is absent
 *   - The resolved value is not in SUPER_CBT_AGENT_LANGUAGES
 *
 * This function is pure and has no side effects.  It does not evaluate any
 * feature flag — language resolution is always available.
 *
 * @param {object|null|undefined} sessionContext - Session context object.
 *   Expected optional fields: { locale?: string, language?: string }
 * @returns {string} A validated language code from SUPER_CBT_AGENT_LANGUAGES.
 *   Always returns a non-empty string; default is 'en'.
 */
export function resolveSessionLocale(sessionContext) {
  const candidate =
    (sessionContext && (sessionContext.locale || sessionContext.language)) || 'en';
  if (typeof candidate === 'string' && SUPER_CBT_AGENT_LANGUAGES.includes(candidate)) {
    return candidate;
  }
  return 'en';
}

// ─── i18n string resolver ─────────────────────────────────────────────────────

/**
 * Resolves the `chat.super_cbt_agent` i18n string map for a given locale.
 *
 * Routes through the app translations to return the correct language strings.
 * Falls back to English when:
 *   - The locale is not in SUPER_CBT_AGENT_LANGUAGES
 *   - The locale section is absent in the translations map
 *
 * This function is pure and has no side effects.  It does not evaluate any
 * feature flag — string resolution is always available.
 *
 * The translations map must follow the shape exported by
 * src/components/i18n/translations.jsx:
 *   translations[lang].translation.chat.super_cbt_agent
 *
 * @param {string} locale - Language code (e.g. 'en', 'he').
 *   Values not in SUPER_CBT_AGENT_LANGUAGES fall back to 'en'.
 * @param {object} translationsMap - The full app translations map.
 * @returns {object} The super_cbt_agent string map for the resolved locale.
 *   Returns an empty object when the section is missing in both locale and 'en'.
 */
export function resolveAgentI18nStrings(locale, translationsMap) {
  const lang =
    typeof locale === 'string' && SUPER_CBT_AGENT_LANGUAGES.includes(locale)
      ? locale
      : 'en';

  const section =
    translationsMap?.[lang]?.translation?.chat?.super_cbt_agent;

  if (section && typeof section === 'object') {
    return section;
  }

  // Fall back to English if the locale section is absent.
  const enSection =
    translationsMap?.en?.translation?.chat?.super_cbt_agent;

  return enSection && typeof enSection === 'object' ? enSection : {};
}

// ─── Super agent session-start preamble ──────────────────────────────────────

/**
 * Builds the super agent preamble for the session-start context injection.
 *
 * Returns a non-empty string only when ALL of the following conditions hold:
 *   1. isSuperAgentEnabled() returns true (SUPER_CBT_AGENT_ENABLED flag is on)
 *   2. wiring.super_agent === true (the super agent wiring is active)
 *   3. wiring.multilingual_context_enabled === true (multilingual capability on)
 *   4. The resolved i18n section has a non-empty session_intro string
 *
 * Returns '' (empty string) in all other cases — this is the default.  The
 * preamble is intended to be appended to the session-start message alongside
 * the existing workflow and retrieval context sections.
 *
 * This function is pure aside from the flag evaluation in isSuperAgentEnabled().
 *
 * @param {object|null|undefined} wiring - The active therapist wiring config.
 * @param {string} locale - The resolved session locale (e.g. 'en', 'he').
 * @param {object} translationsMap - The full app translations map.
 * @returns {string} The super agent session-start preamble, or '' when inactive.
 */
export function buildSuperAgentSessionPreamble(wiring, locale, translationsMap) {
  if (!isSuperAgentEnabled()) return '';
  if (!wiring || wiring.super_agent !== true) return '';
  if (wiring.multilingual_context_enabled !== true) return '';

  const strings = resolveAgentI18nStrings(locale, translationsMap);
  if (!strings.session_intro) return '';

  const modeLabel = strings.mode_label || 'Advanced CBT Mode';
  const parts = [
    `[SUPER_CBT_AGENT: ${modeLabel}]`,
    strings.session_intro,
  ];

  if (strings.multilingual_notice) {
    parts.push(strings.multilingual_notice);
  }

  return parts.join('\n');
}
