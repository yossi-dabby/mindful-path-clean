import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BookOpen, Sparkles, TrendingDown } from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function JournalTracker({ journalEntries }) {
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    return format(date, 'yyyy-MM-dd');
  });

  const entriesPerDay = last14Days.map(date => {
    const count = journalEntries.filter(entry => {
      const entryDate = format(new Date(entry.created_date), 'yyyy-MM-dd');
      return entryDate === date;
    }).length;
    return {
      date: format(new Date(date), 'MMM d'),
      count
    };
  });

  const totalEntries = journalEntries.length;
  const entriesThisWeek = journalEntries.filter(entry => {
    const entryDate = new Date(entry.created_date);
    const weekAgo = subDays(new Date(), 7);
    return entryDate >= weekAgo;
  }).length;

  const avgIntensityChange = journalEntries
    .filter(e => e.emotion_intensity && e.outcome_emotion_intensity)
    .reduce((sum, e) => sum + (e.emotion_intensity - e.outcome_emotion_intensity), 0) / 
    Math.max(journalEntries.filter(e => e.emotion_intensity && e.outcome_emotion_intensity).length, 1);

  const topDistortions = journalEntries
    .flatMap(e => e.cognitive_distortions || [])
    .reduce((acc, d) => {
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});

  const topDistortionsList = Object.entries(topDistortions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-600" />
          Journal Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-purple-50 rounded-xl">
            <p className="text-3xl font-bold text-purple-600">{totalEntries}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Entries</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-3xl font-bold text-blue-600">{entriesThisWeek}</p>
            <p className="text-sm text-muted-foreground mt-1">This Week</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <div className="flex items-center justify-center gap-1">
              <TrendingDown className="w-5 h-5 text-green-600" />
              <p className="text-3xl font-bold text-green-600">-{avgIntensityChange.toFixed(1)}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Avg Relief</p>
          </div>
        </div>

        <h4 className="font-semibold text-foreground mb-3">14-Day Activity</h4>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={entriesPerDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {topDistortionsList.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Common Thinking Patterns
            </h4>
            <div className="space-y-2">
              {topDistortionsList.map(([distortion, count]) => (
                <div key={distortion} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{distortion}</span>
                  <Badge className="bg-purple-600">{count}x</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalEntries === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Start journaling to see insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}