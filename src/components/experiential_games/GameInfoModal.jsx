import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Lightbulb, Play, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatMindGameDuration, getMindGameMetadata } from './mindGameMetadata';

export default function GameInfoModal({ game, onClose, onPlay, returnFocusTo, transitioning }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!game) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [game, onClose]);

  if (!game) return null;

  const helpKey = `mind_games.help.${game.id}`;
  const purpose = t(`${helpKey}.purpose`, { defaultValue: '' });
  const howToPlay = t(`${helpKey}.how_to_play`, { defaultValue: '' });
  const benefits = t(`${helpKey}.benefits`, { defaultValue: '', returnObjects: true });
  const benefitsArray = Array.isArray(benefits) ? benefits : [];
  const technique = t(`${helpKey}.technique`, { defaultValue: '' });
  const title = game.titleKey ? t(game.titleKey) : game.title;
  const duration = formatMindGameDuration(game.time, t);
  const category = t(`mind_games.premium.categories.${getMindGameMetadata(game.id).group}`);

  return (
    <Dialog open={!!game} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          if (!returnFocusTo) return;
          event.preventDefault();
          if (!transitioning?.current && returnFocusTo.current?.isConnected) returnFocusTo.current.focus({ preventScroll: true });
        }}
        closeLabel={t('mind_games.close_aria')}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          onClose();
        }}
        className="max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-t-[28px] border-border/70 bg-card p-0 sm:max-w-lg sm:rounded-[28px]"
        data-testid="mindgame-info-dialog"
      >
        <DialogHeader className="border-b border-border/70 bg-secondary/35 p-6 pe-16 text-start">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-foreground">
            {technique || category}
          </p>
          <DialogTitle className="break-words text-xl font-bold text-foreground">{title}</DialogTitle>
          <DialogDescription className="flex items-center gap-1 text-xs text-foreground">
            <Clock className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
            <span dir="ltr">{duration}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 p-6">
              {/* Purpose */}
              {purpose && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--primary))' }} />
                    <span className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {t('mind_games.help.purpose_label', 'What is it for?')}
                    </span>
                  </div>
                  <p className="ps-6 text-sm leading-relaxed text-foreground">
                    {purpose}
                  </p>
                </div>
              )}

              {/* How to play */}
              {howToPlay && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Play className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--primary))' }} />
                    <span className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {t('mind_games.help.how_to_play_label', 'How to play')}
                    </span>
                  </div>
                  <p className="ps-6 text-sm leading-relaxed text-foreground">
                    {howToPlay}
                  </p>
                </div>
              )}

              {/* Benefits */}
              {benefitsArray.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--primary))' }} />
                    <span className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                      {t('mind_games.help.benefits_label', 'Benefits')}
                    </span>
                  </div>
                  <ul className="space-y-1.5 ps-6">
                    {benefitsArray.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'hsl(var(--primary))' }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
        </div>

        <div className="px-6 pb-6 pt-2">
              <Button
                data-testid="mindgame-info-play"
                onClick={onPlay}
                className="h-12 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
                style={{
                  color: 'hsl(var(--primary-foreground))',
                  border: 'none',
                }}
              >
                {t('mind_games.help.play_button', 'Start Game')}
              </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
