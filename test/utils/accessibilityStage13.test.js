import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

describe('Stage 13 accessibility and RTL/LTR architecture', () => {
  it('wires a route announcer and focus manager inside the router', () => {
    const app = read('src/App.jsx');
    const manager = read('src/components/accessibility/AccessibilityManager.jsx');

    expect(app).toContain('<AccessibilityManager />');
    expect(manager).toContain('aria-live="polite"');
    expect(manager).toContain('aria-atomic="true"');
    expect(manager).toContain("main.focus({ preventScroll: true })");
  });

  it('applies automatic bidi direction to user-editable and user-generated content', () => {
    const manager = read('src/components/accessibility/AccessibilityManager.jsx');
    const css = read('src/globals.css');

    expect(manager).toContain('input:not([dir])');
    expect(manager).toContain("[data-user-content]:not([dir])");
    expect(css).toContain('[dir="auto"]');
    expect(css).toContain('unicode-bidi: plaintext');
    expect(css).toContain('unicode-bidi: isolate');
  });

  it('uses logical layout properties for complete RTL mirroring', () => {
    const sidebar = read('src/components/layout/Sidebar.jsx');
    const content = read('src/components/layout/AppContent.jsx');
    const layout = read('src/Layout.jsx');

    expect(sidebar).toContain('fixed start-0');
    expect(sidebar).toContain('border-e');
    expect(content).toContain('padding-inline-start');
    expect(content).toContain('focus:start-2');
    expect(layout).toContain("isRtl ? '-100%' : '100%'");
  });

  it('keeps shared controls touch-safe at every breakpoint', () => {
    const button = read('src/components/ui/button.jsx');
    const input = read('src/components/ui/input.jsx');
    const select = read('src/components/ui/select.jsx');
    const switchSource = read('src/components/ui/switch.jsx');
    const checkbox = read('src/components/ui/checkbox.jsx');

    expect(button).not.toContain('min-h-[44px] md:min-h-0');
    expect(input).not.toContain('min-h-[44px] md:min-h-0');
    expect(select).not.toContain('min-h-[44px] md:min-h-0');
    expect(switchSource).toContain('after:-inset-y-2.5');
    expect(checkbox).toContain('after:-inset-2.5');
  });

  it('honours reduced motion and text scaling', () => {
    const css = read('src/globals.css');
    const layout = read('src/Layout.jsx');

    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('text-size-adjust: 100%');
    expect(css).toContain('min-block-size: 2.75rem');
    expect(layout).toContain('useReducedMotion');
  });

  it('uses an accessible teal for text and primary actions', () => {
    const tailwind = read('tailwind.config.js');
    const css = read('src/globals.css');

    expect(tailwind).toContain("600: '#0f766e'");
    expect(css).toContain('--primary: 175 77% 27%');
    expect(css).toContain('--ring: 175 77% 27%');
  });

  it('does not leave the recommendation card as a pointer-only control', () => {
    const source = read('src/components/exercises/AiExerciseRecommendations.jsx');
    expect(source).not.toMatch(/<Card[^>]+onClick=/);
  });
});
