import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { useAdaptiveDifficulty } from './useAdaptiveDifficulty';
import { useMindGameTracking } from './useMindGameTracking';

export default function UrgeSurfing({ onClose }) {
  const { t } = useTranslation();
  const { suggestedDifficulty } = useAdaptiveDifficulty('urge_surfing');
  const { trackGamePlay } = useMindGameTracking();
  
  const [difficulty, setDifficulty] = useState(suggestedDifficulty);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedFinish, setSelectedFinish] = useState(null);
  const [completedCount, setCompletedCount] = useState(0);

  const stepsPool =
    difficulty === 'advanced'
      ? t('mind_games.content.urge_surfing.advanced', { returnObjects: true }) || []
      : t('mind_games.content.urge_surfing.beginner', { returnObjects: true }) || [];
  const currentItem = stepsPool[currentIndex];
  const steps = Array.isArray(currentItem?.steps)
    ? currentItem.steps
    : currentItem
      ? Object.values(currentItem.steps || {})
      : [];
  const finishChoicesRaw = currentItem?.finish_choices ?? currentItem?.finishChoices;
  const finishChoices = Array.isArray(finishChoicesRaw)
    ? finishChoicesRaw
    : finishChoicesRaw
      ? Object.values(finishChoicesRaw)
      : [];
  
  useEffect(() => {
    return () => {
      if (completedCount > 0) {
        trackGamePlay({
          game: { id: 'urge_surfing', slug: 'urge-surfing', title: 'Urge Surfing' },
          completed: true,
          durationSeconds: completedCount * 60,
          difficulty_level: difficulty,
          success_rate: 100,
          attempts: completedCount,
        });
      }
    };
  }, [completedCount, difficulty]);

  const handleFinishChoice = (choice) => {
    setSelectedFinish(choice);
    setCompletedCount(prev => prev + 1);
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % stepsPool.length;
    setCurrentIndex(nextIndex);
    setSelectedFinish(null);
  };
  
  const handleDifficultyChange = (newDifficulty) => {
    setDifficulty(newDifficulty);
    setCurrentIndex(0);
    setSelectedFinish(null);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <Badge variant="outline" style={{
            borderRadius: '8px',
            borderColor: 'rgba(38, 166, 154, 0.3)',
            color: 'hsl(var(--primary))'
          }}>
            {t('mind_games.urge_surfing.completed', { count: completedCount })}
          </Badge>
          
          <div className="flex gap-2">
            <button
              aria-pressed={difficulty === 'beginner'}
              onClick={() => handleDifficultyChange('beginner')}
              className="min-h-11 min-w-11 px-3 py-2 text-xs rounded-lg transition-all"
              style={{
                backgroundColor: difficulty === 'beginner' ? 'rgba(38, 166, 154, 0.2)' : 'transparent',
                border: `1px solid ${difficulty === 'beginner' ? 'hsl(var(--primary))' : 'rgba(38, 166, 154, 0.3)'}`,
                color: difficulty === 'beginner' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                fontWeight: difficulty === 'beginner' ? '600' : '400'
              }}
            >
              {t('mind_games.urge_surfing.guided')}
            </button>
            <button
              aria-pressed={difficulty === 'advanced'}
              onClick={() => handleDifficultyChange('advanced')}
              className="min-h-11 min-w-11 px-3 py-2 text-xs rounded-lg transition-all"
              style={{
                backgroundColor: difficulty === 'advanced' ? 'rgba(38, 166, 154, 0.2)' : 'transparent',
                border: `1px solid ${difficulty === 'advanced' ? 'hsl(var(--primary))' : 'rgba(38, 166, 154, 0.3)'}`,
                color: difficulty === 'advanced' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                fontWeight: difficulty === 'advanced' ? '600' : '400'
              }}
            >
              {t('mind_games.urge_surfing.independent')}
            </button>
          </div>
        </div>
        
        <p className="text-sm font-semibold mb-4 break-words" style={{ color: 'hsl(var(--foreground))' }}>
          {currentItem?.title}
        </p>

        <div className="mb-4">
          <ul className="space-y-2">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-sm flex-shrink-0" style={{ color: 'hsl(var(--primary))' }}>•</span>
                <span className="text-sm break-words whitespace-normal flex-1 min-w-0" style={{ color: 'hsl(var(--foreground))' }}>
                  {step}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
          {t('mind_games.urge_surfing.finish_prompt')}
        </p>

        <div className="space-y-2">
          {finishChoices.map((choice, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal break-words min-w-0"
              style={{
                borderRadius: '12px',
                borderColor: selectedFinish === choice
                  ? 'rgba(34, 197, 94, 0.4)'
                  : 'rgba(38, 166, 154, 0.2)',
                backgroundColor: selectedFinish === choice
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'transparent'
              }}
              onClick={() => handleFinishChoice(choice)}
            >
              <span className="text-sm leading-snug">{choice}</span>
            </Button>
          ))}
        </div>

        {selectedFinish && (
          <div className="mt-4 p-3" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            <p className="text-sm font-medium break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.urge_surfing.success')}
            </p>
          </div>
        )}
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose} style={{ borderRadius: '12px' }}>
          {t('common.close')}
        </Button>
        {selectedFinish && (
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
