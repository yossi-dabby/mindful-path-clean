import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { handleAIContentReports } from '../../base44/functions/aiContentReports/handler.js';
const A = { id: 'adult-a', email: 'a@example.test', role: 'user' };
const request = input => new Request('https://app.test/report', { method: 'POST', body: JSON.stringify(input) });
function fixture() {
  let user = A;
  const records = [];
  const conversation = { id: 'conv-a', created_by_id: A.id, agent_name: 'cbt_therapist', messages: [{ id: 'user-msg', role: 'user', content: 'Private user text' }, { id: 'assistant-msg', role: 'assistant', content: 'raw text', reasoning: 'Never copy reasoning', tool_calls: ['private tool result'] }] };
  const entity = {
    filter: vi.fn(async q => records.filter(row => Object.entries(q).every(([k, v]) => typeof v === 'object' ? row[k] >= v.$gte : row[k] === v))),
    create: vi.fn(async data => { const row = { ...data, id: `report-${records.length}` }; records.push(row); return row; }),
    get: vi.fn(async id => records.find(row => row.id === id)),
    update: vi.fn(async (id, changes) => Object.assign(records.find(row => row.id === id), changes)),
    delete: vi.fn(async id => { const index = records.findIndex(row => row.id === id); if (index >= 0) records.splice(index, 1); }),
  };
  const client = { auth: { me: vi.fn(async () => user) }, agents: { getConversation: vi.fn(async () => conversation) },
    functions: { invoke: vi.fn(async () => ({ data: { schema_version: 1, policy_version: '2026-11-11', user_id: user.id, eligible: true, adult_status: 'confirmed' } })) }, asServiceRole: { entities: { AIContentReport: entity } } };
  const input = { action: 'submit', conversation_id: 'conv-a', message_id: 'assistant-msg', message_index: 1, reason: 'harmful_advice', details: 'Synthetic report', response_text: 'Only the displayed response' };
  const call = value => handleAIContentReports(request(value), { createClientFromRequest: () => client, now: () => '2026-11-12T12:00:00.000Z' });
  return { call, input, client, entity, records, conversation, setUser: value => { user = value; } };
}
describe('AI response reporting authorization and privacy', () => {
  it('stores only the opted-in excerpt and bounded details, with server-controlled identity/status', async () => {
    const f = fixture(); const response = await f.call(f.input);
    expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(f.records[0]).toMatchObject({ subject_user_id: A.id, status: 'open', response_text: f.input.response_text, reason: 'harmful_advice' });
    expect(JSON.stringify(f.records)).not.toMatch(/Private user text|Never copy reasoning|private tool result|a@example/);
    expect(f.client.agents.getConversation).toHaveBeenCalledWith('conv-a');
  });
  it('uses stable message ID even if visible indices differ; retries reuse the report', async () => {
    const f = fixture();
    expect((await f.call({ ...f.input, message_index: 0 })).status).toBe(200);
    expect(f.records[0].message_index).toBe(1);
    expect((await f.call(f.input)).status).toBe(200); expect(f.entity.create).toHaveBeenCalledTimes(1);
  });
  it('removes a late report if account deletion starts during the write', async () => {
    const f = fixture();
    f.entity.create.mockImplementationOnce(async data => {
      const row = { ...data, id: 'late-report' }; f.records.push(row);
      f.client.functions.invoke.mockResolvedValue({ data: { schema_version: 1, policy_version: '2026-11-11', user_id: A.id, eligible: false, adult_status: 'confirmed' } });
      return row;
    });
    expect((await f.call(f.input)).status).toBe(403);
    expect(f.entity.delete).toHaveBeenCalledWith('late-report'); expect(f.records).toHaveLength(0);
  });
  it('does not confirm success if access disappears and late-report removal fails', async () => {
    const f = fixture();
    f.entity.create.mockImplementationOnce(async data => {
      const row = { ...data, id: 'late-report' }; f.records.push(row);
      f.client.functions.invoke.mockRejectedValue(new Error('Private provider error'));
      return row;
    });
    f.entity.delete.mockRejectedValue(new Error('Private deletion error'));
    const response = await f.call(f.input);
    expect(response.status).toBe(503); expect(await response.text()).not.toContain('Private');
  });
  it('rejects anonymous, underage and inaccessible conversations before writing', async () => {
    const f = fixture(); f.setUser(null);
    expect((await f.call(f.input)).status).toBe(401);
    f.setUser(A); f.client.functions.invoke.mockResolvedValue({ data: { schema_version: 1, policy_version: '2026-11-11', user_id: A.id, eligible: false, adult_status: 'declined' } });
    expect((await f.call(f.input)).status).toBe(403); expect(f.client.agents.getConversation).not.toHaveBeenCalled(); expect(f.entity.create).not.toHaveBeenCalled();
  });
  it('rejects a foreign conversation even if returned by a faulty provider', async () => {
    const f = fixture(); f.conversation.created_by_id = 'adult-b';
    expect((await f.call(f.input)).status).toBe(404); expect(f.entity.filter).not.toHaveBeenCalled(); expect(f.entity.create).not.toHaveBeenCalled();
  });
  it.each([{ message_id: 'user-msg' }, { message_id: 'missing' }, { reason: 'unknown' }, { subject_user_id: 'adult-b' }, { status: 'resolved' }, { details: 'x'.repeat(1001) }, { response_text: 'x'.repeat(6001) }])('rejects invalid or forged fields: %j', async change => {
    const f = fixture(); expect((await f.call({ ...f.input, ...change })).status).toBeGreaterThanOrEqual(400); expect(f.entity.create).not.toHaveBeenCalled();
  });
  it.each(['list', 'review'])('blocks ordinary users from %s', async action => {
    const f = fixture(); expect((await f.call({ action })).status).toBe(403); expect(f.entity.filter).not.toHaveBeenCalled(); expect(f.entity.update).not.toHaveBeenCalled();
  });
  it('requires a resolution for closure and records authenticated reviewer identity', async () => {
    const f = fixture(); await f.call(f.input); f.setUser({ id: 'admin', email: 'admin@example.test', role: 'admin' });
    const input = { action: 'review', report_id: 'report-0', status: 'resolved', resolution: '' };
    expect((await f.call(input)).status).toBe(400);
    expect((await f.call({ ...input, resolution: 'Reviewed synthetic report' })).status).toBe(200);
    expect(f.records[0]).toMatchObject({ status: 'resolved', reviewed_by: 'admin' });
    const body = await (await f.call({ action: 'list' })).json();
    expect(body.reports).toHaveLength(1); expect(body.reports[0]).not.toHaveProperty('subject_user_id'); expect(body.reports[0]).not.toHaveProperty('conversation_id');
  });
  it('does not expose backend errors and fails closed on malformed provider responses', async () => {
    const f = fixture(); f.entity.filter.mockResolvedValue({});
    const response = await f.call(f.input); expect(response.status).toBe(503); expect(await response.text()).not.toMatch(/stack|token|email/);
  });
  it('bounds daily reporting and never copies hidden assistant content', async () => {
    const f = fixture(); f.conversation.messages[1].hidden = true;
    expect((await f.call(f.input)).status).toBe(404);
    f.conversation.messages[1].hidden = false;
    f.entity.filter.mockResolvedValueOnce([]).mockResolvedValueOnce(Array.from({ length: 20 }, () => ({ subject_user_id: A.id })));
    expect((await f.call(f.input)).status).toBe(429); expect(f.entity.create).not.toHaveBeenCalled();
  });
  it('locks direct entity CRUD and packages the unchanged eligibility guard', () => {
    const schema = JSON.parse(readFileSync('base44/entities/AIContentReport.jsonc', 'utf8'));
    for (const rule of Object.values(schema.rls)) expect(rule).toEqual({ $and: [{ user_condition: { role: 'admin' } }, { user_condition: { role: 'user' } }] });
    expect(readFileSync('base44/functions/aiContentReports/accountAccessGuard.js', 'utf8')).toBe(readFileSync('base44/functions/accountAccess/guard.js', 'utf8'));
  });
});
