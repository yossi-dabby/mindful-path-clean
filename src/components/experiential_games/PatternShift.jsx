import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { Shuffle, CheckCircle } from 'lucide-react';

const PATTERNS = [
  { rule: 'color', question_key: 'mind_games.pattern_shift.patterns.0.question', options_keys: ['mind_games.pattern_shift.option_colors.0', 'mind_games.pattern_shift.option_colors.1', 'mind_games.pattern_shift.option_colors.2'], correct: 1 },
  { rule: 'shape', question_key: 'mind_games.pattern_shift.patterns.1.question', options_keys: ['mind_games.pattern_shift.option_shapes.0', 'mind_games.pattern_shift.option_shapes.1', 'mind_games.pattern_shift.option_shapes.2'], correct: 2 },
  { rule: 'size', question_key: 'mind_games.pattern_shift.patterns.2.question', options_keys: ['mind_games.pattern_shift.option_sizes.0', 'mind_games.pattern_shift.option_sizes.1', 'mind_games.pattern_shift.option_sizes.2'], correct: 0 },
  { rule: 'number', question_key: 'mind_games.pattern_shift.patterns.3.question', options_keys: ['1', '2', '3'], correct: 1 },
];

export default function PatternShift({ onClose }) {
  const { t } = useTranslation();
  const [currentPattern, setCurrentPattern] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  const pattern = PATTERNS[currentPattern];

  const handleAnswer = (index) => {
    setSelected(index);
    if (index === pattern.correct) {
      setScore(score + 1);
    }
    
    setTimeout(() => {
      if (currentPattern < PATTERNS.length - 1) {
        setCurrentPattern(currentPattern + 1);
        setSelected(null);
      } else {
        setIsComplete(true);
      }
    }, 1000);
  };

  const reset = () => {
    setCurrentPattern(0);
    setScore(0);
    setSelected(null);
    setIsComplete(false);
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
            <Shuffle className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            {t('mind_games.pattern_shift.title')}
          </h3>
          <Badge variant="outline" style={{
            borderRadius: '8px',
            borderColor: 'rgba(38, 166, 154, 0.3)',
            color: 'hsl(var(--primary))'
          }}>
            {score}/{PATTERNS.length}
          </Badge>
        </div>

        {!isComplete ? (
          <div className="space-y-4">
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
              {t(pattern.question_key)}
            </p>

            <div className="grid grid-cols-1 gap-3">
              {pattern.options_keys.map((optionKey, index) => {
                const option = optionKey.startsWith('mind_games.') ? t(optionKey) : optionKey;
                const isSelected = selected === index;
                const isCorrect = index === pattern.correct;
                const showResult = selected !== null;

                return (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleAnswer(index)}
                    disabled={selected !== null}
                    className="w-full justify-between py-4"
                    style={{
                      borderRadius: '12px',
                      borderColor: showResult
                        ? isCorrect
                          ? 'rgba(34, 197, 94, 0.4)'
                          : isSelected
                          ? 'rgba(239, 68, 68, 0.4)'
                          : 'rgba(38, 166, 154, 0.2)'
                        : 'rgba(38, 166, 154, 0.2)',
                      backgroundColor: showResult
                        ? isCorrect
                          ? 'rgba(34, 197, 94, 0.1)'
                          : isSelected
                          ? 'rgba(239, 68, 68, 0.1)'
                          : 'transparent'
                        : 'transparent'
                    }}
                  >
                    <span>{option}</span>
                    {showResult && isCorrect && <CheckCircle className="w-5 h-5 text-green-600" />}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto" style={{ color: 'hsl(var(--primary))' }} />
            <div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                {t('mind_games.pattern_shift.complete_title')}
              </h3>
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('mind_games.pattern_shift.complete_message', { score, total: PATTERNS.length })}
              </p>
            </div>
            <Button
              onClick={reset}
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