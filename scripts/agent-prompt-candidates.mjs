import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const COACH_REFINEMENT = `
========== TURN CONTINUITY AND RESPONSE LENGTH ==========
Use the current conversation to track the goal, agreed step, consent, and reported outcome. Do not repeat an already answered question, restart the intake, or reassign a declined or completed step. If prior context is absent, ask one focused question rather than inventing history.
For a brief check-in or acknowledgment, answer briefly. For an explanation request, provide enough explanation without forcing an exercise. For a ready action turn, give one bounded step and a short reason. Expand only when the user requests detail or safety requires it; never shorten necessary safety guidance.
When the user reports trying a step, respond to the specific result and what was learned before proposing another step. Keep earlier topics out unless the current message explicitly continues them. Never claim continuity or storage that the available context does not support.
`;

export function compactTherapistFormatting(instructions) {
  return instructions.split('\n')
    .map((line) => /^[\s═─━=-]+$/.test(line)
      ? ''
      : line.replace(/^([─═━])\1{2,}\s*(.*?)\s*[─═━]{3,}\s*$/, '### $2'))
    .join('\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

// Preserve every semantic character, in order. Only heading ornaments and
// whitespace may change in this first compaction wave.
export function semanticProjection(instructions) {
  return instructions.split('\n')
    .map((line) => /^[\s═─━=-]+$/.test(line)
      ? ''
      : line.replace(/^([─═━])\1{2,}\s*(.*?)\s*[─═━]{3,}\s*$/, '$2')
        .replace(/^### /, ''))
    .join('\n').replace(/\s+/g, '');
}

export function buildAgentPromptCandidates(configs) {
  const therapist = configs.cbt_therapist;
  const coach = configs.ai_coach;
  if (!therapist || !coach) throw new Error('Both approved production agents are required');
  const compacted = compactTherapistFormatting(therapist.instructions);
  if (semanticProjection(compacted) !== semanticProjection(therapist.instructions)) {
    throw new Error('Compaction changed semantic content');
  }
  return {
    ai_coach: { ...structuredClone(coach), instructions: coach.instructions + COACH_REFINEMENT },
    cbt_therapist: { ...structuredClone(therapist), instructions: compacted },
  };
}

export function candidateMeasurements(configs, candidates) {
  const hash = (text) => crypto.createHash('sha256').update(text).digest('hex');
  return Object.fromEntries(Object.keys(candidates).map((name) => [name, {
    baselineSha256: hash(configs[name].instructions),
    candidateSha256: hash(candidates[name].instructions),
    baselineCharacters: configs[name].instructions.length,
    candidateCharacters: candidates[name].instructions.length,
    savedCharacters: configs[name].instructions.length - candidates[name].instructions.length,
    productionChanged: false,
    humanReview: 'pending',
    liveComparison: 'pending',
  }]));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Deliberately emits metadata only. Deployment and replacement of production
  // configs are separate operations; this script cannot create active agents.
  const configs = Object.fromEntries(['ai_coach', 'cbt_therapist'].map((name) => [
    name, JSON.parse(fs.readFileSync(path.join('base44', 'agents', name + '.jsonc'), 'utf8')),
  ]));
  console.log(JSON.stringify(candidateMeasurements(configs, buildAgentPromptCandidates(configs)), null, 2));
}
