import { describe, expect, it, vi } from 'vitest';
import { createEntitiesModule } from '../../node_modules/@base44/sdk/dist/modules/entities.js';
import {
  installExerciseProgressAdapter,
  isExerciseProgressUpdate,
  mergeExerciseProgress,
} from '../../src/lib/exerciseProgress.js';

describe('per-user exercise progress', () => {
  it('intercepts fresh SDK handlers, persists built-in progress and installs only once', async () => {
    const records = [];
    const catalogWrite = vi.fn();
    const axios = {
      get: vi.fn(async (url) => url.includes('/UserExerciseProgress') ? records : [{ id: 'catalog-1', favorite: true, completed_count: 99 }]),
      post: vi.fn(async (url, data) => {
        expect(url).toContain('/UserExerciseProgress');
        const record = { id: 'owner-progress', ...data }; records.push(record); return record;
      }),
      put: vi.fn(async (url, data) => {
        if (!url.includes('/UserExerciseProgress')) return catalogWrite(url, data);
        Object.assign(records[0], data); return records[0];
      }),
    };
    const client = { entities: createEntitiesModule({ axios, appId: 'isolated-check', getSocket: () => null }) };
    expect(client.entities.Exercise).not.toBe(client.entities.Exercise);
    installExerciseProgressAdapter(client);
    installExerciseProgressAdapter(client);
    expect(client.entities.Exercise).toBe(client.entities.Exercise);
    await client.entities.Exercise.update('local-grounding-54321', { favorite: true });
    await client.entities.Exercise.update('local-grounding-54321', { completed_count: 1 });
    expect(records).toEqual([{ id: 'owner-progress', exercise_id: 'local-grounding-54321', favorite: true, completed_count: 1 }]);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(catalogWrite).not.toHaveBeenCalled();
    expect((await client.entities.Exercise.list())[0]).toMatchObject({ favorite: false, completed_count: 0 });
    await client.entities.Exercise.update('catalog-1', { title: 'Catalog edit' });
    expect(catalogWrite).toHaveBeenCalledTimes(1);
    expect(typeof client.entities.MoodEntry.create).toBe('function');
  });
  it('removes legacy shared state and merges only owner-scoped progress', () => {
    const exercises = [{
      id: 'exercise-1',
      title: 'Grounding',
      favorite: true,
      completed_count: 99,
      total_time_practiced: 999,
    }];
    const progress = [{
      exercise_id: 'exercise-1',
      favorite: true,
      completed_count: 2,
      total_time_practiced: 10,
      last_completed: '2026-08-31T10:00:00.000Z',
    }];

    expect(mergeExerciseProgress(exercises, progress)).toEqual([{
      ...exercises[0],
      favorite: true,
      completed_count: 2,
      total_time_practiced: 10,
      last_completed: '2026-08-31T10:00:00.000Z',
    }]);
    expect(mergeExerciseProgress(exercises, [])[0]).toMatchObject({
      favorite: false,
      completed_count: 0,
      total_time_practiced: 0,
      last_completed: null,
    });
  });

  it('recognizes progress-only updates', () => {
    expect(isExerciseProgressUpdate({ favorite: true })).toBe(true);
    expect(isExerciseProgressUpdate({ completed_count: 2, total_time_practiced: 10 })).toBe(true);
    expect(isExerciseProgressUpdate({ title: 'Changed' })).toBe(false);
  });

  it('routes progress updates to UserExerciseProgress and preserves admin catalog updates', async () => {
    const originalCatalogUpdate = vi.fn().mockResolvedValue({ id: 'exercise-1' });
    const progressCreate = vi.fn().mockResolvedValue({ id: 'progress-1' });
    const base44 = {
      entities: {
        Exercise: {
          list: vi.fn().mockResolvedValue([{ id: 'exercise-1', favorite: true }]),
          filter: vi.fn().mockResolvedValue([{ id: 'exercise-1', favorite: true }]),
          update: originalCatalogUpdate,
        },
        UserExerciseProgress: {
          list: vi.fn().mockResolvedValue([]),
          filter: vi.fn().mockResolvedValue([]),
          create: progressCreate,
          update: vi.fn(),
        },
      },
    };

    installExerciseProgressAdapter(base44);
    expect(await base44.entities.Exercise.list()).toEqual([{
      id: 'exercise-1',
      favorite: false,
      completed_count: 0,
      last_completed: null,
      total_time_practiced: 0,
    }]);

    await base44.entities.Exercise.update('exercise-1', { favorite: true });
    expect(progressCreate).toHaveBeenCalledWith({ exercise_id: 'exercise-1', favorite: true });
    expect(originalCatalogUpdate).not.toHaveBeenCalled();

    await base44.entities.Exercise.update('exercise-1', { title: 'Admin edit' });
    expect(originalCatalogUpdate).toHaveBeenCalledWith('exercise-1', { title: 'Admin edit' });
  });
});
