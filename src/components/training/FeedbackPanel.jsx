import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Lightbulb, Star } from 'lucide-react';

function ScoreBar({ label, score }) {
  const color = score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{score}/10</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.max(0,Math.min(10,score)) * 10}%` }} />
      </div>
    </div>
  );
}

export default function FeedbackPanel({ feedback }) {
  const {t}=useTranslation();
  if (!feedback) return null;

  const { scores, overall, strengths, improvements, suggested_response } = feedback;

  const overallColor = overall >= 8 ? 'text-green-600' : overall >= 6 ? 'text-amber-600' : 'text-red-600';
  const overallBg = overall >= 8 ? 'border-green-300 bg-green-50 dark:bg-green-950/20' : overall >= 6 ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'border-red-300 bg-red-50 dark:bg-red-950/20';

  return (
    <div className="space-y-3 [overflow-wrap:anywhere]">
      {/* Overall Score */}
      <Card className={`border ${overallBg}`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('stage6.overall_score')}</p>
              <p className={`text-2xl font-bold ${overallColor}`}>{overall}<span className="text-sm font-normal text-muted-foreground">/10</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimension Scores */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm">{t('stage6.dimension_scores')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {Object.entries(scores).map(([key, val]) => (
            <ScoreBar key={key} label={t('stage6.'+key,{defaultValue:key})} score={val} />
          ))}
        </CardContent>
      </Card>

      {/* Strengths */}
      {strengths?.length > 0 && (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-green-800 dark:text-green-300">{t('stage6.strengths')}</span>
            </div>
            <ul className="space-y-1">
              {strengths.map((s, i) => <li key={i} className="text-xs text-green-700 dark:text-green-400 leading-relaxed">• {s}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Improvements */}
      {improvements?.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('stage6.improvements')}</span>
            </div>
            <ul className="space-y-1">
              {improvements.map((s, i) => <li key={i} className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">• {s}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Suggested Response */}
      {suggested_response && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm font-semibold text-primary">{t('stage6.suggested_response')}</span>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed italic">"{suggested_response}"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}