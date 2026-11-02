import React from 'react';
import { cn } from '@/lib/utils';

const paths = {
  very_low: 'M20 38c7-7 17-7 24 0',
  low: 'M20 36c7-5 17-5 24 0',
  okay: 'M20 34h24',
  good: 'M20 31c7 6 17 6 24 0',
  excellent: 'M18 29c8 11 20 11 28 0'
};

export default function PremiumMoodIcon({ mood = 'okay', size = 'md', selected = false, className = '' }) {
  const dimensions = size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';
  const expression = paths[mood] || paths.okay;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[26%] border transition-colors',
        dimensions,
        selected
          ? 'border-teal-500 bg-teal-100 text-teal-800 shadow-[var(--shadow-sm)]'
          : 'border-teal-200/80 bg-teal-50/90 text-teal-700',
        className
      )}
      aria-hidden="true"
      data-premium-mood={mood}
    >
      <svg viewBox="0 0 64 64" width="78%" height="78%" fill="none">
        <circle cx="32" cy="32" r="23" stroke="currentColor" strokeWidth="4" />
        <path d="M23 25h.1M41 25h.1" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d={expression} stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </span>
  );
}
