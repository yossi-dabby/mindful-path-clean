import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdaptiveDifficulty } from './useAdaptiveDifficulty';
import { useMindGameTracking } from './useMindGameTracking';

export default function ThoughtQuiz({ onClose }) {
  const { t } = useTranslation();
  const { suggestedDifficulty } = useAdaptiveDifficulty('thought_quiz');
  const { trackGamePlay } = useMindGameTracking();
  
  const [difficulty, setDifficulty] = useState(suggestedDifficulty);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  
  const questionPool = difficulty === 'advanced' 
    ? t('mind_games.content.thought_quiz.advanced', { returnObjects: true })
    : t('mind_games.content.thought_quiz.items', { returnObjects: true });
  
  useEffect(() => {
    setCurrentIndex(Math.floor(Math.random() * questionPool.length));
  }, [difficulty, questionPool.length]);
  
  useEffect(() => {
    return () => {
      if (questionsAnswered > 0) {
        const successRate = (score / questionsAnswered) * 100;
        trackGamePlay({
          game: { id: 'thought_quiz', slug: 'thought-quiz', title: t('mind_games.games.thought_quiz.title') },
          completed: true,
          durationSeconds: questionsAnswered * 15,
          difficulty_level: difficulty,
          success_rate: successRate,
          attempts: questionsAnswered,
        });
      }
    };
  }, [score, questionsAnswered, difficulty]);

  const currentItem = questionPool[currentIndex];
  
  // Guard: Prevent render if currentItem is undefined
  if (!currentItem) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  const prompt = currentItem.prompt;
  const explanation = currentItem.explanation;
  const options = currentItem.options;
  // correctIndex: translation items store correct answer at index 0 by convention;
  // fall back to 0 if the field is missing from the data.
  const correctIndex = currentItem.correctIndex !== undefined ? Number(currentItem.correctIndex) : 0;

  const handleAnswer = (index) => {
    setSelectedOption(index);
    setShowExplanation(true);
    setQuestionsAnswered(prev => prev + 1);
    if (index === correctIndex) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    const randomIndex = Math.floor(Math.random() * questionPool.length);
    setCurrentIndex(randomIndex);
    setSelectedOption(null);
    setShowExplanation(false);
  };
  
  const handleDifficultyChange = (newDifficulty) => {
    setDifficulty(newDifficulty);
    setScore(0);
    setQuestionsAnswered(0);
    setSelectedOption(null);
    setShowExplanation(false);
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
            {t('mind_games.thought_quiz.score')}: {score}/{questionsAnswered}
          </Badge>
          
          <div className="flex gap-2">
            {['beginner', 'intermediate', 'advanced'].map((level) => (
              <button
                key={level}
                aria-label={t('tools_stage5.' + level)}
                aria-pressed={difficulty === level}
                onClick={() => handleDifficultyChange(level)}
                className="min-h-11 min-w-11 px-3 py-2 text-xs rounded-lg transition-all"
                style={{
                  backgroundColor: difficulty === level ? 'rgba(38, 166, 154, 0.2)' : 'transparent',
                  border: `1px solid ${difficulty === level ? 'hsl(var(--primary))' : 'rgba(38, 166, 154, 0.3)'}`,
                  color: difficulty === level ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  fontWeight: difficulty === level ? '600' : '400'
                }}
              >
                <span className="inline-flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: level === 'beginner' ? 1 : level === 'intermediate' ? 2 : 3 }).map((_, starIndex) => (
                    <Star key={starIndex} className="h-3 w-3 fill-current" aria-hidden="true" />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </div>
        
        <p className="text-base font-medium mb-4 break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
          {prompt}
        </p>

        <div className="space-y-2">
          {options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrect = index === correctIndex;
            const showResult = showExplanation;

            return (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 px-4 whitespace-normal break-words min-w-0"
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
                onClick={() => !showExplanation && handleAnswer(index)}
                disabled={showExplanation}
              >
                <div className="flex items-center gap-2 w-full min-w-0">
                  <span className="flex-1 break-words">{option}</span>
                  {showResult && isCorrect && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                </div>
              </Button>
            );
          })}
        </div>

        {showExplanation && (
          <div className="mt-4 p-4" style={{
            borderRadius: '12px',
            backgroundColor: 'rgba(38, 166, 154, 0.1)',
            border: '1px solid rgba(38, 166, 154, 0.2)'
          }}>
            <p className="text-sm break-words whitespace-normal" style={{ color: 'hsl(var(--foreground))' }}>
              {explanation}
            </p>
          </div>
        )}
      </Card>

      <div className="flex gap-3 justify-end flex-wrap">
        <Button variant="outline" onClick={onClose} style={{ borderRadius: '12px' }}>
          {t('common.close')}
        </Button>
        {showExplanation && (
          <Button
            onClick={handleNext}
            style={{
              borderRadius: '12px',
              backgroundColor: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))'
            }}
          >
            {t('mind_games.thought_quiz.next_question')}
          </Button>
        )}
      </div>
    </div>
  );
}