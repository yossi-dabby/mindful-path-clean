import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Chat responsive layout contract', () => {
  const chat = readFileSync('src/pages/Chat.jsx', 'utf8');
  const layout = readFileSync('src/Layout.jsx', 'utf8');
  const appContent = readFileSync('src/components/layout/AppContent.jsx', 'utf8');
  const sidebar = readFileSync('src/components/layout/Sidebar.jsx', 'utf8');
  const mobileHeader = readFileSync('src/components/layout/MobileHeader.jsx', 'utf8');
  const bottomNav = readFileSync('src/components/layout/BottomNav.jsx', 'utf8');
  const conversations = readFileSync('src/components/chat/ConversationsList.jsx', 'utf8');

  it('uses the desktop shell for tablet and desktop widths', () => {
    expect(appContent).toContain('const desktopBreakpoint = 768');
    expect(sidebar).toContain("const visibilityClass = 'hidden md:flex'");
    expect(mobileHeader).toContain("const visibilityClass = 'md:hidden'");
    expect(bottomNav).toContain("const visibilityClass = 'md:hidden'");
    expect(chat).toContain('@media (min-width: 768px)');
    expect(sidebar).toContain('SIDEBAR_WIDTH = 288');
    expect(sidebar).not.toContain('CHAT_SIDEBAR_WIDTH');
    expect(appContent).toContain('const sidebarWidth = SIDEBAR_WIDTH');
  });

  it('uses the conversation list as a drawer and allows it to collapse on extra-wide desktop', () => {
    const drawer = readFileSync(new URL('../../src/components/chat/ChatConversationsSidebar.jsx', import.meta.url), 'utf8');
    expect(chat).toContain('<ChatConversationsSidebar');
    expect(drawer).toContain("window.matchMedia('(min-width: 1280px)')");
    expect(drawer).toContain('<Sheet open={open}');
    expect(drawer).toContain('if (desktop) return desktopCollapsed ? null');
    expect(drawer).toContain('onCloseAutoFocus');
    expect(chat).toContain('setDesktopSidebarCollapsed((collapsed) => !collapsed)');
    expect(chat).toContain('aria-expanded={!desktopSidebarCollapsed}');
    expect(conversations).toContain('className="xl:hidden flex-shrink-0"');
  });

  it('prevents the chat and composer columns from overflowing', () => {
    expect(chat).toContain('flex flex-col min-h-0 min-w-0');
    expect(chat).toContain('max-w-5xl flex min-w-0');
    expect(chat).toContain('flex flex-col flex-1 gap-1 min-w-0');
    expect(chat).toContain('data-testid="chat-composer-row"');
    expect(chat).toContain('flex min-w-0 items-end gap-2');
  });

  it('keeps all three intent choices visible in a responsive grid', () => {
    expect(chat).toContain('data-testid="chat-intent-options"');
    expect(chat).toContain('grid min-w-0 grid-cols-3 gap-2');
    expect(chat).toContain('min-w-0 whitespace-normal rounded-xl');
  });

  it('keeps support inline with the recording actions instead of floating over chat', () => {
    expect(chat).toContain('data-testid="chat-actions-row"');
    expect(chat).toContain('data-testid="chat-human-support"');
    expect(chat).toContain('ms-auto inline-flex min-h-11 max-w-full');
    expect(chat).toContain('data-testid="chat-disclaimer"');
    expect(layout).toContain("currentPageName !== 'Chat'");
  });

  it('uses measured mobile bottom clearance with the standard safe-area fallback', () => {
    expect(appContent).toContain('paddingBottom: `var(--mobile-bottom-nav-height, calc(${BOTTOM_NAV_HEIGHT}px');
    expect(appContent).not.toContain('BOTTOM_NAV_HEIGHT + 72');
  });

  it('keeps the empty welcome in page flow and the conversation in its message scroller', () => {
    expect(chat).toContain('data-testid="chat-empty-state-scroll"');
    expect(chat).toContain('data-chat-empty={!currentConversationId}');
    expect(chat).toContain('[data-chat-empty="true"] .garden-chat-content { flex: 0 0 auto; overflow: visible; }');
    expect(chat).toContain('className="min-h-0 shrink-0 pb-3 sm:pb-4"');
    expect(chat).toContain("zIndex: currentConversationId ? 50 : 20");
    expect(chat).toContain('p-1.5 flex items-start justify-center sm:p-4 lg:p-6');
    expect(chat).toContain('data-testid="chat-empty-welcome-shell"');
    expect(chat).toContain('p-2 sm:p-6 text-center');
    expect(chat).toContain('data-testid="chat-welcome-title"');
    expect(chat).toContain('data-testid="chat-welcome-copy"');
  });

  it('keeps the sidebar brand and notification bell from competing for width', () => {
    expect(sidebar).toContain('width: `${SIDEBAR_WIDTH}px`');
    expect(sidebar).toContain('<div className="shrink-0">');
  });
});
