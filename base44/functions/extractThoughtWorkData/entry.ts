import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Extracts structured data from a thought work conversation for reliable analytics/journaling.
 * Non-breaking: if extraction fails, returns null so the save flow can continue with basic fields.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_messages } = await req.json();
    
    if (!conversation_messages || !Array.isArray(conversation_messages)) {
      return Response.json({ error: 'conversation_messages array required' }, { status: 400 });
    }

    // Build conversation history for LLM analysis
    const conversationText = conversation_messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');

    // Use InvokeLLM with response_json_schema to extract structured fields
    const structuredData = await base44.integrations.Core.InvokeLLM({
      prompt: `You are analyzing a CBT thought work conversation to extract structured data for journaling.

Conversation:
${conversationText}

Extract the following fields (use null if not found):
- situation: Brief description of the situation
- automatic_thoughts: The negative automatic thoughts
- emotions: Array of emotion names (e.g., ["anxious", "sad"])
- emotion_ratings: Object with anxiety (0-10), if mentioned
- evidence_for: Evidence supporting the automatic thoughts
- evidence_against: Evidence challenging the automatic thoughts
- balanced_thought: The alternative, balanced thought developed
- homework: Array of homework tasks (each with: task, duration_minutes, success_criteria, user_committed boolean)

If homework was discussed but user declined or didn't commit, set user_committed: false.
If no homework was discussed at all, return empty array.`,
      response_json_schema: {
        type: "object",
        properties: {
          situation: { type: ["string", "null"] },
          automatic_thoughts: { type: ["string", "null"] },
          emotions: { 
            type: ["array", "null"],
            items: { type: "string" }
          },
          emotion_ratings: {
            type: ["object", "null"],
            properties: {
              anxiety: { type: ["number", "null"] }
            }
          },
          evidence_for: { type: ["string", "null"] },
          evidence_against: { type: ["string", "null"] },
          balanced_thought: { type: ["string", "null"] },
          homework: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task: { type: "string" },
                duration_minutes: { type: ["number", "null"] },
                success_criteria: { type: ["string", "null"] },
                user_committed: { type: "boolean" }
              },
              required: ["task", "user_committed"]
            }
          }
        },
        required: ["homework"]
      }
    });

    return Response.json({ 
      success: true, 
      data: structuredData 
    });

  } catch (error) {
    console.error('Extraction error:', error);
    
    // Non-breaking: return null data so caller can proceed with basic save
    return Response.json({ 
      success: false, 
      error: error.message,
      data: null 
    });
  }
});