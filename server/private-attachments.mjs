// File-shaped URLs are required by Base44's PDF/audio consumers. Authorization
// and decryption remain in the Base44 function. This relay never signs storage
// objects, stores plaintext, receives keys, or accepts a caller-selected host.
const UPSTREAM = 'https://mindful-path-75aeaf7d.base44.app/functions/uploadAttachment';
const MAX_BYTES = 10 * 1024 * 1024;
const MIME = {
  pdf: ['application/pdf'], txt: ['text/plain'], csv: ['text/csv'],
  png: ['image/png'], jpg: ['image/jpeg', 'image/jpg'], webp: ['image/webp'], gif: ['image/gif'],
  mp3: ['audio/mpeg', 'audio/mp3'], m4a: ['audio/mp4', 'audio/x-m4a'],
  wav: ['audio/wav', 'audio/x-wav'], webm: ['audio/webm', 'video/webm'], ogg: ['audio/ogg'],
};
const HEADERS = {
  'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
  'Content-Security-Policy': "default-src 'none'; sandbox",
};

export function createPrivateAttachmentHandler({ fetchFile = fetch, upstream = UPSTREAM } = {}) {
  return async function handlePrivateAttachment(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/private-attachments/')) return false;
    const reply = (status) => { res.writeHead(status, HEADERS); res.end(); return true; };
    if (req.method === 'OPTIONS') { res.writeHead(204, { ...HEADERS, 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Allow-Headers': 'Range' }); res.end(); return true; }
    if (!['GET', 'HEAD'].includes(req.method)) return reply(405);
    const match = /^\/api\/private-attachments\/([a-f0-9]{24})\/attachment\.([a-z0-9]+)$/.exec(url.pathname);
    const token = url.searchParams.get('token');
    if (!match || !Object.hasOwn(MIME, match[2]) || !/^\d{10}\.\d{10}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/.test(token || '')) return reply(403);
    if (url.searchParams.get('attachment') && url.searchParams.get('attachment') !== match[1]) return reply(403);
    const target = new URL(upstream); target.searchParams.set('attachment', match[1]); target.searchParams.set('token', token);
    try {
      const headers = req.headers.range ? { Range: req.headers.range } : {};
      const response = await fetchFile(target, { method: req.method, headers, redirect: 'error', signal: AbortSignal.timeout(30000), cache: 'no-store' });
      if (![200, 206].includes(response.status)) return reply([401, 403, 404, 416].includes(response.status) ? response.status : 503);
      const type = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
      if (!MIME[match[2]].includes(type)) return reply(503);
      const declared = Number(response.headers.get('content-length'));
      if (declared > MAX_BYTES) { await response.body?.cancel(); return reply(503); }
      const outputHeaders = { ...HEADERS, 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Disposition': `inline; filename="attachment.${match[2]}"` };
      if (response.headers.has('content-range')) outputHeaders['Content-Range'] = response.headers.get('content-range');
      if (req.method === 'HEAD') {
        if (response.headers.has('content-length')) outputHeaders['Content-Length'] = response.headers.get('content-length');
        res.writeHead(response.status, outputHeaders); res.end(); return true;
      }
      if (!response.body) return reply(503);
      const reader = response.body.getReader(); const chunks = []; let total = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read(); if (done) break;
          total += value.byteLength;
          if (total > MAX_BYTES) { await reader.cancel(); return reply(503); }
          chunks.push(Buffer.from(value));
        }
      } finally { reader.releaseLock(); }
      if (!total) return reply(503);
      outputHeaders['Content-Length'] = String(total);
      res.writeHead(response.status, outputHeaders); res.end(Buffer.concat(chunks)); return true;
    } catch { return reply(503); }
  };
}
