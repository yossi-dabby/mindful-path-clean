import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createContextComposerV2SessionSelectionController } from '../../src/lib/contextComposerV2SessionSelectionController.js';
import { resolveRuntimeContextComposerV2Selection } from '../../src/lib/workflowContextInjector.js';
import {
  THERAPIST_RUNTIME_FLAG_SCHEMA,
  THERAPIST_RUNTIME_FLAG_KEYS,
  normalizeTherapistRuntimeFlagSnapshotPayload,
} from '../../src/lib/therapistRuntimeFlagTransport.js';
import {
  CBT_THERAPIST_WIRING_STAGE2_V12,
  CBT_THERAPIST_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

function buildAllFalseFlags(overrides = {}) {
  const flags = {};
  for (const key of THERAPIST_RUNTIME_FLAG_KEYS) {
    flags[key] = false;
  }
  return { ...flags, ...overrides };
}

function makeAvailableSnapshot(flagOverrides = {}) {
  const rawPayload = {
    schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
    flags: buildAllFalseFlags(flagOverrides),
    generated_at: new Date().toISOString(),
  };
  const normalized = normalizeTherapistRuntimeFlagSnapshotPayload(rawPayload);
  if (!normalized) throw new Error('makeAvailableSnapshot: normalization failed');
  return Object.freeze({
    schema: normalized.schema,
    transport_status: 'available',
    received: true,
    flags: normalized.flags,
    generated_at: normalized.generated_at,
    fetched_at: new Date().toISOString(),
  });
}

describe('Context Composer V2 session lock controller', () => {
  it('7. session starts before snapshot arrives: frozen legacy choice stays unchanged after late snapshot', () => {
    const ctrl = createContextComposerV2SessionSelectionController();
    const lockedBeforeSnapshot = ctrl.lockAndGet({
      sessionId: 'session-1',
      wiring: CBT_THERAPIST_WIRING_STAGE2_V12,
      snapshot: null,
    });
    expect(lockedBeforeSnapshot.context_composer_v2_selection_reason).toBe('legacy_fallback');

    const lateSnapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    const lockedAfterLateSnapshot = ctrl.lockAndGet({
      sessionId: 'session-1',
      wiring: CBT_THERAPIST_WIRING_STAGE2_V12,
      snapshot: lateSnapshot,
    });
    expect(lockedAfterLateSnapshot).toBe(lockedBeforeSnapshot);
  });

  it('8. accepted snapshot with CONTEXT=false remains false for all later same-session reads', () => {
    const ctrl = createContextComposerV2SessionSelectionController();
    const startSnapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: false,
    });
    const locked = ctrl.lockAndGet({
      sessionId: 'session-2',
      wiring: CBT_THERAPIST_WIRING_STAGE2_V12,
      snapshot: startSnapshot,
    });
    expect(locked.context_composer_v2_effective).toBe(false);
    expect(locked.context_composer_v2_selection_reason).toBe('runtime_snapshot_applied');

    const laterSnapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    const sameSession = ctrl.lockAndGet({
      sessionId: 'session-2',
      wiring: CBT_THERAPIST_WIRING_STAGE2_V12,
      snapshot: laterSnapshot,
    });
    expect(sameSession.context_composer_v2_effective).toBe(false);
  });

  it('9/10. accepted snapshot with CONTEXT=true remains true even if snapshot later flips false', () => {
    const ctrl = createContextComposerV2SessionSelectionController();
    const startSnapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    const locked = ctrl.lockAndGet({
      sessionId: 'session-3',
      wiring: CBT_THERAPIST_WIRING_STAGE2_V12,
      snapshot: startSnapshot,
    });
    expect(locked.context_composer_v2_effective).toBe(true);

    const laterSnapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: false,
    });
    const sameSession = ctrl.lockAndGet({
      sessionId: 'session-3',
      wiring: CBT_THERAPIST_WIRING_STAGE2_V12,
      snapshot: laterSnapshot,
    });
    expect(sameSession.context_composer_v2_effective).toBe(true);
  });

  it('11. new session may resolve newer snapshot value', () => {
    const ctrl = createContextComposerV2SessionSelectionController();
    const before = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: false,
    });
    const after = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });

    const firstSession = ctrl.lockAndGet({
      sessionId: 'session-4-a',
      wiring: CBT_THERAPIST_WIRING_STAGE2_V12,
      snapshot: before,
    });
    const secondSession = ctrl.lockAndGet({
      sessionId: 'session-4-b',
      wiring: CBT_THERAPIST_WIRING_STAGE2_V12,
      snapshot: after,
    });
    expect(firstSession.context_composer_v2_effective).toBe(false);
    expect(secondSession.context_composer_v2_effective).toBe(true);
  });

  it('12. V12 routing identity stays V12 regardless of composer selection result', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    const resolved = resolveRuntimeContextComposerV2Selection(CBT_THERAPIST_WIRING_STAGE2_V12, snapshot);
    expect(typeof resolved.enabled).toBe('boolean');
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.planner_first_enabled).toBe(true);
    expect(CBT_THERAPIST_WIRING_STAGE2_V12.name).toBe('cbt_therapist');
  });

  it('non-planner wiring can never activate composer', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    const resolved = resolveRuntimeContextComposerV2Selection(CBT_THERAPIST_WIRING_HYBRID, snapshot);
    expect(resolved.enabled).toBe(false);
    expect(resolved.reason).toBe('non_planner_wiring');
  });

  it('master-off is a hard rollback reason under runtime authority', () => {
    const snapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: true,
      THERAPIST_UPGRADE_ENABLED: false,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    const resolved = resolveRuntimeContextComposerV2Selection(CBT_THERAPIST_WIRING_STAGE2_V12, snapshot);
    expect(resolved.enabled).toBe(false);
    expect(resolved.reason).toBe('master_off');
  });

  it('APPLY=false and snapshot-unavailable remain legacy_fallback reason', () => {
    const applyOffSnapshot = makeAvailableSnapshot({
      THERAPIST_RUNTIME_APPLY_ENABLED: false,
      THERAPIST_UPGRADE_ENABLED: true,
      CONTEXT_COMPOSER_V2_ENABLED: true,
    });
    const applyOff = resolveRuntimeContextComposerV2Selection(CBT_THERAPIST_WIRING_STAGE2_V12, applyOffSnapshot);
    const unavailable = resolveRuntimeContextComposerV2Selection(CBT_THERAPIST_WIRING_STAGE2_V12, null);
    expect(applyOff.reason).toBe('legacy_fallback');
    expect(unavailable.reason).toBe('legacy_fallback');
  });
});

describe('Chat wiring uses session-local composer override path', () => {
  let chatSource = '';

  beforeAll(() => {
    const chatPath = fileURLToPath(new URL('../../src/pages/Chat.jsx', import.meta.url));
    chatSource = readFileSync(chatPath, 'utf8');
  });

  it('uses runtime_context_composer_v2_override in session-start build call sites', () => {
    // Static-source guard (intentionally brittle by design):
    // there are four therapist session-start builder call sites in Chat.jsx:
    // (1) URL-intent new-session path, (2) active-conversation intent path that
    // creates a new session, (3) explicit startNewConversationWithIntent path,
    // and (4) first-send implicit new-session path. Each must thread the frozen
    // override to prevent mid-session flips. If these call sites are refactored,
    // this assertion must be updated with equivalent behavioral coverage.
    const overrideUses = (chatSource.match(/runtime_context_composer_v2_override/g) || []).length;
    expect(overrideUses).toBe(4);
  });

  it('does not pass runtime_snapshot directly into buildActionFirstDemotedSessionContentAsync call options', () => {
    expect(chatSource.includes('runtime_snapshot:')).toBe(false);
  });
});
