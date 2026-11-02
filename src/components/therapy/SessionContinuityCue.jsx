/**
 * @file src/components/therapy/SessionContinuityCue.jsx
 *
 * Phase 3 Deep Personalization — Session Continuity Cue
 *
 * A subtle, optional banner that signals the therapist agent is drawing on
 * prior-session context to provide session-to-session continuity.
 *
 * Renders only when ALL of the following conditions are met:
 *
 *   1. The Stage 2 master upgrade gate is enabled
 *      (THERAPIST_UPGRADE_ENABLED === true).
 *   2. The Phase 3 continuity flag is enabled
 *      (THERAPIST_UPGRADE_CONTINUITY_ENABLED === true).
 *   3. The active wiring has continuity_layer_enabled === true (V7).
 *   4. The `hasActiveSession` prop is true (a conversation is open).
 *   5. The session is in its opening stage (messageCount is small).
 *
 * When ANY of the above is false the component returns null — the session view
 * is completely unchanged and no element is added to the DOM.
 *
 * DESIGN PRINCIPLES (Phase 3)
 * ---------------------------
 * - Additive and reversible: turning off THERAPIST_UPGRADE_CONTINUITY_ENABLED
 *   removes this indicator without any other code change.
 * - Does NOT replace or alter any existing UI element.
 * - Does NOT expose raw internal memory data, clinical notes, or session history.
 * - Keeps displayed content concise, non-clinical, and user-safe.
 * - Reuses the existing badge/card visual language of the application.
 * - Safe for sensitive mental health context.
 *
 * Source of truth: Problem statement — Phase 3 Deep Personalization, Continuity,
 * Formulation Quality.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { isUpgradeEnabled } from '@/lib/featureFlags.js';

/**
 * Maximum message count at which the continuity cue is shown.
 * The cue is relevant only at session opening, not mid-conversation.
 * @type {number}
 */
const CONTINUITY_CUE_MAX_MESSAGES = 4;

/**
 * SessionContinuityCue
 *
 * @param {object}  props
 * @param {object|null|undefined} props.wiring        - The active therapist wiring config
 * @param {boolean} [props.hasActiveSession=false]    - Whether a conversation is currently open
 * @param {number}  [props.messageCount=0]            - Current number of messages in the session
 * @returns {React.ReactElement|null}
 */
export default function SessionContinuityCue({
  wiring,
  hasActiveSession = false,
  messageCount = 0,
}) {
  // Guard 1: master flag and continuity flag must both be on
  if (!isUpgradeEnabled('THERAPIST_UPGRADE_CONTINUITY_ENABLED')) {
    return null;
  }

  // Guard 2: active wiring must have the continuity layer enabled
  if (!wiring || wiring.continuity_layer_enabled !== true) {
    return null;
  }

  // Guard 3: only show when there is an active conversation
  if (!hasActiveSession) {
    return null;
  }

  // Guard 4: only show at session opening (before many messages accumulate)
  if (messageCount > CONTINUITY_CUE_MAX_MESSAGES) {
    return null;
  }

  return <SessionContinuityCueView />;
}

/**
 * Inner view — rendered only when all guards pass.
 * Isolated into a sub-component so the hook call is always unconditional.
 */
function SessionContinuityCueView() {
  const { t } = useTranslation();

  return (
    <div
      data-testid="session-continuity-cue"
      role="status"
      aria-label={t('chat.session_continuity_cue.accessible_label')}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium select-none"
      style={{
        backgroundColor: 'rgba(124, 58, 237, 0.08)',
        border: '1px solid rgba(124, 58, 237, 0.20)',
        color: '#6d28d9',
        display: 'inline-flex',
        alignSelf: 'flex-start',
      }}
    >
      {/* Subtle continuity dot */}
      <span
        aria-hidden="true"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: '#7c3aed',
          flexShrink: 0,
        }}
      />
      <span>{t('chat.session_continuity_cue.banner_text')}</span>
    </div>
  );
}
