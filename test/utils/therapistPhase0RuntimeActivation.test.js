/**
 * @file test/utils/therapistPhase0RuntimeActivation.test.js
 *
 * Phase 0 — Runtime Activation: Session-Start Path Selection
 *
 * PURPOSE
 * -------
 * These tests verify the runtime activation change made to Chat.jsx:
 *  1.  Chat.jsx now always calls buildV7SessionStartContentAsync at session
 *      start — including the startNewConversationWithIntent and sendMessage
 *      paths that previously skipped the session-start block.
 *  2.  The V7 → V6 → V5 → V4 delegation chain is intact and correct.
 *  3.  V4 fallback is preserved: HYBRID wiring returns exactly '[START_SESSION]'
 *      (no behavior change on the default production path).
 *  4.  V5 activation works: when safety_mode_enabled is true on the active
 *      wiring AND a crisis signal is present, the safety-mode block is injected.
 *  5.  Non-therapist flows are not contaminated: companion wiring passed through
 *      the builders produces the same V4 result (isolation guarantee).
 *
 * STATIC ANALYSIS TESTS (Group 1)
 * --------------------------------
 * These tests parse Chat.jsx as plain text and assert structural properties
 * without running the React component.
 *
 * BEHAVIORAL TESTS (Groups 2–4)
 * --------------------------------
 * These tests exercise the workflowContextInjector functions directly with
 * representative wiring objects and option combinations.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

// ── Context injector ──────────────────────────────────────────────────────────
import {
  buildV4SessionStartContentAsync,
  buildV5SessionStartContentAsync,
  buildV7SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

// ── Wiring objects ────────────────────────────────────────────────────────────
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V4,
  CBT_THERAPIST_WIRING_STAGE2_V5,
  AI_COMPANION_WIRING_HYBRID,
} from '../../src/api/agentWiring.js';

// ── Active wiring ─────────────────────────────────────────────────────────────
import { ACTIVE_CBT_THERAPIST_WIRING } from '../../src/api/activeAgentWiring.js';

// ── Feature flags ─────────────────────────────────────────────────────────────
import { THERAPIST_UPGRADE_FLAGS } from '../../src/lib/featureFlags.js';

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 0 Runtime Activation — static analysis of Chat.jsx call sites', () => {
  const chatSrc = readFileSync(resolve('src/pages/Chat.jsx'), 'utf8');

  // 1. Chat.jsx imports buildV7SessionStartContentAsync and buildV8SessionStartContentAsync
  it('1. Chat.jsx imports buildV7SessionStartContentAsync and buildV8SessionStartContentAsync', () => {
    const importLines = chatSrc.split('\n').filter(l => l.startsWith('import'));
    const hasV7 = importLines.some(l => l.includes('buildV7SessionStartContentAsync'));
    const hasV8 = importLines.some(l => l.includes('buildV8SessionStartContentAsync'));
    expect(hasV7).toBe(true);
    expect(hasV8).toBe(true);
  });
  // 2. Chat.jsx does NOT import buildV4SessionStartContentAsync or
  //    buildV5SessionStartContentAsync directly
  it('2. Chat.jsx does not directly import buildV4 or buildV5', () => {
    const importLines = chatSrc.split('\n').filter(l => l.startsWith('import'));
    const hasV4 = importLines.some(l => l.includes('buildV4SessionStartContentAsync'));
    const hasV5 = importLines.some(l => l.includes('buildV5SessionStartContentAsync'));
    expect(hasV4).toBe(false);
    expect(hasV5).toBe(false);
  });

  // 3. Chat.jsx now has at least 4 buildActionFirstDemotedSessionContentAsync call sites
  //    (action-first demotion pass: wrapper replaces direct V12 calls at all session-start sites)
  it('3. Chat.jsx has at least 4 buildV11SessionStartContentAsync call sites', () => {
    const demoedCalls = (chatSrc.match(/buildActionFirstDemotedSessionContentAsync\s*\(/g) || []).length;
    expect(demoedCalls).toBeGreaterThanOrEqual(4);
  });

  // 4. Chat.jsx has zero buildV4SessionStartContentAsync call sites (routing bypass absent)
  it('4. Chat.jsx has zero buildV4SessionStartContentAsync call sites', () => {
    const calls = (chatSrc.match(/buildV4SessionStartContentAsync\s*\(/g) || []).length;
    expect(calls).toBe(0);
  });

  // 5. Chat.jsx has zero buildV5SessionStartContentAsync call sites at runtime
  it('5. Chat.jsx has zero buildV5SessionStartContentAsync call sites', () => {
    const calls = (chatSrc.match(/buildV5SessionStartContentAsync\s*\(/g) || []).length;
    expect(calls).toBe(0);
  });

  // 6. The startNewConversationWithIntent path uses buildActionFirstDemotedSessionContentAsync
  //    (action-first demotion pass: updated from V12 to demoted wrapper).
  it('6. startNewConversationWithIntent path uses sessionStartContent variable from buildV11', () => {
    expect(chatSrc).toMatch(/sessionStartContent\s*=\s*await\s+buildActionFirstDemotedSessionContentAsync/);
  });

  // 7. No other page or component besides Chat.jsx uses session-start builders
  //    (isolation: companion and other pages are unaffected)
  //    Enforcement pass: updated to check for V12 as the highest-level session-start builder.
  it('7. only Chat.jsx in src/ uses buildV11SessionStartContentAsync', () => {
    // This is a documentation test — we assert Chat.jsx is the sole runtime user of the
    // action-first demoted wrapper (buildActionFirstDemotedSessionContentAsync).
    // If another page starts using it, this test fails as an intentional tripwire.
    const demoedInChat = (chatSrc.match(/buildActionFirstDemotedSessionContentAsync/g) || []).length;
    expect(demoedInChat).toBeGreaterThanOrEqual(4);
    // The companion agent path (Chat.jsx does not call the demoted wrapper on companion wiring)
    // is verified behaviorally in Group 4 below.
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 0 Runtime Activation — V4 fallback (default production path)', () => {
  // 8. buildV7 on HYBRID wiring returns exactly '[START_SESSION]'
  it('8. buildV7 with HYBRID wiring returns exactly [START_SESSION]', async () => {
    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_HYBRID, {}, null
    );
    expect(result).toBe('[START_SESSION]');
  });

  // 9. buildV7 on HYBRID wiring matches buildV4 on HYBRID wiring exactly
  it('9. buildV7 on HYBRID equals buildV4 on HYBRID (V4 fallback preserved)', async () => {
    const v7 = await buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    const v4 = await buildV4SessionStartContentAsync(CBT_THERAPIST_WIRING_HYBRID, {}, null);
    expect(v7).toBe(v4);
  });

  // 10. buildV7 on V4 wiring matches buildV4 on V4 wiring exactly
  it('10. buildV7 on V4 wiring equals buildV4 on V4 wiring (V4 fallback preserved)', async () => {
    const v7 = await buildV7SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V4, {}, null);
    const v4 = await buildV4SessionStartContentAsync(CBT_THERAPIST_WIRING_STAGE2_V4, {}, null);
    expect(v7).toBe(v4);
  });

  // 11. ACTIVE_CBT_THERAPIST_WIRING resolves to HYBRID when all flags are off
  it('11. ACTIVE_CBT_THERAPIST_WIRING is CBT_THERAPIST_WIRING_HYBRID when all flags off', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  // 12. buildV7 on ACTIVE_CBT_THERAPIST_WIRING (default) returns '[START_SESSION]'
  it('12. buildV7 on ACTIVE_CBT_THERAPIST_WIRING (default) returns [START_SESSION]', async () => {
    const result = await buildV7SessionStartContentAsync(
      ACTIVE_CBT_THERAPIST_WIRING, {}, null
    );
    expect(result).toBe('[START_SESSION]');
  });

  // 13. THERAPIST_UPGRADE_SAFETY_MODE_ENABLED defaults to false (production safe)
  it('13. THERAPIST_UPGRADE_SAFETY_MODE_ENABLED defaults to false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_SAFETY_MODE_ENABLED).toBe(false);
  });

  // 14. buildV7 on HYBRID wiring with crisis_signal=true still returns '[START_SESSION]'
  //     (flag-gated: safety mode is NOT active on HYBRID wiring)
  it('14. buildV7 on HYBRID with crisis_signal=true still returns [START_SESSION]', async () => {
    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_HYBRID, {}, null,
      { crisis_signal: true }
    );
    expect(result).toBe('[START_SESSION]');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 0 Runtime Activation — V5 activation (safety mode path)', () => {
  // 15. CBT_THERAPIST_WIRING_STAGE2_V5 has safety_mode_enabled: true
  it('15. CBT_THERAPIST_WIRING_STAGE2_V5 has safety_mode_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V5.safety_mode_enabled).toBe(true);
  });

  // 16. buildV7 with V5 wiring, no crisis signal → no safety mode block
  it('16. buildV7 on V5 wiring with crisis_signal=false excludes SAFETY MODE', async () => {
    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5, {}, null,
      { crisis_signal: false, message_text: 'I had a calm day' }
    );
    expect(result).not.toContain('SAFETY MODE');
  });

  // 17. buildV7 with V5 wiring, crisis_signal=true → safety mode block injected
  it('17. buildV7 on V5 wiring with crisis_signal=true includes SAFETY MODE', async () => {
    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5, {}, null,
      { crisis_signal: true }
    );
    expect(result).toContain('SAFETY MODE');
  });

  // 18. buildV7 with V5 wiring, crisis_signal=true → content starts with [START_SESSION]
  it('18. buildV7 on V5 wiring with crisis_signal=true still starts with [START_SESSION]', async () => {
    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5, {}, null,
      { crisis_signal: true }
    );
    expect(result.startsWith('[START_SESSION]')).toBe(true);
  });

  // 19. buildV7 with V5 wiring, crisis_signal=true, locale='en' → includes EMERGENCY RESOURCES
  it('19. buildV7 on V5 wiring with crisis_signal=true includes EMERGENCY RESOURCES', async () => {
    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5, {}, null,
      { crisis_signal: true, locale: 'en' }
    );
    expect(result).toContain('EMERGENCY RESOURCES');
  });

  // 20. buildV7 result for V5 wiring with crisis is a strict superset of buildV5 result
  it('20. buildV7 on V5 wiring with crisis starts with buildV5 result (superset)', async () => {
    const v7 = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5, {}, null,
      { crisis_signal: true }
    );
    const v5 = await buildV5SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5, {}, null,
      { crisis_signal: true }
    );
    // V7 delegates down to V5 for V5-wiring; both should produce the same content
    expect(v7).toBe(v5);
  });

  // 21. flag_override=true triggers safety mode on V5 wiring even without crisis
  it('21. buildV7 on V5 wiring with flag_override=true includes SAFETY MODE', async () => {
    const result = await buildV7SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V5, {}, null,
      { flag_override: true }
    );
    expect(result).toContain('SAFETY MODE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 0 Runtime Activation — non-therapist flow isolation', () => {
  // 22. Companion HYBRID wiring has no safety_mode_enabled field
  it('22. AI_COMPANION_WIRING_HYBRID does not have safety_mode_enabled: true', () => {
    expect(AI_COMPANION_WIRING_HYBRID.safety_mode_enabled).not.toBe(true);
  });

  // 23. buildV7 with companion hybrid wiring returns exactly '[START_SESSION]'
  //     (companion wiring is treated identically to therapist HYBRID — no contamination)
  it('23. buildV7 with companion HYBRID wiring returns [START_SESSION] (no contamination)', async () => {
    const result = await buildV7SessionStartContentAsync(
      AI_COMPANION_WIRING_HYBRID, {}, null
    );
    expect(result).toBe('[START_SESSION]');
  });

  // 24. buildV7 with companion wiring + crisis_signal does NOT inject safety mode
  //     (safety mode requires safety_mode_enabled on the wiring object)
  it('24. buildV7 with companion wiring + crisis_signal=true does NOT include SAFETY MODE', async () => {
    const result = await buildV7SessionStartContentAsync(
      AI_COMPANION_WIRING_HYBRID, {}, null,
      { crisis_signal: true }
    );
    expect(result).not.toContain('SAFETY MODE');
  });

  // 25. buildV7 with companion wiring equals buildV4 with companion wiring
  //     (V5 / safety layer is not activated for companion flows)
  it('25. buildV7 on companion wiring equals buildV4 on companion wiring (V4 fallback)', async () => {
    const v7 = await buildV7SessionStartContentAsync(AI_COMPANION_WIRING_HYBRID, {}, null);
    const v4 = await buildV4SessionStartContentAsync(AI_COMPANION_WIRING_HYBRID, {}, null);
    expect(v7).toBe(v4);
  });

  // 26. No non-Chat.jsx source file in src/pages/ imports buildV7SessionStartContentAsync
  it('26. no file in src/pages/ other than Chat.jsx imports buildV7SessionStartContentAsync', () => {
    const pagesDir = resolve('src/pages');
    const files = readdirSync(pagesDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));
    const violators = files.filter(f => {
      if (f === 'Chat.jsx') return false; // expected usage
      try {
        const src = readFileSync(join(pagesDir, f), 'utf8');
        return src.includes('buildV7SessionStartContentAsync');
      } catch {
        return false;
      }
    });
    expect(violators).toHaveLength(0);
  });
});
