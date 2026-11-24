import { createClientFromRequest } from 'npm:@base44/sdk@0.8.63';
import { readTrainingInput, TrainingLimitError } from './limits.js';

const HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
Deno.serve(async (req) => {
  let quota;
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { ...HEADERS, Allow: 'POST' } });
    }
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(error => {
      const status = error.status ?? error.response?.status;
      if (status === 401 || status === 403) return null;
      throw error;
    });
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: HEADERS });
    const input = await readTrainingInput(req);
    // Only this authenticated server chooses the actor's user id. The actor
    // serializes the durable quota update across every tab and function instance.
    const usage = await base44.asServiceRole.actors.TrainingUsage(user.id).usage({
      action: input.action === 'status' ? 'status' : 'reserve',
    });
    if (!usage?.ok) {
      if ([403,429,503].includes(usage?.status) && typeof usage?.code === 'string') {
        throw new TrainingLimitError(usage.status, usage.code, usage.quota, usage.retryAfter);
      }
      throw new TrainingLimitError(503, 'TRAINING_USAGE_UNAVAILABLE');
    }
    quota = usage.quota;
    if (input.action === 'status') return Response.json({ quota }, { headers: HEADERS });
    // Reservation precedes BOTH paid calls and remains if a provider fails,
    // because that request may already have consumed AI credits.
    const { scenario, conversationHistory, therapistResponse } = input;

  const systemPrompt = `You are an expert CBT supervisor evaluating a trainee therapist's response during a simulated patient interaction.

Your job is to score and provide constructive feedback on the therapist's response across these dimensions:

1. **CBT Adherence** (0-10): Did the response use CBT techniques correctly? (Socratic questioning, cognitive restructuring, behavioral activation, exposure principles, etc.)
2. **Empathy & Validation** (0-10): Did the therapist validate the patient's experience without reinforcing avoidance?
3. **De-escalation** (0-10): If the patient was distressed, did the therapist appropriately ground and calm them?
4. **Directiveness** (0-10): CBT is active and directive — did the therapist take appropriate initiative rather than just listening passively?
5. **Safety Awareness** (0-10): Did the therapist handle any risk signals appropriately?

Respond ONLY with valid JSON in this exact format:
{
  "scores": {
    "cbt_adherence": <number>,
    "empathy": <number>,
    "deescalation": <number>,
    "directiveness": <number>,
    "safety_awareness": <number>
  },
  "overall": <number 0-10>,
  "strengths": [<string>, ...],
  "improvements": [<string>, ...],
  "suggested_response": "<a better example response>",
  "patient_reaction": "<how the simulated patient would realistically react to this therapist response>",
  "session_continues": <true|false>
}`;

  const conversationSummary = conversationHistory
    .map(m => `${m.role === 'patient' ? 'Patient' : 'Therapist'}: ${m.content}`)
    .join('\n');

  const userPrompt = `## Scenario
${scenario.description}

## Patient Profile
${scenario.patientProfile}

## Conversation So Far
${conversationSummary || '(This is the opening response)'}

## Therapist's Latest Response
"${therapistResponse}"

Evaluate this therapist response and return JSON feedback.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: userPrompt,
    model: 'claude_sonnet_4_6',
    response_json_schema: {
      type: 'object',
      properties: {
        scores: {
          type: 'object',
          properties: {
            cbt_adherence: { type: 'number' },
            empathy: { type: 'number' },
            deescalation: { type: 'number' },
            directiveness: { type: 'number' },
            safety_awareness: { type: 'number' }
          }
        },
        overall: { type: 'number' },
        strengths: { type: 'array', items: { type: 'string' } },
        improvements: { type: 'array', items: { type: 'string' } },
        suggested_response: { type: 'string' },
        patient_reaction: { type: 'string' },
        session_continues: { type: 'boolean' }
      }
    }
  });

  // Also generate the patient's next message using a separate call
  const patientPrompt = `You are roleplaying as a patient in a CBT therapy session.

## Your Profile
${scenario.patientProfile}

## Session So Far
${conversationSummary}

Therapist just said: "${therapistResponse}"

Based on how you (as this patient) would realistically react, write your next message as the patient. Be authentic — respond to what the therapist actually said, not an ideal response. Keep it 1-3 sentences.`;

  const patientReply = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: patientPrompt,
    model: 'claude_sonnet_4_6'
  });

    return Response.json({ feedback: result, patientReply, quota }, { headers: HEADERS });
  } catch (error) {
    if (error instanceof TrainingLimitError) {
      return Response.json({ error: error.code, code: error.code, ...(error.quota ? { quota: error.quota } : {}) }, {
        status: error.status,
        headers: { ...HEADERS, ...(error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}) },
      });
    }
    // Do not expose provider errors or log patient/therapist text.
    console.error('[Training] Evaluation unavailable', {
      stage: quota ? 'provider' : 'usage',
      kind: error instanceof TypeError ? 'type_error' : 'request_error',
      status: Number(error?.status ?? error?.response?.status) || 0,
    });
    const code = quota ? 'TRAINING_EVALUATION_FAILED' : 'TRAINING_USAGE_UNAVAILABLE';
    return Response.json({ error: code, code, ...(quota ? { quota } : {}) }, { status: 503, headers: HEADERS });
  }
});