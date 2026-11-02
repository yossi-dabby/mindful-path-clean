import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

let handler;
let env;
let client;

const richUpdate = Object.freeze({
  cbt_domain: 'anxiety',
  presenting_themes: ['Work anxiety'],
  core_belief_hypotheses: [{ belief: 'I am not good enough' }],
  goals: ['Speak once in the next meeting'],
  understanding_confirmed: { confirmed: true, session_id: 'forged', confirmed_at: '2000-01-01T00:00:00.000Z' },
});

function request(body) {
  return new Request('https://example.test/functions/upsertCaseFormulation', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function payload(overrides = {}) {
  return {
    conversation_id: 'conv-A',
    source_session_id: 'sess-A',
    source_message_id: 'msg-1',
    case_formulation_update: richUpdate,
    ...overrides,
  };
}

beforeAll(async () => {
  globalThis.__v10Handler = null;
  globalThis.__v10CreateClient = () => client;
  globalThis.Deno = {
    env: { get: (name) => env?.[name] },
    serve: (candidate) => { globalThis.__v10Handler = candidate; },
  };

  const source = readFileSync(
    new URL('../../base44/functions/upsertCaseFormulation/entry.ts', import.meta.url),
    'utf8',
  );
  const result = await build({
    stdin: {
      contents: source,
      loader: 'ts',
      resolveDir: process.cwd(),
      sourcefile: 'upsertCaseFormulation/entry.ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    plugins: [{
      name: 'base44-sdk-shim',
      setup(esbuild) {
        esbuild.onResolve({ filter: /^npm:@base44\/sdk@/ }, () => ({ path: 'base44-sdk', namespace: 'shim' }));
        esbuild.onLoad({ filter: /.*/, namespace: 'shim' }, () => ({
          contents: 'export const createClientFromRequest = (req) => globalThis.__v10CreateClient(req);',
          loader: 'js',
        }));
      },
    }],
  });

  const bundled = result.outputFiles[0].text;
  await import(`data:text/javascript;base64,${Buffer.from(bundled).toString('base64')}`);
  handler = globalThis.__v10Handler;
});

beforeEach(() => {
  env = {
    THERAPIST_RUNTIME_APPLY_ENABLED: 'true',
    VITE_THERAPIST_UPGRADE_ENABLED: 'true',
    VITE_THERAPIST_UPGRADE_KNOWLEDGE_ENABLED: 'true',
  };
  client = {
    auth: { me: vi.fn().mockResolvedValue({ id: 'user-1' }) },
    entities: {
      CaseFormulation: {
        filter: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(async (record) => ({ id: 'cf-1', ...record })),
        update: vi.fn().mockImplementation(async (id, record) => ({ id, ...record })),
      },
    },
  };
});

afterAll(() => {
  delete globalThis.__v10Handler;
  delete globalThis.__v10CreateClient;
  delete globalThis.Deno;
});

describe('V10 Gate 1 — actual upsertCaseFormulation handler', () => {
  it('is fail-closed before auth or entity access when the backend gate is off', async () => {
    env.VITE_THERAPIST_UPGRADE_KNOWLEDGE_ENABLED = 'false';
    const response = await handler(request(payload()));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status_code).toBe('gate_closed');
    expect(client.auth.me).not.toHaveBeenCalled();
    expect(client.entities.CaseFormulation.filter).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests before reading formulation data', async () => {
    client.auth.me.mockResolvedValue(null);
    const response = await handler(request(payload()));

    expect(response.status).toBe(401);
    expect(client.entities.CaseFormulation.filter).not.toHaveBeenCalled();
  });

  it('rejects a message ID masquerading as the session ID', async () => {
    const response = await handler(request(payload({ source_session_id: 'msg-1' })));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.status_code).toBe('identity_collision');
    expect(client.entities.CaseFormulation.create).not.toHaveBeenCalled();
  });

  it('creates a record with server-stamped session provenance', async () => {
    const response = await handler(request(payload()));
    const data = await response.json();
    const record = client.entities.CaseFormulation.create.mock.calls[0][0];

    expect(response.status).toBe(200);
    expect(data.upserted).toBe('created');
    expect(record.session_instance_id).toBe('sess-A');
    expect(record.source_last_message_id).toBe('msg-1');
    expect(record.understanding_confirmed.session_id).toBe('sess-A');
    expect(record.understanding_confirmed.confirmed_at).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('returns an idempotent no-op for a replayed finalized message', async () => {
    client.entities.CaseFormulation.filter.mockResolvedValue([{
      id: 'cf-1',
      conversation_id: 'conv-A',
      session_instance_id: 'sess-A',
      update_log: [{ change: 'case_formulation_update', evidence: 'msg-1' }],
    }]);
    const response = await handler(request(payload()));
    const data = await response.json();

    expect(data.upserted).toBe('idempotent');
    expect(client.entities.CaseFormulation.update).not.toHaveBeenCalled();
    expect(client.entities.CaseFormulation.create).not.toHaveBeenCalled();
  });

  it('rejects reassignment of an existing conversation to another session', async () => {
    client.entities.CaseFormulation.filter.mockResolvedValue([{
      id: 'cf-1',
      conversation_id: 'conv-A',
      session_instance_id: 'sess-other',
      update_log: [],
    }]);
    const response = await handler(request(payload()));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.status_code).toBe('session_mismatch');
    expect(client.entities.CaseFormulation.update).not.toHaveBeenCalled();
  });
});
