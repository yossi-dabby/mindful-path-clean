import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(path, 'utf8');

describe('Premium brand and icon refresh contract', () => {
  const brand = read('src/components/brand/AppBrand.jsx');
  const sidebar = read('src/components/layout/Sidebar.jsx');
  const mobileHeader = read('src/components/layout/MobileHeader.jsx');
  const quickActions = read('src/components/home/QuickActions.jsx');
  const home = read('src/pages/Home.jsx');
  const layout = read('src/Layout.jsx');
  const checkIn = read('src/components/home/StandaloneDailyCheckIn.jsx');
  const moodIcon = read('src/components/ui/PremiumMoodIcon.jsx');
  const premiumIcon = read('src/components/ui/PremiumIcon.jsx');
  const chat = read('src/pages/Chat.jsx');

  it('uses the premium wordmark and growing shield across desktop and mobile shells', () => {
    expect(brand).toContain('export function GrowingShieldMark');
    expect(brand).toContain('export function AppWordmark');
    expect(sidebar).toContain('<GrowingShieldMark size={42} />');
    expect(sidebar).toContain("<AppWordmark name={t('global.app_name')}");
    expect(mobileHeader).toContain('<GrowingShieldMark size={36} />');
    expect(mobileHeader).toContain('<AppWordmark');
    expect(mobileHeader).toContain('overflow-visible text-center');
    expect(brand).toContain('flex-col pb-1.5');
    expect(brand).toContain('absolute bottom-0 start-[6%]');
  });

  it('uses one play symbol and premium tile style for home explanation videos', () => {
    expect(quickActions).toContain('CirclePlay');
    expect(quickActions).not.toContain('<User');
    expect(home.match(/<CirclePlay className="h-6 w-6" strokeWidth=\{2\.2\} \/>/g)).toHaveLength(2);
    expect(home.match(/rounded-2xl border border-border bg-\[hsl\(var\(--card\)\/0\.97\)\]/g)).toHaveLength(2);
    expect(home).not.toContain('<Sparkles className="w-4 h-4 text-accent"');
  });

  it('does not mount the draggable AI companion in the global layout', () => {
    expect(layout).not.toContain("import DraggableAiCompanion");
    expect(layout).not.toContain('<DraggableAiCompanion');
  });

  it('keeps all five daily mood choices aligned and premium', () => {
    expect(checkIn).toContain('items-stretch');
    expect(checkIn).toContain('h-full min-w-0');
    expect(checkIn).toContain('flex min-h-10 items-start justify-center');
    expect(checkIn).toContain('<PremiumMoodIcon');
    expect(moodIcon).toContain("very_low");
  });

  it('provides a keyboard-accessible desktop session collapse control', () => {
    expect(chat).toContain('setDesktopSidebarCollapsed((collapsed) => !collapsed)');
    expect(chat).toContain('aria-expanded={!desktopSidebarCollapsed}');
    expect(chat).toContain('PanelLeftClose');
    expect(chat).toContain('PanelLeftOpen');
  });

  it('defines the shared mint premium icon system', () => {
    expect(premiumIcon).toContain('bg-teal-50/90');
    expect(premiumIcon).toContain('rounded-[26%]');
    expect(premiumIcon).toContain('strokeWidth={2.2}');
  });
});
