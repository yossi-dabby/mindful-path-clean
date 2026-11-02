export function buildThoughtJournalPayload(data) {
  if (!data?.thought_type || !data?.situation?.trim() || !data?.automatic_thoughts?.trim() || !data?.emotions?.length) {
    throw new Error('missing_required_thought_fields');
  }

  const payload = {
    entry_type: 'cbt_standard',
    situation: data.situation.trim(),
    automatic_thoughts: data.automatic_thoughts.trim(),
    emotions: [...data.emotions],
    emotion_intensity: Number(data.emotion_intensity) || 5,
    tags: [data.thought_type]
  };

  if (data.balanced_thought?.trim()) payload.balanced_thought = data.balanced_thought.trim();
  return payload;
}

export function buildGoalPayload(data) {
  if (!data?.category || !data?.title?.trim() || !data?.motivation?.trim()) {
    throw new Error('missing_required_goal_fields');
  }

  const payload = {
    category: data.category,
    title: data.title.trim(),
    motivation: data.motivation.trim(),
    status: 'active',
    progress: 0
  };

  if (data.description?.trim()) payload.description = data.description.trim();
  if (data.target_date) payload.target_date = data.target_date;

  const milestones = (data.milestones || [])
    .filter((milestone) => milestone?.title?.trim())
    .map((milestone) => ({
      title: milestone.title.trim(),
      description: milestone.description?.trim() || '',
      due_date: milestone.due_date || '',
      completed: false,
      completed_date: ''
    }));
  if (milestones.length) payload.milestones = milestones;

  const smartCriteria = {};
  for (const key of ['specific', 'measurable', 'achievable', 'relevant', 'time_bound']) {
    const value = data.smart_criteria?.[key]?.trim();
    if (value) smartCriteria[key] = value;
  }
  if (Object.keys(smartCriteria).length) payload.smart_criteria = smartCriteria;

  const rewards = (data.rewards || []).map((reward) => reward?.trim()).filter(Boolean);
  if (rewards.length) payload.rewards = rewards;

  return payload;
}

export function formatLocalDate(dateValue, locale = 'en') {
  if (!dateValue) return '';
  const [year, month, day] = dateValue.split('-').map(Number);
  if (!year || !month || !day) return dateValue;
  return new Intl.DateTimeFormat(locale).format(new Date(year, month - 1, day));
}

