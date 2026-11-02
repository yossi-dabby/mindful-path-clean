import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function WorryTime({ onClose }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedNow, setSelectedNow] = useState(null);

  const worryTimeItems = t('mind_games.content.worry_time.items', { returnObjects: true });
  const currentItem = worryTimeItems[currentIndex];

  const handleNowChoice = (choice) => {
    setSelectedNow(choice);
  };

  const handleNext = () => {
    const randomIndex = Math.floor(Math.random() * worryTimeItems.length);
    setCurrentIndex(randomIndex);
    setSelectedNow(null);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <p className="text-xs font-medium mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.worry_time.current_worry')}
        </p>
        <p className="text-sm font-semibold mb-4 break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
          {currentItem.worry}
        </p>

        <div className="p-3 mb-4" style={{
          borderRadius: '12px',
          backgroundColor: 'rgba(159, 122, 234, 0.1)',
          border: '1px solid rgba(159, 122, 234, 0.2)'
        }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#9F7AEA' }}>
            {t('mind_games.worry_time.park_it')}
          </p>
          <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
            {currentItem.park_it}
          </p>
        </div>

        <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
          {t('mind_games.worry_time.tiny_step')}
        </p>

        <div className="space-y-2">
          {currentItem.tiny_now.map((step, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal break-words min-w-0"
              style={{
                borderRadius: '12px',
                borderColor: selectedNow === step
                  ? 'rgba(34, 197, 94, 0.4)'
                  : 'rgba(38, 166, 154, 0.2)',
                backgroundColor: selectedNow === step
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'transparent'
              }}
              onClick={() => handleNowChoice(step)}
            >
              <span className="text-sm leading-snug">{step}</span>
            </Button>
          ))}
        </div>

        {selectedNow && (
          <div className="mt-4 p-3" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            <p className="text-sm font-medium break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.worry_time.success')}
            </p>
          </div>
        )}
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose} style={{ borderRadius: '12px' }}>
          {t('common.close')}
        </Button>
        {selectedNow && (
          <Button
            onClick={handleNext}
            style={{
              borderRadius: '12px',
              backgroundColor: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))'
            }}
          >
            {t('mind_games.common.try_another')}
          </Button>
        )}
      </div>
    </div>
  );
}
