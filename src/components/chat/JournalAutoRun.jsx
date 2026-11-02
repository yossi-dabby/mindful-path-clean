import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function JournalAutoRun({ thoughtText, onComplete }) {
  const [alternatives, setAlternatives] = useState([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [selectedAlternative, setSelectedAlternative] = useState(null);
  const [showNoneOptions, setShowNoneOptions] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    generateAlternatives();
  }, []);

  const generateAlternatives = async (style = null) => {
    setIsGenerating(true);
    try {
      const prompt = style 
        ? `Generate 3 ${style} alternative thoughts for this automatic thought: "${thoughtText}". Return JSON: {"alternatives": ["...", "...", "..."]}`
        : `Generate 3 alternative balanced thoughts (short, realistic, compassionate) for this automatic thought: "${thoughtText}". Return JSON: {"alternatives": ["...", "...", "..."]}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
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

      setAlternatives(result.alternatives || []);
    } catch (error) {
      console.error('Error generating alternatives:', error);
      setAlternatives([
        "This thought may not reflect the full picture",
        "I can approach this from a different angle",
        "I'm doing my best given the circumstances"
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveJournalMutation = useMutation({
    mutationFn: async (alternativeText) => {
      const today = new Date().toISOString().split('T')[0];
      
      await base44.entities.ThoughtJournal.create({
        date: today,
        situation: "Identified during therapy session",
        automatic_thoughts: thoughtText,
        alternative_thoughts: alternativeText,
        emotions: [],
        intensity: 5,
        cognitive_distortions: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setSelectedAlternative(null);
      setTimeout(() => {
        onComplete();
      }, 1500);
    }
  });

  const handleSelectAlternative = (alternative) => {
    setSelectedAlternative(alternative);
    saveJournalMutation.mutate(alternative);
  };

  const handleNoneOfThese = () => {
    setShowNoneOptions(true);
  };

  const handleStyleSelection = (style) => {
    setShowNoneOptions(false);
    generateAlternatives(style);
  };

  if (isGenerating) {
    return (
      <Card className="p-8 border-0 max-w-2xl mx-auto text-center" style={{
        borderRadius: '28px',
        background: 'hsl(var(--card) / 0.97)',
        backdropFilter: 'blur(16px)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>Creating your journal entry...</p>
      </Card>
    );
  }

  if (selectedAlternative) {
    return (
      <Card className="p-8 border-0 max-w-2xl mx-auto text-center" style={{
        borderRadius: '28px',
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
          Journal entry saved
        </h3>
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>
          Your thought has been recorded in your journal.
        </p>
      </Card>
    );
  }

  if (showNoneOptions) {
    return (
      <Card className="p-6 border-0 max-w-2xl mx-auto" style={{
        borderRadius: '28px',
        background: 'hsl(var(--card) / 0.97)',
        backdropFilter: 'blur(16px)',
        boxShadow: 'var(--shadow-md)'
      }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'hsl(var(--foreground))' }}>
          What would feel more believable to you?
        </h3>
        <div className="space-y-3">
          <Button
            onClick={() => handleStyleSelection('gentle')}
            className="w-full justify-start text-left h-auto p-4"
            variant="outline"
            style={{
              borderRadius: '16px',
              borderColor: 'hsl(var(--border))'
            }}
          >
            More gentle
          </Button>
          <Button
            onClick={() => handleStyleSelection('realistic')}
            className="w-full justify-start text-left h-auto p-4"
            variant="outline"
            style={{
              borderRadius: '16px',
              borderColor: 'hsl(var(--border))'
            }}
          >
            More realistic
          </Button>
          <Button
            onClick={() => handleStyleSelection('confident')}
            className="w-full justify-start text-left h-auto p-4"
            variant="outline"
            style={{
              borderRadius: '16px',
              borderColor: 'hsl(var(--border))'
            }}
          >
            More confident
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-0 max-w-2xl mx-auto" style={{
      borderRadius: '28px',
      background: 'hsl(var(--card) / 0.97)',
      backdropFilter: 'blur(16px)',
      boxShadow: 'var(--shadow-md)'
    }}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
          Alternative perspectives
        </h3>
        <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Which of these feels most helpful to you?
        </p>
      </div>

      <div className="space-y-3">
        {alternatives.map((alternative, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Button
              onClick={() => handleSelectAlternative(alternative)}
              className="w-full text-left h-auto p-4 justify-start"
              variant="outline"
              style={{
                borderRadius: '16px',
                borderColor: 'hsl(var(--border))',
                backgroundColor: 'hsl(var(--card) / 0.97)'
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{
                  backgroundColor: 'hsl(var(--secondary))'
                }}>
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--primary))' }}>
                    {String.fromCharCode(65 + index)}
                  </span>
                </div>
                <span className="flex-1" style={{ color: 'hsl(var(--foreground))', lineHeight: '1.5' }}>
                  {alternative}
                </span>
              </div>
            </Button>
          </motion.div>
        ))}

        <Button
          onClick={handleNoneOfThese}
          variant="ghost"
          className="w-full mt-2"
          style={{
            borderRadius: '16px',
            color: 'hsl(var(--muted-foreground))'
          }}
        >
          None of these
        </Button>
      </div>
    </Card>
  );
}