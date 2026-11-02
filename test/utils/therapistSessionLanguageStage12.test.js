import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Stage 12 — /Chat session language lock for therapist opener/runtime directives', () => {
  const chatSrc = readFileSync(resolve('src/pages/Chat.jsx'), 'utf8');

  it('uses the locked session language for all addLangDirective session-start call sites', () => {
    const lockedCalls = (chatSrc.match(/addLangDirective\(\s*sessionStartContent,\s*sessionLanguageRef\.current\s*\)/g) || []).length;
    expect(lockedCalls).toBeGreaterThanOrEqual(4);
  });

  it('does not use live i18n.language in addLangDirective session-start call sites', () => {
    const liveLocaleCalls = (chatSrc.match(/addLangDirective\(\s*sessionStartContent,\s*i18n\.language\s*\)/g) || []).length;
    expect(liveLocaleCalls).toBe(0);
  });
});
