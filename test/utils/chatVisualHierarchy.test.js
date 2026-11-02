import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Chat visual hierarchy contract', () => {
  const chat = readFileSync('src/pages/Chat.jsx', 'utf8');
  const bubble = readFileSync('src/components/chat/MessageBubble.jsx', 'utf8');
  const proactive = readFileSync('src/components/chat/ProactiveCheckIn.jsx', 'utf8');

  it('keeps the in-chat heading compact while the mobile shell title is visible', () => {
    expect(chat).toContain('hidden md:flex flex-1 min-w-0 items-center gap-3');
    expect(chat).toContain('bg-[hsl(var(--card)/0.97)]');
  });

  it('keeps the complete welcome at the top of the empty page across screen sizes', () => {
    expect(chat).toContain('mx-auto mb-1.5 sm:mb-4 rounded-xl sm:rounded-2xl w-9 h-9 sm:w-14 sm:h-14');
    expect(chat).toContain('p-1.5 flex items-start justify-center sm:p-4 lg:p-6');
    expect(chat).toContain('w-full sm:w-auto');
    expect(chat).not.toContain('mr-20 ml-24');
  });

  it('visually distinguishes user and assistant messages', () => {
    expect(bubble).toContain("isUser ? 'justify-end' : 'justify-start'");
    expect(bubble).toContain("'bg-primary text-primary-foreground rounded-ee-md'");
    expect(bubble).toContain('[overflow-wrap:anywhere] !text-primary-foreground');
    expect(bubble).toContain("'bg-[hsl(var(--card)/0.97)] text-foreground border border-border rounded-es-md backdrop-blur-sm'");
    expect(bubble).toContain('Sparkles');
    expect(bubble).toContain('UserRound');
  });

  it('uses calm, readable suggestion cards instead of purple-heavy chrome', () => {
    expect(proactive).toContain('bg-[hsl(var(--card)/0.97)]');
    expect(proactive).toContain('text-muted-foreground leading-relaxed');
    expect(proactive).toContain('text-primary font-semibold');
  });
});
