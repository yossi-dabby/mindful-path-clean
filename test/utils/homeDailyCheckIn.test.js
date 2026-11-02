import { describe, expect, it, vi } from 'vitest';
import { loadRecommendedExercise, saveHomeDailyCheckIn } from '../../src/lib/homeDailyCheckIn.js';
import { LOCAL_EXERCISES } from '../../src/components/exercises/exercisesData.jsx';

function fixture() {
  const moods = [], flows = [];
  const entity = (rows, id) => ({
    filter: vi.fn(async () => rows),
    create: vi.fn(async (data) => { const row = { id, ...data }; rows.push(row); return row; }),
    update: vi.fn(async (_id, data) => { Object.assign(rows[0], data); return rows[0]; }),
  });
  const client = { entities: {
    MoodEntry: entity(moods, 'sample-mood'), DailyFlow: entity(flows, 'sample-flow'),
    Exercise: { list: vi.fn(async () => []), filter: vi.fn(async () => []) },
    UserExerciseProgress: { filter: vi.fn(async () => []) },
  } };
  return { client, moods, flows };
}
const data = { mood: 'okay', energy_level: 'moderate', stress_level: 3, notes: '  QA sample only  ' };

describe('application-owned Home check-in', () => {
  it('saves explicit answers and a resolvable built-in recommendation without agent writes', async () => {
    const { client, moods, flows } = fixture();
    const saved = await saveHomeDailyCheckIn(client, data);
    expect(moods).toHaveLength(1); expect(flows).toHaveLength(1);
    expect(saved.mood).toMatchObject({ mood: 'okay', energy_level: 'moderate', stress_level: 3, notes: 'QA sample only' });
    expect(saved.flow).toMatchObject({ check_in_completed: true, exercise_completed: false, reflection_completed: false });
    expect(LOCAL_EXERCISES.some((item) => item.id === saved.flow.exercise_id)).toBe(true);
    expect(client.entities.MoodEntry.create.mock.calls[0][0]).not.toHaveProperty('created_by');
  });
  it('retries a failed flow write without duplicating the saved mood', async () => {
    const { client, moods } = fixture();
    client.entities.DailyFlow.create.mockRejectedValueOnce(new Error('Sample failure'));
    await expect(saveHomeDailyCheckIn(client, data)).rejects.toThrow('Sample failure');
    expect(moods).toHaveLength(1);
    await saveHomeDailyCheckIn(client, data);
    expect(client.entities.MoodEntry.create).toHaveBeenCalledTimes(1);
    expect(client.entities.MoodEntry.update).toHaveBeenCalledTimes(1);
  });
  it('retains an existing daily recommendation and completion on an edited check-in', async () => {
    const { client, moods, flows } = fixture();
    moods.push({ id: 'sample-mood', ...data });
    flows.push({ id: 'sample-flow', exercise_id: LOCAL_EXERCISES[0].id, exercise_completed: true, reflection_completed: true });
    await saveHomeDailyCheckIn(client, { ...data, stress_level: 4 });
    expect(flows[0]).toMatchObject({ exercise_id: LOCAL_EXERCISES[0].id, exercise_completed: true, reflection_completed: true });
    expect(client.entities.DailyFlow.create).not.toHaveBeenCalled();
  });
  it('uses the built-in catalog when remote catalog loading fails', async () => {
    const { client } = fixture(); client.entities.Exercise.list.mockRejectedValueOnce(new Error('Catalog unavailable'));
    expect((await saveHomeDailyCheckIn(client, data)).exercise.id).toMatch(/^local-/);
  });
  it('loads built-in progress from the owner record without requesting a nonexistent catalog row', async () => {
    const { client } = fixture();
    client.entities.UserExerciseProgress.filter.mockResolvedValue([{ exercise_id: LOCAL_EXERCISES[0].id, favorite: true, completed_count: 2 }]);
    const exercise = await loadRecommendedExercise(client, LOCAL_EXERCISES[0].id);
    expect(exercise).toMatchObject({ favorite: true, completed_count: 2 });
    expect(client.entities.Exercise.filter).not.toHaveBeenCalled();
  });
});
