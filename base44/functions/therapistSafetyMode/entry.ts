/**
 * @file base44/functions/therapistSafetyMode/entry.ts
 *
 * Therapist Upgrade — Phase 7 — Therapist Safety Mode (Backend Function)
 *
 * Evaluates safety mode entry conditions for the upgraded therapist path and
 * returns the mode determination result.
 *
 * WHAT THIS FUNCTION DOES
 * -----------------------
 * 1. Accepts a bounded set of safety signals (crisis_signal, retrieval
 *    confidence, allowlist_rejection, flag_override) and an optional message
 *    text.
 * 2. Evaluates the signals in order to determine whether safety mode should
 *    be active for the current turn.
 * 3. Returns a structured SafetyModeResult indicating whether safety mode is
 *    active, what triggered it, and whether the result is fail-closed.
 *
 * FAIL-CLOSED CONTRACT
 * --------------------
 * If mode determination fails for any reason, the function returns
 * safety_mode: true (restricted), not false.  Any uncertainty defaults
 * to the restricted safe path.
 *
 * ACTIVATION
 * ----------
 * Gated by both THERAPIST_UPGRADE_ENABLED and THERAPIST_UPGRADE_SAFETY_MODE_ENABLED
 * environment variables.  Returns 503 when either flag is not 'true'.
 *
 * ISOLATION
 * ---------
 * This function has no effect on the current default therapist path
 * (CBT_THERAPIST_WIRING_HYBRID).  It is only reachable when both upgrade
 * flags are explicitly enabled.
 *
 * WHAT THIS FUNCTION MUST NOT DO
 * --------------------------------
 * - Call the existing crisis detector (enhancedCrisisDetector) directly —
 *   this function LAYERS ON TOP of the existing crisis stack, not replacing it.
 * - Alter the default therapist path in any way.
 * - Weaken existing crisis detection, risk panel, or safety filter behavior.
 * - Make LLM calls (this is a deterministic function).
 * - Store raw user message content.
 *
 * INPUT (JSON body)
 * -----------------
 * {
 *   crisis_signal?:             boolean,  // Crisis signal from existing stack
 *   low_retrieval_confidence?:  boolean,  // Low retrieval confidence (Phase 5)
 *   allowlist_rejection?:       boolean,  // Allowlist rejection (Phase 6)
 *   flag_override?:             boolean,  // Explicit override by caller
 *   message_text?:              string,   // User message (optional; NOT stored)
 * }
 *
 * OUTPUT
 * ------
 * {
 *   success: true,
 *   safety_mode: boolean,      // Whether safety mode should be active
 *   trigger: string | null,    // Category that triggered safety mode
 *   category: string | null,   // Same as trigger (alias)
 *   pattern_match: boolean,    // Whether activation was via text pattern
 *   fail_closed?: boolean,     // Present and true on fail-closed path
 * }
 * { success: false, error: string }                — validation error
 * { success: false, error: string, gated: true }   — flag off (HTTP 503)
 *
 * See docs/therapist-upgrade-stage2-plan.md — Phase 7, Task 7.1
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Safety trigger categories ────────────────────────────────────────────────

const SAFETY_TRIGGER_CATEGORIES = {
  CRISIS_SIGNAL: 'crisis_signal',
  LOW_RETRIEVAL_CONFIDENCE: 'low_retrieval_confidence',
  ALLOWLIST_REJECTION: 'allowlist_rejection',
  FLAG_OVERRIDE: 'flag_override',
  SEVERE_HOPELESSNESS: 'severe_hopelessness',
  SHUTDOWN_BREAKDOWN: 'shutdown_breakdown',
  CATASTROPHIC_LANGUAGE: 'catastrophic_language',
  HIGH_DISTRESS: 'high_distress',
} as const;

// ─── Fail-closed sentinel ─────────────────────────────────────────────────────

const SAFETY_MODE_FAIL_CLOSED_RESULT = {
  safety_mode: true,
  trigger: SAFETY_TRIGGER_CATEGORIES.FLAG_OVERRIDE,
  category: SAFETY_TRIGGER_CATEGORIES.FLAG_OVERRIDE,
  pattern_match: false,
  fail_closed: true,
} as const;

// ─── High-distress language patterns ─────────────────────────────────────────
//
// Distinct from the existing crisis detector (enhancedCrisisDetector) which
// handles hard stops.  These patterns trigger the structured safety-mode
// behavior in the upgraded path.

interface TriggerPattern {
  pattern: RegExp;
  category: string;
}

const SAFETY_TRIGGER_PATTERNS: TriggerPattern[] = [
  // Severe hopelessness
  { pattern: /\bnothing\s+(will|can|ever)\s+get\s+better\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /\bno\s+(hope|point|reason)\s+(left|anymore|at\s+all)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /\bhopeless(ness)?\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /\bcan'?t\s+see\s+(a\s+)?way\s+(out|forward|through)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /\blife\s+(is\s+)?(not\s+)?worth\s+(living|it)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /\bwhat'?s\s+the\s+point\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /\bnever\s+(going\s+to\s+)?(be\s+)?(okay|fine|better|happy)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },
  { pattern: /\bnothing\s+(matters|helps|works)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SEVERE_HOPELESSNESS },

  // Shutdown / breakdown
  { pattern: /\bshutting\s+down\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /\bcomplete(ly)?\s+(broken|numb|empty|lost)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /\bfalling\s+apart\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /\bbreaking\s+down\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /\bcollaps(e|ing|ed)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /\bcan'?t\s+(function|cope|go\s+on|face)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /\btotally\s+(lost|numb|empty|broken)\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },
  { pattern: /\bgiven\s+up\b/i, category: SAFETY_TRIGGER_CATEGORIES.SHUTDOWN_BREAKDOWN },

  // Catastrophic / irreversibility
  { pattern: /\beverything\s+is\s+(ruined|destroyed|over|hopeless)\b/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /\bmy\s+life\s+is\s+(ruined|over|destroyed)\b/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /\bno\s+way\s+back\b/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /\birreversible\b/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /\bnever\s+(recover|be\s+okay|be\s+normal|be\s+the\s+same)\b/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },
  { pattern: /\bthis\s+is\s+(the\s+end|all\s+over)\b/i, category: SAFETY_TRIGGER_CATEGORIES.CATASTROPHIC_LANGUAGE },

  // High distress
  { pattern: /\boverwhelm(ed|ing)\b/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },
  { pattern: /\bcan'?t\s+(breathe|think|move)\b/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },
  { pattern: /\bfeel(ing)?\s+(so\s+)?(out\s+of\s+control|uncontrollable)\b/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },
  { pattern: /\bpanic(king|ked)?\b/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },
  { pattern: /\bscreaming\s+inside\b/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },
  { pattern: /\bcan'?t\s+stop\s+crying\b/i, category: SAFETY_TRIGGER_CATEGORIES.HIGH_DISTRESS },
];

// ─── Core determination function ─────────────────────────────────────────────

interface SafetyModeSignals {
  crisis_signal?: boolean;
  low_retrieval_confidence?: boolean;
  allowlist_rejection?: boolean;
  flag_override?: boolean;
  message_text?: string;
}

interface SafetyModeResult {
  safety_mode: boolean;
  trigger: string | null;
  category: string | null;
  pattern_match: boolean;
  fail_closed?: boolean;
}

function determineSafetyMode(signals: SafetyModeSignals): SafetyModeResult {
  try {
    if (!signals || typeof signals !== 'object') {
      return { ...SAFETY_MODE_FAIL_CLOSED_RESULT };
    }

    if (signals.crisis_signal === true) {
      return { safety_mode: true, trigger: SAFETY_TRIGGER_CATEGORIES.CRISIS_SIGNAL, category: SAFETY_TRIGGER_CATEGORIES.CRISIS_SIGNAL, pattern_match: false };
    }

    if (signals.low_retrieval_confidence === true) {
      return { safety_mode: true, trigger: SAFETY_TRIGGER_CATEGORIES.LOW_RETRIEVAL_CONFIDENCE, category: SAFETY_TRIGGER_CATEGORIES.LOW_RETRIEVAL_CONFIDENCE, pattern_match: false };
    }

    if (signals.allowlist_rejection === true) {
      return { safety_mode: true, trigger: SAFETY_TRIGGER_CATEGORIES.ALLOWLIST_REJECTION, category: SAFETY_TRIGGER_CATEGORIES.ALLOWLIST_REJECTION, pattern_match: false };
    }

    if (signals.flag_override === true) {
      return { safety_mode: true, trigger: SAFETY_TRIGGER_CATEGORIES.FLAG_OVERRIDE, category: SAFETY_TRIGGER_CATEGORIES.FLAG_OVERRIDE, pattern_match: false };
    }

    if (typeof signals.message_text === 'string' && signals.message_text.trim()) {
      const text = signals.message_text;
      for (const { pattern, category } of SAFETY_TRIGGER_PATTERNS) {
        if (pattern.test(text)) {
          return { safety_mode: true, trigger: category, category, pattern_match: true };
        }
      }
    }

    return { safety_mode: false, trigger: null, category: null, pattern_match: false };
  } catch (_e) {
    return { ...SAFETY_MODE_FAIL_CLOSED_RESULT };
  }
}

// ─── Request handler ─────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  // ── Feature flag gate ────────────────────────────────────────────────────
  const masterEnabled = Deno.env.get('THERAPIST_UPGRADE_ENABLED') === 'true';
  const safetyModeEnabled = Deno.env.get('THERAPIST_UPGRADE_SAFETY_MODE_ENABLED') === 'true';

  if (!masterEnabled || !safetyModeEnabled) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Phase 7 safety mode is not enabled.',
        gated: true,
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const base44 = createClientFromRequest(req);
  const caller = await base44.auth.me().catch(() => null);
  if (!caller?.email) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── Parse request body ───────────────────────────────────────────────────
  let body: SafetyModeSignals;
  try {
    body = await req.json();
  } catch (_e) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (typeof body.message_text === 'string' && body.message_text.length > 20_000) {
    return new Response(
      JSON.stringify({ success: false, error: 'message_text exceeds the allowed length.' }),
      { status: 413, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── Determine safety mode ─────────────────────────────────────────────────
  const result = determineSafetyMode({
    crisis_signal: body.crisis_signal ?? false,
    low_retrieval_confidence: body.low_retrieval_confidence ?? false,
    allowlist_rejection: body.allowlist_rejection ?? false,
    flag_override: body.flag_override ?? false,
    message_text: typeof body.message_text === 'string' ? body.message_text : '',
  });

  return new Response(
    JSON.stringify({ success: true, ...result }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
