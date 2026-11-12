import { describe, it, expect, vi } from 'vitest';
import { handleRetentionCleanup } from '../../base44/functions/retentionCleanup/handler.js';
const NOW = Date.parse('2026-11-12T12:00:00Z');
const OLD = '2025-01-01T00:00:00Z';
function fixture() {
  let user = { id: 'adult-a', email: 'a@example.test', preferences: { data_retention_days: 30 } };
  const moods = []; const journals = []; const archived = []; const conversations = [];
  const api = rows => ({
    filter: vi.fn(async (q, _sort, limit = 100, offset = 0) => rows.filter(row => Object.entries(q).every(([key, value]) => typeof value === 'object' ? row[key] < value.$lt : row[key] === value)).slice(offset, offset + limit)),
    delete: vi.fn(async id => { rows.splice(rows.findIndex(row => row.id === id), 1); }),
    create: vi.fn(async data => { const row = { id: `archive-${archived.length}`, created_by: user.email, ...data }; rows.push(row); return row; }),
  });
  const moodApi = api(moods); const journalApi = api(journals); const archiveApi = api(archived);
  const client = { auth: { me: vi.fn(async () => user) }, asServiceRole: { entities: { MoodEntry: moodApi, ThoughtJournal: journalApi } }, entities: { UserDeletedConversations: archiveApi }, agents: { listConversations: vi.fn(async ({ limit, skip }) => conversations.slice(skip, skip + limit)) } };
  const call = (input = {}) => handleRetentionCleanup(new Request('https://app.test/cleanup', { method: 'POST', body: JSON.stringify(input) }), { createClientFromRequest: () => client, now: () => NOW });
  const row = (id, extra = {}) => ({ id, created_by: 'a@example.test', created_date: OLD, ...extra });
  return { moods, journals, archived, conversations, moodApi, journalApi, archiveApi, client, call, row, setUser: value => { user = value; } };
}
describe('retention cleanup behavior', () => {
  it('deletes expired owned rows across pages and leaves recent/foreign data intact', async () => {
    const f = fixture(); f.moods.push(...Array.from({ length: 205 }, (_, i) => f.row(`m-${i}`)), f.row('recent', { created_date: '2026-11-11T00:00:00Z' }), f.row('foreign', { created_by: 'b@example.test' }));
    const body = await (await f.call()).json();
    expect(body).toMatchObject({ success: true, deletedMoodEntries: 205 }); expect(f.moods.map(row => row.id)).toEqual(['recent', 'foreign']);
  });
  it('keeps accurate partial counts and retry deletes only the remaining records', async () => {
    const f = fixture(); f.moods.push(f.row('first'), f.row('second'));
    f.moodApi.delete.mockImplementationOnce(async () => f.moods.shift()).mockRejectedValueOnce(new Error('secret token'));
    f.journals.push(f.row('journal'));
    const body = await (await f.call()).json();
    expect(body).toMatchObject({ success: false, partial: true, deletedMoodEntries: 1, deletedJournalEntries: 1 });
    expect(JSON.stringify(body)).not.toContain('secret token');
    expect(await (await f.call()).json()).toMatchObject({ success: true, deletedMoodEntries: 1, deletedJournalEntries: 0 });
  });
  it.each([{ created_by: 'b@example.test' }, { created_date: 'invalid' }, { created_date: '2026-11-11T00:00:00Z' }])('does not trust a provider-filtered batch: %j', async change => {
    const f = fixture(); f.moodApi.filter.mockResolvedValue([f.row('first'), f.row('invalid', change)]);
    expect(await (await f.call()).json()).toMatchObject({ success: false }); expect(f.moodApi.delete).not.toHaveBeenCalled();
  });
  it('recognizes supported envelopes but never treats unknown list shapes as empty success', async () => {
    const f = fixture(); f.moodApi.filter.mockResolvedValue({ results: [] });
    expect(await (await f.call()).json()).toMatchObject({ success: true });
    f.moodApi.filter.mockResolvedValue({ unknown: [] }); expect(await (await f.call()).json()).toMatchObject({ success: false });
  });
  it('archives conversations beyond a single page, without deleting provider data', async () => {
    const f = fixture(); f.conversations.push(...Array.from({ length: 105 }, (_, i) => ({ id: `conv-${i}`, created_by_id: 'adult-a', created_date: OLD })));
    expect(await (await f.call()).json()).toMatchObject({ success: true, archivedConversations: 105, providerConversationErasure: 'unconfirmed' });
    expect(f.client.agents.listConversations).toHaveBeenCalledTimes(2);
    expect(await (await f.call()).json()).toMatchObject({ success: true, archivedConversations: 0 });
  });
  it('resumes a bounded archive batch without getting stuck on the first page', async () => {
    const f = fixture(); f.conversations.push(...Array.from({ length: 1005 }, (_, i) => ({ id: `conv-${i}`, created_by_id: 'adult-a', created_date: OLD })));
    const first = await (await f.call()).json();
    expect(first).toMatchObject({ success: false, archivedConversations: 1000, nextConversationOffset: 1000 });
    expect(await (await f.call({ conversation_offset: first.nextConversationOffset })).json()).toMatchObject({ success: true, archivedConversations: 5, nextConversationOffset: null });
    expect(f.archived).toHaveLength(1005);
  });
  it('rejects foreign conversations and never archives invalid dates', async () => {
    const f = fixture(); f.conversations.push({ id: 'foreign', created_by_id: 'adult-b', created_date: OLD });
    expect(await (await f.call()).json()).toMatchObject({ success: false }); expect(f.archiveApi.create).not.toHaveBeenCalled();
  });
  it('honors indefinite retention and rejects anonymous requests before reading data', async () => {
    const f = fixture(); f.setUser(null); expect((await f.call()).status).toBe(401);
    f.setUser({ id: 'adult-a', email: 'a@example.test', preferences: { data_retention_days: 999999 } });
    expect(await (await f.call()).json()).toMatchObject({ success: true, skipped: true }); expect(f.moodApi.filter).not.toHaveBeenCalled();
  });
});
