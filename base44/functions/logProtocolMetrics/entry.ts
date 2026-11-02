import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Protocol Metrics Logger
 * Logs CBT protocol usage, completion rates, and quality metrics
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      event_type,
      protocol_selected,
      homework_offered,
      homework_accepted,
      metrics_captured,
      experiment_completed,
      loop_detected,
      json_leakage_detected,
      conversation_id
    } = await req.json();

    // Track protocol usage
    if (event_type === 'protocol_session_start') {
      base44.analytics.track({
        eventName: 'cbt_protocol_started',
        properties: {
          protocol: protocol_selected,
          conversation_id
        }
      });
    }

    // Track homework compliance
    if (event_type === 'homework_response') {
      base44.analytics.track({
        eventName: 'homework_response',
        properties: {
          homework_offered,
          homework_accepted,
          protocol: protocol_selected,
          conversation_id
        }
      });
    }

    // Track metrics capture quality
    if (event_type === 'metrics_captured') {
      base44.analytics.track({
        eventName: 'metrics_captured',
        properties: {
          has_before: !!metrics_captured?.before,
          has_after: !!metrics_captured?.after,
          protocol: protocol_selected,
          conversation_id
        }
      });
    }

    // Track behavioral experiments
    if (event_type === 'experiment_completed') {
      base44.analytics.track({
        eventName: 'behavioral_experiment_completed',
        properties: {
          has_prediction: !!experiment_completed?.prediction,
          has_outcome: !!experiment_completed?.outcome,
          belief_change: experiment_completed?.belief_after - experiment_completed?.belief_before,
          protocol: protocol_selected,
          conversation_id
        }
      });
    }

    // CRITICAL: Track UI stability incidents
    if (event_type === 'ui_incident') {
      base44.analytics.track({
        eventName: 'chat_ui_incident',
        properties: {
          loop_detected: !!loop_detected,
          json_leakage: !!json_leakage_detected,
          conversation_id
        }
      });
    }

    return Response.json({ logged: true });

  } catch (error) {
    console.error('Protocol metrics logging error:', error);
    return Response.json({ error: 'Logging failed' }, { status: 500 });
  }
});