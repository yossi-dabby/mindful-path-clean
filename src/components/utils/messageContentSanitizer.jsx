/**
 * Client-side message content sanitizer
 * 
 * PURPOSE: Strip internal reasoning tokens from assistant messages before rendering
 * CONTEXT: Acts as "airbag" filter even when agent prompt fails
 * 
 * CRITICAL: This is the LAST line of defense before user sees content
 */

/**
 * Extract content inside <think>...</think> blocks (without consuming it from the text)
 * @param {string} text - Raw message content
 * @returns {string|null} - The combined thinking content, or null if no blocks found
 */
export function extractThinkingContent(text) {
  if (!text || typeof text !== 'string') return null;
  const matches = [];
  const re = /<think>([\s\S]*?)<\/think>/gi;
  let match;
  while ((match = re.exec(text)) !== null) {
    const trimmed = match[1].trim();
    if (trimmed) matches.push(trimmed);
  }
  return matches.length > 0 ? matches.join('\n\n') : null;
}

const FORBIDDEN_PATTERNS = [
  // Explicit reasoning markers (at start of line, case-insensitive)
  /^\s*THOUGHT\b/mi,
  /^\s*THOUGHT\s*:/mi,
  /^\s*THINKING\b/mi,
  /^\s*THINKING\s*:/mi,
  /^\s*ANALYSIS\s*:/mi,
  /^\s*REASONING\s*:/mi,
  /^\s*INTERNAL\s*:/mi,
  /^\s*SYSTEM\s*:/mi,
  /^\s*DEVELOPER\s*:/mi,
  /^\s*PLAN\s*:/mi,
  /^\s*DEBUG\s*:/mi,
  /^\s*TRACE\s*:/mi,
  /^\s*NOTE\s*:/mi,
  /^\s*CONTEXT\s*:/mi,
  /^\s*OBSERVATION\s*:/mi,
  /^\s*LOCKED_DOMAIN/mi,
  /^\s*RULE ZERO/mi,
  /^\s*CP\d+\b/mi,

  // Planning/meta lines
  /^\s*Step\s+\d+\s*:/mi,
  /^\s*Phase\s+\d+/mi,
  /^Constraint\s+checklist/mi,
  /^Mental\s+sandbox/mi,
  /^Confidence\s+score/mi,

  // Code blocks with reasoning
  /^```(thought|reasoning|analysis|debug)/mi,

  // Meta planning phrases (start of line)
  /^(First\s+I'll|Then\s+I'll|I\s+should\b|I\s+need\s+to\b|My\s+goal\s+is\b)/mi,
  /^\[checking/mi,
  /^\[internal/mi,
  /^\[validation/mi,
  /^\[constraint/mi,
  /^\[protocol/mi,
  /^\[thinking/mi,
  /^\[reasoning/mi,
  /^\[thought/mi,
  /^\[THOUGHT/mi,

  // Raw tool-call markup tags
  /<\/?(?:tool_call|tool_calls|function_call|function_calls|function_result|function_results|invoke|parameter|result)\b[^>]*>/mi
];

const RAW_TOOL_CALL_BLOCK_PATTERNS = [
  /<tool_call\b[^>]*>[\s\S]*?<\/tool_call>/gi,
  /<tool_calls\b[^>]*>[\s\S]*?<\/tool_calls>/gi,
  /<function_call\b[^>]*>[\s\S]*?<\/function_call>/gi,
  /<function_calls\b[^>]*>[\s\S]*?<\/function_calls>/gi,
  /<function_result\b[^>]*>[\s\S]*?<\/function_result>/gi,
  /<function_results\b[^>]*>[\s\S]*?<\/function_results>/gi,
];

// A transcript containing result/invoke/parameter tags is not a mixed user-facing
// answer. It is a provider tool protocol leak, and partial salvage risks exposing
// arguments, results, or hidden planning. Replace the whole payload with a localized
// safe response instead of attempting line-by-line recovery.
const RAW_TOOL_TRANSCRIPT_PATTERN =
  /<\/?(?:function_results?|invoke|parameter|result)\b[^>]*>/i;

// Patterns that must not appear ANYWHERE on a line (tool names, param labels, schema, entity names)
const FORBIDDEN_INLINE_PATTERNS = [
  // Tool names
  /retrieveCurriculumUnit/i,
  /retrieveTherapistMemory/i,
  /writeTherapistMemory/i,
  /retrieveTrustedCBTContent/i,
  /retrieveRelevantContent/i,

  // Entity names exposed as tool targets
  /\bThoughtJournal\b/,
  /\bMoodEntry\b/,
  /\bCompanionMemory\b/,
  /\bSessionSummary\b/,
  /\bDailyFlow\b/,
  /\bCrisisAlert\b/,
  /\bCaseFormulation\b/,
  /\bTherapyFeedback\b/,
  /\bCoachingSession\b/,
  /\bProactiveReminder\b/,

  // Curriculum / routing field names
  /\bclinical_topic\b/i,
  /\bunit_type\b/i,
  /\blinked_hierarchy_level\b/i,
  /\blinked_outcome_patterns\b/i,
  /\bpriority_score\b/i,
  /\bwhen_to_use\b/i,
  /\bagent_usage_rules\b/i,
  /\bdirective_rewrite_pattern\b/i,
  /\bsource_chunk_ids\b/i,

  // Internal label tokens
  /\bblocker_resolution\b/i,
  /\bmicro_step_ladder\b/i,
  /\boutcome_interpretation\b/i,
  /\bphrasing_pattern\b/i,
  /\bmultilingual_response_pattern\b/i,
  /\bformulation_to_action\b/i,
  /\bgraded_exposure\b(?!\s+(exercise|technique|approach|practice|step|work))/i,
  /\banxiety_cycle_mapping\b/i,
  /\bgrounding_calming\b/i,
  /\bbalanced_thought_work\b/i,
  /\bbehavioral_activation\b/i,
  /\bcoping_plan\b/i,
  /\bproblem_solving\b/i,
  /\bself_observation\b/i,
  /\bsleep_intervention\b/i,

  // Outcome pattern labels
  /\bcompleted_step_with_distress\b/i,
  /\bcompleted_step_with_learning\b/i,
  /\bpartial_completion\b/i,
  /\bavoidance_or_noncompletion\b/i,
  /\bstep_too_hard\b/i,
  /\bstep_too_easy\b/i,
  /\bemotional_flooding\b/i,
  /\bno_clear_change\b/i,
  /\bincreased_confidence\b/i,
  /\bnew_specific_fear_discovered\b/i,
  /\breturn_after_two_steps\b/i,

  // Hierarchy labels (standalone routing context)
  /\bLOCKED_DOMAIN\b/i,
  /\bINTERVENTION_MODE\b/i,

  // Response schema structures
  /A(?:\u2192|->)B(?:\u2192|->)C(?:\u2192|->)D(?:\u2192|->)E/,
  /A\s*\u2192\s*B\s*\u2192\s*C/,
  /A\s*->\s*B\s*->\s*C/,

  // Memory field names
  /\bcurrent_issue\b/i,
  /\bnext_recommended_step\b/i,
  /\bintervention_mode\b/i,
  /\blatest_completed_step\b/i,
  /\blatest_outcome_pattern\b/i,
  /\bdifficulty_level\b/i,
  /\bspecific_fear_discovered\b/i,
  /\bunresolved_blocker\b/i,
  /\bfollow_up_tasks\b/i,
  /\btherapist_memory_version\b/i,

  // English internal-analysis phrases (leak into non-English sessions)
  /\bBased on (?:memory|stored data|prior session|the memory)\b/i,
  /\bAccording to (?:stored|memory|my records)\b/i,
  /\bMemory (?:indicates|shows|records|says)\b/i,
  /\bThe system has\b/i,
  /\bI(?:'ll| will) (?:now |classify |evaluate |check |apply |retrieve |call |use )(?:the |this )?(?:memory|curriculum|tool|unit|pattern|domain|gate|rule)/i,
  /\bLet me (?:evaluate|check|classify|apply|retrieve|call|analyze|assess) (?:the |this )?(?:memory|domain|pattern|current|topic|message|gate)/i,
  /\bNow I(?:'ll| need to| will) (?:check|evaluate|classify|apply|call|retrieve)/i,
  /\bChecking (?:the |for )?(?:gate|domain|rule|condition|memory|pattern)/i,
  /\bApplying (?:the |this )?(?:gate|rule|pattern|domain|CP\d|RULE ZERO|curriculum)/i,
  /\bDomain (?:lock|classification|check|match):/i,
  /\bLOCKED_DOMAIN\s*=/i,
  /\bCurrent (?:message )?domain:/i,
  /\bStored (?:domain|memory|current_issue):/i,
  /\bGate (?:passes|fails|blocked|check)/i,
  /\bContinuity (?:gate|opener|check|suppressed)/i,
  /^\s*RULE ZERO/im,
  /^\s*STEP \d+:/im,
  /^\s*LINT \d+/im,
  /^\s*CP\d+/im,

  // Meta-reasoning / policy narration patterns (must never appear in user-visible output)
  // Pattern: "The user is [verb]-ing [object]" — internal classification of the user's message.
  // Verbs listed cover the most common LLM meta-analysis constructions: emotional state
  // ("expressing", "feeling"), content summary ("describing", "stating", "mentioning"),
  // and intent signals ("asking", "requesting"). Extend this list if new variants appear.
  /\bThe user is (?:expressing|describing|asking|requesting|feeling|showing|stating|reporting|noting|mentioning|displaying|exhibiting)\b/i,
  // Pattern: "The user's message is/contains" — internal message analysis
  /\bThe user['']s (?:message|input|request|query|response|tone) (?:is|contains?|indicates?|suggests?|signals?)\b/i,
  // Pattern: "Relevant Constitution principles" — policy narration leak
  /\bRelevant Constitution (?:principles?|rules?|guidelines?|constraints?|points?)\b/i,
  // Pattern: "I need to respond [to/with]" or "I need to [produce/generate/provide]" — planning text
  /\bI need to (?:respond|reply|generate|produce|provide|address|handle|output)\b/i,
  // Pattern: "This is a [adjective] response" — meta-commentary on own output
  /\bThis (?:is|should be|will be|represents?) (?:a |an )?(?:therapeutic|supportive|CBT|clinical|empathic|appropriate|directive|brief|concise|short) (?:response|reply|answer|message)\b/i,
  // Pattern: "Applying [named constraint/principle]"
  /\bApplying (?:principle|rule|constraint|guideline|policy|constitution)\b/i,
  // Pattern: "Constitution says" / "Per the constitution" — explicit policy citation
  /\b(?:Per|According to|Following) the (?:constitution|policy|guidelines?|protocol|rules?)\b/i,
  /\bConstitution (?:says|states|requires?|mandates?|specifies?|indicates?)\b/i,
  // Pattern: "I will now [produce/generate/write] a response" — output announcement
  /\bI (?:will|shall) now (?:produce|generate|write|compose|provide|give) (?:a |an |the )?(?:response|reply|answer|therapeutic)\b/i,
  // Pattern: internal scoring or evaluation phrases
  /\bResponse (?:quality|score|rating|evaluation|assessment)\s*[:=]/i,
  /\bOutput (?:quality|score|rating|evaluation)\s*[:=]/i,
];

const LANGUAGE_FAILSAFES = {
  he: 'אני כאן איתך. מה הכי מטריד אותך כרגע?',
  en: "I'm here with you. What's on your mind right now?",
  es: 'Estoy aquí contigo. ¿Qué está en tu mente ahora mismo?',
  fr: "Je suis là pour toi. Qu'est-ce qui te préoccupe en ce moment?",
  de: 'Ich bin hier für dich. Was beschäftigt dich gerade?',
  it: 'Sono qui con te. Cosa hai in mente in questo momento?',
  pt: 'Estou aqui com você. O que está em sua mente agora?',
};

function getLanguageFailsafe(language) {
  return LANGUAGE_FAILSAFES[language] || LANGUAGE_FAILSAFES['en'];
}

const HEBREW_FAILSAFE = LANGUAGE_FAILSAFES.he;
const ENGLISH_FAILSAFE = LANGUAGE_FAILSAFES.en;

/**
 * Sanitize text by removing lines containing reasoning tokens
 * @param {string} text - Raw message content
 * @param {string} language - User language ('he' or 'en')
 * @returns {string} - Cleaned content safe for user display
 */
export function sanitizeMessageContent(text, language = 'en') {
  if (!text || typeof text !== 'string') {
    return text;
  }

  if (RAW_TOOL_TRANSCRIPT_PATTERN.test(text)) {
    console.error('[Sanitizer] ⚠️ Raw tool transcript detected - using failsafe');
    return getLanguageFailsafe(language);
  }

  // Strip <think>...</think> blocks (XML-style reasoning tokens used by some LLMs)
  if (/<think>/i.test(text)) {
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    console.warn('[Sanitizer] ⚠️ Stripped <think> block from assistant message');
    if (!text || text.length < 5) {
      console.error('[Sanitizer] ⚠️ All content removed after <think> stripping - using failsafe');
      return getLanguageFailsafe(language);
    }
  }

  // Strip <INTERNAL_PROCESS>...</INTERNAL_PROCESS> blocks (internal LLM session-start turns).
  // These are provisional processing markers that must never appear in user-visible output.
  if (/<INTERNAL_PROCESS\b/i.test(text)) {
    text = text.replace(/<INTERNAL_PROCESS\b[^>]*>[\s\S]*?<\/INTERNAL_PROCESS>/gi, '').trim();
    console.warn('[Sanitizer] ⚠️ Stripped <INTERNAL_PROCESS> block from assistant message');
    if (!text || text.length < 5) {
      console.error('[Sanitizer] ⚠️ All content removed after <INTERNAL_PROCESS> stripping - using failsafe');
      return getLanguageFailsafe(language);
    }
  }

  // Strip raw agent tool-call markup blocks
  let strippedToolCallMarkup = false;
  for (const pattern of RAW_TOOL_CALL_BLOCK_PATTERNS) {
    const next = text.replace(pattern, '').trim();
    if (next !== text) {
      strippedToolCallMarkup = true;
      text = next;
    }
  }
  if (strippedToolCallMarkup) {
    console.warn('[Sanitizer] ⚠️ Stripped raw tool-call markup block from assistant message');
    if (!text || text.length < 5) {
      console.error('[Sanitizer] ⚠️ All content removed after tool-call markup stripping - using failsafe');
      return getLanguageFailsafe(language);
    }
  }

  // Quick check - if NO pattern of either type matches, skip processing (performance optimization)
  // CRITICAL: Must check BOTH arrays — inline patterns are independent of line-start patterns
  const hasAnyForbiddenPattern =
    FORBIDDEN_PATTERNS.some(p => p.test(text)) ||
    FORBIDDEN_INLINE_PATTERNS.some(p => p.test(text));
  if (!hasAnyForbiddenPattern) {
    return text;
  }

  // Split into lines for precise filtering
  const lines = text.split('\n');

  // Filter out lines containing forbidden patterns (line-start OR inline)
  const cleanedLines = lines.filter(line => {
    // Skip empty lines
    if (!line.trim()) return true;

    // Check line-start forbidden patterns
    if (FORBIDDEN_PATTERNS.some(pattern => pattern.test(line))) {
      console.warn('[Sanitizer] ⚠️ REMOVED reasoning line (start-pattern):', line.substring(0, 60));
      return false;
    }

    // Check inline forbidden patterns (tool names, field names, schema labels)
    if (FORBIDDEN_INLINE_PATTERNS.some(pattern => pattern.test(line))) {
      console.warn('[Sanitizer] ⚠️ REMOVED leakage line (inline-pattern):', line.substring(0, 60));
      return false;
    }

    return true;
  });

  // Join back and trim
  let cleaned = cleanedLines.join('\n').trim();

  // Failsafe: If cleaning removed everything, use language-appropriate fallback
  if (!cleaned || cleaned.length < 5) {
    console.error('[Sanitizer] ⚠️ All content removed - using failsafe');
    cleaned = getLanguageFailsafe(language);
  }

  return cleaned;
}

/**
 * Check if content contains reasoning leakage (for testing/monitoring)
 * @param {string} text - Message content to check
 * @returns {boolean} - True if reasoning tokens detected
 */
export function hasReasoningLeakage(text) {
  if (!text || typeof text !== 'string') return false;
  
  if (/<think>/i.test(text)) return true;
  if (/<INTERNAL_PROCESS\b/i.test(text)) return true;
  if (FORBIDDEN_PATTERNS.some(pattern => pattern.test(text))) return true;
  // Also check inline patterns (tool names, entity names, meta-reasoning phrases)
  return FORBIDDEN_INLINE_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Extract reasoning tokens found (for debugging/monitoring)
 * @param {string} text - Message content to analyze
 * @returns {Array<string>} - List of matched patterns
 */
export function extractReasoningTokens(text) {
  if (!text || typeof text !== 'string') return [];
  
  const found = [];
  const lines = text.split('\n');
  
  lines.forEach(line => {
    FORBIDDEN_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        found.push(line.substring(0, 80));
      }
    });
  });
  
  return found;
}
