/**
 * Tests for compliance report calculation logic (mirrors functions/generateComplianceReport.ts).
 *
 * That file is a Deno serverless function excluded from vitest, so the pure
 * aggregation and reporting helpers are reproduced inline below.
 *
 * Covers:
 *   - computeSeverityCounts: classifies crisis alert severity from reason_code
 *   - computeSurfaceBreakdown: groups alerts by surface
 *   - computeHelpfulnessRate: calculates helpfulness percentage from feedback entries
 *   - generateAlerts: threshold-based warning alerts (crisis volume, helpfulness rate)
 *   - generateRecommendations: recommendation generation based on negative feedback volume
 *
 * If the aggregation or alert logic in functions/generateComplianceReport.ts changes,
 * update this file to match.
 */

import { describe, it, expect } from 'vitest';

// ─── MIRRORED LOGIC (from functions/generateComplianceReport.ts) ──────────────

/**
 * Classifies crisis alert severity by inspecting reason_code.
 * Priority: 'severe' > 'high' > 'medium' (fallback).
 */
function computeSeverityCounts(crisisAlerts) {
  return crisisAlerts.reduce((acc, alert) => {
    const severity = alert.reason_code?.includes('severe') ? 'severe'
      : alert.reason_code?.includes('high') ? 'high'
      : 'medium';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {});
}

/** Groups crisis alerts by the surface they originated from. */
function computeSurfaceBreakdown(crisisAlerts) {
  return crisisAlerts.reduce((acc, alert) => {
    acc[alert.surface] = (acc[alert.surface] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Calculates helpfulness rate as a percentage string fixed to one decimal place.
 * Returns 'N/A' when the feedback array is empty.
 */
function computeHelpfulnessRate(feedbackEntries) {
  if (feedbackEntries.length === 0) return 'N/A';
  const negativeCount = feedbackEntries.filter(f => f.was_helpful === false).length;
  return ((feedbackEntries.length - negativeCount) / feedbackEntries.length * 100).toFixed(1);
}

/**
 * Generates warning alerts based on crisis volume and helpfulness rate thresholds.
 *   - crisis volume: > 50 detections triggers a warning
 *   - helpfulness rate: < 70% with > 10 feedback entries triggers a warning
 */
function generateAlerts(totalCrisisDetections, helpfulnessRate, feedbackCount) {
  const alerts = [];

  if (totalCrisisDetections > 50) {
    alerts.push({
      level: 'warning',
      message: `High volume of crisis detections: ${totalCrisisDetections} in reporting period`,
      action: 'Review crisis detection sensitivity and user demographics',
    });
  }

  if (parseFloat(helpfulnessRate) < 70 && feedbackCount > 10) {
    alerts.push({
      level: 'warning',
      message: `Low helpfulness rate: ${helpfulnessRate}%`,
      action: 'Review agent responses and consider prompt adjustments',
    });
  }

  return alerts;
}

/**
 * Generates recommendations based on negative feedback volume and issue types.
 * Only fires when negativeResponses.length > 5.
 */
function generateRecommendations(negativeResponses) {
  const recommendations = [];

  if (negativeResponses.length > 5) {
    const commonIssues = negativeResponses
      .map(f => f.issue_type)
      .filter(Boolean)
      .reduce((acc, issue) => {
        acc[issue] = (acc[issue] || 0) + 1;
        return acc;
      }, {});

    recommendations.push({
      category: 'response_quality',
      suggestion: `Address common issues: ${Object.keys(commonIssues).join(', ')}`,
      priority: 'high',
    });
  }

  return recommendations;
}

// ─── TESTS — computeSeverityCounts ────────────────────────────────────────────

describe('complianceReportLogic – computeSeverityCounts', () => {
  it('returns empty object for no alerts', () => {
    expect(computeSeverityCounts([])).toEqual({});
  });

  it('classifies reason_code containing "severe" as "severe"', () => {
    const alerts = [{ reason_code: 'suicidal_ideation_severe' }];
    expect(computeSeverityCounts(alerts)).toEqual({ severe: 1 });
  });

  it('classifies reason_code containing "high" as "high"', () => {
    const alerts = [{ reason_code: 'self_harm_high_risk' }];
    expect(computeSeverityCounts(alerts)).toEqual({ high: 1 });
  });

  it('classifies reason_code matching neither severe nor high as "medium"', () => {
    const alerts = [{ reason_code: 'distress_moderate' }];
    expect(computeSeverityCounts(alerts)).toEqual({ medium: 1 });
  });

  it('classifies alert with no reason_code as "medium"', () => {
    const alerts = [{}];
    expect(computeSeverityCounts(alerts)).toEqual({ medium: 1 });
  });

  it('classifies alert with null reason_code as "medium"', () => {
    const alerts = [{ reason_code: null }];
    expect(computeSeverityCounts(alerts)).toEqual({ medium: 1 });
  });

  it('accumulates counts across multiple alerts of the same severity', () => {
    const alerts = [
      { reason_code: 'crisis_severe' },
      { reason_code: 'another_severe_event' },
    ];
    expect(computeSeverityCounts(alerts)).toEqual({ severe: 2 });
  });

  it('accumulates mixed severity counts correctly', () => {
    const alerts = [
      { reason_code: 'severe_crisis' },
      { reason_code: 'severe_ideation' },
      { reason_code: 'high_risk' },
      { reason_code: 'moderate_concern' },
    ];
    const counts = computeSeverityCounts(alerts);
    expect(counts.severe).toBe(2);
    expect(counts.high).toBe(1);
    expect(counts.medium).toBe(1);
  });

  it('"severe" takes priority over "high" when reason_code contains both', () => {
    // The production logic checks severe first, so "high_severity" becomes "severe"
    // because 'severe' is checked first via String.includes
    const alerts = [{ reason_code: 'high_severity_severe' }];
    expect(computeSeverityCounts(alerts)).toEqual({ severe: 1 });
  });
});

// ─── TESTS — computeSurfaceBreakdown ──────────────────────────────────────────

describe('complianceReportLogic – computeSurfaceBreakdown', () => {
  it('returns empty object for no alerts', () => {
    expect(computeSurfaceBreakdown([])).toEqual({});
  });

  it('groups a single alert by surface', () => {
    const alerts = [{ surface: 'chat' }];
    expect(computeSurfaceBreakdown(alerts)).toEqual({ chat: 1 });
  });

  it('counts multiple alerts on the same surface', () => {
    const alerts = [{ surface: 'chat' }, { surface: 'chat' }, { surface: 'chat' }];
    expect(computeSurfaceBreakdown(alerts)).toEqual({ chat: 3 });
  });

  it('groups alerts across multiple surfaces', () => {
    const alerts = [
      { surface: 'chat' },
      { surface: 'journal' },
      { surface: 'chat' },
    ];
    expect(computeSurfaceBreakdown(alerts)).toEqual({ chat: 2, journal: 1 });
  });

  it('handles multiple distinct surfaces', () => {
    const alerts = [
      { surface: 'chat' },
      { surface: 'journal' },
      { surface: 'companion' },
    ];
    const breakdown = computeSurfaceBreakdown(alerts);
    expect(breakdown.chat).toBe(1);
    expect(breakdown.journal).toBe(1);
    expect(breakdown.companion).toBe(1);
  });
});

// ─── TESTS — computeHelpfulnessRate ───────────────────────────────────────────

describe('complianceReportLogic – computeHelpfulnessRate', () => {
  it('returns "N/A" for an empty feedback array', () => {
    expect(computeHelpfulnessRate([])).toBe('N/A');
  });

  it('returns "100.0" when all feedback is positive', () => {
    const feedback = [{ was_helpful: true }, { was_helpful: true }];
    expect(computeHelpfulnessRate(feedback)).toBe('100.0');
  });

  it('returns "0.0" when all feedback is negative', () => {
    const feedback = [{ was_helpful: false }, { was_helpful: false }];
    expect(computeHelpfulnessRate(feedback)).toBe('0.0');
  });

  it('returns "50.0" when half the feedback is negative', () => {
    const feedback = [{ was_helpful: true }, { was_helpful: false }];
    expect(computeHelpfulnessRate(feedback)).toBe('50.0');
  });

  it('formats to exactly one decimal place', () => {
    // 2 positive, 1 negative → 2/3 ≈ 66.666...%
    const feedback = [
      { was_helpful: true },
      { was_helpful: true },
      { was_helpful: false },
    ];
    expect(computeHelpfulnessRate(feedback)).toBe('66.7');
  });

  it('returns a string, not a number', () => {
    const feedback = [{ was_helpful: true }];
    expect(typeof computeHelpfulnessRate(feedback)).toBe('string');
  });

  it('counts only entries where was_helpful is strictly false as negative', () => {
    // null, undefined, and true should not be counted as negative
    const feedback = [
      { was_helpful: true },
      { was_helpful: null },
      { was_helpful: undefined },
      { was_helpful: false },
    ];
    // 3 non-negative, 1 negative → 75.0%
    expect(computeHelpfulnessRate(feedback)).toBe('75.0');
  });
});

// ─── TESTS — generateAlerts ───────────────────────────────────────────────────

describe('complianceReportLogic – generateAlerts', () => {
  it('generates no alerts when crisis count is exactly 50', () => {
    expect(generateAlerts(50, '80.0', 20)).toHaveLength(0);
  });

  it('generates a crisis-volume warning when crisis count exceeds 50', () => {
    const alerts = generateAlerts(51, '80.0', 20);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('warning');
    expect(alerts[0].message).toContain('51');
  });

  it('crisis alert message includes the detection count', () => {
    const alerts = generateAlerts(75, '80.0', 20);
    expect(alerts[0].message).toContain('75');
  });

  it('generates a helpfulness warning when rate < 70% with > 10 feedback', () => {
    const alerts = generateAlerts(10, '65.0', 11);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('warning');
    expect(alerts[0].message).toContain('65.0%');
  });

  it('does not generate helpfulness alert when feedback count is exactly 10', () => {
    expect(generateAlerts(10, '60.0', 10)).toHaveLength(0);
  });

  it('does not generate helpfulness alert when rate is exactly 70%', () => {
    expect(generateAlerts(10, '70.0', 20)).toHaveLength(0);
  });

  it('does not generate helpfulness alert when rate is above 70%', () => {
    expect(generateAlerts(10, '85.0', 20)).toHaveLength(0);
  });

  it('generates both alerts when both conditions are met', () => {
    const alerts = generateAlerts(55, '65.0', 20);
    expect(alerts).toHaveLength(2);
    const levels = alerts.map(a => a.level);
    expect(levels).toEqual(['warning', 'warning']);
  });

  it('all generated alerts have an action field', () => {
    const alerts = generateAlerts(55, '65.0', 20);
    for (const alert of alerts) {
      expect(typeof alert.action).toBe('string');
      expect(alert.action.length).toBeGreaterThan(0);
    }
  });
});

// ─── TESTS — generateRecommendations ─────────────────────────────────────────

describe('complianceReportLogic – generateRecommendations', () => {
  it('returns no recommendations when negative responses are exactly 5', () => {
    const negative = Array.from({ length: 5 }, () => ({ issue_type: 'tone' }));
    expect(generateRecommendations(negative)).toHaveLength(0);
  });

  it('returns no recommendations for an empty array', () => {
    expect(generateRecommendations([])).toHaveLength(0);
  });

  it('generates a recommendation when negative responses exceed 5', () => {
    const negative = Array.from({ length: 6 }, () => ({ issue_type: 'tone' }));
    const recs = generateRecommendations(negative);
    expect(recs).toHaveLength(1);
    expect(recs[0].category).toBe('response_quality');
    expect(recs[0].priority).toBe('high');
  });

  it('recommendation suggestion includes common issue types', () => {
    const negative = [
      { issue_type: 'tone' },
      { issue_type: 'tone' },
      { issue_type: 'accuracy' },
      { issue_type: 'accuracy' },
      { issue_type: 'length' },
      { issue_type: 'tone' },
    ];
    const recs = generateRecommendations(negative);
    expect(recs[0].suggestion).toContain('tone');
    expect(recs[0].suggestion).toContain('accuracy');
    expect(recs[0].suggestion).toContain('length');
  });

  it('filters out null issue_type entries before aggregating', () => {
    const negative = [
      { issue_type: 'tone' },
      { issue_type: null },
      { issue_type: undefined },
      { issue_type: 'tone' },
      { issue_type: 'tone' },
      { issue_type: 'tone' },
    ];
    const recs = generateRecommendations(negative);
    expect(recs).toHaveLength(1);
    expect(recs[0].suggestion).toContain('tone');
    expect(recs[0].suggestion).not.toContain('null');
  });

  it('each recommendation has category, suggestion, and priority fields', () => {
    const negative = Array.from({ length: 6 }, () => ({ issue_type: 'accuracy' }));
    const recs = generateRecommendations(negative);
    expect(recs[0]).toHaveProperty('category');
    expect(recs[0]).toHaveProperty('suggestion');
    expect(recs[0]).toHaveProperty('priority');
  });
});
