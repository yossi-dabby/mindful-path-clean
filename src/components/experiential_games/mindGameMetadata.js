export const MIND_GAME_METADATA = {
  thought_quiz: { category: 'CBT', skill: 'cognitive_restructuring', group: 'CBT' },
  reframe_pick: { category: 'CBT', skill: 'cognitive_restructuring', group: 'CBT' },
  value_compass: { category: 'ACT', skill: 'mindfulness', group: 'ACT' },
  tiny_experiment: { category: 'CBT', skill: 'behavioral_activation', group: 'CBT' },
  quick_win: { category: 'DBT', skill: 'behavioral_activation', group: 'DBT' },
  calm_bingo: { category: 'DBT', skill: 'grounding', group: 'DBT' },
  dbt_stop: { category: 'DBT', skill: 'emotion_regulation', group: 'DBT' },
  opposite_action: { category: 'DBT', skill: 'emotion_regulation', group: 'DBT' },
  urge_surfing: { category: 'DBT', skill: 'distress_tolerance', group: 'DBT' },
  worry_time: { category: 'CBT', skill: 'cognitive_restructuring', group: 'CBT' },
  evidence_balance: { category: 'CBT', skill: 'cognitive_restructuring', group: 'CBT' },
  defusion_cards: { category: 'ACT', skill: 'defusion', group: 'ACT' },
  tipp_skills: { category: 'DBT', skill: 'distress_tolerance', group: 'DBT' },
  accepts: { category: 'DBT', skill: 'distress_tolerance', group: 'DBT' },
  willing_hands: { category: 'DBT', skill: 'emotion_regulation', group: 'DBT' },
  half_smile: { category: 'DBT', skill: 'emotion_regulation', group: 'DBT' },
  improve: { category: 'DBT', skill: 'distress_tolerance', group: 'DBT' },
  leaves_on_stream: { category: 'ACT', skill: 'defusion', group: 'ACT' },
  expansion: { category: 'ACT', skill: 'emotion_regulation', group: 'ACT' },
  values_check: { category: 'ACT', skill: 'mindfulness', group: 'ACT' },
  pros_and_cons: { category: 'DBT', skill: 'emotion_regulation', group: 'DBT' },
  check_the_facts: { category: 'DBT', skill: 'emotion_regulation', group: 'DBT' },
  self_soothe: { category: 'DBT', skill: 'distress_tolerance', group: 'DBT' },
  mountain_meditation: { category: 'ACT', skill: 'mindfulness', group: 'ACT' },
  memory_match: { category: 'CBT', skill: 'mindfulness', group: 'focus' },
  focus_flow: { category: 'CBT', skill: 'mindfulness', group: 'focus' },
  pattern_shift: { category: 'CBT', skill: 'cognitive_restructuring', group: 'focus' },
  word_association: { category: 'CBT', skill: 'cognitive_restructuring', group: 'focus' },
  number_sequence: { category: 'CBT', skill: 'cognitive_restructuring', group: 'focus' },
};

export const DEFAULT_MIND_GAME_METADATA = {
  category: 'CBT',
  skill: 'mindfulness',
  group: 'CBT',
};

const BEGINNER_GAME_IDS = ['calm_bingo', 'quick_win', 'thought_quiz'];

export function getMindGameMetadata(gameId) {
  return MIND_GAME_METADATA[gameId] || DEFAULT_MIND_GAME_METADATA;
}

export function getMindGameRecommendations(activities = [], catalog = []) {
  const availableIds = catalog.map((game) => game.id).filter((id) => MIND_GAME_METADATA[id]);
  if (availableIds.length === 0) return [];

  const validActivities = activities.filter(
    (activity) => activity?.game_id && availableIds.includes(activity.game_id)
  );

  if (validActivities.length === 0) {
    return BEGINNER_GAME_IDS.filter((id) => availableIds.includes(id)).slice(0, 3);
  }

  const playCount = {};
  const skillCount = {};
  const categoryCount = {};

  validActivities.forEach((activity) => {
    const metadata = getMindGameMetadata(activity.game_id);
    const skill = activity.skill_focus || metadata.skill;
    const category = activity.category || metadata.category;
    playCount[activity.game_id] = (playCount[activity.game_id] || 0) + 1;
    skillCount[skill] = (skillCount[skill] || 0) + 1;
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });

  const mostFrequent = (counts) => Object.keys(counts).sort(
    (a, b) => counts[b] - counts[a] || a.localeCompare(b)
  )[0];
  const topSkill = mostFrequent(skillCount);
  const topCategory = mostFrequent(categoryCount);
  const playedIds = new Set(Object.keys(playCount));
  const unplayedIds = availableIds.filter((id) => !playedIds.has(id));
  const recommendations = [];
  const addUnique = (ids) => ids.forEach((id) => {
    if (recommendations.length < 3 && !recommendations.includes(id)) recommendations.push(id);
  });

  addUnique(unplayedIds.filter((id) => getMindGameMetadata(id).skill === topSkill).slice(0, 2));
  addUnique(unplayedIds.filter((id) => getMindGameMetadata(id).category === topCategory));
  addUnique(unplayedIds);
  addUnique(Object.keys(playCount).sort((a, b) => playCount[b] - playCount[a] || a.localeCompare(b)));

  return recommendations.slice(0, 3);
}

export function formatMindGameDuration(value, translate) {
  if (!value) return '';
  return String(value)
    .replace(/\s*min\b/gi, ` ${translate('mind_games.premium.minute_short')}`)
    .replace(/(\d)\s*s\b/gi, `$1 ${translate('mind_games.premium.second_short')}`)
    .replace(/-/g, '–');
}
