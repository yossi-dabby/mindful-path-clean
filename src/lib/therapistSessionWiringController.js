/**
 * @file src/lib/therapistSessionWiringController.js
 *
 * Phase 0.2A — Session-local therapist wiring controller.
 *
 * Provides a small, testable, session-scoped object that:
 *   1. Holds a candidate therapist wiring (initially the build-time fallback).
 *   2. Accepts a runtime authority decision before the first session-start send.
 *   3. Locks the effective wiring the moment the first session-start/send consumes it.
 *   4. Rejects late-arriving runtime snapshots after the lock so the therapist
 *      identity/capability cannot switch in the middle of an active session.
 *
 * SESSION LOCK RULE (from spec):
 *   Once the first therapist session-start/send consumes the effective wiring,
 *   that wiring is LOCKED for the current Chat page/session.  A late-arriving
 *   runtime snapshot MUST NOT switch therapist wiring in the middle of an
 *   active page/session.
 *
 * FAIL-OPEN RULE:
 *   If the first therapist send occurs before the runtime snapshot is ready:
 *   - use the existing build-time fallback wiring
 *   - lock it
 *   - do NOT block the send
 *
 * COMPANION ISOLATION:
 *   This controller is used only for the CBT Therapist agent.
 *   Companion wiring is completely independent and must not be routed here.
 */

/**
 * Creates a new session-local therapist wiring controller.
 *
 * @param {object} fallbackWiring - The build-time wiring to use until/unless
 *   a valid runtime snapshot is accepted.  Typically ACTIVE_CBT_THERAPIST_WIRING.
 * @returns {TherapistSessionWiringController}
 */
export function createTherapistSessionWiringController(fallbackWiring) {
  if (!fallbackWiring || typeof fallbackWiring !== 'object') {
    throw new Error('createTherapistSessionWiringController: fallbackWiring is required');
  }

  let _candidateWiring = fallbackWiring;
  let _locked = false;
  let _runtimeApplied = false;
  let _activationReason = null;

  return {
    /**
     * Attempts to apply a runtime authority decision before the session lock.
     *
     * If the controller is already locked (first send already occurred), the
     * decision is rejected and the method returns false.
     *
     * When a decision with applied=true arrives after lock, the activation_reason
     * is updated to 'session_locked_before_runtime_snapshot' to surface in diagnostics.
     *
     * @param {{ wiring: object, applied: boolean, reason: string }} decision
     * @returns {boolean} true if the decision was accepted (before lock), false if rejected
     */
    tryApply(decision) {
      if (!decision || typeof decision !== 'object') return false;

      if (_locked) {
        // Late arrival: surface that we could not apply it.
        if (decision.applied === true) {
          _activationReason = 'session_locked_before_runtime_snapshot';
        }
        return false;
      }

      _activationReason = decision.reason ?? null;
      if (decision.applied === true) {
        _candidateWiring = decision.wiring;
        _runtimeApplied = true;
      }
      return true;
    },

    /**
     * Locks the controller and returns the effective wiring.
     *
     * Must be called once at the very start of the first therapist session-start
     * or send operation.  Subsequent calls return the same wiring (idempotent).
     *
     * @returns {object} The locked effective therapist wiring.
     */
    lockAndConsume() {
      _locked = true;
      return _candidateWiring;
    },

    /**
     * Returns the current candidate wiring without locking.
     * Useful for diagnostic reads before any session-start.
     *
     * @returns {object}
     */
    getEffectiveWiring() {
      return _candidateWiring;
    },

    /** @returns {boolean} */
    isLocked() {
      return _locked;
    },

    /**
     * Returns true only after lock AND runtime snapshot was accepted
     * (i.e. the runtime authority was actually applied and consumed).
     * Delegates to getDiagnosticFields() to avoid expression divergence.
     *
     * @returns {boolean}
     */
    getAppliedToActive() {
      return this.getDiagnosticFields().applied_to_active_wiring;
    },

    /** @returns {string|null} */
    getActivationReason() {
      return _activationReason;
    },

    /**
     * Returns diagnostic fields for inclusion in
     * buildTherapistRuntimeFlagTransportDiagnostic.
     *
     * @returns {{ applied_to_active_wiring: boolean, selection_locked: boolean, activation_reason: string|null }}
     */
    getDiagnosticFields() {
      return {
        applied_to_active_wiring: _runtimeApplied && _locked,
        selection_locked: _locked,
        activation_reason: _activationReason,
      };
    },
  };
}
