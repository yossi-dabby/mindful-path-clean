import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import serveHandler from 'serve-handler';
import { createAdminVerifier, createPilotHandler, loadPilot } from './hebrew-pilot.mjs';
import { handlePublicInformation } from './public-information.mjs';
import { createPrivateAttachmentHandler } from './private-attachments.mjs';

export async function createAppServer({ verifyAdmin, pilot, distRoot } = {}) {
  const handlePilot = createPilotHandler({
    pilot: pilot || await loadPilot(),
    verifyAdmin: verifyAdmin || createAdminVerifier(process.env.BASE44_APP_ID || process.env.VITE_BASE44_APP_ID),
  });
  const securityHeaders = JSON.parse(await readFile(new URL('../serve.json', import.meta.url), 'utf8')).headers;
  const handleAttachment = createPrivateAttachmentHandler();
  return createServer(async (req, res) => {
    try {
      if (handlePublicInformation(req, res)) return;
      if (await handleAttachment(req, res)) return;
      if (await handlePilot(req, res)) return;
      // Only dist is public. Source files, private bundles and unknown API URLs
      // must never fall through to SPA fallback or directory listings.
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname.startsWith('/api/') || /^\/(server|base44|content|src|node_modules)(\/|$)/.test(pathname)) {
        res.writeHead(404); res.end(); return;
      }
      await serveHandler(req, res, {
        public: distRoot || fileURLToPath(new URL('../dist/', import.meta.url)),
        rewrites: [{ source: '**', destination: '/index.html' }],
        headers: securityHeaders,
        directoryListing: false,
        symlinks: false,
      });
    } catch {
      if (!res.headersSent) { res.writeHead(503, { 'Cache-Control': 'no-store' }); res.end(); }
      else res.destroy();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await createAppServer();
  server.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}
