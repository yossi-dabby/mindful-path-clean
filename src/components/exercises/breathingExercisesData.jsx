/**
 * Breathing exercise definitions for the Interactive Breathing Tool.
 * Each exercise includes phase timings, defaults, and i18n keys.
 */

export const BREATHING_EXERCISES = [
  {
    id: 'box',
    nameKey: 'breathing_tool.exercises.box.name',
    descKey: 'breathing_tool.exercises.box.description',
    phases: [
      { key: 'inhale', duration: 4, labelKey: 'breathing_tool.phases.inhale' },
      { key: 'hold1',  duration: 4, labelKey: 'breathing_tool.phases.hold' },
      { key: 'exhale', duration: 4, labelKey: 'breathing_tool.phases.exhale' },
      { key: 'hold2',  duration: 4, labelKey: 'breathing_tool.phases.hold' },
    ],
    defaultMinutes: 4,
    minMinutes: 2,
    maxMinutes: 10,
    themeKey: 'mint',
    isAdaptive: false,
  },
  {
    id: 'four_seven_eight',
    nameKey: 'breathing_tool.exercises.four_seven_eight.name',
    descKey: 'breathing_tool.exercises.four_seven_eight.description',
    phases: [
      { key: 'inhale', duration: 4, labelKey: 'breathing_tool.phases.inhale' },
      { key: 'hold1',  duration: 7, labelKey: 'breathing_tool.phases.hold' },
      { key: 'exhale', duration: 8, labelKey: 'breathing_tool.phases.exhale' },
    ],
    defaultMinutes: 3,
    minMinutes: 2,
    maxMinutes: 10,
    themeKey: 'indigo',
    isAdaptive: false,
  },
  {
    id: 'coherent',
    nameKey: 'breathing_tool.exercises.coherent.name',
    descKey: 'breathing_tool.exercises.coherent.description',
    phases: [
      { key: 'inhale', duration: 5, labelKey: 'breathing_tool.phases.inhale' },
      { key: 'exhale', duration: 5, labelKey: 'breathing_tool.phases.exhale' },
    ],
    defaultMinutes: 5,
    minMinutes: 2,
    maxMinutes: 10,
    themeKey: 'sunset',
    isAdaptive: false,
  },
  {
    id: 'extended_exhale',
    nameKey: 'breathing_tool.exercises.extended_exhale.name',
    descKey: 'breathing_tool.exercises.extended_exhale.description',
    phases: [
      { key: 'inhale', duration: 4, labelKey: 'breathing_tool.phases.inhale' },
      { key: 'hold1',  duration: 2, labelKey: 'breathing_tool.phases.hold' },
      { key: 'exhale', duration: 6, labelKey: 'breathing_tool.phases.exhale' },
    ],
    defaultMinutes: 4,
    minMinutes: 2,
    maxMinutes: 10,
    themeKey: 'mint',
    isAdaptive: false,
  },
  {
    id: 'resonant',
    nameKey: 'breathing_tool.exercises.resonant.name',
    descKey: 'breathing_tool.exercises.resonant.description',
    phases: [
      { key: 'inhale', duration: 6, labelKey: 'breathing_tool.phases.inhale' },
      { key: 'hold1',  duration: 2, labelKey: 'breathing_tool.phases.hold' },
      { key: 'exhale', duration: 6, labelKey: 'breathing_tool.phases.exhale' },
      { key: 'hold2',  duration: 2, labelKey: 'breathing_tool.phases.hold' },
    ],
    defaultMinutes: 5,
    minMinutes: 2,
    maxMinutes: 10,
    themeKey: 'indigo',
    isAdaptive: false,
  },
  {
    id: 'calm_ladder',
    nameKey: 'breathing_tool.exercises.calm_ladder.name',
    descKey: 'breathing_tool.exercises.calm_ladder.description',
    phases: null,
    isAdaptive: true,
    defaultMinutes: 5,
    minMinutes: 2,
    maxMinutes: 10,
    themeKey: 'sunset',
  },
];

/**
 * Returns adaptive phases for the Calm Ladder exercise based on cycle count.
 * Stages: 3-3 (cycles 0-2) → 4-4 (cycles 3-5) → 5-5 (cycles 6+)
 */
export function getCalmLadderPhases(cycleCount) {
  if (cycleCount < 3) {
    return [
      { key: 'inhale', duration: 3, labelKey: 'breathing_tool.phases.inhale' },
      { key: 'exhale', duration: 3, labelKey: 'breathing_tool.phases.exhale' },
    ];
  }
  if (cycleCount < 6) {
    return [
      { key: 'inhale', duration: 4, labelKey: 'breathing_tool.phases.inhale' },
      { key: 'exhale', duration: 4, labelKey: 'breathing_tool.phases.exhale' },
    ];
  }
  return [
    { key: 'inhale', duration: 5, labelKey: 'breathing_tool.phases.inhale' },
    { key: 'exhale', duration: 5, labelKey: 'breathing_tool.phases.exhale' },
  ];
}

/** Returns phases for an exercise, handling the adaptive calm_ladder case. */
export function getPhases(exercise, cycleCount) {
  return exercise.isAdaptive ? getCalmLadderPhases(cycleCount) : (exercise.phases || []);
}
