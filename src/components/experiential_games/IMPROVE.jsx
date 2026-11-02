import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function IMPROVE({ onClose }) {
  const { t } = useTranslation();
  const [selectedSkill, setSelectedSkill] = useState(null);

  const improveItems = t('mind_games.content.improve.items', { returnObjects: true });

  const handleSelect = (item) => {
    setSelectedSkill(item);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <p className="text-sm mb-4 break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.improve.prompt')}
        </p>

        <div className="space-y-2">
          {improveItems.map((item, index) => (
            <button
              key={index}
              onClick={() => handleSelect(item)}
              className="w-full text-left p-3 transition-all"
              style={{
                borderRadius: '12px',
                backgroundColor: selectedSkill?.letter === item.letter
                  ? 'rgba(38, 166, 154, 0.15)'
                  : 'rgba(38, 166, 154, 0.05)',
                border: `1px solid ${selectedSkill?.letter === item.letter ? 'hsl(var(--primary))' : 'rgba(38, 166, 154, 0.2)'}`
              }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--primary))' }}>
                {item.letter}: {item.name}
              </p>
              <p className="text-xs break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {item.description}
              </p>
            </button>
          ))}
        </div>

        {selectedSkill && (
          <div className="mt-4 p-4" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(38, 166, 154, 0.1)',
            border: '1px solid rgba(38, 166, 154, 0.2)'
          }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'hsl(var(--primary))' }}>
              {t('mind_games.improve.quick_action')}
            </p>
            <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
              {selectedSkill.quick_action}
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
