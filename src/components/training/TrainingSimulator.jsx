import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, RotateCcw, Loader2, ChevronRight } from 'lucide-react';
import FeedbackPanel from './FeedbackPanel';

const DIFFICULTY_COLORS = {
  Easy: 'bg-green-100 text-green-800 border-green-300',
  Medium: 'bg-amber-100 text-amber-800 border-amber-300',
  Hard: 'bg-red-100 text-red-800 border-red-300',
};

export default function TrainingSimulator({ scenario, onReset }) {
  const {t}=useTranslation();
  const [error,setError]=useState(false);
  const [messages, setMessages] = useState([
    { role: 'patient', content: scenario.openingMessage }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [totalScores, setTotalScores] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, lastFeedback]);

  const handleSend = async () => {
    if (!input.trim() || loading || sessionEnded) return;

    setError(false);
    const therapistMsg = input.trim();
    setInput('');
    setLoading(true);
    setLastFeedback(null);

    const newMessages = [...messages, { role: 'therapist', content: therapistMsg }];
    setMessages(newMessages);

    try {
      const res = await base44.functions.invoke('evaluateTherapistResponse', {
        scenario,
        conversationHistory: messages,
        therapistResponse: therapistMsg
      });

      const { feedback, patientReply } = res.data;
      if (!feedback || typeof feedback.overall !== 'number' || !feedback.scores || typeof feedback.scores !== 'object') throw new Error('Missing feedback');
      setLastFeedback(feedback);
      setTotalScores(prev => [...prev, feedback.overall]);

      if (!feedback.session_continues || newMessages.length >= 12) {
        setSessionEnded(true);
        setMessages(prev => [...prev, { role: 'system', content: '— Session concluded —' }]);
      } else {
        setMessages(prev => [...prev, { role: 'patient', content: patientReply }]);
      }
    } catch { setMessages(messages); setInput(therapistMsg); setError(true); }
    finally { setLoading(false); }
  };

  const avgScore = totalScores.length
    ? (totalScores.reduce((a, b) => a + b, 0) / totalScores.length).toFixed(1)
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Chat Column */}
      <div className="lg:col-span-2 flex flex-col gap-3">
        {/* Scenario Header */}
        <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{scenario.title}</span>
              <Badge className={`text-xs border ${DIFFICULTY_COLORS[scenario.difficulty]}`}>{scenario.difficulty}</Badge>
              {avgScore && (
                <Badge variant="outline" className="text-xs">Avg: {avgScore}/10</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{scenario.description}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1 flex-shrink-0">
            <RotateCcw className="w-3 h-3" /> {t('stage6.new_scenario')}
          </Button>
        </div>

        {/* Patient Profile */}
        <details className="rounded-xl border border-border bg-secondary/30 px-4 py-2 text-xs cursor-pointer">
          <summary className="font-medium text-muted-foreground select-none">{t('stage6.patient_profile')}</summary>
          <p className="mt-2 text-foreground/80 leading-relaxed whitespace-pre-line">{scenario.patientProfile}</p>
        </details>

        {/* Messages */}
        <div className="flex-1 rounded-xl border border-border bg-card overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[min(480px,55dvh)]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'therapist' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
              {msg.role === 'system' ? (
                <span className="text-xs text-muted-foreground italic">{msg.content}</span>
              ) : (
                <div className={`max-w-[85%] min-w-0 [overflow-wrap:anywhere] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'therapist'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide mb-1">
                    {t(`stage6.${msg.role === 'therapist' ? 'therapist' : 'patient'}`)}
                  </span>
                  {msg.content}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> {t('stage6.evaluating')}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p role="alert" className="text-sm text-destructive">{t('stage6.training_error')}</p>}
        {/* Input */}
        {!sessionEnded ? (
          <div className="flex gap-2 items-end">
            <Textarea
              aria-label={t('stage6.training_response')}
              disabled={loading}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t('stage6.training_response')}
              className="resize-none flex-1"
              rows={3}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
              }}
            />
            <Button aria-label={t('stage6.send')} onClick={handleSend} disabled={loading || !input.trim()} className="gap-1 self-end" mobileLabelKey="send">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">{t('stage6.session_complete')}</p>
            <p className="text-xs text-muted-foreground">{t('stage6.average_score',{score:avgScore})}</p>
            <Button variant="outline" size="sm" onClick={onReset} className="gap-1">
              <ChevronRight className="w-3 h-3" /> {t('stage6.new_scenario')}
            </Button>
          </div>
        )}
      </div>

      {/* Feedback Column */}
      <div className="overflow-y-auto max-h-[640px]">
        {lastFeedback ? (
          <FeedbackPanel feedback={lastFeedback} />
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground text-sm">
            {t('stage6.feedback_empty')}
          </div>
        )}
      </div>
    </div>
  );
}