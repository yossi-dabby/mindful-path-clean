import { LOCAL_EXERCISES, mergeExercises } from '../components/exercises/exercisesData.jsx';
import { mergeExerciseProgress } from './exerciseProgress.js';

// Built-in practices have stable IDs but are not rows in the remote catalog.
export async function loadRecommendedExercise(client, exerciseId) {
  const local = LOCAL_EXERCISES.find((item) => item.id === exerciseId);
  if (local) {
    const progress = await client.entities.UserExerciseProgress.filter({ exercise_id: exerciseId }, '-updated_date', 1);
    return mergeExerciseProgress([local], progress)[0];
  }
  const exercises = await client.entities.Exercise.filter({ id: exerciseId });
  return exercises[0] || null;
}

// Writes run only after the user explicitly submits the check-in. Retrying a
// partial failure updates today's existing mood/flow instead of duplicating it.
export async function saveHomeDailyCheckIn(client, data) {
  const date = new Date().toISOString().slice(0, 10);
  const [moods, flows, catalog] = await Promise.all([
    client.entities.MoodEntry.filter({ date }, '-created_date', 1),
    client.entities.DailyFlow.filter({ date }, '-created_date', 1),
    client.entities.Exercise.list().catch(() => []),
  ]);
  const exercises = mergeExercises(catalog);
  const previousFlow = flows[0];
  const previousExercise = exercises.find((item) => item.id === previousFlow?.exercise_id);
  const exercise = previousExercise || exercises.find((item) => item.category === 'mindfulness') || exercises[0];
  if (!exercise) throw new Error('No daily practice available');
  const payload = { date, mood: data.mood, energy_level: data.energy_level, stress_level: data.stress_level, notes: data.notes.trim() };
  const mood = moods[0]
    ? await client.entities.MoodEntry.update(moods[0].id, payload)
    : await client.entities.MoodEntry.create(payload);
  const flowPayload = {
    date,
    check_in_completed: true,
    check_in_time: new Date().toISOString(),
    exercise_id: exercise.id,
    mood_snapshot: { mood: data.mood, energy_level: data.energy_level, stress_level: data.stress_level },
    ...(!previousExercise ? { exercise_completed: false, reflection_completed: false } : {}),
  };
  const flow = previousFlow
    ? await client.entities.DailyFlow.update(previousFlow.id, flowPayload)
    : await client.entities.DailyFlow.create(flowPayload);
  return { mood, flow, exercise };
}
