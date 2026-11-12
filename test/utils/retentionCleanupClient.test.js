import { describe, it, expect, vi } from 'vitest';
import { runRetentionCleanup } from '../../src/lib/retentionCleanup.js';
function fixture() {
  let user = { id: 'account-a', preferences: { data_retention_days: 365 } };
  let time = 100000000;
  const data = new Map(); const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  const client = { auth: { me: async () => user }, functions: { invoke: vi.fn(async () => ({ data: { success: true } })) } };
  return { client, data, run: (extra = {}) => runRetentionCleanup(client, { storage, now: () => time, ...extra }), setUser: value => { user = value; }, advance: ms => { time += ms; } };
}
describe('retention retry scheduling', () => {
  it('does not mark partial failures as daily success; retries after a short delay', async () => {
    const f = fixture(); f.client.functions.invoke.mockResolvedValueOnce({ data: { success: false, deletedMoodEntries: 2 } });
    expect(await f.run()).toMatchObject({ success: false }); expect([...f.data.keys()].some(key => key.endsWith(':success'))).toBe(false);
    expect(await f.run()).toMatchObject({ deferred: true });
    f.advance(300001); expect(await f.run()).toMatchObject({ success: true }); expect(f.client.functions.invoke).toHaveBeenCalledTimes(2);
    expect(await f.run()).toMatchObject({ deferred: true });
  });
  it('separates accounts and retention settings and ignores legacy global stamps', async () => {
    const f = fixture(); f.data.set('last_retention_cleanup', '100000000'); await f.run();
    f.setUser({ id: 'account-b', preferences: { data_retention_days: 365 } }); await f.run();
    f.setUser({ id: 'account-b', preferences: { data_retention_days: 30 } }); await f.run();
    expect(f.client.functions.invoke).toHaveBeenCalledTimes(3);
  });
  it('allows explicit retry and does not accept contradictory or malformed success', async () => {
    const f = fixture(); f.client.functions.invoke.mockResolvedValue({ data: { success: true, errors: ['failed'] } });
    expect(await f.run()).toMatchObject({ success: false }); await f.run({ force: true }); expect(f.client.functions.invoke).toHaveBeenCalledTimes(2);
    expect([...f.data.keys()].some(key => key.endsWith(':success'))).toBe(false);
    f.client.functions.invoke.mockResolvedValue({ data: {} }); await expect(f.run({ force: true })).rejects.toThrow('CLEANUP_UNAVAILABLE');
  });
});
