import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export default function TinyExperiment({ onClose }) {
  const { t } = useTranslation();
  const tinyExperimentItems = t('mind_games.content.tiny_experiment.items', { returnObjects: true });
  
  const [currentIndex] = useState(() => {
    if (!tinyExperimentItems) return 0;
    return Math.floor(Math.random() * tinyExperimentItems.length);
  });
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [selectedReflection, setSelectedReflection] = useState(null);

  if (!tinyExperimentItems) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  const currentItem = tinyExperimentItems[currentIndex];

  if (!currentItem) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  const handleExperimentSelect = (experiment) => {
    setSelectedExperiment(experiment);
    setSelectedReflection(null);
  };

  const handleReflectionSelect = (option) => {
    setSelectedReflection(option);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border-0" style={{
        borderRadius: '16px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.tiny_experiment.belief_label')}
        </p>
        <p className="text-sm italic break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
          "{currentItem.belief}"
        </p>
      </Card>

      <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
        {t('mind_games.tiny_experiment.pick_experiment')}
      </p>
      <div className="space-y-2">
        {currentItem.experiments?.map((experiment, index) => {
          const isSelected = selectedExperiment === experiment;
          return (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal break-words"
              style={{
                borderRadius: '12px',
                borderColor: isSelected
                  ? 'rgba(38, 166, 154, 0.4)'
                  : 'rgba(38, 166, 154, 0.2)',
                backgroundColor: isSelected
                  ? 'rgba(38, 166, 154, 0.1)'
                  : 'transparent'
              }}
              onClick={() => handleExperimentSelect(experiment)}
            >
              {experiment}
            </Button>
          );
        })}
      </div>

      {selectedExperiment && (
        <>
          <Card className="p-4 border-0" style={{
            borderRadius: '16px',
            background: 'rgba(38, 166, 154, 0.1)',
            border: '1px solid rgba(38, 166, 154, 0.2)'
          }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              {currentItem.reflection_question}
            </p>
            <div className="space-y-2">
              {currentItem.reflection_options?.map((option, index) => {
                const isSelected = selectedReflection === option;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left whitespace-normal break-words"
                    style={{
                      borderRadius: '10px',
                      borderColor: isSelected
                        ? 'rgba(34, 197, 94, 0.4)'
                        : 'rgba(38, 166, 154, 0.2)',
                      backgroundColor: isSelected
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'transparent'
                    }}
                    onClick={() => handleReflectionSelect(option)}
                  >
                    {option}
                  </Button>
                );
              })}
            </div>
          </Card>

          {selectedReflection && (
            <Card className="p-3 border-0" style={{
              borderRadius: '12px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)'
            }}>
              <p className="text-xs break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
                {t('mind_games.tiny_experiment.success')}
              </p>
            </Card>
          )}
        </>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose} style={{ borderRadius: '12px' }}>
          {t('common.close')}
        </Button>
      </div>
    </div>
  );
}
