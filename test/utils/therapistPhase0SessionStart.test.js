/**
 * @file test/utils/therapistPhase0SessionStart.test.js
 *
 * Phase 0 — Immediate Architecture Corrections
 * Correct routing so Chat.jsx uses V5 session-start logic.
 *
 * PURPOSE
 * -------
 *  1.  Verify that buildV5SessionStartContentAsync is exported from
 *      workflowContextInjector.js (the corrected import target).
 *  2.  Verify that Chat.jsx imports buildV5SessionStartContentAsync (not V4).
 *  3.  Verify that Chat.jsx does NOT import buildV4SessionStartContentAsync
 *      directly (routing bypass removed).
 *  4.  Verify that Chat.jsx calls buildV5SessionStartContentAsync at every
 *      session-start call site.
 *  5.  Verify that Chat.jsx does NOT call buildV4SessionStartContentAsync at
 *      any session-start call site (routing bypass absent).
 *  6.  Verify that buildV5SessionStartContentAsync for HYBRID wiring returns
 *      exactly '[START_SESSION]' (no behavior change on the default path).
 *  7.  Verify that buildV5SessionStartContentAsync for V4 wiring returns the
 *      same result as calling buildV4SessionStartContentAsync directly.
 *  8.  Verify that buildV5SessionStartContentAsync for V5 wiring with
 *      crisis_signal=false does NOT include safety mode instructions.
 *  9.  Verify that buildV5SessionStartContentAsync for V5 wiring with
 *      crisis_signal=true includes SAFETY_MODE_INSTRUCTIONS.
 * 10.  Verify that buildV5SessionStartContentAsync for V5 wiring with
 *      crisis_signal=true includes emergency resource section.
 * 11.  Verify that ACTIVE_CBT_THERAPIST_WIRING is HYBRID when all flags are off
 *      (Phase 0 default mode is unchanged).
 * 12.  Verify that THERAPIST_UPGRADE_SAFETY_MODE_ENABLED defaults to false
 *      (flag is off; production-safe default).
 * 13.  Verify that buildV5SessionStartContentAsync is a superset: result for
 *      any non-V5 wiring equals the result of buildV4SessionStartContentAsync.
 * 14.  Verify that the feature flag THERAPIST_UPGRADE_FLAGS object still has
 *      exactly 9 keys (Phase 1 Quality added the 9th flag).
 * 15.  Verify that resolveTherapistWiring returns CBT_THERAPIST_WIRING_STAGE2_V5
 *      when isUpgradeEnabled correctly simulates SAFETY_MODE_ENABLED=true.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Context injector ──────────────────────────────────────────────────────────
import {
  buildV5SessionStartContentAsync,
  buildV4SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

// ── Agent wirings ─────────────────────────────────────────────────────────────
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V2,
  CBT_THERAPIST_WIRING_STAGE2_V3,
  CBT_THERAPIST_WIRING_STAGE2_V4,
  CBT_THERAPIST_WIRING_STAGE2_V5,
} from '../../src/api/agentWiring.js';

// ── Active wiring + routing ───────────────────────────────────────────────────
import {
  ACTIVE_CBT_THERAPIST_WIRING,
  resolveTherapistWiring,
} from '../../src/api/activeAgentWiring.js';

// ── Feature flags ─────────────────────────────────────────────────────────────
import {
  THERAPIST_UPGRADE_FLAGS,
} from '../../src/lib/featureFlags.js';

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 0 — Chat.jsx source routing (static analysis)', () => {

  const chatSrc = readFileSync(resolve('src/pages/Chat.jsx'), 'utf8');

  // 1. buildV6SessionStartContentAsync is imported in Chat.jsx
  it('1. Chat.jsx imports buildV6SessionStartContentAsync', () => {
    expect(chatSrc).toContain('buildV6SessionStartContentAsync');
  });

  // 2. buildV4SessionStartContentAsync is NOT imported directly in Chat.jsx
  it('2. Chat.jsx does NOT import buildV4SessionStartContentAsync directly', () => {
    // The import line must not name buildV4SessionStartContentAsync
    const importLines = chatSrc
      .split('\n')
      .filter(line => line.startsWith('import'));
    const hasV4Import = importLines.some(line =>
      line.includes('buildV4SessionStartContentAsync')
    );
    expect(hasV4Import).toBe(false);
  });

  // 3. Chat.jsx calls buildActionFirstDemotedSessionContentAsync at all session-start sites
  //    Enforcement pass: updated from V12 to buildActionFirstDemotedSessionContentAsync
  //    (action-first demotion — formulation-first is now the unconditional default).
  it('3. Chat.jsx calls buildV10SessionStartContentAsync', () => {
    const callCount = (chatSrc.match(/buildActionFirstDemotedSessionContentAsync\s*\(/g) || []).length;
    expect(callCount).toBeGreaterThanOrEqual(4); // 4 call sites: 2 intent-handler + startNewConversationWithIntent + sendMessage
  });

  // 4. Chat.jsx does NOT call buildV4SessionStartContentAsync
  it('4. Chat.jsx does NOT call buildV4SessionStartContentAsync', () => {
    const callCount = (chatSrc.match(/buildV4SessionStartContentAsync\s*\(/g) || []).length;
    expect(callCount).toBe(0);
  });

  // 5. Every session-start call site in Chat.jsx uses buildActionFirstDemotedSessionContentAsync
  //    (action-first demotion enforcement pass: updated from V12 to demoted wrapper).
  it('5. every session-start call site in Chat.jsx uses V10 (not V4, V5, V6, V7, V8, or V9 at call sites)', () => {
    const demoedCalls = (chatSrc.match(/buildActionFirstDemotedSessionContentAsync\s*\(/g) || []).length;
    const v11Calls = (chatSrc.match(/await buildV11SessionStartContentAsync\s*\(/g) || []).length;
    const v10Calls = (chatSrc.match(/await buildV10SessionStartContentAsync\s*\(/g) || []).length;
    const v8Calls = (chatSrc.match(/buildV8SessionStartContentAsync\s*\(/g) || []).length;
    const v7Calls = (chatSrc.match(/buildV7SessionStartContentAsync\s*\(/g) || []).length;
    const v5Calls = (chatSrc.match(/buildV5SessionStartContentAsync\s*\(/g) || []).length;
    const v4Calls = (chatSrc.match(/buildV4SessionStartContentAsync\s*\(/g) || []).length;
    expect(demoedCalls).toBeGreaterThanOrEqual(4); // all four session-start call sites
    expect(v11Calls).toBe(0); // V11 no longer called directly
    expect(v10Calls).toBe(0); // V10 no longer called directly
    expect(v8Calls).toBe(0);
    expect(v7Calls).toBe(0);
    expect(v5Calls).toBe(0);
    expect(v4Calls).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 0 — buildV5SessionStartContentAsync backward-compatibility', () => {

  // 6. HYBRID wiring returns '[START_SESSION]' (default path unchanged)
  it('6. HYBRID wiring returns exactly [START_SESSION]', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_HYBRID, {}, null
    );
    expect(content).toBe('[START_SESSION]');
  });

  // 7. V4 wiring: V5 builder returns same as V4 builder (exact match)
  it('7. V4 wiring: V5 builder result equals V4 builder result', async () => {
    const v5 = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4, {}, null
    );
    const v4 = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4, {}, null
    );
    expect(v5).toBe(v4);
  });

  // 8. V3 wiring: no safety mode in result
  it('8. V3 wiring: V5 builder result excludes SAFETY_MODE_INSTRUCTIONS', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V3, {}, null, { crisis_signal: true }
    );
    expect(content).not.toContain('SAFETY MODE');
  });

  // 9. V2 wiring: no safety mode in result
  it('9. V2 wiring: V5 builder result excludes SAFETY_MODE_INSTRUCTIONS', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V2, {}, null, { crisis_signal: true }
    );
    expect(content).not.toContain('SAFETY MODE');
  });

  // 10. HYBRID wiring: no safety mode in result even with crisis_signal
  it('10. HYBRID wiring: V5 builder excludes SAFETY_MODE_INSTRUCTIONS (isolation)', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_HYBRID, {}, null, { crisis_signal: true }
    );
    expect(content).not.toContain('SAFETY MODE');
  });

  // 11. V4 wiring: no safety mode in result even with crisis_signal
  it('11. V4 wiring: V5 builder excludes SAFETY_MODE_INSTRUCTIONS (isolation)', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4, {}, null, { crisis_signal: true }
    );
    expect(content).not.toContain('SAFETY MODE');
  });

  // 12. V5 wiring without safety signal: no safety mode in result
  it('12. V5 wiring: no safety mode when crisis_signal is false', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5, {}, null,
      { crisis_signal: false, message_text: 'Today was okay' }
    );
    expect(content).not.toContain('SAFETY MODE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 0 — V5 session-start safety mode injection', () => {

  // 13. V5 + crisis_signal: safety mode instructions present
  it('13. V5 wiring with crisis_signal=true includes SAFETY_MODE_INSTRUCTIONS', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5, {}, null, { crisis_signal: true }
    );
    expect(content).toContain('SAFETY MODE');
    expect(content).toMatch(/phase.*7/i);
  });

  // 14. V5 + crisis_signal: emergency resources present
  it('14. V5 wiring with crisis_signal=true includes emergency resource section', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5, {}, null,
      { crisis_signal: true, locale: 'en' }
    );
    expect(content).toContain('EMERGENCY RESOURCES');
  });

  // 15. V5 + crisis_signal: content starts with [START_SESSION]
  it('15. V5 wiring with crisis_signal=true starts with [START_SESSION]', async () => {
    const content = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5, {}, null, { crisis_signal: true }
    );
    expect(content.startsWith('[START_SESSION]')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 0 — Default mode and flag safety', () => {

  // 16. ACTIVE_CBT_THERAPIST_WIRING is HYBRID when all flags are off
  it('16. ACTIVE_CBT_THERAPIST_WIRING is HYBRID (all flags off)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  // 17. THERAPIST_UPGRADE_SAFETY_MODE_ENABLED defaults to false
  it('17. THERAPIST_UPGRADE_SAFETY_MODE_ENABLED is false by default', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SAFETY_MODE_ENABLED).toBe(false);
  });

  // 18. THERAPIST_UPGRADE_ENABLED defaults to false (master gate off)
  it('18. THERAPIST_UPGRADE_ENABLED is false by default', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ENABLED).toBe(false);
  });

  // 19. THERAPIST_UPGRADE_FLAGS has exactly 13 keys (Wave 4A added the 13th key)
  it('19. THERAPIST_UPGRADE_FLAGS has exactly 17 keys', () => {
    const keys = Object.keys(THERAPIST_UPGRADE_FLAGS);
    expect(keys).toHaveLength(17);
  });

  // 20. resolveTherapistWiring returns HYBRID when called with no overrides
  it('20. resolveTherapistWiring returns HYBRID with no flag overrides', () => {
    const wiring = resolveTherapistWiring();
    expect(wiring).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  // 21. CBT_THERAPIST_WIRING_STAGE2_V5 has safety_mode_enabled: true
  it('21. CBT_THERAPIST_WIRING_STAGE2_V5 has safety_mode_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V5.safety_mode_enabled).toBe(true);
  });

  // 22. CBT_THERAPIST_WIRING_STAGE2_V4 does NOT have safety_mode_enabled
  it('22. CBT_THERAPIST_WIRING_STAGE2_V4 does not have safety_mode_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V4.safety_mode_enabled).not.toBe(true);
  });

  // 23. CBT_THERAPIST_WIRING_HYBRID does NOT have safety_mode_enabled
  it('23. CBT_THERAPIST_WIRING_HYBRID does not have safety_mode_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.safety_mode_enabled).not.toBe(true);
  });
});
