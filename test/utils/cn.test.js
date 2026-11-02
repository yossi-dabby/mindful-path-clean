import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  const mockWindow = {};
  mockWindow.self = mockWindow;
  mockWindow.top = mockWindow;
  globalThis.window = mockWindow;
});

import { cn } from '../../src/lib/utils.js';

describe('cn (class name utility)', () => {
  describe('basic usage', () => {
    it('returns a single class string unchanged', () => {
      expect(cn('text-red-500')).toBe('text-red-500');
    });

    it('combines multiple class strings', () => {
      expect(cn('flex', 'items-center')).toBe('flex items-center');
    });

    it('includes conditional class when condition is true', () => {
      expect(cn({ active: true })).toBe('active');
    });

    it('excludes conditional class when condition is false', () => {
      expect(cn({ active: false })).toBe('');
    });

    it('handles mixed strings and conditional class names', () => {
      expect(cn('base', { active: true, disabled: false })).toBe('base active');
    });

    it('merges conflicting tailwind classes (last one wins)', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });
  });

  describe('edge cases', () => {
    it('returns an empty string when called with no arguments', () => {
      expect(cn()).toBe('');
    });

    it('returns an empty string for an empty string input', () => {
      expect(cn('')).toBe('');
    });

    it('handles null gracefully and returns an empty string', () => {
      expect(cn(null)).toBe('');
    });

    it('handles undefined gracefully and returns an empty string', () => {
      expect(cn(undefined)).toBe('');
    });

    it('handles a mix of null, undefined, and empty strings', () => {
      expect(cn(null, undefined, '')).toBe('');
    });

    it('filters out falsy values and returns remaining valid classes', () => {
      expect(cn(null, 'flex', undefined, 'gap-2')).toBe('flex gap-2');
    });
  });
});
