import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Expansion({ onClose }) {
  const { t } = useTranslation();
  const [emotion, setEmotion] = useState('');
  const [step, setStep] = useState(0);

  const steps = t('mind_games.expansion.steps', { returnObjects: true });

  const handleStart = () => {
    if (emotion.trim()) setStep(1);
  };

  const handleNext = () => {
    if (step <= steps.length) setStep(step + 1);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <p className="text-sm mb-4 break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.expansion.description')}
        </p>

        {step === 0 ? (
          <>
            <p className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.expansion.emotion_prompt')}
            </p>
            <input
              type="text"
              aria-label={t('mind_games.expansion.emotion_prompt')}
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              placeholder={t('mind_games.expansion.emotion_placeholder')}
              className="w-full p-3 mb-4 text-sm"
              style={{
                borderRadius: '12px',
                border: '1px solid rgba(38, 166, 154, 0.3)',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = 'hsl(var(--primary))'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(38, 166, 154, 0.3)'}
            />
            <Button
              onClick={handleStart}
              disabled={!emotion.trim()}
              className="w-full"
              style={{
                borderRadius: '12px',
                backgroundColor: emotion.trim() ? 'hsl(var(--primary))' : '#ccc',
                color: 'hsl(var(--primary-foreground))'
              }}
            >
              {t('mind_games.expansion.begin_btn')}
            </Button>
          </>
        ) : step <= steps.length ? (
          <>
            <div className="mb-4 p-4" style={{
              borderRadius: '12px',
              backgroundColor: 'rgba(159, 122, 234, 0.1)',
              border: '1px solid rgba(159, 122, 234, 0.2)'
            }}>
              <p className="text-xs mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('tools_stage5.step', { step, total: steps.length })}
              </p>
              <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
                {steps[step - 1]}
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
              {step < steps.length ? t('common.next') : t('common.finish')}
            </Button>
          </>
        ) : (
          <div role="status" data-testid="expansion-complete" className="p-4 space-y-4" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.expansion.completion', { emotion })}
            </p>
            <Button variant="outline" onClick={() => { setEmotion(''); setStep(0); }}>{t('mind_games.common.try_another')}</Button>
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