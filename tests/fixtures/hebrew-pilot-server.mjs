// Test-only verifier injection. No production environment switch bypasses auth.
import { createAppServer } from '../../server/index.mjs';
const server = await createAppServer({ verifyAdmin: async (token) => ({ status: token === 'pilot-admin-fixture' ? 200 : token === 'pilot-user-fixture' ? 403 : 401 }) });
server.listen(3005, '127.0.0.1');
