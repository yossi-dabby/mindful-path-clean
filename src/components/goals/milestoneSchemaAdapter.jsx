/**
 * Ensures milestone data matches the Goal entity schema exactly
 * This prevents schema mismatches that cause data loss on backend updates
 */
export function toBackendMilestone(m) {
  // Ensure all fields match the exact schema structure
  const milestone = {
    title: String(m.title || ''),
    description: String(m.description || ''),
    due_date: m.due_date || null,
    completed: Boolean(m.completed),
    completed_date: m.completed_date || null
  };

  // Only include quantitative_metric if it exists and has data
  if (m.quantitative_metric && typeof m.quantitative_metric === 'object') {
    milestone.quantitative_metric = {
      metric_name: String(m.quantitative_metric.metric_name || ''),
      target_value: Number(m.quantitative_metric.target_value || 0),
      current_value: Number(m.quantitative_metric.current_value || 0),
      unit: String(m.quantitative_metric.unit || '')
    };
  }

  return milestone;
}

/**
 * Normalizes milestones from backend response
 */
export function fromBackendMilestone(m, index) {
  return {
    title: String(m?.title || m || `Step ${index + 1}`),
    description: String(m?.description || ''),
    completed: Boolean(m?.completed),
    due_date: m?.due_date || null,
    completed_date: m?.completed_date || null,
    quantitative_metric: m?.quantitative_metric || null
  };
}