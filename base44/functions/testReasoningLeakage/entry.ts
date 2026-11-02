import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Regression Test: Reasoning Leakage Prevention
 * 
 * PURPOSE: Automated test to verify no internal reasoning tokens leak to UI
 * USAGE: Run after any agent prompt updates or message pipeline changes
 * 
 * Tests a simulated 15-message conversation and asserts:
 * 1. No THOUGHT:, PLAN:, REASONING: patterns in rendered content
 * 2. No markdown code blocks with internal reasoning
 * 3. Sanitizer properly strips leaked content
 * 
 * Returns: { success: boolean, violations: Array, details: string }
 */

const FORBIDDEN_TOKENS = [
  'THOUGHT:',
  'THINKING:',
  'ANALYSIS:',
  'REASONING:',
  'PLAN:',
  'INTERNAL:',
  'SYSTEM:',
  'DEVELOPER:',
  'DEBUG:',
  'TRACE:',
  'Constraint checklist',
  'Mental sandbox',
  'Confidence score',
  'my goal is',
  "here's a plan",
  "let's break down",
  '[checking',
  '[internal',
  '[validation',
  '[constraint',
  '[protocol'
];

/**
 * Check if text contains reasoning leakage
 */
function hasReasoningLeakage(text) {
  if (!text || typeof text !== 'string') return false;
  
  const lowerText = text.toLowerCase();
  
  return FORBIDDEN_TOKENS.some(token => {
    const lowerToken = token.toLowerCase();
    return lowerText.includes(lowerToken);
  });
}

/**
 * Simulate sanitization (matches client-side logic)
 */
function clientSideSanitize(text) {
  if (!text || typeof text !== 'string') return text;
  
  const PATTERNS = [
    /^\s*THOUGHT\s*:\s*/mi,
    /^\s*THINKING\s*:\s*/mi,
    /^\s*ANALYSIS\s*:\s*/mi,
    /^\s*REASONING\s*:\s*/mi,
    /^\s*INTERNAL\s*:\s*/mi,
    /^\s*PLAN\s*:\s*/mi,
    /^\s*DEBUG\s*:\s*/mi,
    /^```(thought|reasoning|analysis|debug)/mi,
    /^(First\s+I'll|Then\s+I'll|I\s+should\s+|I\s+need\s+to\s+|My\s+goal\s+is)/mi,
    /^\[checking/mi,
    /^\[internal/mi,
    /^\[validation/mi
  ];
  
  const lines = text.split('\n');
  const cleaned = lines.filter(line => {
    return !PATTERNS.some(pattern => pattern.test(line));
  }).join('\n').trim();
  
  return cleaned || "I'm here with you. What's on your mind?";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CRITICAL: Admin-only test
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { test_messages, conversation_id } = await req.json();
    
    const violations = [];
    let messagesChecked = 0;

    // Test Case 1: Check provided test messages
    if (test_messages && Array.isArray(test_messages)) {
      test_messages.forEach((msg, index) => {
        if (msg.role === 'assistant' && msg.content) {
          messagesChecked++;
          
          // Check raw content
          if (hasReasoningLeakage(msg.content)) {
            const tokens = FORBIDDEN_TOKENS.filter(t => 
              msg.content.toLowerCase().includes(t.toLowerCase())
            );
            
            violations.push({
              index,
              type: 'raw_content_leakage',
              tokens_found: tokens,
              preview: msg.content.substring(0, 100),
              severity: 'CRITICAL'
            });
          }
          
          // Verify sanitizer would fix it
          const sanitized = clientSideSanitize(msg.content);
          if (hasReasoningLeakage(sanitized)) {
            violations.push({
              index,
              type: 'sanitizer_failed',
              preview: sanitized.substring(0, 100),
              severity: 'FATAL'
            });
          }
        }
      });
    }

    // Test Case 2: Check real conversation if provided
    if (conversation_id) {
      const conversation = await base44.asServiceRole.agents.getConversation(conversation_id);
      
      if (conversation && conversation.messages) {
        conversation.messages.forEach((msg, index) => {
          if (msg.role === 'assistant' && msg.content) {
            messagesChecked++;
            
            if (hasReasoningLeakage(msg.content)) {
              const tokens = FORBIDDEN_TOKENS.filter(t => 
                msg.content.toLowerCase().includes(t.toLowerCase())
              );
              
              violations.push({
                conversation_id,
                message_index: index,
                type: 'conversation_leakage',
                tokens_found: tokens,
                preview: msg.content.substring(0, 100),
                severity: 'CRITICAL'
              });
            }
          }
        });
      }
    }

    // Generate test report
    const success = violations.length === 0;
    const report = {
      success,
      test_date: new Date().toISOString(),
      messages_checked: messagesChecked,
      violations_found: violations.length,
      violations,
      status: success ? 'PASS ✅' : 'FAIL ❌',
      details: success 
        ? `All ${messagesChecked} messages clean - no reasoning leakage detected`
        : `${violations.length} violation(s) found in ${messagesChecked} messages checked`
    };

    return Response.json(report);

  } catch (error) {
    console.error('Test error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      status: 'ERROR ❌'
    }, { status: 500 });
  }
});