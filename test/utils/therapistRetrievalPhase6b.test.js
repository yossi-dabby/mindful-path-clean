/**
 * @file test/utils/therapistRetrievalPhase6b.test.js
 *
 * Phase 6b — V4 Live Retrieval Capability Truthfulness
 *
 * PURPOSE
 * -------
 * Verify that the V4 session-start content accurately reflects whether
 * verified live context was actually injected, rather than merely whether
 * the V4 policy wiring flag is enabled.
 *
 * Specifically:
 *  1. buildV4RuntimeStatusBlock exports LIVE_STATUS_REASONS and
 *     buildV4RuntimeStatusBlock from workflowContextInjector.js.
 *  2. buildV4RuntimeStatusBlock with no v4Result (null) returns a block
 *     with verified_live_context_injected: false and a behavioral
 *     instruction that forbids browsing/search claims.
 *  3. buildV4RuntimeStatusBlock with liveRetrievalAllowed absent →
 *     live_status_reason: flag_off, no-browse instruction.
 *  4. buildV4RuntimeStatusBlock with liveRetrievalAllowed false →
 *     live_status_reason: flag_off, no-browse instruction.
 *  5. buildV4RuntimeStatusBlock for no-URL result →
 *     live_status_reason: no_url, no-browse instruction.
 *  6. buildV4RuntimeStatusBlock for allowlist-blocked result →
 *     live_status_reason: blocked, no-browse instruction.
 *  7. buildV4RuntimeStatusBlock for backend-unavailable result →
 *     verified_live_context_injected: false, no-browse instruction.
 *  8. buildV4RuntimeStatusBlock for a valid injected live item →
 *     verified_live_context_injected: true, use-only-supplied instruction,
 *     still prohibits general browsing claims.
 *  9. buildV4SessionStartContentAsync for V4 with no liveRetrievalAllowed →
 *     content contains runtime status block with no-browse instruction.
 * 10. buildV4SessionStartContentAsync for V4 with liveRetrievalAllowed: false →
 *     same result.
 * 11. buildV4SessionStartContentAsync for V4 with no URL →
 *     runtime status has no_url, no-browse instruction.
 * 12. buildV4SessionStartContentAsync for V4 blocked by allowlist →
 *     runtime status has no verified live context, no-browse instruction.
 * 13. buildV4SessionStartContentAsync for V4 backend unavailable →
 *     runtime status has no verified live context, no-browse instruction.
 * 14. buildV4SessionStartContentAsync for V4 with valid injected live item →
 *     runtime status has verified_live_context_injected: true,
 *     use-only-supplied instruction, prohibits general browsing.
 * 15. V3 and earlier paths (HYBRID, V1, V2, V3) are byte-for-byte unchanged:
 *     buildV4SessionStartContentAsync delegates to V3 path and runtime
 *     status block is NOT injected.
 * 16. LIVE_STATUS_REASONS is a frozen object with all required keys.
 * 17. buildV4RuntimeStatusBlock never throws for any input.
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT enable any feature flags — all flags remain false throughout.
 * - All prior phase assertions remain intact (this test is additive only).
 * - Uses mock entity objects; no live entity calls are made.
 * - Uses mock base44 clients; no live backend calls are made.
 *
 * Source of truth: problem statement — V4 live-retrieval capability truthfulness fix
 */

import { describe, it, expect, vi } from 'vitest';

// ── Phase 6b — Runtime status block ───────────────────────────────────────────
import {
  LIVE_STATUS_REASONS,
  buildV4RuntimeStatusBlock,
  getLiveRetrievalContextForWiring,
  buildV4SessionStartContentAsync,
  buildV3SessionStartContentAsync,
} from '../../src/lib/workflowContextInjector.js';

// ── Phase 6 — Live retrieval wrapper (for LIVE_KNOWLEDGE_SOURCE_TYPE) ─────────
import {
  LIVE_KNOWLEDGE_SOURCE_TYPE,
  LIVE_RETRIEVAL_POLICY_INSTRUCTIONS,
} from '../../src/lib/liveRetrievalWrapper.js';

// ── Wirings ────────────────────────────────────────────────────────────────────
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V1,
  CBT_THERAPIST_WIRING_STAGE2_V2,
  CBT_THERAPIST_WIRING_STAGE2_V3,
  CBT_THERAPIST_WIRING_STAGE2_V4,
} from '../../src/api/agentWiring.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEmptyEntities() {
  return {
    CompanionMemory: { list: async () => [] },
    Goal: { filter: async () => [] },
    SessionSummary: { list: async () => [] },
    Exercise: { list: async () => [] },
    Resource: { list: async () => [] },
    ExternalKnowledgeChunk: { list: async () => [] },
  };
}

function makeMockBaseClient(invokeReturnValue = null) {
  return {
    functions: {
      invoke: vi.fn(async () => invokeReturnValue),
    },
  };
}

/** Builds a minimal V4RetrievalResult with live_skip_reason 'flag_off' */
function makeFlagOffResult() {
  return {
    items: [],
    sources_queried: [],
    sources_skipped: [],
    live_attempted: false,
    live_skipped: true,
    live_skip_reason: 'flag_off',
    live_blocked: false,
  };
}

/** Builds a minimal V4RetrievalResult with live_skip_reason 'no_url' */
function makeNoUrlResult() {
  return {
    items: [],
    sources_queried: [],
    sources_skipped: [],
    live_attempted: false,
    live_skipped: true,
    live_skip_reason: 'no_url',
    live_blocked: false,
  };
}

/** Builds a minimal V4RetrievalResult with live_blocked: true */
function makeBlockedResult() {
  return {
    items: [],
    sources_queried: [],
    sources_skipped: [],
    live_attempted: true,
    live_skipped: false,
    live_skip_reason: 'blocked',
    live_blocked: true,
  };
}

/** Builds a minimal V4RetrievalResult simulating backend unavailable */
function makeBackendUnavailableResult() {
  return {
    items: [],
    sources_queried: [],
    sources_skipped: [],
    live_attempted: true,
    live_skipped: false,
    live_skip_reason: 'live_retrieval_error',
    live_blocked: true,
  };
}

/** Builds a V4RetrievalResult with a verified live item injected */
function makeInjectedResult(content = 'CBT techniques summary.') {
  return {
    items: [
      {
        source_type: LIVE_KNOWLEDGE_SOURCE_TYPE,
        content,
        source_id: 'https://nimh.nih.gov/health/topics/anxiety',
        entity_name: 'nimh.nih.gov',
      },
    ],
    sources_queried: [LIVE_KNOWLEDGE_SOURCE_TYPE],
    sources_skipped: [],
    live_attempted: true,
    live_skipped: false,
    live_skip_reason: '',
    live_blocked: false,
  };
}

// ─── Section 1 — LIVE_STATUS_REASONS exports ──────────────────────────────────

describe('Phase 6b — LIVE_STATUS_REASONS', () => {
  it('is exported from workflowContextInjector.js', () => {
    expect(LIVE_STATUS_REASONS).toBeDefined();
  });

  it('is a frozen object', () => {
    expect(Object.isFrozen(LIVE_STATUS_REASONS)).toBe(true);
  });

  it('contains FLAG_OFF key', () => {
    expect(LIVE_STATUS_REASONS.FLAG_OFF).toBe('flag_off');
  });

  it('contains NO_URL key', () => {
    expect(LIVE_STATUS_REASONS.NO_URL).toBe('no_url');
  });

  it('contains NO_CLIENT key', () => {
    expect(LIVE_STATUS_REASONS.NO_CLIENT).toBe('no_client');
  });

  it('contains INTERNAL_SUFFICIENT key', () => {
    expect(LIVE_STATUS_REASONS.INTERNAL_SUFFICIENT).toBe('internal_sufficient');
  });

  it('contains V3_FAILED key', () => {
    expect(LIVE_STATUS_REASONS.V3_FAILED).toBe('v3_failed');
  });

  it('contains LIVE_RETRIEVAL_ERROR key', () => {
    expect(LIVE_STATUS_REASONS.LIVE_RETRIEVAL_ERROR).toBe('live_retrieval_error');
  });

  it('contains BLOCKED key', () => {
    expect(LIVE_STATUS_REASONS.BLOCKED).toBe('blocked');
  });

  it('contains NO_LIVE_CONTENT key', () => {
    expect(LIVE_STATUS_REASONS.NO_LIVE_CONTENT).toBe('no_live_content');
  });

  it('contains INJECTED key', () => {
    expect(LIVE_STATUS_REASONS.INJECTED).toBe('injected');
  });

  it('contains UNKNOWN key', () => {
    expect(LIVE_STATUS_REASONS.UNKNOWN).toBe('unknown');
  });
});

// ─── Section 2 — buildV4RuntimeStatusBlock: exports and structure ─────────────

describe('Phase 6b — buildV4RuntimeStatusBlock export', () => {
  it('is exported from workflowContextInjector.js', () => {
    expect(typeof buildV4RuntimeStatusBlock).toBe('function');
  });

  it('returns a non-empty string', () => {
    const block = buildV4RuntimeStatusBlock(makeFlagOffResult());
    expect(typeof block).toBe('string');
    expect(block.length).toBeGreaterThan(0);
  });

  it('includes the status header', () => {
    const block = buildV4RuntimeStatusBlock(makeFlagOffResult());
    expect(block).toContain('=== V4 LIVE RETRIEVAL RUNTIME STATUS ===');
  });

  it('includes the status footer', () => {
    const block = buildV4RuntimeStatusBlock(makeFlagOffResult());
    expect(block).toContain('=== END V4 LIVE RETRIEVAL RUNTIME STATUS ===');
  });

  it('includes verified_live_context_injected field', () => {
    const block = buildV4RuntimeStatusBlock(makeFlagOffResult());
    expect(block).toContain('verified_live_context_injected:');
  });

  it('includes live_retrieval_attempted field', () => {
    const block = buildV4RuntimeStatusBlock(makeFlagOffResult());
    expect(block).toContain('live_retrieval_attempted:');
  });

  it('includes live_retrieval_blocked field', () => {
    const block = buildV4RuntimeStatusBlock(makeFlagOffResult());
    expect(block).toContain('live_retrieval_blocked:');
  });

  it('includes live_status_reason field', () => {
    const block = buildV4RuntimeStatusBlock(makeFlagOffResult());
    expect(block).toContain('live_status_reason:');
  });

  it('includes [BEHAVIORAL INSTRUCTION — REQUIRED] marker', () => {
    const block = buildV4RuntimeStatusBlock(makeFlagOffResult());
    expect(block).toContain('[BEHAVIORAL INSTRUCTION — REQUIRED]');
  });
});

// ─── Section 3 — buildV4RuntimeStatusBlock: null / failed input ───────────────

describe('Phase 6b — buildV4RuntimeStatusBlock with null result', () => {
  it('does not throw for null input', () => {
    expect(() => buildV4RuntimeStatusBlock(null)).not.toThrow();
  });

  it('does not throw for undefined input', () => {
    expect(() => buildV4RuntimeStatusBlock(undefined)).not.toThrow();
  });

  it('does not throw for empty object input', () => {
    expect(() => buildV4RuntimeStatusBlock({})).not.toThrow();
  });

  it('returns verified_live_context_injected: false for null', () => {
    const block = buildV4RuntimeStatusBlock(null);
    expect(block).toContain('verified_live_context_injected: false');
  });

  it('includes no-browse behavioral instruction for null', () => {
    const block = buildV4RuntimeStatusBlock(null);
    expect(block).toContain('No verified live context was supplied in this session.');
    expect(block).toContain('Do not claim that you can browse, search, fetch, or verify information online');
    expect(block).toContain('Do not offer to perform a future search.');
  });
});

// ─── Section 4 — buildV4RuntimeStatusBlock: flag_off result ──────────────────

describe('Phase 6b — buildV4RuntimeStatusBlock with flag_off result (liveRetrievalAllowed absent or false)', () => {
  it('returns verified_live_context_injected: false', () => {
    const block = buildV4RuntimeStatusBlock(makeFlagOffResult());
    expect(block).toContain('verified_live_context_injected: false');
  });

  it('returns live_status_reason: flag_off', () => {
    const block = buildV4RuntimeStatusBlock(makeFlagOffResult());
    expect(block).toContain('live_status_reason: flag_off');
  });

  it('returns live_retrieval_attempted: false', () => {
    const block = buildV4RuntimeStatusBlock(makeFlagOffResult());
    expect(block).toContain('live_retrieval_attempted: false');
  });

  it('returns live_retrieval_blocked: false', () => {
    const block = buildV4RuntimeStatusBlock(makeFlagOffResult());
    expect(block).toContain('live_retrieval_blocked: false');
  });

  it('includes no-browse behavioral instruction', () => {
    const block = buildV4RuntimeStatusBlock(makeFlagOffResult());
    expect(block).toContain('Do not claim that you can browse, search, fetch, or verify information online');
    expect(block).toContain('Do not offer to perform a future search.');
    expect(block).toContain('State only that no verified live context was supplied.');
  });

  it('does not include the use-only-supplied instruction', () => {
    const block = buildV4RuntimeStatusBlock(makeFlagOffResult());
    expect(block).not.toContain('Use only the supplied live context.');
  });
});

// ─── Section 5 — buildV4RuntimeStatusBlock: no_url result ────────────────────

describe('Phase 6b — buildV4RuntimeStatusBlock with no_url result', () => {
  it('returns verified_live_context_injected: false', () => {
    const block = buildV4RuntimeStatusBlock(makeNoUrlResult());
    expect(block).toContain('verified_live_context_injected: false');
  });

  it('returns live_status_reason: no_url', () => {
    const block = buildV4RuntimeStatusBlock(makeNoUrlResult());
    expect(block).toContain('live_status_reason: no_url');
  });

  it('includes no-browse behavioral instruction', () => {
    const block = buildV4RuntimeStatusBlock(makeNoUrlResult());
    expect(block).toContain('Do not claim that you can browse, search, fetch, or verify information online');
    expect(block).toContain('Do not offer to perform a future search.');
  });
});

// ─── Section 6 — buildV4RuntimeStatusBlock: allowlist blocked result ─────────

describe('Phase 6b — buildV4RuntimeStatusBlock with allowlist-blocked result', () => {
  it('returns verified_live_context_injected: false', () => {
    const block = buildV4RuntimeStatusBlock(makeBlockedResult());
    expect(block).toContain('verified_live_context_injected: false');
  });

  it('returns live_retrieval_blocked: true', () => {
    const block = buildV4RuntimeStatusBlock(makeBlockedResult());
    expect(block).toContain('live_retrieval_blocked: true');
  });

  it('returns live_status_reason: blocked', () => {
    const block = buildV4RuntimeStatusBlock(makeBlockedResult());
    expect(block).toContain('live_status_reason: blocked');
  });

  it('includes no-browse behavioral instruction', () => {
    const block = buildV4RuntimeStatusBlock(makeBlockedResult());
    expect(block).toContain('Do not claim that you can browse, search, fetch, or verify information online');
    expect(block).toContain('Do not offer to perform a future search.');
  });
});

// ─── Section 7 — buildV4RuntimeStatusBlock: backend unavailable result ───────

describe('Phase 6b — buildV4RuntimeStatusBlock with backend unavailable result', () => {
  it('returns verified_live_context_injected: false', () => {
    const block = buildV4RuntimeStatusBlock(makeBackendUnavailableResult());
    expect(block).toContain('verified_live_context_injected: false');
  });

  it('returns live_retrieval_attempted: true', () => {
    const block = buildV4RuntimeStatusBlock(makeBackendUnavailableResult());
    expect(block).toContain('live_retrieval_attempted: true');
  });

  it('includes no-browse behavioral instruction', () => {
    const block = buildV4RuntimeStatusBlock(makeBackendUnavailableResult());
    expect(block).toContain('Do not claim that you can browse, search, fetch, or verify information online');
    expect(block).toContain('Do not offer to perform a future search.');
  });
});

// ─── Section 8 — buildV4RuntimeStatusBlock: valid injected live item ─────────

describe('Phase 6b — buildV4RuntimeStatusBlock with verified live item injected', () => {
  it('returns verified_live_context_injected: true', () => {
    const block = buildV4RuntimeStatusBlock(makeInjectedResult());
    expect(block).toContain('verified_live_context_injected: true');
  });

  it('returns live_retrieval_attempted: true', () => {
    const block = buildV4RuntimeStatusBlock(makeInjectedResult());
    expect(block).toContain('live_retrieval_attempted: true');
  });

  it('returns live_retrieval_blocked: false', () => {
    const block = buildV4RuntimeStatusBlock(makeInjectedResult());
    expect(block).toContain('live_retrieval_blocked: false');
  });

  it('returns live_status_reason: injected', () => {
    const block = buildV4RuntimeStatusBlock(makeInjectedResult());
    expect(block).toContain('live_status_reason: injected');
  });

  it('includes use-only-supplied-context behavioral instruction', () => {
    const block = buildV4RuntimeStatusBlock(makeInjectedResult());
    expect(block).toContain('Verified live context has been supplied in this session');
    expect(block).toContain('Use only the supplied live context.');
  });

  it('still prohibits claims of general ongoing browsing', () => {
    const block = buildV4RuntimeStatusBlock(makeInjectedResult());
    expect(block).toContain('Do not claim general or ongoing browsing capability.');
  });

  it('prohibits promising future live retrieval', () => {
    const block = buildV4RuntimeStatusBlock(makeInjectedResult());
    expect(block).toContain('Do not promise to retrieve additional live information during later turns');
  });

  it('does not include the no-browse instruction (correct path selected)', () => {
    const block = buildV4RuntimeStatusBlock(makeInjectedResult());
    expect(block).not.toContain('Do not claim that you can browse, search, fetch, or verify information online');
    expect(block).not.toContain('Do not offer to perform a future search.');
  });
});

// ─── Section 9 — buildV4RuntimeStatusBlock: never throws ─────────────────────

describe('Phase 6b — buildV4RuntimeStatusBlock never throws', () => {
  const inputs = [
    null,
    undefined,
    {},
    [],
    42,
    'string',
    true,
    { items: null },
    { items: [] },
    { live_attempted: null, live_blocked: null, live_skip_reason: null },
    { items: [null, undefined, {}] },
    { live_skip_reason: 'unrecognised_reason_xyz' },
  ];

  inputs.forEach((input, i) => {
    it(`does not throw for input[${i}] = ${JSON.stringify(input)}`, () => {
      expect(() => buildV4RuntimeStatusBlock(input)).not.toThrow();
    });
  });

  it('returns unknown reason for unrecognised live_skip_reason', () => {
    const block = buildV4RuntimeStatusBlock({ live_skip_reason: 'totally_unknown_reason' });
    expect(block).toContain('live_status_reason: unknown');
  });
});

// ─── Section 10 — buildV4SessionStartContentAsync: runtime status injected ───

describe('Phase 6b — buildV4SessionStartContentAsync for V4 injects runtime status block', () => {
  it('contains V4 LIVE RETRIEVAL RUNTIME STATUS header for V4 wiring', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      null,
    );
    expect(content).toContain('=== V4 LIVE RETRIEVAL RUNTIME STATUS ===');
  });

  it('contains END V4 LIVE RETRIEVAL RUNTIME STATUS footer for V4 wiring', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      null,
    );
    expect(content).toContain('=== END V4 LIVE RETRIEVAL RUNTIME STATUS ===');
  });

  it('contains verified_live_context_injected: false when liveRetrievalAllowed absent', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      null,
    );
    expect(content).toContain('verified_live_context_injected: false');
  });

  it('contains no-browse instruction when liveRetrievalAllowed absent', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      null,
    );
    expect(content).toContain('Do not claim that you can browse, search, fetch, or verify information online');
    expect(content).toContain('Do not offer to perform a future search.');
  });

  it('contains verified_live_context_injected: false when liveRetrievalAllowed: false', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      null,
      { liveRetrievalAllowed: false },
    );
    expect(content).toContain('verified_live_context_injected: false');
  });

  it('contains no-browse instruction when liveRetrievalAllowed: false', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      null,
      { liveRetrievalAllowed: false },
    );
    expect(content).toContain('Do not claim that you can browse, search, fetch, or verify information online');
    expect(content).toContain('Do not offer to perform a future search.');
  });

  it('contains live_status_reason: flag_off when liveRetrievalAllowed absent', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      null,
    );
    expect(content).toContain('live_status_reason: flag_off');
  });
});

// ─── Section 11 — buildV4SessionStartContentAsync: no URL scenario ────────────

describe('Phase 6b — buildV4SessionStartContentAsync for V4 with no URL', () => {
  it('contains no_url reason when liveRetrievalAllowed true but no URL', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      makeMockBaseClient(null),
      { liveRetrievalAllowed: true }, // no URL
    );
    expect(content).toContain('live_status_reason: no_url');
  });

  it('contains verified_live_context_injected: false with no URL', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      makeMockBaseClient(null),
      { liveRetrievalAllowed: true },
    );
    expect(content).toContain('verified_live_context_injected: false');
  });

  it('contains no-browse instruction with no URL', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      makeMockBaseClient(null),
      { liveRetrievalAllowed: true },
    );
    expect(content).toContain('Do not claim that you can browse, search, fetch, or verify information online');
  });
});

// ─── Section 12 — buildV4SessionStartContentAsync: allowlist blocked ──────────

describe('Phase 6b — buildV4SessionStartContentAsync for V4 blocked by allowlist', () => {
  it('contains no verified live context when URL is not on allowlist', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      makeMockBaseClient({ content: 'some content' }),
      { liveRetrievalAllowed: true, liveRetrievalUrl: 'https://evil.attacker.com/page' },
    );
    expect(content).toContain('verified_live_context_injected: false');
  });

  it('contains no-browse instruction when URL is not on allowlist', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      makeMockBaseClient({ content: 'some content' }),
      { liveRetrievalAllowed: true, liveRetrievalUrl: 'https://evil.attacker.com/page' },
    );
    expect(content).toContain('Do not claim that you can browse, search, fetch, or verify information online');
    expect(content).toContain('Do not offer to perform a future search.');
  });
});

// ─── Section 13 — buildV4SessionStartContentAsync: backend unavailable ────────

describe('Phase 6b — buildV4SessionStartContentAsync for V4 backend unavailable', () => {
  it('contains no verified live context when backend returns null', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      makeMockBaseClient(null), // backend unavailable
      { liveRetrievalAllowed: true, liveRetrievalUrl: 'https://nimh.nih.gov/page' },
    );
    expect(content).toContain('verified_live_context_injected: false');
  });

  it('contains no-browse instruction when backend is unavailable', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      makeMockBaseClient(null),
      { liveRetrievalAllowed: true, liveRetrievalUrl: 'https://nimh.nih.gov/page' },
    );
    expect(content).toContain('Do not claim that you can browse, search, fetch, or verify information online');
    expect(content).toContain('Do not offer to perform a future search.');
  });
});

// ─── Section 14 — buildV4SessionStartContentAsync: valid injected live item ───

describe('Phase 6b — buildV4SessionStartContentAsync for V4 with valid injected live item', () => {
  it('contains verified_live_context_injected: true when live item is injected', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      makeMockBaseClient({ content: 'CBT techniques for anxiety.' }),
      {
        liveRetrievalAllowed: true,
        liveRetrievalUrl: 'https://nimh.nih.gov/health/topics/anxiety',
      },
    );
    expect(content).toContain('verified_live_context_injected: true');
  });

  it('contains live_status_reason: injected when live item is present', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      makeMockBaseClient({ content: 'CBT techniques for anxiety.' }),
      {
        liveRetrievalAllowed: true,
        liveRetrievalUrl: 'https://nimh.nih.gov/health/topics/anxiety',
      },
    );
    expect(content).toContain('live_status_reason: injected');
  });

  it('contains use-only-supplied instruction when live item is injected', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      makeMockBaseClient({ content: 'CBT techniques for anxiety.' }),
      {
        liveRetrievalAllowed: true,
        liveRetrievalUrl: 'https://nimh.nih.gov/health/topics/anxiety',
      },
    );
    expect(content).toContain('Use only the supplied live context.');
  });

  it('still prohibits general browsing claims even with live item injected', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      makeMockBaseClient({ content: 'CBT techniques for anxiety.' }),
      {
        liveRetrievalAllowed: true,
        liveRetrievalUrl: 'https://nimh.nih.gov/health/topics/anxiety',
      },
    );
    expect(content).toContain('Do not claim general or ongoing browsing capability.');
  });

  it('prohibits promising future live retrieval even with live item injected', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      makeMockBaseClient({ content: 'CBT techniques for anxiety.' }),
      {
        liveRetrievalAllowed: true,
        liveRetrievalUrl: 'https://nimh.nih.gov/health/topics/anxiety',
      },
    );
    expect(content).toContain('Do not promise to retrieve additional live information during later turns');
  });

  it('still contains the injected live content in the LIVE RETRIEVED CONTEXT section', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      makeMockBaseClient({ content: 'CBT techniques for anxiety.' }),
      {
        liveRetrievalAllowed: true,
        liveRetrievalUrl: 'https://nimh.nih.gov/health/topics/anxiety',
      },
    );
    expect(content).toContain('LIVE RETRIEVED CONTEXT');
    expect(content).toContain('CBT techniques for anxiety.');
  });
});

// ─── Section 15 — V3 and earlier paths: runtime status NOT injected ───────────

describe('Phase 6b — V3 and earlier paths are byte-for-byte unchanged', () => {
  const nonV4Wirings = [
    ['HYBRID', CBT_THERAPIST_WIRING_HYBRID],
    ['V1', CBT_THERAPIST_WIRING_STAGE2_V1],
    ['V2', CBT_THERAPIST_WIRING_STAGE2_V2],
    ['V3', CBT_THERAPIST_WIRING_STAGE2_V3],
  ];

  nonV4Wirings.forEach(([name, wiring]) => {
    it(`${name} wiring: buildV4SessionStartContentAsync does NOT inject runtime status block`, async () => {
      const content = await buildV4SessionStartContentAsync(
        wiring,
        makeEmptyEntities(),
        null,
      );
      expect(content).not.toContain('V4 LIVE RETRIEVAL RUNTIME STATUS');
    });

    it(`${name} wiring: buildV4SessionStartContentAsync result matches buildV3SessionStartContentAsync`, async () => {
      const v4Content = await buildV4SessionStartContentAsync(
        wiring,
        makeEmptyEntities(),
        null,
      );
      const v3Content = await buildV3SessionStartContentAsync(
        wiring,
        makeEmptyEntities(),
      );
      expect(v4Content).toBe(v3Content);
    });
  });

  it('HYBRID wiring: result is exactly [START_SESSION]', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_HYBRID,
      makeEmptyEntities(),
      null,
    );
    expect(content).toBe('[START_SESSION]');
  });
});

// ─── Section 16 — Phase 6 existing invariants preserved ──────────────────────

describe('Phase 6b — Phase 6 existing invariants preserved', () => {
  it('buildV4SessionStartContentAsync for V4 still starts with [START_SESSION]', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      null,
    );
    expect(content.startsWith('[START_SESSION]')).toBe(true);
  });

  it('buildV4SessionStartContentAsync for V4 still contains LIVE_RETRIEVAL_POLICY_INSTRUCTIONS', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      null,
    );
    expect(content).toContain(LIVE_RETRIEVAL_POLICY_INSTRUCTIONS);
  });

  it('getLiveRetrievalContextForWiring still returns LIVE_RETRIEVAL_POLICY_INSTRUCTIONS for V4', () => {
    expect(getLiveRetrievalContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V4))
      .toBe(LIVE_RETRIEVAL_POLICY_INSTRUCTIONS);
  });

  it('getLiveRetrievalContextForWiring still returns null for HYBRID', () => {
    expect(getLiveRetrievalContextForWiring(CBT_THERAPIST_WIRING_HYBRID)).toBeNull();
  });

  it('runtime status block appears AFTER LIVE_RETRIEVAL_POLICY_INSTRUCTIONS in the content', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      null,
    );
    const policyIdx = content.indexOf('=== LIVE RETRIEVAL POLICY');
    const statusIdx = content.indexOf('=== V4 LIVE RETRIEVAL RUNTIME STATUS ===');
    expect(policyIdx).toBeGreaterThanOrEqual(0);
    expect(statusIdx).toBeGreaterThanOrEqual(0);
    expect(statusIdx).toBeGreaterThan(policyIdx);
  });
});
