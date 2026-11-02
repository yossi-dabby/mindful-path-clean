import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

export default function MessageFeedback({ conversationId, messageIndex, agentName, context }) {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleFeedback = async (type) => {
    if (isSubmitting || feedback) return;

    setHasError(false);
    setIsSubmitting(true);
    setFeedback(type);

    try {
      await base44.entities.TherapyFeedback.create({
        conversation_id: conversationId,
        message_index: messageIndex,
        feedback_type: type,
        agent_name: agentName,
        session_context: context
      });

      // Analytics tracking
      if (appParams.appId) {
        base44.analytics.track({
          eventName: 'message_feedback_given',
          properties: {
            feedback_type: type,
            conversation_id: conversationId,
            agent_name: agentName,
            context: context
          }
        });
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setFeedback(null);
      setHasError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      <span className="text-foreground mr-2 text-xs">{t('chat.feedback.prompt')}</span>
      <button
        onClick={() => handleFeedback('helpful')}
        disabled={isSubmitting || feedback !== null}
        aria-busy={isSubmitting}
        aria-pressed={feedback === 'helpful'}
        data-testid="feedback-helpful" className="text-foreground min-h-11 min-w-11 p-2 rounded-xl transition-colors hover:text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"






        aria-label={t('chat.feedback.helpful')}>

        <ThumbsUp className="w-3.5 h-3.5" />
      <span className="mobile-action-label md:hidden">{t('chat.feedback.helpful')}</span></button>
      <button
        onClick={() => handleFeedback('not_helpful')}
        disabled={isSubmitting || feedback !== null}
        aria-busy={isSubmitting}
        aria-pressed={feedback === 'not_helpful'}
        data-testid="feedback-not-helpful" className="text-foreground min-h-11 min-w-11 p-2 rounded-xl transition-colors hover:text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"






        aria-label={t('chat.feedback.not_helpful')}>

        <ThumbsDown className="w-3.5 h-3.5" />
      <span className="mobile-action-label md:hidden">{t('chat.feedback.not_helpful')}</span></button>
      {feedback && !isSubmitting && !hasError &&
      <span className="text-foreground ml-2 text-xs">{t('chat.feedback.thanks')}</span>
      }
      {hasError && <p role="alert" className="basis-full text-xs text-red-700 dark:text-red-300">{t('chat_stage2.feedback_error')}</p>}
    </div>);

}
