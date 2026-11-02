import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { triggerHaptic } from '../utils/hapticFeedback';

export default function DBTSTOP({ onClose }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedNext, setSelectedNext] = useState(null);

  const dbtStopPrompts = t('mind_games.content.dbt_stop.prompts', { returnObjects: true });
  const currentPrompt = dbtStopPrompts?.[currentIndex];

  if (!currentPrompt || !dbtStopPrompts) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  const handleNextStep = (step) => {
    triggerHaptic('light');
    setSelectedNext(step);
  };

  const handleTryAnother = () => {
    triggerHaptic('medium');
    const randomIndex = Math.floor(Math.random() * dbtStopPrompts.length);
    setCurrentIndex(randomIndex);
    setSelectedNext(null);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <p className="text-xs font-medium mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.dbt_stop.trigger')}
        </p>
        <p className="text-sm mb-4 break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
          {currentPrompt.trigger}
        </p>

        <div className="space-y-3 mb-4">
          {currentPrompt.steps?.map((step, index) => (
            <div key={index} className="flex gap-3">
              <div 
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center font-bold text-white"
                style={{
                  borderRadius: '10px',
                  backgroundColor: 'hsl(var(--primary))'
                }}
              >
                {step.key}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-1 break-words" style={{ color: 'hsl(var(--foreground))' }}>
                  {step.label}
                </p>
                <p className="text-xs break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {step.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
          {t('mind_games.dbt_stop.next_step')}
        </p>

        <div className="space-y-2">
          {currentPrompt.next_steps?.map((step, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal break-words min-w-0 active:scale-95 active:opacity-80 transition-all"
              style={{
                borderRadius: '12px',
                borderColor: selectedNext === step
                  ? 'rgba(34, 197, 94, 0.4)'
                  : 'rgba(38, 166, 154, 0.2)',
                backgroundColor: selectedNext === step
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'transparent'
              }}
              onClick={() => handleNextStep(step)}
            >
              <span className="text-sm leading-snug">{step}</span>
            </Button>
          ))}
        </div>

        {selectedNext && (
          <div className="mt-4 p-3" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.dbt_stop.chosen', { step: selectedNext })}
            </p>
          </div>
        )}
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose} style={{ borderRadius: '12px' }}>
          {t('common.close')}
        </Button>
        {selectedNext && (
          <Button
            onClick={handleTryAnother}
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