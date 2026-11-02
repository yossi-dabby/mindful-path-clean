import React from 'react';
import {
  Brain, CalendarDays, ChartNoAxesCombined, CheckCircle2, Clock3, Crown, Dumbbell,
  Flame, Flower2, Heart, Leaf, Lightbulb, MessageCircle, Moon, Mountain,
  Music2, NotebookPen, PartyPopper, PenLine, PersonStanding, Sparkles, Star,
  Sun, Target, TriangleAlert, Waves, Wind
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap = {
  brain: Brain,
  calendar: CalendarDays,
  chart: ChartNoAxesCombined,
  check: CheckCircle2,
  clock: Clock3,
  crown: Crown,
  exercise: Dumbbell,
  flame: Flame,
  flower: Flower2,
  heart: Heart,
  leaf: Leaf,
  idea: Lightbulb,
  thought: MessageCircle,
  moon: Moon,
  mountain: Mountain,
  music: Music2,
  journal: NotebookPen,
  celebration: PartyPopper,
  writing: PenLine,
  movement: PersonStanding,
  sparkle: Sparkles,
  star: Star,
  sun: Sun,
  target: Target,
  alert: TriangleAlert,
  waves: Waves,
  wind: Wind,
  '🌟': Star,
  '🔥': Flame,
  '📝': NotebookPen,
  '✍️': PenLine,
  '🏃': PersonStanding,
  '🎯': Target,
  '😌': Sun,
  '👑': Crown,
  '🏅': Star
};

export default function PremiumIcon({ name = 'sparkle', size = 'md', tone = 'teal', bare = false, className = '' }) {
  const Icon = iconMap[name] || Sparkles;
  const dimensions = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14' : 'h-10 w-10';
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';
  const toneClass = {
    teal: 'border-teal-200/80 bg-teal-50/90 text-teal-700',
    gold: 'border-amber-200/80 bg-amber-50/90 text-amber-700',
    violet: 'border-violet-200/80 bg-violet-50/90 text-violet-700',
    blue: 'border-sky-200/80 bg-sky-50/90 text-sky-700',
    green: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-700'
  }[tone] || 'border-teal-200/80 bg-teal-50/90 text-teal-700';

  if (bare) return <Icon className={cn(iconSize, className)} strokeWidth={2.2} aria-hidden="true" />;

  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-[26%] border shadow-[var(--shadow-sm)]', dimensions, toneClass, className)} aria-hidden="true">
      <Icon className={iconSize} strokeWidth={2.2} />
    </span>
  );
}
