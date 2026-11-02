import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, BookOpen, Target, MessageCircle } from 'lucide-react';

export default function StatsOverview({ moodEntries, journalEntries, goals, conversations }) {
  const stats = [
    {
      label: 'Mood Check-ins',
      value: moodEntries.length,
      icon: Calendar,
      color: 'bg-green-100 text-green-600'
    },
    {
      label: 'Journal Entries',
      value: journalEntries.length,
      icon: BookOpen,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      label: 'Active Goals',
      value: goals.filter(g => g.status === 'active').length,
      icon: Target,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      label: 'Therapy Sessions',
      value: conversations.length,
      icon: MessageCircle,
      color: 'bg-coral-100 text-coral-600'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="border-0 shadow-md hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center mb-3 transition-transform hover:scale-110`}>
                <Icon className="w-6 h-6" />
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}