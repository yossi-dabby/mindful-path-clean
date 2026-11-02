import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Home responsive proportions', () => {
  const css = readFileSync('src/index.css', 'utf8');

  it('keeps action and summary cards at two columns through tablet widths', () => {
    expect(css).toContain('@media (min-width: 768px) and (max-width: 1279px)');
    expect(css).toContain('[data-app-page-name="Home"] .md\\:grid-cols-4');
    expect(css).toContain('[data-app-page-name="Home"] .md\\:grid-cols-3');
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important');
  });

  it('keeps compact Home icon controls usable outside mobile', () => {
    expect(css).toContain('[data-app-page-name="Home"] button[aria-label]');
    expect(css).toContain('min-width: 40px');
    expect(css).toContain('min-height: 40px');
  });

  it('stacks check-in navigation on phones and lets long translations wrap', () => {
    expect(css).toContain('flex-direction: column-reverse');
    expect(css).toContain('min-height: 48px !important');
    expect(css).toContain('white-space: normal !important');
    expect(css).toContain('line-height: 1.25');
  });

  it('tightens only the quick-action card chrome on narrow phones', () => {
    expect(css).toContain('.grid.grid-cols-2.md\\:grid-cols-3 .p-5');
    expect(css).toContain('.grid.grid-cols-2.md\\:grid-cols-3 .w-14');
    expect(css).toContain('gap: 0.75rem');
  });
});
