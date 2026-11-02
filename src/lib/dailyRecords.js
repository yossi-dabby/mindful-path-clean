const PAGE_SIZE = 25;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const dailyRecordDate = () => new Date().toISOString().slice(0, 10);

function validDate(date) {
  if (!DATE_PATTERN.test(date || '')) return false;
  const value = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(value.getTime()) && value.toISOString().slice(0, 10) === date;
}

export function formatDailyRecordDate(date, language) {
  if (!validDate(date)) return date || '';
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

export async function loadDailyRecordsPage(client, offset = 0) {
  const [moods, flows] = await Promise.all([
    client.entities.MoodEntry.list('-date', PAGE_SIZE, offset),
    client.entities.DailyFlow.list('-date', PAGE_SIZE, offset),
  ]);
  if (!Array.isArray(moods) || !Array.isArray(flows)) throw new Error('Invalid daily records response');
  return { moods, flows, nextOffset: offset + PAGE_SIZE, hasMore: moods.length === PAGE_SIZE || flows.length === PAGE_SIZE };
}

export function groupDailyRecords(pages = []) {
  const groups = new Map();
  const seen = { moods: new Set(), flows: new Set() };
  for (const page of pages) {
    for (const kind of ['moods', 'flows']) {
      for (const record of page[kind] || []) {
        if (!record?.id || seen[kind].has(record.id)) continue;
        seen[kind].add(record.id);
        const date = record.date || '';
        if (!groups.has(date)) groups.set(date, { date, moods: [], flows: [] });
        groups.get(date)[kind].push(record);
      }
    }
  }
  const newest = (a, b) => (Date.parse(b.created_date) || 0) - (Date.parse(a.created_date) || 0);
  return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date)).map((day) => ({
    ...day, moods: day.moods.sort(newest), flows: day.flows.sort(newest), canDelete: validDate(day.date),
  }));
}

async function recordsForDate(entity, date) {
  const records = [];
  const seen = new Set();
  for (let offset = 0; ; offset += 100) {
    const page = await entity.filter({ date }, '-created_date', 100, offset);
    if (!Array.isArray(page) || page.some((record) => !record?.id || record.date !== date)) {
      throw new Error('Invalid records for selected date');
    }
    for (const record of page) {
      if (seen.has(record.id)) throw new Error('Daily record pagination did not advance');
      seen.add(record.id);
      records.push(record);
    }
    if (page.length < 100) return records;
  }
}

// The signed-in client and existing owner RLS govern every read and delete.
// A day includes its check-ins and reflections; exercise progress is separate.
export async function deleteDailyRecordDate(client, date) {
  if (!validDate(date)) throw new Error('Invalid daily record date');
  const load = () => Promise.all([
    recordsForDate(client.entities.MoodEntry, date),
    recordsForDate(client.entities.DailyFlow, date),
  ]);
  const [moods, flows] = await load();
  await Promise.allSettled([
    ...moods.map((record) => client.entities.MoodEntry.delete(record.id)),
    ...flows.map((record) => client.entities.DailyFlow.delete(record.id)),
  ]);
  // Verify persistence, including a retry after a partial deletion. Do not
  // announce success merely because a request returned without throwing.
  const remaining = await load();
  if (remaining.some((records) => records.length)) throw new Error('Some daily records could not be removed');
  return { date, removed: moods.length + flows.length };
}
