import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Brain, TrendingUp, Lightbulb } from 'lucide-react';
import AiTrendsSummary from './AiTrendsSummary';

export default function JournalInsightsPanel({ entriesCount }) {
  const [showInsights, setShowInsights] = useState(false);

  if (entriesCount < 3) {
    return (
      <Card className="border-0 mb-4 sm:mb-6" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card) / 0.97)',
        boxShadow: '0 4px 12px rgba(159, 122, 234, 0.1)'
      }}>
        <CardContent className="p-4 sm:p-6 text-center">
          <Brain className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3" style={{ color: 'hsl(var(--primary))', opacity: 0.6 }} />
          <h3 className="font-semibold mb-2 text-sm sm:text-base" style={{ color: 'hsl(var(--foreground))' }}>
            AI Insights Coming Soon
          </h3>
          <p className="text-xs sm:text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Keep journaling! AI insights will be available after {3 - entriesCount} more {3 - entriesCount === 1 ? 'entry' : 'entries'}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 mb-4 sm:mb-6 cursor-pointer hover:shadow-xl transition-all" style={{
        borderRadius: '20px',
        background: 'hsl(var(--card) / 0.97)',
        boxShadow: '0 6px 20px rgba(159, 122, 234, 0.15)'
      }} onClick={() => setShowInsights(true)}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center flex-shrink-0" style={{
                borderRadius: '16px',
                background: 'hsl(var(--card) / 0.97)',
                boxShadow: '0 4px 12px rgba(159, 122, 234, 0.2)'
              }}>
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1 text-sm sm:text-base" style={{ color: 'hsl(var(--foreground))' }}>
                  AI-Powered Insights
                </h3>
                <p className="text-xs sm:text-sm mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Discover patterns, themes, and personalized recommendations
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full" style={{
                    background: 'hsl(var(--secondary))',
                    color: 'hsl(var(--primary))'
                  }}>
                    <TrendingUp className="me-1 inline h-3.5 w-3.5" aria-hidden="true" /> Emotional Trends
                  </span>
                  <span className="px-2 py-1 rounded-full" style={{
                    background: 'hsl(var(--secondary))',
                    color: 'hsl(var(--primary))'
                  }}>
                    <Brain className="me-1 inline h-3.5 w-3.5" aria-hidden="true" /> Cognitive Patterns
                  </span>
                  <span className="px-2 py-1 rounded-full" style={{
                    background: 'hsl(var(--secondary))',
                    color: 'hsl(var(--primary))'
                  }}>
                    <Lightbulb className="me-1 inline h-3.5 w-3.5" aria-hidden="true" /> Key Themes
                  </span>
                </div>
              </div>
            </div>
            <Button className="text-white w-full sm:w-auto" style={{
              borderRadius: '16px',
              backgroundColor: 'hsl(var(--primary))',
              boxShadow: '0 4px 12px rgba(159, 122, 234, 0.3)'
            }}>
              <TrendingUp className="w-4 h-4 mr-2" />
              View Insights
            </Button>
          </div>
        </CardContent>
      </Card>

      {showInsights && <AiTrendsSummary onClose={() => setShowInsights(false)} />}
    </>
  );
}