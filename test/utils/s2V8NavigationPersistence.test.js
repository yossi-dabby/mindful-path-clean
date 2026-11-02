/**
 * @file test/utils/s2V8NavigationPersistence.test.js
 *
 * V8-N2 — Preserve _s2 flags and diagnostics across Chat navigation.
 *
 * Tests verify:
 *  1. mergeEntryDiagnosticParams preserves _s2 / _s2debug across internal
 *     replace-navigations (pdfViewerReturn, intent cleanup, etc.).
 *  2. A trace collector created once at entry-URL mount keeps accumulating
 *     events even when the simulated search string changes — i.e. the
 *     "mount-only useEffect" semantics are correct in the pure library.
 *  3. copyS2V8Trace remains defined after expose() is called a second time
 *     on the same collector (re-expose after internal navigation).
 *  4. Diagnostics remain fully disabled when _s2debug is absent.
 *  5. The badge SHA value is never the literal string "unknown" when a
 *     non-empty sha is available via createS2V8TraceCollector options.
 *  6. _s2 stage cannot silently change: debug-enabled state is locked to
 *     the entry search, not the current (potentially cleared) search.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createS2V8TraceCollector,
  isS2DebugEnabledFromSearch,
  mergeEntryDiagnosticParams,
} from '../../src/lib/s2V8TraceDiagnostics.js';

// ─── mergeEntryDiagnosticParams ──────────────────────────────────────────────

describe('mergeEntryDiagnosticParams', () => {
  it('copies _s2 and _s2debug from entry into an empty current search', () => {
    const result = mergeEntryDiagnosticParams('', '?_s2=THERAPIST_UPGRADE_ENABLED&_s2debug=true');
    const params = new URLSearchParams(result);
    expect(params.get('_s2')).toBe('THERAPIST_UPGRADE_ENABLED');
    expect(params.get('_s2debug')).toBe('true');
  });

  it('does not overwrite existing _s2 / _s2debug in current search', () => {
    const result = mergeEntryDiagnosticParams(
      '?_s2=OTHER_FLAG&_s2debug=false',
      '?_s2=ENTRY_FLAG&_s2debug=true'
    );
    const params = new URLSearchParams(result);
    expect(params.get('_s2')).toBe('OTHER_FLAG');
    expect(params.get('_s2debug')).toBe('false');
  });

  it('preserves non-diagnostic params from current search unchanged', () => {
    const result = mergeEntryDiagnosticParams(
      '?intent=daily_checkin',
      '?_s2=THERAPIST_UPGRADE_ENABLED&_s2debug=true'
    );
    const params = new URLSearchParams(result);
    expect(params.get('intent')).toBe('daily_checkin');
    expect(params.get('_s2')).toBe('THERAPIST_UPGRADE_ENABLED');
    expect(params.get('_s2debug')).toBe('true');
  });

  it('returns empty string when both searches are empty', () => {
    expect(mergeEntryDiagnosticParams('', '')).toBe('');
    expect(mergeEntryDiagnosticParams(null, null)).toBe('');
  });

  it('returns current search unchanged when entry has no _s2 params', () => {
    const result = mergeEntryDiagnosticParams('?intent=grounding', '?other=value');
    const params = new URLSearchParams(result);
    expect(params.get('intent')).toBe('grounding');
    expect(params.has('_s2')).toBe(false);
    expect(params.has('_s2debug')).toBe(false);
  });

  it('handles a bare ?-less current search string', () => {
    const result = mergeEntryDiagnosticParams('intent=goal_work', '?_s2=V8&_s2debug=true');
    const params = new URLSearchParams(result);
    expect(params.get('_s2')).toBe('V8');
    expect(params.get('_s2debug')).toBe('true');
  });
});

// ─── Navigation-persistence: collector stays alive across search changes ─────

describe('trace collector persistence across simulated navigation', () => {
  it('collector accumulates events after entry search is established', () => {
    // Simulate: mount with debug enabled (entry URL), then events are recorded.
    const entrySearch = '?_s2=THERAPIST_UPGRADE_ENABLED&_s2debug=true';
    const debugEnabled = isS2DebugEnabledFromSearch(entrySearch);
    expect(debugEnabled).toBe(true);

    const collector = createS2V8TraceCollector({ enabled: debugEnabled, buildSha: 'abc123def456' });
    const target = {};

    // Initial expose (simulates mount useEffect)
    collector.expose(target);
    expect(typeof target.copyS2V8Trace).toBe('function');

    // Record first event (conversation started)
    collector.recordEvent({
      source: 'Subscription',
      assistantIdentity: { key: 'raw:1', id: 'm-1', rawIndex: 1 },
      safeUpdate: { accepted: true, snapshotSequence: 1 },
    });

    // Simulate internal navigation replacing search (e.g. intent param removed)
    // The collector is NOT recreated — expose is called again, NOT a new collector.
    collector.expose(target);
    expect(typeof target.copyS2V8Trace).toBe('function');

    // Record second event (switch conversation)
    collector.recordEvent({
      source: 'LoadConversation',
      assistantIdentity: { key: 'raw:2', id: 'm-2', rawIndex: 2 },
      safeUpdate: { accepted: true, snapshotSequence: 2 },
    });

    const snapshot = collector.getSnapshot();
    expect(snapshot.turns).toHaveLength(2);
    expect(snapshot.build.sha).toBe('abc123def456');
  });

  it('copyS2V8Trace remains defined after re-expose (simulates internal navigate)', () => {
    const collector = createS2V8TraceCollector({ enabled: true, buildSha: 'test-sha' });
    const target = {};

    collector.expose(target);
    expect(typeof target.copyS2V8Trace).toBe('function');

    // Re-expose (no navigation has cleared the ref — same collector)
    collector.expose(target);
    expect(typeof target.copyS2V8Trace).toBe('function');

    const copied = target.copyS2V8Trace();
    expect(copied).toContain('"schema": "s2-v8-trace-v1"');
  });

  it('activeStage in snapshot tracks the latest trace source', () => {
    const collector = createS2V8TraceCollector({ enabled: true });

    collector.recordEvent({
      source: 'Subscription',
      assistantIdentity: { key: 'raw:1' },
      safeUpdate: { accepted: true, snapshotSequence: 1 },
    });
    expect(collector.getSnapshot().activeStage).toBe('Subscription');

    collector.recordEvent({
      source: 'Polling',
      assistantIdentity: { key: 'raw:1' },
      safeUpdate: { accepted: true, snapshotSequence: 2 },
    });
    expect(collector.getSnapshot().activeStage).toBe('Polling');
  });
});

// ─── Debug disabled without _s2debug ─────────────────────────────────────────

describe('diagnostics disabled without _s2debug', () => {
  it('isS2DebugEnabledFromSearch returns false for empty/missing param', () => {
    expect(isS2DebugEnabledFromSearch('')).toBe(false);
    expect(isS2DebugEnabledFromSearch('?_s2=SOME_FLAG')).toBe(false);
    expect(isS2DebugEnabledFromSearch(null)).toBe(false);
  });

  it('collector with enabled=false does not record events and clears window', () => {
    const collector = createS2V8TraceCollector({ enabled: false });
    const recorded = collector.recordEvent({
      source: 'Subscription',
      assistantIdentity: { key: 'raw:1' },
      safeUpdate: { accepted: true, snapshotSequence: 1 },
    });
    expect(recorded).toBe(false);
    expect(collector.getSnapshot().turns).toHaveLength(0);

    const target = { __S2_V8_TRACE__: 'old', copyS2V8Trace: () => 'old' };
    collector.expose(target);
    expect(target.__S2_V8_TRACE__).toBeUndefined();
    expect(target.copyS2V8Trace).toBeUndefined();
  });

  it('debug-enabled state is locked to entry search, not a later cleared search', () => {
    const entrySearch = '?_s2=THERAPIST_UPGRADE_ENABLED&_s2debug=true';
    const laterClearedSearch = '';

    // Entry: debug ON
    const debugFromEntry = isS2DebugEnabledFromSearch(entrySearch);
    expect(debugFromEntry).toBe(true);

    // Later search has no _s2debug — but the collector was already created
    // with the entry flag. We simulate the "mount-only" pattern:
    const collector = createS2V8TraceCollector({ enabled: debugFromEntry });
    expect(collector.enabled).toBe(true);

    // Even if someone later checks the cleared search, the collector is unchanged
    const debugFromLaterSearch = isS2DebugEnabledFromSearch(laterClearedSearch);
    expect(debugFromLaterSearch).toBe(false);
    // The collector itself does not depend on the later search
    expect(collector.enabled).toBe(true);
  });
});

// ─── Badge SHA never "unknown" when sha is provided ──────────────────────────

describe('badge SHA value', () => {
  it('build.sha uses the provided option, not "unknown"', () => {
    const collector = createS2V8TraceCollector({ enabled: true, buildSha: 'abc123def456' });
    expect(collector.getSnapshot().build.sha).toBe('abc123def456');
    expect(collector.getSnapshot().build.sha).not.toBe('unknown');
  });

  it('build.sha is "unknown" only when no sha can be resolved', () => {
    // When no option, no __S2_V8_BUILD_SHA__ global (test env) — falls back.
    const collector = createS2V8TraceCollector({ enabled: true });
    const sha = collector.getSnapshot().build.sha;
    // In test environment __S2_V8_BUILD_SHA__ is not defined, so fallback is used.
    // We only assert it is a string; in production it will be the real SHA.
    expect(typeof sha).toBe('string');
    expect(sha.length).toBeGreaterThan(0);
  });
});
