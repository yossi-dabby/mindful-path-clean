import { describe, it, expect } from 'vitest';
import {
  normalizeEntityList,
  classifyEntityListResponseShape,
} from '../../src/lib/entityListNormalizer.js';

describe('normalizeEntityList', () => {
  it('1. bare [] remains []', () => {
    const input = [];
    expect(normalizeEntityList(input)).toBe(input);
  });

  it('2. bare [record] returns same records', () => {
    const input = [{ id: 'a' }];
    expect(normalizeEntityList(input)).toBe(input);
  });

  it('3. {results:[record]} returns records', () => {
    const records = [{ id: 'r1' }];
    expect(normalizeEntityList({ results: records })).toBe(records);
  });

  it('4. {data:[record]} returns records', () => {
    const records = [{ id: 'r1' }];
    expect(normalizeEntityList({ data: records })).toBe(records);
  });

  it('5. {data:{results:[record]}} returns records', () => {
    const records = [{ id: 'r1' }];
    expect(normalizeEntityList({ data: { results: records } })).toBe(records);
  });

  it('6. null => []', () => {
    expect(normalizeEntityList(null)).toEqual([]);
  });

  it('7. undefined => []', () => {
    expect(normalizeEntityList(undefined)).toEqual([]);
  });

  it('8. unsupported object => []', () => {
    expect(normalizeEntityList({ count: 1 })).toEqual([]);
  });

  it('9. does not mutate source arrays/envelopes', () => {
    const arr = [{ id: 'a' }];
    const envResults = { results: [{ id: 'b' }] };
    const envData = { data: [{ id: 'c' }] };
    const envDataResults = { data: { results: [{ id: 'd' }] } };

    const snapArr = JSON.stringify(arr);
    const snapResults = JSON.stringify(envResults);
    const snapData = JSON.stringify(envData);
    const snapDataResults = JSON.stringify(envDataResults);

    normalizeEntityList(arr);
    normalizeEntityList(envResults);
    normalizeEntityList(envData);
    normalizeEntityList(envDataResults);

    expect(JSON.stringify(arr)).toBe(snapArr);
    expect(JSON.stringify(envResults)).toBe(snapResults);
    expect(JSON.stringify(envData)).toBe(snapData);
    expect(JSON.stringify(envDataResults)).toBe(snapDataResults);
  });
});

describe('classifyEntityListResponseShape', () => {
  it('classifies supported response shapes and bounded fallbacks', () => {
    expect(classifyEntityListResponseShape([])).toBe('array');
    expect(classifyEntityListResponseShape({ results: [] })).toBe('results_envelope');
    expect(classifyEntityListResponseShape({ data: [] })).toBe('data_array_envelope');
    expect(classifyEntityListResponseShape({ data: { results: [] } })).toBe('data_results_envelope');
    expect(classifyEntityListResponseShape(null)).toBe('empty');
    expect(classifyEntityListResponseShape(undefined)).toBe('empty');
    expect(classifyEntityListResponseShape({ foo: 'bar' })).toBe('unsupported');
  });
});
