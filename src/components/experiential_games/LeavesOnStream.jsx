import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PremiumIcon from '@/components/ui/PremiumIcon';

export default function LeavesOnStream({ onClose }) {
  const { t } = useTranslation();
  const [thought, setThought] = useState('');
  const [placed, setPlaced] = useState(false);

  const handlePlace = () => {
    if (thought.trim()) {
      setPlaced(true);
      setTimeout(() => {
        setThought('');
        setPlaced(false);
      }, 3000);
    }
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <p className="text-sm mb-4 break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.leaves_on_stream.description')}
        </p>

        {!placed ? (
          <>
            <p className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              {t('mind_games.leaves_on_stream.thought_prompt')}
            </p>
            <input
              type="text"
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              placeholder={t('mind_games.leaves_on_stream.thought_placeholder')}
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
              onClick={handlePlace}
              disabled={!thought.trim()}
              className="w-full"
              style={{
                borderRadius: '12px',
                backgroundColor: thought.trim() ? 'hsl(var(--primary))' : '#ccc',
                color: 'hsl(var(--primary-foreground))'
              }}
            >
              {t('mind_games.leaves_on_stream.place_btn')}
            </Button>
          </>
        ) : (
          <div className="p-6 text-center" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(159, 122, 234, 0.1)',
            border: '1px solid rgba(159, 122, 234, 0.2)'
          }}>
            <div className="mb-4 animate-pulse">
              <div className="inline-block px-4 py-2 rounded-full" style={{
                backgroundColor: 'rgba(159, 122, 234, 0.3)',
                color: 'hsl(var(--foreground))'
              }}>
                <span className="inline-flex items-center gap-2"><PremiumIcon name="leaf" size="sm" bare /> “{thought}”</span>
              </div>
            </div>
            <p className="text-sm italic break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('mind_games.leaves_on_stream.floating')}
            </p>
          </div>
        )}

        <div className="mt-4 p-3" style={{
          borderRadius: '12px',
          backgroundColor: 'rgba(159, 122, 234, 0.05)',
          border: '1px solid rgba(159, 122, 234, 0.2)'
        }}>
          <p className="text-xs break-words whitespace-normal" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('mind_games.leaves_on_stream.tip')}
          </p>
        </div>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose} style={{ borderRadius: '12px' }}>
          {t('common.close')}
        </Button>
      </div>
    </div>
  );
}