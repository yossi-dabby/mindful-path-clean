/**
 * @file src/components/therapy/SafetyModeIndicator.jsx
 *
 * Therapist Upgrade — Stage 2 Phase 8 — Safety Mode Indicator
 *
 * A compact, optional indicator that signals the upgraded safety mode is active
 * for the current session turn.  Renders only when ALL of the following
 * conditions are met:
 *
 *   1. The Stage 2 master upgrade gate is enabled
 *      (THERAPIST_UPGRADE_ENABLED === true).
 *   2. The Phase 7 safety mode flag is enabled
 *      (THERAPIST_UPGRADE_SAFETY_MODE_ENABLED === true).
 *   3. The active wiring has safety_mode_enabled === true (V5 only).
 *   4. The `isActive` prop is true (the runtime supplement was non-null for
 *      the most recent turn, meaning a distress signal was detected).
 *
 * When ANY of the above is false the component returns null — the session view
 * is completely unchanged and no element is added to the DOM.
 *
 * AUTHORITATIVE SAFETY UI
 * -----------------------
 * This component is SUBORDINATE to the existing authoritative safety UI:
 *   - InlineRiskPanel (crisis detection, Layer 1 + Layer 2)
 *   - CrisisSafetyPanel
 *
 * This indicator does NOT replace, bypass, or overlap those components.
 * It reflects only the Phase 7 upgraded safety-mode constraint layer
 * (Layer 3), which only runs AFTER the hard-stop crisis layers pass.
 *
 * PRIVACY
 * -------
 * This component does NOT expose any raw message content, distress pattern
 * details, or internal safety evaluation results.
 * It shows only the minimum safe summary: that enhanced support mode is active.
 *
 * DESIGN PRINCIPLES (Phase 8)
 * ---------------------------
 * - Additive and reversible: turning off THERAPIST_UPGRADE_SAFETY_MODE_ENABLED
 *   removes this indicator without any other code change.
 * - Concise: one line label + one line description maximum.
 * - Non-intrusive: amber tone (not red) to distinguish from crisis panels.
 * - Reuses application badge/card visual language.
 * - Safe for sensitive mental health context.
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 8, Task 8.2
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { isUpgradeEnabled } from '@/lib/featureFlags.js';

/**
 * SafetyModeIndicator
 *
 * @param {object}  props
 * @param {object|null|undefined} props.wiring  - The active therapist wiring config
 * @param {boolean} [props.isActive=false]      - Whether safety mode was triggered this session
 * @returns {React.ReactElement|null}
 */
export default function SafetyModeIndicator({ wiring, isActive = false }) {
  // Guard 1: master flag and safety mode flag must both be on
  if (!isUpgradeEnabled('THERAPIST_UPGRADE_SAFETY_MODE_ENABLED')) {
    return null;
  }

  // Guard 2: active wiring must have safety mode enabled (V5 only)
  if (!wiring || wiring.safety_mode_enabled !== true) {
    return null;
  }

  // Guard 3: only show when safety mode is actually active for this session
  if (!isActive) {
    return null;
  }

  return <SafetyModeIndicatorView />;
}

/**
 * Inner view — rendered only when all guards pass.
 * Isolated into a sub-component so the hook call is always unconditional.
 */
function SafetyModeIndicatorView() {
  const { t } = useTranslation();

  return (
    <div
      data-testid="safety-mode-indicator"
      role="status"
      aria-label={t('chat.safety_mode_indicator.label')}
      className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs select-none mb-2"
      style={{
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        color: '#92400e',
      }}
    >
      {/* Amber dot */}
      <span
        aria-hidden="true"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: '#d97706',
          flexShrink: 0,
          marginTop: '3px',
        }}
      />
      <div>
        <span className="font-medium block">
          {t('chat.safety_mode_indicator.label')}
        </span>
        <span className="block mt-0.5" style={{ opacity: 0.85 }}>
          {t('chat.safety_mode_indicator.description')}
        </span>
      </div>
    </div>
  );
}
