/**
 * downloadPdfFile — safe, browser-native PDF download helper.
 *
 * Strategy:
 *  1. For same-origin and relative URLs (e.g. /forms/en/adults/…), create an
 *     <a download> anchor and click it — this triggers a real browser download.
 *  2. For other URLs, fetch the file as a Blob, create a temporary object URL,
 *     click a temporary anchor, then revoke the object URL.
 *
 * Security:
 *  - Only accepts string URLs; returns early for falsy/non-string values.
 *  - Uses `rel="noopener noreferrer"` on the anchor.
 *  - Object URLs are always revoked, even on error.
 *  - Never accepts arbitrary non-string data.
 *
 * @param {string} url       - The PDF URL to download.
 * @param {string} [filename] - The suggested filename for the downloaded file.
 * @returns {Promise<void>}
 */
export async function downloadPdfFile(url, filename) {
  if (!url || typeof url !== 'string') return;
  const safeFilename = (filename && typeof filename === 'string' && filename.trim())
    ? filename.trim()
    : 'therapeutic-form.pdf';

  const isSameOrigin =
    url.startsWith('/') ||
    (typeof window !== 'undefined' && url.startsWith(window.location.origin));

  if (isSameOrigin) {
    _triggerAnchorDownload(url, safeFilename);
    return;
  }

  // Cross-origin: fetch as blob so browser sees it as a local URL with no
  // Content-Disposition issues.
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) throw new Error(`[downloadPdfFile] Fetch failed: ${response.status}`);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  try {
    _triggerAnchorDownload(blobUrl, safeFilename);
  } finally {
    // Revoke after 30 seconds to give the browser ample time to start the download
    // while still freeing the object URL. The HTML spec requires the URL to stay
    // alive until the download has been initiated; 30 s is a safe conservative bound.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  }
}

function _triggerAnchorDownload(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
