import { describe, expect, it } from 'vitest';
import {
  createS2V8TraceCollector,
  isS2DebugEnabledFromSearch,
} from '../../src/lib/s2V8TraceDiagnostics.js';

describe('s2 v8 trace diagnostics', () => {
  it('trace is disabled without _s2debug', () => {
    expect(isS2DebugEnabledFromSearch('')).toBe(false);
    expect(isS2DebugEnabledFromSearch('?foo=bar')).toBe(false);
    const collector = createS2V8TraceCollector({ enabled: false });
    const accepted = collector.recordEvent({
      source: 'Subscription',
      assistantIdentity: { key: 'raw:1' },
    });
    expect(accepted).toBe(false);
    expect(collector.getSnapshot().turns).toHaveLength(0);
    const target = {
      __S2_V8_TRACE__: { old: true },
      copyS2V8Trace: () => 'old',
    };
    collector.expose(target);
    expect(target.__S2_V8_TRACE__).toBeUndefined();
    expect(target.copyS2V8Trace).toBeUndefined();
  });

  it('bounded snapshot omits raw history and secrets', () => {
    const collector = createS2V8TraceCollector({
      enabled: true,
      buildSha: 'abc123',
      buildTimestamp: '2026-01-01T00:00:00.000Z',
    });

    collector.recordEvent({
      source: 'Subscription',
      assistantIdentity: { key: 'raw:9', id: 'm-9', rawIndex: 9, created_at: '2026-01-01T00:00:05.000Z' },
      finality: { decisionIsFinal: false, decisionReason: 'assistant_still_mutating' },
      safeUpdate: { accepted: true, snapshotSequence: 1 },
      pipeline: { stageTransitions: { sanitize: { before: { length: 999, hash: 'x' }, after: { length: 100, hash: 'y' } } } },
      groundingGuard: { matchedClaimGroup: 'identity', reasonCodes: ['unsupported_current_turn_grounding_claim'] },
      rawMessages: [{ role: 'user', content: 'SECRET_TOKEN_123' }],
      visibleCounts: { visibleAssistantBubbles: 1, visibleFeedbackCount: 1 },
    });

    const snapshot = collector.getSnapshot();
    const asJson = JSON.stringify(snapshot);
    expect(snapshot.turns).toHaveLength(1);
    expect(asJson).not.toContain('SECRET_TOKEN_123');
    expect(asJson).not.toContain('rawMessages');
    expect(asJson).not.toContain('"content"');
  });

  it('partial to final records preserve source/finality order', () => {
    const collector = createS2V8TraceCollector({ enabled: true });
    collector.recordEvent({
      source: 'Subscription',
      assistantIdentity: { key: 'raw:2', id: 'm-2' },
      finality: { decisionIsFinal: false, decisionReason: 'assistant_still_mutating' },
      safeUpdate: { accepted: true, snapshotSequence: 1 },
    });
    collector.recordEvent({
      source: 'Polling',
      assistantIdentity: { key: 'raw:2', id: 'm-2' },
      finality: { decisionIsFinal: true, decisionReason: 'explicit_final_status' },
      safeUpdate: { accepted: true, snapshotSequence: 2 },
    });

    const events = collector.getSnapshot().turns[0].events;
    expect(events).toHaveLength(2);
    expect(events[0].source).toBe('subscription');
    expect(events[0].finality.decisionIsFinal).toBe(false);
    expect(events[1].source).toBe('polling');
    expect(events[1].finality.decisionIsFinal).toBe(true);
  });

  it('window copy helper returns shareable json', () => {
    const collector = createS2V8TraceCollector({
      enabled: true,
      buildSha: 'abc999',
      buildTimestamp: '2026-01-01T00:00:00.000Z',
    });
    collector.recordEvent({
      source: 'Hydration',
      assistantIdentity: { key: 'raw:4' },
      safeUpdate: { accepted: true, snapshotSequence: 1 },
    });
    const target = {};
    collector.expose(target);
    expect(typeof target.copyS2V8Trace).toBe('function');
    const copied = target.copyS2V8Trace();
    expect(typeof copied).toBe('string');
    expect(copied).toContain('"schema": "s2-v8-trace-v1"');
    expect(copied).toContain('"sha": "abc999"');
  });
});
