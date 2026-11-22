import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createAppServer } from '../../server/index.mjs';

describe('iOS verified app association over public HTTP', () => {
  let server, origin;
  const verifyAdmin = vi.fn(async () => ({ status: 401 }));
  beforeAll(async () => {
    server = await createAppServer({ verifyAdmin });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterEach(() => vi.unstubAllEnvs());
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  it.each(['/.well-known/apple-app-site-association', '/apple-app-site-association'])(
    'serves %s without authentication, redirects, or SPA fallback', async (path) => {
      vi.stubEnv('APPLE_APP_ID_PREFIX', 'A1B2C3D4E5');
      const response = await fetch(origin + path, { redirect: 'manual' });
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(response.headers.get('location')).toBeNull();
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(await response.json()).toEqual({
        applinks: { apps: [], details: [{ appID: 'A1B2C3D4E5.me.mindfulpath.app', paths: ['/native-auth-callback'] }] },
      });
      expect(verifyAdmin).not.toHaveBeenCalled();
    });

  it.each(['', 'TEAM_ID', 'too-short', 'A1B2C3D4E5.other.app', '<script>'])(
    'reports unconfigured association for invalid prefix %s without pretending to be ready', async (prefix) => {
      vi.stubEnv('APPLE_APP_ID_PREFIX', prefix);
      const response = await fetch(origin + '/.well-known/apple-app-site-association');
      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.json()).toEqual({ error: 'iOS app association is not configured.' });
    });

  it('supports HEAD and rejects writes', async () => {
    vi.stubEnv('APPLE_APP_ID_PREFIX', 'A1B2C3D4E5');
    const head = await fetch(origin + '/.well-known/apple-app-site-association', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    const post = await fetch(origin + '/.well-known/apple-app-site-association', { method: 'POST' });
    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET, HEAD');
  });
});
