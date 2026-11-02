import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('global safe-embrace application background', () => {
  it('is owned by the shared layout so current and future app routes inherit it', () => {
    const layout = readSource('../../src/Layout.jsx');

    expect(layout).toContain('app-global-background');
    expect(layout).toContain('app-page-transition');
    expect(layout).toContain('data-app-page-transition');
    expect(layout).toContain('data-app-page-name={currentPageName}');
  });

  it('uses one responsive asset and preserves readable page surfaces', () => {
    const styles = readSource('../../src/index.css');

    expect(styles).toContain("url('/assets/mindful-path-safe-embrace-background.webp')");
    expect(styles).toContain('background-size: cover');
    expect(styles).toContain('@media (max-width: 767px)');
    expect(styles).toContain('.dark .app-global-background');
    expect(styles).toContain('without touching cards, dialogs or');
  });

  it('ships the optimized background asset', () => {
    const assetUrl = new URL('../../public/assets/mindful-path-safe-embrace-background.webp', import.meta.url);

    expect(existsSync(assetUrl)).toBe(true);
    expect(statSync(assetUrl).size).toBeGreaterThan(10_000);
    expect(statSync(assetUrl).size).toBeLessThan(100_000);
  });
});
