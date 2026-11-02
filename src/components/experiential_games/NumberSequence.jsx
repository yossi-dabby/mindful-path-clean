import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { Hash, Brain, CheckCircle, XCircle } from 'lucide-react';

const SEQUENCES = [
  { sequence: [2, 4, 6, 8], answer: 10, rule_key: 'mind_games.number_sequence.sequences.0.rule' },
  { sequence: [1, 3, 6, 10], answer: 15, rule_key: 'mind_games.number_sequence.sequences.1.rule' },
  { sequence: [5, 10, 15, 20], answer: 25, rule_key: 'mind_games.number_sequence.sequences.2.rule' },
  { sequence: [1, 2, 4, 7], answer: 11, rule_key: 'mind_games.number_sequence.sequences.3.rule' },
  { sequence: [3, 6, 12, 24], answer: 48, rule_key: 'mind_games.number_sequence.sequences.4.rule' },
];

export default function NumberSequence({ onClose }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const current = SEQUENCES[currentIndex];

  const handleSubmit = () => {
    const answer = parseInt(userAnswer);
    setShowResult(true);
    
    if (answer === current.answer) {
      setScore(score + 1);
    }

    setTimeout(() => {
      if (currentIndex < SEQUENCES.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setUserAnswer('');
        setShowResult(false);
      } else {
        setIsComplete(true);
      }
    }, 1500);
  };

  const reset = () => {
    setCurrentIndex(0);
    setUserAnswer('');
    setShowResult(false);
    setScore(0);
    setIsComplete(false);
  };

  const isCorrect = parseInt(userAnswer) === current.answer;

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
            <Hash className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            {t('mind_games.number_sequence.title')}
          </h3>
          <Badge variant="outline" style={{
            borderRadius: '8px',
            borderColor: 'rgba(38, 166, 154, 0.3)',
            color: 'hsl(var(--primary))'
          }}>
            {currentIndex + 1}/{SEQUENCES.length}
          </Badge>
        </div>

        {!isComplete ? (
          <div className="space-y-4">
            <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('mind_games.number_sequence.instructions')}
            </p>

            <div className="flex items-center justify-center gap-1 py-6 flex-wrap">
              {current.sequence.map((num, idx) => (
                <React.Fragment key={idx}>
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold"
                    style={{
                      backgroundColor: 'rgba(38, 166, 154, 0.15)',
                      color: 'hsl(var(--primary))',
                      border: '2px solid rgba(38, 166, 154, 0.3)'
                    }}
                  >
                    {num}
                  </div>
                  {idx < current.sequence.length - 1 && (
                    <span className="text-gray-400 text-xs">→</span>
                  )}
                </React.Fragment>
              ))}
              <span className="text-gray-400 text-xs">→</span>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold"
                style={{
                  backgroundColor: 'rgba(185, 163, 193, 0.15)',
                  color: '#B9A3C1',
                  border: '2px dashed rgba(185, 163, 193, 0.3)'
                }}
              >
                ?
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !showResult && userAnswer && handleSubmit()}
                placeholder={t('mind_games.number_sequence.answer_placeholder')}
                disabled={showResult}
                className="flex-1 min-w-0 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#26A69A] focus:outline-none"
                style={{
                  borderColor: showResult
                    ? isCorrect
                      ? 'rgba(34, 197, 94, 0.4)'
                      : 'rgba(239, 68, 68, 0.4)'
                    : 'rgba(38, 166, 154, 0.2)'
                }}
              />
              <Button
                onClick={handleSubmit}
                disabled={!userAnswer || showResult}
                style={{
                  borderRadius: '12px',
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))'
                }}
              >
                {t('mind_games.number_sequence.check')}
              </Button>
            </div>

            {showResult && (
              <div
                className="p-4 rounded-xl flex items-start gap-3"
                style={{
                  backgroundColor: isCorrect 
                    ? 'rgba(34, 197, 94, 0.1)' 
                    : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${isCorrect 
                    ? 'rgba(34, 197, 94, 0.3)' 
                    : 'rgba(239, 68, 68, 0.3)'}`
                }}
              >
                {isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">
                    {isCorrect 
                      ? t('mind_games.number_sequence.correct')
                      : t('mind_games.number_sequence.incorrect', { answer: current.answer })}
                  </p>
                  <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {t(current.rule_key)}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <Brain className="w-12 h-12 mx-auto" style={{ color: 'hsl(var(--primary))' }} />
            <div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                {t('mind_games.number_sequence.complete_title')}
              </h3>
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('mind_games.number_sequence.complete_message', { score, total: SEQUENCES.length })}
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