import { describe, it, expect } from 'vitest';
import { BREATHING_EXERCISES, getCalmLadderPhases, getPhases } from '../../src/components/exercises/breathingExercisesData.js';

describe('BREATHING_EXERCISES data model', () => {
  it('has exactly 6 exercises', () => {
    expect(BREATHING_EXERCISES).toHaveLength(6);
  });

  it('each exercise has required fields', () => {
    for (const ex of BREATHING_EXERCISES) {
      expect(ex.id, `${ex.id} missing id`).toBeTruthy();
      expect(ex.nameKey, `${ex.id} missing nameKey`).toBeTruthy();
      expect(ex.descKey, `${ex.id} missing descKey`).toBeTruthy();
      expect(ex.defaultMinutes, `${ex.id} missing defaultMinutes`).toBeGreaterThan(0);
      expect(ex.minMinutes, `${ex.id} missing minMinutes`).toBeGreaterThan(0);
      expect(ex.maxMinutes, `${ex.id} missing maxMinutes`).toBeGreaterThan(0);
      expect(ex.minMinutes).toBeLessThanOrEqual(ex.defaultMinutes);
      expect(ex.defaultMinutes).toBeLessThanOrEqual(ex.maxMinutes);
      expect(['mint', 'indigo', 'sunset'], `${ex.id} invalid themeKey`).toContain(ex.themeKey);
    }
  });

  it('box breathing has 4-4-4-4 pattern', () => {
    const box = BREATHING_EXERCISES.find(e => e.id === 'box');
    expect(box).toBeDefined();
    expect(box.phases).toHaveLength(4);
    expect(box.phases[0]).toMatchObject({ key: 'inhale', duration: 4 });
    expect(box.phases[1]).toMatchObject({ key: 'hold1', duration: 4 });
    expect(box.phases[2]).toMatchObject({ key: 'exhale', duration: 4 });
    expect(box.phases[3]).toMatchObject({ key: 'hold2', duration: 4 });
  });

  it('4-7-8 breathing has 4-7-8 pattern (no final hold)', () => {
    const ex = BREATHING_EXERCISES.find(e => e.id === 'four_seven_eight');
    expect(ex).toBeDefined();
    expect(ex.phases).toHaveLength(3);
    expect(ex.phases[0]).toMatchObject({ key: 'inhale', duration: 4 });
    expect(ex.phases[1]).toMatchObject({ key: 'hold1', duration: 7 });
    expect(ex.phases[2]).toMatchObject({ key: 'exhale', duration: 8 });
  });

  it('coherent breathing has 5-5 pattern (no holds)', () => {
    const ex = BREATHING_EXERCISES.find(e => e.id === 'coherent');
    expect(ex).toBeDefined();
    expect(ex.phases).toHaveLength(2);
    expect(ex.phases[0]).toMatchObject({ key: 'inhale', duration: 5 });
    expect(ex.phases[1]).toMatchObject({ key: 'exhale', duration: 5 });
  });

  it('extended exhale has 4-2-6 pattern', () => {
    const ex = BREATHING_EXERCISES.find(e => e.id === 'extended_exhale');
    expect(ex).toBeDefined();
    expect(ex.phases).toHaveLength(3);
    expect(ex.phases[0]).toMatchObject({ key: 'inhale', duration: 4 });
    expect(ex.phases[1]).toMatchObject({ key: 'hold1', duration: 2 });
    expect(ex.phases[2]).toMatchObject({ key: 'exhale', duration: 6 });
  });

  it('resonant breathing has 6-2-6-2 pattern', () => {
    const ex = BREATHING_EXERCISES.find(e => e.id === 'resonant');
    expect(ex).toBeDefined();
    expect(ex.phases).toHaveLength(4);
    expect(ex.phases[0]).toMatchObject({ key: 'inhale', duration: 6 });
    expect(ex.phases[1]).toMatchObject({ key: 'hold1', duration: 2 });
    expect(ex.phases[2]).toMatchObject({ key: 'exhale', duration: 6 });
    expect(ex.phases[3]).toMatchObject({ key: 'hold2', duration: 2 });
  });

  it('calm ladder is adaptive (no fixed phases)', () => {
    const ex = BREATHING_EXERCISES.find(e => e.id === 'calm_ladder');
    expect(ex).toBeDefined();
    expect(ex.isAdaptive).toBe(true);
    expect(ex.phases).toBeNull();
  });

  it('all non-adaptive exercises have valid phase labelKeys', () => {
    const validLabelKeys = [
      'breathing_tool.phases.inhale',
      'breathing_tool.phases.exhale',
      'breathing_tool.phases.hold',
    ];
    for (const ex of BREATHING_EXERCISES) {
      if (ex.isAdaptive) continue;
      for (const phase of ex.phases) {
        expect(validLabelKeys, `${ex.id}: unexpected labelKey "${phase.labelKey}"`).toContain(phase.labelKey);
        expect(phase.duration, `${ex.id}.${phase.key} must have positive duration`).toBeGreaterThan(0);
      }
    }
  });

  it('all exercise ids are unique', () => {
    const ids = BREATHING_EXERCISES.map(e => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all exercises have i18n-ready key strings (no raw text in nameKey/descKey)', () => {
    for (const ex of BREATHING_EXERCISES) {
      expect(ex.nameKey).toMatch(/^breathing_tool\./);
      expect(ex.descKey).toMatch(/^breathing_tool\./);
    }
  });
});

describe('getCalmLadderPhases', () => {
  it('returns 3-3 pattern for cycles 0-2', () => {
    for (const c of [0, 1, 2]) {
      const phases = getCalmLadderPhases(c);
      expect(phases).toHaveLength(2);
      expect(phases[0].duration).toBe(3);
      expect(phases[1].duration).toBe(3);
    }
  });

  it('returns 4-4 pattern for cycles 3-5', () => {
    for (const c of [3, 4, 5]) {
      const phases = getCalmLadderPhases(c);
      expect(phases[0].duration).toBe(4);
      expect(phases[1].duration).toBe(4);
    }
  });

  it('returns 5-5 pattern for cycles 6+', () => {
    for (const c of [6, 7, 10]) {
      const phases = getCalmLadderPhases(c);
      expect(phases[0].duration).toBe(5);
      expect(phases[1].duration).toBe(5);
    }
  });

  it('all stages have inhale then exhale', () => {
    for (const c of [0, 3, 6]) {
      const phases = getCalmLadderPhases(c);
      expect(phases[0].key).toBe('inhale');
      expect(phases[1].key).toBe('exhale');
    }
  });
});

describe('getPhases', () => {
  it('returns fixed phases for non-adaptive exercises', () => {
    const box = BREATHING_EXERCISES.find(e => e.id === 'box');
    expect(getPhases(box, 0)).toBe(box.phases);
    expect(getPhases(box, 10)).toBe(box.phases);
  });

  it('returns adaptive phases for calm_ladder', () => {
    const ladder = BREATHING_EXERCISES.find(e => e.id === 'calm_ladder');
    expect(getPhases(ladder, 0)[0].duration).toBe(3);
    expect(getPhases(ladder, 4)[0].duration).toBe(4);
    expect(getPhases(ladder, 7)[0].duration).toBe(5);
  });
});
