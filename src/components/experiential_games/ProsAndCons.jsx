import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ProsAndCons({ onClose }) {
  const { t } = useTranslation();
  const [decision, setDecision] = useState('');
  const [step, setStep] = useState('input');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');

  const handleStart = () => {
    if (decision.trim()) setStep('pros');
  };

  const handleNext = () => {
    if (step === 'pros' && pros.trim()) setStep('cons');
    else if (step === 'cons' && cons.trim()) setStep('result');
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <p className="text-sm mb-4 break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.pros_and_cons.description')}
        </p>

        {step === 'input' && (
          <>
            <p className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.pros_and_cons.decision_prompt')}
            </p>
            <input
              type="text"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder={t('mind_games.pros_and_cons.decision_placeholder')}
              className="w-full p-3 mb-4 text-sm"
              style={{
                borderRadius: '12px',
                border: '1px solid rgba(38, 166, 154, 0.3)',
                outline: 'none'
              }}
            />
            <Button
              onClick={handleStart}
              disabled={!decision.trim()}
              className="w-full"
              style={{
                borderRadius: '12px',
                backgroundColor: decision.trim() ? 'hsl(var(--primary))' : '#ccc',
                color: 'hsl(var(--primary-foreground))'
              }}
            >
              {t('mind_games.pros_and_cons.start_btn')}
            </Button>
          </>
        )}

        {step === 'pros' && (
          <>
            <p className="text-sm font-semibold mb-2 break-words" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.pros_and_cons.pros_label')}
            </p>
            <textarea
              value={pros}
              onChange={(e) => setPros(e.target.value)}
              placeholder={t('mind_games.pros_and_cons.pros_placeholder')}
              rows={3}
              className="w-full p-3 mb-4 text-sm"
              style={{
                borderRadius: '12px',
                border: '1px solid rgba(38, 166, 154, 0.3)',
                outline: 'none',
                resize: 'none'
              }}
            />
            <Button
              onClick={handleNext}
              disabled={!pros.trim()}
              className="w-full"
              style={{
                borderRadius: '12px',
                backgroundColor: pros.trim() ? 'hsl(var(--primary))' : '#ccc',
                color: 'hsl(var(--primary-foreground))'
              }}
            >
              {t('mind_games.pros_and_cons.next_cons_btn')}
            </Button>
          </>
        )}

        {step === 'cons' && (
          <>
            <p className="text-sm font-semibold mb-2 break-words" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.pros_and_cons.cons_label')}
            </p>
            <textarea
              value={cons}
              onChange={(e) => setCons(e.target.value)}
              placeholder={t('mind_games.pros_and_cons.cons_placeholder')}
              rows={3}
              className="w-full p-3 mb-4 text-sm"
              style={{
                borderRadius: '12px',
                border: '1px solid rgba(38, 166, 154, 0.3)',
                outline: 'none',
                resize: 'none'
              }}
            />
            <Button
              onClick={handleNext}
              disabled={!cons.trim()}
              className="w-full"
              style={{
                borderRadius: '12px',
                backgroundColor: cons.trim() ? 'hsl(var(--primary))' : '#ccc',
                color: 'hsl(var(--primary-foreground))'
              }}
            >
              {t('mind_games.pros_and_cons.see_result_btn')}
            </Button>
          </>
        )}

        {step === 'result' && (
          <div className="space-y-3">
            <div className="p-3" style={{
              borderRadius: '12px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)'
            }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#22C55E' }}>
                {t('mind_games.pros_and_cons.pros_result_label')}
              </p>
              <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
                {pros}
              </p>
            </div>
            <div className="p-3" style={{
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#EF4444' }}>
                {t('mind_games.pros_and_cons.cons_result_label')}
              </p>
              <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
                {cons}
              </p>
            </div>
            <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('mind_games.pros_and_cons.conclusion')}
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