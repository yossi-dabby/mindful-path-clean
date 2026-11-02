/**
 * @file base44/functions/sessionPhaseEngine/entry.ts
 *
 * Therapist Upgrade — Phase 3 — Session Phase Engine
 *
 * Accepts a session event and the current phase state, and returns the updated
 * phase state with an advisory phase-transition signal.
 *
 * SESSION PHASES
 * --------------
 * 1. CHECK_IN       — Session opening, grounding, initial emotional check
 * 2. AGENDA_SETTING — Identifying what to work on in this session
 * 3. CBT_WORK       — Active CBT techniques, exploration, and intervention
 * 4. SESSION_CLOSE  — Summarizing, homework, next-session setup
 *
 * ADVISORY ONLY
 * -------------
 * Phase signals are advisory.  They provide context to the upgraded therapist
 * wiring (CBT_THERAPIST_WIRING_STAGE2_V2) about session state, but they do
 * not constrain the agent's clinical response in any way.  The therapist uses
 * this context as a soft structural guide, not as a rigid behavioral rule.
 *
 * SAFETY PRIORITY
 * ---------------
 * If a safety signal is detected (crisis_detected: true in the request),
 * the phase engine defers entirely: it returns the current phase unchanged
 * with safety_override: true, and no transition is emitted.  The existing
 * safety stack always takes precedence over phase state.
 *
 * ACTIVATION
 * ----------
 * Gated by the THERAPIST_UPGRADE_WORKFLOW_ENABLED environment variable.
 * Returns 503 when the flag is not 'true'.  Both the master flag
 * (THERAPIST_UPGRADE_ENABLED) and this phase flag must be true before any
 * caller can use this function.
 *
 * ISOLATION
 * ---------
 * This function has no effect on the current default therapist path
 * (CBT_THERAPIST_WIRING_HYBRID).  It is only callable when both upgrade
 * flags are explicitly enabled.
 *
 * INPUT (JSON body)
 * -----------------
 * {
 *   session_id:        string,  // CoachingSession ID (required)
 *   current_phase?:   string,  // One of CHECK_IN | AGENDA_SETTING | CBT_WORK | SESSION_CLOSE
 *                               //   Defaults to CHECK_IN if omitted or invalid
 *   event_type?:      string,  // One of session_start | message_received | session_end
 *                               //   Defaults to message_received if omitted
 *   turn_index?:      number,  // 0-based turn index (optional, used for heuristics)
 *   crisis_detected?: boolean, // Safety system signal — if true, phase engine defers
 * }
 *
 * OUTPUT
 * ------
 * {
 *   success: true,
 *   session_id: string,
 *   phase: string,              // Current (possibly updated) phase
 *   previous_phase: string,     // Phase before this call
 *   transition: boolean,        // true if phase changed
 *   safety_override: boolean,   // true if crisis_detected caused deferral
 *   advisory_note: string,      // Human-readable description of current phase
 * }
 * { success: false, error: string }                — validation or processing error
 * { success: false, error: string, gated: true }   — flag off (HTTP 503)
 *
 * See docs/therapist-upgrade-stage2-plan.md — Task 3.1
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Phase constants ──────────────────────────────────────────────────────────

const PHASES = Object.freeze({
  CHECK_IN: 'CHECK_IN',
  AGENDA_SETTING: 'AGENDA_SETTING',
  CBT_WORK: 'CBT_WORK',
  SESSION_CLOSE: 'SESSION_CLOSE',
});

const PHASE_ORDER = [
  PHASES.CHECK_IN,
  PHASES.AGENDA_SETTING,
  PHASES.CBT_WORK,
  PHASES.SESSION_CLOSE,
];

const PHASE_DESCRIPTIONS = Object.freeze({
  [PHASES.CHECK_IN]:
    'Session opening: brief check-in, grounding, and initial emotional state. ' +
    'Establish contact and identify how the person is arriving to this session.',
  [PHASES.AGENDA_SETTING]:
    'Agenda-setting: identify what to work on in this session. ' +
    'Collaboratively focus the session on the most pressing issue.',
  [PHASES.CBT_WORK]:
    'Active CBT work: organized problem presentation, pattern mapping, ' +
    'intervention delivery, and skill practice.',
  [PHASES.SESSION_CLOSE]:
    'Session closing: summarize key insights, assign homework or next steps, ' +
    'and prepare for the end of the session.',
});

// ─── Event types ──────────────────────────────────────────────────────────────

const EVENT_TYPES = Object.freeze({
  SESSION_START: 'session_start',
  MESSAGE_RECEIVED: 'message_received',
  SESSION_END: 'session_end',
});

// ─── Phase transition heuristics ─────────────────────────────────────────────

/**
 * Determines the next phase given current phase and event context.
 *
 * Transitions are advisory and heuristic-based.  They are intended to nudge
 * the session arc forward, not to enforce mechanical phase progression.
 *
 * CHECK_IN        → AGENDA_SETTING : after session_start event or first turn
 * AGENDA_SETTING  → CBT_WORK       : after 2+ turns in AGENDA_SETTING
 * CBT_WORK        → SESSION_CLOSE  : on session_end event or high turn count
 * SESSION_CLOSE   → SESSION_CLOSE  : terminal phase (no further transition)
 *
 * @param {string} currentPhase
 * @param {string} eventType
 * @param {number} turnIndex
 * @returns {{ phase: string, transition: boolean }}
 */
function computeNextPhase(currentPhase, eventType, turnIndex) {
  // session_start always begins at CHECK_IN (no transition needed)
  if (eventType === EVENT_TYPES.SESSION_START) {
    return { phase: PHASES.CHECK_IN, transition: currentPhase !== PHASES.CHECK_IN };
  }

  // session_end advances to SESSION_CLOSE from any non-terminal phase
  if (eventType === EVENT_TYPES.SESSION_END) {
    if (currentPhase !== PHASES.SESSION_CLOSE) {
      return { phase: PHASES.SESSION_CLOSE, transition: true };
    }
    return { phase: PHASES.SESSION_CLOSE, transition: false };
  }

  // Heuristic turn-based progression for message_received
  const turn = typeof turnIndex === 'number' && turnIndex >= 0 ? turnIndex : 0;

  if (currentPhase === PHASES.CHECK_IN && turn >= 1) {
    return { phase: PHASES.AGENDA_SETTING, transition: true };
  }

  if (currentPhase === PHASES.AGENDA_SETTING && turn >= 3) {
    return { phase: PHASES.CBT_WORK, transition: true };
  }

  if (currentPhase === PHASES.CBT_WORK && turn >= 14) {
    return { phase: PHASES.SESSION_CLOSE, transition: true };
  }

  // No transition
  return { phase: currentPhase, transition: false };
}

// ─── Request handler ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // ── Feature flag gate ────────────────────────────────────────────────────
  const masterEnabled = Deno.env.get('THERAPIST_UPGRADE_ENABLED') === 'true';
  const workflowEnabled = Deno.env.get('THERAPIST_UPGRADE_WORKFLOW_ENABLED') === 'true';

  if (!masterEnabled || !workflowEnabled) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Phase 3 session phase engine is not enabled.',
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
  let body;
  try {
    body = await req.json();
  } catch (_e) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const {
    session_id,
    current_phase,
    event_type,
    turn_index,
    crisis_detected,
  } = body ?? {};

  // ── Validate required fields ─────────────────────────────────────────────
  if (!session_id || typeof session_id !== 'string' || session_id.trim() === '') {
    return new Response(
      JSON.stringify({ success: false, error: 'session_id is required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (session_id.length > 200) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid session_id.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const session = await base44.asServiceRole.entities.CoachingSession.get(session_id);
    if (!session || (caller.role !== 'admin' && session.created_by !== caller.email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session not found.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }
  } catch (_error) {
    return new Response(
      JSON.stringify({ success: false, error: 'Session not found.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── Normalise inputs ─────────────────────────────────────────────────────
  const resolvedPhase = PHASE_ORDER.includes(current_phase)
    ? current_phase
    : PHASES.CHECK_IN;

  const resolvedEvent = Object.values(EVENT_TYPES).includes(event_type)
    ? event_type
    : EVENT_TYPES.MESSAGE_RECEIVED;

  const resolvedTurn =
    typeof turn_index === 'number' && turn_index >= 0 ? turn_index : 0;

  // ── Safety override — defer when crisis signal is present ────────────────
  if (crisis_detected === true) {
    return new Response(
      JSON.stringify({
        success: true,
        session_id,
        phase: resolvedPhase,
        previous_phase: resolvedPhase,
        transition: false,
        safety_override: true,
        advisory_note:
          'Safety signal detected. Phase engine deferred. ' +
          'Existing safety stack takes full precedence. ' +
          PHASE_DESCRIPTIONS[resolvedPhase],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── Compute phase transition ─────────────────────────────────────────────
  const { phase: nextPhase, transition } = computeNextPhase(
    resolvedPhase,
    resolvedEvent,
    resolvedTurn,
  );

  return new Response(
    JSON.stringify({
      success: true,
      session_id,
      phase: nextPhase,
      previous_phase: resolvedPhase,
      transition,
      safety_override: false,
      advisory_note: PHASE_DESCRIPTIONS[nextPhase],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
