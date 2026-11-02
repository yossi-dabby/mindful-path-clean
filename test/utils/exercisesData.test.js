import { describe, it, expect } from 'vitest';
import {
  LOCAL_EXERCISES,
  EXERCISE_CATEGORIES,
  REQUIRED_COGNITIVE_EXERCISE_IDS,
  validateExercisesTaxonomy,
  mergeExercises
} from '../../src/components/exercises/exercisesData.js';

describe('LOCAL_EXERCISES data model', () => {
  it('has exactly 40 exercises (5 per 8 categories)', () => {
    expect(LOCAL_EXERCISES).toHaveLength(40);
  });

  it('each exercise has all required fields', () => {
    for (const ex of LOCAL_EXERCISES) {
      expect(ex.id, `${ex.id} missing id`).toBeTruthy();
      expect(ex.title, `${ex.id} missing title`).toBeTruthy();
      expect(ex.description, `${ex.id} missing description`).toBeTruthy();
      expect(ex.category, `${ex.id} missing category`).toBeTruthy();
      expect(ex.difficulty, `${ex.id} missing difficulty`).toBeTruthy();
      expect(['Beginner', 'Intermediate', 'Advanced'], `${ex.id} invalid difficulty`).toContain(ex.difficulty);
      expect(ex.duration_minutes, `${ex.id} missing duration_minutes`).toBeGreaterThan(0);
      expect(ex.tags, `${ex.id} missing tags`).toBeInstanceOf(Array);
      expect(ex.tags.length, `${ex.id} must have at least 1 tag`).toBeGreaterThan(0);
    }
  });

  it('has no duplicate IDs', () => {
    const ids = LOCAL_EXERCISES.map(e => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('contains no breathing exercises (breathing is out of scope)', () => {
    const breathingExercises = LOCAL_EXERCISES.filter(e => e.category === 'breathing');
    expect(breathingExercises).toHaveLength(0);
  });
});

describe('EXERCISE_CATEGORIES', () => {
  it('contains exactly 8 categories', () => {
    expect(EXERCISE_CATEGORIES).toHaveLength(8);
  });

  it('has all required category values', () => {
    const values = EXERCISE_CATEGORIES.map(c => c.value);
    expect(values).toContain('grounding');
    expect(values).toContain('cognitive_restructuring');
    expect(values).toContain('behavioral_activation');
    expect(values).toContain('mindfulness');
    expect(values).toContain('exposure');
    expect(values).toContain('sleep');
    expect(values).toContain('relationships');
    expect(values).toContain('stress_management');
  });

  it('has the required English labels', () => {
    const labelMap = Object.fromEntries(EXERCISE_CATEGORIES.map(c => [c.value, c.label]));
    expect(labelMap['grounding']).toBe('Grounding');
    expect(labelMap['cognitive_restructuring']).toBe('Cognitive');
    expect(labelMap['behavioral_activation']).toBe('Behavioral');
    expect(labelMap['mindfulness']).toBe('Mindfulness');
    expect(labelMap['exposure']).toBe('Exposure');
    expect(labelMap['sleep']).toBe('Sleep');
    expect(labelMap['relationships']).toBe('Relationship');
    expect(labelMap['stress_management']).toBe('Stress Management');
  });

  it('each category has exactly 5 local exercises', () => {
    for (const cat of EXERCISE_CATEGORIES) {
      const count = LOCAL_EXERCISES.filter(e => e.category === cat.value).length;
      expect(count, `Category "${cat.label}" should have 5 exercises, got ${count}`).toBe(5);
    }
  });
});

describe('Required CBT exercises', () => {
  it('all 4 required CBT exercise IDs exist', () => {
    const localIds = new Set(LOCAL_EXERCISES.map(e => e.id));
    for (const reqId of REQUIRED_COGNITIVE_EXERCISE_IDS) {
      expect(localIds.has(reqId), `Required exercise "${reqId}" not found`).toBe(true);
    }
  });

  it('all 4 required CBT exercises are under cognitive_restructuring', () => {
    for (const reqId of REQUIRED_COGNITIVE_EXERCISE_IDS) {
      const ex = LOCAL_EXERCISES.find(e => e.id === reqId);
      expect(ex, `Required exercise "${reqId}" not found`).toBeDefined();
      expect(ex.category, `"${reqId}" must be cognitive_restructuring`).toBe('cognitive_restructuring');
    }
  });

  it('Decatastrophizing Practice exists', () => {
    const ex = LOCAL_EXERCISES.find(e => e.id === 'local-cognitive-decatastrophizing');
    expect(ex).toBeDefined();
    expect(ex.title).toBe('Decatastrophizing Practice');
  });

  it('Cognitive Distortion Detective exists', () => {
    const ex = LOCAL_EXERCISES.find(e => e.id === 'local-cognitive-distortion-detective');
    expect(ex).toBeDefined();
    expect(ex.title).toBe('Cognitive Distortion Detective');
  });

  it('Evidence-Based Reality Testing exists', () => {
    const ex = LOCAL_EXERCISES.find(e => e.id === 'local-cognitive-evidence-testing');
    expect(ex).toBeDefined();
    expect(ex.title).toBe('Evidence-Based Reality Testing');
  });

  it('Thought Challenging exists', () => {
    const ex = LOCAL_EXERCISES.find(e => e.id === 'local-cognitive-thought-challenging');
    expect(ex).toBeDefined();
    expect(ex.title).toBe('Thought Challenging');
  });
});

describe('mergeExercises()', () => {
  it('returns all local exercises when no API exercises provided', () => {
    const merged = mergeExercises([]);
    expect(merged).toHaveLength(LOCAL_EXERCISES.length);
  });

  it('adds new API exercises that do not share an ID with local ones', () => {
    const apiEx = [{ id: 'api-new-exercise', category: 'grounding', title: 'New API Exercise' }];
    const merged = mergeExercises(apiEx);
    expect(merged).toHaveLength(LOCAL_EXERCISES.length + 1);
  });

  it('deduplicates API exercises that share an ID with local ones (local wins)', () => {
    const apiEx = [{ id: LOCAL_EXERCISES[0].id, title: 'API version — should be ignored' }];
    const merged = mergeExercises(apiEx);
    expect(merged).toHaveLength(LOCAL_EXERCISES.length);
    const found = merged.find(e => e.id === LOCAL_EXERCISES[0].id);
    expect(found.title).toBe(LOCAL_EXERCISES[0].title);
  });

  it('merged result has no duplicate IDs', () => {
    const apiEx = [
      { id: 'api-1', category: 'grounding', title: 'API 1' },
      { id: 'api-2', category: 'sleep', title: 'API 2' }
    ];
    const merged = mergeExercises(apiEx);
    const ids = merged.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('validateExercisesTaxonomy()', () => {
  it('runs without throwing on valid data', () => {
    expect(() => validateExercisesTaxonomy(LOCAL_EXERCISES)).not.toThrow();
  });

  it('logs warnings (to console) when a category has fewer than 5 exercises', () => {
    const warnMessages = [];
    const originalWarn = console.warn;
    console.warn = (...args) => warnMessages.push(args.join(' '));
    const incomplete = LOCAL_EXERCISES.filter(e => e.category !== 'grounding');
    validateExercisesTaxonomy(incomplete);
    console.warn = originalWarn;
    expect(warnMessages.some(m => m.includes('Grounding'))).toBe(true);
  });
});
