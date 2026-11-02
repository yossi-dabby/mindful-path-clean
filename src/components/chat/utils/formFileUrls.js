/**
 * Open/Download URL builders are intentionally separate so behavior can diverge
 * without changing call sites (e.g. viewer route for open vs attachment route for download).
 */
const URL_PARSE_FALLBACK_BASE = 'https://example.local';
export const PDF_VIEWER_ROUTE_PATH = '/pdf-viewer';

function normalizePdfPath(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed, typeof window !== 'undefined' ? window.location.origin : URL_PARSE_FALLBACK_BASE);
    parsed.searchParams.delete('download');
    const isRelative = trimmed.startsWith('/');
    const isSameOrigin = isRelative || (typeof window !== 'undefined' && parsed.origin === window.location.origin);
    if (!isSameOrigin) {
      return parsed.toString();
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return trimmed;
  }
}

export function resolvePdfViewerFileParam(fileParam) {
  if (typeof fileParam !== 'string' || !fileParam.trim()) return null;

  try {
    const decoded = decodeURIComponent(fileParam.trim());
    const parsed = new URL(decoded, URL_PARSE_FALLBACK_BASE);
    parsed.searchParams.delete('download');
    const normalizedPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!normalizedPath.startsWith('/forms/')) return null;
    if (!/\.pdf(?:$|[?#])/i.test(normalizedPath)) return null;
    return normalizedPath;
  } catch {
    return null;
  }
}

export function getFormOpenUrl(url) {
  const normalized = normalizePdfPath(url);
  if (!normalized) return null;
  if (!normalized.startsWith('/')) return normalized;
  return `${PDF_VIEWER_ROUTE_PATH}?file=${encodeURIComponent(normalized)}`;
}

export function getFormDownloadUrl(url) {
  const normalized = normalizePdfPath(url);
  if (!normalized) return null;

  if (!normalized.startsWith('/')) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized, typeof window !== 'undefined' ? window.location.origin : URL_PARSE_FALLBACK_BASE);
    parsed.searchParams.set('download', '1');
    const downloadUrl = parsed.pathname + parsed.search + parsed.hash;
    return downloadUrl;
  } catch {
    return normalized;
  }
}
