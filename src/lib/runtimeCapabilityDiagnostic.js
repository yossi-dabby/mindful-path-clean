/**
 * @file src/lib/runtimeCapabilityDiagnostic.js
 *
 * Runtime AI Capability Diagnostic — frontend snapshot builder.
 *
 * Builds a canonical, read-only diagnostic snapshot of the active AI
 * capability configuration by querying the EXISTING production resolvers
 * and feature-flag evaluators.  No routing logic is reimplemented here.
 *
 * SAFETY RULES (non-negotiable):
 *   - Pure read — never mutates any flag, wiring, or agent state.
 *   - Never includes raw env var values, secrets, credentials, or PII.
 *   - Never includes tool_configs contents (entity access rules are private).
 *   - Only boolean states and safe string identifiers are returned.
 *   - Fails safely: any error in a single field returns null for that field.
 *   - Does NOT enable or disable any feature flag.
 *   - Does NOT change any agent routing behavior.
 *
 * SUPER CBT AGENT — special handling:
 *   SUPER_CBT_AGENT_WIRING is NOT imported or routed in activeAgentWiring.js.
 *   This module reports the distinction between "flag configured" (env var
 *   is set) and "production route active" (wiring is actually selected).
 *   This module does NOT activate the Super CBT Agent.
 *
 * CONFIGURED-BUT-UNUSED SECRETS (frontend):
 *   THERAPIST_ADVANCED_MEMORY, THERAPIST_SESSION_CONTINUITY,
 *   THERAPIST_KNOWLEDGE_EXPANSION — not consumed by any frontend code path.
 *   Documented in docs/ai-runtime-capability-diagnostic.md.  No behavior
 *   is created for them by this module.
 *
 * DIAGNOSTIC VERSION: 1.0.0
 */

import { resolveTherapistWiring, resolveCompanionWiring } from '../api/activeAgentWiring.js';
import { isUpgradeEnabled, isCompanionUpgradeEnabled } from './featureFlags.js';
import { SUPER_CBT_AGENT_FLAGS } from './superCbtAgent.js';

export const DIAGNOSTIC_VERSION = '1.0.0';

// ─── Wiring identity helpers ──────────────────────────────────────────────────
//
// Maps the stage2_phase field (a stable integer identifier on each wiring
// config) to its canonical export name.  Only safe string identifiers are
// reported — tool_configs contents are never exposed.
//
// Source: src/api/agentWiring.js — stage2_phase values per wiring.

const _THERAPIST_STAGE2_PHASE_TO_CANONICAL = Object.freeze({
  1:  'CBT_THERAPIST_WIRING_STAGE2_V1',   // Phase 1 memory layer
  3:  'CBT_THERAPIST_WIRING_STAGE2_V2',   // Phase 3 workflow engine
  5:  'CBT_THERAPIST_WIRING_STAGE2_V3',   // Phase 5 retrieval orchestration
  6:  'CBT_THERAPIST_WIRING_STAGE2_V4',   // Phase 6 live retrieval
  7:  'CBT_THERAPIST_WIRING_STAGE2_V5',   // Phase 7 safety mode
  10: 'CBT_THERAPIST_WIRING_STAGE2_V6',   // Phase 1Q formulation context
  11: 'CBT_THERAPIST_WIRING_STAGE2_V7',   // Phase 3DP continuity
  12: 'CBT_THERAPIST_WIRING_STAGE2_V8',   // Wave 2B strategy layer
  13: 'CBT_THERAPIST_WIRING_STAGE2_V9',   // Wave 3C LTS injection
  14: 'CBT_THERAPIST_WIRING_STAGE2_V10',  // Wave 4C CBT knowledge retrieval
  15: 'CBT_THERAPIST_WIRING_STAGE2_V11',  // Phase 3 competence architecture
  16: 'CBT_THERAPIST_WIRING_STAGE2_V12',  // Wave 5 formulation-first planner
});

const _THERAPIST_STAGE2_PHASE_TO_DESCRIPTION = Object.freeze({
  1:  'phase_1_memory',
  3:  'phase_3_workflow',
  5:  'phase_5_retrieval_orchestration',
  6:  'phase_6_live_retrieval',
  7:  'phase_7_safety_mode',
  10: 'phase_1q_formulation_context',
  11: 'phase_3dp_continuity',
  12: 'wave2b_strategy',
  13: 'wave3c_lts',
  14: 'wave4c_knowledge',
  15: 'phase3_competence',
  16: 'wave5_planner_first',
});

const _COMPANION_UPGRADE_PHASE_TO_CANONICAL = Object.freeze({
  2: 'AI_COMPANION_WIRING_UPGRADE_V1',  // Phase 2 warmth layer
  3: 'AI_COMPANION_WIRING_UPGRADE_V2',  // Phase 3 continuity layer
});

/**
 * Derives a safe, canonical string identifier from a therapist wiring object.
 *
 * Uses the stable stage2_phase field.  Never reads or returns tool_configs.
 *
 * @param {object|null} wiring - Resolved therapist wiring object
 * @returns {string} Canonical name, or 'CBT_THERAPIST_WIRING_HYBRID' / 'unknown'
 */
export function _therapistWiringCanonicalName(wiring) {
  if (!wiring) return 'unknown';
  try {
    if (wiring.stage2 === true && typeof wiring.stage2_phase === 'number') {
      return (
        _THERAPIST_STAGE2_PHASE_TO_CANONICAL[wiring.stage2_phase] ??
        `CBT_THERAPIST_WIRING_STAGE2_PHASE_${wiring.stage2_phase}`
      );
    }
    if (wiring.name === 'cbt_therapist') return 'CBT_THERAPIST_WIRING_HYBRID';
    return 'unknown';
  } catch (_e) {
    return 'unknown';
  }
}

/**
 * Derives a safe phase description string from a therapist wiring object.
 *
 * @param {object|null} wiring - Resolved therapist wiring object
 * @returns {string} Phase description, or 'hybrid' / 'unknown'
 */
export function _therapistWiringPhaseDescription(wiring) {
  if (!wiring) return 'unknown';
  try {
    if (wiring.stage2 === true && typeof wiring.stage2_phase === 'number') {
      return (
        _THERAPIST_STAGE2_PHASE_TO_DESCRIPTION[wiring.stage2_phase] ??
        `stage2_phase_${wiring.stage2_phase}`
      );
    }
    if (wiring.name === 'cbt_therapist') return 'hybrid';
    return 'unknown';
  } catch (_e) {
    return 'unknown';
  }
}

/**
 * Derives a safe, canonical string identifier from a companion wiring object.
 *
 * @param {object|null} wiring - Resolved companion wiring object
 * @returns {string} Canonical name, or 'AI_COMPANION_WIRING_HYBRID' / 'unknown'
 */
export function _companionWiringCanonicalName(wiring) {
  if (!wiring) return 'unknown';
  try {
    if (wiring.companion_upgrade === true && typeof wiring.companion_upgrade_phase === 'number') {
      return (
        _COMPANION_UPGRADE_PHASE_TO_CANONICAL[wiring.companion_upgrade_phase] ??
        `AI_COMPANION_WIRING_UPGRADE_PHASE_${wiring.companion_upgrade_phase}`
      );
    }
    if (wiring.name === 'ai_companion') return 'AI_COMPANION_WIRING_HYBRID';
    return 'unknown';
  } catch (_e) {
    return 'unknown';
  }
}

// ─── Main diagnostic snapshot builder ────────────────────────────────────────

/**
 * Builds a canonical, read-only runtime capability diagnostic snapshot.
 *
 * All fields are derived from the EXISTING production resolvers and flag
 * evaluators.  No routing logic is reimplemented here.
 *
 * The function accepts optional dependency overrides to enable deterministic
 * unit testing without reimplementing resolver logic.
 *
 * @param {object} [options]
 * @param {() => object} [options.getTherapistWiring]
 *   Override for resolveTherapistWiring().  Defaults to the production resolver.
 * @param {() => object} [options.getCompanionWiring]
 *   Override for resolveCompanionWiring().  Defaults to the production resolver.
 * @param {(flagName: string) => boolean} [options.getFlagValue]
 *   Override for isUpgradeEnabled().  Defaults to the production evaluator.
 * @param {(flagName: string) => boolean} [options.getCompanionFlagValue]
 *   Override for isCompanionUpgradeEnabled().  Defaults to the production evaluator.
 * @param {() => boolean} [options.getSuperCbtFlagConfigured]
 *   Override for reading SUPER_CBT_AGENT_FLAGS.SUPER_CBT_AGENT_ENABLED.
 *   Defaults to reading the production flag registry (never the routing resolver).
 *
 * @returns {{
 *   therapist_master_enabled: boolean,
 *   selected_therapist_wiring: string,
 *   selected_therapist_stage: string,
 *   selected_therapist_phase: string,
 *   workflow_enabled: boolean,
 *   retrieval_orchestration_enabled: boolean,
 *   live_retrieval_enabled: boolean,
 *   safety_mode_enabled: boolean,
 *   formulation_context_enabled: boolean,
 *   formulation_led_configured: boolean,
 *   formulation_led_effective: boolean,
 *   continuity_layer_enabled: boolean,
 *   strategy_layer_enabled: boolean,
 *   longitudinal_layer_enabled: boolean,
 *   knowledge_layer_enabled: boolean,
 *   competence_layer_enabled: boolean,
 *   planner_first_enabled: boolean,
 *   action_first_demotion_present: boolean,
 *   companion_master_enabled: boolean,
 *   selected_companion_wiring: string,
 *   companion_warmth_enabled: boolean,
 *   companion_continuity_enabled: boolean,
 *   super_cbt_flag_configured: boolean,
 *   super_cbt_routed_in_production: boolean,
 *   diagnostic_version: string,
 *   generated_at: string,
 * }}
 */
export function buildRuntimeCapabilitySnapshot({
  getTherapistWiring = resolveTherapistWiring,
  getCompanionWiring = resolveCompanionWiring,
  getFlagValue = isUpgradeEnabled,
  getCompanionFlagValue = isCompanionUpgradeEnabled,
  getSuperCbtFlagConfigured = () => SUPER_CBT_AGENT_FLAGS.SUPER_CBT_AGENT_ENABLED === true,
} = {}) {
  // ── Therapist wiring resolution (uses the existing production resolver) ────
  let therapistWiring = null;
  try {
    therapistWiring = getTherapistWiring();
  } catch (_e) {
    // Fail-open: wiring identity fields will fall back to 'unknown'
  }

  // ── Companion wiring resolution (uses the existing production resolver) ────
  let companionWiring = null;
  try {
    companionWiring = getCompanionWiring();
  } catch (_e) {
    // Fail-open
  }

  // ── Helper: safe boolean flag read ───────────────────────────────────────
  function safeFlag(evaluator, flagName) {
    try {
      return evaluator(flagName) === true;
    } catch (_e) {
      return false;
    }
  }

  // ── Therapist flag-derived fields ─────────────────────────────────────────
  const therapist_master_enabled        = safeFlag(getFlagValue, 'THERAPIST_UPGRADE_ENABLED');
  const workflow_enabled                = safeFlag(getFlagValue, 'THERAPIST_UPGRADE_WORKFLOW_ENABLED');
  const retrieval_orchestration_enabled = safeFlag(getFlagValue, 'THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED');
  const live_retrieval_enabled          = safeFlag(getFlagValue, 'THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED');
  const safety_mode_enabled             = safeFlag(getFlagValue, 'THERAPIST_UPGRADE_SAFETY_MODE_ENABLED');
  const formulation_context_enabled     = safeFlag(getFlagValue, 'THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED');
  // formulation_led_configured: raw flag state (what the flag says)
  // formulation_led_effective:  actual runtime behavior — requires both
  //   formulation_context_enabled AND the resolved wiring or flag enabling it.
  //   Specifically:
  //     - true if the resolved wiring has formulation_led_enabled: true (V6-LED), OR
  //     - true if formulation_context_enabled AND formulation_led flag AND
  //       therapist_master_enabled are all true (V6/V7+ with runtime flag on).
  //   This mirrors the getFormulationLedContextForWiring() fail-closed logic.
  const formulation_led_configured      = safeFlag(getFlagValue, 'THERAPIST_UPGRADE_FORMULATION_LED_ENABLED');
  const formulation_led_effective       =
    therapistWiring?.formulation_led_enabled === true ||
    (therapistWiring?.formulation_context_enabled === true &&
      formulation_led_configured &&
      therapist_master_enabled);
  const continuity_layer_enabled        = safeFlag(getFlagValue, 'THERAPIST_UPGRADE_CONTINUITY_ENABLED');
  const strategy_layer_enabled          = safeFlag(getFlagValue, 'THERAPIST_UPGRADE_STRATEGY_ENABLED');
  const longitudinal_layer_enabled      = safeFlag(getFlagValue, 'THERAPIST_UPGRADE_LONGITUDINAL_ENABLED');
  const knowledge_layer_enabled         = safeFlag(getFlagValue, 'THERAPIST_UPGRADE_KNOWLEDGE_ENABLED');
  const competence_layer_enabled        = safeFlag(getFlagValue, 'THERAPIST_UPGRADE_COMPETENCE_ENABLED');
  const planner_first_enabled           = safeFlag(getFlagValue, 'THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED');
  const context_composer_v2_enabled     = safeFlag(getFlagValue, 'CONTEXT_COMPOSER_V2_ENABLED');

  // ── V7 continuity static diagnostic fields ────────────────────────────────
  //
  // continuity_configured: the THERAPIST_UPGRADE_CONTINUITY_ENABLED flag is on.
  // continuity_effective: the ACTIVE wiring has continuity_layer_enabled === true
  //   (the flag won routing and V7+ is the selected wiring).
  // formulation_context_effective: the active wiring has formulation_context_enabled.
  // safety_mode_effective: the active wiring has safety_mode_enabled.
  //
  // These reflect STATIC structural state.  Runtime per-read counts (memory
  // records, continuity block emitted, etc.) are emitted by
  // _emitV7ContinuityDiagnosticIfEnabled in workflowContextInjector.js only
  // when _s2debug=true.
  const continuity_configured         = continuity_layer_enabled;
  const continuity_effective          = therapistWiring?.continuity_layer_enabled === true;
  const formulation_context_effective = therapistWiring?.formulation_context_enabled === true;
  const safety_mode_effective         = therapistWiring?.safety_mode_enabled === true;

  // ── Wiring identity (safe string fields derived from resolved wiring) ────
  const selected_therapist_wiring = _therapistWiringCanonicalName(therapistWiring);
  const selected_therapist_stage  = therapistWiring?.stage2 === true ? 'stage2' : 'hybrid';
  const selected_therapist_phase  = _therapistWiringPhaseDescription(therapistWiring);

  // ── Action-first demotion: present when V12 is the active wiring ─────────
  //
  // V12 wiring (planner_first_enabled === true) natively injects the
  // formulation-first planner policy block via buildV12SessionStartContentAsync.
  // The universal buildActionFirstDemotedSessionContentAsync also applies the
  // block to all wiring paths, but this field specifically reports whether the
  // resolved wiring encodes the planner-first policy as a first-class flag.
  const action_first_demotion_present = therapistWiring?.planner_first_enabled === true;

  // ── Companion flag-derived fields ─────────────────────────────────────────
  const companion_master_enabled    = safeFlag(getCompanionFlagValue, 'COMPANION_UPGRADE_ENABLED');
  const companion_warmth_enabled    = safeFlag(getCompanionFlagValue, 'COMPANION_UPGRADE_WARMTH_ENABLED');
  const companion_continuity_enabled = safeFlag(getCompanionFlagValue, 'COMPANION_UPGRADE_CONTINUITY_ENABLED');
  const selected_companion_wiring   = _companionWiringCanonicalName(companionWiring);

  // ── Super CBT Agent fields ─────────────────────────────────────────────────
  //
  // super_cbt_flag_configured: is VITE_SUPER_CBT_AGENT_ENABLED=true in the build?
  //   (reads the flag registry; does NOT activate the agent)
  //
  // super_cbt_routed_in_production: is the Super CBT Agent actually wired by
  //   resolveTherapistWiring()? SUPER_CBT_AGENT_WIRING is NOT imported in
  //   activeAgentWiring.js and resolveTherapistWiring() has no routing branch
  //   for it.  The marker super_agent===true is only on SUPER_CBT_AGENT_WIRING.
  //   This will always be false until a separate activation PR adds the route.
  let super_cbt_flag_configured = false;
  try {
    super_cbt_flag_configured = getSuperCbtFlagConfigured() === true;
  } catch (_e) {
    // Fail-open: false
  }
  const super_cbt_routed_in_production = therapistWiring?.super_agent === true;

  return Object.freeze({
    // ── Therapist capability flags ──────────────────────────────────────────
    therapist_master_enabled,
    selected_therapist_wiring,
    selected_therapist_stage,
    selected_therapist_phase,
    workflow_enabled,
    retrieval_orchestration_enabled,
    live_retrieval_enabled,
    safety_mode_enabled,
    formulation_context_enabled,
    formulation_led_configured,
    formulation_led_effective,
    continuity_layer_enabled,
    continuity_configured,
    continuity_effective,
    formulation_context_effective,
    safety_mode_effective,
    strategy_layer_enabled,
    longitudinal_layer_enabled,
    knowledge_layer_enabled,
    competence_layer_enabled,
    planner_first_enabled,
    context_composer_v2_enabled,
    action_first_demotion_present,
    // ── Companion capability flags ──────────────────────────────────────────
    companion_master_enabled,
    selected_companion_wiring,
    companion_warmth_enabled,
    companion_continuity_enabled,
    // ── Super CBT Agent ─────────────────────────────────────────────────────
    super_cbt_flag_configured,
    super_cbt_routed_in_production,
    // ── Metadata ────────────────────────────────────────────────────────────
    diagnostic_version: DIAGNOSTIC_VERSION,
    generated_at: new Date().toISOString(),
  });
}
