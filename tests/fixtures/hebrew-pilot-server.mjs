// Test-only verifier injection. No production environment switch bypasses auth.
import { createAppServer } from '../../server/index.mjs';
import { createServer } from 'node:http';
import { handleHebrewFormsPilot } from '../../base44/functions/getHebrewFormsPilot/handler.js';
const server = await createAppServer({ verifyAdmin: async (token) => ({ status: ['pilot-admin-fixture', 'pilot-reviewer-fixture'].includes(token) ? 200 : token === 'pilot-user-fixture' ? 403 : 401 }) });
server.listen(3005, '127.0.0.1');

// The browser uses the real SDK request and the real Base44 handler. Only the
// platform's identity injection and service location are substituted in this fixture.
createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const headers = new Headers(req.headers);
  headers.set('Base44-App-Id', '69504b725a07f5aa75aeaf7d');
  const request = new Request('https://fixture.example/functions/getHebrewFormsPilot', { method: 'POST', headers, body: Buffer.concat(chunks) });
  const response = await handleHebrewFormsPilot(request, {
    createClientFromRequest: () => ({ auth: { me: async () => {
      const token = headers.get('Authorization');
      if (token === 'Bearer pilot-admin-fixture') return { id: 'fixture-admin', role: 'admin' };
      if (token === 'Bearer pilot-reviewer-fixture') return { id: 'fixture-reviewer', role: 'user' };
      if (token === 'Bearer pilot-user-fixture') return { id: 'fixture-user', role: 'user' };
      throw { status: 401 };
    } }, functions: { invoke: async () => {
      const token = headers.get('Authorization');
      return { data: { schema_version: 1, user_id: token === 'Bearer pilot-admin-fixture' ? 'fixture-admin' : token === 'Bearer pilot-reviewer-fixture' ? 'fixture-reviewer' : 'fixture-user', policy_version: '2026-11-11', adult_status: 'confirmed', eligible: true, forms_review_allowed: ['Bearer pilot-admin-fixture', 'Bearer pilot-reviewer-fixture'].includes(token) } };
    } } }),
    fetchImpl: (url, init) => {
      if (!url.startsWith('https://mindful-path-production-7704.up.railway.app/api/hebrew-forms-pilot/')) throw new Error('Unexpected service');
      // Match Workers' redirect contract; Node also accepts error and previously
      // hid the deployed TypeError from this browser fixture.
      if (!['manual', 'follow'].includes(init.redirect || 'follow')) throw new TypeError('Unsupported redirect mode');
      return fetch(`http://127.0.0.1:3005${new URL(url).pathname}${new URL(url).search}`, init);
    },
  });
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(3006, '127.0.0.1');
