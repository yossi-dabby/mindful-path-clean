import { describe, it, expect } from 'vitest';
import { applyFinalOutputGovernor } from '../../src/components/utils/finalOutputGovernor.jsx';
describe('coach response rendering', () => {
  it('preserves French outcome review without a Spanish directive fallback', () => {
    const text = "Tu as rapporté que le démarrage était difficile, mais ensuite plus facile. Cela peut suggérer que commencer était le plus difficile lors de cet essai.";
    expect(applyFinalOutputGovernor(text, { lang: 'fr', preserveCoachingResponse: true })).toBe(text);
  });
  it('does not turn discussion into a worksheet or remove its question', () => {
    const text = "That is fine; we can talk. What felt hardest about starting?";
    expect(applyFinalOutputGovernor(text, { lang: 'en', preserveCoachingResponse: true })).toBe(text);
  });
  it('still hides internal tool markup', () => {
    const output = applyFinalOutputGovernor("<tool_call>private secret</tool_call>", { lang: 'fr', preserveCoachingResponse: true });
    expect(output).not.toContain('private secret');
    expect(output).not.toContain('<tool_call>');
  });
});
