import { describe, expect, it, vi } from 'vitest';
import { deleteDailyRecordDate, formatDailyRecordDate, groupDailyRecords, loadDailyRecordsPage } from '../../src/lib/dailyRecords.js';

function ownedClient(moods = [], flows = []) {
  const db = { MoodEntry: structuredClone(moods), DailyFlow: structuredClone(flows) };
  const entities = Object.fromEntries(Object.keys(db).map((name) => [name, {
    list: vi.fn(async (_sort, limit, offset) => db[name].slice(offset, offset + limit)),
    filter: vi.fn(async (query, _sort, limit, offset = 0) => db[name].filter((row) => row.date === query.date).slice(offset, offset + limit)),
    delete: vi.fn(async (id) => { db[name] = db[name].filter((row) => row.id !== id); return { success: true }; }),
  }]));
  entities.UserExerciseProgress = { delete: vi.fn(() => { throw new Error('Exercise history must not be deleted'); }) };
  return { entities, db };
}

describe('owner daily record management', () => {
  it('paginates both owner-scoped entities without a supplied owner or service role', async () => {
    const client = ownedClient(Array.from({ length: 50 }, (_, i) => ({ id: `m${i}`, date: '2026-10-28' })));
    const page = await loadDailyRecordsPage(client, 25);
    expect(client.entities.MoodEntry.list).toHaveBeenCalledWith('-date', 25, 25);
    expect(client.entities.DailyFlow.list).toHaveBeenCalledWith('-date', 25, 25);
    expect(page.moods).toHaveLength(25);
    expect(page.hasMore).toBe(true);
    expect(page.nextOffset).toBe(50);
  });

  it('keeps multiple entries on the same day and deduplicates overlapping pages', () => {
    const first = { id: 'm1', date: '2026-10-28', created_date: '2026-10-28T01:00:00Z', notes: 'earlier' };
    const second = { id: 'm2', date: '2026-10-28', created_date: '2026-10-28T02:00:00Z', notes: 'later' };
    const groups = groupDailyRecords([
      { moods: [first, second], flows: [{ id: 'f1', date: '2026-10-27', daily_takeaway: 'saved focus' }] },
      { moods: [second], flows: [] },
    ]);
    expect(groups.map((day) => day.date)).toEqual(['2026-10-28', '2026-10-27']);
    expect(groups[0].moods.map((row) => row.notes)).toEqual(['later', 'earlier']);
    expect(groups[1].flows[0].daily_takeaway).toBe('saved focus');
  });

  it('deletes every page for the selected date while preserving other dates and practice history', async () => {
    const date = '2026-10-28';
    const client = ownedClient([
      ...Array.from({ length: 101 }, (_, i) => ({ id: `m${i}`, date })),
      { id: 'previous', date: '2026-10-27', notes: 'keep' },
    ], [{ id: 'f1', date }, { id: 'f2', date: '2026-10-27' }]);
    expect(await deleteDailyRecordDate(client, date)).toEqual({ date, removed: 102 });
    expect(client.db.MoodEntry).toEqual([{ id: 'previous', date: '2026-10-27', notes: 'keep' }]);
    expect(client.db.DailyFlow).toEqual([{ id: 'f2', date: '2026-10-27' }]);
    expect(client.entities.UserExerciseProgress.delete).not.toHaveBeenCalled();
    expect(client.entities.MoodEntry.filter).toHaveBeenCalledWith({ date }, '-created_date', 100, 100);
  });

  it('does not report a partial deletion as success, and retries only remaining records', async () => {
    const date = '2026-10-28';
    const client = ownedClient([{ id: 'm1', date }], [{ id: 'f1', date }]);
    client.entities.DailyFlow.delete.mockRejectedValueOnce(new Error('write unavailable'));
    await expect(deleteDailyRecordDate(client, date)).rejects.toThrow('could not be removed');
    expect(client.db.MoodEntry).toEqual([]);
    expect(client.db.DailyFlow).toHaveLength(1);
    await expect(deleteDailyRecordDate(client, date)).resolves.toEqual({ date, removed: 1 });
    expect(client.entities.MoodEntry.delete).toHaveBeenCalledTimes(1);
    expect(client.db.DailyFlow).toEqual([]);
  });

  it('verifies that records disappeared instead of trusting a successful response', async () => {
    const client = ownedClient([{ id: 'm1', date: '2026-10-28' }]);
    client.entities.MoodEntry.delete.mockResolvedValue({ success: true });
    await expect(deleteDailyRecordDate(client, '2026-10-28')).rejects.toThrow('could not be removed');
  });

  it('rejects invalid dates before issuing queries and keeps malformed dates readable', async () => {
    const client = ownedClient();
    await expect(deleteDailyRecordDate(client, '2026-02-30')).rejects.toThrow('Invalid daily record date');
    expect(client.entities.MoodEntry.filter).not.toHaveBeenCalled();
    expect(formatDailyRecordDate('not-a-date', 'en')).toBe('not-a-date');
    expect(groupDailyRecords([{ moods: [{ id: 'legacy', date: 'not-a-date' }], flows: [] }])[0].canDelete).toBe(false);
  });

  it('stops a non-advancing backend page before attempting deletion', async () => {
    const date = '2026-10-28';
    const client = ownedClient();
    client.entities.MoodEntry.filter.mockResolvedValue(Array.from({ length: 100 }, (_, i) => ({ id: `m${i}`, date })));
    await expect(deleteDailyRecordDate(client, date)).rejects.toThrow('pagination did not advance');
    expect(client.entities.MoodEntry.delete).not.toHaveBeenCalled();
  });
});
