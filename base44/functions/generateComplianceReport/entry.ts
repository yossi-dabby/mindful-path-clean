import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate compliance report for safety and clinical boundary monitoring
 * Aggregates crisis detections, refusals, safety interactions over a period
 * Returns: Structured report with metrics and alerts
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only access
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { start_date, end_date, report_type = 'summary' } = await req.json();

    // Fetch all crisis alerts within date range
    const crisisAlerts = await base44.entities.CrisisAlert.filter({
      created_date: { 
        $gte: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    });

    // Fetch therapy feedback for quality metrics
    const feedbackEntries = await base44.entities.TherapyFeedback.list();

    // Calculate key metrics
    const totalCrisisDetections = crisisAlerts.length;
    const severityCounts = crisisAlerts.reduce((acc, alert) => {
      const severity = alert.reason_code?.includes('severe') ? 'severe' : 
                       alert.reason_code?.includes('high') ? 'high' : 'medium';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});

    const surfaceBreakdown = crisisAlerts.reduce((acc, alert) => {
      acc[alert.surface] = (acc[alert.surface] || 0) + 1;
      return acc;
    }, {});

    // Feedback analysis
    const negativeResponses = feedbackEntries.filter(f => f.was_helpful === false);
    const helpfulnessRate = feedbackEntries.length > 0 
      ? ((feedbackEntries.length - negativeResponses.length) / feedbackEntries.length * 100).toFixed(1)
      : 'N/A';

    // Build report
    const report = {
      report_type,
      generated_at: new Date().toISOString(),
      period: {
        start: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: end_date || new Date().toISOString()
      },
      summary: {
        total_crisis_detections: totalCrisisDetections,
        crisis_rate_per_day: (totalCrisisDetections / 30).toFixed(2),
        severity_breakdown: severityCounts,
        surface_breakdown: surfaceBreakdown,
        helpfulness_rate: helpfulnessRate,
        total_feedback_received: feedbackEntries.length,
        negative_feedback_count: negativeResponses.length
      },
      alerts: [],
      recommendations: []
    };

    // Generate alerts for concerning patterns
    if (totalCrisisDetections > 50) {
      report.alerts.push({
        level: 'warning',
        message: `High volume of crisis detections: ${totalCrisisDetections} in reporting period`,
        action: 'Review crisis detection sensitivity and user demographics'
      });
    }

    if (parseFloat(helpfulnessRate) < 70 && feedbackEntries.length > 10) {
      report.alerts.push({
        level: 'warning',
        message: `Low helpfulness rate: ${helpfulnessRate}%`,
        action: 'Review agent responses and consider prompt adjustments'
      });
    }

    // Generate recommendations
    if (negativeResponses.length > 5) {
      const commonIssues = negativeResponses
        .map(f => f.issue_type)
        .filter(Boolean)
        .reduce((acc, issue) => {
          acc[issue] = (acc[issue] || 0) + 1;
          return acc;
        }, {});

      report.recommendations.push({
        category: 'response_quality',
        suggestion: `Address common issues: ${Object.keys(commonIssues).join(', ')}`,
        priority: 'high'
      });
    }

    // Detailed breakdown (if requested)
    if (report_type === 'detailed') {
      report.crisis_events = crisisAlerts.slice(0, 100).map(alert => ({
        date: alert.created_date,
        surface: alert.surface,
        reason_code: alert.reason_code,
        conversation_id: alert.conversation_id
      }));

      report.negative_feedback_samples = negativeResponses.slice(0, 20).map(f => ({
        date: f.created_date,
        issue_type: f.issue_type,
        comment: f.comment
      }));
    }

    return Response.json(report);

  } catch (error) {
    console.error('[Compliance Report] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});