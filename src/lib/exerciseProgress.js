const PROGRESS_FIELDS = new Set([
  'favorite',
  'completed_count',
  'last_completed',
  'total_time_practiced',
]);

function boundedNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

export function mergeExerciseProgress(exercises, progressRecords) {
  if (!Array.isArray(exercises)) return [];
  const byExerciseId = new Map();

  for (const record of Array.isArray(progressRecords) ? progressRecords : []) {
    if (!record?.exercise_id) continue;
    const previous = byExerciseId.get(record.exercise_id);
    const previousTime = new Date(previous?.updated_date || previous?.created_date || 0).getTime();
    const nextTime = new Date(record.updated_date || record.created_date || 0).getTime();
    if (!previous || nextTime >= previousTime) byExerciseId.set(record.exercise_id, record);
  }

  return exercises.map((exercise) => {
    const progress = byExerciseId.get(exercise.id);
    return {
      ...exercise,
      favorite: progress?.favorite === true,
      completed_count: boundedNumber(progress?.completed_count),
      last_completed: progress?.last_completed || null,
      total_time_practiced: boundedNumber(progress?.total_time_practiced),
    };
  });
}

export function isExerciseProgressUpdate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const keys = Object.keys(data);
  return keys.length > 0 && keys.every((key) => PROGRESS_FIELDS.has(key));
}

function sanitizeProgressUpdate(data) {
  const sanitized = {};
  if ('favorite' in data) sanitized.favorite = data.favorite === true;
  if ('completed_count' in data) sanitized.completed_count = boundedNumber(data.completed_count);
  if ('last_completed' in data) {
    sanitized.last_completed = typeof data.last_completed === 'string' ? data.last_completed : null;
  }
  if ('total_time_practiced' in data) {
    sanitized.total_time_practiced = boundedNumber(data.total_time_practiced);
  }
  return sanitized;
}

export function installExerciseProgressAdapter(base44) {
  const originalEntities = base44?.entities;
  const exerciseEntity = originalEntities?.Exercise;
  const progressEntity = base44?.entities?.UserExerciseProgress;
  if (!exerciseEntity || !progressEntity || exerciseEntity.__userProgressAdapterInstalled) return;

  const originalList = exerciseEntity.list?.bind(exerciseEntity);
  const originalFilter = exerciseEntity.filter?.bind(exerciseEntity);
  const originalUpdate = exerciseEntity.update?.bind(exerciseEntity);

  const mergeWithCurrentUserProgress = async (exercises) => {
    try {
      const progress = await progressEntity.list('-updated_date', 500);
      return mergeExerciseProgress(exercises, progress);
    } catch (_error) {
      return mergeExerciseProgress(exercises, []);
    }
  };

  if (originalList) {
    exerciseEntity.list = (...args) => originalList(...args).then(mergeWithCurrentUserProgress);
  }
  if (originalFilter) {
    exerciseEntity.filter = (...args) => originalFilter(...args).then(mergeWithCurrentUserProgress);
  }
  if (originalUpdate) {
    exerciseEntity.update = async (exerciseId, data) => {
      if (!isExerciseProgressUpdate(data)) return originalUpdate(exerciseId, data);

      const existing = await progressEntity.filter({ exercise_id: exerciseId }, '-updated_date', 1);
      const payload = sanitizeProgressUpdate(data);
      if (existing?.[0]) return progressEntity.update(existing[0].id, payload);
      return progressEntity.create({ exercise_id: exerciseId, ...payload });
    };
  }

  // The SDK creates a new handler for every property read. Keep the wrapped
  // Exercise handler stable while delegating every other entity to the SDK.
  base44.entities = new Proxy(originalEntities, {
    get(target, name, receiver) {
      return name === 'Exercise' ? exerciseEntity : Reflect.get(target, name, receiver);
    },
  });

  Object.defineProperty(exerciseEntity, '__userProgressAdapterInstalled', {
    value: true,
    enumerable: false,
  });
}
