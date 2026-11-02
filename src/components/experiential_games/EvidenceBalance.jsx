import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export default function EvidenceBalance({ onClose }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConclusion, setShowConclusion] = useState(false);

  const evidenceBalanceItems = t('mind_games.content.evidence_balance.items', { returnObjects: true }) || [];
  const currentItem = evidenceBalanceItems[currentIndex];
  const evidenceFor = currentItem?.evidence_for ?? currentItem?.evidenceFor;
  const evidenceAgainst = currentItem?.evidence_against ?? currentItem?.evidenceAgainst;
  const balancedConclusion = currentItem?.balanced_conclusion ?? currentItem?.balancedConclusion;

  const handleShowConclusion = () => {
    setShowConclusion(true);
  };

  const handleNext = () => {
    const randomIndex = Math.floor(Math.random() * evidenceBalanceItems.length);
    setCurrentIndex(randomIndex);
    setShowConclusion(false);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <p className="text-xs font-medium mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.evidence_balance.thought_label')}
        </p>
        <p className="text-sm font-semibold mb-4 break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
          "{currentItem?.thought}"
        </p>

        {/* Stacked on mobile */}
        <div className="space-y-4 mb-4">
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: '#EF4444' }}>
              {t('mind_games.evidence_balance.for_label')}
            </p>
            <ul className="space-y-1">
              {evidenceFor?.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-sm flex-shrink-0" style={{ color: '#EF4444' }}>•</span>
                  <span className="text-sm break-words whitespace-normal flex-1 min-w-0" style={{ color: 'hsl(var(--foreground))' }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium mb-2" style={{ color: '#22C55E' }}>
              {t('mind_games.evidence_balance.against_label')}
            </p>
            <ul className="space-y-1">
              {evidenceAgainst?.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-sm flex-shrink-0" style={{ color: '#22C55E' }}>•</span>
                  <span className="text-sm break-words whitespace-normal flex-1 min-w-0" style={{ color: 'hsl(var(--foreground))' }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {!showConclusion ? (
          <Button
            onClick={handleShowConclusion}
            className="w-full"
            style={{
              borderRadius: '12px',
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))'
          }}
        >
          {t('mind_games.evidence_balance.show_conclusion')}
        </Button>
      ) : (
        <div className="p-4" style={{
          borderRadius: '12px',
          backgroundColor: 'rgba(38, 166, 154, 0.1)',
          border: '1px solid rgba(38, 166, 154, 0.2)'
        }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'hsl(var(--primary))' }}>
            {t('mind_games.evidence_balance.conclusion_label')}
          </p>
          <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
             {balancedConclusion}
          </p>
        </div>
      )}
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onClose} style={{ borderRadius: '12px' }}>
          {t('common.close')}
        </Button>
        {showConclusion && (
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
