import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Enhanced crisis detection using LLM-based classifier
 * Complements regex-based detection for nuanced, implicit crisis language
 * Returns: { is_crisis: boolean, severity: string, reason: string, confidence: number }
 */

const SAFE_FALLBACK = {
  is_crisis: false,
  severity: 'none',
  reason: 'detection_unavailable',
  confidence: 0
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      console.warn('[Enhanced Crisis Detector] Auth unavailable, returning safe fallback:', authError.message);
      return Response.json(SAFE_FALLBACK);
    }

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, language = 'en' } = await req.json();

    if (!message || typeof message !== 'string') {
      return Response.json({ 
        is_crisis: false, 
        severity: 'none', 
        reason: 'invalid_input',
        confidence: 0 
      });
    }

    // Use LLM to classify crisis risk with structured output
    // Wrapped in its own try/catch so LLM unavailability never blocks chat
    let response;
    try {
      response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a mental health crisis detection system. Your job is to detect ONLY genuine, immediate safety risks — NOT general emotional distress.

User message: "${message}"

CRITICAL RULE — FALSE POSITIVE PREVENTION:
The following are NOT crises and must NEVER be classified as is_crisis=true:
- Exam anxiety, fear of failing a test or exam
- Academic stress ("I have a test tomorrow", "I'm afraid I'll fail", "אני מפחד להיכשל במבחן")
- Performance anxiety (job interviews, presentations, sports)
- General sadness, overwhelm, confusion, loneliness, or frustration
- Statements like "I'm so stressed", "I feel terrible", "I can't do this" in an academic or work context
- Panic-like feelings without explicit self-harm or danger language
- Any message where the fear is about failing an exam, test, deadline, or performance event

CRISIS SEVERITY DEFINITIONS (read carefully):
- SEVERE (is_crisis=true): Explicit self-harm intent, explicit suicide plan, active overdose, immediate danger to self or others, explicit statement of wanting to die right now
- HIGH (is_crisis=false): Implicit hopelessness, passive death wish, "I want to disappear", "everyone would be better off without me" — distressing but not immediate danger → is_crisis=false, flag for therapist attention only
- MEDIUM (is_crisis=false): Emotional distress, overwhelm, anxiety, sadness, frustration — no harm intent
- NONE (is_crisis=false): Normal emotional expression, academic stress, performance fear, daily worries

MULTILINGUAL NOTE: Apply these same rules regardless of language — Hebrew, English, Spanish, French, German, Italian, Portuguese, or any other language.

Return ONLY this JSON:
{
  "is_crisis": true or false,
  "severity": "severe" | "high" | "medium" | "none",
  "reason": "brief explanation",
  "confidence": 0.0 to 1.0
}

is_crisis must be true ONLY for SEVERE. Never true for high, medium, or none.`,
        response_json_schema: {
          type: "object",
          properties: {
            is_crisis: { type: "boolean" },
            severity: { 
              type: "string", 
              enum: ["severe", "high", "medium", "none"] 
            },
            reason: { type: "string" },
            confidence: { 
              type: "number",
              minimum: 0,
              maximum: 1
            }
          },
          required: ["is_crisis", "severity", "reason", "confidence"]
        }
      });
    } catch (llmError) {
      console.warn('[Enhanced Crisis Detector] LLM unavailable, returning safe fallback:', llmError.message);
      return Response.json(SAFE_FALLBACK);
    }

    // Hard enforcement: is_crisis can only be true for severe
    if (response && response.severity !== 'severe') {
      response.is_crisis = false;
    }

    if (!response) {
      return Response.json(SAFE_FALLBACK);
    }

    // Log all crisis detections — guarded against unavailable analytics in backend runtime
    if (response.is_crisis) {
      try {
        base44.analytics?.track({
          eventName: 'crisis_detected_llm',
          properties: {
            severity: response.severity,
            confidence: response.confidence,
            reason: response.reason
          }
        });
      } catch (_e) {
        // Analytics unavailable — fail safely
      }
    }

    return Response.json(response);

  } catch (error) {
    console.error('[Enhanced Crisis Detector] Error:', error.message);
    
    // Fail-safe: default to non-crisis so chat is never blocked
    return Response.json(SAFE_FALLBACK, { status: 200 });
  }
});