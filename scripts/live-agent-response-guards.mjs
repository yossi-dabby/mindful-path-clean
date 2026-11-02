const RAW_TOOL_CALL_PATTERNS = Object.freeze([
  Object.freeze({
    type: 'xml_tool_envelope',
    pattern: /<\/?(?:tool_call|tool_calls|function_call|function_calls|function_result|function_results)\b[^>]*>/i,
  }),
  Object.freeze({
    type: 'xml_invoke_envelope',
    pattern: /<\/?(?:invoke|parameter|result)\b[^>]*>/i,
  }),
  Object.freeze({
    type: 'configured_tool_name',
    pattern: /\b(?:retrieveCurriculumUnit|retrieveTherapistMemory|writeTherapistMemory|retrieveTrustedCBTContent|retrieveRelevantContent)\b/i,
  }),
  Object.freeze({
    type: 'internal_routing_label',
    pattern: /^\s*(?:LOCKED_DOMAIN|INTERVENTION_MODE|RESPONSE PLAN)\b/im,
  }),
]);

export function classifyRawToolCallLeakage(content) {
  if (typeof content !== 'string' || content.trim().length === 0) return [];
  return RAW_TOOL_CALL_PATTERNS
    .filter(({ pattern }) => pattern.test(content))
    .map(({ type }) => type);
}

export function hasRawToolCallLeakage(content) {
  return classifyRawToolCallLeakage(content).length > 0;
}
