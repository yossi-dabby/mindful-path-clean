import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function WillingHands({ onClose }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [practiced, setPracticed] = useState(false);

  const steps = t('mind_games.willing_hands.steps', { returnObjects: true });

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setPracticed(true);
    }
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <p className="text-sm mb-4 break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.willing_hands.description')}
        </p>

        {!practiced ? (
          <>
            <div className="mb-4 p-4" style={{
              borderRadius: '12px',
              backgroundColor: 'rgba(38, 166, 154, 0.1)',
              border: '1px solid rgba(38, 166, 154, 0.2)'
            }}>
              <p className="text-xs mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('mind_games.mountain_meditation.step_of', { current: step + 1, total: steps.length })}
              </p>
              <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
                {steps[step]}
              </p>
            </div>

            <Button
              onClick={handleNext}
              className="w-full"
              style={{
                borderRadius: '12px',
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))'
              }}
            >
              {step < steps.length - 1 ? t('common.next') : t('common.finish')}
            </Button>
          </>
        ) : (
          <div className="p-4" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            <p className="text-sm break-words whitespace-normal mb-4" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.willing_hands.completion')}
            </p>
            <Button
              onClick={onClose}
              className="w-full"
              style={{ borderRadius: '12px', backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
            >
              {t('common.close')}
            </Button>
          </div>
        )}
      </Card>

      {!practiced && (
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} style={{ borderRadius: '12px' }}>
            {t('common.close')}
          </Button>
        </div>
      )}
    </div>
  );
}