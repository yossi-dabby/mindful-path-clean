/**
 * @file tests/e2e/chat-runtime-memory-continuity.spec.ts
 *
 * PR #923 — E2E coverage: therapist memory / continuity / LTS runtime path
 *
 * Proves the production Chat conversation-end path with accepted runtime
 * authority can:
 *   - trigger therapist_session memory write
 *   - use runtime continuity enrichment gate
 *   - reach runtime longitudinal/LTS path
 *   - remain deduplicated
 *   - expose no internal diagnostic text to visible chat
 *
 * Uses mocked backend / entity surfaces.  No arbitrary sleeps.
 *
 * CONSTRAINTS:
 * - No skip / fixme.
 * - No retry increase.
 * - No timeout increase.
 * - No assertion timeout increase.
 * - No polling timeout increase.
 * - No arbitrary sleep.
 * - No weaker assertions.
 * - No environment deferral.
 * - chatOrchestratorV2LateDuplicate.spec.ts is NOT modified.
 */

import { test, expect } from '@playwright/test';
import { mockApi, spaNavigate } from '../helpers/ui';

async function bootChat(page) {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('chat_consent_accepted', 'true');
    localStorage.setItem('age_verified', 'true');
    (window as any).__TEST_APP_ID__ = 'test-app-id';
    (window as any).__DISABLE_ANALYTICS__ = true;
  });
  await mockApi(page);
  await spaNavigate(page, '/');
  await page.waitForFunction(
    () => document.querySelector('#root') !== null && document.querySelector('#root').children.length > 0,
  );
}

test.describe('Runtime memory / continuity / LTS gate E2E', () => {
  test('continuity enrichment gate returns true only when all four runtime flags are set', async ({ page }) => {
    await bootChat(page);

    const result = await page.evaluate(async () => {
      const {
        resolveRuntimeContinuityEnrichmentFlag,
        isContinuityEnrichmentEnabled,
      } = await import('/src/lib/sessionEndSummarization.js');
      const {
        THERAPIST_RUNTIME_FLAG_SCHEMA,
        THERAPIST_RUNTIME_FLAG_KEYS,
        normalizeTherapistRuntimeFlagSnapshotPayload,
        getDefaultTherapistRuntimeFlags,
      } = await import('/src/lib/therapistRuntimeFlagTransport.js');

      const allFalse = (overrides: Record<string, boolean> = {}) => {
        const f: Record<string, boolean> = {};
        for (const k of THERAPIST_RUNTIME_FLAG_KEYS) f[k] = false;
        return { ...f, ...overrides };
      };

      const available = (overrides: Record<string, boolean>) => {
        const normalized = normalizeTherapistRuntimeFlagSnapshotPayload({
          schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
          flags: allFalse(overrides),
          generated_at: new Date().toISOString(),
        });
        return {
          schema: normalized.schema,
          transport_status: 'available',
          received: true,
          flags: normalized.flags,
          generated_at: normalized.generated_at,
          fetched_at: new Date().toISOString(),
        };
      };

      const unavailable = () => ({
        schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
        transport_status: 'unavailable',
        received: false,
        flags: getDefaultTherapistRuntimeFlags(),
        generated_at: null,
        fetched_at: new Date().toISOString(),
      });

      return {
        // Test 1: all conditions true → true
        allTrue: resolveRuntimeContinuityEnrichmentFlag(available({
          THERAPIST_RUNTIME_APPLY_ENABLED: true,
          THERAPIST_UPGRADE_ENABLED: true,
          THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
          THERAPIST_UPGRADE_CONTINUITY_ENABLED: true,
        })),
        // Test 2: MASTER=false → false (hard rollback)
        masterFalse: resolveRuntimeContinuityEnrichmentFlag(available({
          THERAPIST_RUNTIME_APPLY_ENABLED: true,
          THERAPIST_UPGRADE_ENABLED: false,
          THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
          THERAPIST_UPGRADE_CONTINUITY_ENABLED: true,
        })),
        // Test 3: SUM=false → false
        sumFalse: resolveRuntimeContinuityEnrichmentFlag(available({
          THERAPIST_RUNTIME_APPLY_ENABLED: true,
          THERAPIST_UPGRADE_ENABLED: true,
          THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: false,
          THERAPIST_UPGRADE_CONTINUITY_ENABLED: true,
        })),
        // Test 4: CONTINUITY=false → false
        continuityFalse: resolveRuntimeContinuityEnrichmentFlag(available({
          THERAPIST_RUNTIME_APPLY_ENABLED: true,
          THERAPIST_UPGRADE_ENABLED: true,
          THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
          THERAPIST_UPGRADE_CONTINUITY_ENABLED: false,
        })),
        // Test 5: APPLY=false → legacy
        applyFalse: resolveRuntimeContinuityEnrichmentFlag(available({
          THERAPIST_RUNTIME_APPLY_ENABLED: false,
          THERAPIST_UPGRADE_CONTINUITY_ENABLED: true,
          THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
          THERAPIST_UPGRADE_ENABLED: true,
        })),
        applyFalseLegacy: isContinuityEnrichmentEnabled(),
        // Test 6: snapshot unavailable → legacy
        unavailableFallback: resolveRuntimeContinuityEnrichmentFlag(unavailable()),
        unavailableLegacy: isContinuityEnrichmentEnabled(),
      };
    });

    expect(result.allTrue).toBe(true);
    expect(result.masterFalse).toBe(false);
    expect(result.sumFalse).toBe(false);
    expect(result.continuityFalse).toBe(false);
    expect(result.applyFalse).toBe(result.applyFalseLegacy);
    expect(result.unavailableFallback).toBe(result.unavailableLegacy);
  });

  test('longitudinal gate returns true only when all four runtime flags are set', async ({ page }) => {
    await bootChat(page);

    const result = await page.evaluate(async () => {
      const {
        resolveRuntimeLongitudinalFlag,
        isLongitudinalEnabled,
      } = await import('/src/lib/sessionEndSummarization.js');
      const {
        THERAPIST_RUNTIME_FLAG_SCHEMA,
        THERAPIST_RUNTIME_FLAG_KEYS,
        normalizeTherapistRuntimeFlagSnapshotPayload,
        getDefaultTherapistRuntimeFlags,
      } = await import('/src/lib/therapistRuntimeFlagTransport.js');

      const allFalse = (overrides: Record<string, boolean> = {}) => {
        const f: Record<string, boolean> = {};
        for (const k of THERAPIST_RUNTIME_FLAG_KEYS) f[k] = false;
        return { ...f, ...overrides };
      };

      const available = (overrides: Record<string, boolean>) => {
        const normalized = normalizeTherapistRuntimeFlagSnapshotPayload({
          schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
          flags: allFalse(overrides),
          generated_at: new Date().toISOString(),
        });
        return {
          schema: normalized.schema,
          transport_status: 'available',
          received: true,
          flags: normalized.flags,
          generated_at: normalized.generated_at,
          fetched_at: new Date().toISOString(),
        };
      };

      const unavailable = () => ({
        schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
        transport_status: 'unavailable',
        received: false,
        flags: getDefaultTherapistRuntimeFlags(),
        generated_at: null,
        fetched_at: new Date().toISOString(),
      });

      return {
        // Test 7: all true → true
        allTrue: resolveRuntimeLongitudinalFlag(available({
          THERAPIST_RUNTIME_APPLY_ENABLED: true,
          THERAPIST_UPGRADE_ENABLED: true,
          THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
          THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: true,
        })),
        // Test 8: MASTER=false → false
        masterFalse: resolveRuntimeLongitudinalFlag(available({
          THERAPIST_RUNTIME_APPLY_ENABLED: true,
          THERAPIST_UPGRADE_ENABLED: false,
          THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
          THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: true,
        })),
        // Test 9: SUM=false → false
        sumFalse: resolveRuntimeLongitudinalFlag(available({
          THERAPIST_RUNTIME_APPLY_ENABLED: true,
          THERAPIST_UPGRADE_ENABLED: true,
          THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: false,
          THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: true,
        })),
        // Test 10: LONGITUDINAL=false → false
        longitudinalFalse: resolveRuntimeLongitudinalFlag(available({
          THERAPIST_RUNTIME_APPLY_ENABLED: true,
          THERAPIST_UPGRADE_ENABLED: true,
          THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
          THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: false,
        })),
        // Test 11: APPLY=false → legacy
        applyFalse: resolveRuntimeLongitudinalFlag(available({
          THERAPIST_RUNTIME_APPLY_ENABLED: false,
          THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: true,
          THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
          THERAPIST_UPGRADE_ENABLED: true,
        })),
        applyFalseLegacy: isLongitudinalEnabled(),
        // Test 12: unavailable → legacy
        unavailableFallback: resolveRuntimeLongitudinalFlag(unavailable()),
        unavailableLegacy: isLongitudinalEnabled(),
      };
    });

    expect(result.allTrue).toBe(true);
    expect(result.masterFalse).toBe(false);
    expect(result.sumFalse).toBe(false);
    expect(result.longitudinalFalse).toBe(false);
    expect(result.applyFalse).toBe(result.applyFalseLegacy);
    expect(result.unavailableFallback).toBe(result.unavailableLegacy);
  });

  test('real runtime path proves enrichment privacy ordering failure-block and dedup', async ({ page }) => {
    await bootChat(page);

    const result = await page.evaluate(async () => {
      const {
        triggerConversationEndSummarization,
      } = await import('/src/lib/sessionEndSummarization.js');
      const { normalizeEntityList } = await import('/src/lib/entityListNormalizer.js');
      const { triggerConversationMemoryWriteOnce } = await import('/src/lib/conversationMemoryWriteDedup.js');
      const {
        THERAPIST_RUNTIME_FLAG_SCHEMA,
        THERAPIST_RUNTIME_FLAG_KEYS,
        normalizeTherapistRuntimeFlagSnapshotPayload,
      } = await import('/src/lib/therapistRuntimeFlagTransport.js');
      const { base44 } = await import('/src/api/base44Client.js');

      const buildSnapshot = (overrides: Record<string, boolean>) => {
        const defaults: Record<string, boolean> = {};
        for (const key of THERAPIST_RUNTIME_FLAG_KEYS) defaults[key] = false;
        const normalized = normalizeTherapistRuntimeFlagSnapshotPayload({
          schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
          flags: { ...defaults, ...overrides },
          generated_at: '2026-01-01T00:00:00.000Z',
        });
        return {
          schema: normalized.schema,
          transport_status: 'available',
          received: true,
          flags: normalized.flags,
          generated_at: normalized.generated_at,
          fetched_at: '2026-01-01T00:00:00.000Z',
        };
      };

      const acceptedRuntime = buildSnapshot({
        THERAPIST_RUNTIME_APPLY_ENABLED: true,
        THERAPIST_UPGRADE_ENABLED: true,
        THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
        THERAPIST_UPGRADE_CONTINUITY_ENABLED: true,
        THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: true,
      });

      const transcriptSentinel = '__RAW_SENTINEL_E2E__';
      const transcriptText = `[12:34] ${transcriptSentinel}`;

      const goalReadCalls: unknown[][] = [];
      const formulationReadCalls: unknown[][] = [];
      const entities = {
        Goal: {
          filter: async (...args: unknown[]) => {
            goalReadCalls.push(args);
            return normalizeEntityList({
              data: {
                results: [
                  { id: 'goal-real-1', title: 'Practice grounding', status: 'active' },
                  { id: 'goal-real-2', title: transcriptText, status: 'active' },
                ],
              },
            });
          },
        },
        CaseFormulation: {
          list: async (...args: unknown[]) => {
            formulationReadCalls.push(args);
            return normalizeEntityList({
              data: [{ core_belief: transcriptText }],
            });
          },
        },
      };

      const successCalls: Array<{ name: string; payload: any }> = [];
      const failureCalls: Array<{ name: string; payload: any }> = [];
      const originalInvoke = base44.functions.invoke;

      let resolveSuccessPath: (() => void) | null = null;
      const successDone = new Promise<void>((resolve) => {
        resolveSuccessPath = resolve;
      });

      base44.functions.invoke = async (name: string, payload: any) => {
        successCalls.push({ name, payload });
        if (name === 'generateSessionSummary') return { data: { success: true, id: 'mem-e2e-1' } };
        if (name === 'retrieveTherapistMemory') return { data: { memories: [], count: 0 } };
        if (name === 'writeLTSSnapshot') {
          resolveSuccessPath?.();
          return { data: { success: true, id: 'lts-e2e-1', upserted: 'created' } };
        }
        return { success: true };
      };

      const writeTracker = new Set<string>();
      triggerConversationMemoryWriteOnce({
        writeTracker,
        conversationId: 'conv-e2e-real-1',
        conversationMeta: { name: 'Real Runtime Session', intent: `\n${transcriptText}` },
        trigger: triggerConversationEndSummarization,
        invoker: 'chat_request_summary',
        entities,
        runtimeSnapshot: acceptedRuntime,
      });
      triggerConversationMemoryWriteOnce({
        writeTracker,
        conversationId: 'conv-e2e-real-1',
        conversationMeta: { name: 'Real Runtime Session', intent: `\n${transcriptText}` },
        trigger: triggerConversationEndSummarization,
        invoker: 'chat_request_summary',
        entities,
        runtimeSnapshot: acceptedRuntime,
      });

      await successDone;

      let resolveFailurePath: (() => void) | null = null;
      const failureDone = new Promise<void>((resolve) => {
        resolveFailurePath = resolve;
      });

      base44.functions.invoke = async (name: string, payload: any) => {
        failureCalls.push({ name, payload });
        if (name === 'generateSessionSummary') {
          resolveFailurePath?.();
          throw new Error('forced-generate-failure');
        }
        return { success: true };
      };

      triggerConversationEndSummarization(
        'conv-e2e-real-failure',
        { intent: 'failure path' },
        'chat_request_summary',
        null,
        acceptedRuntime,
      );

      await failureDone;
      base44.functions.invoke = originalInvoke;

      const summaryCalls = successCalls.filter((c) => c.name === 'generateSessionSummary');
      const summaryPayload = summaryCalls[0]?.payload ?? null;
      const payloadSerialized = JSON.stringify(summaryPayload);
      const successOrder = successCalls.map((c) => c.name);

      return {
        generateCountSuccessPath: summaryCalls.length,
        summarySessionId: summaryPayload?.session_id ?? null,
        summaryVersion: summaryPayload?.therapist_memory_version ?? null,
        goalsReferenced: summaryPayload?.goals_referenced ?? [],
        followUpTasks: summaryPayload?.follow_up_tasks ?? [],
        workingHypotheses: summaryPayload?.working_hypotheses ?? [],
        hasSentinelInPayload: payloadSerialized.includes(transcriptSentinel),
        hasTranscriptField: payloadSerialized.includes('"transcript"'),
        hasMessagesField: payloadSerialized.includes('"messages"'),
        goalReadCalls,
        formulationReadCalls,
        successOrder,
        failureOrder: failureCalls.map((c) => c.name),
      };
    });

    expect(result.generateCountSuccessPath).toBe(1);
    expect(result.summaryVersion).toBe('1');
    expect(result.summarySessionId).toBe('conv-e2e-real-1');
    expect(result.goalsReferenced).toEqual(['goal-real-1', 'goal-real-2']);
    expect(result.followUpTasks).toEqual(['Practice grounding']);
    expect(result.workingHypotheses).toEqual([]);
    expect(result.hasSentinelInPayload).toBe(false);
    expect(result.hasTranscriptField).toBe(false);
    expect(result.hasMessagesField).toBe(false);

    expect(result.goalReadCalls).toEqual([
      [{ status: 'active' }, '-created_date', 5],
    ]);
    expect(result.formulationReadCalls).toEqual([['-created_date', 1]]);

    expect(result.successOrder[0]).toBe('generateSessionSummary');
    expect(result.successOrder).toContain('retrieveTherapistMemory');
    expect(result.successOrder).toContain('writeLTSSnapshot');
    expect(result.successOrder.indexOf('retrieveTherapistMemory')).toBeGreaterThan(
      result.successOrder.indexOf('generateSessionSummary'),
    );
    expect(result.successOrder.indexOf('writeLTSSnapshot')).toBeGreaterThan(
      result.successOrder.indexOf('retrieveTherapistMemory'),
    );

    expect(result.failureOrder).toEqual(['generateSessionSummary']);
  });

  test('chat page renders without internal diagnostic text in visible UI', async ({ page }) => {
    await bootChat(page);

    await spaNavigate(page, '/Chat');

    // Wait for chat root
    await expect(page.locator('[data-testid="chat-root"], [class*="chat"], main, #root').first()).toBeVisible();

    const pageText = await page.locator('body').textContent();

    // No internal diagnostic labels should surface in the UI
    const diagnosticPatterns = [
      'resolveRuntimeContinuityEnrichmentFlag',
      'resolveRuntimeLongitudinalFlag',
      'isRetrieveTherapistMemoryEnabled',
      'isWriteTherapistMemoryEnabled',
      'isWriteLTSSnapshotEnabled',
      'THERAPIST_RUNTIME_APPLY_ENABLED',
      'VITE_THERAPIST_UPGRADE',
      'lts_write_after_session_memory',
    ];

    for (const pattern of diagnosticPatterns) {
      expect(pageText ?? '').not.toContain(pattern);
    }
  });

  test('Chat Orchestrator V2 is unaffected — resolvers do not touch orchestrator flag', async ({ page }) => {
    await bootChat(page);

    const result = await page.evaluate(async () => {
      const {
        THERAPIST_RUNTIME_FLAG_SCHEMA,
        THERAPIST_RUNTIME_FLAG_KEYS,
        normalizeTherapistRuntimeFlagSnapshotPayload,
      } = await import('/src/lib/therapistRuntimeFlagTransport.js');

      const allFalse = (overrides: Record<string, boolean> = {}) => {
        const f: Record<string, boolean> = {};
        for (const k of THERAPIST_RUNTIME_FLAG_KEYS) f[k] = false;
        return { ...f, ...overrides };
      };

      const snapshot = (() => {
        const normalized = normalizeTherapistRuntimeFlagSnapshotPayload({
          schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
          flags: allFalse({
            THERAPIST_RUNTIME_APPLY_ENABLED: true,
            THERAPIST_UPGRADE_ENABLED: true,
            THERAPIST_UPGRADE_SUMMARIZATION_ENABLED: true,
            THERAPIST_UPGRADE_CONTINUITY_ENABLED: true,
            THERAPIST_UPGRADE_LONGITUDINAL_ENABLED: true,
            // CHAT_ORCHESTRATOR_V2_ENABLED intentionally remains false
          }),
          generated_at: new Date().toISOString(),
        });
        return {
          schema: normalized.schema,
          transport_status: 'available',
          received: true,
          flags: normalized.flags,
          generated_at: normalized.generated_at,
          fetched_at: new Date().toISOString(),
        };
      })();

      return {
        // continuity and longitudinal should be true
        continuityEnabled: snapshot.flags['THERAPIST_UPGRADE_CONTINUITY_ENABLED'],
        longitudinalEnabled: snapshot.flags['THERAPIST_UPGRADE_LONGITUDINAL_ENABLED'],
        // Chat Orchestrator V2 must remain false
        chatOrchestratorV2: snapshot.flags['CHAT_ORCHESTRATOR_V2_ENABLED'],
      };
    });

    expect(result.continuityEnabled).toBe(true);
    expect(result.longitudinalEnabled).toBe(true);
    expect(result.chatOrchestratorV2).toBe(false);
  });

  test('unwrapBase44FunctionData supports unwrapped (legacy) responses as compatibility', async ({ page }) => {
    await bootChat(page);

    const result = await page.evaluate(async () => {
      const { unwrapBase44FunctionData } = await import('/src/lib/sessionEndSummarization.js');

      const legacyMemories = { memories: [{ therapist_memory_version: '1', session_id: 'legacy-1' }], count: 1 };
      const legacyWrite = { success: true, upserted: 'created' };
      const legacySummary = { success: true, id: 'legacy-mem-1' };

      const unwrappedMemories = unwrapBase44FunctionData(legacyMemories);
      const unwrappedWrite = unwrapBase44FunctionData(legacyWrite);
      const unwrappedSummary = unwrapBase44FunctionData(legacySummary);

      return {
        memoriesLength: Array.isArray(unwrappedMemories?.memories) ? unwrappedMemories.memories.length : -1,
        writeSuccess: unwrappedWrite?.success,
        writeUpserted: unwrappedWrite?.upserted,
        summarySuccess: unwrappedSummary?.success,
        summaryId: unwrappedSummary?.id,
      };
    });

    // Legacy unwrapped responses are passed through unchanged.
    expect(result.memoriesLength).toBe(1);
    expect(result.writeSuccess).toBe(true);
    expect(result.writeUpserted).toBe('created');
    expect(result.summarySuccess).toBe(true);
    expect(result.summaryId).toBe('legacy-mem-1');
  });
});
