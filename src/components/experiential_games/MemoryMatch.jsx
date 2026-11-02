import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import PremiumIcon from '@/components/ui/PremiumIcon';

const CARD_PAIRS = [
  { id: 1, icon: 'flower' },
  { id: 2, icon: 'leaf' },
  { id: 3, icon: 'waves' },
  { id: 4, icon: 'sun' },
  { id: 5, icon: 'moon' },
  { id: 6, icon: 'star' },
  { id: 7, icon: 'wind' },
  { id: 8, icon: 'sparkle' },
];

export default function MemoryMatch({ onClose }) {
  const { t } = useTranslation();
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const pairs = [...CARD_PAIRS, ...CARD_PAIRS]
      .map((card, index) => ({ ...card, uniqueId: index }))
      .sort(() => Math.random() - 0.5);
    setCards(pairs);
    setFlippedIndices([]);
    setMatchedPairs([]);
    setMoves(0);
    setIsComplete(false);
  };

  useEffect(() => {
    if (flippedIndices.length === 2) {
      const [first, second] = flippedIndices;
      if (cards[first].id === cards[second].id) {
        setMatchedPairs([...matchedPairs, cards[first].id]);
        setFlippedIndices([]);
      } else {
        const timeout = setTimeout(() => setFlippedIndices([]), 800);
        setMoves(value => value + 1);
        return () => clearTimeout(timeout);
      }
      setMoves(value => value + 1);
    }
  }, [flippedIndices]);

  useEffect(() => {
    if (matchedPairs.length === CARD_PAIRS.length && matchedPairs.length > 0) {
      setIsComplete(true);
    }
  }, [matchedPairs]);

  const handleCardClick = (index) => {
    if (
      flippedIndices.length === 2 ||
      flippedIndices.includes(index) ||
      matchedPairs.includes(cards[index].id)
    ) {
      return;
    }
    setFlippedIndices([...flippedIndices, index]);
  };

  const isFlipped = (index) => 
    flippedIndices.includes(index) || matchedPairs.includes(cards[index].id);

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            {t('mind_games.memory_match.title')}
          </h3>
          <Badge variant="outline" style={{
            borderRadius: '8px',
            borderColor: 'rgba(38, 166, 154, 0.3)',
            color: 'hsl(var(--primary))'
          }}>
            {t('mind_games.memory_match.moves')}: {moves}
          </Badge>
        </div>

        <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.memory_match.instructions')}
        </p>

        {!isComplete ? (
          <div className="grid grid-cols-4 gap-3">
            {cards.map((card, index) => (
              <button
                key={card.uniqueId}
                onClick={() => handleCardClick(index)}
                aria-label={t('tools_stage5.memory_card', { number: index + 1, state: isFlipped(index) ? t('tools_stage5.symbol_' + card.icon) + (matchedPairs.includes(card.id) ? ', ' + t('tools_stage5.matched') : '') : t('tools_stage5.hidden') })}
                aria-pressed={isFlipped(index)}
                aria-disabled={isFlipped(index) || flippedIndices.length === 2}
                className="aspect-square rounded-xl transition-all duration-300 text-4xl flex items-center justify-center"
                style={{
                  backgroundColor: isFlipped(index) 
                    ? 'rgba(38, 166, 154, 0.15)' 
                    : 'rgba(38, 166, 154, 0.4)',
                  border: '2px solid rgba(38, 166, 154, 0.3)',
                  transform: isFlipped(index) ? 'scale(1)' : 'scale(1)',
                  cursor: isFlipped(index) ? 'default' : 'pointer',
                }}
              >
                {isFlipped(index) ? <PremiumIcon name={card.icon} size="sm" /> : '?'}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <Sparkles className="w-12 h-12 mx-auto" style={{ color: 'hsl(var(--primary))' }} />
            <div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                {t('mind_games.memory_match.complete_title')}
              </h3>
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('mind_games.memory_match.complete_message', { moves })}
              </p>
            </div>
            <Button
              onClick={initializeGame}
              style={{
                borderRadius: '12px',
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))'
              }}
            >
              {t('mind_games.common.try_another')}
            </Button>
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