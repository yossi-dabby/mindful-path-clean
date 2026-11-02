import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useLayoutEffect, useRef } from 'react';
import PremiumDialog from '@/components/ui/PremiumDialog';
import { ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PremiumCoachShell({
  icon: Icon,
  title,
  step,
  stepLabel,
  onBack,
  onClose,
  backAriaLabel,
  closeAriaLabel,
  children,
  footer,
  testId
}) {
  const scrollRef = useRef(null);
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  return (
    <PremiumDialog label={title} onClose={onClose} localEscape
      className="garden-flow-shell fixed inset-0 z-[70] flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground"
      data-testid={testId}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="pointer-events-none absolute start-0 top-20 h-56 w-56 rounded-full bg-teal-300/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 end-0 h-56 w-56 rounded-full bg-violet-300/15 blur-3xl" />

      <header className="relative z-10 shrink-0 border-b border-border/70 bg-card/95 shadow-[0_10px_30px_rgba(42,103,91,0.08)] backdrop-blur-xl">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(13,148,136,0.24)]">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="botanical-title-row"><h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">{title}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
              <p className="mt-0.5 text-xs font-semibold text-primary sm:text-sm">{stepLabel}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={step > 1 ? onBack : onClose}
              className="h-12 w-12 shrink-0 rounded-2xl border border-border bg-card/95 text-primary shadow-sm hover:bg-[hsl(var(--card)/0.97)] focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={step > 1 ? backAriaLabel : closeAriaLabel}
              data-testid="coach-header-action"
            >
              {step > 1 ? <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" /> : <X className="h-5 w-5" aria-hidden="true" />}
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2" aria-hidden="true">
            {[1, 2, 3, 4].map((item) => (
              <span
                key={item}
                className={`h-1.5 flex-1 rounded-full transition-colors ${item <= step ? 'bg-primary' : 'bg-teal-900/10'}`}
              />
            ))}
          </div>
        </div>
      </header>

      <main ref={scrollRef} data-testid="coach-step-scroll" className="relative z-[1] min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-8 sm:px-6 sm:py-7">
          <section className="rounded-[28px] border border-border/70 bg-card/95 p-4 shadow-[0_24px_60px_rgba(42,103,91,0.13)] backdrop-blur-xl sm:p-7">
            {children}
          </section>
        </div>
      </main>

      <footer className="relative z-10 shrink-0 border-t border-border/70 bg-card/95 shadow-[0_-10px_30px_rgba(42,103,91,0.08)] backdrop-blur-xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">{footer}</div>
      </footer>
    </PremiumDialog>
  );
}

export function PremiumStepHeading({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{subtitle}</p>
    </div>
  );
}

export const premiumInputClass = 'min-h-12 rounded-2xl border-border bg-[hsl(var(--card)/0.97)] text-foreground shadow-sm outline-none placeholder:text-slate-400 focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring';
