/**
 * @file src/lib/featureFlags.js
 *
 * Therapist Upgrade — Stage 2 Feature Flag Registry
 * Preview rebuild marker: 2026-03-19T21:52Z
 *
 * All flags default to false. The current default therapist path
 * (CBT_THERAPIST_WIRING_HYBRID via src/api/activeAgentWiring.js) is always
 * active when these flags are off.
 *
 * Flag evaluation order:
 *   1. THERAPIST_UPGRADE_ENABLED (master gate) must be true, AND
 *   2. The specific per-phase flag must also be true.
 *   Both must be true before any upgraded behavior is reachable.
 *
 * Rollback: set THERAPIST_UPGRADE_ENABLED to false to disable all Stage 2
 * behavior in a single change. No other code needs to be modified.
 *
 * See docs/therapist-upgrade-stage2-plan.md — Phase 0 for full context.
 *
 * DO NOT enable any flag in this file without completing the Phase 9 exit
 * criteria (docs/therapist-upgrade-stage2-plan.md §Phase 9).
 */

// Wave 2D — strategy engine metadata for diagnostics (read-only constants, no runtime state).
// therapistStrategyEngine.js has no imports of its own, so this cannot create a cycle.
import {
  STRATEGY_VERSION,
  STRATEGY_INTERVENTION_MODES,
} from './therapistStrategyEngine.js';

// Wave 4E — CBT knowledge planner version for diagnostics (static constant, no runtime state).
// cbtKnowledgePlanner.js has zero imports of its own, so this cannot create a cycle.
import {
  CBT_KNOWLEDGE_PLANNER_VERSION,
} from './cbtKnowledgePlanner.js';

/**
 * All Stage 2 feature flags.
 *
 * Frozen at module load to prevent accidental runtime mutation.
 * Every flag defaults to false (upgrade path disabled, current path active).
 *
 * @type {Readonly<Record<string, boolean>>}
 */
export const THERAPIST_UPGRADE_FLAGS = Object.freeze({
  /**
   * Master upgrade gate.
   * When false, all per-phase flags are treated as false regardless of their
   * individual values. This is the single rollback switch for all of Stage 2.
   *
   * Staging enablement: set the environment variable
   *   VITE_THERAPIST_UPGRADE_ENABLED=true
   * to enable in a staging build without changing source code.
   * The value defaults to false when the variable is absent or any other value.
   */
  THERAPIST_UPGRADE_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_ENABLED === 'true',

  /**
   * Phase 1 — Structured therapist memory layer.
   * Staging enablement: set VITE_THERAPIST_UPGRADE_MEMORY_ENABLED=true
   */
  THERAPIST_UPGRADE_MEMORY_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_MEMORY_ENABLED === 'true',

  /**
   * Phase 2 — Session-end structured summarization.
   * Staging enablement: set VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED=true
   */
  THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_SUMMARIZATION_ENABLED === 'true',

  /**
   * Phase 3 — Therapist workflow engine.
   * Staging enablement: set VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED=true
   */
  THERAPIST_UPGRADE_WORKFLOW_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_WORKFLOW_ENABLED === 'true',

  /**
   * Phase 4 — External trusted knowledge ingestion.
   * Staging enablement: set VITE_THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED=true
   */
  THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_TRUSTED_INGESTION_ENABLED === 'true',

  /**
   * Phase 5 — Retrieval orchestration (internal-first).
   * Staging enablement: set VITE_THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED=true
   */
  THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED === 'true',

  /**
   * Phase 6 — Live retrieval allowlist wrapper.
   * Staging enablement: set VITE_THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED=true
   */
  THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED === 'true',

  /**
   * Phase 7 — Safety mode + emergency resource layer.
   * Staging enablement: set VITE_THERAPIST_UPGRADE_SAFETY_MODE_ENABLED=true
   */
  THERAPIST_UPGRADE_SAFETY_MODE_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_SAFETY_MODE_ENABLED === 'true',

  /**
   * Phase 1 Quality Gains — Formulation context injection + Socratic patterns.
   * Activates V6 wiring: injects CaseFormulation context into the session-start
   * payload and enables the Socratic / non-repetitive / formulation-aligned
   * response rules in the workflow engine.
   * Staging enablement: set VITE_THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED=true
   */
  THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED === 'true',

  /**
   * Phase 10 — Formulation-Led CBT.
   * Activates formulation-led response rules (THERAPIST_FORMULATION_INSTRUCTIONS)
   * injected via getFormulationLedContextForWiring into the V6 session-start path.
   * Staging enablement: set VITE_THERAPIST_UPGRADE_FORMULATION_LED_ENABLED=true
   */
  THERAPIST_UPGRADE_FORMULATION_LED_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_FORMULATION_LED_ENABLED === 'true',

  /**
   * Phase 3 Deep Personalization — Cross-session continuity layer.
   * Activates V7 wiring: reads prior therapist memory records and injects a
   * structured cross-session continuity block (recurring patterns, open
   * follow-up tasks, prior interventions) into the session-start payload.
   * Both agents are personalised using longitudinal memory when this flag is on.
   * Staging enablement: set VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED=true
   */
  THERAPIST_UPGRADE_CONTINUITY_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_CONTINUITY_ENABLED === 'true',

  /**
   * Wave 2B — Therapeutic Strategy Layer.
   * Gates runtime injection of the TherapistStrategyState engine into the
   * session-start content path.  When enabled together with the master gate,
   * resolveTherapistWiring() returns CBT_THERAPIST_WIRING_STAGE2_V8 and
   * buildV8SessionStartContentAsync appends a strategy guidance section to
   * the session-start payload.  The section is clearly labeled as guidance
   * and does NOT replace or weaken any existing safety filter.
   *
   * Fail-open: any strategy computation error returns the V7 base content
   * unchanged.  Production behavior is EXACTLY preserved when this flag is off.
   *
   * Staging enablement: set VITE_THERAPIST_UPGRADE_STRATEGY_ENABLED=true
   */
  THERAPIST_UPGRADE_STRATEGY_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_STRATEGY_ENABLED === 'true',

  /**
   * Wave 3B — Longitudinal Therapeutic State (LTS) write path.
   *
   * When enabled together with THERAPIST_UPGRADE_SUMMARIZATION_ENABLED and the
   * master gate, a second fire-and-forget step runs after each successful
   * therapist session memory write:
   *   1. The most recent bounded set of session records is fetched from
   *      CompanionMemory via retrieveTherapistMemory.
   *   2. buildLongitudinalState() recomputes the LTS from those records.
   *   3. writeLTSSnapshot upserts one canonical LTS snapshot record.
   *
   * The LTS write/read chain is fully additive and fail-open for session start:
   *   - It never runs before the session memory write.
   *   - Failure of the LTS write never affects the session memory write result.
   *   - When this flag is off, no LTS records are read or written.
   *   - The LTS read path is active only when STRATEGY_ENABLED is also true,
   *     which routes therapist session-start through V9.
   *   - Missing, invalid, weak, or unreadable LTS snapshots preserve exact V8
   *     behavior (no strategy or context change).
   *
   * Prerequisite: THERAPIST_UPGRADE_SUMMARIZATION_ENABLED must also be true
   * for the session memory write to run (and thus for the LTS to have data).
   * Enabling this flag alone without SUMMARIZATION_ENABLED is safe but only
   * affects the read gate.  Useful V9 behavior still requires the master gate,
   * STRATEGY_ENABLED, and enough prior structured session records.
   *
   * Backend: also requires the THERAPIST_UPGRADE_LONGITUDINAL_ENABLED Deno
   * secret to be set to 'true' in Base44 Application Secrets for the
   * writeLTSSnapshot function to accept the write request.
   *
   * Staging enablement: set VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED=true
   */
  THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_LONGITUDINAL_ENABLED === 'true',

  /**
   * Wave 4A / 4C — CBT Knowledge Retrieval.
   *
   * Wave 4A.1 (scaffold): Gates the CBT knowledge planner module
   * (src/lib/cbtKnowledgePlanner.js).  The planner is a standalone pure
   * library; enabling this flag alone has zero effect on any live session.
   *
   * Wave 4C (read path): When enabled together with STRATEGY_ENABLED,
   * LONGITUDINAL_ENABLED, and the master gate, resolveTherapistWiring()
   * returns CBT_THERAPIST_WIRING_STAGE2_V10 and
   * buildV10SessionStartContentAsync appends a bounded CBT knowledge block
   * to the session-start payload.
   *
   * The knowledge block is:
   *   - Appended last (after LTS, strategy, formulation, continuity).
   *   - Supporting reference only; does NOT override any clinical signal.
   *   - Hard-capped at CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS (3) units.
   *   - Gated by the CBT knowledge planner (safety, distress, strategy,
   *     domain, evidence_level, distress_suitability, safety_tags,
   *     runtime_eligible_first_wave filters).
   *
   * Fail-open: any retrieval error returns exact V9 output unchanged.
   * Production behavior is EXACTLY preserved when this flag is off.
   *
   * Frontend VITE env only — no backend Deno equivalent is required for
   * the client-side entity read path.
   *
   * Staging enablement: set VITE_THERAPIST_UPGRADE_KNOWLEDGE_ENABLED=true
   * (also requires THERAPIST_UPGRADE_ENABLED, THERAPIST_UPGRADE_STRATEGY_ENABLED,
   * and THERAPIST_UPGRADE_LONGITUDINAL_ENABLED to all be true).
   */
  THERAPIST_UPGRADE_KNOWLEDGE_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_KNOWLEDGE_ENABLED === 'true',

  /**
   * Phase 3 Competence Architecture — Clinical skills, theoretical knowledge,
   * and interpersonal abilities upgrade layer.
   *
   * When enabled together with the master gate, resolveTherapistWiring()
   * returns CBT_THERAPIST_WIRING_STAGE2_V11 and
   * buildV11SessionStartContentAsync appends the Phase 3 competence
   * instruction block to the session-start payload.
   *
   * The competence block adds fifteen rules across three pillars:
   *   Pillar A (Clinical Skills): C1–C5 — formulation building, maintaining
   *     cycle identification, intervention selection, Socratic questioning,
   *     and natural session management.
   *   Pillar B (Theoretical Knowledge): C6–C10 — CBT chain clarity,
   *     accessible psychoeducation, theory-to-practice translation,
   *     CBT fidelity without academia, no technique dumping.
   *   Pillar C (Interpersonal Abilities): C11–C15 — collaborative empiricism,
   *     cultural/religious sensitivity, non-defensive stuckness handling,
   *     alliance with structure, no didactic lecturing.
   *
   * V11 is a strict superset of V10: all prior capabilities are preserved.
   * No new entity access is added.
   *
   * Fail-open: any competence block injection error returns the V10 base
   * content unchanged. Production behavior is EXACTLY preserved when this
   * flag is off.
   *
   * Staging enablement: set VITE_THERAPIST_UPGRADE_COMPETENCE_ENABLED=true
   * (also requires THERAPIST_UPGRADE_ENABLED to be true).
   */
  THERAPIST_UPGRADE_COMPETENCE_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_COMPETENCE_ENABLED === 'true',

  /**
   * Wave 5 — Formulation-First Planner Policy.
   *
   * When enabled, activates the Wave 5 planner-first instruction block injected
   * via workflowContextInjector.js (buildV12SessionStartContentAsync).
   *
   * The planner-first block adds four policy layers to the therapist's reasoning:
   *   1. An 8-step planner constitution governing the ORDER of reasoning.
   *   2. A treatment target taxonomy with 10 target types.
   *   3. Case-type reasoning postures for 9 clinical presentations.
   *   4. Intervention readiness gates that must ALL be satisfied before any
   *      behavioral micro-step, homework, or task assignment.
   *
   * This policy directly addresses intervention-first bias by making the
   * reasoning sequence — understand → formulate → maintain cycle → target →
   * move type → intervention (when justified) → micro-step (last resort) —
   * explicit and enforced as the default reasoning path.
   *
   * V12 is a strict superset of V11: all prior capabilities are preserved.
   * No new entity access is added.
   *
   * Fail-open: any planner block injection error returns the V11 base content
   * unchanged. Production behavior is EXACTLY preserved when this flag is off.
   *
   * Staging enablement: set VITE_THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED=true
   * (also requires THERAPIST_UPGRADE_ENABLED to be true).
   */
  THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED: import.meta.env?.VITE_THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED === 'true',

  /**
   * Phase 5 — Context Composer V2.
   *
   * False-default architectural flag for the active V12 session-start composer.
   * Effective only when the therapist master gate and planner-first path are both active.
   */
  CONTEXT_COMPOSER_V2_ENABLED: import.meta.env?.VITE_CONTEXT_COMPOSER_V2_ENABLED === 'true',
});

// Pinned V10 Knowledge activation for the isolated Preview and Base44
// Production hosts. Base44 Application Secrets are backend-only, so VITE_*
// values are not compiled into the published browser bundle. Exact hostname
// comparisons preserve fail-closed behavior for siblings and lookalikes.
// Returning these fixed overrides before parsing `_s2` also prevents URL
// parameters from escalating either host into V11, V12, or other phases.
export const V10_KNOWLEDGE_PREVIEW_HOST =
  'mindful-path-v10-preview.base44.app';

export const V10_KNOWLEDGE_PRODUCTION_HOST = 'app.mindful-path.me';

export const V10_KNOWLEDGE_PINNED_OVERRIDES = Object.freeze({
  THERAPIST_UPGRADE_ENABLED: true,
  THERAPIST_UPGRADE_STRATEGY_ENABLED: true,
  THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: true,
  THERAPIST_UPGRADE_KNOWLEDGE_ENABLED: true,
});

// Backward-compatible export retained for the existing Preview audit surface.
export const V10_KNOWLEDGE_PREVIEW_OVERRIDES =
  V10_KNOWLEDGE_PINNED_OVERRIDES;

export function isPinnedV10KnowledgeHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;

  const normalizedHostname = hostname.trim().toLowerCase();
  return normalizedHostname === V10_KNOWLEDGE_PREVIEW_HOST ||
    normalizedHostname === V10_KNOWLEDGE_PRODUCTION_HOST;
}

/**
 * Returns true when the given hostname is an explicitly recognised
 * preview/staging host where the `_s2` URL override is permitted.
 *
 * Recognised patterns:
 *   - localhost       — local development server
 *   - 127.0.0.1       — local development / CI runner
 *   - exact hostnames listed in VITE_STAGE2_RUNTIME_OVERRIDE_HOSTS
 *     (comma-separated; wildcards are rejected)
 *
 * Any other hostname (including custom production domains) returns false.
 * An absent or non-string hostname always returns false (fail-closed).
 *
 * @param {string} hostname
 * @returns {boolean}
 */
export function _isPreviewStagingHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;

  const normalizedHostname = hostname.trim().toLowerCase();
  if (!normalizedHostname) return false;

  if (normalizedHostname === V10_KNOWLEDGE_PREVIEW_HOST) {
    return true;
  }

  if (
    normalizedHostname === 'localhost' ||
    normalizedHostname === '127.0.0.1'
  ) {
    return true;
  }

  const configuredHosts = String(
    import.meta.env?.VITE_STAGE2_RUNTIME_OVERRIDE_HOSTS ?? '',
  )
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter((host) => host.length > 0 && !host.includes('*'));

  return configuredHosts.includes(normalizedHostname);
}

/**
 * Reads staging-only runtime overrides from the URL query string.
 *
 * This is the fix for Base44 preview/staging builds where VITE_* environment
 * variables are baked in at build time and may not be reliably picked up even
 * after rebuilds.  The URL override layer allows flag enablement at runtime
 * without touching source code or triggering a new build.
 *
 * SAFETY RULES (non-negotiable):
 *   - UNRECOGNISED HOSTS ARE ALWAYS FAIL-CLOSED: returns {} unless the current
 *     hostname is an explicitly recognised preview/staging host.  This replaces
 *     the previous import.meta.env.PROD guard, which incorrectly blocked
 *     Base44 preview environments that also run production builds.
 *   - SSR / Node.js / test environments (no window) return {} silently.
 *   - Unrecognised flag names are silently ignored; no unknown flags are accepted.
 *   - Any error during URL parsing returns {} (fail-closed).
 *
 * URL parameter format (staging/preview only):
 *   ?_s2=FLAG1,FLAG2,...
 *
 * Example — enable master gate + memory phase on an explicitly configured preview host:
 *   https://myapp.base44.app/?_s2=THERAPIST_UPGRADE_ENABLED,THERAPIST_UPGRADE_MEMORY_ENABLED
 *
 * The override is additive: a flag set to true via the URL takes precedence
 * over the build-time value (which defaults to false).  There is no way to
 * force a flag to false via the URL — the URL can only enable, not disable.
 *
 * @returns {Record<string, boolean>} Flags that the URL has overridden to true.
 *   Always returns an empty object on unrecognised (production) hosts.
 */
function _readStagingRuntimeOverrides() {
  try {
    // Guard for non-browser environments (Node.js, SSR, test runners).
    if (typeof window === 'undefined') return {};

    // Allow override only on explicitly recognised preview/staging hosts.
    // Unknown hosts (including production custom domains) always fail-closed.
    const hostname = window.location?.hostname ?? '';
    const normalizedHostname =
      typeof hostname === 'string' ? hostname.trim().toLowerCase() : '';

    // The isolated Preview and Base44 Production hosts receive exactly the
    // four V10 Knowledge flags. Do not parse `_s2` here: URL input must not
    // enable later phases.
    if (isPinnedV10KnowledgeHost(normalizedHostname)) {
      return { ...V10_KNOWLEDGE_PINNED_OVERRIDES };
    }

    if (!_isPreviewStagingHost(hostname)) return {};

    const search = window.location?.search ?? '';
    if (!search) return {};

    const raw = new URLSearchParams(search).get('_s2');
    if (!raw) return {};

    const overrides = {};
    for (const key of raw.split(',')) {
      const trimmed = key.trim();
      // Only accept keys that are recognised Stage 2 flag names.
      if (trimmed && trimmed in THERAPIST_UPGRADE_FLAGS) {
        overrides[trimmed] = true;
      }
    }
    return overrides;
  } catch (_e) {
    // Parsing failure must never propagate — always fail-closed.
    return {};
  }
}

/**
 * Evaluates a Stage 2 feature flag by name.
 *
 * Evaluation order (first truthy wins):
 *   1. Build-time env var (import.meta.env.VITE_*) — the primary path.
 *   2. Staging runtime URL override (?_s2=...) — preview/staging hosts only;
 *      never active on unrecognised (production) hosts.
 *
 * The master flag (THERAPIST_UPGRADE_ENABLED) must be true via either path,
 * and the specific per-phase flag must also be true via either path, before
 * this returns true.
 *
 * Returns false (current default path) when:
 *   - The flag name is not a recognised Stage 2 flag key
 *   - THERAPIST_UPGRADE_ENABLED is false (build-time and runtime)
 *   - The specific flag value is false (build-time and runtime)
 *
 * This function is the single routing guard for all Stage 2 upgrade paths.
 * Every future upgrade code branch must call this before executing.
 *
 * @param {string} flagName - A key from THERAPIST_UPGRADE_FLAGS
 * @returns {boolean} True only when both the master gate and the specific flag are enabled
 */
export function isUpgradeEnabled(flagName) {
  if (!(flagName in THERAPIST_UPGRADE_FLAGS)) {
    logUpgradeEvent('flag_isolation_failure', { flagName, reason: 'unknown_flag' });
    return false;
  }

  const hostname =
    typeof window !== 'undefined' ? window.location?.hostname ?? '' : '';
  const normalizedHostname =
    typeof hostname === 'string' ? hostname.trim().toLowerCase() : '';

  // The isolated V10 Knowledge Preview and Base44 Production host are pinned
  // to exactly four flags. This early return blocks both URL overrides and
  // build-time variables from activating V11, V12, or unrelated capabilities.
  if (isPinnedV10KnowledgeHost(normalizedHostname)) {
    return V10_KNOWLEDGE_PINNED_OVERRIDES[flagName] === true;
  }

  // Layer 2: preview/staging-only runtime overrides (always {} on unrecognised hosts).
  const stagingOverrides = _readStagingRuntimeOverrides();

  // The master flag may be evaluated directly without the double-gate logic.
  if (flagName === 'THERAPIST_UPGRADE_ENABLED') {
    return THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED ||
      stagingOverrides.THERAPIST_UPGRADE_ENABLED === true;
  }

  // All per-phase flags require the master flag to also be enabled.
  const masterEnabled =
    THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED ||
    stagingOverrides.THERAPIST_UPGRADE_ENABLED === true;

  if (!masterEnabled) {
    return false;
  }

  return THERAPIST_UPGRADE_FLAGS[flagName] || stagingOverrides[flagName] === true;
}

// ─── Diagnostic surface (temporary — remove after Base44 preview investigation) ─

/**
 * Returns a diagnostic snapshot of the Stage 2 flag evaluation state.
 *
 * DIAGNOSTIC-ONLY — gated by `?_s2debug=true` in the URL.
 * Returns null when the gate param is absent (fail-closed).
 *
 * Works on any host so the hostname itself is observable (helps diagnose
 * why a host is not being recognised as a preview/staging host).
 * Never mutates flag state or changes routing behaviour.
 *
 * Remove together with logStage2Diagnostics() after diagnosis is complete.
 *
 * @returns {{ hostname: string|null, search: string|null,
 *             isPreviewStagingHost: boolean, parsedS2Flags: string[],
 *             computedFlags: Record<string, boolean>,
 *             masterGateOn: boolean, routeHint: string } | null}
 */
export function getStage2DiagnosticPayload() {
  try {
    if (typeof window === 'undefined') return null;

    const search = window.location?.search ?? '';
    const params = new URLSearchParams(search);
    if (params.get('_s2debug') !== 'true') return null;

    const hostname = window.location?.hostname ?? null;

    // Parse _s2 flags (may be absent or empty).
    const rawS2 = params.get('_s2') ?? '';
    const parsedS2Flags = rawS2
      ? rawS2.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    // Evaluate every Stage 2 flag through the live isUpgradeEnabled() evaluator.
    const computedFlags = {};
    for (const flagName of Object.keys(THERAPIST_UPGRADE_FLAGS)) {
      computedFlags[flagName] = isUpgradeEnabled(flagName);
    }

    const masterGateOn = computedFlags['THERAPIST_UPGRADE_ENABLED'] === true;

    // Route hint — mirrors resolveTherapistWiring() logic without importing it.
    let routeHint;
    if (!masterGateOn) {
      routeHint = 'HYBRID (master gate off)';
    } else if (computedFlags['THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED']) {
      routeHint = 'STAGE2_V12 (planner-first)';
    } else if (computedFlags['THERAPIST_UPGRADE_COMPETENCE_ENABLED']) {
      routeHint = 'STAGE2_V11 (competence architecture)';
    } else if (
      computedFlags['THERAPIST_UPGRADE_STRATEGY_ENABLED'] &&
      computedFlags['THERAPIST_UPGRADE_LONGITUDINAL_ENABLED'] &&
      computedFlags['THERAPIST_UPGRADE_KNOWLEDGE_ENABLED']
    ) {
      routeHint = 'STAGE2_V10 (knowledge retrieval)';
    } else if (
      computedFlags['THERAPIST_UPGRADE_STRATEGY_ENABLED'] &&
      computedFlags['THERAPIST_UPGRADE_LONGITUDINAL_ENABLED']
    ) {
      routeHint = 'STAGE2_V9 (LTS injection)';
    } else if (computedFlags['THERAPIST_UPGRADE_STRATEGY_ENABLED']) {
      routeHint = 'STAGE2_V8 (strategy)';
    } else if (computedFlags['THERAPIST_UPGRADE_CONTINUITY_ENABLED']) {
      routeHint = 'STAGE2_V7 (continuity)';
    } else if (computedFlags['THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED']) {
      routeHint = 'STAGE2_V6 (formulation context)';
    } else if (computedFlags['THERAPIST_UPGRADE_SAFETY_MODE_ENABLED']) {
      routeHint = 'STAGE2_V5 (safety mode)';
    } else if (computedFlags['THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED']) {
      routeHint = 'STAGE2_V4 (live retrieval)';
    } else if (computedFlags['THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED']) {
      routeHint = 'STAGE2_V3 (retrieval orchestration)';
    } else if (computedFlags['THERAPIST_UPGRADE_WORKFLOW_ENABLED']) {
      routeHint = 'STAGE2_V2 (workflow engine)';
    } else if (computedFlags['THERAPIST_UPGRADE_MEMORY_ENABLED']) {
      routeHint = 'STAGE2_V1 (memory layer)';
    } else {
      routeHint = 'HYBRID (master gate on, no phase flag matched)';
    }

    return {
      hostname,
      search,
      isPreviewStagingHost: _isPreviewStagingHost(hostname ?? ''),
      parsedS2Flags,
      computedFlags,
      masterGateOn,
      routeHint,
      // Wave 2D — static strategy engine metadata (no runtime state, purely from constants).
      strategyEngine: {
        version: STRATEGY_VERSION,
        availableModes: Object.values(STRATEGY_INTERVENTION_MODES),
      },
    };
  } catch (_e) {
    // Diagnostics must never propagate errors.
    return null;
  }
}

/**
 * Logs the Stage 2 diagnostic payload to the console when `?_s2debug=true`
 * is present in the URL.  No-op otherwise (fail-closed).
 *
 * Called once at module load.  Safe to remove together with
 * getStage2DiagnosticPayload() after diagnosis is complete.
 */
export function logStage2Diagnostics() {
  try {
    const p = getStage2DiagnosticPayload();
    if (!p) return;
    console.group('[S2 Diagnostics] Stage 2 flag evaluation report');
    console.log('hostname            :', p.hostname);
    console.log('search              :', p.search);
    console.log('isPreviewStagingHost:', p.isPreviewStagingHost);
    console.log('parsedS2Flags       :', p.parsedS2Flags);
    console.log('computedFlags       :', p.computedFlags);
    console.log('masterGateOn        :', p.masterGateOn);
    console.log('routeHint           :', p.routeHint);
    console.log('strategyEngine      :', p.strategyEngine);
    console.groupEnd();
  } catch (_e) {
    // Diagnostics must never break the app.
  }
}

// Emit diagnostics at module load when _s2debug=true is in the URL.
logStage2Diagnostics();

// ─── Phase 4 — Unified Activation Diagnostics ────────────────────────────────

/**
 * Returns a unified diagnostic snapshot covering the activation state of BOTH
 * the Therapist upgrade (THERAPIST_UPGRADE_FLAGS) and the AI Companion upgrade
 * (COMPANION_UPGRADE_FLAGS).
 *
 * DIAGNOSTIC-ONLY — gated by `?_s2debug=true` in the URL.
 * Returns null when the gate param is absent (fail-closed).
 *
 * This is the Phase 4 replacement for the per-agent diagnostic helpers.
 * It provides a single QA checkpoint for the full upgrade activation state
 * before any broader production flag enablement.  Both agents are covered in
 * one call so staging QA can validate Therapist and Companion state together.
 *
 * SAFETY RULES (non-negotiable):
 *   - No private user data is included (no message content, no entity IDs,
 *     no PII, no journal content, no conversation text).
 *   - No routing behaviour is changed — purely observational.
 *   - No flag state is mutated.
 *   - Any error returns null (fail-closed).
 *
 * Agent separation is preserved:
 *   - therapist.computedFlags contains only THERAPIST_UPGRADE_* keys.
 *   - companion.computedFlags contains only COMPANION_UPGRADE_* keys.
 *   - No cross-contamination between the two flag namespaces.
 *
 * @returns {{
 *   hostname: string|null,
 *   search: string|null,
 *   isPreviewStagingHost: boolean,
 *   snapshotTimestamp: string,
 *   therapist: {
 *     parsedS2Flags: string[],
 *     computedFlags: Record<string, boolean>,
 *     masterGateOn: boolean,
 *     routeHint: string,
 *   },
 *   companion: {
 *     parsedC2Flags: string[],
 *     computedFlags: Record<string, boolean>,
 *     masterGateOn: boolean,
 *     routeHint: string,
 *   },
 * } | null}
 */
export function getActivationDiagnostics() {
  try {
    if (typeof window === 'undefined') return null;

    const search = window.location?.search ?? '';
    const params = new URLSearchParams(search);
    if (params.get('_s2debug') !== 'true') return null;

    const hostname = window.location?.hostname ?? null;

    // ── Therapist section ──────────────────────────────────────────────────
    const rawS2 = params.get('_s2') ?? '';
    const parsedS2Flags = rawS2
      ? rawS2.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    const therapistComputedFlags = {};
    for (const flagName of Object.keys(THERAPIST_UPGRADE_FLAGS)) {
      therapistComputedFlags[flagName] = isUpgradeEnabled(flagName);
    }

    const therapistMasterOn = therapistComputedFlags['THERAPIST_UPGRADE_ENABLED'] === true;

    let therapistRouteHint;
    if (!therapistMasterOn) {
      therapistRouteHint = 'HYBRID (master gate off)';
    } else if (therapistComputedFlags['THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED']) {
      therapistRouteHint = 'STAGE2_V12 (planner-first)';
    } else if (therapistComputedFlags['THERAPIST_UPGRADE_COMPETENCE_ENABLED']) {
      therapistRouteHint = 'STAGE2_V11 (competence architecture)';
    } else if (
      therapistComputedFlags['THERAPIST_UPGRADE_STRATEGY_ENABLED'] &&
      therapistComputedFlags['THERAPIST_UPGRADE_LONGITUDINAL_ENABLED'] &&
      therapistComputedFlags['THERAPIST_UPGRADE_KNOWLEDGE_ENABLED']
    ) {
      therapistRouteHint = 'STAGE2_V10 (knowledge retrieval)';
    } else if (
      therapistComputedFlags['THERAPIST_UPGRADE_STRATEGY_ENABLED'] &&
      therapistComputedFlags['THERAPIST_UPGRADE_LONGITUDINAL_ENABLED']
    ) {
      therapistRouteHint = 'STAGE2_V9 (LTS injection)';
    } else if (therapistComputedFlags['THERAPIST_UPGRADE_STRATEGY_ENABLED']) {
      therapistRouteHint = 'STAGE2_V8 (strategy)';
    } else if (therapistComputedFlags['THERAPIST_UPGRADE_CONTINUITY_ENABLED']) {
      therapistRouteHint = 'STAGE2_V7 (continuity)';
    } else if (therapistComputedFlags['THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED']) {
      therapistRouteHint = 'STAGE2_V6 (formulation context)';
    } else if (therapistComputedFlags['THERAPIST_UPGRADE_SAFETY_MODE_ENABLED']) {
      therapistRouteHint = 'STAGE2_V5 (safety mode)';
    } else if (therapistComputedFlags['THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED']) {
      therapistRouteHint = 'STAGE2_V4 (live retrieval)';
    } else if (therapistComputedFlags['THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED']) {
      therapistRouteHint = 'STAGE2_V3 (retrieval orchestration)';
    } else if (therapistComputedFlags['THERAPIST_UPGRADE_WORKFLOW_ENABLED']) {
      therapistRouteHint = 'STAGE2_V2 (workflow engine)';
    } else if (therapistComputedFlags['THERAPIST_UPGRADE_MEMORY_ENABLED']) {
      therapistRouteHint = 'STAGE2_V1 (memory layer)';
    } else {
      therapistRouteHint = 'HYBRID (master gate on, no phase flag matched)';
    }

    // ── Companion section ──────────────────────────────────────────────────
    const rawC2 = params.get('_c2') ?? '';
    const parsedC2Flags = rawC2
      ? rawC2.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    const companionComputedFlags = {};
    for (const flagName of Object.keys(COMPANION_UPGRADE_FLAGS)) {
      companionComputedFlags[flagName] = isCompanionUpgradeEnabled(flagName);
    }

    const companionMasterOn = companionComputedFlags['COMPANION_UPGRADE_ENABLED'] === true;

    let companionRouteHint;
    if (!companionMasterOn) {
      companionRouteHint = 'HYBRID (master gate off)';
    } else if (companionComputedFlags['COMPANION_UPGRADE_CONTINUITY_ENABLED']) {
      companionRouteHint = 'UPGRADE_V2 (continuity)';
    } else if (companionComputedFlags['COMPANION_UPGRADE_WARMTH_ENABLED']) {
      companionRouteHint = 'UPGRADE_V1 (warmth)';
    } else {
      companionRouteHint = 'HYBRID (master gate on, no phase flag matched)';
    }

    return {
      hostname,
      search,
      isPreviewStagingHost: _isPreviewStagingHost(hostname ?? ''),
      snapshotTimestamp: new Date().toISOString(),
      therapist: {
        parsedS2Flags,
        computedFlags: therapistComputedFlags,
        masterGateOn: therapistMasterOn,
        routeHint: therapistRouteHint,
        // Wave 2D — static strategy engine metadata (no runtime state, purely from constants).
        strategyEngine: {
          version: STRATEGY_VERSION,
          availableModes: Object.values(STRATEGY_INTERVENTION_MODES),
        },
        // Wave 3E — LTS layer activation status (boolean flags only, no runtime state).
        ltsLayer: {
          ltsLayerActive: isUpgradeEnabled('THERAPIST_UPGRADE_LONGITUDINAL_ENABLED'),
          strategyLayerActive: isUpgradeEnabled('THERAPIST_UPGRADE_STRATEGY_ENABLED'),
        },
        // Wave 4E — CBT knowledge layer activation status (boolean flags + static version).
        knowledgeLayer: {
          knowledgeLayerActive: isUpgradeEnabled('THERAPIST_UPGRADE_KNOWLEDGE_ENABLED'),
          strategyLayerActive: isUpgradeEnabled('THERAPIST_UPGRADE_STRATEGY_ENABLED'),
          ltsLayerActive: isUpgradeEnabled('THERAPIST_UPGRADE_LONGITUDINAL_ENABLED'),
          plannerVersion: CBT_KNOWLEDGE_PLANNER_VERSION,
        },
      },
      companion: {
        parsedC2Flags,
        computedFlags: companionComputedFlags,
        masterGateOn: companionMasterOn,
        routeHint: companionRouteHint,
      },
      // Wave 5D — Quality Evaluator activation status (boolean flags only, no runtime state).
      evaluatorLayer: {
        evaluatorEnabled: isQualityEvaluatorEnabled('QUALITY_EVALUATOR_ENABLED'),
      },
    };
  } catch (_e) {
    // Diagnostics must never propagate errors.
    return null;
  }
}

/**
 * Logs the unified activation diagnostic snapshot to the console when
 * `?_s2debug=true` is present in the URL.  No-op otherwise (fail-closed).
 *
 * Covers both the Therapist upgrade and the AI Companion upgrade in a single
 * console group so staging QA can validate both agents at the same time.
 *
 * Called once at module load alongside logStage2Diagnostics().
 */
export function logActivationDiagnostics() {
  try {
    const p = getActivationDiagnostics();
    if (!p) return;
    console.group('[Activation Diagnostics] Therapist + Companion upgrade state');
    console.log('hostname             :', p.hostname);
    console.log('isPreviewStagingHost :', p.isPreviewStagingHost);
    console.log('snapshotTimestamp    :', p.snapshotTimestamp);
    console.group('[Therapist]');
    console.log('parsedS2Flags        :', p.therapist.parsedS2Flags);
    console.log('computedFlags        :', p.therapist.computedFlags);
    console.log('masterGateOn         :', p.therapist.masterGateOn);
    console.log('routeHint            :', p.therapist.routeHint);
    console.log('strategyEngine       :', p.therapist.strategyEngine);
    console.log('ltsLayer             :', p.therapist.ltsLayer); // Wave 3E
    console.log('knowledgeLayer       :', p.therapist.knowledgeLayer); // Wave 4E
    console.groupEnd();
    console.group('[Companion]');
    console.log('parsedC2Flags        :', p.companion.parsedC2Flags);
    console.log('computedFlags        :', p.companion.computedFlags);
    console.log('masterGateOn         :', p.companion.masterGateOn);
    console.log('routeHint            :', p.companion.routeHint);
    console.groupEnd();
    console.group('[Evaluator]'); // Wave 5D
    console.log('evaluatorEnabled     :', p.evaluatorLayer.evaluatorEnabled);
    console.groupEnd();
    console.groupEnd();
  } catch (_e) {
    // Diagnostics must never break the app.
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Optional analytics tracker registered by the app at load time.
 * When set, logUpgradeEvent forwards events to the app's analytics pipeline
 * instead of (or in addition to) the console.
 *
 * Set via registerUpgradeAnalyticsTracker(). Never called directly outside
 * this module.
 *
 * @type {((eventName: string, properties: object) => void) | null}
 */
let _upgradeTrack = null;

// ─── AI Companion Upgrade — Phase 2 Feature Flag Registry ─────────────────────

/**
 * All AI Companion upgrade feature flags.
 *
 * Frozen at module load to prevent accidental runtime mutation.
 * Every flag defaults to false (upgrade path disabled, legacy HYBRID path active).
 *
 * Routing is completely independent of THERAPIST_UPGRADE_FLAGS — the companion
 * master gate and per-phase gates have no effect on therapist wiring, and vice
 * versa.  This explicit separation prevents role ambiguity between agents.
 *
 * Rollback: set COMPANION_UPGRADE_ENABLED to false to disable all companion
 * upgrade behavior in a single change.  No other code needs to be modified.
 *
 * @type {Readonly<Record<string, boolean>>}
 */
export const COMPANION_UPGRADE_FLAGS = Object.freeze({
  /**
   * Companion upgrade master gate.
   * When false, all per-phase companion flags are treated as false regardless
   * of their individual values.  This is the single kill-switch for all
   * companion upgrade behavior.
   *
   * Staging enablement: set the environment variable
   *   VITE_COMPANION_UPGRADE_ENABLED=true
   */
  COMPANION_UPGRADE_ENABLED: import.meta.env?.VITE_COMPANION_UPGRADE_ENABLED === 'true',

  /**
   * Phase 2 — Warmth and attuned response layer.
   * Activates AI_COMPANION_WIRING_UPGRADE_V1: companion responses become
   * warmer, more emotionally attuned, and less repetitive.
   * Staging enablement: set VITE_COMPANION_UPGRADE_WARMTH_ENABLED=true
   */
  COMPANION_UPGRADE_WARMTH_ENABLED: import.meta.env?.VITE_COMPANION_UPGRADE_WARMTH_ENABLED === 'true',

  /**
   * Phase 3 — Companion continuity layer.
   * Activates AI_COMPANION_WIRING_UPGRADE_V2: companion draws on prior
   * session summaries to surface session-to-session continuity cues and
   * provide individually tailored responses grounded in the user's history.
   * Staging enablement: set VITE_COMPANION_UPGRADE_CONTINUITY_ENABLED=true
   */
  COMPANION_UPGRADE_CONTINUITY_ENABLED: import.meta.env?.VITE_COMPANION_UPGRADE_CONTINUITY_ENABLED === 'true',
});

/**
 * Reads staging-only runtime overrides for companion flags from the URL.
 *
 * Uses the ?_c2=FLAG1,FLAG2,... parameter (parallel to ?_s2=... for therapist).
 * All safety rules from _readStagingRuntimeOverrides() apply here:
 *   - Fail-closed on unrecognised (production) hosts
 *   - No unknown flag names accepted
 *   - Any parsing error returns {}
 *
 * @returns {Record<string, boolean>}
 */
function _readCompanionStagingRuntimeOverrides() {
  try {
    if (typeof window === 'undefined') return {};
    const hostname = window.location?.hostname ?? '';
    if (!_isPreviewStagingHost(hostname)) return {};
    const search = window.location?.search ?? '';
    if (!search) return {};
    const raw = new URLSearchParams(search).get('_c2');
    if (!raw) return {};
    const overrides = {};
    for (const key of raw.split(',')) {
      const trimmed = key.trim();
      if (trimmed && trimmed in COMPANION_UPGRADE_FLAGS) {
        overrides[trimmed] = true;
      }
    }
    return overrides;
  } catch (_e) {
    return {};
  }
}

/**
 * Evaluates an AI Companion upgrade feature flag by name.
 *
 * Evaluation order (first truthy wins):
 *   1. Build-time env var (import.meta.env.VITE_COMPANION_*) — the primary path.
 *   2. Staging runtime URL override (?_c2=...) — preview/staging hosts only.
 *
 * The master flag (COMPANION_UPGRADE_ENABLED) must be true via either path,
 * and the specific per-phase flag must also be true via either path, before
 * this returns true.
 *
 * Returns false (legacy HYBRID path) when:
 *   - The flag name is not a recognised companion upgrade flag key
 *   - COMPANION_UPGRADE_ENABLED is false (build-time and runtime)
 *   - The specific flag value is false (build-time and runtime)
 *
 * This is the single routing guard for all companion upgrade paths.
 *
 * @param {string} flagName - A key from COMPANION_UPGRADE_FLAGS
 * @returns {boolean}
 */
export function isCompanionUpgradeEnabled(flagName) {
  if (!(flagName in COMPANION_UPGRADE_FLAGS)) {
    logCompanionUpgradeEvent('flag_isolation_failure', { flagName, reason: 'unknown_flag' });
    return false;
  }

  const stagingOverrides = _readCompanionStagingRuntimeOverrides();

  if (flagName === 'COMPANION_UPGRADE_ENABLED') {
    return COMPANION_UPGRADE_FLAGS.COMPANION_UPGRADE_ENABLED ||
      stagingOverrides.COMPANION_UPGRADE_ENABLED === true;
  }

  const masterEnabled =
    COMPANION_UPGRADE_FLAGS.COMPANION_UPGRADE_ENABLED ||
    stagingOverrides.COMPANION_UPGRADE_ENABLED === true;

  if (!masterEnabled) {
    return false;
  }

  return COMPANION_UPGRADE_FLAGS[flagName] || stagingOverrides[flagName] === true;
}

/**
 * Optional analytics tracker for companion upgrade observability.
 *
 * @type {((eventName: string, properties: object) => void) | null}
 */
let _companionUpgradeTrack = null;

/**
 * Registers the app-level analytics tracker for companion upgrade events.
 *
 * @param {(eventName: string, properties: object) => void} trackFn
 */
export function registerCompanionUpgradeAnalyticsTracker(trackFn) {
  if (typeof trackFn === 'function') {
    _companionUpgradeTrack = trackFn;
  } else {
    _companionUpgradeTrack = null;
  }
}

/**
 * Observability hook for companion upgrade routing events.
 *
 * Mirrors logUpgradeEvent() for the companion agent.
 * Must not throw — logging failure must never break routing.
 *
 * @param {string} event
 * @param {object} [context]
 */
export function logCompanionUpgradeEvent(event, context = {}) {
  if (_companionUpgradeTrack !== null) {
    try {
      _companionUpgradeTrack('companion_upgrade_' + event, context);
    } catch (_e) {
      // Analytics failure must never propagate — fall through to console.
    }
  }

  if (event === 'flag_isolation_failure') {
    console.warn('[CompanionUpgrade] Isolation failure —', event, context);
    return;
  }

  if (event === 'route_selected' || event === 'route_not_selected') {
    console.log('[CompanionUpgrade]', event, context);
    return;
  }
}

/**
 * Registers the app-level analytics tracker for upgrade observability events.
 *
 * Call once at app initialisation with base44.analytics.track (or a compatible
 * function) to route upgrade events into the app's existing analytics pipeline.
 * If never called, logUpgradeEvent falls back to console-only output.
 *
 * Logging failure must never break therapist routing — the tracker is always
 * called inside a try-catch.
 *
 * Phase 0.1 — replaces console-only observability with the app's existing
 * base44.analytics.track pattern (Section B of the Phase 0.1 spec).
 *
 * @param {(eventName: string, properties: object) => void} trackFn
 *   A function with the same signature as base44.analytics.track.
 */
export function registerUpgradeAnalyticsTracker(trackFn) {
  if (typeof trackFn === 'function') {
    _upgradeTrack = trackFn;
  } else {
    // Passing null (or any non-function) resets the tracker to the console fallback.
    _upgradeTrack = null;
  }
}

/**
 * Baseline observability hook for upgrade path events.
 *
 * When an analytics tracker has been registered via registerUpgradeAnalyticsTracker,
 * events are forwarded to that tracker (the app's base44.analytics.track pipeline).
 * Console output is retained as a fallback so events still surface in development
 * and CI logs if no tracker is registered.
 *
 * Isolation failures (unknown flags) always emit a console.warn in addition to
 * the analytics event so they are impossible to miss during development.
 *
 * This function must not throw — logging failure must never break routing.
 *
 * @param {string} event - Event identifier (e.g. 'flag_isolation_failure', 'route_selected')
 * @param {object} [context] - Additional diagnostic context
 */
export function logUpgradeEvent(event, context = {}) {
  // Always attempt analytics tracking first if a tracker is registered.
  if (_upgradeTrack !== null) {
    try {
      _upgradeTrack('therapist_upgrade_' + event, context);
    } catch (_e) {
      // Analytics failure must never propagate — fall through to console.
    }
  }

  if (event === 'flag_isolation_failure') {
    console.warn('[TherapistUpgrade] Isolation failure —', event, context);
    return;
  }

  if (event === 'route_selected' || event === 'route_not_selected') {
    console.log('[TherapistUpgrade]', event, context);
    return;
  }

  // All other events are silent at Phase 0 to avoid production noise.
  // Later phases may expand this switch as needed.
}

// Emit unified activation diagnostics at module load when _s2debug=true is in the URL.
// Called after all flag registries and evaluators are fully initialised.
logActivationDiagnostics();

// ─── Wave 5A — Quality Evaluator Feature Flag Registry ────────────────────────

/**
 * Quality Evaluator feature flags.
 *
 * Kept in a separate registry from THERAPIST_UPGRADE_FLAGS and
 * COMPANION_UPGRADE_FLAGS so that the evaluator can be deployed, tested,
 * and rolled back independently of agent upgrade rollouts.
 *
 * Wave 5A: Only VITE_QUALITY_EVALUATOR_ENABLED is present.  Wiring flags
 * will be added in later waves as each integration surface is approved.
 *
 * Frozen at module load to prevent accidental runtime mutation.
 * All flags default to false.
 *
 * @type {Readonly<Record<string, boolean>>}
 */
export const QUALITY_EVALUATOR_FLAGS = Object.freeze({
  /**
   * Wave 5A — Quality Evaluator master gate.
   *
   * When false (the default), the evaluator scaffold exists in source but is
   * never called by any runtime path.  Enabling this flag alone in Wave 5A
   * has zero effect on live session behaviour because the evaluator is not yet
   * wired into any session-start, diagnostics, or rollout path.  The flag is
   * added now so the registry contract is stable and testable before wiring.
   *
   * Staging enablement: set the environment variable
   *   VITE_QUALITY_EVALUATOR_ENABLED=true
   * in a staging build.  Defaults to false when the variable is absent or
   * set to any other value.
   *
   * Do NOT add this flag into THERAPIST_UPGRADE_FLAGS.
   * Do NOT add this flag into COMPANION_UPGRADE_FLAGS.
   * It is intentionally isolated in its own registry.
   */
  QUALITY_EVALUATOR_ENABLED: import.meta.env?.VITE_QUALITY_EVALUATOR_ENABLED === 'true',
});

/**
 * Evaluates the Quality Evaluator master gate flag.
 *
 * Returns true when QUALITY_EVALUATOR_ENABLED is set to 'true' via the
 * VITE_QUALITY_EVALUATOR_ENABLED build-time environment variable.
 *
 * The evaluator flag registry is intentionally isolated from
 * THERAPIST_UPGRADE_FLAGS and COMPANION_UPGRADE_FLAGS so that the evaluator
 * can be deployed, tested, and rolled back independently of agent upgrade
 * rollouts.  This function is the single read point for the evaluator gate.
 *
 * Returns false when:
 *   - The flag name is not a key in QUALITY_EVALUATOR_FLAGS
 *   - QUALITY_EVALUATOR_ENABLED is false (build-time env absent or not 'true')
 *
 * @param {string} [flagName='QUALITY_EVALUATOR_ENABLED']
 *   A key from QUALITY_EVALUATOR_FLAGS.  Defaults to the master gate.
 * @returns {boolean}
 */
export function isQualityEvaluatorEnabled(flagName = 'QUALITY_EVALUATOR_ENABLED') {
  if (!(flagName in QUALITY_EVALUATOR_FLAGS)) return false;
  return QUALITY_EVALUATOR_FLAGS[flagName] === true;
}

// ─── Phase 1 — Chat Orchestrator V2 Feature Flag Registry ─────────────────────

/**
 * Chat Orchestrator V2 feature flags.
 *
 * Kept in a separate registry so the chat orchestrator lifecycle can be
 * deployed, tested, and rolled back independently of agent upgrade rollouts
 * and the quality evaluator.
 *
 * Phase 1: Only VITE_CHAT_ORCHESTRATOR_V2_ENABLED is present.
 * The flag gates the canonical turn coordinator introduced in Phase 1.
 * When false (the default), Chat.jsx follows the exact Phase 0 legacy path.
 * When true, Chat.jsx uses the canonical V2 turn coordinator.
 *
 * Frozen at module load to prevent accidental runtime mutation.
 * All flags default to false.
 *
 * @type {Readonly<Record<string, boolean>>}
 */
export const CHAT_ORCHESTRATOR_V2_PINNED_PREVIEW_HOST =
  'preview--mindful-path-75aeaf7d.base44.app';

export function isPinnedChatOrchestratorV2PreviewHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  return hostname.trim().toLowerCase() === CHAT_ORCHESTRATOR_V2_PINNED_PREVIEW_HOST;
}

export const CHAT_ORCHESTRATOR_FLAGS = Object.freeze({
  /**
   * Phase 1 — Chat Orchestrator V2 master gate.
   *
   * When false (the default), Chat.jsx follows the exact Phase 0 legacy path.
   * When true, Chat.jsx uses the canonical turn coordinator (chatOrchestratorV2.js).
   *
   * Staging enablement: set the environment variable
   *   VITE_CHAT_ORCHESTRATOR_V2_ENABLED=true
   * in a staging build.  Defaults to false when the variable is absent or
   * set to any other value.
   *
   * Rollback: set VITE_CHAT_ORCHESTRATOR_V2_ENABLED=false (or leave unset).
   *
   * The ?_s2=CHAT_ORCHESTRATOR_V2_ENABLED URL override is supported on preview
   * and staging hosts only (same isolation rules as THERAPIST_UPGRADE_FLAGS).
   */
  CHAT_ORCHESTRATOR_V2_ENABLED: import.meta.env?.VITE_CHAT_ORCHESTRATOR_V2_ENABLED === 'true',

  /**
   * Phase 3 — Deterministic response policy enforcement.
   *
   * When false (the default), no post-generation response-policy enforcement is
   * applied and current behavior is preserved exactly.
   *
   * Staging enablement: set the environment variable
   *   VITE_RESPONSE_POLICY_ENFORCEMENT_ENABLED=true
   * or use the preview-only ?_s2=RESPONSE_POLICY_ENFORCEMENT_ENABLED override.
   *
   * Effective only when THERAPIST_UPGRADE_ENABLED and
   * THERAPIST_UPGRADE_STRATEGY_ENABLED are also enabled.
   */
  RESPONSE_POLICY_ENFORCEMENT_ENABLED: import.meta.env?.VITE_RESPONSE_POLICY_ENFORCEMENT_ENABLED === 'true',

  /**
   * Guard Isolation Audit — Dedup guard polling: SHADOW mode.
   *
   * When true, the dedup guard observes and logs the "subscription-committed
   * skip treated as safe-update rejection" scenario without blocking it.
   * Used for shadow-first rollout validation in staging.
   *
   * Default: false (OFF — legacy behavior preserved).
   *
   * Staging enablement:
   *   VITE_DEDUP_GUARD_POLLING_SHADOW=true
   * or ?_s2=DEDUP_GUARD_POLLING_SHADOW on preview/staging hosts.
   *
   * Rollback: leave unset or set to false.
   * This flag is subordinate to DEDUP_GUARD_POLLING_ENFORCE (ENFORCE wins).
   */
  DEDUP_GUARD_POLLING_SHADOW: import.meta.env?.VITE_DEDUP_GUARD_POLLING_SHADOW === 'true',

  /**
   * Guard Isolation Audit — Dedup guard polling: ENFORCE mode.
   *
   * When true, the dedup guard actively prevents the polling continuation path
   * from treating a deliberate "subscription-committed skip" as a safe-update
   * rejection. Subscription-committed turns are not re-polled.
   *
   * Default: false (OFF — legacy behavior preserved).
   *
   * Staging enablement:
   *   VITE_DEDUP_GUARD_POLLING_ENFORCE=true
   * or ?_s2=DEDUP_GUARD_POLLING_ENFORCE on preview/staging hosts.
   *
   * Rollback: set VITE_DEDUP_GUARD_POLLING_ENFORCE=false (or leave unset).
   *
   * Shadow-first rollout: enable DEDUP_GUARD_POLLING_SHADOW first to confirm
   * the guard fires as expected, then switch to DEDUP_GUARD_POLLING_ENFORCE.
   */
  DEDUP_GUARD_POLLING_ENFORCE: import.meta.env?.VITE_DEDUP_GUARD_POLLING_ENFORCE === 'true',

  /**
   * Guard Isolation Audit — Formulation guard: SHADOW mode (Phase 1).
   *
   * When true, the formulation guard observes and emits provenance logs for
   * each assistant candidate that would have been replaced, but does NOT apply
   * the replacement.  The visible message is the original unguarded response.
   * Used for isolation evidence gathering on staging / preview hosts.
   *
   * Default: false (ENFORCE — existing behavior preserved; replacements applied).
   *
   * Staging enablement:
   *   VITE_FORMULATION_GUARD_SHADOW=true
   * or ?_s2=FORMULATION_GUARD_SHADOW on preview/staging hosts.
   *
   * Rollback: leave unset or set to false.
   * SHADOW takes priority over OFF when both are active.
   * No safety/crisis/unsafe-output control is affected by this flag.
   */
  FORMULATION_GUARD_SHADOW: import.meta.env?.VITE_FORMULATION_GUARD_SHADOW === 'true',

  /**
   * Guard Isolation Audit — Formulation guard: OFF mode (Phase 1).
   *
   * When true, the formulation guard is skipped entirely.  The pipeline
   * behaves as if the guard does not exist; original messages pass through.
   * No provenance is emitted in OFF mode.
   *
   * Default: false (ENFORCE — existing behavior preserved).
   *
   * Staging enablement:
   *   VITE_FORMULATION_GUARD_OFF=true
   * or ?_s2=FORMULATION_GUARD_OFF on preview/staging hosts.
   *
   * Subordinate to FORMULATION_GUARD_SHADOW (SHADOW wins when both are set).
   * No safety/crisis/unsafe-output control is affected by this flag.
   */
  FORMULATION_GUARD_OFF: import.meta.env?.VITE_FORMULATION_GUARD_OFF === 'true',

  /**
   * Guard Isolation Audit — Grounding guard: SHADOW mode (Phase 1).
   *
   * When true, the current-turn grounding guard observes and emits provenance
   * logs for each assistant candidate that would have been replaced, but does
   * NOT apply the replacement.  The visible message is the original response.
   * Used for isolation evidence gathering on staging / preview hosts.
   *
   * Default: false (ENFORCE — existing behavior preserved; replacements applied).
   *
   * Staging enablement:
   *   VITE_GROUNDING_GUARD_SHADOW=true
   * or ?_s2=GROUNDING_GUARD_SHADOW on preview/staging hosts.
   *
   * Rollback: leave unset or set to false.
   * SHADOW takes priority over OFF when both are active.
   * No safety/crisis/unsafe-output control is affected by this flag.
   */
  GROUNDING_GUARD_SHADOW: import.meta.env?.VITE_GROUNDING_GUARD_SHADOW === 'true',

  /**
   * Guard Isolation Audit — Grounding guard: OFF mode (Phase 1).
   *
   * When true, the current-turn grounding guard is skipped entirely.
   * Original messages pass through; no provenance is emitted.
   *
   * Default: false (ENFORCE — existing behavior preserved).
   *
   * Staging enablement:
   *   VITE_GROUNDING_GUARD_OFF=true
   * or ?_s2=GROUNDING_GUARD_OFF on preview/staging hosts.
   *
   * Subordinate to GROUNDING_GUARD_SHADOW (SHADOW wins when both are set).
   * No safety/crisis/unsafe-output control is affected by this flag.
   */
  GROUNDING_GUARD_OFF: import.meta.env?.VITE_GROUNDING_GUARD_OFF === 'true',
});

/**
 * Reads staging-only runtime overrides for Chat Orchestrator flags from the
 * URL query string (?_s2=...).
 *
 * Applies the same isolation rules as _readStagingRuntimeOverrides():
 *   - Only active on explicitly recognised preview/staging hosts.
 *   - Only accepts keys that are recognised CHAT_ORCHESTRATOR_FLAGS names.
 *   - Fail-closed on any error or unrecognised host.
 *
 * @returns {Record<string, boolean>}
 */
function _readChatOrchestratorStagingOverrides() {
  try {
    if (typeof window === 'undefined') return {};
    const hostname = window.location?.hostname ?? '';
    if (!_isPreviewStagingHost(hostname)) return {};
    const search = window.location?.search ?? '';
    if (!search) return {};
    const raw = new URLSearchParams(search).get('_s2');
    if (!raw) return {};
    const overrides = {};
    for (const key of raw.split(',')) {
      const trimmed = key.trim();
      if (trimmed && trimmed in CHAT_ORCHESTRATOR_FLAGS) {
        overrides[trimmed] = true;
      }
    }
    return overrides;
  } catch (_e) {
    return {};
  }
}

const _chatOrchestratorStagingOverrides = _readChatOrchestratorStagingOverrides();

/**
 * Evaluates a Chat Orchestrator feature flag by name.
 *
 * Evaluation order (first truthy wins):
 *   1. Build-time env var.
 *   2. Staging runtime URL override (?_s2=CHAT_ORCHESTRATOR_V2_ENABLED or
 *      ?_s2=RESPONSE_POLICY_ENFORCEMENT_ENABLED) — preview/staging hosts only.
 *
 * Returns false (Phase 0 legacy path) when:
 *   - flagName is not a key in CHAT_ORCHESTRATOR_FLAGS
 *   - The build-time env var is absent or not 'true'
 *   - The staging override is absent or the host is not a preview/staging host
 *
 * @param {string} [flagName='CHAT_ORCHESTRATOR_V2_ENABLED']
 * @returns {boolean}
 */
export function isChatOrchestratorV2Enabled(flagName = 'CHAT_ORCHESTRATOR_V2_ENABLED') {
  if (!(flagName in CHAT_ORCHESTRATOR_FLAGS)) return false;
  if (CHAT_ORCHESTRATOR_FLAGS[flagName] === true) return true;
  if (
    flagName === 'CHAT_ORCHESTRATOR_V2_ENABLED' &&
    typeof window !== 'undefined' &&
    isPinnedChatOrchestratorV2PreviewHost(window.location?.hostname)
  ) return true;
  if (_chatOrchestratorStagingOverrides[flagName] === true) return true;
  return false;
}

/**
 * Returns the current dedup guard polling mode.
 *
 * Evaluation order: ENFORCE wins over SHADOW; both default to OFF.
 *
 *   'ENFORCE' — guard is active: deliberate subscription-committed skips are
 *               NOT treated as safe-update rejections by the polling path.
 *   'SHADOW'  — guard observes and logs but does not block (staging validation).
 *   'OFF'     — guard is inactive; legacy behavior is preserved exactly.
 *
 * Enable via VITE_DEDUP_GUARD_POLLING_ENFORCE / VITE_DEDUP_GUARD_POLLING_SHADOW
 * (or the corresponding ?_s2= URL overrides on preview/staging hosts).
 *
 * @returns {'ENFORCE' | 'SHADOW' | 'OFF'}
 */
export function getDedupGuardPollingMode() {
  if (isChatOrchestratorV2Enabled('DEDUP_GUARD_POLLING_ENFORCE')) return 'ENFORCE';
  if (isChatOrchestratorV2Enabled('DEDUP_GUARD_POLLING_SHADOW')) return 'SHADOW';
  return 'OFF';
}

/**
 * Returns the current formulation guard mode for Phase 1 isolation audit.
 *
 * Evaluation order: SHADOW wins over OFF; both default to ENFORCE.
 *
 *   'ENFORCE' — guard applies replacements (default, behavior-preserving).
 *   'SHADOW'  — guard evaluates and emits provenance but does NOT replace.
 *   'OFF'     — guard is skipped; original messages pass through unchanged.
 *
 * Enable SHADOW via VITE_FORMULATION_GUARD_SHADOW=true
 * or ?_s2=FORMULATION_GUARD_SHADOW on preview/staging hosts.
 *
 * Enable OFF via VITE_FORMULATION_GUARD_OFF=true
 * or ?_s2=FORMULATION_GUARD_OFF on preview/staging hosts.
 *
 * No safety/crisis/unsafe-output control is affected by any mode.
 *
 * @returns {'ENFORCE' | 'SHADOW' | 'OFF'}
 */
export function getFormulationGuardMode() {
  if (isChatOrchestratorV2Enabled('FORMULATION_GUARD_SHADOW')) return 'SHADOW';
  if (isChatOrchestratorV2Enabled('FORMULATION_GUARD_OFF')) return 'OFF';
  return 'ENFORCE';
}

/**
 * Returns the current grounding guard mode for Phase 1 isolation audit.
 *
 * Evaluation order: SHADOW wins over OFF; both default to ENFORCE.
 *
 *   'ENFORCE' — guard applies replacements (default, behavior-preserving).
 *   'SHADOW'  — guard evaluates and emits provenance but does NOT replace.
 *   'OFF'     — guard is skipped; original messages pass through unchanged.
 *
 * Enable SHADOW via VITE_GROUNDING_GUARD_SHADOW=true
 * or ?_s2=GROUNDING_GUARD_SHADOW on preview/staging hosts.
 *
 * Enable OFF via VITE_GROUNDING_GUARD_OFF=true
 * or ?_s2=GROUNDING_GUARD_OFF on preview/staging hosts.
 *
 * No safety/crisis/unsafe-output control is affected by any mode.
 *
 * @returns {'ENFORCE' | 'SHADOW' | 'OFF'}
 */
export function getGroundingGuardMode() {
  if (isChatOrchestratorV2Enabled('GROUNDING_GUARD_SHADOW')) return 'SHADOW';
  if (isChatOrchestratorV2Enabled('GROUNDING_GUARD_OFF')) return 'OFF';
  return 'ENFORCE';
}
