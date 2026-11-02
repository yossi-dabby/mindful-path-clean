/**
 * AI Data Normalizer - Universal Utility
 * 
 * Defensive utility to safely normalize ALL AI-generated data structures.
 * Ensures no runtime crashes from unexpected data shapes.
 * 
 * CRITICAL: Use these utilities before rendering ANY AI-generated content
 * to prevent .map() and .join() errors on non-arrays.
 */

/**
 * Converts any value to a safe string
 * @param {*} value - Value to convert
 * @param {string} fallback - Default value if conversion fails
 * @returns {string} - Always returns a string
 */
export function safeText(value, fallback = '') {
  if (value == null || value === undefined) return fallback;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Safely replaces text in a string, handling undefined/null values
 * @param {*} str - String to process
 * @param {string|RegExp} searchValue - Value to search for
 * @param {string} replaceValue - Value to replace with
 * @returns {string} - Processed string
 */
export function safeReplace(str, searchValue, replaceValue) {
  const text = safeText(str);
  if (!text) return '';
  return text.replace(searchValue, replaceValue);
}

/**
 * Strips HTML tags from content safely
 * @param {*} html - HTML content to strip
 * @returns {string} - Plain text
 */
export function stripHtml(html) {
  const text = safeText(html);
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Normalizes a value to always be an array of strings
 * @param {*} value - The value to normalize
 * @param {number} maxItems - Maximum items to return (for safety)
 * @returns {Array<string>} - Always returns an array of strings
 */
export function safeArray(value, maxItems = 100) {
  // Already an array
  if (Array.isArray(value)) {
    return value
      .filter(item => item != null) // Remove null/undefined
      .map(item => {
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object' && item.title) return safeText(item.title);
        if (typeof item === 'object' && item.text) return safeText(item.text);
        if (typeof item === 'object') return safeText(item.description || item.name || JSON.stringify(item));
        return safeText(item);
      })
      .filter(Boolean) // Remove empty strings
      .slice(0, maxItems);
  }
  
  // Null or undefined
  if (value == null) {
    return [];
  }
  
  // String - try to parse as JSON, or split by common delimiters
  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    // Empty string
    if (!trimmed) {
      return [];
    }
    
    // Try JSON parse
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return safeArray(parsed, maxItems);
      }
    } catch (e) {
      // Not JSON, continue
    }
    
    // Split by bullet points
    if (trimmed.match(/^[•\-\*\d+\.]/m)) {
      return trimmed
        .split('\n')
        .map(s => s.replace(/^[•\-\*\d+\.\)\]]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, maxItems);
    }
    
    // Split by newlines
    if (trimmed.includes('\n')) {
      return trimmed
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, maxItems);
    }
    
    // Split by commas (but not if it's a sentence)
    if (trimmed.includes(',') && trimmed.split(',').length <= 10) {
      return trimmed
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, maxItems);
    }
    
    // Single item
    return [trimmed];
  }
  
  // Object - try to extract array-like properties or convert to array
  if (typeof value === 'object') {
    // Check for common array-like properties
    if (value.items) return safeArray(value.items, maxItems);
    if (value.list) return safeArray(value.list, maxItems);
    if (value.values) return safeArray(value.values, maxItems);
    
    // Convert object to array of its values
    const values = Object.values(value).filter(v => v != null);
    if (values.length > 0) {
      return safeArray(values, maxItems);
    }
    
    // Wrap object itself
    return [JSON.stringify(value)].slice(0, maxItems);
  }
  
  // Primitive - wrap in array
  return [safeText(value)].filter(Boolean);
}

/**
 * Legacy: Normalizes a value to always be an array (returns original types)
 * @deprecated Use safeArray() instead for safer string arrays
 */
export function ensureArray(value, maxItems = 100) {
  if (Array.isArray(value)) return value.slice(0, maxItems);
  if (value == null) return [];
  if (typeof value === 'string') {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.slice(0, maxItems);
    } catch (e) {}
    if (value.includes(',')) return value.split(',').map(s => s.trim()).filter(Boolean).slice(0, maxItems);
    if (value.includes('\n')) return value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, maxItems);
    return [value];
  }
  if (typeof value === 'object') return [value];
  return [value];
}

/**
 * Safely joins array values with proper validation
 * @param {*} value - Value to join
 * @param {string} separator - Separator to use
 * @returns {string} - Joined string
 */
export function safeJoin(value, separator = ', ') {
  const arr = safeArray(value);
  return arr.join(separator);
}

/**
 * Safely maps over array values with proper validation
 * @param {*} value - Value to map over
 * @param {Function} fn - Mapping function
 * @returns {Array} - Mapped array
 */
export function safeMap(value, fn) {
  const arr = safeArray(value);
  return arr.map(fn);
}

/**
 * Normalizes AI goal suggestion data
 * @param {Object} goal - Raw goal data from AI
 * @returns {Object} - Normalized goal data
 */
export function normalizeGoalData(goal) {
  if (!goal || typeof goal !== 'object') {
    return null;
  }
  
  return {
    ...goal,
    title: safeText(goal.title, 'Untitled Goal'),
    description: safeText(goal.description, ''),
    category: safeText(goal.category, 'lifestyle'),
    // Ensure milestones is always an array of objects
    milestones: safeArray(goal.milestones || goal.initial_milestones || goal.steps || goal.actions)
      .map((item, index) => {
        if (typeof item === 'object' && item !== null) {
          return {
            title: safeText(item.title || item.name || item.text || `Step ${index + 1}`),
            description: safeText(item.description || ''),
            completed: Boolean(item.completed),
            due_date: item.due_date || null
          };
        }
        return {
          title: safeText(item, `Step ${index + 1}`),
          description: '',
          completed: false,
          due_date: null
        };
      }),
    // Ensure tips is always an array of strings
    tips: safeArray(goal.tips || goal.helpful_tips || goal.advice),
    // Ensure benefits is always an array of strings
    benefits: safeArray(goal.benefits || goal.advantages || goal.outcomes),
    // Normalize SMART criteria if present
    smart_criteria: goal.smart_criteria && typeof goal.smart_criteria === 'object' 
      ? {
          specific: safeText(goal.smart_criteria.specific || goal.smart_criteria.Specific, ''),
          measurable: safeText(goal.smart_criteria.measurable || goal.smart_criteria.Measurable, ''),
          achievable: safeText(goal.smart_criteria.achievable || goal.smart_criteria.Achievable, ''),
          relevant: safeText(goal.smart_criteria.relevant || goal.smart_criteria.Relevant, ''),
          time_bound: safeText(goal.smart_criteria.time_bound || goal.smart_criteria['Time-bound'] || goal.smart_criteria.TimeBound, '')
        }
      : null,
    // Normalize smart_breakdown if present
    smart_breakdown: goal.smart_breakdown && typeof goal.smart_breakdown === 'object'
      ? {
          specific: safeText(goal.smart_breakdown.specific || goal.smart_breakdown.Specific, ''),
          measurable: safeText(goal.smart_breakdown.measurable || goal.smart_breakdown.Measurable, ''),
          achievable: safeText(goal.smart_breakdown.achievable || goal.smart_breakdown.Achievable, ''),
          relevant: safeText(goal.smart_breakdown.relevant || goal.smart_breakdown.Relevant, ''),
          time_bound: safeText(goal.smart_breakdown.time_bound || goal.smart_breakdown['Time-bound'] || goal.smart_breakdown.TimeBound, '')
        }
      : null
  };
}

/**
 * Normalizes AI feed data
 * @param {Object} feed - Raw feed data from AI
 * @returns {Object} - Normalized feed data
 */
export function normalizeFeedData(feed) {
  if (!feed || typeof feed !== 'object') {
    return {
      recommended_exercises: [],
      relevant_resources: [],
      community_highlights: [],
      daily_focus: null,
      inspirational_quote: null
    };
  }
  
  return {
    recommended_exercises: safeArray(feed.recommended_exercises).map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        return {
          category: safeText(item.category || item.type, ''),
          title: safeText(item.title || item.name, `Exercise ${i + 1}`),
          reason: safeText(item.reason || item.description, '')
        };
      }
      return {
        category: '',
        title: safeText(item, `Exercise ${i + 1}`),
        reason: ''
      };
    }),
    relevant_resources: safeArray(feed.relevant_resources).map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        return {
          category: safeText(item.category || item.type, ''),
          topic: safeText(item.topic || item.title || item.name, `Resource ${i + 1}`),
          reason: safeText(item.reason || item.description, '')
        };
      }
      return {
        category: '',
        topic: safeText(item, `Resource ${i + 1}`),
        reason: ''
      };
    }),
    community_highlights: safeArray(feed.community_highlights).map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        return {
          topic: safeText(item.topic || item.title, `Topic ${i + 1}`),
          description: safeText(item.description || item.text, '')
        };
      }
      return {
        topic: safeText(item, `Topic ${i + 1}`),
        description: ''
      };
    }),
    daily_focus: safeText(feed.daily_focus, null),
    inspirational_quote: feed.inspirational_quote && typeof feed.inspirational_quote === 'object'
      ? {
          text: safeText(feed.inspirational_quote.text || feed.inspirational_quote.quote, ''),
          author: safeText(feed.inspirational_quote.author || feed.inspirational_quote.by, 'Unknown')
        }
      : null
  };
}

/**
 * Normalizes AI coaching insights
 * @param {Object} insights - Raw insights from AI
 * @returns {Object} - Normalized insights
 */
export function normalizeCoachingInsights(insights) {
  if (!insights || typeof insights !== 'object') {
    return {
      recurring_patterns: [],
      cbt_recommendations: [],
      goal_insights: [],
      engagement_nudges: [],
      positive_progress: []
    };
  }
  
  return {
    recurring_patterns: safeArray(insights.recurring_patterns).map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        return {
          pattern: safeText(item.pattern || item.title, `Pattern ${i + 1}`),
          frequency: safeText(item.frequency, 'Occasional'),
          impact: safeText(item.impact || item.description, '')
        };
      }
      return {
        pattern: safeText(item, `Pattern ${i + 1}`),
        frequency: 'Occasional',
        impact: ''
      };
    }),
    cbt_recommendations: safeArray(insights.cbt_recommendations).map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        return {
          exercise_category: safeText(item.exercise_category || item.category || item.type, ''),
          reason: safeText(item.reason || item.description, ''),
          expected_benefit: safeText(item.expected_benefit || item.benefit, '')
        };
      }
      return {
        exercise_category: safeText(item, ''),
        reason: '',
        expected_benefit: ''
      };
    }),
    goal_insights: safeArray(insights.goal_insights).map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        return {
          goal_title: safeText(item.goal_title || item.title, `Goal ${i + 1}`),
          connection: safeText(item.connection || item.relationship, ''),
          suggestion: safeText(item.suggestion || item.recommendation, '')
        };
      }
      return {
        goal_title: safeText(item, `Goal ${i + 1}`),
        connection: '',
        suggestion: ''
      };
    }),
    engagement_nudges: safeArray(insights.engagement_nudges),
    positive_progress: safeArray(insights.positive_progress)
  };
}

/**
 * Normalizes AI exercise recommendations
 * @param {Array} recommendations - Raw recommendations from AI
 * @returns {Array} - Normalized recommendations
 */
export function normalizeExerciseRecommendations(recommendations) {
  const parseJsonObject = (value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value !== 'string') return null;

    const cleaned = value
      .trim()
      .replace(/^\`\`\`(?:json)?\s*/i, '')
      .replace(/\s*\`\`\`$/, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

    try {
      const parsed = JSON.parse(candidate);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  let source = recommendations;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source.trim());
    } catch {
      source = [source];
    }
  }
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    source = Array.isArray(source.recommendations) ? source.recommendations : [source];
  }

  return (Array.isArray(source) ? source : [])
    .map((rawItem, i) => {
      const item = parseJsonObject(rawItem);
      if (!item) return null;

      const priority = safeText(item.priority, 'medium').toLowerCase();
      return {
        exercise_title: safeText(item.exercise_title || item.title || item.name, `Exercise ${i + 1}`),
        reason: safeText(item.reason || item.description, ''),
        benefit: safeText(item.benefit || item.expected_benefit, ''),
        priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium'
      };
    })
    .filter((item) => item && item.exercise_title);
}

/**
 * Normalizes AI goal breakdown
 * @param {Object} breakdown - Raw breakdown from AI
 * @returns {Object} - Normalized breakdown
 */
export function normalizeGoalBreakdown(breakdown) {
  if (!breakdown || typeof breakdown !== 'object') {
    return {
      quick_wins: [],
      action_plan: [],
      milestones: [],
      potential_obstacles: [],
      success_metrics: []
    };
  }
  
  return {
    quick_wins: safeArray(breakdown.quick_wins),
    action_plan: safeArray(breakdown.action_plan),
    milestones: safeArray(breakdown.milestones).map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        return {
          title: safeText(item.title || item.name, `Milestone ${i + 1}`),
          description: safeText(item.description, ''),
          timeframe: safeText(item.timeframe || item.timeline, '')
        };
      }
      return {
        title: safeText(item, `Milestone ${i + 1}`),
        description: '',
        timeframe: ''
      };
    }),
    potential_obstacles: safeArray(breakdown.potential_obstacles),
    success_metrics: safeArray(breakdown.success_metrics)
  };
}