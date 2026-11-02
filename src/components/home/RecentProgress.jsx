import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Target } from 'lucide-react';

export default function RecentProgress({ goals }) {
  if (!goals || goals.length === 0) {
    return (
      <Card className="border-0 shadow-md bg-[hsl(var(--card)/0.97)]">
        <CardHeader>
          <CardTitle className="text-xl">Your Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-muted-foreground mb-4">No goals yet. Set your first goal to start tracking progress!</p>
            <Link to={createPageUrl('Goals')}>
              <Button className="bg-purple-600 hover:bg-purple-700">
                Create Goal
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md bg-[hsl(var(--card)/0.97)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Your Goals</CardTitle>
        <Link to={createPageUrl('Goals')}>
          <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
            View all
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => (
          <div key={goal.id} className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-foreground">{goal.title}</h3>
                <p className="text-sm text-muted-foreground capitalize">{goal.category.replace('_', ' ')}</p>
              </div>
              <span className="text-sm font-bold text-green-600">{goal.progress}%</span>
            </div>
            <Progress value={goal.progress} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}