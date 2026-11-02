import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PremiumIcon from '@/components/ui/PremiumIcon';

export default function MountainMeditation({ onClose }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const steps = t('mind_games.mountain_meditation.steps', { returnObjects: true });

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleFinish = () => {
    setStep(steps.length);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        {step < steps.length ? (
          <>
            <div className="mb-6 p-4" style={{
              borderRadius: '12px',
              backgroundColor: 'rgba(38, 166, 154, 0.1)',
              border: '1px solid rgba(38, 166, 154, 0.2)'
            }}>
              <p className="text-xs mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('mind_games.mountain_meditation.step_of', { current: step + 1, total: steps.length })}
              </p>
              <p className="text-base break-words whitespace-normal text-center" style={{ color: 'hsl(var(--foreground))' }}>
                {steps[step]}
              </p>
            </div>
            <Button
              onClick={step === steps.length - 1 ? handleFinish : handleNext}
              className="w-full"
              style={{
                borderRadius: '12px',
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))'
              }}
            >
              {step === steps.length - 1 ? t('common.finish') : t('common.next')}
            </Button>
          </>
        ) : (
          <div className="p-4 text-center" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            <PremiumIcon name="mountain" size="md" className="mx-auto mb-2" />
            <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.mountain_meditation.completion')}
            </p>
          </div>
        )}
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose} style={{ borderRadius: '12px' }}>
          {t('common.close')}
        </Button>
      </div>
    </div>
  );
}