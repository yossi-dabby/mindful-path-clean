const BUNDLE_ID = 'me.mindfulpath.app';
const ASSOCIATION_PATHS = new Set([
  '/.well-known/apple-app-site-association',
  '/apple-app-site-association',
]);

/**
 * The App ID prefix is public configuration supplied after Apple enrollment.
 * Never serve a placeholder association or let this route fall through to HTML.
 */
export function handleAppleAppSiteAssociation(req, res, prefix = process.env.APPLE_APP_ID_PREFIX) {
  if (!ASSOCIATION_PATHS.has(new URL(req.url, 'http://localhost').pathname)) return false;
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  };
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { ...headers, Allow: 'GET, HEAD' });
    res.end();
    return true;
  }

  const appIdPrefix = String(prefix || '').trim();
  if (!/^[A-Z0-9]{10}$/.test(appIdPrefix)) {
    res.writeHead(503, headers);
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ error: 'iOS app association is not configured.' }));
    return true;
  }

  const association = {
    applinks: {
      apps: [],
      details: [{
        appID: `${appIdPrefix}.${BUNDLE_ID}`,
        paths: ['/native-auth-callback'],
      }],
    },
  };
  res.writeHead(200, { ...headers, 'Cache-Control': 'public, max-age=3600' });
  res.end(req.method === 'HEAD' ? undefined : JSON.stringify(association));
  return true;
}
