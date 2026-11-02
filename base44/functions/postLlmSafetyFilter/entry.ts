import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PLATFORM-LEVEL MANDATORY FILTER
 * This function is called automatically by the platform AFTER every LLM response
 * before it reaches the user. It cannot be bypassed.
 * 
 * Purpose: Strip all internal reasoning, meta-commentary, and forbidden patterns
 * from agent outputs to enforce "No Reasoning Leakage" policy.
 */

const FORBIDDEN_PATTERNS = [
  // Direct reasoning markers
  /^\s*THOUGHT:/mi,
  /^\s*THINKING:/mi,
  /^\s*ANALYSIS:/mi,
  /^\s*REASONING:/mi,
  /^\s*INTERNAL:/mi,
  /^\s*SYSTEM:/mi,
  /^\s*DEVELOPER:/mi,
  /^\s*PLAN:/mi,
  /^\s*CHECKLIST:/mi,
  /^\s*STEP\s+\d+:/mi,
  /^\s*CONFIDENCE:/mi,
  
  // Meta-commentary about process
  /^I should\b/mi,
  /^I need to\b/mi,
  /^I will\b/mi,
  /^Let me\b/mi,
  /^First I'll\b/mi,
  /^Then I'll\b/mi,
  /^My goal is\b/mi,
  /^The next step is\b/mi,
  
  // Bracketed internal notes
  /\[checking/i,
  /\[internal/i,
  /\[validation/i,
  /\[constraint/i,
  /\[protocol/i,
  /\[note:/i,
  
  // Technical/system terms
  /\bconstraint checklist\b/i,
  /\bmental sandbox\b/i,
  /\bconfidence score\b/i,
  /\bsanitizer\b/i,
  /\bhard gate\b/i,
  /\binstrumentation\b/i,
  /\bpolling\b/i,
  /\bparse failed\b/i,
  /\bdetection layer\b/i,
  /\bassessment protocol\b/i,
  
  // Process narration
  /\bhere's a plan\b/i,
  /\blet's break down\b/i,
  /\bnow I'll\b/i,
  /\bnext I'll\b/i
];

const HEBREW_FAILSAFE = "אני כאן איתך. מה הכי מטריד אותך כרגע?";
const ENGLISH_FAILSAFE = "I'm here with you. What's on your mind?";

function stripForbiddenContent(text, userLanguage = 'en') {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Split into lines
  const lines = text.split('\n');
  
  // Filter out lines containing forbidden patterns
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) return true;
    
    // Check if line starts with or contains forbidden pattern
    const isForbidden = FORBIDDEN_PATTERNS.some(pattern => pattern.test(line));
    
    if (isForbidden) {
      console.log(`[PostLLM Filter] Blocked line: "${line.substring(0, 50)}..."`);
      return false;
    }
    
    return true;
  });

  // Join back
  let cleaned = cleanedLines.join('\n').trim();

  // If we removed everything or left too little, use failsafe
  if (!cleaned || cleaned.length < 10) {
    console.warn('[PostLLM Filter] Message too short after filtering, using failsafe');
    cleaned = userLanguage === 'he' ? HEBREW_FAILSAFE : ENGLISH_FAILSAFE;
  }

  // Log if we made changes
  if (cleaned !== text) {
    console.log(`[PostLLM Filter] Stripped ${text.split('\n').length - cleanedLines.length} lines with forbidden content`);
  }

  return cleaned;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me().catch(() => null);
    if (!caller?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message_content, conversation_metadata } = await req.json();

    if (!message_content || typeof message_content !== 'string') {
      return Response.json({ error: 'Missing message_content' }, { status: 400 });
    }
    if (message_content.length > 100_000) {
      return Response.json({ error: 'message_content exceeds the allowed length' }, { status: 413 });
    }

    // Detect language from metadata or content
    const userLanguage = conversation_metadata?.language || 'en';

    // Apply filtering
    const filtered = stripForbiddenContent(message_content, userLanguage);

    return Response.json({
      filtered_content: filtered,
      was_modified: filtered !== message_content,
      original_length: message_content.length,
      filtered_length: filtered.length
    });

  } catch (error) {
    console.error('[PostLLM Filter] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
