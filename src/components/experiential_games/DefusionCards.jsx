import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { triggerHaptic } from '../utils/hapticFeedback';

export default function DefusionCards({ onClose }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLine, setSelectedLine] = useState(null);

  const defusionCards = t('mind_games.content.defusion_cards.cards', { returnObjects: true }) || [];
  const currentCard = defusionCards[currentIndex];
  const defuseLines = currentCard?.defuse_lines ?? currentCard?.defuseLines;

  const handleSelectLine = (line) => {
    triggerHaptic('light');
    setSelectedLine(line);
  };

  const handleNext = () => {
    triggerHaptic('medium');
    const randomIndex = Math.floor(Math.random() * defusionCards.length);
    setCurrentIndex(randomIndex);
    setSelectedLine(null);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <p className="text-xs font-medium mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.defusion_cards.sticky_thought')}
        </p>
        <p className="text-sm font-semibold mb-4 break-words whitespace-normal italic" style={{ color: 'hsl(var(--foreground))' }}>
          "{currentCard?.thought}"
        </p>

        <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
          {t('mind_games.defusion_cards.prompt')}
        </p>

        <div className="space-y-2">
          {defuseLines?.map((line, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal break-words min-w-0 active:scale-95 active:opacity-80 transition-all"
              style={{
                borderRadius: '12px',
                borderColor: selectedLine === line
                  ? 'rgba(159, 122, 234, 0.4)'
                  : 'rgba(38, 166, 154, 0.2)',
                backgroundColor: selectedLine === line
                  ? 'rgba(159, 122, 234, 0.1)'
                  : 'transparent'
              }}
              onClick={() => handleSelectLine(line)}
            >
              <span className="text-sm leading-snug">{line}</span>
            </Button>
          ))}
        </div>

        {selectedLine && (
          <div className="mt-4 p-3" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(159, 122, 234, 0.1)',
            border: '1px solid rgba(159, 122, 234, 0.2)'
          }}>
            <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.defusion_cards.success')}
            </p>
          </div>
        )}
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose} style={{ borderRadius: '12px' }}>
          {t('common.close')}
        </Button>
        {selectedLine && (
          <Button
            onClick={handleNext}
            style={{
              borderRadius: '12px',
              backgroundColor: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))'
            }}
          >
            {t('mind_games.defusion_cards.next_card')}
          </Button>
        )}
      </div>
    </div>
  );
}