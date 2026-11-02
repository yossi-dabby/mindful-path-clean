import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  THERAPIST_RUNTIME_FLAG_SCHEMA,
  THERAPIST_RUNTIME_FLAG_KEYS,
  getDefaultTherapistRuntimeFlags,
  normalizeTherapistRuntimeFlagSnapshotPayload,
  fetchTherapistRuntimeFlagSnapshot,
  buildTherapistRuntimeFlagTransportDiagnostic,
  __resetTherapistRuntimeFlagSnapshotCacheForTests,
} from '../../src/lib/therapistRuntimeFlagTransport.js';

beforeEach(() => {
  __resetTherapistRuntimeFlagSnapshotCacheForTests();
});

describe('therapist runtime transport normalization', () => {
  it('normalizes valid payload and preserves strict schema', () => {
    const payload = {
      schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
      flags: {
        THERAPIST_UPGRADE_ENABLED: true,
        THERAPIST_UPGRADE_MEMORY_ENABLED: true,
      },
      generated_at: '2026-08-10T00:00:00.000Z',
    };

    const normalized = normalizeTherapistRuntimeFlagSnapshotPayload(payload);
    expect(normalized).not.toBeNull();
    expect(normalized.schema).toBe(THERAPIST_RUNTIME_FLAG_SCHEMA);
    expect(normalized.flags.THERAPIST_UPGRADE_ENABLED).toBe(true);
    expect(normalized.flags.THERAPIST_UPGRADE_MEMORY_ENABLED).toBe(true);
  });

  it('missing keys fail closed to false', () => {
    const payload = {
      schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
      flags: {},
    };

    const normalized = normalizeTherapistRuntimeFlagSnapshotPayload(payload);
    expect(normalized).not.toBeNull();
    for (const key of THERAPIST_RUNTIME_FLAG_KEYS) {
      expect(normalized.flags[key]).toBe(false);
    }
  });

  it('malformed payload returns null (transport unavailable path)', () => {
    expect(normalizeTherapistRuntimeFlagSnapshotPayload(null)).toBeNull();
    expect(normalizeTherapistRuntimeFlagSnapshotPayload({ schema: 'bad', flags: {} })).toBeNull();
    expect(normalizeTherapistRuntimeFlagSnapshotPayload({ schema: THERAPIST_RUNTIME_FLAG_SCHEMA, flags: null })).toBeNull();
  });
});

describe('therapist runtime transport fetching', () => {
  it('returns available snapshot on valid backend response', async () => {
    const snapshot = await fetchTherapistRuntimeFlagSnapshot({
      invokeFn: async () => ({
        data: {
          schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
          flags: { THERAPIST_UPGRADE_ENABLED: true },
          generated_at: '2026-08-10T00:00:00.000Z',
        },
      }),
    });

    expect(snapshot.transport_status).toBe('available');
    expect(snapshot.received).toBe(true);
    expect(snapshot.flags.THERAPIST_UPGRADE_ENABLED).toBe(true);
    expect(snapshot.flags.THERAPIST_UPGRADE_MEMORY_ENABLED).toBe(false);
  });

  it('returns unavailable snapshot on malformed backend response', async () => {
    const snapshot = await fetchTherapistRuntimeFlagSnapshot({
      invokeFn: async () => ({ data: { schema: 'wrong', flags: {} } }),
    });

    expect(snapshot.transport_status).toBe('unavailable');
    expect(snapshot.received).toBe(false);
    for (const key of THERAPIST_RUNTIME_FLAG_KEYS) {
      expect(snapshot.flags[key]).toBe(false);
    }
  });

  it('returns unavailable snapshot on fetch error without throwing', async () => {
    const snapshot = await fetchTherapistRuntimeFlagSnapshot({
      invokeFn: async () => {
        throw new Error('network down');
      },
    });

    expect(snapshot.transport_status).toBe('unavailable');
    expect(snapshot.received).toBe(false);
  });


  it('does not cache unavailable snapshot so a later retry can succeed', async () => {
    const failingInvoke = vi.fn(async () => {
      throw new Error('temporary outage');
    });

    const first = await fetchTherapistRuntimeFlagSnapshot({ invokeFn: failingInvoke });
    expect(first.transport_status).toBe('unavailable');

    const succeedingInvoke = vi.fn(async () => ({
      data: {
        schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
        flags: { THERAPIST_UPGRADE_ENABLED: true },
      },
    }));

    const second = await fetchTherapistRuntimeFlagSnapshot({ invokeFn: succeedingInvoke });
    expect(second.transport_status).toBe('available');
    expect(second.flags.THERAPIST_UPGRADE_ENABLED).toBe(true);
  });
  it('caches snapshot for the current page/session', async () => {
    const invokeFn = vi.fn(async () => ({
      data: {
        schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
        flags: { THERAPIST_UPGRADE_ENABLED: true },
      },
    }));

    const first = await fetchTherapistRuntimeFlagSnapshot({ invokeFn });
    const second = await fetchTherapistRuntimeFlagSnapshot({ invokeFn });

    expect(first).toBe(second);
    expect(invokeFn).toHaveBeenCalledTimes(1);
  });
});

describe('therapist runtime transport diagnostic surface', () => {
  it('always marks applied_to_active_wiring as false', () => {
    const diagnostic = buildTherapistRuntimeFlagTransportDiagnostic({
      snapshot: {
        schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
        transport_status: 'available',
        received: true,
        flags: getDefaultTherapistRuntimeFlags(),
        fetched_at: '2026-08-10T00:00:00.000Z',
        generated_at: '2026-08-10T00:00:00.000Z',
      },
      predictedTherapistWiring: 'CBT_THERAPIST_WIRING_STAGE2_V12',
      currentActiveTherapistWiring: 'CBT_THERAPIST_WIRING_HYBRID',
    });

    expect(diagnostic.applied_to_active_wiring).toBe(false);
    expect(diagnostic.predicted_therapist_wiring).toBe('CBT_THERAPIST_WIRING_STAGE2_V12');
    expect(diagnostic.current_active_therapist_wiring).toBe('CBT_THERAPIST_WIRING_HYBRID');
  });
});
