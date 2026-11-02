const SAFE_PAGE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

export function createPageUrl(pageName, queryString) {
    const normalizedPageName = String(pageName || '').trim().replace(/ /g, '-');
    // React Router 6 can reinterpret attacker-controlled slash/backslash paths
    // as external redirects. App routes are named identifiers, so reject any
    // value that is not a single safe route segment.
    if (!SAFE_PAGE_NAME_PATTERN.test(normalizedPageName)) return '/';
    const path = `/${normalizedPageName}`;
    const normalizedQuery = String(queryString || '').replace(/^\?+/, '');
    return normalizedQuery ? `${path}?${normalizedQuery}` : path;
}
