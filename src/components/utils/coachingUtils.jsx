/**
 * Coaching Utilities - Shared logic for coaching flows
 */

import { safeText, safeArray } from './aiDataNormalizer';

/**
 * Validates coaching session data before creation
 * @param {Object} sessionData - Session data to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateCoachingSession(sessionData) {
  const errors = [];
  
  if (!safeText(sessionData.title)) {
    errors.push('Session title is required');
  }
  
  if (!safeText(sessionData.focus_area)) {
    errors.push('Focus area is required');
  }
  
  if (!safeText(sessionData.current_challenge)) {
    errors.push('Current challenge description is required');
  }
  
  if (!safeText(sessionData.desired_outcome)) {
    errors.push('Desired outcome is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Prepares context for coaching session creation
 * @param {Object} formData - Form data from wizard
 * @param {Object} userData - User's journal/mood data
 * @returns {string} - Formatted context for LLM
 */
export function prepareCoachingContext(formData, userData = {}) {
  const { recentMoods = [], recentJournals = [] } = userData;
  
  let context = `I'd like to start a coaching session. My focus is ${safeText(formData.focus_area)}.

Current Challenge: ${safeText(formData.current_challenge)}

Desired Outcome: ${safeText(formData.desired_outcome)}`;

  // Add recent context if available
  if (recentMoods.length > 0) {
    context += `\n\nRecent Mood Context:\n${recentMoods.slice(0, 3).map(m => 
      `- ${m.date}: ${m.mood} (stress: ${m.stress_level}/10)`
    ).join('\n')}`;
  }

  if (recentJournals.length > 0) {
    context += `\n\nRecent Journal Themes:\n${recentJournals.slice(0, 3).map(j => 
      `- ${safeArray(j.emotions).join(', ')}`
    ).join('\n')}`;
  }

  context += '\n\nPlease help me create a structured plan to work through this.';
  
  return context;
}

/**
 * Safely formats action plan data
 * @param {*} actionPlan - Raw action plan from API/AI
 * @returns {Array} - Normalized action plan
 */
export function normalizeActionPlan(actionPlan) {
  return safeArray(actionPlan).map((action, index) => {
    if (typeof action === 'object' && action !== null) {
      return {
        id: action.id || `action_${index}`,
        title: safeText(action.title || action.name || action.action, `Action ${index + 1}`),
        description: safeText(action.description || action.details, ''),
        completed: Boolean(action.completed),
        due_date: action.due_date || null,
        created_date: action.created_date || new Date().toISOString()
      };
    }
    return {
      id: `action_${index}`,
      title: safeText(action, `Action ${index + 1}`),
      description: '',
      completed: false,
      due_date: null,
      created_date: new Date().toISOString()
    };
  });
}

/**
 * Gets progress percentage for coaching session
 * @param {Object} session - Coaching session object
 * @returns {number} - Progress percentage (0-100)
 */
export function getSessionProgress(session) {
  if (!session || !session.action_plan) return 0;
  
  const actions = normalizeActionPlan(session.action_plan);
  if (actions.length === 0) return 0;
  
  const completed = actions.filter(a => a.completed).length;
  return Math.round((completed / actions.length) * 100);
}

/**
 * Formats coaching stage label
 * @param {string} stage - Stage identifier
 * @returns {string} - Formatted label
 */
export function formatStageLabel(stage) {
  const labels = {
    discovery: 'Discovery Phase',
    planning: 'Planning Phase',
    action: 'Action Phase',
    review: 'Review Phase',
    completed: 'Completed'
  };
  
  return labels[stage] || 'Unknown Stage';
}