import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function HalfSmile({ onClose }) {
  const { t } = useTranslation();
  const [practiced, setPracticed] = useState(false);
  const [emotionBefore, setEmotionBefore] = useState(null);
  const [emotionAfter, setEmotionAfter] = useState(null);

  const emotions = t('mind_games.half_smile.emotions', { returnObjects: true }) || ['Tense', 'Frustrated', 'Anxious', 'Sad', 'Neutral'];

  const handlePractice = () => {
    setPracticed(true);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <p className="text-sm mb-4 break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.half_smile.description')}
        </p>

        {!emotionBefore ? (
          <>
            <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.half_smile.feel_now_prompt')}
            </p>
            <div className="flex flex-wrap gap-2">
              {emotions.map((emotion) => (
                <button
                  key={emotion}
                  onClick={() => setEmotionBefore(emotion)}
                  className="px-4 py-2 text-sm rounded-lg transition-all"
                  style={{
                    backgroundColor: 'rgba(38, 166, 154, 0.1)',
                    border: '1px solid rgba(38, 166, 154, 0.3)',
                    color: 'hsl(var(--primary))'
                  }}
                >
                  {emotion}
                </button>
              ))}
            </div>
          </>
        ) : !practiced ? (
          <>
            <div className="mb-4 p-4" style={{
              borderRadius: '12px',
              backgroundColor: 'rgba(159, 122, 234, 0.1)',
              border: '1px solid rgba(159, 122, 234, 0.2)'
            }}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
                {t('mind_games.half_smile.try_prompt')}
              </p>
              <ul className="space-y-2">
                {(t('mind_games.half_smile.instructions', { returnObjects: true }) || []).map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-sm flex-shrink-0" style={{ color: '#9F7AEA' }}>•</span>
                    <span className="text-sm break-words whitespace-normal flex-1 min-w-0" style={{ color: 'hsl(var(--foreground))' }}>
                      {step}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Button
              onClick={handlePractice}
              className="w-full"
              style={{
                borderRadius: '12px',
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))'
              }}
            >
              {t('mind_games.half_smile.practiced_btn')}
            </Button>
          </>
        ) : !emotionAfter ? (
          <>
            <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.half_smile.feel_after_prompt')}
            </p>
            <div className="flex flex-wrap gap-2">
              {emotions.map((emotion) => (
                <button
                  key={emotion}
                  onClick={() => setEmotionAfter(emotion)}
                  className="px-4 py-2 text-sm rounded-lg transition-all"
                  style={{
                    backgroundColor: 'rgba(38, 166, 154, 0.1)',
                    border: '1px solid rgba(38, 166, 154, 0.3)',
                    color: 'hsl(var(--primary))'
                  }}
                >
                  {emotion}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="p-4" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.half_smile.result', { before: emotionBefore, after: emotionAfter })}
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