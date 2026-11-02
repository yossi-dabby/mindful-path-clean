import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export default function OppositeAction({ onClose }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);

  const oppositeActionItems = t('mind_games.content.opposite_action.items', { returnObjects: true }) || [];
  const currentItem = oppositeActionItems[currentIndex];

  const handleChoice = (choice) => {
    setSelectedChoice(choice);
  };

  const handleNext = () => {
    const randomIndex = Math.floor(Math.random() * oppositeActionItems.length);
    setCurrentIndex(randomIndex);
    setSelectedChoice(null);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <div className="space-y-3 mb-4">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('mind_games.opposite_action.emotion_label')}
            </p>
            <p className="text-sm font-semibold break-words" style={{ color: 'hsl(var(--foreground))' }}>
              {currentItem?.emotion}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('mind_games.opposite_action.urge_label')}
            </p>
            <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
              {currentItem?.urge}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('mind_games.opposite_action.opposite_label')}
            </p>
            <p className="text-sm font-semibold break-words" style={{ color: 'hsl(var(--primary))' }}>
              {currentItem?.opposite}
            </p>
          </div>
        </div>

        <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
          {t('mind_games.opposite_action.pick_step')}
        </p>

        <div className="space-y-2">
          {currentItem?.choices?.map((choice, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal break-words min-w-0"
              style={{
                borderRadius: '12px',
                borderColor: selectedChoice === choice
                  ? 'rgba(34, 197, 94, 0.4)'
                  : 'rgba(38, 166, 154, 0.2)',
                backgroundColor: selectedChoice === choice
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'transparent'
              }}
              onClick={() => handleChoice(choice)}
            >
              <span className="text-sm leading-snug">{choice}</span>
            </Button>
          ))}
        </div>

        {selectedChoice && (
          <div className="mt-4 p-3" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(38, 166, 154, 0.1)',
            border: '1px solid rgba(38, 166, 154, 0.2)'
          }}>
            <p className="text-xs break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
              <strong>{t('mind_games.opposite_action.note_label')} </strong>{currentItem?.note}
            </p>
          </div>
        )}
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose} style={{ borderRadius: '12px' }}>
          {t('common.close')}
        </Button>
        {selectedChoice && (
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
