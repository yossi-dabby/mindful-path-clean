import { test, expect } from '@playwright/test';
import { mockApi, spaNavigate } from '../helpers/ui';

test.describe('Context Composer V2 session lock runtime', () => {
  test('session lock abstraction: first selection freezes, late snapshot cannot mutate, new session can reselect', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__TEST_APP_ID__ = 'test-app-id';
      (window as any).__DISABLE_ANALYTICS__ = true;
    });
    await mockApi(page);
    await spaNavigate(page, '/');

    const result = await page.evaluate(async () => {
      const { createContextComposerV2SessionSelectionController } = await import('/src/lib/contextComposerV2SessionSelectionController.js');
      const { resolveRuntimeContextComposerV2Selection } = await import('/src/lib/workflowContextInjector.js');
      const {
        THERAPIST_RUNTIME_FLAG_SCHEMA,
        THERAPIST_RUNTIME_FLAG_KEYS,
        normalizeTherapistRuntimeFlagSnapshotPayload,
      } = await import('/src/lib/therapistRuntimeFlagTransport.js');
      const {
        CBT_THERAPIST_WIRING_STAGE2_V12,
      } = await import('/src/api/agentWiring.js');

      const buildAllFalseFlags = (overrides = {}) => {
        const flags: Record<string, boolean> = {};
        for (const key of THERAPIST_RUNTIME_FLAG_KEYS) flags[key] = false;
        return { ...flags, ...overrides };
      };

      const makeAvailableSnapshot = (flagOverrides = {}) => {
        const normalized = normalizeTherapistRuntimeFlagSnapshotPayload({
          schema: THERAPIST_RUNTIME_FLAG_SCHEMA,
          flags: buildAllFalseFlags(flagOverrides),
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

      const ctrl = createContextComposerV2SessionSelectionController();
      const beforeSnapshot = ctrl.lockAndGet({
        sessionId: 'session-1',
        wiring: CBT_THERAPIST_WIRING_STAGE2_V12,
        snapshot: null,
      });

      const lateSnapshot = makeAvailableSnapshot({
        THERAPIST_RUNTIME_APPLY_ENABLED: true,
        THERAPIST_UPGRADE_ENABLED: true,
        CONTEXT_COMPOSER_V2_ENABLED: true,
      });
      const sameSessionAfterLateSnapshot = ctrl.lockAndGet({
        sessionId: 'session-1',
        wiring: CBT_THERAPIST_WIRING_STAGE2_V12,
        snapshot: lateSnapshot,
      });

      const nextSession = ctrl.lockAndGet({
        sessionId: 'session-2',
        wiring: CBT_THERAPIST_WIRING_STAGE2_V12,
        snapshot: lateSnapshot,
      });

      const masterOffResolved = resolveRuntimeContextComposerV2Selection(
        CBT_THERAPIST_WIRING_STAGE2_V12,
        makeAvailableSnapshot({
          THERAPIST_RUNTIME_APPLY_ENABLED: true,
          THERAPIST_UPGRADE_ENABLED: false,
          CONTEXT_COMPOSER_V2_ENABLED: true,
        }),
      );

      return {
        firstReason: beforeSnapshot.context_composer_v2_selection_reason,
        firstEffective: beforeSnapshot.context_composer_v2_effective,
        sameSessionFrozen: sameSessionAfterLateSnapshot.context_composer_v2_effective === beforeSnapshot.context_composer_v2_effective,
        sameSessionReasonFrozen: sameSessionAfterLateSnapshot.context_composer_v2_selection_reason === beforeSnapshot.context_composer_v2_selection_reason,
        nextSessionEffective: nextSession.context_composer_v2_effective,
        nextSessionReason: nextSession.context_composer_v2_selection_reason,
        masterOffEffective: masterOffResolved.enabled,
        masterOffReason: masterOffResolved.reason,
      };
    });

    expect(result.firstReason).toBe('legacy_fallback');
    expect(result.sameSessionFrozen).toBe(true);
    expect(result.sameSessionReasonFrozen).toBe(true);
    expect(result.nextSessionEffective).toBe(true);
    expect(result.nextSessionReason).toBe('runtime_snapshot_applied');
    expect(result.masterOffEffective).toBe(false);
    expect(result.masterOffReason).toBe('master_off');
  });

  test('runtime diagnostic reason codes are not visible in chat UI', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('language', 'en');
      localStorage.setItem('chat_consent_accepted', 'true');
      localStorage.setItem('age_verified', 'true');
      (window as any).__TEST_APP_ID__ = 'test-app-id';
      (window as any).__DISABLE_ANALYTICS__ = true;
    });
    await mockApi(page);
    await spaNavigate(page, '/Chat?_s2debug=true');

    const body = page.locator('body');
    await expect(body).not.toContainText('context_composer_v2_selection_reason');
    await expect(body).not.toContainText('runtime_snapshot_applied');
    await expect(body).not.toContainText('legacy_fallback');
    await expect(body).not.toContainText('master_off');
    await expect(body).not.toContainText('non_planner_wiring');
  });
});
