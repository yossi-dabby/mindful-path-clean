/**
 * @file src/lib/workflowContextInjector.js
 *
 * Therapist Upgrade — Stage 2 Phase 3.1 — Workflow Context Injector
 * (Extended in Phase 5 to also inject retrieval orchestration context)
 * (Extended in Phase 6 to also inject live retrieval context)
 * (Extended in Phase 7 to also inject safety mode and emergency resources)
 *
 * This module closes the Phase 3 review gap: the workflow instructions were
 * defined and wired (therapistWorkflowEngine.js + CBT_THERAPIST_WIRING_STAGE2_V2)
 * but were never read and injected into the actual therapist runtime path.
 *
 * WHAT THIS MODULE DOES
 * ---------------------
 * It provides two small, focused functions used at the session-start moment
 * in Chat.jsx:
 *
 *   getWorkflowContextForWiring(wiring)
 *     Returns the pre-built THERAPIST_WORKFLOW_INSTRUCTIONS string when the
 *     supplied wiring has workflow_context_injection === true (i.e. V2 or V3
 *     is active).  Returns null for all other wirings (default path unchanged).
 *
 *   buildSessionStartContent(wiring)
 *     Returns the full [START_SESSION] content string for the given wiring.
 *     For the default path this is exactly '[START_SESSION]' — unchanged.
 *     For the V2 upgraded path this is '[START_SESSION]' with the workflow
 *     instructions appended as a clearly delimited section, so the agent
 *     receives the workflow structure in its context window from the very
 *     first turn.
 *     For the V3 upgraded path (Phase 5) this is '[START_SESSION]' with
 *     the workflow instructions AND the retrieval orchestration instructions
 *     appended as clearly delimited sections.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * When workflow_context_injection is false (or absent) — which covers all
 * default-path wirings (HYBRID, V1, and any unrecognised config) — this
 * module returns exactly '[START_SESSION]' and has zero side-effects.
 * The current therapist path is not affected in any way.
 *
 * SAFETY COMPATIBILITY
 * --------------------
 * The injected workflow and retrieval instructions are additive context.
 * They do NOT replace, weaken, or bypass the existing safety stack
 * (postLlmSafetyFilter, sanitizeAgentOutput, sanitizeConversation,
 * enhancedCrisisDetector, risk panel flow).  The instruction text itself
 * explicitly defers to the existing safety system when a safety signal is
 * present.
 *
 * WHAT THIS MODULE MUST NOT DO
 * ----------------------------
 * - Alter the default therapist path in any way
 * - Make live API calls or network requests
 * - Add session-write or session-tracking side effects
 * - Override existing crisis handling or risk-panel behavior
 * - Weaken any existing safety filter
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 3.1 / Phase 5
 */

import { THERAPIST_WORKFLOW_INSTRUCTIONS, THERAPIST_FORMULATION_INSTRUCTIONS, THERAPIST_PLANNER_FIRST_INSTRUCTIONS, PRECEDENCE_LEVELS, evaluatePlannerPrecedence, isLegacyGateBlocked, LEGACY_GATE_OVERRIDES } from './therapistWorkflowEngine.js';
import { getRetrievalContextForWiring, buildBoundedContextPackage } from './retrievalOrchestrator.js';
import { executeV3BoundedRetrieval } from './v3RetrievalExecutor.js';
import {
  LIVE_RETRIEVAL_POLICY_INSTRUCTIONS,
  buildLiveContextSection,
  LIVE_KNOWLEDGE_SOURCE_TYPE,
} from './liveRetrievalWrapper.js';
import { executeV4BoundedRetrieval } from './v4RetrievalExecutor.js';
import {
  determineSafetyMode,
  getSafetyModeContextForWiring,
  SAFETY_MODE_FAIL_CLOSED_RESULT,
  evaluateRuntimeSafetyMode,
} from './therapistSafetyMode.js';
import { buildEmergencyResourceSection } from './emergencyResourceLayer.js';
import {
  extractMessageSignals,
  scoreDistressTier,
  determineTherapistStrategy,
  extractLTSStrategyInputs, extractResponsePolicyFromStrategyState,
  buildStrategyContextSection,
  buildStrategyDiagnosticSnapshot,
  buildLTSDiagnosticSnapshot,
} from './therapistStrategyEngine.js';
// Wave 5D — Quality Evaluator diagnostic integration (diagnostics-only, no runtime effect).
import { computeEvaluatorDiagnosticSnapshot } from './therapistQualityEvaluator.js';
import { getTherapeuticFormsPolicyPayload } from './therapeuticFormsPolicy.js';
// Formulation-led separation — runtime flag check for V7+ chains.
import { isUpgradeEnabled } from './featureFlags.js';
import { createContextComposerV2 } from './contextComposerV2.js';
// V7 continuity diagnostics (used in buildV7SessionStartContentAsync only).
import { buildCrossSessionContinuityBlockWithDiagnostic, CONTINUITY_FAILURE_REASONS } from './crossSessionContinuity.js';
// Phase 4 — Canonical Therapist Memory Adapter (no longer imports isLTSWarmingUp
// here; that is only used in canonicalTherapistMemoryReader.js).
import { readCanonicalTherapistMemory, buildCanonicalMemoryDiagnosticSnapshot } from './canonicalTherapistMemoryReader.js';
// Phase 4.1 — LTS Reader Contract (leaf module): LTS_READ_RESULTS / isLTSWeak /
// readLTSSnapshotWithDiagnostic sourced from ltsReaderContract.js (no circular import).
// L5 readiness: checkInterventionReadiness (cbtKnowledgePlanner.js) is a leaf module.
import { checkInterventionReadiness } from './cbtKnowledgePlanner.js'; import { extractReadinessSignals } from './readinessSignalReader.js';
import {
  LTS_READ_RESULTS,
  LTS_SNAPSHOT_OVERFETCH_BOUND,
  isLTSWeak,
  readLTSSnapshotWithDiagnostic,
} from './ltsReaderContract.js';
import { readBestFormulationRecordForConversation, readFormulationsForContextBlock } from './formulationRecordSelector.js';


const CONTEXT_COMPOSER_V2_SECTION_ORDER = Object.freeze({
  session_start: 10,
  workflow_instructions: 20,
  retrieval_orchestration: 30,
  live_retrieval_policy: 40,
  retrieved_context: 50,
  live_retrieved_context: 60,
  live_runtime_status: 70,
  safety_mode: 80,
  emergency_resources: 90,
  case_formulation_context: 100,
  formulation_led_instructions: 110,
  cross_session_continuity: 120,
  strategy_guidance: 130,
  precedence_enforcement: 140,
  longitudinal_state_context: 150,
  v10_knowledge_runtime_authority: 155,
  cbt_knowledge_context: 160,
  competence_instructions: 170,
  planner_first_instructions: 180,
  attachment_context_instructions: 190,
  therapeutic_forms_policy: 200,
});

const CONTEXT_COMPOSER_V2_SECTION_PRIORITY = Object.freeze({
  session_start: 1000,
  workflow_instructions: 980,
  retrieval_orchestration: 960,
  live_retrieval_policy: 940,
  retrieved_context: 300,
  live_retrieved_context: 280,
  live_runtime_status: 920,
  safety_mode: 990,
  emergency_resources: 985,
  case_formulation_context: 760,
  formulation_led_instructions: 740,
  cross_session_continuity: 720,
  strategy_guidance: 700,
  precedence_enforcement: 995,
  longitudinal_state_context: 680,
  v10_knowledge_runtime_authority: 995,
  cbt_knowledge_context: 660,
  competence_instructions: 640,
  planner_first_instructions: 970,
  attachment_context_instructions: 620,
  therapeutic_forms_policy: 600,
});

export const V10_KNOWLEDGE_RUNTIME_AUTHORITY_START =
  '=== V10 KNOWLEDGE RUNTIME AUTHORITY — THIS TURN ONLY ===';
export const V10_KNOWLEDGE_RUNTIME_AUTHORITY_END =
  '=== END V10 KNOWLEDGE RUNTIME AUTHORITY ===';

export function buildV10KnowledgeRuntimeAuthority(wiring) {
  if (!wiring || wiring.knowledge_layer_enabled !== true) return '';
  return [
    V10_KNOWLEDGE_RUNTIME_AUTHORITY_START,
    'The application runtime is the only authority allowed to retrieve CBT curriculum knowledge in V10.',
    'Do NOT call retrieveCurriculumUnit and do NOT emit tool-call or function-call markup.',
    'If no bounded CBT knowledge reference follows this block, retrieval is unavailable or the intervention-readiness gate is closed for this turn.',
    'In that case, reply in the session language as ordinary user-facing plain text, remain formulation-first, and do not introduce an exercise, homework, exposure, or technique.',
    'If a bounded reference follows, use only that reference as supporting context and preserve all safety, language, domain, and readiness constraints.',
    V10_KNOWLEDGE_RUNTIME_AUTHORITY_END,
  ].join('\n');
}

function _getContextComposerV2(options) {
  return options?.context_composer_v2 ?? null;
}

function _registerContextComposerSection(options, section) {
  const composer = _getContextComposerV2(options);
  if (!composer) return;
  composer.registerSection(section);
}

function _shouldUseContextComposerV2(wiring, options) {
  if (!wiring || wiring.planner_first_enabled !== true) return false;
  if (options?.disable_context_composer_v2 === true) return false;
  // Narrow runtime-authority override: if the caller has resolved and frozen
  // a composer flag from the runtime snapshot at session-start, honour it.
  // A boolean value here means the caller has already applied authority checks.
  if (typeof options?.runtime_context_composer_v2_override === 'boolean') {
    return options.runtime_context_composer_v2_override;
  }
  // Snapshot-based resolution: if the caller passes the runtime snapshot,
  // resolve authority inline (equivalent to calling resolveRuntimeContextComposerV2Flag).
  if (options?.runtime_snapshot !== undefined) {
    return resolveRuntimeContextComposerV2Flag(wiring, options.runtime_snapshot);
  }
  return isUpgradeEnabled('CONTEXT_COMPOSER_V2_ENABLED');
}

// ─── Runtime authority resolver for Context Composer V2 ──────────────────────

/**
 * Resolves whether Context Composer V2 should be used for a given wiring and
 * runtime flag snapshot.
 *
 * Runtime authority applies only when ALL of the following are true:
 *   1. `wiring.planner_first_enabled === true` (non-V12 wirings cannot activate).
 *   2. A snapshot object is supplied.
 *   3. `snapshot.transport_status === 'available'` and `snapshot.received === true`.
 *   4. `snapshot.flags.THERAPIST_RUNTIME_APPLY_ENABLED === true`.
 *
 * When those conditions are met:
 *   - `THERAPIST_UPGRADE_ENABLED === false` is a hard rollback (`false`).
 *   - Otherwise, `CONTEXT_COMPOSER_V2_ENABLED === true` enables composer.
 *
 * In every other case (snapshot unavailable/unreceived/APPLY=false), the legacy
 * `isUpgradeEnabled('CONTEXT_COMPOSER_V2_ENABLED')` result is preserved.
 *
 * The return value MUST be frozen at session-start and passed to
 * `buildActionFirstDemotedSessionContentAsync` via
 * `options.runtime_context_composer_v2_override`.  A late-arriving snapshot
 * must NOT change the composer choice after it has been resolved.
 *
 * Passing `null` or `undefined` for snapshot is safe: returns the legacy value.
 *
 * @param {object|null} wiring - The effective therapist wiring for the session.
 * @param {object|null|undefined} snapshot - The runtime flag snapshot.
 * @returns {boolean}
 */
export function resolveRuntimeContextComposerV2Flag(wiring, snapshot) {
  return resolveRuntimeContextComposerV2Selection(wiring, snapshot).enabled;
}

export function resolveRuntimeContextComposerV2Selection(wiring, snapshot) {
  if (!wiring || wiring.planner_first_enabled !== true) {
    return Object.freeze({
      enabled: false,
      reason: 'non_planner_wiring',
    });
  }
  if (
    snapshot &&
    snapshot.transport_status === 'available' &&
    snapshot.received === true &&
    snapshot.flags &&
    snapshot.flags['THERAPIST_RUNTIME_APPLY_ENABLED'] === true
  ) {
    if (snapshot.flags['THERAPIST_UPGRADE_ENABLED'] !== true) {
      return Object.freeze({
        enabled: false,
        reason: 'master_off',
      });
    }
    return Object.freeze({
      enabled: snapshot.flags['CONTEXT_COMPOSER_V2_ENABLED'] === true,
      reason: 'runtime_snapshot_applied',
    });
  }
  return Object.freeze({
    enabled: isUpgradeEnabled('CONTEXT_COMPOSER_V2_ENABLED'),
    reason: 'legacy_fallback',
  });
}

function _createContextComposerV2Options(options = {}) {
  if (options?.context_composer_v2) return options;
  const composer = createContextComposerV2();
  return { ...options, context_composer_v2: composer };
}

function _finalizeContextComposerV2(options, fallbackRendered) {
  const composer = _getContextComposerV2(options);
  if (!composer) return null;
  return composer.finalize({ fallbackRendered });
}

function _appendWithComposer(options, base, section) {
  _registerContextComposerSection(options, section);
  if (!section.content || !section.content.trim()) return base;
  return base ? `${base}\n\n${section.content}` : section.content;
}

const THERAPIST_ATTACHMENT_CONTEXT_INSTRUCTIONS = [
'[ATTACHMENT_HANDLING_POLICY]',
'When the current user turn includes attachment metadata, read the attachment context block and use its URL as source material for this turn.',
'Attachment metadata key: metadata.attachment',
'Extract and use: metadata.attachment.url',
'If metadata.attachment.type is "image", briefly acknowledge it and answer the user\'s image question directly; describe only what is visibly grounded in the image URL and do not invent unseen details.',
'If metadata.attachment.type is "pdf", briefly acknowledge it and answer the user\'s document question directly with a short main-chat summary; do not dump raw extraction text.',
'If image/PDF understanding is partial, unclear, or low-confidence, state that clearly and avoid certainty.',
'Keep attachment replies concise, conversational, and non-technical; ask at most one short follow-up only when it helps the next step.',
'Reference document details only when grounded in the provided attachment URL; do not invent unseen content.']
.join('\n');

// ─── Phase 3 — TherapeuticForms library selection instructions ───────────────
//
// These instructions tell the CBT Therapist how to attach an approved form
// from the TherapeuticForms library when the user requests a worksheet or form.
//
// KEY SAFETY RULES (enforced on the client side too):
//   - The AI MUST only use the exact form IDs listed below — never invent IDs.
//   - The AI MUST NOT provide a URL or file path — the client resolves it.
//   - The marker [FORM:form-id] is stripped from visible chat content.
//   - An unapproved or unknown ID produces no card (silently ignored).
//
// The AI instruction format: embed [FORM:form-id] (or [FORM:form-id:lang]) once
// anywhere in the assistant message. The client will:
//   1. Strip the marker from visible content.
//   2. Resolve the approved form from the TherapeuticForms library.
//   3. Attach it as a downloadable file card below the message.

// Audience display order and labels used when building the catalog.
const _FORM_CATALOG_AUDIENCE_ORDER = ['adults', 'older_adults', 'adolescents', 'children'];
const _FORM_CATALOG_AUDIENCE_LABELS = Object.freeze({
  adults:       'Adults',
  older_adults: 'Older Adults',
  adolescents:  'Adolescents (ages 13-17)',
  children:     'Children (ages 6-12)',
});
const _FORM_CATALOG_AUDIENCE_SAFETY_NOTES = Object.freeze({
  adolescents: ' — use ONLY when user is explicitly adolescent/teen',
  children:    ' — use ONLY when user is explicitly a child; all require parent guidance',
});

/**
 * Builds the compact AI-facing form catalog from the approved TherapeuticForms registry.
 *
 * Called at module load time to produce the catalog text injected into the CBT Therapist
 * context.  Accepts the full forms list so the function is pure and test-importable
 * without mocking the registry.
 *
 * Output format per form: [FORM:id]  — Best-available title (category) | shortContentDescriptionHe
 * For Hebrew-only forms, the Hebrew title is used when no English title is present.
 * Forms are grouped by audience with safety notes for child/adolescent audiences.
 * No file URLs are included — the client resolves those from the form ID.
 *
 * @param {readonly object[]} forms  - ALL_FORMS from the TherapeuticForms registry
 * @returns {string}  Compact multi-line catalog, grouped by audience
 */
export function buildTherapistFormCatalog(forms) {
  const approvedForms = forms.filter(f => f.approved === true);
  if (approvedForms.length === 0) {
    return [
      'THERAPEUTIC FORMS AVAILABILITY: no therapeutic forms are currently installed/available.',
      'Do NOT emit [FORM:...] markers.',
      'If a user requests a worksheet/form, state clearly that no therapeutic forms are currently installed/available.',
    ].join('\n');
  }

  // Group by audience
  const byAudience = {};
  for (const form of approvedForms) {
    const aud = form.audience || 'unknown';
    if (!byAudience[aud]) byAudience[aud] = [];
    byAudience[aud].push(form);
  }

  const total = approvedForms.length;
  const audienceCount = Object.keys(byAudience).length;
  const lines = [`CURRENTLY APPROVED FORMS — ${total} forms across ${audienceCount} audiences (use only these exact IDs):`];

  for (const audience of _FORM_CATALOG_AUDIENCE_ORDER) {
    const audienceForms = byAudience[audience];
    if (!audienceForms || audienceForms.length === 0) continue;

    const label = _FORM_CATALOG_AUDIENCE_LABELS[audience] || audience;
    const safetyNote = _FORM_CATALOG_AUDIENCE_SAFETY_NOTES[audience] || '';
    lines.push('');
    lines.push(`[${label}${safetyNote}]`);
    for (const form of audienceForms) {
      // Use best available title: English > Hebrew > form ID
      const bestTitle = form.languages?.en?.title || form.languages?.he?.title || form.title || form.id;
      const therapeuticGoalRaw = form.therapeuticGoal || form.therapeutic_goal;
      const whenToUseRaw = form.whenToUse || form.when_to_use;
      const keywordsRaw = Array.isArray(form.clinicalKeywords) ? form.clinicalKeywords : (Array.isArray(form.keywords) ? form.keywords : []);
      const therapeuticGoal = typeof therapeuticGoalRaw === 'string' ? therapeuticGoalRaw.trim() : '';
      const whenToUse = typeof whenToUseRaw === 'string' ? whenToUseRaw.trim() : '';
      const clinicalKeywords = keywordsRaw.filter(Boolean).join(', ');
      const intentPhrases = Array.isArray(form.intentPhrases) ? form.intentPhrases.filter(Boolean).join(' | ') : '';
      const notFor = Array.isArray(form.notFor) ? form.notFor.filter(Boolean).join('; ') : '';
      const desc = form.shortContentDescriptionHe ? ` | ${form.shortContentDescriptionHe}` : '';
      lines.push(`  [FORM:${form.id}]  — ${bestTitle} (${form.category})${desc}`);
      if (therapeuticGoal) lines.push(`    Goal: ${therapeuticGoal}`);
      if (whenToUse) lines.push(`    When to use: ${whenToUse}`);
      if (clinicalKeywords) lines.push(`    Clinical keywords: ${clinicalKeywords}`);
      if (intentPhrases) lines.push(`    Intent phrases: ${intentPhrases}`);
      if (notFor) lines.push(`    Not for: ${notFor}`);
    }
  }

  return lines.join('\n');
}

function buildTherapistFormLibraryInstructions(forms) {
  if (!Array.isArray(forms) || forms.filter((f) => f?.approved === true).length === 0) {
    return [
      '[THERAPEUTIC_FORMS_POLICY]',
      'No therapeutic forms are currently installed/available.',
      'When a user requests a worksheet, CBT form, thought record, mood tracker, homework sheet, or similar structured exercise, do NOT attach a form.',
      '',
      'Do NOT embed [FORM:...] markers while the catalog is empty.',
      'Reply with a short, clear explanation that no therapeutic forms are currently installed/available.',
      '',
      buildTherapistFormCatalog(forms || []),
      '',
      'Language: Keep the user response in the session language when explaining that forms are unavailable.',
      '',
      'RULES:',
      '  - State clearly: no therapeutic forms are currently installed/available.',
      '  - Do not invent form IDs, file names, URLs, catalogs, or attachments.',
      '  - Do not claim forms exist in any audience/category while catalog is empty.',
      '  - Do not use forms as a substitute for crisis or safety handling.',
      '  - Existing safety-handling, crisis flow, and clinical boundaries are not affected by this policy.',
    ].join('\n');
  }

  return [
    '[THERAPEUTIC_FORMS_POLICY]',
    'Therapeutic forms are available only from the approved catalog below.',
    'When a user requests a workbook/form, use exact [FORM:form-id] marker(s) from the approved list. Default to one marker for specific requests; for explicit multi-form/module/stage-all requests, use up to 5 markers.',
    '',
    buildTherapistFormCatalog(forms),
    '',
    'LANGUAGE & AUDIENCE RULES:',
    '  - Match active session language first. Do not attach forms from another language unless the user explicitly asks for that language.',
    '  - Match user audience. Do not attach child/adult/older-adult forms for adolescent requests, and vice versa.',
    '  - If the requested language/audience/category is not currently installed, say it is not currently installed.',
    '  - If forms exist but no exact match is found, say no exact match and suggest nearby matches; do not claim no access to forms.',
    '',
    'SAFETY RULES:',
    '  - Do not invent form IDs, file names, URLs, catalogs, or attachments.',
    '  - Do not return forms that are not listed in the approved catalog.',
    '  - Do not use forms as a substitute for crisis or safety handling.',
    '  - Existing safety-handling, crisis flow, and clinical boundaries are not affected by this policy.',
  ].join('\n');
}

function getTherapistFormLibraryInstructions(options = {}) {
  return getTherapeuticFormsPolicyPayload({
    sessionLanguage: options?.sessionLanguage,
    sessionAudience: options?.sessionAudience,
    environment: options?.environment,
  }).policy;
}

/**
 * Returns the workflow context instructions string when the supplied wiring
 * has the workflow_context_injection flag set to true.
 *
 * This is the gating function for Phase 3.1 runtime injection.  It reads
 * the wiring's own flag rather than evaluating the feature-flag registry
 * directly, so that the injection decision is always consistent with the
 * wiring that was already resolved by resolveTherapistWiring().
 *
 * @param {object} wiring - The active therapist wiring config object
 * @returns {string|null} THERAPIST_WORKFLOW_INSTRUCTIONS when the wiring
 *   has workflow_context_injection === true; null otherwise.
 */
export function getWorkflowContextForWiring(wiring) {
  if (wiring && wiring.workflow_context_injection === true) {
    return THERAPIST_WORKFLOW_INSTRUCTIONS;
  }
  return null;
}

/**
 * Builds the session-start message content for the given wiring.
 *
 * Default path (workflow_context_injection absent or false):
 *   Returns exactly '[START_SESSION]' — unchanged from current behavior.
 *
 * Upgraded V2 path (workflow_context_injection === true):
 *   Returns '[START_SESSION]' with the workflow context instructions
 *   appended as a clearly delimited section.  The '[START_SESSION]' token
 *   is preserved at the start so the existing agent-side session-start
 *   handling continues to work exactly as before.  The appended workflow
 *   instructions arrive in the agent's context window on the first turn,
 *   making the upgraded workflow path real and verifiable.
 *
 * Upgraded V3 path (Phase 5 — workflow_context_injection AND
 * retrieval_orchestration_enabled both true):
 *   Returns '[START_SESSION]' with both the workflow context instructions
 *   AND the retrieval orchestration instructions appended as clearly
 *   delimited sections.  The '[START_SESSION]' token and the workflow
 *   section are identical to V2.  The retrieval section is the additive
 *   Phase 5 contribution.
 *
 * @param {object} wiring - The active therapist wiring config object
 * @returns {string} The session-start message content
 */
export function buildSessionStartContent(wiring, options = {}) {
  let content = '[START_SESSION]';
  _registerContextComposerSection(options, {
    id: 'session_start',
    order: CONTEXT_COMPOSER_V2_SECTION_ORDER.session_start,
    retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.session_start,
    required: true,
    source_layer: 'v2_base',
    content,
  });

  const workflowContext = getWorkflowContextForWiring(wiring);
  if (workflowContext) {
    content = _appendWithComposer(options, content, {
      id: 'workflow_instructions',
      order: CONTEXT_COMPOSER_V2_SECTION_ORDER.workflow_instructions,
      retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.workflow_instructions,
      required: true,
      source_layer: 'v2_workflow',
      content: workflowContext,
    });
  }

  const retrievalContext = getRetrievalContextForWiring(wiring);
  if (retrievalContext) {
    content = _appendWithComposer(options, content, {
      id: 'retrieval_orchestration',
      order: CONTEXT_COMPOSER_V2_SECTION_ORDER.retrieval_orchestration,
      retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.retrieval_orchestration,
      required: true,
      source_layer: 'v3_retrieval',
      content: retrievalContext,
    });
  }

  return content;
}

/**
 * Builds the session-start message content for the V3 upgraded path,
 * executing real bounded retrieval against app data and injecting a
 * retrieved context package alongside the orchestration instructions.
 *
 * This is the Phase 5.1 completion of buildSessionStartContent for V3.
 * It replaces the gap where V3 received only retrieval instructions (text)
 * but no actual retrieved data.  After Phase 5.1, V3 receives both:
 *   1. The orchestration instructions (from Phase 5 — unchanged)
 *   2. A real bounded retrieved context package built from app data
 *
 * For all non-V3 wirings (HYBRID, V1, V2, null, undefined):
 *   Returns exactly the same result as buildSessionStartContent(wiring).
 *   No retrieval is executed.  Default path is completely unchanged.
 *
 * For V3 (retrieval_orchestration_enabled === true):
 *   1. Builds the base session-start content (instructions + orchestration
 *      instructions) as before.
 *   2. Executes real bounded retrieval against app entity stores in the
 *      required internal-first order (therapist_memory → session_context →
 *      internal_knowledge → external_knowledge).
 *   3. Builds a bounded context package from the retrieved items using
 *      buildBoundedContextPackage() (same function as Phase 5 tests verify).
 *   4. If the context package is non-empty, appends it to the session-start
 *      content as a clearly delimited section.
 *
 * FAIL-OPEN CONTRACT
 * ------------------
 * If retrieval fails entirely (entities unavailable, network error, etc.),
 * this function returns the base session-start content unchanged — the
 * orchestration instructions remain present, but the retrieved context
 * package is simply absent.  Session start is never blocked.
 *
 * @param {object} wiring   - The active therapist wiring config object
 * @param {object} entities - Base44 entity client map (e.g. base44.entities)
 * @param {object} [options] - Session options
 * @param {string} [options.locale] - Active app locale for exact-language Resource retrieval
 * @returns {Promise<string>} The session-start message content
 */
export async function buildV3SessionStartContentAsync(wiring, entities, options = {}) {
  // Build the base content (same as the synchronous version)
  const baseContent = buildSessionStartContent(wiring, options);

  // Only V3 gets real retrieval execution — all other wirings are unchanged
  if (!wiring || wiring.retrieval_orchestration_enabled !== true) {
    return baseContent;
  }

  // Execute real bounded retrieval against app entity stores
  let retrievalResult;
  try {
    retrievalResult = await executeV3BoundedRetrieval(
      entities ?? {},
      undefined,
      { locale: options.locale },
    );
  } catch {
    // Fail-open: retrieval execution failed — return base content without context package
    return baseContent;
  }

  // Build the bounded context package from real retrieved items
  let contextPackage;
  try {
    contextPackage = buildBoundedContextPackage(retrievalResult.items);
  } catch {
    // Fail-open: package assembly failed — return base content
    return baseContent;
  }

  // Inject the real context package only if it contains actual data
  if (!contextPackage || !contextPackage.trim()) {
    return baseContent;
  }

  return (
    baseContent +
    '\n\n=== RETRIEVED CONTEXT ===\n' +
    contextPackage +
    '\n=== END RETRIEVED CONTEXT ==='
  );
}

// ─── Phase 6 — V4 live retrieval context accessor ────────────────────────────

/**
 * Returns the Phase 6 live retrieval policy instructions string when the
 * supplied wiring has live_retrieval_enabled set to true.
 *
 * This is the gating function for Phase 6 runtime injection of the live
 * retrieval policy section.  It reads the wiring's own flag rather than
 * evaluating the feature-flag registry directly, so the injection decision
 * is always consistent with the wiring already resolved by
 * resolveTherapistWiring().
 *
 * For all wirings without live_retrieval_enabled === true (which includes
 * HYBRID, V1, V2, V3, and any unrecognised config), this function returns
 * null — the current therapist path is completely unchanged.
 *
 * @param {object} wiring - The active therapist wiring config object
 * @returns {string|null} LIVE_RETRIEVAL_POLICY_INSTRUCTIONS for V4; null otherwise
 */
export function getLiveRetrievalContextForWiring(wiring) {
  if (wiring && wiring.live_retrieval_enabled === true) {
    return LIVE_RETRIEVAL_POLICY_INSTRUCTIONS;
  }
  return null;
}

// ─── Phase 6b — V4 live retrieval runtime status block ───────────────────────

/**
 * Bounded enum of live_status_reason values for the V4 runtime status block.
 *
 * These values mirror the live_skip_reason values returned by
 * executeV4BoundedRetrieval, plus 'injected' (success with content) and
 * 'unknown' (fallback for any unrecognised value).
 *
 * @type {Readonly<Record<string, string>>}
 */
export const LIVE_STATUS_REASONS = Object.freeze({
  FLAG_OFF: 'flag_off',
  NO_URL: 'no_url',
  NO_CLIENT: 'no_client',
  INTERNAL_SUFFICIENT: 'internal_sufficient',
  V3_FAILED: 'v3_failed',
  LIVE_RETRIEVAL_ERROR: 'live_retrieval_error',
  BLOCKED: 'blocked',
  NO_LIVE_CONTENT: 'no_live_content',
  INJECTED: 'injected',
  UNKNOWN: 'unknown',
});

/**
 * Builds a deterministic V4 live retrieval runtime status instruction block.
 *
 * The block is derived from the ACTUAL V4RetrievalResult — not from the
 * frontend feature flag or wiring alone.  It accurately reports:
 *
 *   verified_live_context_injected: true | false
 *   live_retrieval_attempted:       true | false
 *   live_retrieval_blocked:         true | false
 *   live_status_reason:             a bounded LIVE_STATUS_REASONS value
 *
 * When verified_live_context_injected is false, an explicit behavioral
 * instruction is included that prohibits the model from claiming browsing,
 * search, or fetch capability for the current session.
 *
 * When verified_live_context_injected is true, an explicit behavioral
 * instruction is included that restricts the model to the supplied live
 * context and prohibits claims of general or ongoing browsing capability.
 *
 * This block is appended AFTER the live context section (if any) so that
 * it acts as the authoritative, result-derived behavioral instruction and
 * overrides any implicit capability claims in the policy preamble.
 *
 * NULL SAFETY: accepts null / undefined result — treats it as a failed
 * retrieval (no verified live context, live_status_reason: v3_failed).
 *
 * This function never throws.
 *
 * @param {object | null | undefined} v4Result - The V4RetrievalResult object
 * @returns {string} The formatted runtime status instruction block
 */
export function buildV4RuntimeStatusBlock(v4Result) {
  // Derive verified_live_context_injected from actual live items in the result
  const liveItems = Array.isArray(v4Result?.items)
    ? v4Result.items.filter(
        (item) =>
          item &&
          item.source_type === LIVE_KNOWLEDGE_SOURCE_TYPE &&
          item.content,
      )
    : [];
  const verifiedLiveContextInjected = liveItems.length > 0;

  const liveAttempted = v4Result?.live_attempted === true;
  const liveBlocked = v4Result?.live_blocked === true;

  // Map the raw skip/block reason to a bounded enum value
  let liveStatusReason;
  if (verifiedLiveContextInjected) {
    liveStatusReason = LIVE_STATUS_REASONS.INJECTED;
  } else {
    const rawReason =
      typeof v4Result?.live_skip_reason === 'string'
        ? v4Result.live_skip_reason
        : '';
    const knownReasons = Object.values(LIVE_STATUS_REASONS);
    if (rawReason && knownReasons.includes(rawReason)) {
      liveStatusReason = rawReason;
    } else if (rawReason) {
      liveStatusReason = LIVE_STATUS_REASONS.UNKNOWN;
    } else {
      liveStatusReason = LIVE_STATUS_REASONS.V3_FAILED;
    }
  }

  const behavioralInstruction = verifiedLiveContextInjected
    ? [
        '[BEHAVIORAL INSTRUCTION — REQUIRED]',
        'Verified live context has been supplied in this session (see LIVE RETRIEVED CONTEXT section above).',
        'Use only the supplied live context. Do not claim general or ongoing browsing capability.',
        'Do not promise to retrieve additional live information during later turns',
        'unless a new verified retrieval result is explicitly supplied in the context.',
      ].join('\n')
    : [
        '[BEHAVIORAL INSTRUCTION — REQUIRED]',
        'No verified live context was supplied in this session.',
        'Do not claim that you can browse, search, fetch, or verify information online',
        'in this session. Do not offer to perform a future search.',
        'State only that no verified live context was supplied.',
        'Your response must be based on internal app context and stored therapeutic memory only.',
      ].join('\n');

  return [
    '=== V4 LIVE RETRIEVAL RUNTIME STATUS ===',
    '',
    `verified_live_context_injected: ${verifiedLiveContextInjected}`,
    `live_retrieval_attempted: ${liveAttempted}`,
    `live_retrieval_blocked: ${liveBlocked}`,
    `live_status_reason: ${liveStatusReason}`,
    '',
    behavioralInstruction,
    '',
    '=== END V4 LIVE RETRIEVAL RUNTIME STATUS ===',
  ].join('\n');
}

/**
 * Builds the session-start message content for the V4 upgraded path,
 * executing real bounded retrieval (sources 1–4 from Phase 5 + conditional
 * live retrieval from Phase 6) and injecting retrieved context alongside
 * the orchestration and live retrieval policy instructions.
 *
 * For all non-V4 wirings (HYBRID, V1, V2, V3, null, undefined):
 *   Delegates to buildV3SessionStartContentAsync(wiring, entities) and
 *   returns exactly the same result.  The default path is completely unchanged.
 *
 * For V4 (live_retrieval_enabled === true):
 *   1. Builds the base session-start content (including Phase 5 instructions)
 *      as V3 would.
 *   2. Appends the Phase 6 live retrieval policy instructions section.
 *   3. Executes V4 bounded retrieval:
 *      (a) V3 sources 1–4 (internal-first)
 *      (b) Live source 5 conditionally (only when internal sources are
 *          insufficient and options.liveRetrievalAllowed is true)
 *   4. Builds and appends the internal context package (sources 1–4).
 *   5. Builds and appends the live context section (source 5, if any).
 *
 * FAIL-OPEN CONTRACT (internal retrieval)
 * ----------------------------------------
 * Same as buildV3SessionStartContentAsync: session start is never blocked
 * by internal retrieval failure.
 *
 * FAIL-CLOSED CONTRACT (live retrieval)
 * ---------------------------------------
 * Live retrieval failure returns no live context — the session continues with
 * internal sources only.  No exception propagates.
 *
 * @param {object} wiring       - The active therapist wiring config object
 * @param {object} entities     - Base44 entity client map (e.g. base44.entities)
 * @param {object|null} baseClient - Full base44 client (for live retrieval via
 *                                   base44.functions.invoke); null disables live retrieval
 * @param {object} [options]    - Options for Phase 6 live retrieval
 * @param {boolean} [options.liveRetrievalAllowed=false] - Whether live retrieval is allowed
 * @param {string}  [options.liveRetrievalUrl]            - URL to query for live retrieval
 * @param {string}  [options.liveRetrievalQuery]          - Optional query context
 * @param {string}  [options.locale]                      - Active app locale for exact-language Resource retrieval
 * @returns {Promise<string>} The session-start message content
 */
export async function buildV4SessionStartContentAsync(
  wiring,
  entities,
  baseClient,
  options = {},
) {
  // For non-V4 wirings: delegate to V3 (no change to behavior)
  if (!wiring || wiring.live_retrieval_enabled !== true) {
    return buildV3SessionStartContentAsync(wiring, entities, options);
  }

  // ── V4 path ────────────────────────────────────────────────────────────────

  // Step 1: Build the Phase 5 base content (workflow + retrieval orchestration instructions)
  const phase5Base = buildSessionStartContent(wiring, options);

  // Step 2: Append the Phase 6 live retrieval policy instructions
  const livePolicy = getLiveRetrievalContextForWiring(wiring);
  const contentWithLivePolicy = livePolicy
    ? _appendWithComposer(options, phase5Base, {
        id: 'live_retrieval_policy',
        order: CONTEXT_COMPOSER_V2_SECTION_ORDER.live_retrieval_policy,
        retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.live_retrieval_policy,
        required: true,
        source_layer: 'v4_live_policy',
        content: livePolicy,
      })
    : phase5Base;

  // Step 3: Execute V4 bounded retrieval (sources 1–4 + conditional source 5)
  let v4Result;
  try {
    v4Result = await executeV4BoundedRetrieval(
      entities ?? {},
      baseClient ?? null,
      {
        liveRetrievalAllowed: options.liveRetrievalAllowed ?? false,
        liveRetrievalUrl: options.liveRetrievalUrl ?? '',
        liveRetrievalQuery: options.liveRetrievalQuery ?? '',
        locale: options.locale,
      },
    );
  } catch {
    // Fail-open: V4 retrieval entirely failed — return content with no-context runtime status
    let failedContent = contentWithLivePolicy;
    try {
      failedContent = _appendWithComposer(options, failedContent, {
        id: 'live_runtime_status',
        order: CONTEXT_COMPOSER_V2_SECTION_ORDER.live_runtime_status,
        retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.live_runtime_status,
        required: true,
        source_layer: 'v4_runtime_status',
        content: buildV4RuntimeStatusBlock(null),
      });
    } catch {
      // Ignore — never block session start
    }
    return failedContent;
  }

  // Step 4: Build the internal context package from sources 1–4
  const internalItems = (v4Result.items ?? []).filter(
    (item) => item && item.source_type !== LIVE_KNOWLEDGE_SOURCE_TYPE,
  );

  let internalContextPackage = '';
  try {
    internalContextPackage = buildBoundedContextPackage(internalItems);
  } catch {
    internalContextPackage = '';
  }

  // Step 5: Build the live context section from source 5
  const liveItems = (v4Result.items ?? []).filter(
    (item) => item && item.source_type === LIVE_KNOWLEDGE_SOURCE_TYPE,
  );

  let liveContextSection = '';
  try {
    liveContextSection = buildLiveContextSection(liveItems);
  } catch {
    liveContextSection = '';
  }

  // Assemble the final content
  let result = contentWithLivePolicy;

  if (internalContextPackage && internalContextPackage.trim()) {
    result = _appendWithComposer(options, result, {
      id: 'retrieved_context',
      order: CONTEXT_COMPOSER_V2_SECTION_ORDER.retrieved_context,
      retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.retrieved_context,
      required: false,
      source_layer: 'v4_internal_retrieval',
      content: '=== RETRIEVED CONTEXT ===\n' + internalContextPackage + '\n=== END RETRIEVED CONTEXT ===',
    });
  }

  if (liveContextSection && liveContextSection.trim()) {
    result = _appendWithComposer(options, result, {
      id: 'live_retrieved_context',
      order: CONTEXT_COMPOSER_V2_SECTION_ORDER.live_retrieved_context,
      retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.live_retrieved_context,
      required: false,
      source_layer: 'v4_live_retrieval',
      content: liveContextSection,
    });
  }

  // Step 6: Append the V4 runtime status block (derived from actual result)
  // This block provides authoritative behavioral instructions based on whether
  // verified live context was actually injected.  It overrides any implicit
  // capability claims from the policy preamble.
  try {
    const runtimeStatusBlock = buildV4RuntimeStatusBlock(v4Result);
    if (runtimeStatusBlock && runtimeStatusBlock.trim()) {
      result = _appendWithComposer(options, result, {
        id: 'live_runtime_status',
        order: CONTEXT_COMPOSER_V2_SECTION_ORDER.live_runtime_status,
        retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.live_runtime_status,
        required: true,
        source_layer: 'v4_runtime_status',
        content: runtimeStatusBlock,
      });
    }
  } catch {
    // Ignore — never block session start
  }

  return result;
}

// ─── Phase 7 — V5 safety mode context accessor ───────────────────────────────

/**
 * Builds the session-start message content for the V5 upgraded path,
 * executing real bounded retrieval (same as V4) and additionally evaluating
 * safety mode entry conditions.  When safety mode is active, SAFETY_MODE_INSTRUCTIONS
 * and the emergency resource section are injected into the session context.
 *
 * For all non-V5 wirings (HYBRID, V1, V2, V3, V4, null, undefined):
 *   Delegates to buildV4SessionStartContentAsync(wiring, entities, baseClient,
 *   options) and returns exactly the same result.  The default path is completely
 *   unchanged.
 *
 * For V5 (safety_mode_enabled === true):
 *   1. Builds the V4 base content (workflow + retrieval + live policy + context).
 *   2. Evaluates safety mode entry conditions using determineSafetyMode().
 *   3. If safety mode is active: appends SAFETY_MODE_INSTRUCTIONS.
 *   4. If safety mode is active: appends the emergency resource section for
 *      the resolved locale.
 *
 * FAIL-CLOSED CONTRACT (safety mode)
 * ------------------------------------
 * If safety mode determination throws, this function treats the result as
 * SAFETY_MODE_FAIL_CLOSED_RESULT (safety mode ON) — consistent with the
 * fail-closed contract defined in therapistSafetyMode.js.
 *
 * PRIVACY
 * -------
 * message_text (if provided in options) is passed to determineSafetyMode()
 * for in-memory pattern matching only.  It is never stored or logged.
 *
 * @param {object} wiring       - The active therapist wiring config object
 * @param {object} entities     - Base44 entity client map (e.g. base44.entities)
 * @param {object|null} baseClient - Full base44 client (for live retrieval)
 * @param {object} [options]    - Options for V5 behavior
 * @param {boolean} [options.liveRetrievalAllowed=false]  - Whether live retrieval is allowed
 * @param {string}  [options.liveRetrievalUrl]            - URL for live retrieval
 * @param {string}  [options.liveRetrievalQuery]          - Optional query context
 * @param {boolean} [options.crisis_signal=false]         - Crisis signal from existing stack
 * @param {boolean} [options.low_retrieval_confidence=false] - Low retrieval confidence
 * @param {boolean} [options.allowlist_rejection=false]   - Allowlist rejection from Phase 6
 * @param {boolean} [options.flag_override=false]         - Explicit safety mode override
 * @param {string}  [options.message_text]                - Current user message (for pattern matching)
 * @param {string}  [options.locale]                      - User locale for emergency resources
 * @returns {Promise<string>} The session-start message content
 */
export async function buildV5SessionStartContentAsync(
  wiring,
  entities,
  baseClient,
  options = {},
) {
  // For non-V5 wirings: delegate to V4 (no change to behavior)
  if (!wiring || wiring.safety_mode_enabled !== true) {
    return buildV4SessionStartContentAsync(wiring, entities, baseClient, options);
  }

  // ── V5 path ────────────────────────────────────────────────────────────────

  // Step 1: Build the V4 base content (same as V4 path)
  const v4Base = await buildV4SessionStartContentAsync(
    wiring,
    entities,
    baseClient,
    options,
  );

  // Step 2: Evaluate safety mode entry conditions (fail-closed)
  let safetyResult;
  try {
    safetyResult = determineSafetyMode({
      crisis_signal: options.crisis_signal ?? false,
      low_retrieval_confidence: options.low_retrieval_confidence ?? false,
      allowlist_rejection: options.allowlist_rejection ?? false,
      flag_override: options.flag_override ?? false,
      message_text: options.message_text ?? '',
    });
  } catch {
    // Fail-closed: if determination throws, default to safety mode
    safetyResult = SAFETY_MODE_FAIL_CLOSED_RESULT;
  }

  // Step 3: Inject safety mode instructions if active
  const safetyContext = getSafetyModeContextForWiring(wiring, safetyResult);
  if (!safetyContext) {
    // Safety mode not active — return V4 base content unchanged
    return v4Base;
  }

  let result = _appendWithComposer(options, v4Base, {
    id: 'safety_mode',
    order: CONTEXT_COMPOSER_V2_SECTION_ORDER.safety_mode,
    retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.safety_mode,
    required: true,
    source_layer: 'v5_safety',
    content: safetyContext,
  });

  // Step 4: Inject emergency resources when safety mode is active
  try {
    const resourceSection = buildEmergencyResourceSection(options.locale ?? null);
    if (resourceSection && resourceSection.trim()) {
      result = _appendWithComposer(options, result, {
        id: 'emergency_resources',
        order: CONTEXT_COMPOSER_V2_SECTION_ORDER.emergency_resources,
        retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.emergency_resources,
        required: true,
        source_layer: 'v5_safety',
        content: resourceSection,
      });
    }
  } catch {
    // Emergency resource injection failure must never block the session
  }

  return result;
}

// ─── Phase 7.1 — Per-turn runtime safety supplement ──────────────────────────

/**
 * Builds the per-turn safety mode supplement for the V5 upgraded path.
 *
 * This function is called once per user turn (not only at session-start)
 * after the existing HARD_STOP crisis detectors (Layer 1 regex and Layer 2 LLM)
 * have passed without triggering.
 *
 * The supplement — when non-null — is prepended to the user message content
 * so that the LLM receives the safety constraints alongside the user's message
 * for this specific turn.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * - Returns null immediately for any wiring without safety_mode_enabled === true.
 * - The default therapist path (HYBRID) is always unaffected.
 * - Returns null when no distress patterns are detected in the message.
 *
 * PRECEDENCE
 * ----------
 * This function is called in Chat.jsx as Layer 3 — AFTER the HARD_STOP
 * layers (Layer 1 regex crisis detector, Layer 2 LLM crisis detector) have
 * passed.  The HARD_STOP layers are authoritative; this layer operates only
 * when they did not block the message.
 *
 * FAIL-SAFE
 * ---------
 * This function never throws.  Returns null on any unexpected error, ensuring
 * the message send is never blocked by the safety supplement computation.
 *
 * @param {object|null|undefined} wiring   - The active therapist wiring config
 * @param {string|null|undefined} messageText - The user's current turn message
 * @param {string|null|undefined} locale    - BCP-47 locale code for resources
 * @returns {string|null} Safety mode supplement to prepend, or null if inactive
 */
export function buildRuntimeSafetySupplement(wiring, messageText, locale) {
  try {
    // Guard: only active for V5 wiring (safety_mode_enabled === true)
    // Returns null for HYBRID, V1, V2, V3, V4, null, undefined, or any
    // wiring without safety_mode_enabled === true.
    if (!wiring || wiring.safety_mode_enabled !== true) {
      return null;
    }

    // Per-turn runtime evaluation: only uses message text (no session signals)
    const safetyResult = evaluateRuntimeSafetyMode(messageText);

    if (!safetyResult || !safetyResult.safety_mode) {
      // No distress pattern detected in this message — no supplement needed
      return null;
    }

    // Safety mode is active for this turn — build the supplement
    const safetyContext = getSafetyModeContextForWiring(wiring, safetyResult);
    if (!safetyContext) {
      return null;
    }

    let supplement = safetyContext;

    // Append emergency resources (locale-specific, pre-stored, non-LLM)
    try {
      const resourceSection = buildEmergencyResourceSection(locale ?? null);
      if (resourceSection && resourceSection.trim()) {
        supplement += '\n\n' + resourceSection;
      }
    } catch {
      // Emergency resource failure must never block the supplement
    }

    return supplement;
  } catch (_e) {
    // Fail-safe: never throw, never block the message send
    return null;
  }
}

// ─── Phase 10b — Per-turn formulation-deepening supplement ───────────────────

/**
 * Bounded set of formulation-deepening signal patterns.
 *
 * Covers the exact production Hebrew message and natural English equivalents.
 * Does NOT attempt sentiment classification or broad NLP pattern matching.
 * Each entry must match an explicit, unambiguous formulation-deepening intent.
 *
 * Signals intentionally cover only explicit requests for formulation-level
 * deepening. Generic understanding requests, tension questions, and no-exercise
 * pacing requests do not activate this supplement by themselves.
 *
 * @private
 */
const _FORMULATION_DEEPENING_SIGNALS = Object.freeze([
  // Hebrew — what is missing from the formulation
  /מה.*חסר.*בפורמולצי/i,
  /חסר.*בפורמולצי/i,
  /פורמולצי.*חסר/i,
  // Hebrew — explicit deeper-pattern examination request
  /(?:תעזור|תעזרי|עזור|עזרי|בוא|בואי).*(?:לבחון|נבחן).*(?:הדפוס|דפוס).*(?:העמוק|עמוק)/i,
  /(?:דפוס|הדפוס).*(?:העמוק|עמוק).*(?:לבחון|נבחן)/i,

  // English — what is missing from the formulation
  /what\s+(?:is|'?s)\s+missing\s+from\s+(?:the\s+)?formulation/i,
  /missing\s+from\s+(?:the\s+)?formulation/i,
  // English — explicit deeper-pattern examination request
  /help\s+me\s+examin(?:e|ing)\s+(?:the\s+)?deeper\s+pattern/i,
  /let'?s\s+examin(?:e|ing)\s+(?:the\s+)?deeper\s+pattern/i,
]);

/**
 * Returns true if the message explicitly asks for no exercise this turn.
 *
 * @param {string|null|undefined} text
 * @returns {boolean}
 * @private
 */
function _requestsNoExercise(text) {
  if (!text || typeof text !== 'string') return false;
  return (
    /אל.*(?:תתן|תציע|תיתן).*תרגיל/i.test(text) ||
    /תרגיל.*עדיין/i.test(text) ||
    /עדיין.*(?:לא|אל).*תרגיל/i.test(text) ||
    /don'?t\s+(?:give|suggest|provide)\s+(?:me\s+)?(?:an?\s+)?exercise/i.test(text) ||
    /no\s+exercise\s+yet/i.test(text)
  );
}

/**
 * Returns true when the message text contains at least one explicit
 * formulation-deepening signal from the bounded set.
 *
 * Pure; deterministic; never throws; does not store or log the message text.
 *
 * @param {string|null|undefined} text
 * @returns {boolean}
 * @private
 */
function _isFormulationDeepeningRequest(text) {
  if (!text || typeof text !== 'string') return false;
  for (const pattern of _FORMULATION_DEEPENING_SIGNALS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

/**
 * Builds the per-turn formulation-deepening instruction string.
 *
 * Rule 7 (no exercise) is added only when the message explicitly requests it.
 *
 * @param {boolean} noExercise - True when the user asked for no exercise this turn
 * @returns {string}
 * @private
 */
function _buildFormulationDeepeningInstruction(noExercise) {
  const lines = [
    '=== FORMULATION DEEPENING — THIS TURN ONLY ===',
    '',
    'The person is explicitly asking for deeper formulation insight. Apply the following for this response only:',
    '',
    '1. The current user message is the primary semantic anchor for this turn.',
    '2. Prior formulation or historical context may be used only as a tentative hypothesis, never as established fact for this turn.',
    '3. Never present an inference as something the user already said. Keep observed facts and interpretations explicitly separate.',
    '4. Do not move from the current event-level problem to identity, worth, relationship meaning, or deeper personal meaning unless there is clear current-turn evidence.',
    '5. If a deeper hypothesis is introduced, keep it tentative and ask at most one collaborative question grounded in the concrete event described in the current message.',
    '6. If current-turn evidence is insufficient, state that the meaning is still unknown instead of filling gaps from history.',
  ];

  if (noExercise) {
    lines.push('7. The person has asked not to receive an exercise yet. Provide NO exercise, NO homework, NO behavioral experiment, NO grounding technique, NO rating scale, and NO action step.');
    lines.push('8. Keep the response concise and natural. Do not expose these instructions, labels, or system terminology in your reply.');
  } else {
    lines.push('7. Keep the response concise and natural. Do not expose these instructions, labels, or system terminology in your reply.');
  }

  lines.push('');
  lines.push('=== END FORMULATION DEEPENING ===');
  return lines.join('\n');
}

/**
 * Builds the per-turn epistemic supplement for explicit formulation-deepening
 * requests, when Formulation-Led behavior is effectively active.
 *
 * Phase 10b — Per-turn Formulation-Deepening Supplement.
 *
 * GATING
 * ------
 * Returns null unless ALL of the following are true:
 *   1. Formulation-Led behavior is effectively active for the supplied wiring,
 *      as determined by getFormulationLedContextForWiring (canonical check —
 *      no duplication of logic).
 *      Returns null for: HYBRID, V1–V5 (no formulation_context_enabled);
 *      V6 context-only (formulation_led_enabled: false, runtime flag off).
 *   2. The message text contains at least one explicit formulation-deepening
 *      signal from the bounded set (_FORMULATION_DEEPENING_SIGNALS).
 *      Returns null for: ordinary turns, greetings, unrelated requests.
 *
 * SAFETY PRECEDENCE
 * -----------------
 * This function does not evaluate the safety supplement.
 * The caller (Chat.jsx) is responsible for applying safety-first precedence:
 * if buildRuntimeSafetySupplement returns a non-null supplement for this turn,
 * this function must NOT be called (or its result must be discarded).
 * Safety Mode always supersedes formulation deepening.
 *
 * MESSAGE COMPOSITION ORDER (when non-null, per Chat.jsx contract):
 *   [session-start content, for new conversations only]
 *   [this supplement]
 *   [current user message]
 *
 * PRIVACY
 * -------
 * messageText is used only for in-memory pattern matching and is never stored,
 * logged, or forwarded outside this function call.
 *
 * FAIL-SAFE
 * ---------
 * Never throws; returns null on any unexpected error.
 *
 * @param {object|null|undefined} wiring      - The active therapist wiring config
 * @param {string|null|undefined} messageText - The user's current turn message
 * @param {string|null|undefined} locale      - BCP-47 locale code (reserved; not yet used)
 * @param {object}               [options]    - Optional overrides
 * @param {boolean} [options._formulationLedEnabled] - DI override for unit tests
 * @returns {string|null} Per-turn formulation-deepening supplement, or null
 */
export function buildRuntimeFormulationSupplement(wiring, messageText, locale, options = {}) {
  try {
    // Gate 1: Formulation-Led must be effectively active.
    // Reuses getFormulationLedContextForWiring — the canonical effective-capability
    // check — to avoid duplicating wiring/flag logic.
    const ledBlock = getFormulationLedContextForWiring(wiring, options);
    if (!ledBlock) return null;

    // Gate 2: Message must contain an explicit formulation-deepening signal.
    // Deterministic pattern match — no broad sentiment classification.
    if (!_isFormulationDeepeningRequest(messageText)) return null;

    // Build and return the supplement.  No-exercise clause is conditional.
    const noExercise = _requestsNoExercise(messageText);
    return _buildFormulationDeepeningInstruction(noExercise);
  } catch (_e) {
    // Fail-safe: never throw, never block the message send
    return null;
  }
}

// ─── Phase 1 Quality Gains — V6 formulation context injection ─────────────────

/**
 * Maximum characters per CaseFormulation field injected into session context.
 * Kept tight to avoid over-loading the context window with longitudinal data.
 */
const FORMULATION_INJECT_MAX_CHARS = 150;

/**
 * Minimum character length for a CaseFormulation field to be considered useful.
 * Fields shorter than this threshold are treated as placeholder/trivial and
 * are suppressed from the injected context block.
 *
 * Score scale: any field value of 8+ chars is considered to carry clinical signal.
 * Values shorter than this (e.g. "?", "ok", "N/A", "TBD") are noise.
 *
 * @type {number}
 */
export const FORMULATION_MIN_FIELD_LENGTH = 8;

/**
 * Minimum number of usable CaseFormulation fields required before the context
 * block is injected.  A formulation record with fewer than this many fields
 * that pass the FORMULATION_MIN_FIELD_LENGTH threshold is considered too thin
 * to provide useful clinical grounding and is suppressed.
 *
 * A threshold of 2 ensures that at minimum a presenting problem AND one other
 * clinical dimension (core belief, maintaining cycle, or treatment goal) are
 * present before the block is injected.  A single-field block is not clinically
 * coherent enough to justify the context overhead.
 *
 * @type {number}
 */
export const FORMULATION_MIN_USEFUL_FIELDS = 2;

/**
 * Scores 0–4 populated CaseFormulation dimensions. Each dimension counts once
 * when EITHER its legacy string OR canonical equivalent is non-empty:
 *   presenting_problem | presenting_themes (string[]); core_belief |
 *   core_belief_hypotheses (array of {belief}); maintaining_cycle |
 *   maintaining_behaviors ({avoidance/safety_behaviors/reassurance_seeking});
 *   treatment_goals | goals (string[]). cbt_domain never contributes.
 * Returns 0 for null/invalid input (fail-safe).
 */
export function scoreFormulationRecord(cf) {
  if (!cf || typeof cf !== 'object') return 0;
  const strMin = (v) => typeof v === 'string' && v.trim().length >= FORMULATION_MIN_FIELD_LENGTH;
  const arrNonEmpty = (a, fn) => Array.isArray(a) && a.some(fn);
  const mb = cf.maintaining_behaviors;
  const hasMb = mb && typeof mb === 'object' && ['avoidance', 'safety_behaviors', 'reassurance_seeking']
    .some((k) => Array.isArray(mb[k]) && mb[k].some((s) => typeof s === 'string' && s.trim().length > 0));
  let score = 0;
  if (strMin(cf.presenting_problem) || arrNonEmpty(cf.presenting_themes, (t) => typeof t === 'string' && t.trim().length > 0)) score += 1;
  if (strMin(cf.core_belief) || arrNonEmpty(cf.core_belief_hypotheses, (h) => h && typeof h === 'object' && strMin(h.belief))) score += 1;
  if (strMin(cf.maintaining_cycle) || hasMb) score += 1;
  if (strMin(cf.treatment_goals) || arrNonEmpty(cf.goals, (g) => typeof g === 'string' && g.trim().length > 0)) score += 1;
  return score;
}

/**
 * Builds a bounded, read-only CaseFormulation context block for injection into
 * the session-start payload.
 *
 * Reads the two most recent CaseFormulation records (read-only, caution layer),
 * selects the richest one (most usable fields), and extracts:
 * presenting_problem, core_belief, maintaining_cycle, treatment_goals.
 *
 * Fields shorter than FORMULATION_MIN_FIELD_LENGTH chars are suppressed.
 * The block is only injected when at least FORMULATION_MIN_USEFUL_FIELDS fields
 * pass the threshold — a single thin field is not clinically useful enough.
 *
 * FAIL-CLOSED CONTRACT
 * Any error during read returns '' — the session start is never blocked.
 * The injection is additive and supplemental — absence has no safety consequence.
 *
 * @param {object} entities - Base44 entity client map
 * @returns {Promise<string>} Formatted CaseFormulation context block, or ''
 */
async function buildFormulationContextBlock(entities, conversationId) {
  try {
    if (!entities || typeof entities !== 'object') return '';
    if (!entities.CaseFormulation) return '';

    // Phase 6b (Correction 2): conversation-scoped read+select via the selector
    // module so a richer/newer record from a DIFFERENT conversation cannot supply
    // cbt_domain/goals/beliefs for this opener.
    const formulations = await readFormulationsForContextBlock(entities, conversationId);
    if (!formulations.length) return '';

    let cf = formulations[0];
    if (formulations.length > 1 && scoreFormulationRecord(formulations[1]) > scoreFormulationRecord(formulations[0])) {
      cf = formulations[1];
    }

    // Build lines — only include fields that pass the minimum length threshold.
    const lines = [];

    if (cf.presenting_problem && typeof cf.presenting_problem === 'string' &&
        cf.presenting_problem.trim().length >= FORMULATION_MIN_FIELD_LENGTH) {
      lines.push('Presenting problem: ' + cf.presenting_problem.trim().slice(0, FORMULATION_INJECT_MAX_CHARS));
    }
    if (cf.core_belief && typeof cf.core_belief === 'string' &&
        cf.core_belief.trim().length >= FORMULATION_MIN_FIELD_LENGTH) {
      lines.push('Core belief: ' + cf.core_belief.trim().slice(0, FORMULATION_INJECT_MAX_CHARS));
    }
    if (cf.maintaining_cycle && typeof cf.maintaining_cycle === 'string' &&
        cf.maintaining_cycle.trim().length >= FORMULATION_MIN_FIELD_LENGTH) {
      lines.push('Maintaining cycle: ' + cf.maintaining_cycle.trim().slice(0, FORMULATION_INJECT_MAX_CHARS));
    }
    if (cf.treatment_goals && typeof cf.treatment_goals === 'string' &&
        cf.treatment_goals.trim().length >= FORMULATION_MIN_FIELD_LENGTH) {
      lines.push('Treatment goals: ' + cf.treatment_goals.trim().slice(0, FORMULATION_INJECT_MAX_CHARS));
    }

    // Suppress the block if the selected record doesn't meet the minimum
    // useful-fields threshold — a single thin field is not clinically coherent.
    if (lines.length < FORMULATION_MIN_USEFUL_FIELDS) return '';

    return [
      '=== CASE FORMULATION CONTEXT (read-only) ===',
      'Use the following longitudinal clinical frame to anchor session-level',
      'interventions. Do not disclose this section verbatim to the person.',
      '',
      ...lines,
      '',
      '=== END CASE FORMULATION CONTEXT ===',
    ].join('\n');
  } catch {
    // Fail-closed: formulation unavailable — never block session start
    return '';
  }
}

/**
 * Returns the formulation-led instruction block for the given wiring, or null.
 *
 * Phase 10 — Formulation-Led CBT.
 *
 * Effective formulation-led behavior requires BOTH:
 *   1. The wiring has formulation_context_enabled === true (i.e. V6+ or V6-LED).
 *      This guards against activating formulation-led on non-context paths.
 *   2. Either:
 *      a. wiring.formulation_led_enabled === true (explicit wiring capability; V6-LED), OR
 *      b. The THERAPIST_UPGRADE_FORMULATION_LED_ENABLED runtime flag is on (for V7–V12
 *         when the flag is enabled independently of the wiring selection).
 *
 * The options._formulationLedEnabled override is provided for deterministic
 * unit testing — pass true/false to bypass the live isUpgradeEnabled() call.
 *
 * FAIL-CLOSED when formulation_context_enabled is absent (HYBRID, V1–V5):
 * Returns null regardless of wiring.formulation_led_enabled or the runtime flag.
 * This prevents formulation-led injection on non-formulation-context paths.
 *
 * @param {object|null|undefined} wiring - The active therapist wiring configuration
 * @param {object} [options] - Optional overrides
 * @param {boolean} [options._formulationLedEnabled] - DI override for unit tests
 * @returns {string|null} THERAPIST_FORMULATION_INSTRUCTIONS or null
 */
export function getFormulationLedContextForWiring(wiring, options = {}) {
  // Fail-closed: context must be enabled on the wiring (V6+ or V6-LED)
  if (!wiring || wiring.formulation_context_enabled !== true) {
    return null;
  }
  // Effective formulation-led:
  //   a. Explicit wiring capability (V6-LED: formulation_led_enabled: true)
  //   b. OR runtime flag (V7–V12 when FORMULATION_LED_ENABLED flag is on)
  // The DI override (options._formulationLedEnabled) is used in unit tests.
  const ledEffective =
    wiring.formulation_led_enabled === true ||
    (options._formulationLedEnabled !== undefined
      ? options._formulationLedEnabled === true
      : isUpgradeEnabled('THERAPIST_UPGRADE_FORMULATION_LED_ENABLED'));
  return ledEffective ? THERAPIST_FORMULATION_INSTRUCTIONS : null;
}

// ─── Planner Precedence Enforcement ──────────────────────────────────────────
//
// These functions wire the evaluatePlannerPrecedence / isLegacyGateBlocked
// utilities (defined in therapistWorkflowEngine.js) into the live strategy
// decision paths (V8 and V10).  They are the "runtime enforcement pass" that
// ensures legacy shortcuts are actually blocked — not merely documented.
//
// HOW IT WORKS
// ─────────────────────────────────────────────────────────────────────────────
// 1. buildPlannerContext() constructs the context object needed by the
//    precedence evaluator from the data already available at call sites.
// 2. applyStrategyPrecedenceGuard() takes the raw strategy state produced by
//    determineTherapistStrategy() and overrides the intervention_mode to
//    STABILISATION whenever any action-enabling legacy gate is blocked.
//    It is the SINGLE enforcement gate in the runtime planner.
// 3. buildPrecedenceEnforcementBlock() produces a human-readable text block
//    that is appended to the session-start context when enforcement fires,
//    making the LLM explicitly aware of which gates are blocked.
//
// FAIL-OPEN CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
// Both buildPlannerContext() and applyStrategyPrecedenceGuard() never throw.
// On any error, they return safe defaults that preserve prior behavior.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Action-capable strategy modes that legacy shortcuts can exploit.
 * Only these modes need precedence enforcement; safe modes are left unchanged.
 *
 * @private
 */
const _ACTION_CAPABLE_MODES = Object.freeze(
  new Set(['structured_exploration', 'formulation_deepening'])
);

/**
 * Legacy gates that, when blocked, require mode override to STABILISATION.
 * These gates now include INTERVENTION_READINESS (level 5) protection, so
 * sessions that are not ready for action cannot remain in action-capable modes.
 *
 * @private
 */
const _ACTION_BLOCKING_GATES = Object.freeze([
  'skip_clarification',
  'social_anxiety_direct_action',
  'domain_to_intervention_template',
  'micro_step_defaulting',
]);

/**
 * Maximum active precedence level that triggers a strategy mode override to
 * STABILISATION.  Levels 1-5 cover SAFETY, FORMULATION_FIRST,
 * PACING_SENSITIVITY, FIRST_DISCLOSURE, and INTERVENTION_READINESS.
 * This keeps non-ready sessions in formulation hold rather than action-capable
 * modes.
 *
 * @private
 */
const _MODE_OVERRIDE_PRECEDENCE_THRESHOLD = PRECEDENCE_LEVELS.INTERVENTION_READINESS; // level 5

/**
 * Builds the planner context object required by evaluatePlannerPrecedence()
 * from the inputs already available at the V8 and V10 call sites.
 *
 * All fields are optional — missing fields bias toward higher-priority
 * precedence levels (fail-closed: unknown state → extra caution).
 *
 * SAFETY: Never throws.  Returns a minimal safe context on any error.
 *
 * @param {object|null} formulationRecord - Best CaseFormulation record, or null
 * @param {object|null} safetyResult      - Output of determineSafetyMode(), or null
 * @param {string|null} distressTier      - One of DISTRESS_TIERS values, or null
 * @param {object}      [sessionOptions]  - Session options. Bounded, fail-closed detectors:
 *     case_type, is_first_disclosure, has_been_understood (→ person_feels_understood),
 *     readiness_signal, rationale_is_clear, holding_complete (high-protection only).
 *   `intervention_ready` is DERIVED from the canonical checklist (fail-closed, no opaque
 *   passthrough). L2 (formulation_in_place) and L5 (intervention_ready) are distinct levels.
 * @returns {object} Planner context for evaluatePlannerPrecedence()
 */
export function buildPlannerContext(formulationRecord, safetyResult, distressTier, sessionOptions) {
  try {
    const opts = sessionOptions && typeof sessionOptions === 'object' ? sessionOptions : {};
    const formulationInPlace = scoreFormulationRecord(formulationRecord) >= FORMULATION_MIN_USEFUL_FIELDS;
    const caseType = typeof opts.case_type === 'string' ? opts.case_type.trim().toLowerCase() : '';
    const effectiveDistressTier = typeof distressTier === 'string' && distressTier ? distressTier : 'tier_low';
    // Phase 6: detectors come from persisted structured CaseFormulation fields
    // (extractReadinessSignals) with a staleness guard — never from formulation
    // richness. Boolean opts overrides are a unit-test DI seam only; the live Chat.jsx
    // runtime never passes them. No continuation_session_id at a fresh opener => every
    // signal false. checkInterventionReadiness remains the sole aggregator.
    const produced = extractReadinessSignals(formulationRecord, { continuation_session_id: opts.continuation_session_id });
    const hasBeenUnderstood = typeof opts.has_been_understood === 'boolean' ? opts.has_been_understood === true : produced.has_been_understood;
    const readinessSignal = typeof opts.readiness_signal === 'boolean' ? opts.readiness_signal === true : produced.readiness_signal;
    const rationaleIsClear = typeof opts.rationale_is_clear === 'boolean' ? opts.rationale_is_clear === true : produced.rationale_is_clear;
    const holdingComplete = typeof opts.holding_complete === 'boolean' ? opts.holding_complete === true : produced.holding_complete;
    const distressAllowsTask = effectiveDistressTier === 'tier_low' || effectiveDistressTier === 'tier_mild';
    const readinessResult = checkInterventionReadiness({ formulation_in_place: formulationInPlace, person_feels_understood: hasBeenUnderstood, readiness_signal: readinessSignal, rationale_is_clear: rationaleIsClear, distress_allows_task: distressAllowsTask, holding_complete: holdingComplete, case_type: caseType });
    return {
      safety_mode_active: safetyResult?.safety_mode_active === true,
      distress_tier: effectiveDistressTier,
      formulation_in_place: formulationInPlace,
      has_been_understood: hasBeenUnderstood,
      case_type: caseType,
      is_first_disclosure: opts.is_first_disclosure === true,
      intervention_ready: readinessResult.ready,
    };
  } catch (_e) {
    // Fail-closed: unknown state → highest caution (formulation not in place)
    return { safety_mode_active: false, distress_tier: 'tier_low', formulation_in_place: false,
      has_been_understood: false, case_type: '', is_first_disclosure: false, intervention_ready: false };
  }
}

/**
 * Applies the planner precedence hierarchy to a raw strategy state.
 *
 * This is the single runtime enforcement gate.  It is called AFTER
 * determineTherapistStrategy() in the V8 and V10 session-start paths.
 *
 * WHAT IT DOES
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Evaluates the active precedence level for the current session context.
 * 2. Checks each of the four action-enabling legacy gates via isLegacyGateBlocked().
 * 3. If any blocked gate would allow a legacy shortcut to fire AND the current
 *    intervention_mode is action-capable (structured_exploration / formulation_deepening),
 *    overrides the mode to stabilisation — the safest non-containment mode.
 * 4. Returns an augmented strategy state that includes enforcement metadata
 *    (precedence_enforced, active_precedence_level, blocked_gates, etc.).
 *
 * MODES AFFECTED
 * ─────────────────────────────────────────────────────────────────────────────
 * Only structured_exploration and formulation_deepening are overridden.
 * containment, stabilisation, and psychoeducation are already safe and are
 * NEVER modified by this function.
 *
 * PROTECTED CASE TYPES (trigger PACING_SENSITIVITY level 3)
 * ─────────────────────────────────────────────────────────────────────────────
 * teen_shame, grief_loss, trauma, scrupulosity, ocd_checking, ocd, adhd_overwhelm,
 * nothing_helps, social_anxiety → social_anxiety_direct_action and
 * domain_to_intervention_template gates are both blocked at level 3; mode
 * override to stabilisation fires.
 *
 * UNREADY SESSIONS (trigger FORMULATION_FIRST level 2)
 * ─────────────────────────────────────────────────────────────────────────────
 * When formulation_in_place is false or has_been_understood is false →
 * skip_clarification gate is blocked; mode override to stabilisation fires.
 *
 * FAIL-OPEN CONTRACT
 * ─────────────────────────────────────────────────────────────────────────────
 * Never throws.  On any error, returns the original strategy state unchanged
 * so the session is never blocked.
 *
 * @param {object|null} strategyState  - Output of determineTherapistStrategy()
 * @param {object|null} plannerContext - Output of buildPlannerContext()
 * @returns {object} Augmented strategy state with enforcement metadata
 */
export function applyStrategyPrecedenceGuard(strategyState, plannerContext) {
  try {
    const ss = strategyState && typeof strategyState === 'object' ? strategyState : {};
    const currentMode = typeof ss.intervention_mode === 'string' ? ss.intervention_mode : 'stabilisation';

    // Evaluate active precedence level
    const precedence = evaluatePlannerPrecedence(plannerContext);

    // Check all action-blocking gates
    const blockedGates = _ACTION_BLOCKING_GATES.filter(
      (gate) => isLegacyGateBlocked(gate, plannerContext)
    );

    const hasBlockedGates = blockedGates.length > 0;
    const modeIsActionCapable = _ACTION_CAPABLE_MODES.has(currentMode);

    // Mode override fires when active precedence level is <= threshold (levels 1-5:
    // SAFETY, FORMULATION_FIRST, PACING_SENSITIVITY, FIRST_DISCLOSURE,
    // INTERVENTION_READINESS).  This ensures "not ready yet" sessions cannot stay
    // in an action-capable mode while readiness gates are unmet.
    const shouldEnforceMode =
      hasBlockedGates &&
      precedence.level <= _MODE_OVERRIDE_PRECEDENCE_THRESHOLD &&
      modeIsActionCapable;
    const enforcedMode = shouldEnforceMode ? 'stabilisation' : currentMode;
    // precedence_enforced is true when ANY gate is blocked (for enforcement block text)
    const precedenceEnforced = hasBlockedGates;

    // Wave 2E (Fix 3) — action permission is separate from response posture.
    // Readiness gates control ACTION (homework, forms, exposure, techniques), not
    // the internal response posture (empathic holding, reflection, clarification,
    // structured exploration, formulation, formulation deepening).  A concrete
    // action is permitted ONLY when the mode is action-capable AND no readiness
    // gate is blocked AND the mode was not overridden.  This never loosens the
    // existing mode-override behavior — it only exposes an explicit boolean so
    // downstream logic need not force STABILISATION merely to block an action.
    const actionPermitted = modeIsActionCapable && !hasBlockedGates && !shouldEnforceMode;

    return Object.assign({}, ss, {
      intervention_mode: enforcedMode,
      precedence_enforced: precedenceEnforced,
      active_precedence_level: precedence.level,
      active_precedence_name: precedence.name,
      precedence_rationale: precedence.reason,
      blocked_gates: Object.freeze(blockedGates),
      action_permitted: actionPermitted,
    });
  } catch (_e) {
    // Fail-open: return original state unchanged
    return strategyState && typeof strategyState === 'object' ? strategyState : {};
  }
}

/**
 * Builds a human-readable precedence enforcement block for injection into the
 * session-start context when the precedence guard overrides the strategy mode.
 *
 * The block makes the LLM explicitly aware of which legacy shortcuts are blocked
 * and why, reinforcing the planner-first rule at the instruction level.
 *
 * Returns '' (empty string) when no enforcement fired (precedence_enforced !== true).
 * Never throws.
 *
 * @param {object|null} guardResult - Augmented strategy state from applyStrategyPrecedenceGuard()
 * @returns {string} Enforcement text block, or ''
 */
export function buildPrecedenceEnforcementBlock(guardResult) {
  try {
    if (!guardResult || guardResult.precedence_enforced !== true) return '';
    const level = guardResult.active_precedence_level ?? '?';
    const name = guardResult.active_precedence_name ?? 'UNKNOWN';
    const reason = guardResult.precedence_rationale ?? 'unknown';
    const blockedGates = Array.isArray(guardResult.blocked_gates) ? guardResult.blocked_gates : [];

    const gateLines = blockedGates.map((gate) => {
      const def = LEGACY_GATE_OVERRIDES[gate];
      const desc = def ? def.description : gate;
      return `  — ${gate}: BLOCKED — ${desc}`;
    });

    return [
      '=== PLANNER PRECEDENCE ENFORCEMENT — ACTIVE ===',
      '',
      `Active Level  : ${name} (level ${level})`,
      `Reason        : ${reason}`,
      `Enforced Mode : stabilisation`,
      '',
      'The following legacy shortcuts are blocked in this session:',
      ...gateLines,
      '',
      'Planner-first order is MANDATORY:',
      '  understand → hold → clarify → formulate → select target → decide move type',
      '  → THEN consider intervention (only when all readiness gates pass)',
      '',
      '=== END PRECEDENCE ENFORCEMENT ===',
    ].join('\n');
  } catch (_e) {
    return '';
  }
}

/**
 * Builds the V6 session-start content string asynchronously.
 *
 * Phase 1 Quality Gains — Formulation Context Injection.
 * Phase 10 — Formulation-Led CBT Instructions (gated by effective capability).
 *
 * For non-V6 wirings (formulation_context_enabled !== true):
 *   Delegates directly to buildV5SessionStartContentAsync (no behavior change).
 *
 * For V6/V6-LED/V7+ wirings (formulation_context_enabled === true):
 *   1. Builds the V5 base content (safety mode + live retrieval + retrieval
 *      orchestration + workflow + memory context).
 *   2. Reads CaseFormulation (read-only, caution layer, bounded to 1 record)
 *      and builds the formulation context block.
 *   3. Appends the formulation context block when available.
 *   4. Appends THERAPIST_FORMULATION_INSTRUCTIONS only when formulation-led
 *      is effectively active — determined by getFormulationLedContextForWiring:
 *        - V6-LED wiring (formulation_led_enabled: true): always injects.
 *        - V6 wiring (formulation_led_enabled: false): injects only if
 *          THERAPIST_UPGRADE_FORMULATION_LED_ENABLED runtime flag is on.
 *        - V7–V12 wiring (no formulation_led_enabled flag): same as V6 —
 *          injects only if THERAPIST_UPGRADE_FORMULATION_LED_ENABLED is on.
 *
 * FAIL-CLOSED CONTRACT
 * Any failure in step 2 returns V5 base content unchanged.
 * The session start is never blocked by formulation context unavailability.
 *
 * SAFETY NOTE
 * The formulation context block is additive clinical context.  It does NOT
 * replace, weaken, or bypass any existing safety filter or crisis handler.
 * It is strictly structural guidance for grounding session-level interventions
 * in the longitudinal clinical picture.
 *
 * ISOLATION GUARANTEE
 * This function is ONLY called when wiring.formulation_context_enabled === true
 * (V6/V6-LED/V7+ path).  All prior paths (HYBRID, V1–V5) are completely unaffected.
 *
 * @param {object} wiring - The active therapist wiring configuration
 * @param {object} entities - Base44 entity client map
 * @param {object} baseClient - Base44 SDK client (passed to V5 chain)
 * @param {object} [options] - Optional options forwarded to V5 chain and to
 *   getFormulationLedContextForWiring.  Pass options._formulationLedEnabled
 *   (boolean) to override the runtime flag in unit tests.
 * @returns {Promise<string>} The full session-start content string
 */
export async function buildV6SessionStartContentAsync(
  wiring,
  entities,
  baseClient,
  options = {},
) {
  // For non-V6 wirings: delegate to V5 (no change to behavior)
  if (!wiring || wiring.formulation_context_enabled !== true) {
    return buildV5SessionStartContentAsync(wiring, entities, baseClient, options);
  }

  // ── V6/V6-LED/V7+ path ─────────────────────────────────────────────────────

  // Step 1: Build the V5 base content (safety mode + all prior layers)
  const v5Base = await buildV5SessionStartContentAsync(
    wiring,
    entities,
    baseClient,
    options,
  );

  // Step 2: Inject CaseFormulation context (read-only, fail-closed)
  let formulationBlock = '';
  try {
    formulationBlock = await buildFormulationContextBlock(entities, options?.conversation_id);
  } catch {
    // Fail-closed: formulation injection failure must never block session start
    formulationBlock = '';
  }

  // Step 3: Inject formulation-led instructions when effectively active.
  // Passes options so unit tests can inject _formulationLedEnabled override.
  const formulationLedBlock = getFormulationLedContextForWiring(wiring, options);

  let result = v5Base;
  if (formulationBlock && formulationBlock.trim()) {
    result = _appendWithComposer(options, result, {
      id: 'case_formulation_context',
      order: CONTEXT_COMPOSER_V2_SECTION_ORDER.case_formulation_context,
      retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.case_formulation_context,
      required: false,
      source_layer: 'v6_formulation',
      content: formulationBlock,
    });
  }
  if (formulationLedBlock) {
    result = _appendWithComposer(options, result, {
      id: 'formulation_led_instructions',
      order: CONTEXT_COMPOSER_V2_SECTION_ORDER.formulation_led_instructions,
      retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.formulation_led_instructions,
      required: false,
      source_layer: 'v6_formulation',
      content: formulationLedBlock,
    });
  }
  return result;
}

// ─── Phase 3 Deep Personalization — V7 cross-session continuity injection ─────

/**
 * Builds the V7 session-start content string asynchronously.
 *
 * Phase 3 Deep Personalization — Cross-Session Continuity Layer.
 *
 * For non-V7 wirings (continuity_layer_enabled !== true):
 *   Delegates directly to buildV6SessionStartContentAsync (no behavior change).
 *
 * For V7 wirings:
 *   1. Builds the V6 base content (formulation context + safety mode + live
 *      retrieval + retrieval orchestration + workflow + memory context).
 *   2. Reads the last N therapist memory records (read-only, fail-closed)
 *      and builds the cross-session continuity block.
 *   3. Appends the continuity block when available.
 *
 * FAIL-CLOSED CONTRACT
 * Any failure in step 2 returns V6 base content unchanged.
 * The session start is never blocked by continuity read failure.
 *
 * SAFETY NOTE
 * The continuity block is additive clinical context.  It does NOT replace,
 * weaken, or bypass any existing safety filter, crisis handler, or
 * formulation context.  It is strictly longitudinal awareness for grounding
 * session-level interactions in prior-session patterns.
 *
 * PRIVACY NOTE
 * Continuity reads from CompanionMemory (private per-user entity).  Only
 * structured summary fields are included — never raw transcripts.
 * The block is injected into the per-user session payload only.
 *
 * ISOLATION GUARANTEE
 * This function is ONLY called when wiring.continuity_layer_enabled === true
 * (V7 path).  All prior paths (HYBRID, V1–V6) are completely unaffected.
 *
 * @param {object} wiring - The active therapist wiring configuration
 * @param {object} entities - Base44 entity client map
 * @param {object} baseClient - Base44 SDK client (passed to V6 chain)
 * @param {object} [options] - Optional options forwarded to V6 chain
 * @returns {Promise<string>} The full session-start content string
 */
export async function buildV7SessionStartContentAsync(
  wiring,
  entities,
  baseClient,
  options = {},
) {
  // For non-V7 wirings: delegate to V6 (no change to behavior)
  if (!wiring || wiring.continuity_layer_enabled !== true) {
    return buildV6SessionStartContentAsync(wiring, entities, baseClient, options);
  }

  // ── V7 path ────────────────────────────────────────────────────────────────

  // Step 1: Build the V6 base content (formulation + safety mode + all prior layers)
  const v6Base = await buildV6SessionStartContentAsync(
    wiring,
    entities,
    baseClient,
    options,
  );

  // Step 2: Build cross-session continuity block (read-only, fail-closed)
  // Phase 4.1: if a canonical memory result is available (pre-read by V10/V9),
  // reuse its continuity block to avoid a duplicate CompanionMemory.list call.
  // Direct V7 calls without a canonical result preserve the existing behavior.
  let continuityBlock = '';
  let continuityDiagnostic = null;
  try {
    const canonical = options?.canonical_memory_result;
    if (canonical && typeof canonical === 'object' && canonical.continuity) {
      // Reuse the pre-read canonical continuity block — no duplicate list call.
      continuityBlock = canonical.continuity.block ?? '';
      continuityDiagnostic = canonical.continuity.diagnostic ?? null;
    } else {
      const { block, diagnostic } = await buildCrossSessionContinuityBlockWithDiagnostic(entities);
      continuityBlock = block;
      continuityDiagnostic = diagnostic;
    }
  } catch {
    // Fail-closed: continuity injection failure must never block session start
    continuityBlock = '';
    continuityDiagnostic = {
      memory_read_attempted: false,
      valid_therapist_memory_record_count: 0,
      selected_prior_session_count: 0,
      recurring_pattern_count: 0,
      working_hypothesis_count: 0,
      open_follow_up_count: 0,
      prior_intervention_count: 0,
      historical_risk_signal_count: 0,
      continuity_block_emitted: false,
      continuity_fail_safe: true,
      continuity_failure_reason_code: CONTINUITY_FAILURE_REASONS.read_error,
    };
  }

  // Step 3: Emit V7 continuity diagnostic (only when _s2debug=true, fail-closed)
  _emitV7ContinuityDiagnosticIfEnabled(wiring, continuityDiagnostic);

  if (!continuityBlock || !continuityBlock.trim()) {
    return v6Base;
  }

  return _appendWithComposer(options, v6Base, {
    id: 'cross_session_continuity',
    order: CONTEXT_COMPOSER_V2_SECTION_ORDER.cross_session_continuity,
    retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.cross_session_continuity,
    required: false,
    source_layer: 'v7_continuity',
    content: continuityBlock,
  });
}

// ─── V7 continuity diagnostic emission ───────────────────────────────────────

/**
 * Emits a safe V7 continuity diagnostic to the console when `?_s2debug=true`
 * is present in the URL.  No-op in all other environments (production, CI).
 *
 * SAFETY CONTRACT
 * ---------------
 * - Gated by `_s2debug=true` in the URL.
 * - Only emits bounded structural fields (booleans and counts).
 * - Never emits summaries, pattern text, hypothesis text, task text,
 *   intervention text, risk text, raw user/assistant content, record
 *   contents, user IDs, or emails.
 * - Does NOT change any routing decision, session content, or therapeutic
 *   behavior.  Diagnostic output only.
 * - Fail-closed on any error (never propagates).
 *
 * @private
 * @param {object|null} wiring - The active V7 wiring configuration
 * @param {object|null} diagnostic - Diagnostic result from buildCrossSessionContinuityBlockWithDiagnostic
 */
function _emitV7ContinuityDiagnosticIfEnabled(wiring, diagnostic) {
  try {
    if (typeof window === 'undefined') return;
    const search = window.location?.search ?? '';
    if (!search) return;
    const params = new URLSearchParams(search);
    if (params.get('_s2debug') !== 'true') return;

    const d = diagnostic ?? {};
    console.group('[V7] Cross-session continuity diagnostic');
    console.log('active_wiring                    :', wiring?.name ?? 'unknown');
    console.log('continuity_configured            :', wiring?.continuity_layer_enabled === true);
    console.log('continuity_effective             :', wiring?.continuity_layer_enabled === true);
    console.log('formulation_context_effective    :', wiring?.formulation_context_enabled === true);
    console.log('formulation_led_effective        :', wiring?.formulation_led_enabled === true);
    console.log('safety_mode_effective            :', wiring?.safety_mode_enabled === true);
    console.log('memory_read_attempted            :', d.memory_read_attempted ?? false);
    console.log('valid_therapist_memory_record_count:', d.valid_therapist_memory_record_count ?? 0);
    console.log('selected_prior_session_count     :', d.selected_prior_session_count ?? 0);
    console.log('recurring_pattern_count          :', d.recurring_pattern_count ?? 0);
    console.log('working_hypothesis_count         :', d.working_hypothesis_count ?? 0);
    console.log('open_follow_up_count             :', d.open_follow_up_count ?? 0);
    console.log('prior_intervention_count         :', d.prior_intervention_count ?? 0);
    console.log('historical_risk_signal_count     :', d.historical_risk_signal_count ?? 0);
    console.log('continuity_block_emitted         :', d.continuity_block_emitted ?? false);
    console.log('continuity_fail_safe             :', d.continuity_fail_safe ?? false);
    console.log('continuity_failure_reason_code   :', d.continuity_failure_reason_code ?? 'unknown');
    console.groupEnd();
  } catch (_e) {
    // Diagnostic emission must never propagate — fail silently.
  }
}


// ─── Wave 5D — Quality Evaluator diagnostic helpers ───────────────────────────

/**
 * Extracts safe bounded wiring identity metadata from a wiring config for
 * the Quality Evaluator.  Only structural flag fields are included.
 * Never includes tool_configs, agent_instructions, system_prompt, or any
 * content arrays.
 *
 * FAIL-CLOSED: returns null when wiring is absent or non-object.
 *
 * @private
 * @param {object|null|undefined} wiring
 * @returns {object|null}
 */
function _buildWiringIdentityForEvaluator(wiring) {
  if (!wiring || typeof wiring !== 'object') return null;
  return {
    name: typeof wiring.name === 'string' ? wiring.name : '',
    stage2: wiring.stage2 === true,
    stage2_phase: typeof wiring.stage2_phase === 'number' ? wiring.stage2_phase : 0,
    strategy_layer_enabled: wiring.strategy_layer_enabled === true,
    formulation_context_enabled: wiring.formulation_context_enabled === true,
    continuity_layer_enabled: wiring.continuity_layer_enabled === true,
    safety_mode_enabled: wiring.safety_mode_enabled === true,
  };
}

/**
 * Emits a Quality Evaluator diagnostic to the console when both
 * `?_s2debug=true` is present in the URL AND the QUALITY_EVALUATOR_ENABLED
 * env flag is set.  No-op in all other environments (production, CI, Node.js).
 *
 * Wave 5D — Evaluator Diagnostics Integration.
 *
 * SAFETY CONTRACT
 * ---------------
 * - Gated by BOTH `_s2debug=true` in the URL AND VITE_QUALITY_EVALUATOR_ENABLED.
 * - Only emits bounded evaluator metadata (version, bands, risk flags, wiring
 *   identity).  Never emits raw user text, raw assistant text, or private
 *   entity content.
 * - Does NOT change any routing decision, session content, or therapeutic
 *   behavior.  The evaluator result is ONLY used for console output here.
 * - Does NOT store the snapshot — console output only.
 * - Fail-closed on any error (never propagates).
 * - evaluatorInputs must contain ONLY pre-processed structured signals, never
 *   raw message text or private entity fields.
 *
 * @private
 * @param {object} evaluatorInputs
 *   Bounded structured signals: strategyState, ltsInputs, safetyResult,
 *   distressTier, wiringIdentity.  Raw text must NOT be included.
 */
function _emitEvaluatorDiagnosticIfEnabled(evaluatorInputs) {
  try {
    if (typeof window === 'undefined') return;
    const search = window.location?.search ?? '';
    if (!search) return;
    const params = new URLSearchParams(search);
    if (params.get('_s2debug') !== 'true') return;
    // Secondary gate: QUALITY_EVALUATOR_ENABLED env flag.
    // Checked directly here to avoid importing featureFlags (no cycle risk,
    // but keeps this file's dependency surface minimal).
    if (import.meta.env?.VITE_QUALITY_EVALUATOR_ENABLED !== 'true') return;

    const snap = computeEvaluatorDiagnosticSnapshot(evaluatorInputs);
    console.group('[Wave 5D] Quality Evaluator diagnostic');
    console.log('evaluator_version :', snap.evaluator_version);
    console.log('aggregate_band    :', snap.aggregate_band);
    console.log('fail_safe         :', snap.fail_safe);
    console.log('agent_role        :', snap.agent_role);
    console.log('wiring_version    :', snap.wiring_version);
    console.log('active_dimensions :', snap.active_dimensions);
    console.log('dimensions        :', snap.dimensions);
    console.log('risk_flags        :', snap.risk_flags);
    console.groupEnd();
  } catch (_e) {
    // Diagnostic emission must never propagate — fail silently.
  }
}

// ─── Wave 2D — Strategy diagnostic emission ───────────────────────────────────

/**
 * Emits a safe strategy diagnostic to the console when `?_s2debug=true` is
 * present in the URL.  No-op in all other environments (production, CI, Node.js).
 *
 * SAFETY CONTRACT
 * ---------------
 * - Only called in the V8 strategy path (strategy_layer_enabled === true).
 * - Uses buildStrategyDiagnosticSnapshot() which strips message_signals and
 *   never includes raw user text or private entity content.
 * - Wave 3E: when ltsInputs is provided, also emits an LTS signal group via
 *   buildLTSDiagnosticSnapshot().  Gated behind the same _s2debug flag.
 * - Gated by window.location.search containing `_s2debug=true` — fail-closed
 *   on any error, on missing window, or on any unexpected input.
 * - Does NOT change any routing decision or therapeutic behavior.
 * - Does NOT store the snapshot — console output only.
 *
 * @private
 * @param {object} strategyState - TherapistStrategyState from determineTherapistStrategy()
 * @param {object|null} [ltsInputs] - Optional LTSStrategyInputs from extractLTSStrategyInputs()
 */
function _emitStrategyDiagnosticIfEnabled(strategyState, ltsInputs, extraMeta) {
  try {
    if (typeof window === 'undefined') return;
    const search = window.location?.search ?? '';
    if (!search) return;
    const params = new URLSearchParams(search);
    if (params.get('_s2debug') !== 'true') return;
    const snapshot = buildStrategyDiagnosticSnapshot(strategyState);
    console.group('[Wave 2D] Therapist strategy decision');
    console.log('intervention_mode        :', snapshot.intervention_mode);
    console.log('distress_tier            :', snapshot.distress_tier);
    console.log('rationale                :', snapshot.rationale);
    console.log('continuity_present       :', snapshot.continuity_present);
    console.log('formulation_present      :', snapshot.formulation_present);
    console.log('session_count            :', snapshot.session_count);
    console.log('has_risk_flags           :', snapshot.has_risk_flags);
    console.log('has_open_tasks           :', snapshot.has_open_tasks);
    console.log('intervention_saturated   :', snapshot.intervention_saturated);
    console.log('continuity_richness_score:', snapshot.continuity_richness_score);
    console.log('formulation_strength_score:', snapshot.formulation_strength_score);
    console.log('lts_trajectory           :', snapshot.lts_trajectory);
    console.log('strategy_version         :', snapshot.strategy_version);
    console.log('fail_safe                :', snapshot.fail_safe);
    // Wave 2E (Fix 7) — bounded V8 readiness metadata.  Booleans / short codes
    // only; never raw text, matched phrases, memory/formulation text, risk
    // labels, or entity/user identifiers.
    const currentMessageAvailable =
      extraMeta && typeof extraMeta === 'object' ? extraMeta.current_message_available === true : false;
    console.log('current_message_available:', currentMessageAvailable);
    console.log('action_permitted         :', snapshot.action_permitted);
    console.log('historical_safety_context_present:', snapshot.historical_safety_context_present);
    console.log('precedence_enforced      :', snapshot.precedence_enforced);
    console.log('active_precedence_level  :', snapshot.active_precedence_level);
    console.log('failure_reason_code      :', snapshot.failure_reason_code);
    // Wave 3E — LTS signal group (emitted only when LTS inputs are available)
    if (ltsInputs != null) {
      const ltsSnap = buildLTSDiagnosticSnapshot(ltsInputs);
      console.group('[Wave 3E] LTS signals active');
      console.log('lts_valid                :', ltsSnap.lts_valid);
      console.log('lts_session_count        :', ltsSnap.lts_session_count);
      console.log('lts_trajectory           :', ltsSnap.lts_trajectory);
      console.log('lts_has_risk_history     :', ltsSnap.lts_has_risk_history);
      console.log('lts_is_stagnating        :', ltsSnap.lts_is_stagnating);
      console.log('lts_is_progressing       :', ltsSnap.lts_is_progressing);
      console.log('lts_is_fluctuating       :', ltsSnap.lts_is_fluctuating);
      console.log('lts_has_stalled_interventions:', ltsSnap.lts_has_stalled_interventions);
      console.groupEnd();
    }
    console.groupEnd();
  } catch (_e) {
    // Diagnostic emission must never propagate — fail silently.
  }
}

// ─── Wave 2B — V8 therapeutic strategy layer ─────────────────────────────────

/**
 * Reads the single best CaseFormulation record from the entity store.
 *
 * Private helper for buildV8SessionStartContentAsync.  Uses the same bounded
 * over-fetch-and-select logic as buildFormulationContextBlock (V6) but returns
 * the raw entity object rather than a formatted string.  The returned object
 * is passed to determineTherapistStrategy() as formulationData.
 *
 * FAIL-CLOSED: returns null on any error.
 *
 * @private
 * @param {object} entities - Base44 entity client map
 * @returns {Promise<object|null>} The best CaseFormulation record, or null
 */
// Phase 6b (Correction 2): conversation-scoped + session_instance_id defence —
// see formulationRecordSelector.js.  A richer/newer record from a DIFFERENT
// conversation can no longer supply readiness/domain/goals for this opener.
async function readBestFormulationRecord(entities, conversationId, sessionInstanceId) {
  return readBestFormulationRecordForConversation(entities, conversationId, sessionInstanceId, scoreFormulationRecord);
}

/**
 * Builds the V8 session-start content string asynchronously.
 *
 * Wave 2B — Therapeutic Strategy Layer.
 *
 * For non-V8 wirings (strategy_layer_enabled !== true):
 *   Delegates directly to buildV7SessionStartContentAsync (no behavior change).
 *
 * For V8 wirings:
 *   1. Builds the V7 base content (continuity + formulation + safety mode +
 *      live retrieval + retrieval orchestration + workflow + memory context).
 *   2. Reads the best CaseFormulation record (read-only, fail-closed).
 *   3. Reads cross-session continuity data (read-only, fail-closed).
 *   4. Evaluates safety mode from options (same inputs as V5).
 *   5. Extracts message signals from options.message_text.
 *   6. Scores the distress tier.
 *   7. Determines the therapeutic strategy.
 *   8. Builds the strategy guidance section and appends it.
 *
 * FAIL-OPEN CONTRACT
 * ------------------
 * Any error during strategy computation (steps 2–8) returns the V7 base
 * content unchanged.  Session start is never blocked.  The V7 behavior is
 * EXACTLY preserved on any failure.
 *
 * PRIVACY
 * -------
 * - Only structured summary fields and field presence flags are passed to
 *   the strategy engine — never raw transcript content.
 * - message_text (if provided in options) is passed to extractMessageSignals()
 *   for in-memory pattern matching only.  It is never stored or logged.
 *
 * SAFETY NOTE
 * -----------
 * The strategy guidance section is additive context labeled as guidance.
 * It does NOT replace, weaken, or bypass any existing safety filter or
 * crisis handler.  When safety mode is active (CONTAINMENT mode), the
 * guidance section explicitly reinforces the safety-first constraint.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This function is ONLY called when wiring.strategy_layer_enabled === true
 * (V8 path).  All prior paths (HYBRID, V1–V7) are completely unaffected.
 *
 * @param {object} wiring - The active therapist wiring configuration
 * @param {object} entities - Base44 entity client map
 * @param {object} baseClient - Base44 SDK client (passed to V7 chain)
 * @param {object} [options] - Optional options forwarded to V7 chain
 * @param {boolean} [options.crisis_signal=false]           - Crisis signal
 * @param {boolean} [options.low_retrieval_confidence=false] - Low retrieval confidence
 * @param {boolean} [options.allowlist_rejection=false]      - Allowlist rejection
 * @param {boolean} [options.flag_override=false]            - Safety mode override
 * @param {string}  [options.message_text]                   - Current user message
 * @param {string}  [options.locale]                         - User locale
 * @returns {Promise<string>} The full session-start content string
 */
export async function buildV8SessionStartContentAsync(
  wiring,
  entities,
  baseClient,
  options = {},
) {
  // For non-V8 wirings: delegate to V7 (no change to behavior)
  if (!wiring || wiring.strategy_layer_enabled !== true) {
    return buildV7SessionStartContentAsync(wiring, entities, baseClient, options);
  }

  // ── V8 path ────────────────────────────────────────────────────────────────

  // Step 1: Build the V7 base content (all prior layers)
  const v7Base = await buildV7SessionStartContentAsync(
    wiring,
    entities,
    baseClient,
    options,
  );

  // Steps 2–8: Compute the strategy section (fail-open: any error returns v7Base)
  try {
    // Step 2: Read the best CaseFormulation record (conversation-scoped, fail-closed)
    const formulationRecord = await readBestFormulationRecord(entities, options?.conversation_id, options?.continuation_session_id);

    // Step 3: Read cross-session continuity data (read-only, bounded)
    // Phase 4.1: if a canonical memory result is available (pre-read by V10/V9),
    // reuse its structured continuity data to avoid a duplicate CompanionMemory.list
    // call.  Direct V8 calls without a canonical result preserve the existing behavior.
    let continuityData = null;
    try {
      const canonical = options?.canonical_memory_result;
      if (canonical && typeof canonical === 'object' && canonical.continuity) {
        // Reuse the pre-read canonical continuity data — no duplicate list call.
        continuityData = canonical.continuity.data ?? null;
      } else {
        const { readCrossSessionContinuity } = await import('./crossSessionContinuity.js');
        continuityData = await readCrossSessionContinuity(entities);
      }
    } catch {
      continuityData = null;
    }

    // Step 4: Evaluate safety mode (same inputs as V5 — fail-closed to safety on error)
    let safetyResult;
    try {
      safetyResult = determineSafetyMode({
        crisis_signal: options.crisis_signal ?? false,
        low_retrieval_confidence: options.low_retrieval_confidence ?? false,
        allowlist_rejection: options.allowlist_rejection ?? false,
        flag_override: options.flag_override ?? false,
        message_text: options.message_text ?? '',
      });
    } catch {
      safetyResult = SAFETY_MODE_FAIL_CLOSED_RESULT;
    }

    // Step 5: Extract message-level signals from current turn text
    const messageSignals = extractMessageSignals(options.message_text ?? '');

    // Step 6: Score distress tier
    const distressTier = scoreDistressTier(safetyResult, messageSignals);

    // Step 7: Determine therapeutic strategy (Wave 3D: with LTS inputs when available)
    const ltsInputs = extractLTSStrategyInputs(options.lts_record ?? null);
    const rawStrategyState = determineTherapistStrategy(
      continuityData,
      formulationRecord,
      distressTier,
      messageSignals,
      ltsInputs,
    );

    let strategyState = rawStrategyState;
    try {
      // Precedence enforcement pass — blocks legacy shortcuts when higher-priority
      // planner rules are active.  buildPlannerContext derives the precedence
      // context from already-available V8 inputs; applyStrategyPrecedenceGuard
      // overrides the mode to stabilisation if any action-enabling gate is blocked.
      const plannerCtx = buildPlannerContext(formulationRecord, safetyResult, distressTier, options);
      strategyState = applyStrategyPrecedenceGuard(rawStrategyState, plannerCtx);
    } catch {
      strategyState = rawStrategyState;
    }

    try {
      const responsePolicy = extractResponsePolicyFromStrategyState(strategyState);
      if (typeof options.onStrategyPolicy === 'function') {
        options.onStrategyPolicy(responsePolicy, strategyState);
      }
    } catch {
      // Response-policy extraction is additive only; never suppress strategy output.
    }

    // Wave 2D — Emit safe strategy diagnostic when _s2debug=true is in the URL.
    // Gated, additive, no effect on routing or therapeutic behavior.
    // Never logs raw message content — only the sanitized diagnostic snapshot.
    // Wave 3E: pass ltsInputs so the LTS signal group is also emitted.
    // Wave 2E: pass current_message_available (bounded boolean, never raw text).
    _emitStrategyDiagnosticIfEnabled(strategyState, ltsInputs, {
      current_message_available:
        typeof options.message_text === 'string' && options.message_text.trim().length > 0,
    });

    // Wave 5D — Emit Quality Evaluator diagnostic when _s2debug=true and
    // QUALITY_EVALUATOR_ENABLED is set.  Additive only; no effect on routing or
    // therapeutic behavior.  Never includes raw text or private entity content.
    _emitEvaluatorDiagnosticIfEnabled({
      strategyState,
      ltsInputs,
      safetyResult,
      distressTier,
      wiringIdentity: _buildWiringIdentityForEvaluator(wiring),
    });

    // Step 8: Build strategy context section
    const strategySection = buildStrategyContextSection(strategyState);
    if (!strategySection || !strategySection.trim()) {
      return v7Base;
    }

    // Append precedence enforcement block when any legacy gate was blocked.
    const enforcementBlock = buildPrecedenceEnforcementBlock(strategyState);
    let result = _appendWithComposer(options, v7Base, {
      id: 'strategy_guidance',
      order: CONTEXT_COMPOSER_V2_SECTION_ORDER.strategy_guidance,
      retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.strategy_guidance,
      required: false,
      source_layer: 'v8_strategy',
      content: strategySection,
    });
    if (enforcementBlock) {
      result = _appendWithComposer(options, result, {
        id: 'precedence_enforcement',
        order: CONTEXT_COMPOSER_V2_SECTION_ORDER.precedence_enforcement,
        retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.precedence_enforcement,
        required: true,
        source_layer: 'v8_strategy',
        content: enforcementBlock,
      });
    }
    return result;
  } catch {
    // Fail-open: strategy computation failed — return V7 base content unchanged
    return v7Base;
  }
}

// ─── Wave 3C — LTS read path and V9 session-start injection ──────────────────

// LTS_SNAPSHOT_OVERFETCH_BOUND, LTS_READ_RESULTS, isLTSWeak and
// readLTSSnapshotWithDiagnostic are imported from ltsReaderContract.js (leaf
// module) and re-exported here for backward-compatibility with existing imports.
export { LTS_SNAPSHOT_OVERFETCH_BOUND, LTS_READ_RESULTS, isLTSWeak, readLTSSnapshotWithDiagnostic };

/**
 * Maximum number of items per array field included in the LTS context block.
 * Keeps the injected block compact and prevents over-loading the context window.
 *
 * @type {number}
 */
export const LTS_BLOCK_MAX_ARRAY_ITEMS = 4;

function _isS2DebugEnabled() {
  try {
    if (typeof window === 'undefined') return false;
    const search = window.location?.search ?? '';
    if (!search) return false;
    const params = new URLSearchParams(search);
    return params.get('_s2debug') === 'true';
  } catch {
    return false;
  }
}

function _emitV9LTSReadDiagnosticIfEnabled(readResult, ltsRecord) {
  try {
    if (!_isS2DebugEnabled()) return;
    const valid = !isLTSWeak(ltsRecord);
    const sessionCount =
      ltsRecord && typeof ltsRecord.session_count === 'number'
        ? ltsRecord.session_count
        : 0;
    const trajectory =
      ltsRecord && typeof ltsRecord.trajectory === 'string'
        ? ltsRecord.trajectory
        : '';

    console.group('[Wave 3C] LTS read diagnostic');
    console.log('read_result              :', readResult);
    console.log('lts_valid                :', valid);
    console.log('lts_session_count        :', sessionCount);
    console.log('lts_trajectory           :', trajectory);
    console.groupEnd();
  } catch {
    // Diagnostic emission must never propagate.
  }
}

/**
 * Emits the canonical memory reader diagnostic snapshot when _s2debug=true.
 *
 * Phase 4.1 — connects buildCanonicalMemoryDiagnosticSnapshot to the active
 * runtime by emitting the bounded fields from the actual canonical result used
 * during this session-start operation.
 *
 * SAFETY CONTRACT
 * ---------------
 * - Gated by _s2debug=true.  No-op in all other environments.
 * - Never logs memory records, summaries, user text, or raw content.
 * - Only emits the bounded structural fields from the diagnostic snapshot.
 * - Fail-closed on any error (never propagates).
 *
 * @private
 * @param {object|null} canonicalResult - Result from readCanonicalTherapistMemory
 */
function _emitCanonicalMemoryDiagnosticIfEnabled(canonicalResult) {
  try {
    if (!_isS2DebugEnabled()) return;
    const snap = buildCanonicalMemoryDiagnosticSnapshot(canonicalResult);
    console.group('[Phase 4.1] Canonical memory reader diagnostic');
    console.log('canonical_memory_reader_used :', snap.canonical_memory_reader_used);
    console.log('lts_valid                    :', snap.lts_valid);
    console.log('lts_read_result              :', snap.lts_read_result);
    console.log('lts_warming_up               :', snap.lts_warming_up);
    console.log('lts_session_count            :', snap.lts_session_count);
    console.log('continuity_session_count     :', snap.continuity_session_count);
    console.log('continuity_read_result       :', snap.continuity_read_result);
    console.groupEnd();
  } catch {
    // Diagnostic emission must never propagate.
  }
}

/**
 * Internal compatibility wrapper used by the V9/V10 runtime paths.
 * Keeps the historical fail-open contract (null on any failure/absence).
 *
 * @private
 * @param {object} entities
 * @returns {Promise<object|null>}
 */
async function readLTSSnapshot(entities) {
  const result = await readLTSSnapshotWithDiagnostic(entities);
  return result.ltsRecord;
}

/**
 * Builds a compact, bounded LTS context block string for injection into the
 * therapist session-start payload.
 *
 * FIELDS INCLUDED
 * ---------------
 * The LTS block intentionally surfaces ONLY the signals not already present in
 * the cross-session continuity block (which covers recent patterns, open tasks,
 * interventions, and risk flags from the last 3 sessions):
 *
 *   trajectory           — The longitudinal clinical arc (unique to LTS; not
 *                          surfaced anywhere else in the session-start context).
 *   helpful_interventions — Interventions co-occurring with positive sessions
 *                          (not present in continuity block).
 *   risk_flag_history    — Safety signal across ALL sessions (continuity only
 *                          covers the last 3).
 *
 * Recurring patterns and persistent open tasks are deliberately excluded to
 * avoid noise and duplication with the continuity block.
 *
 * SUPPRESSION
 * -----------
 * Returns '' when:
 *   - ltsRecord is null, invalid, or fails isLTSWeak().
 *   - trajectory is 'unknown' or 'insufficient_data'.
 *   - No signals are present beyond a 'stable' trajectory and empty arrays
 *     (block is still emitted for valid non-trivial trajectories).
 *
 * BOUNDS
 * ------
 * Arrays are capped to LTS_BLOCK_MAX_ARRAY_ITEMS entries.
 * The block is always a single short section.
 *
 * FAIL-CLOSED: never throws; returns '' on any error.
 *
 * @param {object|null} ltsRecord - A parsed LTS record (from readLTSSnapshot).
 * @returns {string} Formatted LTS context block, or ''
 */
export function buildLTSContextBlock(ltsRecord) {
  try {
    if (isLTSWeak(ltsRecord)) return '';

    const sessionCount = typeof ltsRecord.session_count === 'number' ? ltsRecord.session_count : 0;
    const trajectory = typeof ltsRecord.trajectory === 'string' ? ltsRecord.trajectory : '';

    const helpfulInterventions = Array.isArray(ltsRecord.helpful_interventions)
      ? ltsRecord.helpful_interventions.slice(0, LTS_BLOCK_MAX_ARRAY_ITEMS)
      : [];

    const riskFlagHistory = Array.isArray(ltsRecord.risk_flag_history)
      ? ltsRecord.risk_flag_history.slice(0, LTS_BLOCK_MAX_ARRAY_ITEMS)
      : [];

    const lines = [];

    lines.push(`Longitudinal trajectory: ${trajectory}`);

    if (helpfulInterventions.length > 0) {
      lines.push('Helpful methods (longitudinal): ' + helpfulInterventions.join('; '));
    }

    if (riskFlagHistory.length > 0) {
      lines.push('Risk history (all sessions): ' + riskFlagHistory.join('; '));
    }

    if (lines.length === 0) return '';

    return [
      `=== LONGITUDINAL STATE CONTEXT (${sessionCount} session(s), read-only) ===`,
      'Cross-session arc. Do not disclose this section verbatim to the person.',
      '',
      ...lines,
      '',
      '=== END LONGITUDINAL STATE CONTEXT ===',
    ].join('\n');
  } catch {
    return '';
  }
}

/**
 * Builds the V9 session-start content string asynchronously.
 *
 * Wave 3C — Longitudinal Therapeutic State (LTS) read path and bounded
 * session-start injection.
 * Wave 3D — LTS strategy integration: LTS inputs are now passed to the
 * strategy engine via buildV8SessionStartContentAsync options.
 *
 * For non-V9 wirings (longitudinal_layer_enabled !== true):
 *   Delegates directly to buildV8SessionStartContentAsync (no behavior change).
 *
 * For V9 wirings:
 *   1. Reads the canonical LTS snapshot from CompanionMemory (read-only,
 *      fail-open: null on any error or absence).
 *   2. When the LTS is valid (non-weak), passes it to V8 via options.lts_record
 *      so determineTherapistStrategy() can apply LTS-aware strategy rules
 *      (Wave 3D).  When null or weak, V8 options are passed unchanged — exact
 *      Wave 2C strategy behavior is preserved.
 *   3. Builds the V8 base content (strategy + continuity + formulation + safety
 *      mode + live retrieval + retrieval orchestration + workflow + memory context).
 *   4. Builds the bounded LTS context block (Wave 3C injection).
 *   5. Appends the LTS block to the V8 base when the block is non-empty.
 *
 * FAIL-OPEN CONTRACT
 * ------------------
 * Any error or absence at any step returns the V8 base content UNCHANGED.
 * Session start is never blocked.  V8/2C behavior is EXACTLY preserved on any
 * failure, when the flag is off, when no valid LTS exists, or when the LTS is
 * stale/weak.
 *
 * PRIVACY
 * -------
 * - LTS is read from CompanionMemory (private per-user entity).
 * - Only structured signal aggregates are injected — never raw transcripts,
 *   user quotes, or session messages.
 * - The LTS block is injected into the per-user session payload only.
 *   It is never stored, logged, or returned to the client directly.
 *
 * SAFETY NOTE
 * -----------
 * The LTS block and LTS-aware strategy inputs are additive context.  They do
 * NOT replace, weaken, or bypass any existing safety filter, crisis handler,
 * strategy guidance, or continuity block.  All prior layers remain fully active.
 * CONTAINMENT and TIER_MODERATE STABILISATION are never overridden by LTS.
 *
 * ISOLATION GUARANTEE
 * -------------------
 * This function is ONLY active when wiring.longitudinal_layer_enabled === true
 * (V9 path).  All prior paths (HYBRID, V1–V8) are completely unaffected.
 *
 * @param {object} wiring - The active therapist wiring configuration
 * @param {object} entities - Base44 entity client map
 * @param {object} baseClient - Base44 SDK client (passed to V8 chain)
 * @param {object} [options] - Optional options forwarded to V8 chain
 * @returns {Promise<string>} The full session-start content string
 */
export async function buildV9SessionStartContentAsync(
  wiring,
  entities,
  baseClient,
  options = {},
) {
  // For non-V9 wirings: delegate to V8 (no change to behavior)
  if (!wiring || wiring.longitudinal_layer_enabled !== true) {
    return buildV8SessionStartContentAsync(wiring, entities, baseClient, options);
  }

  // ── V9 path ────────────────────────────────────────────────────────────────

  // Phase 4 — Canonical Therapist Memory Adapter: one read orchestration per
  // session-start operation.  Replaces the direct readLTSSnapshotWithDiagnostic
  // call and provides the canonical result to all downstream paths (V10+) via
  // options.canonical_memory_result, eliminating duplicate CompanionMemory reads.
  //
  // If options.canonical_memory_result is already provided by V10 (which calls V9
  // first and pre-reads the canonical result to pass through), reuse it rather
  // than performing a second read.
  let canonicalMemoryResult = null;
  let ltsRecord = null;
  let ltsReadResult = LTS_READ_RESULTS.read_error;
  try {
    if (options?.canonical_memory_result && typeof options.canonical_memory_result === 'object') {
      // Reuse the pre-read canonical result — no duplicate CompanionMemory fetch.
      canonicalMemoryResult = options.canonical_memory_result;
    } else {
      canonicalMemoryResult = await readCanonicalTherapistMemory(entities);
    }
    ltsRecord = canonicalMemoryResult?.lts?.record ?? null;
    ltsReadResult = canonicalMemoryResult?.lts?.read_result ?? LTS_READ_RESULTS.read_error;
  } catch {
    ltsRecord = null;
    ltsReadResult = LTS_READ_RESULTS.read_error;
  }
  _emitV9LTSReadDiagnosticIfEnabled(ltsReadResult, ltsRecord);
  // Phase 4.1 — emit canonical memory diagnostic (gated by _s2debug, fail-closed).
  // Uses the actual canonical result so diagnostics always reflect the real runtime state.
  _emitCanonicalMemoryDiagnosticIfEnabled(canonicalMemoryResult);

  // Wave 3D: Pass a valid (non-weak) LTS record to the V8 strategy engine via
  // the options bag.  buildV8SessionStartContentAsync extracts LTS strategy
  // inputs from options.lts_record and passes them to determineTherapistStrategy.
  // When ltsRecord is null or weak, options is passed unchanged (exact V8/2C
  // behavior is preserved).
  // Phase 4: also pass canonical_memory_result so V8 path can reference it if needed.
  const v8Options = !isLTSWeak(ltsRecord)
    ? { ...options, lts_record: ltsRecord, canonical_memory_result: canonicalMemoryResult }
    : { ...options, canonical_memory_result: canonicalMemoryResult };

  // Step 1: Build the V8 base content (with LTS strategy inputs when available)
  const v8Base = await buildV8SessionStartContentAsync(
    wiring,
    entities,
    baseClient,
    v8Options,
  );

  // Wave 3C: Inject LTS context block (fail-open: any error returns v8Base)
  try {
    if (!isLTSWeak(ltsRecord)) {
      const ltsBlock = buildLTSContextBlock(ltsRecord);
      if (ltsBlock && ltsBlock.trim()) {
        return _appendWithComposer(v8Options, v8Base, {
          id: 'longitudinal_state_context',
          order: CONTEXT_COMPOSER_V2_SECTION_ORDER.longitudinal_state_context,
          retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.longitudinal_state_context,
          required: false,
          source_layer: 'v9_lts',
          content: ltsBlock,
        });
      }
    }
    return v8Base;
  } catch {
    // Fail-open: LTS block injection failed — return V8 base content unchanged
    return v8Base;
  }
}

async function buildV10KnowledgeReferenceForTurn(wiring, entities, options = {}, canonicalResult = null, baseClient = null) {
  const authority = buildV10KnowledgeRuntimeAuthority(wiring);
  if (!authority) return '';

  try {
    const formulationRecord = await readBestFormulationRecord(
      entities,
      options?.conversation_id,
      options?.continuation_session_id,
    );
    const [{ extractFormulationHintsForPlanner, retrieveBoundedCBTKnowledgeBlock }, { planCBTKnowledgeRetrieval }] =
      await Promise.all([
        import('./cbtKnowledgeRetrieval.js'),
        import('./cbtKnowledgePlanner.js'),
      ]);
    const formulationHints = extractFormulationHintsForPlanner(formulationRecord);

    let safetyResult;
    try {
      safetyResult = determineSafetyMode({
        crisis_signal: options.crisis_signal ?? false,
        low_retrieval_confidence: options.low_retrieval_confidence ?? false,
        allowlist_rejection: options.allowlist_rejection ?? false,
        flag_override: options.flag_override ?? false,
        message_text: options.message_text ?? '',
      });
    } catch {
      safetyResult = SAFETY_MODE_FAIL_CLOSED_RESULT;
    }
    const safetyActive = safetyResult?.safety_mode === true;
    const messageSignals = extractMessageSignals(options.message_text ?? '');
    const distressTier = scoreDistressTier(safetyResult, messageSignals);

    let ltsRecord = null;
    try {
      if (canonicalResult && typeof canonicalResult === 'object' && canonicalResult.lts) {
        ltsRecord = canonicalResult.lts.record ?? null;
      } else {
        ltsRecord = await readLTSSnapshot(entities);
      }
    } catch {
      ltsRecord = null;
    }
    const ltsInputsForPlanner = extractLTSStrategyInputs(ltsRecord);
    const rawStrategyState = determineTherapistStrategy(
      null,
      formulationRecord,
      distressTier,
      messageSignals,
      ltsInputsForPlanner,
    );
    const plannerContext = buildPlannerContext(
      formulationRecord,
      safetyResult,
      distressTier,
      options,
    );

    // Knowledge may support an intervention only after the canonical L5 gate.
    // Formulation readiness alone must never promote retrieval.
    if (plannerContext.intervention_ready !== true) return authority;

    const strategyState = applyStrategyPrecedenceGuard(rawStrategyState, plannerContext);
    const plan = planCBTKnowledgeRetrieval({
      flagEnabled: true,
      strategyState,
      ltsInputs: ltsInputsForPlanner,
      formulationHints,
      distressTier,
      safetyActive,
    });
    if (!plan.shouldRetrieve) return authority;

    const knowledgeBlock = await retrieveBoundedCBTKnowledgeBlock(
      entities,
      plan,
      options?.sessionLanguage,
      baseClient?.functions,
    );
    return knowledgeBlock?.trim()
      ? `${authority}\n\n${knowledgeBlock}`
      : authority;
  } catch {
    // Fail closed for knowledge and fail open for the chat response: the agent
    // still receives the authority block and must remain in formulation mode.
    return authority;
  }
}

export async function buildV10TurnKnowledgeContextAsync(wiring, entities, options = {}, baseClient = null) {
  return buildV10KnowledgeReferenceForTurn(wiring, entities, options, null, baseClient);
}

// ─── Wave 4C — CBT Knowledge Retrieval read path and V10 session-start injection

/**
 * Builds the V10 session-start content string asynchronously.
 *
 * Wave 4C — CBT Knowledge Retrieval read path.
 * Wave 4D — Strategy-knowledge alignment.
 *
 * For non-V10 wirings (knowledge_layer_enabled !== true):
 *   Delegates directly to buildV9SessionStartContentAsync (no behavior change).
 *
 * For V10 wirings:
 *   1. Builds the V9 base content (LTS block + strategy + formulation + all
 *      prior layers) by delegating to buildV9SessionStartContentAsync.
 *   2. Reads the best CaseFormulation record (same bounded read V8 performs;
 *      fail-open: null on any error).
 *   3. Extracts structured formulationHints for the planner using the
 *      extractFormulationHintsForPlanner() helper from cbtKnowledgeRetrieval.js
 *      — reads only the structured cbt_domain and treatment_phase fields;
 *      NEVER analyses free-text fields.
 *   4. Evaluates the safety mode from options flags (no extra entity read).
 *   5. Scores the distress tier from safety result + message signals.
 *   6. (Wave 4D) Reads the LTS snapshot for knowledge planner alignment
 *      (fail-open: null on any error).  Extracts bounded LTS strategy inputs.
 *   7. Determines the therapeutic strategy state with LTS-aware inputs
 *      (continuityData=null is intentional — avoids a duplicate CompanionMemory
 *      full-window read; LTS inputs provide trajectory signals instead).
 *   8. Runs planCBTKnowledgeRetrieval() with the above bounded inputs, including
 *      ltsInputs so the planner can refine unit type preference from trajectory.
 *   9. If shouldRetrieve: retrieves ≤ CBT_KNOWLEDGE_RETRIEVAL_MAX_UNITS units,
 *      ranked by unit type preference (Wave 4D).
 *  10. Appends the knowledge block (last, always) when non-empty.
 *
 * FAIL-OPEN CONTRACT
 * ------------------
 * Any error after building v9Base returns v9Base unchanged.
 * The knowledge block is NEVER the first thing in the content — it is always
 * appended last as a supplementary reference block.
 *
 * PRECEDENCE
 * ----------
 * Safety → distress → strategy → formulation domain → retrieval.
 * Retrieved knowledge does NOT override safety, formulation, continuity,
 * strategy, or LTS blocks.  It is supporting context only.
 *
 * COMPANION ISOLATION
 * -------------------
 * This function is never called for AI Companion wirings.
 * The knowledge_layer_enabled flag only exists on CBT Therapist V10 wiring.
 *
 * @param {object}  wiring          - The active CBT Therapist wiring config.
 * @param {object}  entities        - Base44 entity client map.
 * @param {object}  baseClient      - Base44 SDK client (passed through to V9/V8).
 * @param {object}  [options={}]    - Session-start options (crisis_signal, message_text, etc.)
 * @returns {Promise<string>} The full session-start content string.
 */
export async function buildV10SessionStartContentAsync(
  wiring,
  entities,
  baseClient,
  options = {},
) {
  // For non-V10 wirings: delegate to V9 (no change to behavior)
  if (!wiring || wiring.knowledge_layer_enabled !== true) {
    return buildV9SessionStartContentAsync(wiring, entities, baseClient, options);
  }

  // ── V10 path ────────────────────────────────────────────────────────────────

  // Phase 4 — Pre-read the canonical memory result before calling V9, so that
  // V9 can reuse it (via options.canonical_memory_result) without a duplicate
  // CompanionMemory fetch.  If options.canonical_memory_result is already present
  // (pre-read by a higher-level caller), reuse it directly.
  let v10CanonicalResult = options?.canonical_memory_result ?? null;
  if (!v10CanonicalResult) {
    try {
      v10CanonicalResult = await readCanonicalTherapistMemory(entities);
    } catch {
      v10CanonicalResult = null;
    }
  }
  const v10Options = v10CanonicalResult
    ? { ...options, canonical_memory_result: v10CanonicalResult }
    : options;

  // Step 1: Build the V9 base content (LTS injection + all prior layers).
  // V9 reads the LTS snapshot and passes it to V8's strategy engine internally.
  // V10 inherits the full V9 output as its base and only ever appends to it.
  // Phase 4: pass v10Options so V9 reuses the pre-read canonical result.
  const v9Base = await buildV9SessionStartContentAsync(
    wiring,
    entities,
    baseClient,
    v10Options,
  );

  const v10KnowledgeContext = await buildV10KnowledgeReferenceForTurn(
    wiring,
    entities,
    v10Options,
    v10CanonicalResult,
    baseClient,
  );
  if (!v10KnowledgeContext.trim()) return v9Base;
  return _appendWithComposer(v10Options, v9Base, {
    id: 'cbt_knowledge_context',
    order: CONTEXT_COMPOSER_V2_SECTION_ORDER.cbt_knowledge_context,
    retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.cbt_knowledge_context,
    required: true,
    source_layer: 'v10_knowledge_runtime',
    content: v10KnowledgeContext,
  });
}

// ─── Phase 3 Competence Architecture — V11 session-start injection ────────────

/**
 * Builds the V11 session-start content string asynchronously.
 *
 * For non-V11 wirings (competence_layer_enabled !== true):
 *   Delegates directly to buildV10SessionStartContentAsync (no behavior change).
 *
 * For V11 wirings:
 *   1. Builds the V10 base content (knowledge block + LTS + strategy + formulation
 *      + all prior layers) by delegating to buildV10SessionStartContentAsync.
 *   2. Appends the Phase 3 competence instruction block (THERAPIST_COMPETENCE_INSTRUCTIONS)
 *      sourced from therapistWorkflowEngine.js.
 *   3. Returns the combined string.
 *
 * The competence block is appended LAST — after all prior layers — and does NOT
 * override safety, formulation, continuity, strategy, LTS, or knowledge signals.
 *
 * FAIL-OPEN: any error at any step returns the V10 base content unchanged.
 * The V10 base content itself is fail-open through its own chain.
 *
 * The competence_layer_enabled flag only exists on CBT Therapist V11 wiring.
 * All prior wirings (HYBRID, V1–V10) are completely unaffected by this function.
 *
 * @param {object}  wiring          - The active CBT Therapist wiring config object
 * @param {object}  entities        - Base44 entity client map
 * @param {object}  baseClient      - Base44 SDK client (passed through to V10/V9)
 * @param {object}  [options]       - Optional bag (passed through to V10/V9 chain)
 * @returns {Promise<string>} Session-start content string
 */
export async function buildV11SessionStartContentAsync(wiring, entities, baseClient, options) {
  // For non-V11 wirings: delegate to V10 (no change to behavior)
  if (!wiring || wiring.competence_layer_enabled !== true) {
    return buildV10SessionStartContentAsync(wiring, entities, baseClient, options);
  }

  // ── V11 path ────────────────────────────────────────────────────────────────

  // Step 1: Build V10 base content (fail-open chain handles all errors internally)
  const v10Base = await buildV10SessionStartContentAsync(wiring, entities, baseClient, options);

  try {
    // Step 2: Import the competence instruction block from the workflow engine
    const { THERAPIST_COMPETENCE_INSTRUCTIONS } = await import('./therapistWorkflowEngine.js');

    // Step 3: Append the competence block when non-empty
    if (THERAPIST_COMPETENCE_INSTRUCTIONS && THERAPIST_COMPETENCE_INSTRUCTIONS.trim()) {
      return _appendWithComposer(options, v10Base, {
        id: 'competence_instructions',
        order: CONTEXT_COMPOSER_V2_SECTION_ORDER.competence_instructions,
        retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.competence_instructions,
        required: false,
        source_layer: 'v11_competence',
        content: THERAPIST_COMPETENCE_INSTRUCTIONS,
      });
    }
    return v10Base;
  } catch {
    // Fail-open: any error returns V10 base content unchanged
    return v10Base;
  }
}

// ─── Wave 5 — Formulation-First Planner Policy — V12 session-start injection ─

/**
 * Returns the Wave 5 formulation-first planner policy instruction block when
 * the wiring has planner_first_enabled === true, otherwise null.
 *
 * @param {object|null} wiring - The active therapist wiring configuration
 * @returns {string|null} The planner-first instruction string, or null
 */
export function getPlannerFirstContextForWiring(wiring) {
  if (!wiring || wiring.planner_first_enabled !== true) {
    return null;
  }
  return THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
}

/**
 * Builds the V12 session-start content string asynchronously.
 *
 * Wave 5 — Formulation-First Planner Policy.
 *
 * For non-V12 wirings (planner_first_enabled !== true):
 *   Delegates directly to buildV11SessionStartContentAsync (no behavior change).
 *
 * For V12 wirings:
 *   1. Builds the V11 base content (competence + knowledge + LTS + strategy +
 *      formulation + all prior layers) by delegating to buildV11.
 *   2. Imports THERAPIST_PLANNER_FIRST_INSTRUCTIONS from therapistWorkflowEngine.js.
 *   3. Appends the planner-first block when non-empty.
 *
 * FAIL-OPEN: any error at any step returns the V11 base content unchanged.
 * The V11 base content itself is fail-open through its own chain.
 *
 * The planner_first_enabled flag only exists on CBT Therapist V12 wiring.
 * All prior wirings (HYBRID, V1–V11) are completely unaffected by this function.
 *
 * @param {object}  wiring          - The active therapist wiring configuration
 * @param {object}  entities        - Base44 entity client map
 * @param {object}  baseClient      - Base44 SDK client (passed through to V11/V10)
 * @param {object}  [options]       - Optional bag (passed through to V11/V10 chain)
 * @returns {Promise<string>} The full session-start content string
 */
export async function buildV12SessionStartContentAsync(wiring, entities, baseClient, options) {
  // For non-V12 wirings: delegate to V11 (no change to behavior)
  if (!wiring || wiring.planner_first_enabled !== true) {
    return buildV11SessionStartContentAsync(wiring, entities, baseClient, options);
  }

  // ── V12 path ────────────────────────────────────────────────────────────────

  // Step 1: Build V11 base content (fail-open chain handles all errors internally)
  const v11Base = await buildV11SessionStartContentAsync(wiring, entities, baseClient, options);

  try {
    // Step 2: Append the planner-first block when non-empty (synchronous import)
    if (THERAPIST_PLANNER_FIRST_INSTRUCTIONS && THERAPIST_PLANNER_FIRST_INSTRUCTIONS.trim()) {
      return _appendWithComposer(options, v11Base, {
        id: 'planner_first_instructions',
        order: CONTEXT_COMPOSER_V2_SECTION_ORDER.planner_first_instructions,
        retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.planner_first_instructions,
        required: true,
        source_layer: 'v12_planner',
        content: THERAPIST_PLANNER_FIRST_INSTRUCTIONS,
      });
    }
    return v11Base;
  } catch {
    // Fail-open: any error returns V11 base content unchanged
    return v11Base;
  }
}

// ─── Action-First Demotion — Universal formulation-first default ──────────────

/**
 * Emits the Context Composer V2 diagnostic snapshot to the console when
 * `?_s2debug=true` is present in the URL.  No-op in all other environments.
 *
 * SAFETY CONTRACT
 * ---------------
 * - Gated by _s2debug=true in the URL.
 * - Only emits bounded structural fields: boolean flags, counts, and bounded
 *   string IDs.  Never emits section content or clinical text.
 * - Does NOT change any routing decision or therapeutic behavior.
 * - Fail-closed on any error (never propagates).
 *
 * @private
 * @param {object|null} diagnostic - Diagnostic from the finalized composer result
 */
function _emitContextComposerDiagnosticIfEnabled(diagnostic) {
  try {
    if (!_isS2DebugEnabled()) return;
    if (!diagnostic || typeof diagnostic !== 'object') return;
    console.group('[Context Composer V2] Final diagnostic');
    console.log('context_composer_used    :', diagnostic.context_composer_used ?? false);
    console.log('context_composer_version :', diagnostic.context_composer_version ?? 'unknown');
    console.log('section_count            :', diagnostic.section_count ?? 0);
    console.log('emitted_section_ids      :', diagnostic.emitted_section_ids ?? []);
    console.log('omitted_section_ids      :', diagnostic.omitted_section_ids ?? []);
    console.log('budget_exceeded          :', diagnostic.budget_exceeded ?? false);
    console.log('fallback_used            :', diagnostic.fallback_used ?? false);
    console.log('fallback_reason          :', diagnostic.fallback_reason ?? null);
    console.log('parity_match             :', diagnostic.parity_match ?? true);
    console.groupEnd();
  } catch (_e) {
    // Diagnostic emission must never propagate — fail silently.
  }
}

/**
 * Builds the session-start content with action-first demotion applied
 * unconditionally to ALL wiring paths.
 *
 * BACKGROUND
 * ----------
 * buildV12SessionStartContentAsync injects THERAPIST_PLANNER_FIRST_INSTRUCTIONS
 * only when wiring.planner_first_enabled === true (V12 path).  The HYBRID path
 * and all intermediate wirings (V1–V11) return their content without the block,
 * which means action-first / exercise-first behavior remains a possible LLM
 * default on those paths — because no instruction explicitly demotes it.
 *
 * ACTION-FIRST DEMOTION
 * ---------------------
 * This function closes that gap.  It calls buildV12SessionStartContentAsync and,
 * if the result does not already contain THERAPIST_PLANNER_FIRST_INSTRUCTIONS,
 * appends the block unconditionally.  Every session — regardless of the active
 * wiring — therefore receives the formulation-first planner policy instructions.
 *
 * The policy instructs the LLM:
 *   "Intervention selection and micro-step assignment must NEVER be the default
 *    first output. They are the last resort, reached only after understanding,
 *    formulation, target identification, and move-type selection are complete."
 *
 * This makes formulation-first the runtime default for all session paths.
 * The action/exercise path remains available but only after formulation readiness
 * gates are satisfied (as defined in THERAPIST_INTERVENTION_READINESS_GATES).
 *
 * DEFAULT ROUTE (enforced for all wirings after this change)
 * ----------------------------------------------------------
 *   1. acknowledge
 *   2. hold briefly
 *   3. clarify
 *   4. formulate
 *   5. identify target
 *   6. decide move type
 * Only after all six steps may action / exercise / micro-step / homework /
 * direct behavioral suggestion be offered.
 *
 * ACTION PATH ACTIVATION CONDITIONS (required before any action)
 * --------------------------------------------------------------
 *   • enough understanding established
 *   • explicit or implicit formulation in place
 *   • treatment target identified
 *   • readiness for action signal present
 *   • no active higher-priority holding/clarification condition
 * (Defined in THERAPIST_INTERVENTION_READINESS_GATES and THERAPIST_PLANNER_FIRST_INSTRUCTIONS.)
 *
 * No domain label alone (social anxiety, ADHD, OCD, grief, trauma, etc.) may
 * trigger action.  Domain classification never skips the formulation-first sequence.
 *
 * SAFETY CONTRACT
 * ---------------
 * - Fail-open: any error returns the base V12 output unchanged (session never blocked).
 * - Additive only: appends the block after existing content; never replaces.
 * - Does NOT weaken any existing safety filter, wiring config, or entity access rule.
 * - All prior layers (safety, formulation, continuity, strategy, knowledge) are preserved.
 *
 * PRESERVED GAINS
 * ---------------
 * - V12 and other upgraded-path content is fully preserved (no duplication).
 * - Cross-language parity: THERAPIST_PLANNER_FIRST_INSTRUCTIONS contains no
 *   language-specific restrictions — the policy applies in all 7 supported languages.
 * - Warmth, alliance, pacing, and competence instructions are unaffected.
 * - All prior planner, precedence, and safety-mode layers remain active.
 *
 * @param {object}  wiring     - The active CBT Therapist wiring config object
 * @param {object}  entities   - Base44 entity client map
 * @param {object}  baseClient - Base44 SDK client
 * @param {object}  [options]  - Optional bag passed through to V12 chain
 * @returns {Promise<string>} Session-start content with formulation-first policy enforced
 */
export async function buildActionFirstDemotedSessionContentAsync(
  wiring,
  entities,
  baseClient,
  options = {},
) {
  let composerOptions = options;
  let composerCreationFailed = false;
  try {
    composerOptions = _shouldUseContextComposerV2(wiring, options)
      ? _createContextComposerV2Options(options)
      : options;
  } catch {
    composerCreationFailed = true;
  }

  const effectiveOptions = composerCreationFailed ? options : composerOptions;
  const base = await buildV12SessionStartContentAsync(wiring, entities, baseClient, effectiveOptions);

  try {
    const block = THERAPIST_PLANNER_FIRST_INSTRUCTIONS;
    if (typeof block !== 'string' || !block.trim()) {
      const finalized = composerCreationFailed ? null : _finalizeContextComposerV2(effectiveOptions, base);
      return finalized?.rendered ?? base;
    }

    let content = base;
    if (!content.includes(block)) {
      content = composerCreationFailed
        ? `${content}

${block}`
        : _appendWithComposer(effectiveOptions, content, {
            id: 'planner_first_instructions',
            order: CONTEXT_COMPOSER_V2_SECTION_ORDER.planner_first_instructions,
            retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.planner_first_instructions,
            required: true,
            source_layer: 'action_first_wrapper',
            content: block,
          });
    }

    if (
      wiring?.name === 'cbt_therapist' &&
      (wiring?.attachment_context_enabled === true || wiring?.attachment_context_enabled === undefined) &&
      !content.includes(THERAPIST_ATTACHMENT_CONTEXT_INSTRUCTIONS)
    ) {
      content = composerCreationFailed
        ? `${content}

${THERAPIST_ATTACHMENT_CONTEXT_INSTRUCTIONS}`
        : _appendWithComposer(effectiveOptions, content, {
            id: 'attachment_context_instructions',
            order: CONTEXT_COMPOSER_V2_SECTION_ORDER.attachment_context_instructions,
            retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.attachment_context_instructions,
            required: false,
            source_layer: 'action_first_wrapper',
            content: THERAPIST_ATTACHMENT_CONTEXT_INSTRUCTIONS,
          });
    }

    const therapistFormLibraryInstructions = getTherapeuticFormsPolicyPayload({
      sessionLanguage: options?.sessionLanguage,
      sessionAudience: options?.sessionAudience,
      environment: options?.environment,
    }).policy;

    if (
      wiring?.name === 'cbt_therapist' &&
      !content.includes(therapistFormLibraryInstructions)
    ) {
      content = composerCreationFailed
        ? `${content}

${therapistFormLibraryInstructions}`
        : _appendWithComposer(effectiveOptions, content, {
            id: 'therapeutic_forms_policy',
            order: CONTEXT_COMPOSER_V2_SECTION_ORDER.therapeutic_forms_policy,
            retention_priority: CONTEXT_COMPOSER_V2_SECTION_PRIORITY.therapeutic_forms_policy,
            required: false,
            source_layer: 'action_first_wrapper',
            content: therapistFormLibraryInstructions,
          });
    }

    const finalized = composerCreationFailed ? null : _finalizeContextComposerV2(effectiveOptions, content);
    _emitContextComposerDiagnosticIfEnabled(finalized?.diagnostic ?? null);
    return finalized?.rendered ?? content;
  } catch {
    const finalized = composerCreationFailed ? null : _finalizeContextComposerV2(effectiveOptions, base);
    _emitContextComposerDiagnosticIfEnabled(finalized?.diagnostic ?? null);
    return finalized?.rendered ?? base;
  }
}

// ─── AI Companion Upgrade V2 — Companion session-start context ───────────────

/**
 * Builds the session-start message content for the AI Companion V2 upgraded path.
 *
 * For non-V2 wirings (continuity_enabled absent or false):
 *   Returns '[START_SESSION]' unchanged — identical to the default companion path.
 *
 * For V2 (continuity_enabled === true):
 *   1. Reads native CompanionMemory records via buildCompanionContinuityBlock.
 *   2. Scores/filters records for warmth/richness — thin/generic memories are
 *      suppressed; only personally meaningful records are injected.
 *   3. Returns '[START_SESSION]' with the warm context block appended.
 *   4. If the block is empty (no useful memories), returns '[START_SESSION]'
 *      unchanged — the fallback is always a clean warm session start.
 *
 * ROLE BOUNDARY
 * -------------
 * This function is the companion equivalent of buildV7SessionStartContentAsync.
 * It is completely independent of the therapist upgrade chain:
 *   - Never reads CaseFormulation or ThoughtJournal (prohibited for Companion).
 *   - Uses buildCompanionContinuityBlock, not buildCrossSessionContinuityBlock.
 *   - Therapist UPGRADE_* flags have no effect here.
 *
 * FAIL-CLOSED: never throws; never blocks session start.
 *
 * @param {object} wiring   - The active AI Companion wiring config object
 * @param {object} entities - Base44 entity client map
 * @returns {Promise<string>} Session-start content string
 */
async function buildCompanionSessionStartContextAsync(wiring, entities) {
  if (!wiring || wiring.continuity_enabled !== true) {
    return '[START_SESSION]';
  }

  let continuityBlock = '';
  try {
    const { buildCompanionContinuityBlock } = await import('./companionContinuity.js');
    continuityBlock = await buildCompanionContinuityBlock(entities);
  } catch {
    // Fail-closed: continuity injection failure must never block session start
    continuityBlock = '';
  }

  if (!continuityBlock || !continuityBlock.trim()) {
    return '[START_SESSION]';
  }

  return '[START_SESSION]\n\n' + continuityBlock;
}
