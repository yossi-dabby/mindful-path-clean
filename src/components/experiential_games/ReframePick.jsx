import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ReframePick({ onClose }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const reframePickItems = t('mind_games.content.reframe_pick.items', { returnObjects: true });
  const currentItem = reframePickItems?.[currentIndex];
  
  if (!currentItem || !reframePickItems) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  const handleChoice = (index) => {
    setSelectedChoice(index);
    setShowResult(true);
  };

  const handleNext = () => {
    const randomIndex = Math.floor(Math.random() * reframePickItems.length);
    setCurrentIndex(randomIndex);
    setSelectedChoice(null);
    setShowResult(false);
  };

  // Determine best index - it's always the first choice (index 0) based on the pattern
  const bestIndex = 0;

  return (
    <div className="space-y-4">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <div className="mb-4 w-full min-w-0">
          <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('mind_games.reframe_pick.situation')}
          </p>
          <p className="text-sm mb-3 break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
            {currentItem.situation}
          </p>
          <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('mind_games.reframe_pick.automatic_thought')}
          </p>
          <p className="text-sm italic break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
            "{currentItem.automatic_thought}"
          </p>
        </div>

        <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
          {t('mind_games.reframe_pick.choose')}
        </p>

        <div className="space-y-2">
          {currentItem.choices?.map((choice, index) => {
            const isSelected = selectedChoice === index;
            const isBest = index === bestIndex;

            return (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal break-words min-w-0"
                style={{
                  borderRadius: '12px',
                  borderColor: showResult
                    ? isBest
                      ? 'rgba(34, 197, 94, 0.4)'
                      : isSelected
                      ? 'rgba(239, 68, 68, 0.4)'
                      : 'rgba(38, 166, 154, 0.2)'
                    : 'rgba(38, 166, 154, 0.2)',
                  backgroundColor: showResult
                    ? isBest
                      ? 'rgba(34, 197, 94, 0.1)'
                      : isSelected
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'transparent'
                    : 'transparent'
                }}
                onClick={() => !showResult && handleChoice(index)}
                disabled={showResult}
              >
                <div className="flex items-start gap-2 w-full min-w-0">
                  <span className="flex-1 break-words whitespace-normal leading-snug text-sm">{choice}</span>
                  {showResult && isBest && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />}
                  {showResult && isSelected && !isBest && <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
                </div>
              </Button>
            );
          })}
        </div>

        {showResult && (
          <div className="mt-4 p-4" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(38, 166, 154, 0.1)',
            border: '1px solid rgba(38, 166, 154, 0.2)'
          }}>
            <p className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>
              <strong>{t('mind_games.reframe_pick.why_label')}</strong> {currentItem.why}
            </p>
          </div>
        )}
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose} style={{ borderRadius: '12px' }}>
          {t('common.close')}
        </Button>
        {showResult && (
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
