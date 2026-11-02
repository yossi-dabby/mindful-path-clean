import { describe, expect, it } from 'vitest';
import { getRecommendationDestination, normalizeRecommendationPayload } from '../../src/components/home/recommendationData';

describe('Home recommendation payload normalization', () => {
  it('parses fenced JSON and keeps only safe supported fields', () => {
    const result = normalizeRecommendationPayload(`\`\`\`json
      {
        "insights": "A useful pattern",
        "recommendations": [
          {
            "type": "resource",
            "id": "resource-1",
            "title": "A useful resource",
            "description": "A short description",
            "reason": "A timely reason",
            "priority": "high"
          }
        ]
      }
    \`\`\``);

    expect(result.insights).toBe('A useful pattern');
    expect(result.recommendations).toEqual([
      expect.objectContaining({
        type: 'resource',
        id: 'resource-1',
        title: 'A useful resource',
        priority: 'high'
      })
    ]);
  });

  it('rejects missing titles, caps output and normalizes unknown enums', () => {
    const recommendations = Array.from({ length: 8 }, (_, index) => ({
      type: index === 0 ? 'unknown' : 'exercise',
      title: index === 1 ? '' : `Item ${index}`,
      priority: 'urgent'
    }));
    const result = normalizeRecommendationPayload({ recommendations });

    expect(result.recommendations.length).toBeLessThanOrEqual(5);
    expect(result.recommendations.some((item) => !item.title)).toBe(false);
    expect(result.recommendations[0]).toMatchObject({ type: 'exercise', priority: 'medium' });
  });

  it('maps every supported type to a safe in-app destination', () => {
    expect(getRecommendationDestination('exercise')).toEqual({ page: 'Exercises' });
    expect(getRecommendationDestination('resource')).toEqual({ page: 'Resources' });
    expect(getRecommendationDestination('video')).toEqual({ page: 'Videos' });
    expect(getRecommendationDestination('journal_prompt')).toEqual({ page: 'Chat', query: 'intent=thought_work' });
  });
});
