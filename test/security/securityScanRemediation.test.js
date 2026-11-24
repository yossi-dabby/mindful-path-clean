import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const OWNER = { id: 'synthetic-owner', email: 'owner@example.test', role: 'user' };
const ADMIN = { id: 'synthetic-admin', email: 'admin@example.test', role: 'admin' };
const SECRET_TEXT = 'SYNTHETIC_PRIVATE_CONVERSATION_CONTENT';
const request = (body) => new Request('https://app.test/function', {
  method: 'POST', body: JSON.stringify(body)
});
const malformed = () => new Request('https://app.test/function', { method: 'POST', body: '{' });

// Execute the actual deployed entrypoint with isolated SDK, logging and HTTP boundaries.
// Never connects to Base44, an LLM provider, or an index.
function fixture(name, user = OWNER) {
  let handler;
  const conversation = {
    id: 'conversation-a', created_by_id: OWNER.id,
    messages: [
      { role: 'user', content: SECRET_TEXT },
      { role: 'assistant', content: { assistant_message: SECRET_TEXT } },
      { role: 'assistant', content: '{"assistant_message":"synthetic"}' },
      { role: 'assistant', content: 'plain response' }
    ]
  };
  const record = { id: 'record-a', title: 'Synthetic content', summary: 'A bounded synthetic exercise.', status: 'active' };
  const getConversation = vi.fn(async () => conversation);
  const serviceConversation = vi.fn(async () => { throw new Error('Privileged conversation reads are forbidden'); });
  const entityFilter = vi.fn(async () => [record]);
  const client = {
    auth: { me: vi.fn(async () => user) },
    agents: { getConversation },
    asServiceRole: {
      agents: { getConversation: serviceConversation },
      entities: Object.fromEntries(['Exercise', 'Resource', 'JournalTemplate', 'Psychoeducation']
        .map((name) => [name, { filter: entityFilter }]))
    }
  };
  const env = { KNOWLEDGE_INDEX_ENABLED: 'false' };
  const envGet = vi.fn((name) => env[name]);
  const fetchMock = vi.fn(async (url) => {
    if (url === 'https://api.openai.com/v1/embeddings') {
      return Response.json({ data: [{ embedding: [0.1, 0.2] }] });
    }
    if (url.startsWith('https://synthetic-index.test/')) return Response.json({});
    throw new Error('Unexpected external request');
  });
  const logs = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const path = process.env.SECURITY_CANDIDATE_ROOT
    ? process.env.SECURITY_CANDIDATE_ROOT + '/' + name + '.ts'
    : 'base44/functions/' + name + '/entry.ts';
  const source = readFileSync(path, 'utf8')
    .replace(/^import \{ createClientFromRequest \} from 'npm:@base44\/sdk@[^']+';\s*/m, '');
  runInNewContext(source, {
    createClientFromRequest: () => client,
    Deno: { serve: (fn) => { handler = fn; }, env: { get: envGet } },
    Response, Request, console: logs, fetch: fetchMock
  }, { filename: path });
  return {
    call: (body) => handler(request(body)), raw: (req) => handler(req),
    client, conversation, record, getConversation, serviceConversation,
    entityFilter, fetchMock, envGet, env, logs
  };
}

describe('normalizeAgentMessage ownership and privacy', () => {
  it('preserves own-conversation diagnostics using only the caller-scoped client', async () => {
    const f = fixture('normalizeAgentMessage');
    const response = await f.call({ conversation_id: 'conversation-a' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, messages_checked: 4, objects_found: 2, errors: 0 });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(f.getConversation).toHaveBeenCalledWith('conversation-a');
    expect(f.serviceConversation).not.toHaveBeenCalled();
    expect(JSON.stringify(Object.values(f.logs).map((log) => log.mock.calls))).not.toContain(SECRET_TEXT);
  });

  it('supports legacy email ownership when no creator ID is present', async () => {
    const f = fixture('normalizeAgentMessage');
    delete f.conversation.created_by_id;
    f.conversation.created_by = OWNER.email;
    expect((await f.call({ conversation_id: 'conversation-a' })).status).toBe(200);
  });

  it.each([
    { created_by_id: 'someone-else', created_by: OWNER.email },
    { created_by_id: undefined, created_by: 'other@example.test' },
    { created_by_id: undefined, created_by: undefined }
  ])('rejects foreign or unowned conversations before looking at messages: %j', async (ownership) => {
    const f = fixture('normalizeAgentMessage');
    Object.assign(f.conversation, ownership);
    Object.defineProperty(f.conversation, 'messages', {
      get() { throw new Error('Foreign messages were accessed'); }
    });
    const response = await f.call({ conversation_id: 'conversation-a' });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Conversation not found' });
    expect(f.logs.error).not.toHaveBeenCalled();
    expect(f.serviceConversation).not.toHaveBeenCalled();
  });

  it('does not grant an administrator access to someone else\'s conversation', async () => {
    const f = fixture('normalizeAgentMessage', ADMIN);
    expect((await f.call({ conversation_id: 'conversation-a' })).status).toBe(404);
  });

  it('rejects signed-out callers before fetching a conversation', async () => {
    const f = fixture('normalizeAgentMessage', null);
    expect((await f.call({ conversation_id: 'conversation-a' })).status).toBe(401);
    f.client.auth.me.mockRejectedValueOnce(Object.assign(new Error('signed out'), { status: 401 }));
    expect((await f.call({ conversation_id: 'conversation-a' })).status).toBe(401);
    expect(f.getConversation).not.toHaveBeenCalled();
  });

  it.each([null, {}, { conversation_id: [] }, { conversation_id: ' ' }, { conversation_id: 'x'.repeat(257) }])
    ('rejects invalid input without fetching: %j', async (body) => {
      const f = fixture('normalizeAgentMessage');
      expect((await f.call(body)).status).toBe(400);
      expect(f.getConversation).not.toHaveBeenCalled();
    });

  it('handles malformed JSON as a caller error', async () => {
    const f = fixture('normalizeAgentMessage');
    expect((await f.raw(malformed())).status).toBe(400);
  });

  it.each([403, 404])('does not disclose whether an inaccessible conversation exists (%s)', async (status) => {
    const f = fixture('normalizeAgentMessage');
    f.getConversation.mockRejectedValue(Object.assign(new Error(SECRET_TEXT), { status }));
    const response = await f.call({ conversation_id: 'conversation-a' });
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(SECRET_TEXT);
  });

  it('does not return or log SDK error details that may contain private content', async () => {
    const f = fixture('normalizeAgentMessage');
    f.getConversation.mockRejectedValue(new Error(SECRET_TEXT));
    const response = await f.call({ conversation_id: 'conversation-a' });
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain(SECRET_TEXT);
    expect(JSON.stringify(Object.values(f.logs).map((log) => log.mock.calls))).not.toContain(SECRET_TEXT);
  });
});

const eventBody = (type = 'create') => ({
  event: { entity_name: 'Resource', entity_id: 'record-a', type },
  data: { title: 'Synthetic resource', summary: 'A short synthetic resource.', status: 'active' }
});

describe('indexContentRecord authorization and workflow compatibility', () => {
  it.each([null, OWNER])('blocks forged automation payloads before privileged work: %j', async (user) => {
    const f = fixture('indexContentRecord', user);
    f.env.KNOWLEDGE_INDEX_ENABLED = 'true';
    const response = await f.call(eventBody('delete'));
    expect(response.status).toBe(user ? 403 : 401);
    expect(f.client.auth.me).toHaveBeenCalledOnce();
    expect(f.envGet).not.toHaveBeenCalled();
    expect(f.entityFilter).not.toHaveBeenCalled();
    expect(f.fetchMock).not.toHaveBeenCalled();
  });

  it('blocks direct non-admin calls and signed-out SDK failures', async () => {
    const f = fixture('indexContentRecord', OWNER);
    expect((await f.call({ entity_type: 'Resource', record_id: 'record-a' })).status).toBe(403);
    f.client.auth.me.mockRejectedValueOnce(Object.assign(new Error('signed out'), { status: 401 }));
    expect((await f.call(eventBody())).status).toBe(401);
    expect(f.fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the disabled-index workflow path a no-op for an authenticated admin', async () => {
    const f = fixture('indexContentRecord', ADMIN);
    const response = await f.call(eventBody());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ mode: 'no_op', action: 'no_op' });
    expect(f.fetchMock).not.toHaveBeenCalled();
  });

  it.each(['create', 'update', 'delete'])('preserves authenticated legacy %s workflow payloads', async (type) => {
    const f = fixture('indexContentRecord', ADMIN);
    Object.assign(f.env, {
      KNOWLEDGE_INDEX_ENABLED: 'true', KNOWLEDGE_PROVIDER: 'openai_pinecone',
      KNOWLEDGE_EMBEDDING_KEY: 'synthetic-only', KNOWLEDGE_INDEX_KEY: 'synthetic-only',
      KNOWLEDGE_INDEX_HOST: 'https://synthetic-index.test'
    });
    const response = await f.call(eventBody(type));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.action).toBe(type === 'delete' ? 'removed' : 'indexed');
    const urls = f.fetchMock.mock.calls.map(([url]) => url);
    if (type === 'delete') expect(urls).toEqual(['https://synthetic-index.test/vectors/delete']);
    else {
      expect(urls).toContain('https://api.openai.com/v1/embeddings');
      expect(urls).toContain('https://synthetic-index.test/vectors/upsert');
    }
  });

  it('preserves admin dry runs without paid provider calls', async () => {
    const f = fixture('indexContentRecord', ADMIN);
    f.env.KNOWLEDGE_INDEX_ENABLED = 'true';
    const response = await f.call({ entity_type: 'Resource', record_id: 'record-a', dry_run: true });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ mode: 'dry_run', action: 'indexed' });
    expect(f.entityFilter).toHaveBeenCalled();
    expect(f.fetchMock).not.toHaveBeenCalled();
  });

  it('keeps private entities excluded from the knowledge index', async () => {
    const f = fixture('indexContentRecord', ADMIN);
    const body = eventBody(); body.event.entity_name = 'JournalEntry';
    expect(await (await f.call(body)).json()).toMatchObject({ action: 'skipped' });
    expect(f.fetchMock).not.toHaveBeenCalled();
  });

  it.each([null, []])('rejects malformed admin payloads: %j', async (body) => {
    const f = fixture('indexContentRecord', ADMIN);
    expect((await f.call(body)).status).toBe(400);
    expect(f.fetchMock).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON without touching the index', async () => {
    const f = fixture('indexContentRecord', ADMIN);
    expect((await f.raw(malformed())).status).toBe(400);
    expect(f.fetchMock).not.toHaveBeenCalled();
  });
});
