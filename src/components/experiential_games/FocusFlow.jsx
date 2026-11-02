import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { Zap, Target } from 'lucide-react';

export default function FocusFlow({ onClose }) {
  const { t } = useTranslation();
  const [sequence, setSequence] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [isShowing, setIsShowing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const colors = [
    { id: 1, color: 'hsl(var(--primary))', name: t('mind_games.focus_flow.colors.teal') },
    { id: 2, color: '#B9A3C1', name: t('mind_games.focus_flow.colors.lavender') },
    { id: 3, color: '#F49283', name: t('mind_games.focus_flow.colors.coral') },
    { id: 4, color: '#8BB2A2', name: t('mind_games.focus_flow.colors.sage') },
  ];

  useEffect(() => {
    if (level === 1) {
      startNewRound();
    }
  }, []);

  const startNewRound = () => {
    const newSequence = [...sequence, colors[Math.floor(Math.random() * colors.length)].id];
    setSequence(newSequence);
    setUserSequence([]);
    setGameOver(false);
    playSequence(newSequence);
  };

  const playSequence = async (seq) => {
    setIsShowing(true);
    for (let i = 0; i < seq.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setActiveIndex(seq[i]);
      await new Promise(resolve => setTimeout(resolve, 400));
      setActiveIndex(null);
    }
    setIsShowing(false);
  };

  const handleColorClick = (colorId) => {
    if (isShowing || gameOver) return;

    const newUserSequence = [...userSequence, colorId];
    setUserSequence(newUserSequence);

    if (colorId !== sequence[newUserSequence.length - 1]) {
      setGameOver(true);
      return;
    }

    if (newUserSequence.length === sequence.length) {
      setScore(score + 1);
      setLevel(level + 1);
      setTimeout(startNewRound, 1000);
    }
  };

  const resetGame = () => {
    setSequence([]);
    setUserSequence([]);
    setLevel(1);
    setScore(0);
    setGameOver(false);
    setTimeout(startNewRound, 100);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
            <Target className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            {t('mind_games.focus_flow.title')}
          </h3>
          <Badge variant="outline" style={{
            borderRadius: '8px',
            borderColor: 'rgba(38, 166, 154, 0.3)',
            color: 'hsl(var(--primary))'
          }}>
            {t('mind_games.focus_flow.level')}: {level}
          </Badge>
        </div>

        <p className="text-sm mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.focus_flow.instructions')}
        </p>

        {!gameOver ? (
          <>
            {isShowing && (
              <div className="text-center mb-4">
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--primary))' }}>
                  {t('mind_games.focus_flow.watch_carefully')}
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              {colors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleColorClick(color.id)}
                  disabled={isShowing}
                  className="aspect-square rounded-2xl transition-all duration-200 flex items-center justify-center text-white font-semibold text-lg"
                  style={{
                    backgroundColor: color.color,
                    opacity: activeIndex === color.id ? 1 : isShowing ? 0.4 : 0.8,
                    transform: activeIndex === color.id ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: activeIndex === color.id 
                      ? `0 8px 24px ${color.color}80` 
                      : '0 2px 8px rgba(0,0,0,0.1)',
                    cursor: isShowing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {color.name}
                </button>
              ))}
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              {sequence.map((_, idx) => (
                <div
                  key={idx}
                  className="w-3 h-3 rounded-full transition-all"
                  style={{
                    backgroundColor: idx < userSequence.length 
                      ? 'hsl(var(--primary))'
                      : 'rgba(38, 166, 154, 0.2)'
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 space-y-4">
            <Zap className="w-12 h-12 mx-auto" style={{ color: '#F49283' }} />
            <div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                {t('mind_games.focus_flow.game_over')}
              </h3>
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('mind_games.focus_flow.final_score', { score })}
              </p>
            </div>
            <Button
              onClick={resetGame}
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