import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FormsNavigationControls({
  canGoBack = false,
  canGoForward = false,
  onBack,
  onForward,
  isRtl = false,
  lang = 'en',
}) {
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const ForwardIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" dir={isRtl ? 'rtl' : 'ltr'} data-testid="forms-navigation-controls">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!canGoBack}
        onClick={onBack}
        className="border-border text-primary hover:bg-secondary/70 disabled:text-muted-foreground"
        data-testid="forms-nav-back"
      >
        <BackIcon className="w-4 h-4" />
        {lang === 'he' ? 'חזרה' : 'Back'}
      </Button>

      {canGoForward ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onForward}
          className="border-border text-primary hover:bg-secondary/70"
          data-testid="forms-nav-forward"
        >
          {lang === 'he' ? 'הבא' : 'Next'}
          <ForwardIcon className="w-4 h-4" />
        </Button>
      ) : null}
    </div>
  );
}
