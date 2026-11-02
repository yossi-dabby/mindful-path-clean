/**
 * @file test/utils/therapistRetrievalPhase6.test.js
 *
 * Phase 6 — Live Retrieval Wrapper + Allowlist Enforcement
 *
 * PURPOSE
 * -------
 *  1. Verify that liveRetrievalAllowlist.js exports the required constants and
 *     functions.
 *  2. Verify that technical allowlist enforcement exists in code — not only in
 *     prompt instructions.
 *  3. Verify that extractDomain correctly handles HTTPS URLs, HTTP URLs, and
 *     malformed inputs.
 *  4. Verify that isAllowedDomain correctly approves allowlisted domains.
 *  5. Verify that isAllowedDomain correctly blocks non-allowlisted domains.
 *  6. Verify that isAllowedDomain blocks HTTP URLs (HTTPS-only policy).
 *  7. Verify that isAllowedDomain is fail-closed for null / undefined / empty.
 *  8. Verify that validateLiveRetrievalRequest returns { allowed: false } for
 *     missing, null, and malformed requests.
 *  9. Verify that validateLiveRetrievalRequest returns { allowed: true } for a
 *     valid HTTPS URL on the allowlist.
 * 10. Verify that validateLiveRetrievalRequest returns { allowed: false } for a
 *     valid HTTPS URL NOT on the allowlist (domain_not_allowlisted).
 * 11. Verify that logAllowlistRejection emits a structured console.warn.
 * 12. Verify that liveRetrievalWrapper.js exports the required constants and
 *     functions.
 * 13. Verify that LIVE_RETRIEVAL_POLICY_INSTRUCTIONS is a non-empty string that
 *     mentions Phase 6 and live retrieval.
 * 14. Verify that executeLiveRetrieval returns blocked: true for a
 *     non-allowlisted URL (no backend call made).
 * 15. Verify that executeLiveRetrieval returns blocked: true for a missing URL.
 * 16. Verify that executeLiveRetrieval returns blocked: true when base client
 *     is null and a non-allowlisted URL is given.
 * 17. Verify that executeLiveRetrieval returns blocked: false + items: [] when
 *     the allowlist passes but backend is unavailable (no baseClient).
 * 18. Verify that executeLiveRetrieval never throws (always returns a result).
 * 19. Verify that buildLiveContextSection returns '' for empty items.
 * 20. Verify that buildLiveContextSection includes the provenance tag and
 *     content for a valid live item.
 * 21. Verify that buildLiveContextSection respects MAX_LIVE_KNOWLEDGE_ITEMS bound.
 * 22. Verify that buildLiveContextSection rejects items with wrong source_type.
 * 23. Verify that v4RetrievalExecutor.js exports executeV4BoundedRetrieval.
 * 24. Verify that executeV4BoundedRetrieval with liveRetrievalAllowed: false
 *     returns live_skipped: true with reason 'flag_off'.
 * 25. Verify that executeV4BoundedRetrieval with no entities returns empty V3
 *     result + live_skipped.
 * 26. Verify that internal sufficiency check skips live retrieval when internal
 *     sources return >= INTERNAL_SUFFICIENCY_MIN_ITEMS items.
 * 27. Verify that internal sufficiency check ALLOWS live retrieval when internal
 *     sources return < INTERNAL_SUFFICIENCY_MIN_ITEMS items.
 * 28. Verify that executeV4BoundedRetrieval with missing URL returns live_skipped:
 *     true with reason 'no_url'.
 * 29. Verify that executeV4BoundedRetrieval with no baseClient returns live_skipped:
 *     true with reason 'no_client'.
 * 30. Verify that executeV4BoundedRetrieval result includes V3 items alongside
 *     any live items.
 * 31. Verify that CBT_THERAPIST_WIRING_STAGE2_V4 exists with the correct flags.
 * 32. Verify that CBT_THERAPIST_WIRING_STAGE2_V4 has stage2_phase: 6.
 * 33. Verify that CBT_THERAPIST_WIRING_STAGE2_V4 has live_retrieval_enabled: true.
 * 34. Verify that CBT_THERAPIST_WIRING_STAGE2_V4 has retrieval_orchestration_enabled: true.
 * 35. Verify that V4 entity tool_configs are identical to V3 (no new entity access).
 * 36. Verify that THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED flag is still false.
 * 37. Verify that ACTIVE_CBT_THERAPIST_WIRING is still CBT_THERAPIST_WIRING_HYBRID.
 * 38. Verify that resolveTherapistWiring returns HYBRID when all flags are off.
 * 39. Verify that resolveTherapistWiring evaluates the Phase 6 flag BEFORE Phase 5.
 * 40. Verify that getLiveRetrievalContextForWiring returns null for HYBRID, V1,
 *     V2, V3.
 * 41. Verify that getLiveRetrievalContextForWiring returns
 *     LIVE_RETRIEVAL_POLICY_INSTRUCTIONS for V4.
 * 42. Verify that buildV4SessionStartContentAsync for HYBRID returns exactly
 *     '[START_SESSION]' (default path unchanged).
 * 43. Verify that buildV4SessionStartContentAsync for V3 returns the same result
 *     as buildV3SessionStartContentAsync.
 * 44. Verify that buildV4SessionStartContentAsync for V4 starts with '[START_SESSION]'.
 * 45. Verify that buildV4SessionStartContentAsync for V4 contains
 *     LIVE_RETRIEVAL_POLICY_INSTRUCTIONS.
 * 46. Verify that Phase 5 RETRIEVAL_SOURCE_ORDER is unchanged (still 4 entries).
 * 47. Verify that Phase 5 RETRIEVAL_ORCHESTRATION_INSTRUCTIONS is unchanged
 *     (does not mention live retrieval).
 * 48. Verify that retrievalOrchestrator.js source code does not import from
 *     liveRetrievalWrapper.
 * 49. Verify that retrievalConfig.js does not contain LIVE_KNOWLEDGE in
 *     RETRIEVAL_SOURCE_TYPES (isolation preserved).
 * 50. Verify that rollback remains safe (flag-off → HYBRID, default unchanged).
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT enable any feature flags — all flags remain false throughout.
 * - All prior phase assertions remain intact (this test is additive only).
 * - Uses mock entity objects; no live entity calls are made.
 * - Uses mock base44 clients; no live backend calls are made.
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 6
 */

import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── Phase 6 — Allowlist module ─────────────────────────────────────────────────
import {
  LIVE_RETRIEVAL_ALLOWLIST_VERSION,
  LIVE_RETRIEVAL_ALLOWED_DOMAINS,
  extractDomain,
  isAllowedDomain,
  validateLiveRetrievalRequest,
  logAllowlistRejection,
} from '../../src/lib/liveRetrievalAllowlist.js';

// ── Phase 6 — Live retrieval wrapper ──────────────────────────────────────────
import {
  LIVE_RETRIEVAL_WRAPPER_VERSION,
  LIVE_RETRIEVAL_POLICY_INSTRUCTIONS,
  LIVE_KNOWLEDGE_SOURCE_TYPE,
  executeLiveRetrieval,
  buildLiveContextSection,
} from '../../src/lib/liveRetrievalWrapper.js';

// ── Phase 6 — V4 retrieval executor ───────────────────────────────────────────
import {
  V4_RETRIEVAL_EXECUTOR_VERSION,
  executeV4BoundedRetrieval,
} from '../../src/lib/v4RetrievalExecutor.js';

// ── Phase 6 — V4 wiring ────────────────────────────────────────────────────────
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V1,
  CBT_THERAPIST_WIRING_STAGE2_V2,
  CBT_THERAPIST_WIRING_STAGE2_V3,
  CBT_THERAPIST_WIRING_STAGE2_V4,
} from '../../src/api/agentWiring.js';

// ── Active wiring ──────────────────────────────────────────────────────────────
import {
  ACTIVE_CBT_THERAPIST_WIRING,
  resolveTherapistWiring,
} from '../../src/api/activeAgentWiring.js';

// ── Injector (Phase 6 extended) ────────────────────────────────────────────────
import {
  getLiveRetrievalContextForWiring,
  buildV4SessionStartContentAsync,
  buildV3SessionStartContentAsync,
  buildSessionStartContent,
} from '../../src/lib/workflowContextInjector.js';

// ── Feature flags ──────────────────────────────────────────────────────────────
import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

// ── Phase 5 — Retrieval config (to verify Phase 5 isolation) ──────────────────
import {
  RETRIEVAL_SOURCE_ORDER,
  RETRIEVAL_SOURCE_TYPES,
  RETRIEVAL_CONFIG,
} from '../../src/lib/retrievalConfig.js';

// ── Phase 5 — Orchestration instructions (to verify isolation) ────────────────
import {
  RETRIEVAL_ORCHESTRATION_INSTRUCTIONS,
} from '../../src/lib/retrievalOrchestrator.js';

// ── Phase 5.1 memory model (for mock records) ─────────────────────────────────
import {
  THERAPIST_MEMORY_VERSION_KEY,
  THERAPIST_MEMORY_VERSION,
} from '../../src/lib/therapistMemoryModel.js';

// ─── Mock entity helpers ──────────────────────────────────────────────────────

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

function makeMockMemoryRecord(sessionDate = '2024-01-15', summary = 'CBT work') {
  return {
    id: `mem-${sessionDate}`,
    content: JSON.stringify({
      [THERAPIST_MEMORY_VERSION_KEY]: THERAPIST_MEMORY_VERSION,
      session_date: sessionDate,
      session_summary: summary,
      core_patterns: ['avoidance'],
      follow_up_tasks: ['thought record'],
    }),
  };
}

/** Creates a mock base44 client with a stub functions.invoke */
function makeMockBaseClient(invokeReturnValue = null) {
  return {
    functions: {
      invoke: vi.fn(async () => invokeReturnValue),
    },
  };
}

/** Creates entities that return enough items to trigger internal sufficiency */
function makeSufficientEntities(itemCount = 4) {
  const memories = Array.from({ length: itemCount }, (_, i) =>
    makeMockMemoryRecord(`2024-0${(i % 9) + 1}-01`, `Summary ${i}`),
  );
  return {
    CompanionMemory: { list: async () => memories },
    Goal: { filter: async () => [] },
    SessionSummary: { list: async () => [] },
    Exercise: { list: async () => [] },
    Resource: { list: async () => [] },
    ExternalKnowledgeChunk: { list: async () => [] },
  };
}

// ─── Section 1 — liveRetrievalAllowlist.js exports ────────────────────────────

describe('Phase 6 — liveRetrievalAllowlist.js exports', () => {
  it('LIVE_RETRIEVAL_ALLOWLIST_VERSION is exported as a string', () => {
    expect(typeof LIVE_RETRIEVAL_ALLOWLIST_VERSION).toBe('string');
    expect(LIVE_RETRIEVAL_ALLOWLIST_VERSION.length).toBeGreaterThan(0);
  });

  it('LIVE_RETRIEVAL_ALLOWED_DOMAINS is a frozen non-empty array', () => {
    expect(Array.isArray(LIVE_RETRIEVAL_ALLOWED_DOMAINS)).toBe(true);
    expect(Object.isFrozen(LIVE_RETRIEVAL_ALLOWED_DOMAINS)).toBe(true);
    expect(LIVE_RETRIEVAL_ALLOWED_DOMAINS.length).toBeGreaterThan(0);
  });

  it('LIVE_RETRIEVAL_ALLOWED_DOMAINS contains the required clinical authority domains', () => {
    expect(LIVE_RETRIEVAL_ALLOWED_DOMAINS).toContain('nimh.nih.gov');
    expect(LIVE_RETRIEVAL_ALLOWED_DOMAINS).toContain('who.int');
    expect(LIVE_RETRIEVAL_ALLOWED_DOMAINS).toContain('samhsa.gov');
    expect(LIVE_RETRIEVAL_ALLOWED_DOMAINS).toContain('nice.org.uk');
    expect(LIVE_RETRIEVAL_ALLOWED_DOMAINS).toContain('medlineplus.gov');
    expect(LIVE_RETRIEVAL_ALLOWED_DOMAINS).toContain('psychiatry.org');
    expect(LIVE_RETRIEVAL_ALLOWED_DOMAINS).toContain('cssrs.columbia.edu');
  });

  it('extractDomain is exported as a function', () => {
    expect(typeof extractDomain).toBe('function');
  });

  it('isAllowedDomain is exported as a function', () => {
    expect(typeof isAllowedDomain).toBe('function');
  });

  it('validateLiveRetrievalRequest is exported as a function', () => {
    expect(typeof validateLiveRetrievalRequest).toBe('function');
  });

  it('logAllowlistRejection is exported as a function', () => {
    expect(typeof logAllowlistRejection).toBe('function');
  });
});

// ─── Section 2 — extractDomain ────────────────────────────────────────────────

describe('Phase 6 — extractDomain: HTTPS URL handling', () => {
  it('extracts hostname from a simple HTTPS URL', () => {
    expect(extractDomain('https://nimh.nih.gov/health')).toBe('nimh.nih.gov');
  });

  it('strips www. prefix', () => {
    expect(extractDomain('https://www.who.int/mental-health')).toBe('who.int');
  });

  it('lowercases the hostname', () => {
    expect(extractDomain('https://NIMH.NIH.GOV/health')).toBe('nimh.nih.gov');
  });

  it('preserves sub-domains beyond www', () => {
    expect(extractDomain('https://library.samhsa.gov/resource')).toBe('library.samhsa.gov');
  });

  it('returns null for HTTP URL (non-HTTPS)', () => {
    expect(extractDomain('http://nimh.nih.gov/health')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractDomain('')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(extractDomain(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(extractDomain(undefined)).toBeNull();
  });

  it('returns null for a non-URL string', () => {
    expect(extractDomain('not a url')).toBeNull();
  });

  it('returns null for a number', () => {
    expect(extractDomain(42)).toBeNull();
  });
});

// ─── Section 3 — isAllowedDomain: technical enforcement ──────────────────────

describe('Phase 6 — isAllowedDomain: technical allowlist enforcement', () => {
  it('approves exact matches for all listed domains', () => {
    for (const domain of LIVE_RETRIEVAL_ALLOWED_DOMAINS) {
      expect(
        isAllowedDomain(`https://${domain}/page`),
        `Expected https://${domain}/page to be approved`,
      ).toBe(true);
    }
  });

  it('approves sub-domains of listed domains', () => {
    expect(isAllowedDomain('https://library.samhsa.gov/resource')).toBe(true);
    expect(isAllowedDomain('https://healthquality.va.gov/guidelines')).toBe(true);
  });

  it('blocks a clearly non-allowlisted domain', () => {
    expect(isAllowedDomain('https://example.com/page')).toBe(false);
  });

  it('blocks a domain that looks similar but is not listed', () => {
    // Partial domain match must not be allowed (suffix attack prevention)
    expect(isAllowedDomain('https://evil-nimh.nih.gov.attacker.com/page')).toBe(false);
    expect(isAllowedDomain('https://fake-who.int/page')).toBe(false);
  });

  it('blocks HTTP (non-HTTPS) even for allowlisted domains', () => {
    expect(isAllowedDomain('http://nimh.nih.gov/page')).toBe(false);
  });

  it('is fail-closed for null', () => {
    expect(isAllowedDomain(null)).toBe(false);
  });

  it('is fail-closed for undefined', () => {
    expect(isAllowedDomain(undefined)).toBe(false);
  });

  it('is fail-closed for an empty string', () => {
    expect(isAllowedDomain('')).toBe(false);
  });

  it('is fail-closed for a malformed URL', () => {
    expect(isAllowedDomain('nimh.nih.gov')).toBe(false); // Missing protocol
    expect(isAllowedDomain('ftp://nimh.nih.gov/page')).toBe(false); // Wrong protocol
  });

  it('enforcement is code-level not prompt-level: a non-string value is blocked', () => {
    // Technical enforcement: the function itself blocks non-strings at the code level
    expect(isAllowedDomain({ url: 'https://nimh.nih.gov' })).toBe(false);
    expect(isAllowedDomain(42)).toBe(false);
  });
});

// ─── Section 4 — validateLiveRetrievalRequest ─────────────────────────────────

describe('Phase 6 — validateLiveRetrievalRequest: fail-closed validation', () => {
  it('returns allowed:false for null request', () => {
    const result = validateLiveRetrievalRequest(null);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('missing_request');
  });

  it('returns allowed:false for undefined request', () => {
    const result = validateLiveRetrievalRequest(undefined);
    expect(result.allowed).toBe(false);
  });

  it('returns allowed:false for request with missing url', () => {
    const result = validateLiveRetrievalRequest({});
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('missing_url');
  });

  it('returns allowed:false for request with empty url', () => {
    const result = validateLiveRetrievalRequest({ url: '' });
    expect(result.allowed).toBe(false);
  });

  it('returns allowed:false for HTTP URL', () => {
    const result = validateLiveRetrievalRequest({ url: 'http://nimh.nih.gov/page' });
    expect(result.allowed).toBe(false);
  });

  it('returns allowed:false for a non-allowlisted domain', () => {
    const result = validateLiveRetrievalRequest({ url: 'https://example.com/page' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('domain_not_allowlisted');
    expect(result.domain).toBe('example.com');
    expect(result.normalizedUrl).toBeNull();
  });

  it('returns allowed:true for a valid HTTPS URL on the allowlist', () => {
    const result = validateLiveRetrievalRequest({ url: 'https://nimh.nih.gov/health/topics/anxiety-disorders' });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('allowlisted');
    expect(result.domain).toBe('nimh.nih.gov');
    expect(result.normalizedUrl).toBe('https://nimh.nih.gov/health/topics/anxiety-disorders');
  });

  it('returns allowed:true for a sub-domain URL on the allowlist', () => {
    const result = validateLiveRetrievalRequest({ url: 'https://library.samhsa.gov/resource/CBT-guide' });
    expect(result.allowed).toBe(true);
    expect(result.domain).toBe('library.samhsa.gov');
  });
});

// ─── Section 5 — logAllowlistRejection ───────────────────────────────────────

describe('Phase 6 — logAllowlistRejection: safe rejection logging', () => {
  it('emits a console.warn for a rejection', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logAllowlistRejection({ url: 'https://example.com/page' }, 'domain_not_allowlisted');
    expect(spy).toHaveBeenCalled();
    const callArg = spy.mock.calls[0];
    expect(callArg[0]).toContain('[LiveRetrievalAllowlist]');
    spy.mockRestore();
  });

  it('does not throw for null request', () => {
    expect(() => logAllowlistRejection(null, 'missing_request')).not.toThrow();
  });

  it('does not throw for undefined request', () => {
    expect(() => logAllowlistRejection(undefined, 'missing_url')).not.toThrow();
  });

  it('does not include the full URL in the log (privacy — only domain)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sensitiveUrl = 'https://example.com/sensitive/path?token=abc';
    logAllowlistRejection({ url: sensitiveUrl }, 'domain_not_allowlisted');
    const loggedString = JSON.stringify(spy.mock.calls);
    // The full URL with token must not be in the log
    expect(loggedString).not.toContain('token=abc');
    expect(loggedString).not.toContain('/sensitive/path');
    spy.mockRestore();
  });
});

// ─── Section 6 — liveRetrievalWrapper.js exports ─────────────────────────────

describe('Phase 6 — liveRetrievalWrapper.js exports', () => {
  it('LIVE_RETRIEVAL_WRAPPER_VERSION is exported as a string', () => {
    expect(typeof LIVE_RETRIEVAL_WRAPPER_VERSION).toBe('string');
    expect(LIVE_RETRIEVAL_WRAPPER_VERSION.length).toBeGreaterThan(0);
  });

  it('LIVE_RETRIEVAL_POLICY_INSTRUCTIONS is a non-empty string', () => {
    expect(typeof LIVE_RETRIEVAL_POLICY_INSTRUCTIONS).toBe('string');
    expect(LIVE_RETRIEVAL_POLICY_INSTRUCTIONS.length).toBeGreaterThan(0);
  });

  it('LIVE_RETRIEVAL_POLICY_INSTRUCTIONS mentions Phase 6', () => {
    expect(LIVE_RETRIEVAL_POLICY_INSTRUCTIONS).toContain('PHASE 6');
  });

  it('LIVE_RETRIEVAL_POLICY_INSTRUCTIONS mentions live retrieval policy', () => {
    expect(LIVE_RETRIEVAL_POLICY_INSTRUCTIONS.toUpperCase()).toContain('LIVE RETRIEVAL');
  });

  it('LIVE_RETRIEVAL_POLICY_INSTRUCTIONS states safety takes strict precedence', () => {
    expect(LIVE_RETRIEVAL_POLICY_INSTRUCTIONS.toUpperCase()).toContain('SAFETY');
  });

  it('LIVE_KNOWLEDGE_SOURCE_TYPE is exported as "live_knowledge"', () => {
    expect(LIVE_KNOWLEDGE_SOURCE_TYPE).toBe('live_knowledge');
  });

  it('executeLiveRetrieval is exported as a function', () => {
    expect(typeof executeLiveRetrieval).toBe('function');
  });

  it('buildLiveContextSection is exported as a function', () => {
    expect(typeof buildLiveContextSection).toBe('function');
  });
});

// ─── Section 7 — executeLiveRetrieval: fail-closed and allowlist gating ───────

describe('Phase 6 — executeLiveRetrieval: allowlist enforcement and fail-closed', () => {
  it('returns blocked:true for a null request', async () => {
    const result = await executeLiveRetrieval(null, null);
    expect(result.blocked).toBe(true);
    expect(result.items).toEqual([]);
  });

  it('returns blocked:true for a missing URL', async () => {
    const result = await executeLiveRetrieval({}, null);
    expect(result.blocked).toBe(true);
    expect(result.items).toEqual([]);
  });

  it('returns blocked:true for a non-allowlisted domain', async () => {
    const result = await executeLiveRetrieval({ url: 'https://example.com/page' }, null);
    expect(result.blocked).toBe(true);
    expect(result.items).toEqual([]);
    expect(result.reason).toBe('domain_not_allowlisted');
  });

  it('returns blocked:true for an HTTP URL', async () => {
    const result = await executeLiveRetrieval({ url: 'http://nimh.nih.gov/page' }, null);
    expect(result.blocked).toBe(true);
    expect(result.items).toEqual([]);
  });

  it('returns blocked:false + items:[] when allowlisted but baseClient is null', async () => {
    // Allowlist passes but no backend client → fail gracefully (not blocked)
    const result = await executeLiveRetrieval(
      { url: 'https://nimh.nih.gov/health/topics/depression' },
      null,
    );
    expect(result.blocked).toBe(false);
    expect(result.items).toEqual([]);
    expect(result.domain).toBe('nimh.nih.gov');
    expect(['backend_unavailable', 'backend_invocation_error']).toContain(result.reason);
  });

  it('returns blocked:false + items:[] when backend invoke returns null', async () => {
    const client = makeMockBaseClient(null);
    const result = await executeLiveRetrieval(
      { url: 'https://who.int/mental-health' },
      client,
    );
    expect(result.blocked).toBe(false);
    expect(result.items).toEqual([]);
  });

  it('returns items when backend returns valid content', async () => {
    const client = makeMockBaseClient({ content: 'Depression is a common mental health disorder.' });
    const result = await executeLiveRetrieval(
      { url: 'https://nimh.nih.gov/health/topics/depression' },
      client,
    );
    expect(result.blocked).toBe(false);
    expect(result.items.length).toBe(1);
    expect(result.items[0].source_type).toBe('live_knowledge');
    expect(result.items[0].source_id).toBe('https://nimh.nih.gov/health/topics/depression');
    expect(result.items[0].entity_name).toBe('nimh.nih.gov');
    expect(result.items[0].content).toContain('Depression');
  });

  it('truncates backend content to MAX_LIVE_CONTENT_CHARS', async () => {
    const longContent = 'A'.repeat(1000);
    const client = makeMockBaseClient({ content: longContent });
    const result = await executeLiveRetrieval(
      { url: 'https://nimh.nih.gov/health/topics/depression' },
      client,
    );
    expect(result.items[0].content.length).toBeLessThanOrEqual(300);
  });

  it('returns blocked:false + items:[] when backend returns { blocked: true }', async () => {
    const client = makeMockBaseClient({ blocked: true, reason: 'flag_off' });
    const result = await executeLiveRetrieval(
      { url: 'https://nimh.nih.gov/health' },
      client,
    );
    expect(result.items).toEqual([]);
  });

  it('never throws — always returns a structured result', async () => {
    // Throw from the backend function
    const throwingClient = {
      functions: { invoke: async () => { throw new Error('unexpected'); } },
    };
    const result = await executeLiveRetrieval(
      { url: 'https://nimh.nih.gov/health' },
      throwingClient,
    );
    expect(typeof result).toBe('object');
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.blocked).toBe('boolean');
  });
});

// ─── Section 8 — buildLiveContextSection ──────────────────────────────────────

describe('Phase 6 — buildLiveContextSection: bounded live context assembly', () => {
  it('returns empty string for empty items array', () => {
    expect(buildLiveContextSection([])).toBe('');
  });

  it('returns empty string for null', () => {
    expect(buildLiveContextSection(null)).toBe('');
  });

  it('builds a section for a valid live item', () => {
    const items = [{
      source_type: LIVE_KNOWLEDGE_SOURCE_TYPE,
      content: 'CBT is effective for depression.',
      source_id: 'https://nimh.nih.gov/depression',
      entity_name: 'nimh.nih.gov',
    }];
    const section = buildLiveContextSection(items);
    expect(section).toContain('LIVE RETRIEVED CONTEXT');
    expect(section).toContain('[live_knowledge:https://nimh.nih.gov/depression]');
    expect(section).toContain('CBT is effective for depression.');
  });

  it('rejects items with wrong source_type', () => {
    const items = [{
      source_type: 'internal_knowledge', // Not live_knowledge
      content: 'Some internal content',
      source_id: 'https://nimh.nih.gov/page',
      entity_name: 'nimh.nih.gov',
    }];
    expect(buildLiveContextSection(items)).toBe('');
  });

  it('respects MAX_LIVE_KNOWLEDGE_ITEMS bound', () => {
    const maxItems = RETRIEVAL_CONFIG.MAX_LIVE_KNOWLEDGE_ITEMS;
    const items = Array.from({ length: maxItems + 5 }, (_, i) => ({
      source_type: LIVE_KNOWLEDGE_SOURCE_TYPE,
      content: `Content ${i}`,
      source_id: `https://nimh.nih.gov/page-${i}`,
      entity_name: 'nimh.nih.gov',
    }));
    const section = buildLiveContextSection(items);
    // Count occurrences of [live_knowledge: prefix
    const occurrences = (section.match(/\[live_knowledge:/g) || []).length;
    expect(occurrences).toBeLessThanOrEqual(maxItems);
  });
});

// ─── Section 9 — v4RetrievalExecutor.js ──────────────────────────────────────

describe('Phase 6 — v4RetrievalExecutor.js exports', () => {
  it('V4_RETRIEVAL_EXECUTOR_VERSION is exported as a string', () => {
    expect(typeof V4_RETRIEVAL_EXECUTOR_VERSION).toBe('string');
    expect(V4_RETRIEVAL_EXECUTOR_VERSION.length).toBeGreaterThan(0);
  });

  it('executeV4BoundedRetrieval is exported as a function', () => {
    expect(typeof executeV4BoundedRetrieval).toBe('function');
  });
});

// ─── Section 10 — executeV4BoundedRetrieval: flag gating ─────────────────────

describe('Phase 6 — executeV4BoundedRetrieval: flag-off skips live retrieval', () => {
  it('returns live_skipped:true with reason flag_off when liveRetrievalAllowed is false', async () => {
    const result = await executeV4BoundedRetrieval(
      makeEmptyEntities(),
      null,
      { liveRetrievalAllowed: false, liveRetrievalUrl: 'https://nimh.nih.gov/page' },
    );
    expect(result.live_skipped).toBe(true);
    expect(result.live_skip_reason).toBe('flag_off');
  });

  it('returns live_skipped:true when no options provided', async () => {
    const result = await executeV4BoundedRetrieval(makeEmptyEntities(), null);
    expect(result.live_skipped).toBe(true);
  });
});

// ─── Section 11 — executeV4BoundedRetrieval: internal sufficiency ─────────────

describe('Phase 6 — executeV4BoundedRetrieval: internal-first ordering preserved', () => {
  it('skips live retrieval when internal sources return sufficient items', async () => {
    // Sufficient entities return >= INTERNAL_SUFFICIENCY_MIN_ITEMS items from sources 1-3
    const entities = makeSufficientEntities(RETRIEVAL_CONFIG.INTERNAL_SUFFICIENCY_MIN_ITEMS + 1);
    const client = makeMockBaseClient({ content: 'Live content' });

    const result = await executeV4BoundedRetrieval(
      entities,
      client,
      {
        liveRetrievalAllowed: true,
        liveRetrievalUrl: 'https://nimh.nih.gov/page',
      },
    );

    expect(result.live_skipped).toBe(true);
    expect(result.live_skip_reason).toBe('internal_sufficient');
    // Live retrieval was not called
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it('attempts live retrieval when internal sources return insufficient items', async () => {
    // Empty entities: 0 items from internal sources (insufficient)
    const client = makeMockBaseClient({ content: 'Live content from NIMH.' });

    const result = await executeV4BoundedRetrieval(
      makeEmptyEntities(),
      client,
      {
        liveRetrievalAllowed: true,
        liveRetrievalUrl: 'https://nimh.nih.gov/health/topics/anxiety',
      },
    );

    expect(result.live_attempted).toBe(true);
    // Live invoke should have been called
    expect(client.functions.invoke).toHaveBeenCalledWith(
      'fetchLiveResource',
      expect.objectContaining({ url: 'https://nimh.nih.gov/health/topics/anxiety' }),
    );
  });

  it('does not call live retrieval before internal sources (ordering proof)', async () => {
    const callOrder = [];

    // Entities that record call order
    const orderedEntities = {
      CompanionMemory: {
        list: async () => {
          callOrder.push('therapist_memory');
          return [];
        },
      },
      Goal: {
        filter: async () => {
          callOrder.push('session_context_goals');
          return [];
        },
      },
      SessionSummary: {
        list: async () => {
          callOrder.push('session_context_summaries');
          return [];
        },
      },
      Exercise: {
        list: async () => {
          callOrder.push('internal_knowledge_exercises');
          return [];
        },
      },
      Resource: {
        list: async () => {
          callOrder.push('internal_knowledge_resources');
          return [];
        },
      },
      ExternalKnowledgeChunk: { list: async () => [] },
    };

    const client = makeMockBaseClient({ content: 'live content' });
    client.functions.invoke = vi.fn(async () => {
      callOrder.push('live_retrieval');
      return { content: 'live content' };
    });

    await executeV4BoundedRetrieval(
      orderedEntities,
      client,
      { liveRetrievalAllowed: true, liveRetrievalUrl: 'https://nimh.nih.gov/page' },
    );

    // All internal sources must appear before live_retrieval
    const liveIndex = callOrder.indexOf('live_retrieval');
    const memoryIndex = callOrder.indexOf('therapist_memory');

    // If live was called, it must be after internal sources
    if (liveIndex !== -1) {
      expect(memoryIndex).toBeGreaterThanOrEqual(0);
      expect(memoryIndex).toBeLessThan(liveIndex);
    }
  });
});

// ─── Section 12 — executeV4BoundedRetrieval: no-client and no-url ─────────────

describe('Phase 6 — executeV4BoundedRetrieval: missing client / URL conditions', () => {
  it('returns live_skipped:true with reason no_url when liveRetrievalUrl is missing', async () => {
    const result = await executeV4BoundedRetrieval(
      makeEmptyEntities(),
      makeMockBaseClient(),
      { liveRetrievalAllowed: true },
    );
    expect(result.live_skipped).toBe(true);
    expect(result.live_skip_reason).toBe('no_url');
  });

  it('returns live_skipped:true with reason no_client when baseClient is null', async () => {
    const result = await executeV4BoundedRetrieval(
      makeEmptyEntities(),
      null,
      { liveRetrievalAllowed: true, liveRetrievalUrl: 'https://nimh.nih.gov/page' },
    );
    expect(result.live_skipped).toBe(true);
    expect(result.live_skip_reason).toBe('no_client');
  });

  it('returns live_blocked:true for a non-allowlisted URL', async () => {
    const result = await executeV4BoundedRetrieval(
      makeEmptyEntities(),
      makeMockBaseClient(),
      { liveRetrievalAllowed: true, liveRetrievalUrl: 'https://example.com/page' },
    );
    expect(result.live_blocked).toBe(true);
  });
});

// ─── Section 13 — executeV4BoundedRetrieval: V3 items preserved ──────────────

describe('Phase 6 — executeV4BoundedRetrieval: V3 items included in result', () => {
  it('includes V3 items in the result alongside live items', async () => {
    const goalEntities = {
      ...makeEmptyEntities(),
      Goal: {
        filter: async () => [{ title: 'Reduce anxiety', status: 'active' }],
      },
    };

    const client = makeMockBaseClient({ content: 'NIMH content on anxiety.' });
    const result = await executeV4BoundedRetrieval(
      goalEntities,
      client,
      { liveRetrievalAllowed: true, liveRetrievalUrl: 'https://nimh.nih.gov/page' },
    );

    // Should have at least the goal item from V3
    const v3Items = result.items.filter((i) => i.source_type !== 'live_knowledge');
    expect(v3Items.length).toBeGreaterThan(0);
  });
});

// ─── Section 14 — CBT_THERAPIST_WIRING_STAGE2_V4 shape ───────────────────────

describe('Phase 6 — CBT_THERAPIST_WIRING_STAGE2_V4 shape', () => {
  it('V4 exists as a named export from agentWiring.js', () => {
    expect(typeof CBT_THERAPIST_WIRING_STAGE2_V4).toBe('object');
    expect(CBT_THERAPIST_WIRING_STAGE2_V4).not.toBeNull();
  });

  it('V4 has stage2: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V4.stage2).toBe(true);
  });

  it('V4 has stage2_phase: 6', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V4.stage2_phase).toBe(6);
  });

  it('V4 has live_retrieval_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V4.live_retrieval_enabled).toBe(true);
  });

  it('V4 has retrieval_orchestration_enabled: true (Phase 5 preserved)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V4.retrieval_orchestration_enabled).toBe(true);
  });

  it('V4 has workflow_context_injection: true (Phase 3 preserved)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V4.workflow_context_injection).toBe(true);
  });

  it('V4 has memory_context_injection: true (Phase 1 preserved)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V4.memory_context_injection).toBe(true);
  });

  it('V4 entity tool_configs are identical to V3 (no new entity access)', () => {
    const v3Configs = CBT_THERAPIST_WIRING_STAGE2_V3.tool_configs;
    const v4Configs = CBT_THERAPIST_WIRING_STAGE2_V4.tool_configs;
    // Same number of entity configs
    expect(v4Configs.length).toBe(v3Configs.length);
    // Same entity names in same positions
    for (let i = 0; i < v3Configs.length; i++) {
      expect(v4Configs[i].entity_name).toBe(v3Configs[i].entity_name);
      expect(v4Configs[i].access_level).toBe(v3Configs[i].access_level);
    }
  });

  it('V4 entity tool_configs do NOT include any live retrieval domain as an entity', () => {
    const entityNames = CBT_THERAPIST_WIRING_STAGE2_V4.tool_configs.map((c) => c.entity_name);
    // Live retrieval domains are external URLs, not entity names
    for (const domain of LIVE_RETRIEVAL_ALLOWED_DOMAINS) {
      expect(entityNames).not.toContain(domain);
    }
  });
});

// ─── Section 15 — Feature flags still off ────────────────────────────────────

describe('Phase 6 — feature flags still off', () => {
  it('THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED is false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled returns false for the allowlist wrapper flag', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED')).toBe(false);
  });

  it('all Stage 2 flags are still false', () => {
    for (const [name, value] of Object.entries(THERAPIST_UPGRADE_FLAGS)) {
      expect(value, `Flag "${name}" must still be false`).toBe(false);
    }
  });
});

// ─── Section 16 — Default therapist path unchanged ───────────────────────────

describe('Phase 6 — current therapist default path unchanged', () => {
  it('ACTIVE_CBT_THERAPIST_WIRING is still CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('resolveTherapistWiring returns HYBRID when all flags are off', () => {
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING.stage2 is still falsy', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.stage2).toBeFalsy();
  });

  it('HYBRID wiring has no live_retrieval_enabled flag', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.live_retrieval_enabled).toBeFalsy();
  });

  it('buildSessionStartContent returns unchanged default for the active wiring', () => {
    expect(buildSessionStartContent(ACTIVE_CBT_THERAPIST_WIRING)).toBe('[START_SESSION]');
  });

  it('getLiveRetrievalContextForWiring returns null for the active wiring', () => {
    expect(getLiveRetrievalContextForWiring(ACTIVE_CBT_THERAPIST_WIRING)).toBeNull();
  });
});

// ─── Section 17 — getLiveRetrievalContextForWiring ───────────────────────────

describe('Phase 6 — getLiveRetrievalContextForWiring gating', () => {
  it('returns null for HYBRID wiring', () => {
    expect(getLiveRetrievalContextForWiring(CBT_THERAPIST_WIRING_HYBRID)).toBeNull();
  });

  it('returns null for V1 wiring', () => {
    expect(getLiveRetrievalContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V1)).toBeNull();
  });

  it('returns null for V2 wiring', () => {
    expect(getLiveRetrievalContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V2)).toBeNull();
  });

  it('returns null for V3 wiring (Phase 5 path unchanged)', () => {
    expect(getLiveRetrievalContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V3)).toBeNull();
  });

  it('returns LIVE_RETRIEVAL_POLICY_INSTRUCTIONS for V4 wiring', () => {
    expect(getLiveRetrievalContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V4))
      .toBe(LIVE_RETRIEVAL_POLICY_INSTRUCTIONS);
  });

  it('returns null for null wiring', () => {
    expect(getLiveRetrievalContextForWiring(null)).toBeNull();
  });

  it('returns null for undefined wiring', () => {
    expect(getLiveRetrievalContextForWiring(undefined)).toBeNull();
  });
});

// ─── Section 18 — buildV4SessionStartContentAsync ────────────────────────────

describe('Phase 6 — buildV4SessionStartContentAsync for HYBRID (default unchanged)', () => {
  it('returns exactly [START_SESSION] for HYBRID wiring', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_HYBRID,
      makeEmptyEntities(),
      null,
    );
    expect(content).toBe('[START_SESSION]');
  });

  it('returns a Promise', () => {
    const result = buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_HYBRID,
      makeEmptyEntities(),
      null,
    );
    expect(result instanceof Promise).toBe(true);
  });
});

describe('Phase 6 — buildV4SessionStartContentAsync for V3 (Phase 5 preserved)', () => {
  it('returns the same result as buildV3SessionStartContentAsync for V3 wiring', async () => {
    const v4Content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V3,
      makeEmptyEntities(),
      null,
    );
    const v3Content = await buildV3SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V3,
      makeEmptyEntities(),
    );
    expect(v4Content).toBe(v3Content);
  });
});

describe('Phase 6 — buildV4SessionStartContentAsync for V4', () => {
  it('starts with [START_SESSION]', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      null,
    );
    expect(content.startsWith('[START_SESSION]')).toBe(true);
  });

  it('contains LIVE_RETRIEVAL_POLICY_INSTRUCTIONS', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      null,
    );
    expect(content).toContain(LIVE_RETRIEVAL_POLICY_INSTRUCTIONS);
  });

  it('does not contain live context section when live retrieval not allowed', async () => {
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      null,
      { liveRetrievalAllowed: false },
    );
    expect(content).not.toContain('LIVE RETRIEVED CONTEXT');
  });

  it('does not contain live context section when live retrieval returns no items', async () => {
    const client = makeMockBaseClient(null);
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      client,
      { liveRetrievalAllowed: true, liveRetrievalUrl: 'https://nimh.nih.gov/page' },
    );
    // No live content returned → no LIVE RETRIEVED CONTEXT section
    expect(content).not.toContain('LIVE RETRIEVED CONTEXT');
  });

  it('contains live context section when live retrieval returns items', async () => {
    const client = makeMockBaseClient({ content: 'CBT techniques for anxiety.' });
    const content = await buildV4SessionStartContentAsync(
      CBT_THERAPIST_WIRING_STAGE2_V4,
      makeEmptyEntities(),
      client,
      {
        liveRetrievalAllowed: true,
        liveRetrievalUrl: 'https://nimh.nih.gov/health/topics/anxiety',
      },
    );
    expect(content).toContain('LIVE RETRIEVED CONTEXT');
    expect(content).toContain('CBT techniques for anxiety.');
  });
});

// ─── Section 19 — resolveTherapistWiring: Phase 6 routing order ──────────────

describe('Phase 6 — resolveTherapistWiring: V4 flag evaluated before V3', () => {
  it('resolveTherapistWiring evaluates Phase 6 flag before Phase 5 flag', () => {
    const wiringFilePath = path.resolve(
      import.meta.url.replace('file://', '').replace(/[^/]+$/, ''),
      '../../src/api/activeAgentWiring.js',
    );
    const source = fs.readFileSync(wiringFilePath, 'utf8');
    const v4Idx = source.indexOf('THERAPIST_UPGRADE_ALLOWLIST_WRAPPER_ENABLED');
    const v3Idx = source.indexOf('THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED');
    const v2Idx = source.indexOf('THERAPIST_UPGRADE_WORKFLOW_ENABLED');
    expect(v4Idx).toBeGreaterThanOrEqual(0);
    expect(v3Idx).toBeGreaterThanOrEqual(0);
    expect(v2Idx).toBeGreaterThanOrEqual(0);
    // V4 check must appear before V3 check
    expect(v4Idx).toBeLessThan(v3Idx);
    // V3 check must still appear before V2 check (Phase 5 invariant preserved)
    expect(v3Idx).toBeLessThan(v2Idx);
  });
});

// ─── Section 20 — Phase 5 isolation preserved ─────────────────────────────────

describe('Phase 6 — Phase 5 isolation preserved', () => {
  it('RETRIEVAL_SOURCE_ORDER still has exactly 4 entries (Phase 5 invariant)', () => {
    expect(RETRIEVAL_SOURCE_ORDER).toHaveLength(4);
  });

  it('RETRIEVAL_SOURCE_ORDER does not include live_knowledge', () => {
    expect(RETRIEVAL_SOURCE_ORDER).not.toContain('live_knowledge');
  });

  it('RETRIEVAL_SOURCE_TYPES does not include LIVE_KNOWLEDGE', () => {
    expect(Object.keys(RETRIEVAL_SOURCE_TYPES)).not.toContain('LIVE_KNOWLEDGE');
    expect(Object.values(RETRIEVAL_SOURCE_TYPES)).not.toContain('live_knowledge');
  });

  it('RETRIEVAL_ORCHESTRATION_INSTRUCTIONS does not mention live retrieval (Phase 5 contract)', () => {
    const lower = RETRIEVAL_ORCHESTRATION_INSTRUCTIONS.toLowerCase();
    expect(lower).not.toContain('live retrieval');
    expect(lower).not.toContain('live web');
    expect(lower).not.toContain('allowlist');
  });

  it('retrievalOrchestrator.js source does not import from liveRetrievalWrapper', () => {
    const orchPath = path.resolve(
      import.meta.url.replace('file://', '').replace(/[^/]+$/, ''),
      '../../src/lib/retrievalOrchestrator.js',
    );
    const source = fs.readFileSync(orchPath, 'utf8');
    expect(source).not.toContain('liveRetrievalWrapper');
    expect(source).not.toContain('allowlistWrapper');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('live_knowledge');
  });

  it('retrievalConfig.js does not define LIVE_KNOWLEDGE source type', () => {
    const configPath = path.resolve(
      import.meta.url.replace('file://', '').replace(/[^/]+$/, ''),
      '../../src/lib/retrievalConfig.js',
    );
    const source = fs.readFileSync(configPath, 'utf8');
    expect(source).not.toContain('LIVE_KNOWLEDGE:');
    expect(source).not.toContain('live_knowledge');
  });
});

// ─── Section 21 — Rollback safety ─────────────────────────────────────────────

describe('Phase 6 — rollback safety', () => {
  it('all flags off → HYBRID wiring (rollback safe)', () => {
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('V4 wiring is not the active wiring (safely gated by flags)', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V4);
  });

  it('buildV4SessionStartContentAsync returns [START_SESSION] for the current active wiring', async () => {
    const content = await buildV4SessionStartContentAsync(
      ACTIVE_CBT_THERAPIST_WIRING,
      makeEmptyEntities(),
      null,
    );
    expect(content).toBe('[START_SESSION]');
  });

  it('LIVE_RETRIEVAL_POLICY_INSTRUCTIONS is not injected for HYBRID wiring', async () => {
    const content = await buildV4SessionStartContentAsync(
      ACTIVE_CBT_THERAPIST_WIRING,
      makeEmptyEntities(),
      null,
    );
    expect(content).not.toContain('LIVE RETRIEVAL POLICY');
  });
});
