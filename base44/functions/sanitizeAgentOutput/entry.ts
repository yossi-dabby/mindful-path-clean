import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Backend sanitizer to strip internal reasoning tokens from agent messages.
 * Acts as fail-safe when agent-level self-sanitization fails.
 */

const FORBIDDEN_PATTERNS = [
  /^\s*THOUGHT\b/mi,
  /^\s*THINKING\b/mi,
  /^\s*ANALYSIS\b/mi,
  /^\s*REASONING\b/mi,
  /^\s*INTERNAL\b/mi,
  /^\s*SYSTEM\b/mi,
  /^\s*DEVELOPER\b/mi,
  /^\s*PLAN\b/mi,
  /^\s*CHECKLIST\b/mi,
  /^\s*STEP\s+\d+/mi,
  /\bCONFIDENCE\s+SCORE\b/i,
  /\bMENTAL SANDBOX\b/i,
  /\bCONSTRAINT CHECKLIST\b/i,
  /\bmy goal is\b/i,
  /\bhere's a plan\b/i,
  /\blet's break down\b/i,
  /^\s*let me\s+/mi,
  /^\s*first I'll\b/mi,
  /^\s*then I'll\b/mi,
  /^\s*I should\b/mi,
  /^\s*I need to\b/mi,
  /^\s*I will\b/mi,
  /\[checking/i,
  /\[internal/i,
  /\[validation/i,
  /\[constraint/i,
  /\[protocol/i,
  /\bsanitizer\b/i,
  /\bhard gate\b/i,
  /\binstrumentation\b/i,
  /\bpolling\b/i,
  /\bparse failed\b/i,
  /\bdetection layer\b/i,
  /\bassessment protocol\b/i
];

const HEBREW_FAILSAFE = "אני כאן איתך. מה הכי מטריד אותך כרגע?";

function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Split into lines
  const lines = text.split('\n');
  
  // Filter out lines containing forbidden patterns
  const cleanedLines = lines.filter(line => {
    return !FORBIDDEN_PATTERNS.some(pattern => pattern.test(line));
  });

  // Join back
  let cleaned = cleanedLines.join('\n').trim();

  // If empty after cleaning, use Hebrew failsafe
  if (!cleaned || cleaned.length < 10) {
    cleaned = HEBREW_FAILSAFE;
  }

  return cleaned;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CRITICAL: Admin-only function
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { conversation_id, message_content } = await req.json();

    // Case 1: Sanitize a specific message content (live)
    if (message_content) {
      const sanitized = sanitizeText(message_content);
      return Response.json({ 
        sanitized_content: sanitized,
        was_modified: sanitized !== message_content
      });
    }

    // Case 2: Sanitize all messages in a conversation (cleanup)
    if (conversation_id) {
      const conversation = await base44.asServiceRole.agents.getConversation(conversation_id);
      
      if (!conversation) {
        return Response.json({ error: 'Conversation not found' }, { status: 404 });
      }

      // Check ownership
      if (conversation.created_by !== user.email) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      let modifiedCount = 0;
      const updatedMessages = conversation.messages.map(msg => {
        if (msg.role === 'assistant' && msg.content) {
          const sanitized = sanitizeText(msg.content);
          if (sanitized !== msg.content) {
            modifiedCount++;
            return { ...msg, content: sanitized };
          }
        }
        return msg;
      });

      // Update conversation if any messages were modified
      if (modifiedCount > 0) {
        await base44.asServiceRole.agents.updateConversation(conversation_id, {
          messages: updatedMessages
        });
      }

      return Response.json({ 
        success: true,
        messages_sanitized: modifiedCount,
        conversation_id
      });
    }

    return Response.json({ error: 'Missing conversation_id or message_content' }, { status: 400 });

  } catch (error) {
    console.error('Sanitization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});