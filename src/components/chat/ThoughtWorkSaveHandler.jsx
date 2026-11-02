import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

/**
 * Non-breaking handler for thought work saves with structured data extraction.
 * Falls back gracefully if extraction fails.
 */
export default function ThoughtWorkSaveHandler({ 
  conversationId, 
  conversationMessages, 
  onSaveComplete, 
  onCancel 
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('idle'); // idle | extracting | saving | success | error
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      setStatus('extracting');
      
      // Step 1: Extract structured data from conversation
      let structuredData = null;
      try {
        const extractResult = await base44.functions.invoke('extractThoughtWorkData', {
          conversation_messages: conversationMessages
        });
        
        if (extractResult?.data?.success && extractResult?.data?.data) {
          structuredData = extractResult.data.data;
        }
      } catch (error) {
        console.warn('Structured data extraction failed (non-critical):', error);
        // Continue with basic save
      }

      setStatus('saving');

      // Step 2: Save to ThoughtJournal
      // Use structured data if available, otherwise use basic fields
      const journalEntry = {
        entry_type: 'cbt_standard',
        situation: structuredData?.situation || 'Thought work session',
        automatic_thoughts: structuredData?.automatic_thoughts || '',
        emotions: structuredData?.emotions || [],
        emotion_intensity: structuredData?.emotion_ratings?.anxiety || null,
        emotion_ratings: structuredData?.emotion_ratings || null,
        evidence_for: structuredData?.evidence_for || '',
        evidence_against: structuredData?.evidence_against || '',
        balanced_thought: structuredData?.balanced_thought || '',
        homework_tasks: structuredData?.homework || [],
        custom_fields: {
          conversation_id: conversationId,
          extracted_at: new Date().toISOString()
        }
      };

      await base44.entities.ThoughtJournal.create(journalEntry);
      
      return { structuredData };
    },
    onSuccess: ({ structuredData }) => {
      setStatus('success');
      queryClient.invalidateQueries({ queryKey: ['thoughtJournals'] });
      
      setTimeout(() => {
        if (onSaveComplete) {
          onSaveComplete(structuredData);
        }
      }, 1500);
    },
    onError: (error) => {
      console.error('Save error:', error);
      setStatus('error');
    }
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const busy = status === 'extracting' || status === 'saving';
  return (
    <Card className="min-w-0 rounded-[28px] border border-border/70 bg-card p-4 text-foreground shadow-[var(--shadow-md)] sm:p-5" data-testid="chat-thought-save">
      {status === 'idle' && <p className="mb-4 text-sm leading-relaxed">{t('chat_stage2.save_prompt')}</p>}
      {busy && <div role="status" className="flex items-start gap-3"><Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" /><p className="text-sm leading-relaxed text-muted-foreground">{t(status === 'extracting' ? 'chat_stage2.extracting' : 'chat_stage2.saving')}</p></div>}
      {status === 'success' && <div role="status" className="flex items-start gap-3"><CheckCircle className="h-5 w-5 shrink-0 text-primary" /><p className="text-sm font-medium leading-relaxed">{t('chat_stage2.saved')}</p></div>}
      {status === 'error' && <div role="alert" className="mb-3 flex items-start gap-3"><AlertCircle className="h-5 w-5 shrink-0 text-red-700 dark:text-red-300" /><p className="text-sm leading-relaxed">{t('chat_stage2.save_error')}</p></div>}
      {(status === 'idle' || status === 'error') && <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="h-auto min-h-11 whitespace-normal">{t(status === 'error' ? 'common.retry' : 'chat_stage2.save_action')}</Button>
        <Button onClick={onCancel} variant="outline" className="h-auto min-h-11 whitespace-normal">{t('common.cancel')}</Button>
      </div>}
    </Card>
  );
}
