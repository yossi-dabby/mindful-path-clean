/**
 * @file src/api/activeAgentWiring.js
 *
 * Runtime wiring selection for the two current agents.
 *
 * This is the single place where the active wiring is chosen.
 * All other code that needs the live agent configuration should import from here.
 *
 * Current selection: hybrid (caution-layer augmentation active)
 *   - CBT Therapist → CBT_THERAPIST_WIRING_HYBRID
 *   - AI Companion  → AI_COMPANION_WIRING_HYBRID
 *
 * Phase 0.1 — Real routing integration point added (Section A of Phase 0.1 spec).
 * The upgrade feature flag is now evaluated at module initialisation via
 * resolveTherapistWiring(). Flag-off behaviour is identical to Phase 0 — the
 * hybrid wiring is always returned. Flag-on at this stage also returns the hybrid
 * wiring because no upgraded path exists yet. Future phases attach here.
 *
 * Phase 1 — CBT_THERAPIST_WIRING_STAGE2_V1 added as the memory-enabled path.
 * Phase 3 — CBT_THERAPIST_WIRING_STAGE2_V2 added as the workflow-engine path.
 *   V2 supersedes V1 when both flags are on (V2 is a superset of V1).
 * Phase 5 — CBT_THERAPIST_WIRING_STAGE2_V3 added as the retrieval-orchestration path.
 *   V3 supersedes V2 when both flags are on (V3 is a superset of V2).
 * Phase 6 — CBT_THERAPIST_WIRING_STAGE2_V4 added as the live-retrieval path.
 *   V4 supersedes V3 when both flags are on (V4 is a superset of V3).
 * Phase 7 — CBT_THERAPIST_WIRING_STAGE2_V5 added as the safety-mode path.
 *   V5 supersedes V4 when both flags are on (V5 is a superset of V4).
 * Phase 1 Quality — CBT_THERAPIST_WIRING_STAGE2_V6 added as the formulation-context path.
 *   V6 supersedes V5 when both flags are on (V6 is a superset of V5).
 *   CBT_THERAPIST_WIRING_STAGE2_V6_LED added as the formulation-led variant.
 *   V6-LED supersedes V6 when FORMULATION_CONTEXT_ENABLED + FORMULATION_LED_ENABLED are both on.
 * Phase 3 Deep Personalization — CBT_THERAPIST_WIRING_STAGE2_V7 added as the continuity path.
 *   V7 supersedes V6 when both flags are on (V7 is a superset of V6).
 * Wave 2B — CBT_THERAPIST_WIRING_STAGE2_V8 added as the strategy layer path.
 *   V8 supersedes V7 when both flags are on (V8 is a superset of V7).
 * Wave 3C — CBT_THERAPIST_WIRING_STAGE2_V9 added as the LTS injection path.
 *   V9 supersedes V8 when STRATEGY_ENABLED + LONGITUDINAL_ENABLED are both on.
 *   V9 is a strict superset of V8.
 * Wave 4C — CBT_THERAPIST_WIRING_STAGE2_V10 added as the CBT knowledge retrieval path.
 *   V10 supersedes V9 when STRATEGY_ENABLED + LONGITUDINAL_ENABLED + KNOWLEDGE_ENABLED
 *   are all on.  V10 is a strict superset of V9.
 * Phase 3 Competence Architecture — CBT_THERAPIST_WIRING_STAGE2_V11 added.
 *   V11 supersedes V10 when COMPETENCE_ENABLED is also on.  V11 is a strict superset of V10.
 * Wave 5 — CBT_THERAPIST_WIRING_STAGE2_V12 added as the formulation-first planner policy path.
 *   V12 supersedes V11 when PLANNER_FIRST_ENABLED is on.  V12 is a strict superset of V11.
 *
 * Analytics registration (Section B of Phase 0.1 spec) is performed lazily
 * via a dynamic import of base44Client.js so that test environments that lack
 * the browser context are unaffected.
 *
 * To roll back to V1 (Steps 1–3 only), see docs/ai-agent-hybrid-model.md §F.
 *
 * All step exports remain available from src/api/agentWiring.js for rollback.
 */

import {
  CBT_THERAPIST_WIRING_HYBRID,
  AI_COACH_WIRING,
  AI_COMPANION_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V1,
  CBT_THERAPIST_WIRING_STAGE2_V2,
  CBT_THERAPIST_WIRING_STAGE2_V3,
  CBT_THERAPIST_WIRING_STAGE2_V4,
  CBT_THERAPIST_WIRING_STAGE2_V5,
  CBT_THERAPIST_WIRING_STAGE2_V6,
  CBT_THERAPIST_WIRING_STAGE2_V6_LED,
  CBT_THERAPIST_WIRING_STAGE2_V7,
  CBT_THERAPIST_WIRING_STAGE2_V8,
  CBT_THERAPIST_WIRING_STAGE2_V9,
  CBT_THERAPIST_WIRING_STAGE2_V10,
  CBT_THERAPIST_WIRING_STAGE2_V11,
  CBT_THERAPIST_WIRING_STAGE2_V12,
  AI_COMPANION_WIRING_UPGRADE_V1,
  AI_COMPANION_WIRING_UPGRADE_V2,
} from './agentWiring.js';

import {
  isUpgradeEnabled,
  logUpgradeEvent,
  registerUpgradeAnalyticsTracker,
  isCompanionUpgradeEnabled,
  logCompanionUpgradeEvent,
  registerCompanionUpgradeAnalyticsTracker,
  isPinnedV10KnowledgeHost,
  V10_KNOWLEDGE_PINNED_OVERRIDES,
} from '../lib/featureFlags.js';

// ─── Phase 0.1 — Analytics registration ─────────────────────────────────────
//
// Register base44.analytics.track as the upgrade observability tracker when
// the module is loaded in a browser context.  The dynamic import is wrapped in
// a try-catch so that test environments (which lack the @/lib/app-params alias)
// fail silently and fall back to the console-only logging already present in
// logUpgradeEvent.
//
// Logging failure must never affect routing — this is fire-and-forget.

(async () => {
  try {
    const { base44 } = await import('./base44Client.js');
    const trackFn = (eventName, properties) => {
      base44.analytics.track({ eventName, properties });
    };
    registerUpgradeAnalyticsTracker(trackFn);
    registerCompanionUpgradeAnalyticsTracker(trackFn);
  } catch (_ignored) {
    // Analytics unavailable (e.g. test environment) — console fallback remains.
  }
})();

// ─── Phase 0.1 — Real routing integration point ──────────────────────────────

/**
 * Resolves the active CBT Therapist wiring by evaluating the upgrade feature flag.
 *
 * This is the real routing/wiring decision point introduced in Phase 0.1.
 * It is called at module initialisation so the flag is evaluated as part of
 * the normal app load sequence — not only in tests.
 *
 * Routing logic (evaluated in order):
 *   1. Master gate off  → CBT_THERAPIST_WIRING_HYBRID (current default)
 *   2. Master gate on, THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED on
 *                       → CBT_THERAPIST_WIRING_STAGE2_V12 (Wave 5 Planner-First Policy)
 *   3. Master gate on, THERAPIST_UPGRADE_COMPETENCE_ENABLED on
 *                       → CBT_THERAPIST_WIRING_STAGE2_V11 (Phase 3 Competence Architecture)
 *   4. Master gate on, THERAPIST_UPGRADE_STRATEGY_ENABLED on,
 *      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED on,
 *      THERAPIST_UPGRADE_KNOWLEDGE_ENABLED on
 *                       → CBT_THERAPIST_WIRING_STAGE2_V10 (Wave 4C CBT knowledge retrieval)
 *   5. Master gate on, THERAPIST_UPGRADE_STRATEGY_ENABLED on,
 *      THERAPIST_UPGRADE_LONGITUDINAL_ENABLED on
 *                       → CBT_THERAPIST_WIRING_STAGE2_V9 (Wave 3C LTS injection)
 *   6. Master gate on, THERAPIST_UPGRADE_STRATEGY_ENABLED on
 *                       → CBT_THERAPIST_WIRING_STAGE2_V8 (Wave 2B strategy layer)
 *   7. Master gate on, THERAPIST_UPGRADE_CONTINUITY_ENABLED on
 *                       → CBT_THERAPIST_WIRING_STAGE2_V7 (Phase 3 continuity)
 *   8. Master gate on, THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED on,
 *      THERAPIST_UPGRADE_FORMULATION_LED_ENABLED on
 *                       → CBT_THERAPIST_WIRING_STAGE2_V6_LED (Phase 1 Quality formulation context + formulation-led)
 *   9. Master gate on, THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED on
 *                       → CBT_THERAPIST_WIRING_STAGE2_V6 (Phase 1 Quality formulation context only)
 *  10. Master gate on, THERAPIST_UPGRADE_SAFETY_MODE_ENABLED on
 *                       → CBT_THERAPIST_WIRING_STAGE2_V5 (Phase 7 safety mode)
 *  11. Master gate on, THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED on
 *                       → CBT_THERAPIST_WIRING_STAGE2_V4 (Phase 6 live retrieval)
 *  12. Master gate on, THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED on
 *                       → CBT_THERAPIST_WIRING_STAGE2_V3 (Phase 5 retrieval orchestration)
 *  13. Master gate on, THERAPIST_UPGRADE_WORKFLOW_ENABLED on
 *                       → CBT_THERAPIST_WIRING_STAGE2_V2 (Phase 3 workflow engine)
 *  14. Master gate on, THERAPIST_UPGRADE_MEMORY_ENABLED on
 *                       → CBT_THERAPIST_WIRING_STAGE2_V1 (Phase 1 memory layer)
 *  15. Master gate on, no matching phase flag
 *                       → CBT_THERAPIST_WIRING_HYBRID (fall-through to current default)
 *
 * Wave 5 Planner-First (V12) takes precedence over all prior phases because V12
 * is a strict superset of V11.  V12 requires only PLANNER_FIRST_ENABLED (plus
 * the master gate).
 *
 * Phase 3 Competence (V11) takes precedence over all prior phases because V11
 * is a strict superset of V10.  V11 requires only COMPETENCE_ENABLED (plus
 * the master gate).
 *
 * Wave 4C (V10) takes precedence over Wave 3C (V9) and all prior phases because
 * V10 is a strict superset of V9.  V10 requires STRATEGY_ENABLED +
 * LONGITUDINAL_ENABLED + KNOWLEDGE_ENABLED.
 *
 * Wave 3C (V9) takes precedence over Wave 2B (V8) and all prior phases because
 * V9 is a strict superset of V8.  V9 requires both STRATEGY_ENABLED and
 * LONGITUDINAL_ENABLED.
 *
 * Wave 2B (V8) takes precedence over Phase 3 Deep Personalization (V7) and all
 * prior phases because V8 is a strict superset of V7.
 *
 * Phase 3 Deep Personalization (V7) takes precedence over Phase 1 Quality (V6)
 * and all prior phases because V7 is a strict superset of V6.
 *
 * Phase 1 Quality (V6/V6-LED) takes precedence over Phase 7 (V5) and all prior
 * phases when the formulation context flag is on because V6 is a strict superset
 * of V5.  When FORMULATION_LED_ENABLED is also on, V6-LED is selected instead of
 * V6, injecting THERAPIST_FORMULATION_INSTRUCTIONS in addition to the CaseFormulation
 * context block.  When only FORMULATION_CONTEXT_ENABLED is on, V6 is selected and
 * THERAPIST_FORMULATION_INSTRUCTIONS is NOT injected — ensuring the diagnostic
 * accurately reflects effective runtime behavior.
 *
 * Phase 7 (V5) takes precedence over Phase 6 (V4) and all prior phases when
 * the safety mode flag is on because V5 is a superset of V4, which is a
 * superset of V3, which is a superset of V2, which is a superset of V1.
 *
 * Phase 6 (V4) takes precedence over Phase 5 (V3) and all prior phases when
 * the allowlist wrapper flag is on because V4 is a superset of V3, which is
 * a superset of V2, which is a superset of V1.
 *
 * Phase 3 (V2) takes precedence over Phase 1 (V1) when both flags are on
 * because V2 is a superset of V1 — it includes the memory layer and adds
 * the workflow engine on top.
 *
 * All flags default to false, so the current default path is always returned
 * in production until the flags are explicitly enabled.
 *
 * @returns {object} The active CBT Therapist wiring configuration
 */
function _resolveTherapistWiringDecision(flagReader) {
  const isEnabled = (flagName) => {
    try {
      return flagReader(flagName) === true;
    } catch (_error) {
      return false;
    }
  };

  if (!isEnabled('THERAPIST_UPGRADE_ENABLED')) {
    return {
      wiring: CBT_THERAPIST_WIRING_HYBRID,
      event: {
        kind: 'route_not_selected',
        context: {
          flag: 'THERAPIST_UPGRADE_ENABLED',
          path: 'hybrid',
          reason: 'master_gate_off',
          phase: '0.1',
        },
      },
    };
  }

  if (isEnabled('THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED')) {
    return {
      wiring: CBT_THERAPIST_WIRING_STAGE2_V12,
      event: {
        kind: 'route_selected',
        context: {
          flag: 'THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED',
          path: 'stage2_v12',
          phase: 'wave5_planner_first',
        },
      },
    };
  }

  if (isEnabled('THERAPIST_UPGRADE_COMPETENCE_ENABLED')) {
    return {
      wiring: CBT_THERAPIST_WIRING_STAGE2_V11,
      event: {
        kind: 'route_selected',
        context: {
          flag: 'THERAPIST_UPGRADE_COMPETENCE_ENABLED',
          path: 'stage2_v11',
          phase: 'phase3_competence_architecture',
        },
      },
    };
  }

  if (
    isEnabled('THERAPIST_UPGRADE_STRATEGY_ENABLED') &&
    isEnabled('THERAPIST_UPGRADE_LONGITUDINAL_ENABLED') &&
    isEnabled('THERAPIST_UPGRADE_KNOWLEDGE_ENABLED')
  ) {
    return {
      wiring: CBT_THERAPIST_WIRING_STAGE2_V10,
      event: {
        kind: 'route_selected',
        context: {
          flag: 'THERAPIST_UPGRADE_KNOWLEDGE_ENABLED',
          path: 'stage2_v10',
          phase: 'wave4c_knowledge_retrieval',
        },
      },
    };
  }

  if (
    isEnabled('THERAPIST_UPGRADE_STRATEGY_ENABLED') &&
    isEnabled('THERAPIST_UPGRADE_LONGITUDINAL_ENABLED')
  ) {
    return {
      wiring: CBT_THERAPIST_WIRING_STAGE2_V9,
      event: {
        kind: 'route_selected',
        context: {
          flag: 'THERAPIST_UPGRADE_LONGITUDINAL_ENABLED',
          path: 'stage2_v9',
          phase: 'wave3c_lts',
        },
      },
    };
  }

  if (isEnabled('THERAPIST_UPGRADE_STRATEGY_ENABLED')) {
    return {
      wiring: CBT_THERAPIST_WIRING_STAGE2_V8,
      event: {
        kind: 'route_selected',
        context: {
          flag: 'THERAPIST_UPGRADE_STRATEGY_ENABLED',
          path: 'stage2_v8',
          phase: 'wave2b_strategy',
        },
      },
    };
  }

  if (isEnabled('THERAPIST_UPGRADE_CONTINUITY_ENABLED')) {
    return {
      wiring: CBT_THERAPIST_WIRING_STAGE2_V7,
      event: {
        kind: 'route_selected',
        context: {
          flag: 'THERAPIST_UPGRADE_CONTINUITY_ENABLED',
          path: 'stage2_v7',
          phase: '3_deep_personalization',
        },
      },
    };
  }

  if (isEnabled('THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED')) {
    if (isEnabled('THERAPIST_UPGRADE_FORMULATION_LED_ENABLED')) {
      return {
        wiring: CBT_THERAPIST_WIRING_STAGE2_V6_LED,
        event: {
          kind: 'route_selected',
          context: {
            flag: 'THERAPIST_UPGRADE_FORMULATION_LED_ENABLED',
            path: 'stage2_v6_led',
            phase: '1_quality_formulation_led',
          },
        },
      };
    }

    return {
      wiring: CBT_THERAPIST_WIRING_STAGE2_V6,
      event: {
        kind: 'route_selected',
        context: {
          flag: 'THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED',
          path: 'stage2_v6',
          phase: '1_quality',
        },
      },
    };
  }

  if (isEnabled('THERAPIST_UPGRADE_SAFETY_MODE_ENABLED')) {
    return {
      wiring: CBT_THERAPIST_WIRING_STAGE2_V5,
      event: {
        kind: 'route_selected',
        context: {
          flag: 'THERAPIST_UPGRADE_SAFETY_MODE_ENABLED',
          path: 'stage2_v5',
          phase: '7',
        },
      },
    };
  }

  if (isEnabled('THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED')) {
    return {
      wiring: CBT_THERAPIST_WIRING_STAGE2_V4,
      event: {
        kind: 'route_selected',
        context: {
          flag: 'THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED',
          path: 'stage2_v4',
          phase: '6',
        },
      },
    };
  }

  if (isEnabled('THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED')) {
    return {
      wiring: CBT_THERAPIST_WIRING_STAGE2_V3,
      event: {
        kind: 'route_selected',
        context: {
          flag: 'THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED',
          path: 'stage2_v3',
          phase: '5',
        },
      },
    };
  }

  if (isEnabled('THERAPIST_UPGRADE_WORKFLOW_ENABLED')) {
    return {
      wiring: CBT_THERAPIST_WIRING_STAGE2_V2,
      event: {
        kind: 'route_selected',
        context: {
          flag: 'THERAPIST_UPGRADE_WORKFLOW_ENABLED',
          path: 'stage2_v2',
          phase: '3',
        },
      },
    };
  }

  if (isEnabled('THERAPIST_UPGRADE_MEMORY_ENABLED')) {
    return {
      wiring: CBT_THERAPIST_WIRING_STAGE2_V1,
      event: {
        kind: 'route_selected',
        context: {
          flag: 'THERAPIST_UPGRADE_MEMORY_ENABLED',
          path: 'stage2_v1',
          phase: '1',
        },
      },
    };
  }

  // ── Master gate on, no phase flag matched — fall through to current default ──
  return {
    wiring: CBT_THERAPIST_WIRING_HYBRID,
    event: {
      kind: 'route_not_selected',
      context: {
        flag: 'THERAPIST_UPGRADE_ENABLED',
        path: 'hybrid',
        reason: 'no_phase_flag_matched',
        phase: '0.1',
      },
    },
  };
}

/**
 * Resolves therapist wiring using a provided flag reader.
 *
 * This is a pure resolver and does not mutate state or emit side effects.
 *
 * @param {(flagName: string) => boolean} flagReader
 * @returns {object}
 */
export function resolveTherapistWiringFromFlagReader(flagReader) {
  return _resolveTherapistWiringDecision(flagReader).wiring;
}

/**
 * Resolves the active CBT Therapist wiring using the production flag reader.
 *
 * @returns {object}
 */
export function resolveTherapistWiring() {
  const decision = _resolveTherapistWiringDecision(isUpgradeEnabled);
  logUpgradeEvent(decision.event.kind, decision.event.context);
  return decision.wiring;
}

/**
 * Predicts therapist wiring from a runtime snapshot of boolean flags.
 *
 * Phase 0.1 diagnostic-only path: never applied to active routing.
 *
 * @param {Record<string, boolean>} runtimeFlags
 * @returns {object}
 */
export function predictTherapistWiringFromRuntimeFlags(runtimeFlags = {}) {
  return resolveTherapistWiringFromFlagReader((flagName) => runtimeFlags?.[flagName] === true);
}

// ─── Exported wiring constants ───────────────────────────────────────────────
//
// ACTIVE_CBT_THERAPIST_WIRING is now computed via resolveTherapistWiring() so
// that the flag is evaluated at a real wiring decision point on every cold
// module load.  The resulting value is still CBT_THERAPIST_WIRING_HYBRID while
// all flags are false — existing behaviour is preserved exactly.
//
// ACTIVE_AI_COMPANION_WIRING is now computed via resolveCompanionWiring().
// The resulting value is still AI_COMPANION_WIRING_HYBRID while all companion
// flags are false — existing behaviour is preserved exactly.

// ─── Phase 2 — AI Companion Upgrade Routing ──────────────────────────────────

/**
 * Resolves the active AI Companion wiring by evaluating the companion upgrade
 * feature flags.
 *
 * This routing is COMPLETELY INDEPENDENT of the therapist upgrade flags.
 * COMPANION_UPGRADE_* flags have no effect on resolveTherapistWiring(), and
 * THERAPIST_UPGRADE_* flags have no effect on resolveCompanionWiring().
 * This explicit separation prevents role ambiguity between the two agents.
 *
 * Routing logic (evaluated in order):
 *   1. Master gate off → AI_COMPANION_WIRING_HYBRID (legacy default)
 *   2. Master gate on, COMPANION_UPGRADE_WARMTH_ENABLED on
 *                      → AI_COMPANION_WIRING_UPGRADE_V1 (Phase 2 warmth layer)
 *   3. Master gate on, no matching phase flag
 *                      → AI_COMPANION_WIRING_HYBRID (fall-through to legacy)
 *
 * All flags default to false, so the legacy default path is always returned
 * in production until the flags are explicitly enabled.
 *
 * Rollback: set COMPANION_UPGRADE_ENABLED to false to instantly revert to
 * AI_COMPANION_WIRING_HYBRID with no other code changes.
 *
 * @returns {object} The active AI Companion wiring configuration
 */
export function resolveCompanionWiring() {
  if (isCompanionUpgradeEnabled('COMPANION_UPGRADE_ENABLED')) {
    // ── Phase 3 — Continuity layer (supersedes Phase 2 warmth layer) ─────
    if (isCompanionUpgradeEnabled('COMPANION_UPGRADE_CONTINUITY_ENABLED')) {
      logCompanionUpgradeEvent('route_selected', {
        flag: 'COMPANION_UPGRADE_CONTINUITY_ENABLED',
        path: 'upgrade_v2',
        phase: '3',
      });
      return AI_COMPANION_WIRING_UPGRADE_V2;
    }

    // ── Phase 2 — Warmth and attuned response layer ───────────────────────
    if (isCompanionUpgradeEnabled('COMPANION_UPGRADE_WARMTH_ENABLED')) {
      logCompanionUpgradeEvent('route_selected', {
        flag: 'COMPANION_UPGRADE_WARMTH_ENABLED',
        path: 'upgrade_v1',
        phase: '2',
      });
      return AI_COMPANION_WIRING_UPGRADE_V1;
    }

    // ── Master gate on, no phase flag matched — fall through to legacy ────
    logCompanionUpgradeEvent('route_not_selected', {
      flag: 'COMPANION_UPGRADE_ENABLED',
      path: 'legacy_fallback',
      phase: '2',
    });
    return AI_COMPANION_WIRING_HYBRID;
  }

  logCompanionUpgradeEvent('route_not_selected', {
    flag: 'COMPANION_UPGRADE_ENABLED',
    phase: '2',
  });
  return AI_COMPANION_WIRING_HYBRID;
}

/**
 * Active wiring for the CBT Therapist agent.
 * Resolved via resolveTherapistWiring() — evaluates the upgrade flag at load time.
 */
export const ACTIVE_CBT_THERAPIST_WIRING = resolveTherapistWiring();

/** Active runtime wiring for the Coach screen (separate from AI Companion). */
export const ACTIVE_AI_COACH_WIRING = AI_COACH_WIRING;

/**
 * Active wiring for the AI Companion agent.
 * Resolved via resolveCompanionWiring() — evaluates the companion upgrade flags
 * at load time.  Falls back to AI_COMPANION_WIRING_HYBRID (legacy) when all
 * companion flags are false — no change to existing runtime behaviour.
 */
export const ACTIVE_AI_COMPANION_WIRING = resolveCompanionWiring();

/**
 * Backward-compatible legacy lookup.
 *
 * Keep this shape stable for code that still imports the historic two-agent
 * map. New in-app routing must use APP_RUNTIME_AGENT_WIRINGS instead.
 */
export const ACTIVE_AGENT_WIRINGS = {
  cbt_therapist: ACTIVE_CBT_THERAPIST_WIRING,
  ai_companion:  ACTIVE_AI_COMPANION_WIRING,
};

/**
 * Agents that are actually mounted by the current application.
 * AI Companion is intentionally absent because its UI surface is disabled.
 */
export const APP_RUNTIME_AGENT_WIRINGS = {
  cbt_therapist: ACTIVE_CBT_THERAPIST_WIRING,
  ai_coach:      ACTIVE_AI_COACH_WIRING,
};

// ─── Phase 0.2A — Runtime Authority Decision API ─────────────────────────────
//
// resolveTherapistRuntimeActivation is a pure function that decides whether a
// successfully transported runtime snapshot should become the source of therapist
// wiring selection for a Chat session.
//
// It is gated by THERAPIST_RUNTIME_APPLY_ENABLED — an independent backend-only
// control-plane switch that defaults false and is NOT a therapist capability flag.
//
// Key invariants:
//   - THERAPIST_RUNTIME_APPLY_ENABLED MUST NOT participate in V1–V12 precedence.
//   - V1–V12 selection is always delegated to resolveTherapistWiringFromFlagReader.
//   - No capability flag is activated by this function.
//   - Default state (APPLY missing/false) is identical to Phase 0.1 behavior.

/**
 * Resolves whether the runtime snapshot should become the active therapist wiring
 * for a Chat session.
 *
 * Returns a bounded decision object:
 *   { wiring, applied: boolean, reason: string }
 *
 * Possible reasons:
 *   transport_unavailable  — snapshot absent or transport failed
 *   apply_gate_off         — snapshot available but THERAPIST_RUNTIME_APPLY_ENABLED !== true
 *   runtime_snapshot_applied — snapshot available and APPLY === true; wiring resolved
 *                              through the canonical resolver
 *
 * @param {{ snapshot: object|null, fallbackWiring: object, hostname?: string }} options
 * @returns {{ wiring: object, applied: boolean, reason: string }}
 */
export function resolveTherapistRuntimeActivation({ snapshot, fallbackWiring, hostname = '' }) {
  const safe = fallbackWiring ?? ACTIVE_CBT_THERAPIST_WIRING;

  if (!snapshot || snapshot.transport_status !== 'available' || !snapshot.received) {
    return { wiring: safe, applied: false, reason: 'transport_unavailable' };
  }

  const flags = snapshot.flags;
  if (!flags || typeof flags !== 'object') {
    return { wiring: safe, applied: false, reason: 'transport_unavailable' };
  }

  // Strict gate: only the boolean true value (as stored after transport normalisation)
  // enables runtime authority.  The APPLY flag does NOT participate in V1–V12 precedence.
  if (flags['THERAPIST_RUNTIME_APPLY_ENABLED'] !== true) {
    return { wiring: safe, applied: false, reason: 'apply_gate_off' };
  }

  // APPLY=true — delegate to the canonical resolver for V1–V12 selection.
  // The exact pinned V10 hosts remain constrained to their four approved flags;
  // a backend snapshot cannot downgrade them to HYBRID or escalate them to V11/V12.
  // The APPLY flag itself is excluded from the reader so it cannot alter routing.
  const pinnedV10Host = isPinnedV10KnowledgeHost(hostname);
  const resolvedWiring = resolveTherapistWiringFromFlagReader(
    (flagName) => {
      if (flagName === 'THERAPIST_RUNTIME_APPLY_ENABLED') return false;
      if (pinnedV10Host) {
        return V10_KNOWLEDGE_PINNED_OVERRIDES[flagName] === true;
      }
      return flags[flagName] === true;
    },
  );

  return { wiring: resolvedWiring, applied: true, reason: 'runtime_snapshot_applied' };
}
