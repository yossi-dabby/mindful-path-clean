import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { Link, CheckCircle } from 'lucide-react';

export default function WordAssociation({ onClose }) {
  const { t } = useTranslation();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userWord, setUserWord] = useState('');
  const [chain, setChain] = useState([]);
  const [isComplete, setIsComplete] = useState(false);

  const startWords = t('mind_games.word_association.start_words', { returnObjects: true });
  const currentWord = startWords[currentWordIndex];

  const handleSubmit = () => {
    if (!userWord.trim()) return;

    const newChain = [...chain, { starter: currentWord, response: userWord }];
    setChain(newChain);
    setUserWord('');

    if (newChain.length >= 5) {
      setIsComplete(true);
    } else {
      setCurrentWordIndex((currentWordIndex + 1) % startWords.length);
    }
  };

  const reset = () => {
    setCurrentWordIndex(0);
    setUserWord('');
    setChain([]);
    setIsComplete(false);
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      <Card className="p-6 border-0" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid rgba(38, 166, 154, 0.2)'
      }}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
            <Link className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            {t('mind_games.word_association.title')}
          </h3>
        </div>

        <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('mind_games.word_association.instructions')}
        </p>

        {!isComplete ? (
          <div className="space-y-4">
            <div className="text-center py-6 px-4 rounded-xl" style={{
              backgroundColor: 'rgba(38, 166, 154, 0.1)',
              border: '2px solid rgba(38, 166, 154, 0.2)'
            }}>
              <p className="text-sm text-gray-500 mb-2">{t('mind_games.word_association.prompt')}</p>
              <p className="text-3xl font-bold" style={{ color: 'hsl(var(--primary))' }}>{currentWord}</p>
            </div>

            <div className="flex gap-2">
              <Input
                value={userWord}
                onChange={(e) => setUserWord(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={t('mind_games.word_association.input_placeholder')}
                className="flex-1 min-w-0"
                style={{ borderRadius: '12px' }}
              />
              <Button
                onClick={handleSubmit}
                disabled={!userWord.trim()}
                style={{
                  borderRadius: '12px',
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))'
                }}
              >
                {t('mind_games.word_association.submit')}
              </Button>
            </div>

            <div className="flex gap-2 justify-center">
              {[...Array(5)].map((_, idx) => (
                <div
                  key={idx}
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: idx < chain.length 
                      ? 'hsl(var(--primary))'
                      : 'rgba(38, 166, 154, 0.2)'
                  }}
                />
              ))}
            </div>

            {chain.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {t('mind_games.word_association.your_chain')}
                </p>
                {chain.map((item, idx) => (
                  <div key={idx} className="text-sm flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                    <span className="font-medium">{item.starter}</span>
                    <span>→</span>
                    <span style={{ color: 'hsl(var(--primary))' }}>{item.response}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto" style={{ color: 'hsl(var(--primary))' }} />
            <div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                {t('mind_games.word_association.complete_title')}
              </h3>
              <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('mind_games.word_association.complete_message')}
              </p>
              <div className="space-y-1">
                {chain.map((item, idx) => (
                  <div key={idx} className="text-sm flex items-center gap-2 justify-center" style={{ color: 'hsl(var(--foreground))' }}>
                    <span className="font-medium">{item.starter}</span>
                    <span>→</span>
                    <span style={{ color: 'hsl(var(--primary))' }}>{item.response}</span>
                  </div>
                ))}
              </div>
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