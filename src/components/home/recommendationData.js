const ALLOWED_TYPES = new Set(['exercise', 'resource', 'video', 'journal_prompt']);
const ALLOWED_PRIORITIES = new Set(['high', 'medium', 'low']);

function cleanText(value, fallback = '', maxLength = 1200) {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function parseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return null;

  const cleaned = value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function normalizeRecommendationPayload(payload) {
  const parsed = parseJsonObject(payload) || (Array.isArray(payload) ? { recommendations: payload } : {});
  let rawRecommendations = parsed.recommendations;

  if (typeof rawRecommendations === 'string') {
    try {
      rawRecommendations = JSON.parse(rawRecommendations);
    } catch {
      rawRecommendations = [rawRecommendations];
    }
  }

  const recommendations = (Array.isArray(rawRecommendations) ? rawRecommendations : [])
    .slice(0, 5)
    .map((rawItem, index) => {
      const item = parseJsonObject(rawItem);
      if (!item) return null;

      const type = cleanText(item.type, 'exercise', 40).toLowerCase();
      const priority = cleanText(item.priority, 'medium', 20).toLowerCase();
      const title = cleanText(item.title || item.exercise_title || item.name, '', 180);
      if (!title) return null;

      return {
        type: ALLOWED_TYPES.has(type) ? type : 'exercise',
        id: cleanText(item.id, '', 180) || null,
        title,
        description: cleanText(item.description || item.benefit, '', 500),
        reason: cleanText(item.reason || item.expected_benefit, '', 500),
        priority: ALLOWED_PRIORITIES.has(priority) ? priority : 'medium',
        key: `${type}-${cleanText(item.id, String(index), 180)}`
      };
    })
    .filter(Boolean);

  return {
    recommendations,
    insights: cleanText(parsed.insights || parsed.summary, '', 1000)
  };
}

export function getRecommendationDestination(type) {
  switch (type) {
    case 'journal_prompt':
      return { page: 'Chat', query: 'intent=thought_work' };
    case 'resource':
      return { page: 'Resources' };
    case 'video':
      return { page: 'Videos' };
    case 'exercise':
    default:
      return { page: 'Exercises' };
  }
}
