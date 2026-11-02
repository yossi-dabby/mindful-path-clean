/**
 * @file src/components/therapy/SessionPhaseIndicator.jsx
 *
 * Therapist Upgrade — Stage 2 Phase 8 — Session Phase Indicator
 *
 * A compact, optional indicator that signals a structured CBT workflow session
 * is active.  Renders only when ALL of the following conditions are met:
 *
 *   1. The Stage 2 master upgrade gate is enabled
 *      (THERAPIST_UPGRADE_ENABLED === true).
 *   2. The Phase 3 workflow flag is enabled
 *      (THERAPIST_UPGRADE_WORKFLOW_ENABLED === true).
 *   3. The active wiring has workflow_engine_enabled === true (V2 or later).
 *   4. The `hasActiveSession` prop is true (a conversation is open).
 *
 * When ANY of the above is false the component returns null — the session view
 * is completely unchanged and no element is added to the DOM.
 *
 * DESIGN PRINCIPLES (Phase 8)
 * ---------------------------
 * - Additive and reversible: turning off THERAPIST_UPGRADE_WORKFLOW_ENABLED
 *   removes this indicator without any other code change.
 * - Does NOT replace or alter any existing UI element.
 * - Does NOT expose raw internal workflow state or instruction text.
 * - Keeps displayed content concise and user-safe.
 * - Reuses the existing badge/card visual language of the application.
 * - Safe for sensitive mental health context.
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 8, Task 8.1
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { isUpgradeEnabled } from '@/lib/featureFlags.js';

/**
 * SessionPhaseIndicator
 *
 * @param {object}  props
 * @param {object|null|undefined} props.wiring        - The active therapist wiring config
 * @param {boolean} [props.hasActiveSession=false]    - Whether a conversation is currently open
 * @returns {React.ReactElement|null}
 */
export default function SessionPhaseIndicator({ wiring, hasActiveSession = false }) {
  // Guard 1: master flag and workflow flag must both be on
  if (!isUpgradeEnabled('THERAPIST_UPGRADE_WORKFLOW_ENABLED')) {
    return null;
  }

  // Guard 2: active wiring must have the workflow engine enabled
  if (!wiring || wiring.workflow_engine_enabled !== true) {
    return null;
  }

  // Guard 3: only show when there is an active conversation
  if (!hasActiveSession) {
    return null;
  }

  return <SessionPhaseIndicatorView />;
}

/**
 * Inner view — rendered only when all guards pass.
 * Isolated into a sub-component so the hook call is always unconditional.
 */
function SessionPhaseIndicatorView() {
  const { t } = useTranslation();

  return (
    <div
      data-testid="session-phase-indicator"
      role="status"
      aria-label={t('chat.session_phase_indicator.accessible_label')}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium select-none"
      style={{
        backgroundColor: 'rgba(20, 184, 166, 0.10)',
        border: '1px solid rgba(20, 184, 166, 0.25)',
        color: '#0f766e',
        display: 'inline-flex',
        alignSelf: 'flex-start',
      }}
    >
      {/* Subtle pulse dot */}
      <span
        aria-hidden="true"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: '#0d9488',
          flexShrink: 0,
        }}
      />
      <span>{t('chat.session_phase_indicator.label')}</span>
    </div>
  );
}
