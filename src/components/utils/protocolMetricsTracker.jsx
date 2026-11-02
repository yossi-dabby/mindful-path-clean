import { base44 } from '@/api/base44Client';

/**
 * Protocol Metrics Tracker
 * Client-side utility for tracking protocol usage and quality
 */

export const trackProtocolMetric = async (eventType, data) => {
  try {
    await base44.functions.invoke('logProtocolMetrics', {
      event_type: eventType,
      ...data
    });
  } catch (error) {
    console.error('[Protocol Metrics] Failed to track:', error);
    // Non-blocking - don't interrupt user experience
  }
};

export const trackProtocolStart = (protocol, conversationId) => {
  trackProtocolMetric('protocol_session_start', {
    protocol_selected: protocol,
    conversation_id: conversationId
  });
};

export const trackHomeworkResponse = (protocol, accepted, conversationId) => {
  trackProtocolMetric('homework_response', {
    protocol_selected: protocol,
    homework_offered: true,
    homework_accepted: accepted,
    conversation_id: conversationId
  });
};

export const trackMetricsCaptured = (protocol, before, after, conversationId) => {
  trackProtocolMetric('metrics_captured', {
    protocol_selected: protocol,
    metrics_captured: { before, after },
    conversation_id: conversationId
  });
};

export const trackExperimentCompleted = (protocol, experiment, conversationId) => {
  trackProtocolMetric('experiment_completed', {
    protocol_selected: protocol,
    experiment_completed: experiment,
    conversation_id: conversationId
  });
};

export const trackUIIncident = (type, conversationId) => {
  trackProtocolMetric('ui_incident', {
    loop_detected: type === 'loop',
    json_leakage_detected: type === 'json_leak',
    conversation_id: conversationId
  });
};