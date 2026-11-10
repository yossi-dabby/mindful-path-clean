import { afterAll, beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { createServer } from 'node:http';
import { createPrivateAttachmentHandler } from '../../server/private-attachments.mjs';

const ID = 'a12345678901234567890123';
const TOKEN = `1794254400.1794254700.${'a'.repeat(22)}.${'b'.repeat(43)}`;
describe('bounded private-file relay', () => {
  let server, origin; const fetchFile = vi.fn();
  beforeAll(async () => {
    const handler = createPrivateAttachmentHandler({ fetchFile });
    server = createServer(async (req, res) => { if (!await handler(req, res)) { res.writeHead(404); res.end(); } });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  beforeEach(() => { fetchFile.mockReset(); });
  const url = () => `${origin}/api/private-attachments/${ID}/attachment.pdf?token=${TOKEN}`;
  it('relays a file-shaped URL without forwarding credentials or a caller-selected target', async () => {
    fetchFile.mockResolvedValue(new Response('%PDF-test', { headers: { 'Content-Type': 'application/pdf' } }));
    const result = await fetch(url() + '&upstream=https://attacker.example', { headers: { Authorization: 'Bearer ignored', Cookie: 'private=ignored' } });
    expect(result.status).toBe(200); expect(await result.text()).toBe('%PDF-test');
    expect(result.headers.get('content-type')).toBe('application/pdf');
    expect(result.headers.get('cache-control')).toContain('no-store');
    expect(result.headers.get('location')).toBeNull();
    const [target, options] = fetchFile.mock.calls[0];
    expect(target.origin).toBe('https://mindful-path-75aeaf7d.base44.app');
    expect(target.pathname).toBe('/functions/uploadAttachment');
    expect(target.searchParams.get('attachment')).toBe(ID);
    expect(target.searchParams.get('token')).toBe(TOKEN);
    expect(options.headers).toEqual({}); expect(options.redirect).toBe('error');
  });
  it.each([401, 403, 404, 416])('preserves authorization/range failure %s and hides upstream bodies', async status => {
    fetchFile.mockResolvedValue(new Response('private upstream details', { status }));
    const result = await fetch(url()); expect(result.status).toBe(status); expect(await result.text()).toBe('');
  });
  it('rejects absent or malformed capabilities before fetching', async () => {
    for (const target of [url().split('?')[0], url().replace(TOKEN, 'bad'), url() + '&attachment=b12345678901234567890123', url().replace('.pdf', '.html')]) {
      expect((await fetch(target)).status).toBe(403);
    }
    expect(fetchFile).not.toHaveBeenCalled();
  });
  it('does not proxy mutations', async () => {
    expect((await fetch(url(), { method: 'POST', body: 'test' })).status).toBe(405); expect(fetchFile).not.toHaveBeenCalled();
  });
  it('supports HEAD and forwards only Range for partial media requests', async () => {
    fetchFile.mockResolvedValueOnce(new Response(null, { headers: { 'Content-Type': 'application/pdf', 'Content-Length': '50' } }));
    const head = await fetch(url(), { method: 'HEAD' }); expect(head.status).toBe(200); expect(await head.text()).toBe(''); expect(head.headers.get('content-length')).toBe('50');
    fetchFile.mockResolvedValueOnce(new Response('PDF', { status: 206, headers: { 'Content-Type': 'application/pdf', 'Content-Range': 'bytes 1-3/50' } }));
    const part = await fetch(url(), { headers: { Range: 'bytes=1-3' } }); expect(part.status).toBe(206); expect(await part.text()).toBe('PDF'); expect(part.headers.get('content-range')).toBe('bytes 1-3/50');
    expect(fetchFile.mock.calls[1][1].headers).toEqual({ Range: 'bytes=1-3' });
  });
  it('rejects redirects, wrong content types, empty files and oversized bodies', async () => {
    for (const response of [new Response(null, { status: 302 }), new Response('bad', { headers: { 'Content-Type': 'text/html' } }), new Response('', { headers: { 'Content-Type': 'application/pdf' } }), new Response(new Uint8Array(10 * 1024 * 1024 + 1), { headers: { 'Content-Type': 'application/pdf' } })]) {
      fetchFile.mockResolvedValueOnce(response); const result = await fetch(url()); expect(result.status).toBe(503); expect(await result.text()).toBe('');
    }
  });
});
