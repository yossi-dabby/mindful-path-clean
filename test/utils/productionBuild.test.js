import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfigFromFile, resolveConfig } from 'vite';

afterEach(() => vi.unstubAllEnvs());

describe('production build configuration', () => {
  it.each(['true', 'false', ''])('ships minified output when CI=%s', async (ci) => {
    vi.stubEnv('CI', ci);
    const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' });
    const resolved = await resolveConfig({ ...loaded.config, configFile: false }, 'build');
    expect(resolved.build.minify).toBe('esbuild');
  });
});
