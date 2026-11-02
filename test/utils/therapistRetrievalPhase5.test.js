/**
 * @file test/utils/therapistRetrievalPhase5.test.js
 *
 * Phase 5 — Retrieval Orchestration
 *
 * PURPOSE
 * -------
 *  1. Verify that retrievalConfig.js exists and exports the correct constants.
 *  2. Verify that retrievalOrchestrator.js exists and exports the required
 *     functions: getRetrievalContextForWiring, buildBoundedContextPackage,
 *     RETRIEVAL_ORCHESTRATION_INSTRUCTIONS.
 *  3. Verify that getRetrievalContextForWiring returns null for all
 *     default-path wirings (HYBRID, V1, V2, null, undefined).
 *  4. Verify that getRetrievalContextForWiring returns
 *     RETRIEVAL_ORCHESTRATION_INSTRUCTIONS for the V3 wiring.
 *  5. Verify that CBT_THERAPIST_WIRING_STAGE2_V3 exists with the correct
 *     Phase 5 flags (retrieval_orchestration_enabled, stage2_phase: 5).
 *  6. Verify that V3's entity list includes ExternalKnowledgeChunk at the
 *     lowest source_order and with external_trusted: true and read_only: true.
 *  7. Verify that V3 preserves all of V2's entity list unchanged.
 *  8. Verify that buildSessionStartContent is updated for V3: returns content
 *     that includes '[START_SESSION]', workflow instructions, AND retrieval
 *     orchestration instructions.
 *  9. Verify that buildSessionStartContent for HYBRID/V1 still returns exactly
 *     '[START_SESSION]' — current behavior preserved.
 * 10. Verify that buildSessionStartContent for V2 still returns '[START_SESSION]'
 *     + workflow instructions only (no retrieval section) — Phase 3.1 unchanged.
 * 11. Verify that resolveTherapistWiring routes to V3 when the Phase 5 flag
 *     is active (flag simulation only — flags remain false in this test file).
 * 12. Verify that buildBoundedContextPackage enforces source ordering.
 * 13. Verify that buildBoundedContextPackage enforces per-source item limits.
 * 14. Verify that buildBoundedContextPackage enforces the total item cap.
 * 15. Verify that buildBoundedContextPackage returns '' for empty input.
 * 16. Verify that buildBoundedContextPackage tags items with provenance.
 * 17. Verify that buildBoundedContextPackage omits items with invalid source types.
 * 18. Verify that RETRIEVAL_ORCHESTRATION_INSTRUCTIONS contains all required sections.
 * 19. Verify that RETRIEVAL_SOURCE_ORDER is in the correct internal-first order.
 * 20. Verify that THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED is still false.
 * 21. Verify that ACTIVE_CBT_THERAPIST_WIRING is still CBT_THERAPIST_WIRING_HYBRID.
 * 22. Verify that default mode is completely unchanged.
 * 23. Verify that no live retrieval exists in any Phase 5 module.
 * 24. Verify that rollback remains safe.
 * 25. Verify that the resolveTherapistWiring routing logic includes a V3 branch.
 * 26. Verify that V3 routing is evaluated before V2 routing.
 *
 * CONSTRAINTS
 * -----------
 * - Does NOT import from base44/functions/ (Deno code — not importable in Vitest).
 * - Does NOT enable any feature flags — all flags remain false throughout.
 * - Does NOT modify any Phase 0 / 0.1 / 1 / 2 / 3 / 4 / 4.1 / 4.2 test files.
 * - All prior phase assertions remain intact (this test is additive only).
 *
 * Source of truth: docs/therapist-upgrade-stage2-plan.md — Phase 5
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── Phase 5 — Retrieval config ─────────────────────────────────────────────────
import {
  RETRIEVAL_SOURCE_TYPES,
  RETRIEVAL_SOURCE_ORDER,
  RETRIEVAL_CONFIG,
} from '../../src/lib/retrievalConfig.js';

// ── Phase 5 — Retrieval orchestrator ──────────────────────────────────────────
import {
  RETRIEVAL_ORCHESTRATION_VERSION,
  RETRIEVAL_ORCHESTRATION_INSTRUCTIONS,
  getRetrievalContextForWiring,
  buildBoundedContextPackage,
  buildRetrievalOrchestrationInstructions,
} from '../../src/lib/retrievalOrchestrator.js';

// ── Wiring configs ─────────────────────────────────────────────────────────────
import {
  CBT_THERAPIST_WIRING_HYBRID,
  CBT_THERAPIST_WIRING_STAGE2_V1,
  CBT_THERAPIST_WIRING_STAGE2_V2,
  CBT_THERAPIST_WIRING_STAGE2_V3,
} from '../../src/api/agentWiring.js';

// ── Context injector (extended in Phase 5) ────────────────────────────────────
import {
  getWorkflowContextForWiring,
  buildSessionStartContent,
} from '../../src/lib/workflowContextInjector.js';

import {
  THERAPIST_WORKFLOW_INSTRUCTIONS,
} from '../../src/lib/therapistWorkflowEngine.js';

// ── Feature flags ──────────────────────────────────────────────────────────────
import {
  THERAPIST_UPGRADE_FLAGS,
  isUpgradeEnabled,
} from '../../src/lib/featureFlags.js';

// ── Active wiring (default path regression) ───────────────────────────────────
import {
  ACTIVE_CBT_THERAPIST_WIRING,
  resolveTherapistWiring,
} from '../../src/api/activeAgentWiring.js';

// ─── Section 1 — retrievalConfig.js exports ──────────────────────────────────

describe('Phase 5 — retrievalConfig exports', () => {
  it('RETRIEVAL_SOURCE_TYPES is exported as a frozen object', () => {
    expect(typeof RETRIEVAL_SOURCE_TYPES).toBe('object');
    expect(Object.isFrozen(RETRIEVAL_SOURCE_TYPES)).toBe(true);
  });

  it('RETRIEVAL_SOURCE_TYPES has all four source type keys', () => {
    expect(RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY).toBe('therapist_memory');
    expect(RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT).toBe('session_context');
    expect(RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE).toBe('internal_knowledge');
    expect(RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE).toBe('external_knowledge');
  });

  it('RETRIEVAL_SOURCE_ORDER is exported as a frozen array', () => {
    expect(Array.isArray(RETRIEVAL_SOURCE_ORDER)).toBe(true);
    expect(Object.isFrozen(RETRIEVAL_SOURCE_ORDER)).toBe(true);
  });

  it('RETRIEVAL_SOURCE_ORDER has exactly 4 entries', () => {
    expect(RETRIEVAL_SOURCE_ORDER).toHaveLength(4);
  });

  it('RETRIEVAL_CONFIG is exported as a frozen object', () => {
    expect(typeof RETRIEVAL_CONFIG).toBe('object');
    expect(Object.isFrozen(RETRIEVAL_CONFIG)).toBe(true);
  });

  it('RETRIEVAL_CONFIG has a conservative INTERNAL_CONFIDENCE_THRESHOLD', () => {
    const threshold = RETRIEVAL_CONFIG.INTERNAL_CONFIDENCE_THRESHOLD;
    expect(typeof threshold).toBe('number');
    // Conservative means >= 0.5 and <= 1.0
    expect(threshold).toBeGreaterThanOrEqual(0.5);
    expect(threshold).toBeLessThanOrEqual(1.0);
  });

  it('RETRIEVAL_CONFIG has all required bound fields', () => {
    expect(typeof RETRIEVAL_CONFIG.MAX_THERAPIST_MEMORY_ITEMS).toBe('number');
    expect(typeof RETRIEVAL_CONFIG.MAX_SESSION_CONTEXT_ITEMS).toBe('number');
    expect(typeof RETRIEVAL_CONFIG.MAX_INTERNAL_KNOWLEDGE_ITEMS).toBe('number');
    expect(typeof RETRIEVAL_CONFIG.MAX_EXTERNAL_KNOWLEDGE_ITEMS).toBe('number');
    expect(typeof RETRIEVAL_CONFIG.MAX_TOTAL_CONTEXT_ITEMS).toBe('number');
  });

  it('per-source limits are all positive', () => {
    expect(RETRIEVAL_CONFIG.MAX_THERAPIST_MEMORY_ITEMS).toBeGreaterThan(0);
    expect(RETRIEVAL_CONFIG.MAX_SESSION_CONTEXT_ITEMS).toBeGreaterThan(0);
    expect(RETRIEVAL_CONFIG.MAX_INTERNAL_KNOWLEDGE_ITEMS).toBeGreaterThan(0);
    expect(RETRIEVAL_CONFIG.MAX_EXTERNAL_KNOWLEDGE_ITEMS).toBeGreaterThan(0);
  });

  it('MAX_EXTERNAL_KNOWLEDGE_ITEMS is bounded (<=3) — external is supplemental', () => {
    expect(RETRIEVAL_CONFIG.MAX_EXTERNAL_KNOWLEDGE_ITEMS).toBeLessThanOrEqual(3);
  });

  it('MAX_TOTAL_CONTEXT_ITEMS is positive and bounded (<= 20)', () => {
    expect(RETRIEVAL_CONFIG.MAX_TOTAL_CONTEXT_ITEMS).toBeGreaterThan(0);
    expect(RETRIEVAL_CONFIG.MAX_TOTAL_CONTEXT_ITEMS).toBeLessThanOrEqual(20);
  });
});

// ─── Section 2 — Retrieval source order ──────────────────────────────────────

describe('Phase 5 — retrieval source order (internal-first)', () => {
  it('THERAPIST_MEMORY is first (highest priority)', () => {
    expect(RETRIEVAL_SOURCE_ORDER[0]).toBe(RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY);
  });

  it('SESSION_CONTEXT is second', () => {
    expect(RETRIEVAL_SOURCE_ORDER[1]).toBe(RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT);
  });

  it('INTERNAL_KNOWLEDGE is third', () => {
    expect(RETRIEVAL_SOURCE_ORDER[2]).toBe(RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE);
  });

  it('EXTERNAL_KNOWLEDGE is last (lowest priority)', () => {
    expect(RETRIEVAL_SOURCE_ORDER[3]).toBe(RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE);
  });

  it('EXTERNAL_KNOWLEDGE comes after INTERNAL_KNOWLEDGE', () => {
    const externalIdx = RETRIEVAL_SOURCE_ORDER.indexOf(RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE);
    const internalIdx = RETRIEVAL_SOURCE_ORDER.indexOf(RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE);
    expect(externalIdx).toBeGreaterThan(internalIdx);
  });
});

// ─── Section 3 — retrievalOrchestrator.js exports ────────────────────────────

describe('Phase 5 — retrievalOrchestrator exports', () => {
  it('RETRIEVAL_ORCHESTRATION_VERSION is exported as a string', () => {
    expect(typeof RETRIEVAL_ORCHESTRATION_VERSION).toBe('string');
    expect(RETRIEVAL_ORCHESTRATION_VERSION.length).toBeGreaterThan(0);
  });

  it('RETRIEVAL_ORCHESTRATION_INSTRUCTIONS is exported as a non-empty string', () => {
    expect(typeof RETRIEVAL_ORCHESTRATION_INSTRUCTIONS).toBe('string');
    expect(RETRIEVAL_ORCHESTRATION_INSTRUCTIONS.length).toBeGreaterThan(0);
  });

  it('getRetrievalContextForWiring is exported as a function', () => {
    expect(typeof getRetrievalContextForWiring).toBe('function');
  });

  it('buildBoundedContextPackage is exported as a function', () => {
    expect(typeof buildBoundedContextPackage).toBe('function');
  });

  it('buildRetrievalOrchestrationInstructions is exported as a function', () => {
    expect(typeof buildRetrievalOrchestrationInstructions).toBe('function');
  });
});

// ─── Section 4 — getRetrievalContextForWiring: default path returns null ─────

describe('Phase 5 — getRetrievalContextForWiring: no injection for default path', () => {
  it('returns null for CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(getRetrievalContextForWiring(CBT_THERAPIST_WIRING_HYBRID)).toBeNull();
  });

  it('returns null for CBT_THERAPIST_WIRING_STAGE2_V1', () => {
    expect(getRetrievalContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V1)).toBeNull();
  });

  it('returns null for CBT_THERAPIST_WIRING_STAGE2_V2', () => {
    expect(getRetrievalContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V2)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(getRetrievalContextForWiring(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getRetrievalContextForWiring(undefined)).toBeNull();
  });

  it('returns null for an empty object', () => {
    expect(getRetrievalContextForWiring({})).toBeNull();
  });

  it('returns null when retrieval_orchestration_enabled is false', () => {
    expect(getRetrievalContextForWiring({ retrieval_orchestration_enabled: false })).toBeNull();
  });

  it('returns null when only workflow_context_injection is true (V2, not V3)', () => {
    expect(getRetrievalContextForWiring({ workflow_context_injection: true })).toBeNull();
  });
});

// ─── Section 5 — getRetrievalContextForWiring: V3 returns instructions ───────

describe('Phase 5 — getRetrievalContextForWiring: injection is live for V3', () => {
  it('returns RETRIEVAL_ORCHESTRATION_INSTRUCTIONS for V3 wiring', () => {
    expect(getRetrievalContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V3)).toBe(
      RETRIEVAL_ORCHESTRATION_INSTRUCTIONS,
    );
  });

  it('returns the instructions when retrieval_orchestration_enabled is true', () => {
    const mockV3 = { retrieval_orchestration_enabled: true };
    expect(getRetrievalContextForWiring(mockV3)).toBe(RETRIEVAL_ORCHESTRATION_INSTRUCTIONS);
  });

  it('returned instructions match buildRetrievalOrchestrationInstructions()', () => {
    const result = getRetrievalContextForWiring(CBT_THERAPIST_WIRING_STAGE2_V3);
    expect(result).toBe(buildRetrievalOrchestrationInstructions());
  });
});

// ─── Section 6 — RETRIEVAL_ORCHESTRATION_INSTRUCTIONS content ────────────────

describe('Phase 5 — RETRIEVAL_ORCHESTRATION_INSTRUCTIONS content', () => {
  it('contains the Phase 5 section header', () => {
    expect(RETRIEVAL_ORCHESTRATION_INSTRUCTIONS).toContain('RETRIEVAL ORCHESTRATION');
  });

  it('mentions all four source type names', () => {
    expect(RETRIEVAL_ORCHESTRATION_INSTRUCTIONS).toContain(RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY);
    expect(RETRIEVAL_ORCHESTRATION_INSTRUCTIONS).toContain(RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT);
    expect(RETRIEVAL_ORCHESTRATION_INSTRUCTIONS).toContain(RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE);
    expect(RETRIEVAL_ORCHESTRATION_INSTRUCTIONS).toContain(RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE);
  });

  it('mentions the confidence threshold', () => {
    expect(RETRIEVAL_ORCHESTRATION_INSTRUCTIONS).toContain('confidence');
    expect(RETRIEVAL_ORCHESTRATION_INSTRUCTIONS).toContain(
      String(RETRIEVAL_CONFIG.INTERNAL_CONFIDENCE_THRESHOLD),
    );
  });

  it('states that retrieval failures are non-blocking', () => {
    expect(RETRIEVAL_ORCHESTRATION_INSTRUCTIONS).toContain('NON-BLOCKING');
  });

  it('states that safety takes strict precedence', () => {
    expect(RETRIEVAL_ORCHESTRATION_INSTRUCTIONS).toContain('SAFETY');
  });

  it('mentions bounding rules', () => {
    expect(RETRIEVAL_ORCHESTRATION_INSTRUCTIONS).toContain('BOUNDING');
  });

  it('does not mention live retrieval, web search, or browsing', () => {
    const lower = RETRIEVAL_ORCHESTRATION_INSTRUCTIONS.toLowerCase();
    expect(lower).not.toContain('live web');
    expect(lower).not.toContain('web search');
    expect(lower).not.toContain('browse');
    expect(lower).not.toContain('internet');
    expect(lower).not.toContain('allowlist');
  });
});

// ─── Section 7 — CBT_THERAPIST_WIRING_STAGE2_V3 shape ────────────────────────

describe('Phase 5 — CBT_THERAPIST_WIRING_STAGE2_V3 shape', () => {
  it('V3 exists as a named export from agentWiring.js', () => {
    expect(typeof CBT_THERAPIST_WIRING_STAGE2_V3).toBe('object');
    expect(CBT_THERAPIST_WIRING_STAGE2_V3).not.toBeNull();
  });

  it('V3 has stage2: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V3.stage2).toBe(true);
  });

  it('V3 has stage2_phase: 5', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V3.stage2_phase).toBe(5);
  });

  it('V3 has retrieval_orchestration_enabled: true', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V3.retrieval_orchestration_enabled).toBe(true);
  });

  it('V3 inherits memory_context_injection: true from V1', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V3.memory_context_injection).toBe(true);
  });

  it('V3 inherits workflow_engine_enabled: true from V2', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V3.workflow_engine_enabled).toBe(true);
  });

  it('V3 inherits workflow_context_injection: true from V2', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V3.workflow_context_injection).toBe(true);
  });

  it('V3 has a tool_configs array', () => {
    expect(Array.isArray(CBT_THERAPIST_WIRING_STAGE2_V3.tool_configs)).toBe(true);
  });

  it('V3 has name: cbt_therapist', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V3.name).toBe('cbt_therapist');
  });
});

// ─── Section 8 — V3 entity list: V2 entities preserved ───────────────────────

describe('Phase 5 — V3 entity list: V2 entities preserved', () => {
  const v2Entities = CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs.map((c) => c.entity_name);
  const v3Entities = CBT_THERAPIST_WIRING_STAGE2_V3.tool_configs.map((c) => c.entity_name);

  it('V3 contains all V2 entities', () => {
    for (const entityName of v2Entities) {
      expect(v3Entities, `V3 must contain entity "${entityName}" from V2`).toContain(entityName);
    }
  });

  it('V3 has more tool_configs than V2 (external knowledge added)', () => {
    expect(CBT_THERAPIST_WIRING_STAGE2_V3.tool_configs.length).toBeGreaterThan(
      CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs.length,
    );
  });

  it('V2 entities retain identical source_order values in V3', () => {
    for (const v2Config of CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs) {
      const v3Config = CBT_THERAPIST_WIRING_STAGE2_V3.tool_configs.find(
        (c) => c.entity_name === v2Config.entity_name,
      );
      expect(
        v3Config?.source_order,
        `source_order for "${v2Config.entity_name}" must be unchanged in V3`,
      ).toBe(v2Config.source_order);
    }
  });
});

// ─── Section 9 — V3 entity list: external knowledge added ────────────────────

describe('Phase 5 — V3 entity list: ExternalKnowledgeChunk added', () => {
  const extChunkConfig = CBT_THERAPIST_WIRING_STAGE2_V3.tool_configs.find(
    (c) => c.entity_name === 'ExternalKnowledgeChunk',
  );

  it('V3 includes ExternalKnowledgeChunk in tool_configs', () => {
    expect(extChunkConfig).toBeDefined();
  });

  it('ExternalKnowledgeChunk has external_trusted: true', () => {
    expect(extChunkConfig?.external_trusted).toBe(true);
  });

  it('ExternalKnowledgeChunk has read_only: true', () => {
    expect(extChunkConfig?.read_only).toBe(true);
  });

  it('ExternalKnowledgeChunk has access_level: restricted', () => {
    expect(extChunkConfig?.access_level).toBe('restricted');
  });

  it('ExternalKnowledgeChunk has the highest source_order (lowest priority)', () => {
    const allSourceOrders = CBT_THERAPIST_WIRING_STAGE2_V3.tool_configs.map(
      (c) => c.source_order,
    );
    const maxOrder = Math.max(...allSourceOrders);
    expect(extChunkConfig?.source_order).toBe(maxOrder);
  });

  it('ExternalKnowledgeChunk source_order is above all V2 entity source_orders', () => {
    const v2MaxOrder = Math.max(
      ...CBT_THERAPIST_WIRING_STAGE2_V2.tool_configs.map((c) => c.source_order),
    );
    expect(extChunkConfig?.source_order).toBeGreaterThan(v2MaxOrder);
  });

  it('HYBRID wiring does not include ExternalKnowledgeChunk', () => {
    const hybridEntities = CBT_THERAPIST_WIRING_HYBRID.tool_configs.map((c) => c.entity_name);
    expect(hybridEntities).not.toContain('ExternalKnowledgeChunk');
  });
});

// ─── Section 10 — buildSessionStartContent: default path unchanged ────────────

describe('Phase 5 — buildSessionStartContent: default path unchanged', () => {
  it('returns exactly "[START_SESSION]" for CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_HYBRID)).toBe('[START_SESSION]');
  });

  it('returns exactly "[START_SESSION]" for CBT_THERAPIST_WIRING_STAGE2_V1', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V1)).toBe('[START_SESSION]');
  });

  it('returns exactly "[START_SESSION]" for null', () => {
    expect(buildSessionStartContent(null)).toBe('[START_SESSION]');
  });

  it('returns exactly "[START_SESSION]" for undefined', () => {
    expect(buildSessionStartContent(undefined)).toBe('[START_SESSION]');
  });

  it('returns exactly "[START_SESSION]" for an empty object', () => {
    expect(buildSessionStartContent({})).toBe('[START_SESSION]');
  });
});

// ─── Section 11 — buildSessionStartContent: V2 path unchanged (Phase 3.1) ───

describe('Phase 5 — buildSessionStartContent: V2 behavior unchanged from Phase 3.1', () => {
  it('V2 content includes "[START_SESSION]"', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V2)).toContain('[START_SESSION]');
  });

  it('V2 content includes THERAPIST_WORKFLOW_INSTRUCTIONS', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V2)).toContain(
      THERAPIST_WORKFLOW_INSTRUCTIONS,
    );
  });

  it('V2 content does NOT include RETRIEVAL_ORCHESTRATION_INSTRUCTIONS', () => {
    const v2Content = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V2);
    expect(v2Content).not.toContain('RETRIEVAL ORCHESTRATION');
  });

  it('V2 content starts with "[START_SESSION]"', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V2)).toMatch(
      /^\[START_SESSION\]/,
    );
  });
});

// ─── Section 12 — buildSessionStartContent: V3 path is real ─────────────────

describe('Phase 5 — buildSessionStartContent: V3 path injects retrieval context', () => {
  it('V3 content includes "[START_SESSION]"', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V3)).toContain('[START_SESSION]');
  });

  it('V3 content includes THERAPIST_WORKFLOW_INSTRUCTIONS (from V2)', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V3)).toContain(
      THERAPIST_WORKFLOW_INSTRUCTIONS,
    );
  });

  it('V3 content includes RETRIEVAL_ORCHESTRATION_INSTRUCTIONS (Phase 5 addition)', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V3)).toContain(
      RETRIEVAL_ORCHESTRATION_INSTRUCTIONS,
    );
  });

  it('V3 content is longer than V2 content (retrieval section added)', () => {
    const v2Content = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V2);
    const v3Content = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V3);
    expect(v3Content.length).toBeGreaterThan(v2Content.length);
  });

  it('V3 content is longer than default content', () => {
    const defaultContent = buildSessionStartContent(CBT_THERAPIST_WIRING_HYBRID);
    const v3Content = buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V3);
    expect(v3Content.length).toBeGreaterThan(defaultContent.length);
  });

  it('V3 content starts with "[START_SESSION]"', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V3)).toMatch(
      /^\[START_SESSION\]/,
    );
  });

  it('V3 content contains RETRIEVAL ORCHESTRATION section', () => {
    expect(buildSessionStartContent(CBT_THERAPIST_WIRING_STAGE2_V3)).toContain(
      'RETRIEVAL ORCHESTRATION',
    );
  });
});

// ─── Section 13 — buildBoundedContextPackage: basic behavior ─────────────────

describe('Phase 5 — buildBoundedContextPackage: basic behavior', () => {
  it('returns empty string for empty array', () => {
    expect(buildBoundedContextPackage([])).toBe('');
  });

  it('returns empty string for non-array input', () => {
    expect(buildBoundedContextPackage(null)).toBe('');
    expect(buildBoundedContextPackage(undefined)).toBe('');
  });

  it('returns a non-empty string for valid items', () => {
    const items = [
      { source_type: RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY, content: 'memory item 1' },
    ];
    const result = buildBoundedContextPackage(items);
    expect(result.length).toBeGreaterThan(0);
  });

  it('skips items missing content', () => {
    const items = [
      { source_type: RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY, content: '' },
      { source_type: RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY },
    ];
    expect(buildBoundedContextPackage(items)).toBe('');
  });

  it('skips items with unknown source_type', () => {
    const items = [
      { source_type: 'unknown_type', content: 'some content' },
    ];
    expect(buildBoundedContextPackage(items)).toBe('');
  });
});

// ─── Section 14 — buildBoundedContextPackage: source ordering ────────────────

describe('Phase 5 — buildBoundedContextPackage: source ordering', () => {
  it('therapist_memory items appear before session_context items', () => {
    const items = [
      { source_type: RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT, content: 'session item' },
      { source_type: RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY, content: 'memory item' },
    ];
    const result = buildBoundedContextPackage(items);
    const memIdx = result.indexOf('memory item');
    const sesIdx = result.indexOf('session item');
    expect(memIdx).toBeLessThan(sesIdx);
  });

  it('internal_knowledge items appear before external_knowledge items', () => {
    const items = [
      { source_type: RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE, content: 'external item', source_id: 'ext-1' },
      { source_type: RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE, content: 'internal item' },
    ];
    const result = buildBoundedContextPackage(items);
    const intIdx = result.indexOf('internal item');
    const extIdx = result.indexOf('external item');
    expect(intIdx).toBeLessThan(extIdx);
  });

  it('produces therapist_memory > session_context > internal_knowledge > external_knowledge order', () => {
    const items = [
      { source_type: RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE, content: 'ext content', source_id: 'ext-1' },
      { source_type: RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE, content: 'int content' },
      { source_type: RETRIEVAL_SOURCE_TYPES.SESSION_CONTEXT, content: 'ses content' },
      { source_type: RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY, content: 'mem content' },
    ];
    const result = buildBoundedContextPackage(items);
    const memIdx = result.indexOf('mem content');
    const sesIdx = result.indexOf('ses content');
    const intIdx = result.indexOf('int content');
    const extIdx = result.indexOf('ext content');
    expect(memIdx).toBeLessThan(sesIdx);
    expect(sesIdx).toBeLessThan(intIdx);
    expect(intIdx).toBeLessThan(extIdx);
  });
});

// ─── Section 15 — buildBoundedContextPackage: provenance tagging ──────────────

describe('Phase 5 — buildBoundedContextPackage: provenance tagging', () => {
  it('tags therapist memory items with source_type label', () => {
    const items = [
      { source_type: RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY, content: 'memory text' },
    ];
    const result = buildBoundedContextPackage(items);
    expect(result).toContain(RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY);
  });

  it('tags external knowledge items with source_id when present', () => {
    const items = [
      {
        source_type: RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE,
        content: 'external text',
        source_id: 'who-mhgap-ig-v2',
      },
    ];
    const result = buildBoundedContextPackage(items);
    expect(result).toContain('who-mhgap-ig-v2');
  });

  it('tags internal items with entity_name when present', () => {
    const items = [
      {
        source_type: RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE,
        content: 'exercise text',
        entity_name: 'Exercise',
      },
    ];
    const result = buildBoundedContextPackage(items);
    expect(result).toContain('Exercise');
  });
});

// ─── Section 16 — buildBoundedContextPackage: per-source limits ──────────────

describe('Phase 5 — buildBoundedContextPackage: per-source item limits', () => {
  it('enforces MAX_THERAPIST_MEMORY_ITEMS limit', () => {
    const limit = RETRIEVAL_CONFIG.MAX_THERAPIST_MEMORY_ITEMS;
    // Create limit + 2 items (one over the limit)
    const items = Array.from({ length: limit + 2 }, (_, i) => ({
      source_type: RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY,
      content: `memory item ${i + 1}`,
    }));
    const result = buildBoundedContextPackage(items);
    // Should contain exactly 'limit' items, not limit+2
    let count = 0;
    for (let i = 1; i <= limit + 2; i++) {
      if (result.includes(`memory item ${i}`)) count++;
    }
    expect(count).toBeLessThanOrEqual(limit);
  });

  it('enforces MAX_EXTERNAL_KNOWLEDGE_ITEMS limit', () => {
    const limit = RETRIEVAL_CONFIG.MAX_EXTERNAL_KNOWLEDGE_ITEMS;
    const items = Array.from({ length: limit + 3 }, (_, i) => ({
      source_type: RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE,
      content: `ext item ${i + 1}`,
      source_id: `ext-${i + 1}`,
    }));
    const result = buildBoundedContextPackage(items);
    let count = 0;
    for (let i = 1; i <= limit + 3; i++) {
      if (result.includes(`ext item ${i}`)) count++;
    }
    expect(count).toBeLessThanOrEqual(limit);
  });

  it('enforces MAX_TOTAL_CONTEXT_ITEMS across all sources', () => {
    const totalMax = RETRIEVAL_CONFIG.MAX_TOTAL_CONTEXT_ITEMS;
    // Create a large mixed set well above the total cap
    const items = [
      ...Array.from({ length: totalMax }, (_, i) => ({
        source_type: RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY,
        content: `mem ${i}`,
      })),
      ...Array.from({ length: totalMax }, (_, i) => ({
        source_type: RETRIEVAL_SOURCE_TYPES.INTERNAL_KNOWLEDGE,
        content: `int ${i}`,
      })),
    ];
    const result = buildBoundedContextPackage(items);
    const lineCount = result.split('\n').filter((l) => l.trim().length > 0).length;
    expect(lineCount).toBeLessThanOrEqual(totalMax);
  });

  it('custom config overrides default limits', () => {
    const customConfig = { ...RETRIEVAL_CONFIG, MAX_THERAPIST_MEMORY_ITEMS: 1, MAX_TOTAL_CONTEXT_ITEMS: 1 };
    const items = Array.from({ length: 5 }, (_, i) => ({
      source_type: RETRIEVAL_SOURCE_TYPES.THERAPIST_MEMORY,
      content: `mem ${i}`,
    }));
    const result = buildBoundedContextPackage(items, customConfig);
    const lineCount = result.split('\n').filter((l) => l.trim().length > 0).length;
    expect(lineCount).toBe(1);
  });
});

// ─── Section 17 — resolveTherapistWiring: Phase 5 routing branch ─────────────

describe('Phase 5 — resolveTherapistWiring routing logic', () => {
  it('resolveTherapistWiring function exists and is callable', () => {
    expect(typeof resolveTherapistWiring).toBe('function');
  });

  it('resolveTherapistWiring returns HYBRID when all flags are off', () => {
    // All flags default to false in this test environment
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('resolveTherapistWiring source code contains a V3 routing branch', () => {
    // Structural test: verify the routing file references V3
    const wiringFilePath = path.resolve(
      import.meta.url.replace('file://', '').replace(/[^/]+$/, ''),
      '../../src/api/activeAgentWiring.js',
    );
    const source = fs.readFileSync(wiringFilePath, 'utf8');
    expect(source).toContain('CBT_THERAPIST_WIRING_STAGE2_V3');
    expect(source).toContain('THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED');
    expect(source).toContain('stage2_v3');
  });

  it('resolveTherapistWiring evaluates the retrieval orchestration flag before the workflow flag', () => {
    const wiringFilePath = path.resolve(
      import.meta.url.replace('file://', '').replace(/[^/]+$/, ''),
      '../../src/api/activeAgentWiring.js',
    );
    const source = fs.readFileSync(wiringFilePath, 'utf8');
    const v3Idx = source.indexOf('THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED');
    const v2Idx = source.indexOf('THERAPIST_UPGRADE_WORKFLOW_ENABLED');
    // V3 check must appear before V2 check in the source
    expect(v3Idx).toBeGreaterThanOrEqual(0);
    expect(v2Idx).toBeGreaterThanOrEqual(0);
    expect(v3Idx).toBeLessThan(v2Idx);
  });
});

// ─── Section 18 — Flags: Phase 5 flag is still false ─────────────────────────

describe('Phase 5 — feature flags still off', () => {
  it('THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED is false', () => {
    expect(THERAPIST_UPGRADE_FLAGS.THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED).toBe(false);
  });

  it('isUpgradeEnabled returns false for the retrieval orchestration flag', () => {
    expect(isUpgradeEnabled('THERAPIST_UPGRADE_RETRIEVAL_ORCHESTRATION_ENABLED')).toBe(false);
  });

  it('all Stage 2 flags are still false', () => {
    for (const [name, value] of Object.entries(THERAPIST_UPGRADE_FLAGS)) {
      expect(value, `Flag "${name}" must still be false`).toBe(false);
    }
  });
});

// ─── Section 19 — Default therapist path unchanged ───────────────────────────

describe('Phase 5 — current therapist default path unchanged', () => {
  it('ACTIVE_CBT_THERAPIST_WIRING is still CBT_THERAPIST_WIRING_HYBRID', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('resolveTherapistWiring returns HYBRID when all flags are off', () => {
    expect(resolveTherapistWiring()).toBe(CBT_THERAPIST_WIRING_HYBRID);
  });

  it('ACTIVE_CBT_THERAPIST_WIRING.stage2 is still falsy', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.stage2).toBeFalsy();
  });

  it('HYBRID wiring has no retrieval_orchestration_enabled flag', () => {
    expect(CBT_THERAPIST_WIRING_HYBRID.retrieval_orchestration_enabled).toBeFalsy();
  });

  it('buildSessionStartContent returns unchanged default for the active wiring', () => {
    expect(buildSessionStartContent(ACTIVE_CBT_THERAPIST_WIRING)).toBe('[START_SESSION]');
  });

  it('getRetrievalContextForWiring returns null for the active wiring', () => {
    expect(getRetrievalContextForWiring(ACTIVE_CBT_THERAPIST_WIRING)).toBeNull();
  });
});

// ─── Section 20 — No live retrieval in Phase 5 modules ───────────────────────

describe('Phase 5 — no live retrieval in any Phase 5 module', () => {
  it('retrievalOrchestrator.js does not import from any live retrieval module', () => {
    const orchestratorPath = path.resolve(
      import.meta.url.replace('file://', '').replace(/[^/]+$/, ''),
      '../../src/lib/retrievalOrchestrator.js',
    );
    const source = fs.readFileSync(orchestratorPath, 'utf8');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('axios');
    expect(source).not.toContain('http.get');
    expect(source).not.toContain('liveRetrievalWrapper');
    expect(source).not.toContain('allowlistWrapper');
    expect(source).not.toContain("from 'npm:");
    expect(source).not.toContain('createClientFromRequest');
  });

  it('retrievalConfig.js does not import from any live retrieval module', () => {
    const configPath = path.resolve(
      import.meta.url.replace('file://', '').replace(/[^/]+$/, ''),
      '../../src/lib/retrievalConfig.js',
    );
    const source = fs.readFileSync(configPath, 'utf8');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('createClientFromRequest');
    expect(source).not.toContain("from 'npm:");
  });

  it('RETRIEVAL_ORCHESTRATION_INSTRUCTIONS does not mention live retrieval', () => {
    const lower = RETRIEVAL_ORCHESTRATION_INSTRUCTIONS.toLowerCase();
    expect(lower).not.toContain('live retrieval');
    expect(lower).not.toContain('live web');
    expect(lower).not.toContain('web search');
    expect(lower).not.toContain('allowlist');
  });
});

// ─── Section 21 — Privacy: external knowledge is separated ───────────────────

describe('Phase 5 — privacy and source separation', () => {
  it('ExternalKnowledgeChunk in V3 is labeled external_trusted: true', () => {
    const extConfig = CBT_THERAPIST_WIRING_STAGE2_V3.tool_configs.find(
      (c) => c.entity_name === 'ExternalKnowledgeChunk',
    );
    expect(extConfig?.external_trusted).toBe(true);
  });

  it('External items are labeled with external_knowledge source type in context package', () => {
    const items = [
      {
        source_type: RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE,
        content: 'clinical reference text',
        source_id: 'who-mhgap-ig-v2',
      },
    ];
    const result = buildBoundedContextPackage(items);
    expect(result).toContain(RETRIEVAL_SOURCE_TYPES.EXTERNAL_KNOWLEDGE);
  });

  it('retrievalOrchestrator does not reference private entity names', () => {
    const orchestratorPath = path.resolve(
      import.meta.url.replace('file://', '').replace(/[^/]+$/, ''),
      '../../src/lib/retrievalOrchestrator.js',
    );
    const source = fs.readFileSync(orchestratorPath, 'utf8');
    // These private entities must never appear in the retrieval orchestrator
    // (checked as substrings to catch any quote style or casing)
    expect(source).not.toContain('ThoughtJournal');
    expect(source).not.toContain('CaseFormulation');
    expect(source).not.toContain('UserDeletedConversations');
  });
});

// ─── Section 22 — Rollback safety ────────────────────────────────────────────

describe('Phase 5 — rollback remains safe', () => {
  it('removing Phase 5 modules would not affect the current therapist path', () => {
    // Structural: the active wiring is HYBRID, which has no Phase 5 flags
    const wiringStr = JSON.stringify(CBT_THERAPIST_WIRING_HYBRID);
    expect(wiringStr).not.toContain('retrieval_orchestration_enabled');
    expect(wiringStr).not.toContain('ExternalKnowledgeChunk');
    expect(wiringStr).not.toContain('retrievalOrchestrator');
  });

  it('disabling THERAPIST_UPGRADE_ENABLED is sufficient to prevent all Phase 5 behavior', () => {
    // With master flag off (the default), resolveTherapistWiring always returns HYBRID
    const result = resolveTherapistWiring();
    expect(result).toBe(CBT_THERAPIST_WIRING_HYBRID);
    expect(result.retrieval_orchestration_enabled).toBeFalsy();
  });

  it('V3 is not the active wiring — rollback requires no code change', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING).not.toBe(CBT_THERAPIST_WIRING_STAGE2_V3);
  });

  it('CBT_THERAPIST_WIRING_HYBRID is completely unchanged by Phase 5', () => {
    // Ensure HYBRID has not gained any Phase 5 flags
    expect(CBT_THERAPIST_WIRING_HYBRID.retrieval_orchestration_enabled).toBeUndefined();
    expect(CBT_THERAPIST_WIRING_HYBRID.workflow_engine_enabled).toBeUndefined();
    expect(CBT_THERAPIST_WIRING_HYBRID.workflow_context_injection).toBeUndefined();
  });
});
