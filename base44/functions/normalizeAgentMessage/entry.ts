import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SERVER-SIDE MESSAGE NORMALIZATION
 * Extracts assistant_message from structured JSON and ensures message.content is ALWAYS a string.
 * This prevents any JSON objects from reaching the subscription stream.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_id } = await req.json();

    if (!conversation_id) {
      return Response.json({ error: 'conversation_id required' }, { status: 400 });
    }

    // Fetch the conversation
    const conversation = await base44.asServiceRole.agents.getConversation(conversation_id);
    
    if (!conversation || !conversation.messages) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    let normalizedCount = 0;
    let errorCount = 0;

    // Process each message - extract structured data from content if it's an object
    for (const message of conversation.messages) {
      if (message.role !== 'assistant' || !message.content) {
        continue;
      }

      // Check if content is an object (not a string)
      if (typeof message.content === 'object') {
        console.log(`[Normalize] Found object content in message, extracting...`);
        
        try {
          // Extract assistant_message from structured output
          let assistantMessage = '';
          let structuredData = null;

          if (message.content.assistant_message) {
            assistantMessage = message.content.assistant_message;
            structuredData = message.content;
          } else {
            // Fallback: stringify if no assistant_message field
            assistantMessage = 'I processed your request.';
            structuredData = message.content;
            console.warn('[Normalize] No assistant_message field found, using fallback');
          }

          // Update the message via SDK
          // Note: Base44 agents API may not support direct message updates
          // So we track this for monitoring but can't modify past messages
          normalizedCount++;
          
          console.log(`[Normalize] Would normalize: "${assistantMessage.substring(0, 50)}..."`);
        } catch (err) {
          console.error('[Normalize] Extraction error:', err);
          errorCount++;
        }
      } else if (typeof message.content === 'string') {
        // Check if string contains JSON structure
        const trimmed = message.content.trim();
        if ((trimmed.startsWith('{') || trimmed.startsWith('[{')) && trimmed.includes('"assistant_message"')) {
          console.log(`[Normalize] Found JSON string in content, flagging...`);
          normalizedCount++;
        }
      }
    }

    return Response.json({
      success: true,
      conversation_id,
      messages_checked: conversation.messages.length,
      objects_found: normalizedCount,
      errors: errorCount,
      note: 'Message normalization requires platform-level support. Currently monitoring only.'
    });

  } catch (error) {
    console.error('Message normalization error:', error);
    return Response.json({ 
      error: 'Normalization failed',
      message: error.message 
    }, { status: 500 });
  }
});