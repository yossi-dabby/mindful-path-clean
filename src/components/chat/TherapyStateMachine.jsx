import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { useTranslation } from 'react-i18next';
import PremiumIcon from '@/components/ui/PremiumIcon';

export default function TherapyStateMachine({ onComplete }) {
  const { t, i18n } = useTranslation();
  const [flowStep, setFlowStep] = useState('entry'); // entry | input | confirm | execute | complete
  const [selectedOption, setSelectedOption] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [alternatives, setAlternatives] = useState([]);
  const [selectedAlternative, setSelectedAlternative] = useState(null);
  const [journalEntryId, setJournalEntryId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleOptionSelect = (optionId) => {
    setSelectedOption(optionId);
    setFlowStep('input');
  };

  const handleContinueFromInput = () => {
    if (!userInput.trim()) return;
    setFlowStep('confirm');
  };

  const handleConfirmYes = async () => {
    // Handle option 5 immediately
    if (selectedOption === 5) {
      navigate(createPageUrl('Exercises'));
      return;
    }

    setFlowStep('execute');
    setIsProcessing(true);

    try {
      if (selectedOption === 2 || selectedOption === 3) {
        // Create journal entry
        const today = new Date().toISOString().split('T')[0];
        const entry = await base44.entities.ThoughtJournal.create({
          date: today,
          situation: selectedOption === 2 ? t('chat.flow.situation_thought') : t('chat.flow.situation_reflection'),
          automatic_thoughts: userInput,
          emotions: [],
          intensity: 5,
          cognitive_distortions: []
        });
        setJournalEntryId(entry.id);

        // Generate 3 alternatives
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate exactly 3 brief, realistic and compassionate balanced thoughts for: "${userInput}". Write each alternative in locale ${i18n.resolvedLanguage || i18n.language || 'en'}. Return JSON only: {"alternatives": ["...", "...", "..."]}`,
          response_json_schema: {
            type: "object",
            properties: {
              alternatives: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["alternatives"]
          }
        });

        setAlternatives(result.alternatives || [
          t('chat.flow.fallback_1'), t('chat.flow.fallback_2'), t('chat.flow.fallback_3')
        ]);
        setIsProcessing(false);
      } else if (selectedOption === 1) {
        // Not feeling well - grounding
        setAlternatives([]);
        setIsProcessing(false);
      } else if (selectedOption === 4) {
        // Goal
        const goal = await base44.entities.Goal.create({
          title: userInput,
          category: 'behavioral',
          status: 'active',
          progress: 0
        });
        setJournalEntryId(goal.id);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Execute error:', error);
      if (selectedOption === 2 || selectedOption === 3) {
        setAlternatives([
          t('chat.flow.fallback_1'), t('chat.flow.fallback_2'), t('chat.flow.fallback_3')
        ]);
      }
      setIsProcessing(false);
    }
  };

  const handleConfirmNo = () => {
    setFlowStep('input');
  };

  const handleSelectAlternative = async (alternative) => {
    if (!journalEntryId) return;
    
    setSelectedAlternative(alternative);
    setIsProcessing(true);

    try {
      await base44.entities.ThoughtJournal.update(journalEntryId, {
        alternative_thoughts: alternative
      });
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      
      setTimeout(() => {
        setIsProcessing(false);
        setFlowStep('complete');
      }, 500);
    } catch (error) {
      console.error('Update error:', error);
      setIsProcessing(false);
      setFlowStep('complete');
    }
  };

  const handleDoAnother = () => {
    setFlowStep('entry');
    setSelectedOption(null);
    setUserInput('');
    setAlternatives([]);
    setSelectedAlternative(null);
    setJournalEntryId(null);
  };

  const handleGoToJournal = () => {
    navigate(createPageUrl('Journal'));
  };

  const handleGoToGoals = () => {
    navigate(createPageUrl('Goals'));
  };

  // ENTRY SCREEN
  if (flowStep === 'entry') {
    return (
      <Card className="p-6 border-0 max-w-2xl mx-auto" style={{
        borderRadius: '24px',
        background: 'hsl(var(--card) / 0.97)',
        backdropFilter: 'blur(16px)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div className="mb-6">
          <p className="text-sm mb-3" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('chat.entry.welcome')}
          </p>
          <h3 className="text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
            {t('chat.entry.question')}
          </h3>
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((id) => {
            const labels = [1, 2, 3, 4, 5].map((number) => t(`chat.entry.option_${number}`));
            const icons = ['heart', 'thought', 'journal', 'target', 'leaf'];
            const colors = ['#E57373', '#9F7AEA', '#4FC3F7', '#FFB74D', '#81C784'];

            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (id - 1) * 0.05 }}
              >
                <Button
                  onClick={() => handleOptionSelect(id)}
                  variant="ghost"
                  className="w-full h-auto min-h-[56px] justify-start text-left p-4"
                  style={{
                    borderRadius: '18px',
                    border: '1px solid rgba(38, 166, 154, 0.15)',
                    backgroundColor: 'hsl(var(--card) / 0.97)'
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{
                      borderRadius: '12px',
                      backgroundColor: colors[id - 1] + '20'
                    }}>
                      <PremiumIcon name={icons[id - 1]} size="sm" />
                    </div>
                    <span className="text-sm font-medium flex-1" style={{ color: 'hsl(var(--foreground))' }}>
                      {labels[id - 1]}
                    </span>
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </Card>
    );
  }

  // INPUT SCREEN
  if (flowStep === 'input') {
    return (
      <Card className="p-6 border-0 max-w-2xl mx-auto" style={{
        borderRadius: '24px',
        background: 'hsl(var(--card) / 0.97)',
        backdropFilter: 'blur(16px)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <p className="mb-4 leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>
          {t(`chat.flow.prompt_${selectedOption}`)}
        </p>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={t('chat.flow.type_here')}
          className="w-full p-4 rounded-xl resize-none min-h-[120px] mb-4"
          style={{
            border: '1px solid rgba(38, 166, 154, 0.2)',
            backgroundColor: 'hsl(var(--card) / 0.97)',
            color: 'hsl(var(--foreground))'
          }}
        />
        <Button
          onClick={handleContinueFromInput}
          disabled={!userInput.trim()}
          className="w-full text-white"
          style={{
            borderRadius: '18px',
            backgroundColor: 'hsl(var(--primary))',
            boxShadow: 'var(--shadow-md)',
            opacity: !userInput.trim() ? 0.5 : 1
          }}
        >
          {t('chat.flow.continue')}
        </Button>
      </Card>
    );
  }

  // CONFIRM SCREEN
  if (flowStep === 'confirm') {
    return (
      <Card className="p-6 border-0 max-w-2xl mx-auto" style={{
        borderRadius: '24px',
        background: 'hsl(var(--card) / 0.97)',
        backdropFilter: 'blur(16px)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <p className="mb-4 leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>
          {t('chat.flow.reflection', { text: userInput })}
        </p>
        <p className="mb-6 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('chat.flow.confirm')}
        </p>
        <div className="flex gap-3">
          <Button
            onClick={handleConfirmYes}
            className="flex-1 text-white"
            style={{
              borderRadius: '18px',
              backgroundColor: 'hsl(var(--primary))',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {t('chat.flow.yes')}
          </Button>
          <Button
            onClick={handleConfirmNo}
            variant="outline"
            className="flex-1"
            style={{
              borderRadius: '18px',
              borderColor: 'hsl(var(--border))'
            }}
          >
            {t('chat.flow.no')}
          </Button>
        </div>
      </Card>
    );
  }

  // EXECUTE SCREEN - Loading or alternatives
  if (flowStep === 'execute') {
    if (isProcessing) {
      return (
        <Card className="p-8 border-0 max-w-2xl mx-auto text-center" style={{
          borderRadius: '24px',
          background: 'hsl(var(--card) / 0.97)',
          backdropFilter: 'blur(16px)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
          <p style={{ color: 'hsl(var(--muted-foreground))' }}>{t('chat.flow.creating')}</p>
        </Card>
      );
    }

    // Show alternatives for options 2 & 3
    if ((selectedOption === 2 || selectedOption === 3) && alternatives.length > 0) {
      return (
        <Card className="p-6 border-0 max-w-2xl mx-auto" style={{
          borderRadius: '24px',
          background: 'hsl(var(--card) / 0.97)',
          backdropFilter: 'blur(16px)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
            {t('chat.flow.alternatives_title')}
          </h3>
          <p className="text-sm mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('chat.flow.alternatives_help')}
          </p>

          <div className="space-y-3">
            {alternatives.map((alt, index) => (
              <Button
                key={index}
                onClick={() => handleSelectAlternative(alt)}
                disabled={isProcessing}
                className="w-full text-left h-auto p-4 justify-start"
                variant="outline"
                style={{
                  borderRadius: '18px',
                  borderColor: 'hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card) / 0.97)'
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{
                    backgroundColor: 'hsl(var(--secondary))'
                  }}>
                    <span className="text-sm font-medium" style={{ color: 'hsl(var(--primary))' }}>
                      {String.fromCharCode(65 + index)}
                    </span>
                  </div>
                  <span className="flex-1" style={{ color: 'hsl(var(--foreground))', lineHeight: '1.5' }}>
                    {alt}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      );
    }

    // For option 1 (not feeling well) - show grounding
    if (selectedOption === 1) {
      return (
        <Card className="p-6 border-0 max-w-2xl mx-auto" style={{
          borderRadius: '24px',
          background: 'hsl(var(--card) / 0.97)',
          backdropFilter: 'blur(16px)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
            {t('chat.flow.grounding_title')}
          </h3>
          <div className="space-y-4 mb-6">
            <p style={{ color: 'hsl(var(--foreground))' }}>
              <strong>1.</strong> {t('chat.flow.grounding_1')}
            </p>
            <p style={{ color: 'hsl(var(--foreground))' }}>
              <strong>2.</strong> {t('chat.flow.grounding_2')}
            </p>
            <p style={{ color: 'hsl(var(--foreground))' }}>
              <strong>3.</strong> {t('chat.flow.grounding_3')}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                base44.entities.ThoughtJournal.create({
                  date: new Date().toISOString().split('T')[0],
                  situation: t('chat.flow.situation_grounding'),
                  automatic_thoughts: userInput,
                  emotions: [],
                  intensity: 5,
                  cognitive_distortions: []
                });
                setFlowStep('complete');
              }}
              variant="outline"
              className="flex-1"
              style={{ borderRadius: '18px' }}
            >
              {t('chat.flow.save_note')}
            </Button>
            <Button
              onClick={() => navigate(createPageUrl('Exercises'))}
              className="flex-1 text-white"
              style={{
                borderRadius: '18px',
                backgroundColor: 'hsl(var(--primary))',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              {t('chat.flow.calming_exercise')}
            </Button>
          </div>
        </Card>
      );
    }

    // For option 4 (goal) - completion
    if (selectedOption === 4) {
      return (
        <Card className="p-8 border-0 max-w-2xl mx-auto text-center" style={{
          borderRadius: '24px',
          background: 'hsl(var(--card) / 0.97)',
          backdropFilter: 'blur(16px)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{
            backgroundColor: 'rgba(129, 199, 132, 0.2)'
          }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: '#81C784' }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
            {t('chat.flow.goal_created')}
          </h3>
          <p className="mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('chat.flow.goal_saved')}
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleDoAnother}
              variant="outline"
              className="flex-1"
              style={{ borderRadius: '18px' }}
            >
              {t('chat.flow.another')}
            </Button>
            <Button
              onClick={handleGoToGoals}
              className="flex-1 text-white"
              style={{
                borderRadius: '18px',
                backgroundColor: 'hsl(var(--primary))',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              {t('chat.flow.go_goals')}
            </Button>
          </div>
        </Card>
      );
    }
  }

  // COMPLETE SCREEN
  if (flowStep === 'complete') {
    return (
      <Card className="p-8 border-0 max-w-2xl mx-auto text-center" style={{
        borderRadius: '24px',
        background: 'hsl(var(--card) / 0.97)',
        backdropFilter: 'blur(16px)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{
            backgroundColor: 'rgba(129, 199, 132, 0.2)'
          }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: '#81C784' }} />
          </div>
        </motion.div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
          {t('chat.flow.entry_saved')}
        </h3>
        <p className="mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('chat.flow.journal_saved')}
        </p>
        <div className="flex gap-3">
          <Button
            onClick={handleDoAnother}
            variant="outline"
            className="flex-1"
            style={{ borderRadius: '18px', borderColor: 'hsl(var(--border))' }}
          >
            {t('chat.flow.another')}
          </Button>
          <Button
            onClick={handleGoToJournal}
            className="flex-1 text-white"
            style={{
              borderRadius: '18px',
              backgroundColor: 'hsl(var(--primary))',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {t('chat.flow.go_journal')}
          </Button>
        </div>
      </Card>
    );
  }

  return null;
}
