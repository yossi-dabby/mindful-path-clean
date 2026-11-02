import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export default function TIPPSkills({ onClose }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAction, setSelectedAction] = useState(null);

  const tippSkillsContent = t('mind_games.content.tipp_skills', { returnObjects: true });
  const tippSkillsItems = tippSkillsContent ? [tippSkillsContent] : [];
  const currentItem = tippSkillsItems[currentIndex];

  const handleSelect = (action) => {
    setSelectedAction(action);
  };

  const handleNext = () => {
    const randomIndex = Math.floor(Math.random() * tippSkillsItems.length);
    setCurrentIndex(randomIndex);
    setSelectedAction(null);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <p className="text-xs font-medium mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.tipp_skills.prompt')}
        </p>
        <p className="text-sm font-semibold mb-4 break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
          {currentItem?.situation}
        </p>

        <div className="space-y-3 mb-4">
          {currentItem?.skills?.map((skill, index) => (
            <div key={index} className="p-3" style={{
              borderRadius: '12px',
              backgroundColor: 'rgba(38, 166, 154, 0.05)',
              border: '1px solid rgba(38, 166, 154, 0.2)'
            }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--primary))' }}>
                {skill.letter}: {skill.name}
              </p>
              <p className="text-xs break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {skill.description}
              </p>
            </div>
          ))}
        </div>

        <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
          {t('mind_games.tipp_skills.pick_action')}
        </p>

        <div className="space-y-2">
          {currentItem?.actions?.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal break-words min-w-0"
              style={{
                borderRadius: '12px',
                borderColor: selectedAction === action
                  ? 'rgba(34, 197, 94, 0.4)'
                  : 'rgba(38, 166, 154, 0.2)',
                backgroundColor: selectedAction === action
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'transparent'
              }}
              onClick={() => handleSelect(action)}
            >
              <span className="text-sm leading-snug">{action}</span>
            </Button>
          ))}
        </div>

        {selectedAction && (
          <div className="mt-4 p-3" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.tipp_skills.success')}
            </p>
          </div>
        )}
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose} style={{ borderRadius: '12px' }}>
          {t('common.close')}
        </Button>
        {selectedAction && (
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
