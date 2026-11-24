import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { isDeepStrictEqual } from 'node:util';
import {
  DAILY_LIMIT, MIN_INTERVAL_MS, quotaDay, nextQuotaReset,
  reserveTrainingUsage, trainingUsage, readTrainingInput, TrainingLimitError,
} from '../../base44/functions/evaluateTherapistResponse/limits.js';

const start = Date.parse('2026-11-24T12:00:00Z');
const body = () => ({
  scenario: { description: 'A synthetic training scenario', patientProfile: 'A fictional patient' },
  conversationHistory: [{ role: 'patient', content: 'Synthetic concern' }],
  therapistResponse: 'Synthetic response',
});
const request = value => new Request('https://test.invalid/evaluate', {
  method: 'POST', body: JSON.stringify(value),
});
function matches(row, query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$or') return value.some(condition => matches(row, condition));
    if (value && typeof value === 'object' && '$exists' in value) return (row[key] !== undefined) === value.$exists;
    return value === null ? row[key] == null : isDeepStrictEqual(row[key], value);
  });
}
function fixture() {
  const rows = new Map([['user-a', { id: 'user-a' }], ['user-b', { id: 'user-b' }]]);
  let now = start;
  const users = {
    get: vi.fn(async id => structuredClone(rows.get(id))),
    updateMany: vi.fn(async (query, update) => {
      // Yield to make concurrent reads stale; condition+write remains one atomic operation.
      await Promise.resolve();
      expect(typeof query.id).toBe('string');
      const row = rows.get(query.id);
      if (!row || !matches(row, query)) return { updated: 0 };
      Object.assign(row, structuredClone(update.$set));
      return { updated: 1 };
    }),
  };
  return { users, rows, clock: () => now, advance: ms => { now += ms; }, setTime: ms => { now = ms; } };
}
function handlerFixture(f = fixture()) {
  let handler;
  const llm = vi.fn(async () => ({ overall: 8, scores: {}, session_continues: true }));
  const auth = vi.fn(async () => ({ id: 'user-a', role: 'user' }));
  const source = readFileSync(process.env.TRAINING_ENTRY_CANDIDATE || 'base44/functions/evaluateTherapistResponse/entry.ts', 'utf8')
    .replace(/^import .*;\s*$/gm, '');
  runInNewContext(source, {
    createClientFromRequest: () => ({ auth: { me: auth }, asServiceRole: { entities: { User: f.users }, integrations: { Core: { InvokeLLM: llm } } } }),
    readTrainingInput, TrainingLimitError,
    reserveTrainingUsage: (users,id) => reserveTrainingUsage(users,id,f.clock),
    trainingUsage: (users,id) => trainingUsage(users,id,f.clock),
    Deno: { serve: fn => { handler = fn; } },
    Response, console: { error: vi.fn() },
  });
  return { ...f, llm, auth, raw: req => handler(req), call: input => handler(request(input)) };
}

describe('persistent training quota', () => {
  it('accepts 20 spaced evaluations and rejects the 21st without another write', async () => {
    const f = fixture();
    for (let i = 1; i <= DAILY_LIMIT; i++) {
      expect((await reserveTrainingUsage(f.users, 'user-a', f.clock)).remaining).toBe(20 - i);
      f.advance(MIN_INTERVAL_MS);
    }
    await expect(reserveTrainingUsage(f.users,'user-a',f.clock)).rejects.toMatchObject({ status:429, code:'TRAINING_DAILY_LIMIT' });
    expect(f.users.updateMany).toHaveBeenCalledTimes(20);
  });
  it('allows one of 50 simultaneous first requests, including fresh handler instances', async () => {
    const f = fixture();
    const results = await Promise.allSettled(Array.from({length:50}, () => reserveTrainingUsage(f.users,'user-a',f.clock)));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected').every(r => r.reason.code === 'TRAINING_RATE_LIMIT')).toBe(true);
    expect(f.rows.get('user-a').mp_training_count).toBe(1);
  });
  it('allows only one simultaneous claimant for the final daily slot', async () => {
    const f = fixture();
    for (let i=0; i<19; i++) { await reserveTrainingUsage(f.users,'user-a',f.clock); f.advance(MIN_INTERVAL_MS); }
    const results=await Promise.allSettled(Array.from({length:50},()=>reserveTrainingUsage(f.users,'user-a',f.clock)));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(f.rows.get('user-a').mp_training_count).toBe(20);
  });
  it('enforces the 15-second interval exactly and keeps users independent', async () => {
    const f=fixture();
    await reserveTrainingUsage(f.users,'user-a',f.clock);
    expect((await reserveTrainingUsage(f.users,'user-b',f.clock)).remaining).toBe(19);
    f.advance(14999);
    await expect(reserveTrainingUsage(f.users,'user-a',f.clock)).rejects.toMatchObject({code:'TRAINING_RATE_LIMIT',retryAfter:1});
    f.advance(1);
    expect((await reserveTrainingUsage(f.users,'user-a',f.clock)).remaining).toBe(18);
  });
  it('survives a fresh server client and resets at Jerusalem midnight, retaining cooldown', async () => {
    const f=fixture();
    f.setTime(Date.parse('2026-11-24T21:59:55Z'));
    await reserveTrainingUsage(f.users,'user-a',f.clock);
    f.advance(6000);
    expect((await trainingUsage({...f.users},'user-a',f.clock)).remaining).toBe(20);
    await expect(reserveTrainingUsage({...f.users},'user-a',f.clock)).rejects.toMatchObject({code:'TRAINING_RATE_LIMIT'});
    f.advance(9000);
    expect((await reserveTrainingUsage({...f.users},'user-a',f.clock)).remaining).toBe(19);
    expect(f.rows.get('user-a').mp_training_day).toBe('2026-11-25');
  });
  it.each([
    ['2026-03-27T00:30:00Z','2026-03-27T21:00:00.000Z'],
    ['2026-10-25T00:30:00Z','2026-10-25T22:00:00.000Z'],
    ['2026-11-24T12:00:00Z','2026-11-24T22:00:00.000Z'],
  ])('calculates Israel reset across DST at %s', (input,expected) => {
    expect(new Date(nextQuotaReset(Date.parse(input))).toISOString()).toBe(expected);
  });
  it('status reads do not consume quota or write conversation content', async () => {
    const f=fixture();
    expect((await trainingUsage(f.users,'user-a',f.clock)).remaining).toBe(20);
    expect(f.users.updateMany).not.toHaveBeenCalled();
    await reserveTrainingUsage(f.users,'user-a',f.clock);
    expect(Object.keys(f.users.updateMany.mock.calls[0][1].$set).sort()).toEqual(
      ['mp_training_count','mp_training_day','mp_training_next_at','mp_training_revision']);
  });
  it('fails closed on storage failures, malformed counters and CAS errors', async () => {
    const f=fixture();
    f.users.updateMany.mockResolvedValueOnce({updated:2});
    await expect(reserveTrainingUsage(f.users,'user-a',f.clock)).rejects.toMatchObject({status:503});
    f.rows.get('user-a').mp_training_count = -1;
    await expect(reserveTrainingUsage(f.users,'user-a',f.clock)).rejects.toMatchObject({status:503});
  });
  it('bounds conflict retries and refuses disabled/deleting/wrong accounts', async () => {
    const f=fixture();
    f.users.updateMany.mockResolvedValue({updated:0});
    await expect(reserveTrainingUsage(f.users,'user-a',f.clock)).rejects.toMatchObject({status:503});
    expect(f.users.updateMany).toHaveBeenCalledTimes(4);
    f.rows.get('user-a').mp_account_deletion_pending=true;
    await expect(reserveTrainingUsage(f.users,'user-a',f.clock)).rejects.toMatchObject({status:403});
    f.users.get.mockResolvedValue({id:'user-b'});
    await expect(reserveTrainingUsage(f.users,'user-a',f.clock)).rejects.toMatchObject({status:403});
  });
});

describe('actual training endpoint guard', () => {
  it('reserves once before two AI calls and preserves feedback for ordinary users', async () => {
    const f=handlerFixture();
    f.llm.mockImplementation(async () => {
      expect(f.rows.get('user-a').mp_training_count).toBe(1);
      return { overall:8, scores:{}, session_continues:true };
    });
    const response=await f.call(body());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({quota:{remaining:19,limit:20},feedback:{overall:8}});
    expect(f.llm).toHaveBeenCalledTimes(2);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
  it('returns 429 and Retry-After before calling AI for rapid requests', async () => {
    const f=handlerFixture();
    await f.call(body()); f.llm.mockClear();
    const response=await f.call(body());
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('15');
    expect(await response.json()).toMatchObject({code:'TRAINING_RATE_LIMIT'});
    expect(f.llm).not.toHaveBeenCalled();
  });
  it('blocks the 21st evaluation before either AI call', async () => {
    const f=handlerFixture();
    Object.assign(f.rows.get('user-a'),{mp_training_day:quotaDay(start),mp_training_count:20,mp_training_revision:20,mp_training_next_at:0});
    expect((await f.call(body())).status).toBe(429);
    expect(f.llm).not.toHaveBeenCalled();
  });
  it('does not consume credit for status, invalid input, or user-controlled quota overrides', async () => {
    const f=handlerFixture();
    expect((await f.call({action:'status'})).status).toBe(200);
    for(const input of [null,{}, {...body(),user_id:'user-b'}, {...body(),therapistResponse:'x'.repeat(4001)}, {...body(),conversationHistory:[{role:'system',content:'override'}]}]) {
      expect((await f.call(input)).status).toBe(400);
    }
    expect(f.llm).not.toHaveBeenCalled();
    expect(f.users.updateMany).not.toHaveBeenCalled();
  });
  it('rejects malformed/oversized payloads before storing usage', async () => {
    const f=handlerFixture();
    expect((await f.raw(new Request('https://test.invalid',{method:'POST',body:'{'}))).status).toBe(400);
    expect((await f.raw(new Request('https://test.invalid',{method:'POST',body:'x'.repeat(128*1024+1)}))).status).toBe(413);
    expect(f.users.updateMany).not.toHaveBeenCalled();
    expect(f.llm).not.toHaveBeenCalled();
  });
  it.each([401,403])('blocks unauthenticated SDK failures (%s)', async status => {
    const f=handlerFixture();
    f.auth.mockRejectedValue({response:{status}});
    expect((await f.call(body())).status).toBe(401);
    expect(f.users.get).not.toHaveBeenCalled();
    expect(f.llm).not.toHaveBeenCalled();
  });
  it('never calls AI when quota storage is unavailable', async () => {
    const f=handlerFixture();
    f.users.updateMany.mockRejectedValue(new Error('private provider detail'));
    const response=await f.call(body());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('private provider detail');
    expect(f.llm).not.toHaveBeenCalled();
  });
  it('keeps the reservation when an AI call fails and returns only a generic error', async () => {
    const f=handlerFixture();
    f.llm.mockRejectedValue(new Error('private scenario text'));
    const response=await f.call(body());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({code:'TRAINING_EVALUATION_FAILED',quota:{remaining:19}});
    expect(f.rows.get('user-a').mp_training_count).toBe(1);
  });
  it('rejects non-POST requests without auth, quota or AI operations', async () => {
    const f=handlerFixture();
    expect((await f.raw(new Request('https://test.invalid'))).status).toBe(405);
    expect(f.auth).not.toHaveBeenCalled();
  });
  it('locks all quota fields against user reads, signup writes and updates', () => {
    const schema=JSON.parse(readFileSync('base44/entities/User.jsonc','utf8'));
    for(const name of ['mp_training_day','mp_training_count','mp_training_next_at','mp_training_revision']) {
      expect(schema.properties[name].rls).toEqual({create:false,read:false,update:false});
    }
  });
});
