import { describe, expect, it } from 'vitest';
import { gamesCatalog } from '../../src/components/experiential_games/mindGamesContent';
import {
  formatMindGameDuration,
  getMindGameMetadata,
  getMindGameRecommendations,
  MIND_GAME_METADATA,
} from '../../src/components/experiential_games/mindGameMetadata';

const validCategories = ['CBT', 'DBT', 'ACT'];
const validSkills = [
  'cognitive_restructuring',
  'distress_tolerance',
  'emotion_regulation',
  'behavioral_activation',
  'mindfulness',
  'defusion',
  'grounding',
];

describe('premium mind games data', () => {
  it('covers every catalog game with schema-safe tracking metadata', () => {
    expect(gamesCatalog).toHaveLength(29);
    for (const game of gamesCatalog) {
      expect(MIND_GAME_METADATA[game.id], game.id).toBeDefined();
      const metadata = getMindGameMetadata(game.id);
      expect(validCategories, game.id).toContain(metadata.category);
      expect(validSkills, game.id).toContain(metadata.skill);
      expect(['CBT', 'DBT', 'ACT', 'focus'], game.id).toContain(metadata.group);
    }
  });

  it('uses a stable, beginner-friendly set for a new user', () => {
    expect(getMindGameRecommendations([], gamesCatalog)).toEqual([
      'calm_bingo',
      'quick_win',
      'thought_quiz',
    ]);
  });

  it('returns three unique, available recommendations from valid activity data', () => {
    const activities = [
      { game_id: 'memory_match', category: 'CBT', skill_focus: 'mindfulness' },
      { game_id: 'focus_flow', category: 'CBT', skill_focus: 'mindfulness' },
      { game_id: 'focus_flow', category: 'CBT', skill_focus: 'mindfulness' },
      { game_id: 'unknown_game', category: 'CBT', skill_focus: 'mindfulness' },
    ];
    const recommendations = getMindGameRecommendations(activities, gamesCatalog);
    expect(recommendations).toHaveLength(3);
    expect(new Set(recommendations).size).toBe(3);
    for (const id of recommendations) {
      expect(gamesCatalog.some((game) => game.id === id)).toBe(true);
      expect(['memory_match', 'focus_flow']).not.toContain(id);
    }
  });

  it('localizes both seconds and minutes without changing ranges', () => {
    const t = (key) => ({
      'mind_games.premium.second_short': 'שנ׳',
      'mind_games.premium.minute_short': 'דק׳',
    })[key];
    expect(formatMindGameDuration('60–90s', t)).toBe('60–90 שנ׳');
    expect(formatMindGameDuration('2-5 min', t)).toBe('2–5 דק׳');
  });
});
