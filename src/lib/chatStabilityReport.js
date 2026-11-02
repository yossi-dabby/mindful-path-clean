/**
 * Chat stability reporting utilities.
 * Extracted from pages/Chat.jsx to keep that file within size limits.
 */

export function emitStabilitySummary(instrumentationRef, parseCounters) {
  const counters = instrumentationRef.current;
  console.log(
    `FINAL STABILITY SUMMARY | send=${counters.SEND_COUNT} | ` +
    `parse_failed=${parseCounters.PARSE_FAILED} | ` +
    `dup_occurred=${counters.DUPLICATE_OCCURRED} | ` +
    `placeholder_became_msg=${counters.PLACEHOLDER_BECAME_MESSAGE} | ` +
    `thinking_over_10s=${counters.THINKING_OVER_10S}`
  );
}

export function printFinalStabilityReport(instrumentationRef, parseCounters) {
  const counters = instrumentationRef.current;
  const parseErrors = parseCounters.PARSE_FAILED;
  const duplicates = counters.DUPLICATE_OCCURRED;
  const placeholderIssues = counters.PLACEHOLDER_BECAME_MESSAGE;
  const thinkingIssues = counters.THINKING_OVER_10S;

  console.log('\n═══════════════════════════════════════════════════');
  console.log('[CHAT STABILITY REPORT]');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Web sends: ${counters.WEB_SENDS_PASS}/30 ${counters.WEB_SENDS_PASS >= 30 ? 'PASS' : 'FAIL'}`);
  console.log(`Mobile sends: ${counters.MOBILE_SENDS_PASS}/15 ${counters.MOBILE_SENDS_PASS >= 15 ? 'PASS' : 'FAIL'}`);
  console.log(`UI flashes detected: ${counters.UI_FLASHES_DETECTED === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`Parse errors: ${parseErrors === 0 ? 'PASS' : 'FAIL'} (${parseErrors})`);
  console.log(`Duplicates occurred: ${duplicates === 0 ? 'PASS' : 'FAIL'} (${duplicates})`);
  console.log(`Placeholder became message: ${placeholderIssues === 0 ? 'PASS' : 'FAIL'} (${placeholderIssues})`);
  console.log(`Thinking >10s: ${thinkingIssues === 0 ? 'PASS' : 'FAIL'} (${thinkingIssues})`);
  console.log('───────────────────────────────────────────────────');
  console.log('Summary counters:');
  console.log(`  PARSE_ATTEMPTS: ${parseCounters.PARSE_ATTEMPTS}`);
  console.log(`  PARSE_SKIPPED_NOT_JSON: ${parseCounters.PARSE_SKIPPED_NOT_JSON}`);
  console.log(`  SANITIZE_EXTRACT_OK: ${parseCounters.SANITIZE_EXTRACT_OK}`);
  console.log(`  HARD_GATE_BLOCKED_OBJECT: ${counters.HARD_GATE_BLOCKED_OBJECT}`);
  console.log(`  HARD_GATE_BLOCKED_JSON_STRING: ${counters.HARD_GATE_BLOCKED_JSON_STRING}`);
  console.log(`  HARD_GATE_FALSE_POSITIVE_PREVENTED: ${counters.HARD_GATE_FALSE_POSITIVE_PREVENTED}`);
  console.log(`  REFETCH_TRIGGERED: ${counters.REFETCH_TRIGGERED}`);
  console.log(`  DUPLICATE_BLOCKED: ${counters.DUPLICATE_BLOCKED}`);
  console.log('═══════════════════════════════════════════════════\n');
}