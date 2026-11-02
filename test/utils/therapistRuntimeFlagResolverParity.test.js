import { describe, it, expect } from 'vitest';
import {
  resolveTherapistWiring,
  resolveTherapistWiringFromFlagReader,
  predictTherapistWiringFromRuntimeFlags,
  ACTIVE_CBT_THERAPIST_WIRING,
} from '../../src/api/activeAgentWiring.js';
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V1,
  CBT_THERAPIST_WIRING_STAGE2_V2,
  CBT_THERAPIST_WIRING_STAGE2_V5,
  CBT_THERAPIST_WIRING_STAGE2_V11,
  CBT_THERAPIST_WIRING_STAGE2_V12,
} from '../../src/api/agentWiring.js';
import { _therapistWiringCanonicalName } from '../../src/lib/runtimeCapabilityDiagnostic.js';
import {
  THERAPIST_RUNTIME_FLAG_KEYS,
  buildTherapistRuntimeFlagTransportDiagnostic,
} from '../../src/lib/therapistRuntimeFlagTransport.js';

function readerFromEnabledFlags(enabledFlags) {
  const enabled = new Set(enabledFlags);
  return (flagName) => enabled.has(flagName);
}

function allTrueRuntimeFlags() {
  const flags = {};
  for (const key of THERAPIST_RUNTIME_FLAG_KEYS) {
    flags[key] = true;
  }
  return flags;
}

describe('canonical therapist resolver parity', () => {
  it('current resolver behavior remains unchanged', () => {
    expect(resolveTherapistWiring()).toBe(ACTIVE_CBT_THERAPIST_WIRING);
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('all false => HYBRID', () => {
    const resolved = resolveTherapistWiringFromFlagReader(readerFromEnabledFlags([]));
    expect(resolved).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('master only => HYBRID', () => {
    const resolved = resolveTherapistWiringFromFlagReader(
      readerFromEnabledFlags(['THERAPIST_UPGRADE_ENABLED']),
    );
    expect(resolved).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('master + memory => V1', () => {
    const resolved = resolveTherapistWiringFromFlagReader(
      readerFromEnabledFlags(['THERAPIST_UPGRADE_ENABLED', 'THERAPIST_UPGRADE_MEMORY_ENABLED']),
    );
    expect(resolved).toBe(CBT_THERAPIST_WIRING_STAGE2_V1);
  });

  it('master + workflow => V2', () => {
    const resolved = resolveTherapistWiringFromFlagReader(
      readerFromEnabledFlags(['THERAPIST_UPGRADE_ENABLED', 'THERAPIST_UPGRADE_WORKFLOW_ENABLED']),
    );
    expect(resolved).toBe(CBT_THERAPIST_WIRING_STAGE2_V2);
  });

  it('relevant precedence is preserved (V5 beats lower phases)', () => {
    const resolved = resolveTherapistWiringFromFlagReader(
      readerFromEnabledFlags([
        'THERAPIST_UPGRADE_ENABLED',
        'THERAPIST_UPGRADE_MEMORY_ENABLED',
        'THERAPIST_UPGRADE_WORKFLOW_ENABLED',
        'THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED',
        'THERAPIST_UPGRADE_SAFETY_MODE_ENABLED',
      ]),
    );
    expect(resolved).toBe(CBT_THERAPIST_WIRING_STAGE2_V5);
  });

  it('master + competence => V11', () => {
    const resolved = resolveTherapistWiringFromFlagReader(
      readerFromEnabledFlags(['THERAPIST_UPGRADE_ENABLED', 'THERAPIST_UPGRADE_COMPETENCE_ENABLED']),
    );
    expect(resolved).toBe(CBT_THERAPIST_WIRING_STAGE2_V11);
  });

  it('master + planner-first => V12', () => {
    const resolved = resolveTherapistWiringFromFlagReader(
      readerFromEnabledFlags([
        'THERAPIST_UPGRADE_ENABLED',
        'THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED',
      ]),
    );
    expect(resolved).toBe(CBT_THERAPIST_WIRING_STAGE2_V12);
  });

  it('planner-first precedence remains highest', () => {
    const resolved = resolveTherapistWiringFromFlagReader(
      readerFromEnabledFlags([
        'THERAPIST_UPGRADE_ENABLED',
        'THERAPIST_UPGRADE_MEMORY_ENABLED',
        'THERAPIST_UPGRADE_WORKFLOW_ENABLED',
        'THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED',
        'THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED',
        'THERAPIST_UPGRADE_SAFETY_MODE_ENABLED',
        'THERAPIST_UPGRADE_FORMULATION_CONTEXT_ENABLED',
        'THERAPIST_UPGRADE_FORMULATION_LED_ENABLED',
        'THERAPIST_UPGRADE_CONTINUITY_ENABLED',
        'THERAPIST_UPGRADE_STRATEGY_ENABLED',
        'THERAPIST_UPGRADE_LONGITUDINAL_ENABLED',
        'THERAPIST_UPGRADE_KNOWLEDGE_ENABLED',
        'THERAPIST_UPGRADE_COMPETENCE_ENABLED',
        'THERAPIST_UPGRADE_PLANNER_FIRST_ENABLED',
      ]),
    );
    expect(resolved).toBe(CBT_THERAPIST_WIRING_STAGE2_V12);
  });
});

describe('Phase 0.1 transport isolation', () => {
  it('all-true transported snapshot predicts V12 while active wiring remains unchanged', () => {
    const predicted = predictTherapistWiringFromRuntimeFlags(allTrueRuntimeFlags());
    expect(predicted).toBe(CBT_THERAPIST_WIRING_STAGE2_V12);
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('diagnostic proves prediction-only application', () => {
    const predicted = predictTherapistWiringFromRuntimeFlags(allTrueRuntimeFlags());
    const diagnostic = buildTherapistRuntimeFlagTransportDiagnostic({
      snapshot: {
        schema: 'therapist-runtime-flags-v1',
        transport_status: 'available',
        received: true,
        flags: allTrueRuntimeFlags(),
        generated_at: '2026-08-10T00:00:00.000Z',
        fetched_at: '2026-08-10T00:00:00.000Z',
      },
      predictedTherapistWiring: _therapistWiringCanonicalName(predicted),
      currentActiveTherapistWiring: _therapistWiringCanonicalName(ACTIVE_CBT_THERAPIST_WIRING),
    });

    expect(diagnostic.predicted_therapist_wiring).toBe('CBT_THERAPIST_WIRING_STAGE2_V12');
    expect(diagnostic.current_active_therapist_wiring).toBe('CBT_THERAPIST_WIRING_HYBRID');
    expect(diagnostic.applied_to_active_wiring).toBe(false);
  });
});
