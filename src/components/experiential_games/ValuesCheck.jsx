import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ValuesCheck({ onClose }) {
  const { t } = useTranslation();
  const [selectedValue, setSelectedValue] = useState(null);
  const [alignment, setAlignment] = useState(null);

  const valuesKeys = ['connection', 'growth', 'authenticity', 'courage', 'compassion', 'creativity', 'health', 'peace'];
  const values = valuesKeys.map(k => ({ key: k, label: t(`mind_games.values_check.values.${k}`) }));

  const handleValueSelect = (value) => {
    setSelectedValue(value);
  };

  const handleAlignment = (answer) => {
    setAlignment(answer);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        {!selectedValue ? (
          <>
            <p className="text-sm mb-4 break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('mind_games.values_check.prompt')}
            </p>
            <div className="flex flex-wrap gap-2">
              {values.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleValueSelect(label)}
                  className="px-4 py-2 text-sm rounded-lg transition-all"
                  style={{
                    backgroundColor: 'rgba(159, 122, 234, 0.1)',
                    border: '1px solid rgba(159, 122, 234, 0.3)',
                    color: 'hsl(var(--foreground))'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : !alignment ? (
          <>
            <p className="text-sm font-semibold mb-4 break-words" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.values_check.you_chose', { value: selectedValue, defaultValue: `You chose: ${selectedValue}` })}
            </p>
            <p className="text-sm mb-4 break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('mind_games.values_check.alignment_prompt')}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleAlignment('yes')}
                className="flex-1"
                style={{
                  borderRadius: '12px',
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))'
                }}
              >
                {t('mind_games.values_check.yes')}
              </Button>
              <Button
                onClick={() => handleAlignment('somewhat')}
                className="flex-1"
                style={{
                  borderRadius: '12px',
                  backgroundColor: 'hsl(var(--secondary))',
                  color: 'hsl(var(--secondary-foreground))'
                }}
              >
                {t('mind_games.values_check.somewhat')}
              </Button>
              <Button
                onClick={() => handleAlignment('no')}
                className="flex-1"
                style={{
                  borderRadius: '12px',
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))'
                }}
              >
                {t('mind_games.values_check.not_really')}
              </Button>
            </div>
          </>
        ) : (
          <div className="p-4" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(159, 122, 234, 0.1)',
            border: '1px solid rgba(159, 122, 234, 0.2)'
          }}>
            <p className="text-sm break-words whitespace-normal mb-3" style={{ color: 'hsl(var(--foreground))' }}>
              {alignment === 'yes' && t('mind_games.values_check.result_yes')}
              {alignment === 'somewhat' && t('mind_games.values_check.result_somewhat')}
              {alignment === 'no' && t('mind_games.values_check.result_no')}
            </p>
            <p className="text-xs break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('mind_games.values_check.tip')}
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