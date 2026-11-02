import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const FLAG_KEYS = [
  'THERAPIST_UPGRADE_ENABLED',
  'THERAPIST_UPGRADE_MEMORY_ENABLED',
  'THERAPIST_UPGRADE_WORKFLOW_ENABLED',
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { action } = await req.json().catch(() => ({}));

  if (action === 'get') {
    const flags = {};
    for (const key of FLAG_KEYS) {
      const val = Deno.env.get(key);
      flags[key] = val === 'true' || val === '1';
    }
    return Response.json({ flags });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
});