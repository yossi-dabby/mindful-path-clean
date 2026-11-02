import { describe, it, expect } from 'vitest';
import {
  CONTEXT_COMPOSER_V2_BUDGET_CHARS,
  CONTEXT_COMPOSER_V2_OMISSION_REASONS,
  CONTEXT_COMPOSER_V2_FALLBACK_REASONS,
  CONTEXT_COMPOSER_V2_PARITY_STATUS,
  createContextComposerV2,
} from '../../src/lib/contextComposerV2.js';

describe('contextComposerV2', () => {
  it('returns immutable structured sections in explicit order', () => {
    const composer = createContextComposerV2({ budget_chars: 500 });
    composer.registerSection({ id: 'b', order: 20, retention_priority: 20, required: false, source_layer: 'x', content: 'B' });
    composer.registerSection({ id: 'a', order: 10, retention_priority: 10, required: true, source_layer: 'x', content: 'A' });
    const result = composer.finalize();
    expect(result.rendered).toBe('A\n\nB');
    expect(result.sections.map((section) => section.id)).toEqual(['a', 'b']);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.sections[0])).toBe(true);
    expect(result.diagnostic.fallback_used).toBe(false);
    expect(result.diagnostic.parity_match).toBe(false);
    expect(result.diagnostic.parity_status).toBe(CONTEXT_COMPOSER_V2_PARITY_STATUS.not_compared);
    expect(result.diagnostic.fallback_reason).toBeNull();
  });

  it('rejects duplicate ids without duplicate output', () => {
    const composer = createContextComposerV2();
    composer.registerSection({ id: 'a', order: 10, retention_priority: 10, required: true, source_layer: 'x', content: 'A' });
    expect(() => composer.registerSection({ id: 'a', order: 20, retention_priority: 20, required: false, source_layer: 'x', content: 'B' })).toThrow(/Duplicate/);
  });

  it('drops lowest-priority optional sections first and never partially truncates sections', () => {
    const composer = createContextComposerV2({ budget_chars: 8 });
    composer.registerSection({ id: 'req', order: 10, retention_priority: 100, required: true, source_layer: 'x', content: 'REQ' });
    composer.registerSection({ id: 'low', order: 20, retention_priority: 1, required: false, source_layer: 'x', content: 'LOW' });
    composer.registerSection({ id: 'high', order: 30, retention_priority: 9, required: false, source_layer: 'x', content: 'HIGH' });
    const result = composer.finalize();
    expect(result.rendered).toBe('REQ');
    expect(result.sections.find((section) => section.id === 'low').omission_reason).toBe(CONTEXT_COMPOSER_V2_OMISSION_REASONS.budget);
    expect(result.sections.find((section) => section.id === 'high').omission_reason).toBe(CONTEXT_COMPOSER_V2_OMISSION_REASONS.budget);
    // Budget eviction is NOT a fallback — must return composed output
    expect(result.diagnostic.fallback_used).toBe(false);
    expect(result.diagnostic.budget_exceeded).toBe(true);
    expect(result.diagnostic.parity_status).toBe(CONTEXT_COMPOSER_V2_PARITY_STATUS.intentional_budget_difference);
  });

  it('keeps required sections even when required content alone exceeds budget', () => {
    const composer = createContextComposerV2({ budget_chars: 2 });
    composer.registerSection({ id: 'req', order: 10, retention_priority: 100, required: true, source_layer: 'x', content: 'REQUIRED' });
    const result = composer.finalize();
    expect(result.rendered).toBe('REQUIRED');
    expect(result.diagnostic.budget_exceeded).toBe(true);
    // Required-only exceeding budget is not a fallback either
    expect(result.diagnostic.fallback_used).toBe(false);
    expect(result.diagnostic.parity_status).toBe(CONTEXT_COMPOSER_V2_PARITY_STATUS.intentional_budget_difference);
  });

  it('parity mismatch under budget fails open to legacy with explicit bounded reason code', () => {
    const composer = createContextComposerV2({ budget_chars: CONTEXT_COMPOSER_V2_BUDGET_CHARS });
    composer.registerSection({ id: 'a', order: 10, retention_priority: 10, required: true, source_layer: 'x', content: 'A' });
    const result = composer.finalize({ fallbackRendered: 'LEGACY' });
    expect(result.rendered).toBe('LEGACY');
    expect(result.diagnostic.fallback_used).toBe(true);
    expect(result.diagnostic.fallback_reason).toBe(CONTEXT_COMPOSER_V2_FALLBACK_REASONS.parity_mismatch);
    expect(result.diagnostic.parity_match).toBe(false);
    expect(result.diagnostic.parity_status).toBe(CONTEXT_COMPOSER_V2_PARITY_STATUS.invariant_mismatch);
    expect(JSON.stringify(result.diagnostic)).not.toContain('"A"');
  });

  it('budget eviction with fallbackRendered returns composed output — not legacy', () => {
    const composer = createContextComposerV2({ budget_chars: 8 });
    composer.registerSection({ id: 'req', order: 10, retention_priority: 100, required: true, source_layer: 'x', content: 'REQ' });
    composer.registerSection({ id: 'opt', order: 20, retention_priority: 1, required: false, source_layer: 'x', content: 'OPTIONAL_LONG_TEXT' });
    const result = composer.finalize({ fallbackRendered: 'LEGACY_FULL_OUTPUT' });
    // Budget was exceeded, optional was evicted, composed output is 'REQ' — NOT the legacy string
    expect(result.rendered).toBe('REQ');
    expect(result.diagnostic.fallback_used).toBe(false);
    expect(result.diagnostic.budget_exceeded).toBe(true);
    expect(result.diagnostic.parity_status).toBe(CONTEXT_COMPOSER_V2_PARITY_STATUS.intentional_budget_difference);
  });

  it('exact parity: parity_status is exact_match when composed matches fallback under budget', () => {
    const composer = createContextComposerV2({ budget_chars: CONTEXT_COMPOSER_V2_BUDGET_CHARS });
    composer.registerSection({ id: 'a', order: 10, retention_priority: 10, required: true, source_layer: 'x', content: 'SAME' });
    const result = composer.finalize({ fallbackRendered: 'SAME' });
    expect(result.rendered).toBe('SAME');
    expect(result.diagnostic.fallback_used).toBe(false);
    expect(result.diagnostic.parity_match).toBe(true);
    expect(result.diagnostic.parity_status).toBe(CONTEXT_COMPOSER_V2_PARITY_STATUS.exact_match);
  });

  it('emitted_section_ids and omitted_section_ids are present in diagnostic', () => {
    const composer = createContextComposerV2({ budget_chars: 8 });
    composer.registerSection({ id: 'req', order: 10, retention_priority: 100, required: true, source_layer: 'x', content: 'REQ' });
    composer.registerSection({ id: 'opt', order: 20, retention_priority: 1, required: false, source_layer: 'x', content: 'OPT_LONG' });
    const result = composer.finalize();
    expect(result.diagnostic.emitted_section_ids).toContain('req');
    expect(result.diagnostic.omitted_section_ids).toContain('opt');
    expect(result.diagnostic.context_composer_used).toBe(true);
  });
});
