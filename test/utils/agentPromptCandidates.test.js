import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  buildAgentPromptCandidates, compactTherapistFormatting, semanticProjection,
} from '../../scripts/agent-prompt-candidates.mjs';

const configs = Object.fromEntries(['ai_coach', 'cbt_therapist'].map((name) => [
  name, JSON.parse(fs.readFileSync(new URL('../../base44/agents/' + name + '.jsonc', import.meta.url), 'utf8')),
]));

describe('isolated agent prompt candidates', () => {
  it('preserves every non-formatting instruction character and its order', () => {
    const candidate = buildAgentPromptCandidates(configs).cbt_therapist;
    expect(semanticProjection(candidate.instructions)).toBe(semanticProjection(configs.cbt_therapist.instructions));
    expect(candidate.instructions.length).toBeLessThan(configs.cbt_therapist.instructions.length);
    expect(compactTherapistFormatting(candidate.instructions)).toBe(candidate.instructions);
  });

  it('retains all non-prompt agent configuration without mutating production inputs', () => {
    const before = structuredClone(configs);
    const candidates = buildAgentPromptCandidates(configs);
    for (const name of Object.keys(configs)) {
      const { instructions: _before, ...baseline } = configs[name];
      const { instructions: _after, ...candidate } = candidates[name];
      expect(candidate).toEqual(baseline);
      expect(candidate.model).toBe('automatic');
      for (const tool of candidate.tool_configs) {
        if (tool.entity_name) expect(tool.allowed_operations).toEqual(['read']);
      }
    }
    expect(configs).toEqual(before);
  });

  it('keeps all safety, privacy and consent rules in the coach baseline prefix', () => {
    const candidate = buildAgentPromptCandidates(configs).ai_coach;
    expect(candidate.instructions.startsWith(configs.ai_coach.instructions)).toBe(true);
    expect(candidate.instructions).toContain('never shorten necessary safety guidance');
  });

  it('does not erase punctuation, lists, code-like examples, or clinical text', () => {
    const source = '─── SAFETY ─────────\n\n\n1. Stop: immediate danger.\n- Read-only.\nA→B; [GENERAL]\n==========\n';
    const compacted = compactTherapistFormatting(source);
    expect(compacted).toContain('### SAFETY');
    expect(compacted).toContain('1. Stop: immediate danger.');
    expect(compacted).toContain('- Read-only.');
    expect(compacted).toContain('A→B; [GENERAL]');
    expect(semanticProjection(compacted)).toBe(semanticProjection(source));
  });
});
