/**
 * @file test/utils/aiCompanionUpgradePhase2.test.js
 *
 * Phase 2 AI Companion Upgrade Foundation — test suite.
 *
 * Covers:
 *   A. COMPANION_UPGRADE_FLAGS registry (structure, defaults, freeze)
 *   B. isCompanionUpgradeEnabled() routing logic
 *   C. logCompanionUpgradeEvent() + registerCompanionUpgradeAnalyticsTracker()
 *   D. AI_COMPANION_WIRING_UPGRADE_V1 shape and entity policy
 *   E. resolveCompanionWiring() routing
 *   F. Role isolation — companion flags never affect therapist routing
 *   G. Role isolation — therapist flags never affect companion routing
 *   H. ACTIVE_AI_COMPANION_WIRING defaults to HYBRID (all flags off)
 *   I. ACTIVE_AGENT_WIRINGS includes both agents
 *   J. Conversation initiation: UPGRADE_V1 retains CompanionMemory + MoodEntry
 *   K. Memory / continuity: correct entity access levels in UPGRADE_V1
 *   L. Emotional response variety: warmth_enabled flag is set on UPGRADE_V1
 *   M. Policy compliance: UPGRADE_V1 must not include prohibited entities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  COMPANION_UPGRADE_FLAGS,
  isCompanionUpgradeEnabled,
  logCompanionUpgradeEvent,
  registerCompanionUpgradeAnalyticsTracker,
} from '../../src/lib/featureFlags.js';
import {
  AI_COMPANION_WIRING_HYBRID,
  AI_COMPANION_WIRING_UPGRADE_V1,
} from '../../src/api/agentWiring.js';
import {
  resolveCompanionWiring,
  resolveTherapistWiring,
  ACTIVE_AI_COMPANION_WIRING,
  ACTIVE_CBT_THERAPIST_WIRING,
  ACTIVE_AGENT_WIRINGS,
} from '../../src/api/activeAgentWiring.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SYSTEM_PROHIBITED = [
  'Subscription',
  'UserDeletedConversations',
  'AppNotification',
  'MindGameActivity',
];

const COMPANION_PROHIBITED = [
  'ThoughtJournal',
  'CoachingSession',
  'CaseFormulation',
];

function entityNames(wiring) {
  return wiring.tool_configs.map((tc) => tc.entity_name);
}

function sourceOrder(wiring, entityName) {
  const tc = wiring.tool_configs.find((t) => t.entity_name === entityName);
  return tc?.source_order ?? Infinity;
}

// ─── A. COMPANION_UPGRADE_FLAGS registry ─────────────────────────────────────

describe('A. COMPANION_UPGRADE_FLAGS registry', () => {
  it('exports COMPANION_UPGRADE_FLAGS as a frozen object', () => {
    expect(COMPANION_UPGRADE_FLAGS).toBeDefined();
    expect(Object.isFrozen(COMPANION_UPGRADE_FLAGS)).toBe(true);
  });

  it('has COMPANION_UPGRADE_ENABLED key', () => {
    expect('COMPANION_UPGRADE_ENABLED' in COMPANION_UPGRADE_FLAGS).toBe(true);
  });

  it('has COMPANION_UPGRADE_WARMTH_ENABLED key', () => {
    expect('COMPANION_UPGRADE_WARMTH_ENABLED' in COMPANION_UPGRADE_FLAGS).toBe(true);
  });

  it('all flags default to false in test environment', () => {
    for (const [key, val] of Object.entries(COMPANION_UPGRADE_FLAGS)) {
      expect(val, `${key} should default to false`).toBe(false);
    }
  });

  it('COMPANION_UPGRADE_FLAGS is separate from any therapist flags', () => {
    // The companion flags object must not contain any THERAPIST_UPGRADE_* keys
    for (const key of Object.keys(COMPANION_UPGRADE_FLAGS)) {
      expect(key.startsWith('COMPANION_'), `key "${key}" should start with COMPANION_`).toBe(true);
    }
  });

  it('cannot be mutated at runtime', () => {
    expect(() => {
      COMPANION_UPGRADE_FLAGS.COMPANION_UPGRADE_ENABLED = true;
    }).toThrow();
  });
});

// ─── B. isCompanionUpgradeEnabled() ──────────────────────────────────────────

describe('B. isCompanionUpgradeEnabled()', () => {
  it('returns false for unknown flag name', () => {
    expect(isCompanionUpgradeEnabled('UNKNOWN_FLAG')).toBe(false);
  });

  it('returns false for COMPANION_UPGRADE_ENABLED when env is not set (default)', () => {
    expect(isCompanionUpgradeEnabled('COMPANION_UPGRADE_ENABLED')).toBe(false);
  });

  it('returns false for COMPANION_UPGRADE_WARMTH_ENABLED when master gate is off', () => {
    expect(isCompanionUpgradeEnabled('COMPANION_UPGRADE_WARMTH_ENABLED')).toBe(false);
  });

  it('returns false for a therapist flag name (wrong namespace)', () => {
    expect(isCompanionUpgradeEnabled('THERAPIST_UPGRADE_ENABLED')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isCompanionUpgradeEnabled('')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isCompanionUpgradeEnabled(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isCompanionUpgradeEnabled(undefined)).toBe(false);
  });
});

// ─── C. logCompanionUpgradeEvent() and analytics tracker ─────────────────────

describe('C. logCompanionUpgradeEvent() and analytics tracker', () => {
  beforeEach(() => {
    registerCompanionUpgradeAnalyticsTracker(null);
  });

  afterEach(() => {
    registerCompanionUpgradeAnalyticsTracker(null);
  });

  it('does not throw when no tracker is registered', () => {
    expect(() => logCompanionUpgradeEvent('route_selected', { path: 'upgrade_v1' })).not.toThrow();
  });

  it('calls registered tracker with prefixed event name', () => {
    const tracker = vi.fn();
    registerCompanionUpgradeAnalyticsTracker(tracker);
    logCompanionUpgradeEvent('route_selected', { path: 'upgrade_v1' });
    expect(tracker).toHaveBeenCalledWith('companion_upgrade_route_selected', { path: 'upgrade_v1' });
  });

  it('does not call tracker after it is deregistered', () => {
    const tracker = vi.fn();
    registerCompanionUpgradeAnalyticsTracker(tracker);
    registerCompanionUpgradeAnalyticsTracker(null);
    logCompanionUpgradeEvent('route_selected', { path: 'upgrade_v1' });
    expect(tracker).not.toHaveBeenCalled();
  });

  it('does not throw when tracker itself throws', () => {
    const badTracker = vi.fn(() => { throw new Error('analytics down'); });
    registerCompanionUpgradeAnalyticsTracker(badTracker);
    expect(() => logCompanionUpgradeEvent('route_selected', {})).not.toThrow();
  });

  it('registerCompanionUpgradeAnalyticsTracker ignores non-function values silently', () => {
    expect(() => registerCompanionUpgradeAnalyticsTracker('not-a-function')).not.toThrow();
    expect(() => registerCompanionUpgradeAnalyticsTracker(42)).not.toThrow();
    expect(() => registerCompanionUpgradeAnalyticsTracker({})).not.toThrow();
  });
});

// ─── D. AI_COMPANION_WIRING_UPGRADE_V1 shape ─────────────────────────────────

describe('D. AI_COMPANION_WIRING_UPGRADE_V1 shape', () => {
  it('is exported from agentWiring.js', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V1).toBeDefined();
  });

  it('has name "ai_companion"', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V1.name).toBe('ai_companion');
  });

  it('has companion_upgrade: true', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V1.companion_upgrade).toBe(true);
  });

  it('has companion_upgrade_phase: 2', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V1.companion_upgrade_phase).toBe(2);
  });

  it('has warmth_enabled: true', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V1.warmth_enabled).toBe(true);
  });

  it('does not have stage2: true (companion upgrade is independent)', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V1.stage2).toBeUndefined();
  });

  it('has tool_configs array', () => {
    expect(Array.isArray(AI_COMPANION_WIRING_UPGRADE_V1.tool_configs)).toBe(true);
    expect(AI_COMPANION_WIRING_UPGRADE_V1.tool_configs.length).toBeGreaterThan(0);
  });
});

// ─── E. resolveCompanionWiring() routing ─────────────────────────────────────

describe('E. resolveCompanionWiring()', () => {
  it('returns AI_COMPANION_WIRING_HYBRID when all flags are off (default)', () => {
    const result = resolveCompanionWiring();
    expect(result).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('returns AI_COMPANION_WIRING_HYBRID when called multiple times with flags off', () => {
    expect(resolveCompanionWiring()).toBe(AI_COMPANION_WIRING_HYBRID);
    expect(resolveCompanionWiring()).toBe(AI_COMPANION_WIRING_HYBRID);
    expect(resolveCompanionWiring()).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('is a function', () => {
    expect(typeof resolveCompanionWiring).toBe('function');
  });

  it('returns an object with name "ai_companion"', () => {
    const result = resolveCompanionWiring();
    expect(result.name).toBe('ai_companion');
  });

  it('returns an object with tool_configs array', () => {
    const result = resolveCompanionWiring();
    expect(Array.isArray(result.tool_configs)).toBe(true);
  });
});

// ─── F. Role isolation — companion flags never affect therapist routing ────────

describe('F. Role isolation: companion flags do NOT affect therapist wiring', () => {
  it('resolveTherapistWiring() returns HYBRID regardless of companion flags', () => {
    // All companion flags are false in tests; therapist must still return HYBRID
    const therapistWiring = resolveTherapistWiring();
    expect(therapistWiring.name).toBe('cbt_therapist');
  });

  it('ACTIVE_CBT_THERAPIST_WIRING.name is "cbt_therapist"', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.name).toBe('cbt_therapist');
  });

  it('ACTIVE_CBT_THERAPIST_WIRING does not have companion_upgrade flag', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.companion_upgrade).toBeUndefined();
  });

  it('ACTIVE_CBT_THERAPIST_WIRING does not have warmth_enabled flag', () => {
    expect(ACTIVE_CBT_THERAPIST_WIRING.warmth_enabled).toBeUndefined();
  });
});

// ─── G. Role isolation — therapist flags never affect companion routing ────────

describe('G. Role isolation: therapist flags do NOT affect companion wiring', () => {
  it('resolveCompanionWiring() returns HYBRID regardless of therapist flags', () => {
    // All therapist flags are false in tests; companion must still return HYBRID
    const companionWiring = resolveCompanionWiring();
    expect(companionWiring.name).toBe('ai_companion');
  });

  it('ACTIVE_AI_COMPANION_WIRING does not have stage2 flag', () => {
    // stage2 flag belongs to therapist upgrade path only
    expect(ACTIVE_AI_COMPANION_WIRING.stage2).toBeUndefined();
  });

  it('ACTIVE_AI_COMPANION_WIRING does not have memory_context_injection flag', () => {
    expect(ACTIVE_AI_COMPANION_WIRING.memory_context_injection).toBeUndefined();
  });

  it('ACTIVE_AI_COMPANION_WIRING does not have workflow_engine_enabled flag', () => {
    expect(ACTIVE_AI_COMPANION_WIRING.workflow_engine_enabled).toBeUndefined();
  });
});

// ─── H. ACTIVE_AI_COMPANION_WIRING defaults to HYBRID ────────────────────────

describe('H. ACTIVE_AI_COMPANION_WIRING defaults to HYBRID (all flags off)', () => {
  it('equals AI_COMPANION_WIRING_HYBRID when no flags are set', () => {
    expect(ACTIVE_AI_COMPANION_WIRING).toBe(AI_COMPANION_WIRING_HYBRID);
  });

  it('has name "ai_companion"', () => {
    expect(ACTIVE_AI_COMPANION_WIRING.name).toBe('ai_companion');
  });

  it('has CompanionMemory at source_order 1', () => {
    expect(sourceOrder(ACTIVE_AI_COMPANION_WIRING, 'CompanionMemory')).toBe(1);
  });

  it('has MoodEntry at source_order 2', () => {
    expect(sourceOrder(ACTIVE_AI_COMPANION_WIRING, 'MoodEntry')).toBe(2);
  });
});

// ─── I. ACTIVE_AGENT_WIRINGS includes both agents ─────────────────────────────

describe('I. ACTIVE_AGENT_WIRINGS includes both agents', () => {
  it('has cbt_therapist key', () => {
    expect(ACTIVE_AGENT_WIRINGS).toHaveProperty('cbt_therapist');
  });

  it('has ai_companion key', () => {
    expect(ACTIVE_AGENT_WIRINGS).toHaveProperty('ai_companion');
  });

  it('cbt_therapist wiring name is "cbt_therapist"', () => {
    expect(ACTIVE_AGENT_WIRINGS.cbt_therapist.name).toBe('cbt_therapist');
  });

  it('ai_companion wiring name is "ai_companion"', () => {
    expect(ACTIVE_AGENT_WIRINGS.ai_companion.name).toBe('ai_companion');
  });

  it('ai_companion entry matches ACTIVE_AI_COMPANION_WIRING', () => {
    expect(ACTIVE_AGENT_WIRINGS.ai_companion).toBe(ACTIVE_AI_COMPANION_WIRING);
  });
});

// ─── J. Conversation initiation: UPGRADE_V1 retains required entities ─────────

describe('J. Conversation initiation: UPGRADE_V1 retains required preferred entities', () => {
  it('includes CompanionMemory', () => {
    expect(entityNames(AI_COMPANION_WIRING_UPGRADE_V1)).toContain('CompanionMemory');
  });

  it('includes MoodEntry', () => {
    expect(entityNames(AI_COMPANION_WIRING_UPGRADE_V1)).toContain('MoodEntry');
  });

  it('CompanionMemory is access_level "preferred"', () => {
    const tc = AI_COMPANION_WIRING_UPGRADE_V1.tool_configs.find(
      (t) => t.entity_name === 'CompanionMemory',
    );
    expect(tc?.access_level).toBe('preferred');
  });

  it('MoodEntry is access_level "preferred"', () => {
    const tc = AI_COMPANION_WIRING_UPGRADE_V1.tool_configs.find(
      (t) => t.entity_name === 'MoodEntry',
    );
    expect(tc?.access_level).toBe('preferred');
  });

  it('CompanionMemory has use_for_clinical_reasoning: false', () => {
    const tc = AI_COMPANION_WIRING_UPGRADE_V1.tool_configs.find(
      (t) => t.entity_name === 'CompanionMemory',
    );
    expect(tc?.use_for_clinical_reasoning).toBe(false);
  });

  it('UPGRADE_V1 tool_configs count equals HYBRID tool_configs count (no entity expansion)', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V1.tool_configs.length).toBe(
      AI_COMPANION_WIRING_HYBRID.tool_configs.length,
    );
  });
});

// ─── K. Memory / continuity: correct entity access levels ────────────────────

describe('K. Memory / continuity: UPGRADE_V1 entity access levels', () => {
  it('Exercise is access_level "allowed"', () => {
    const tc = AI_COMPANION_WIRING_UPGRADE_V1.tool_configs.find(
      (t) => t.entity_name === 'Exercise',
    );
    expect(tc?.access_level).toBe('allowed');
  });

  it('Resource is access_level "allowed"', () => {
    const tc = AI_COMPANION_WIRING_UPGRADE_V1.tool_configs.find(
      (t) => t.entity_name === 'Resource',
    );
    expect(tc?.access_level).toBe('allowed');
  });

  it('Goal is access_level "restricted" with reference_only: true', () => {
    const tc = AI_COMPANION_WIRING_UPGRADE_V1.tool_configs.find(
      (t) => t.entity_name === 'Goal',
    );
    expect(tc?.access_level).toBe('restricted');
    expect(tc?.reference_only).toBe(true);
  });

  it('SessionSummary is access_level "restricted" with continuity_check_only: true', () => {
    const tc = AI_COMPANION_WIRING_UPGRADE_V1.tool_configs.find(
      (t) => t.entity_name === 'SessionSummary',
    );
    expect(tc?.access_level).toBe('restricted');
    expect(tc?.continuity_check_only).toBe(true);
  });

  it('Conversation is caution_layer: true with secondary_only: true', () => {
    const tc = AI_COMPANION_WIRING_UPGRADE_V1.tool_configs.find(
      (t) => t.entity_name === 'Conversation',
    );
    expect(tc?.caution_layer).toBe(true);
    expect(tc?.secondary_only).toBe(true);
  });

  it('Conversation source_order > SessionSummary source_order', () => {
    const convOrder = sourceOrder(AI_COMPANION_WIRING_UPGRADE_V1, 'Conversation');
    const summaryOrder = sourceOrder(AI_COMPANION_WIRING_UPGRADE_V1, 'SessionSummary');
    expect(convOrder).toBeGreaterThan(summaryOrder);
  });

  it('CompanionMemory has lower source_order than all other entities (primary memory)', () => {
    const memOrder = sourceOrder(AI_COMPANION_WIRING_UPGRADE_V1, 'CompanionMemory');
    for (const tc of AI_COMPANION_WIRING_UPGRADE_V1.tool_configs) {
      if (tc.entity_name !== 'CompanionMemory') {
        expect(memOrder).toBeLessThan(tc.source_order);
      }
    }
  });
});

// ─── L. Emotional response variety: warmth_enabled flag ──────────────────────

describe('L. Emotional response variety: warmth_enabled flag', () => {
  it('UPGRADE_V1 has warmth_enabled: true', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V1.warmth_enabled).toBe(true);
  });

  it('HYBRID does not have warmth_enabled (legacy path unchanged)', () => {
    expect(AI_COMPANION_WIRING_HYBRID.warmth_enabled).toBeUndefined();
  });

  it('UPGRADE_V1 has companion_upgrade: true to signal upgrade path', () => {
    expect(AI_COMPANION_WIRING_UPGRADE_V1.companion_upgrade).toBe(true);
  });

  it('HYBRID does not have companion_upgrade flag', () => {
    expect(AI_COMPANION_WIRING_HYBRID.companion_upgrade).toBeUndefined();
  });
});

// ─── M. Policy compliance: UPGRADE_V1 must not include prohibited entities ────

describe('M. Policy compliance: UPGRADE_V1 must not include prohibited entities', () => {
  it('does not include any system-prohibited entity', () => {
    const names = entityNames(AI_COMPANION_WIRING_UPGRADE_V1);
    for (const prohibited of SYSTEM_PROHIBITED) {
      expect(names, `${prohibited} must not be in companion wiring`).not.toContain(prohibited);
    }
  });

  it('does not include any companion-prohibited entity', () => {
    const names = entityNames(AI_COMPANION_WIRING_UPGRADE_V1);
    for (const prohibited of COMPANION_PROHIBITED) {
      expect(names, `${prohibited} must not be in companion wiring`).not.toContain(prohibited);
    }
  });

  it('has the same entity list as HYBRID (no new entity access)', () => {
    const upgradeNames = new Set(entityNames(AI_COMPANION_WIRING_UPGRADE_V1));
    const hybridNames = new Set(entityNames(AI_COMPANION_WIRING_HYBRID));
    expect(upgradeNames).toEqual(hybridNames);
  });

  it('all tool_configs have valid access_level values', () => {
    const valid = new Set(['preferred', 'allowed', 'restricted']);
    for (const tc of AI_COMPANION_WIRING_UPGRADE_V1.tool_configs) {
      expect(
        valid.has(tc.access_level),
        `entity "${tc.entity_name}" has invalid access_level "${tc.access_level}"`,
      ).toBe(true);
    }
  });

  it('all tool_configs have positive integer source_order', () => {
    for (const tc of AI_COMPANION_WIRING_UPGRADE_V1.tool_configs) {
      expect(
        Number.isInteger(tc.source_order) && tc.source_order > 0,
        `entity "${tc.entity_name}" source_order ${tc.source_order} must be positive integer`,
      ).toBe(true);
    }
  });

  it('source_order values are unique across all tool_configs', () => {
    const orders = AI_COMPANION_WIRING_UPGRADE_V1.tool_configs.map((tc) => tc.source_order);
    const unique = new Set(orders);
    expect(unique.size).toBe(orders.length);
  });
});
