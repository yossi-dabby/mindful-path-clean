import React from 'react';
import { Button } from '@/components/ui/button';

export const FORMS_VIEW_MODES = ['large', 'medium', 'compact', 'list', 'tiles'];

export default function FormsViewModeToggle({ viewMode, onChange, isRtl = false, lang = 'en' }) {
  const options = [
    { value: 'large', label: lang === 'he' ? 'גדול' : 'Large' },
    { value: 'medium', label: lang === 'he' ? 'בינוני' : 'Medium' },
    { value: 'compact', label: lang === 'he' ? 'קומפקטי' : 'Compact' },
    { value: 'list', label: lang === 'he' ? 'רשימה' : 'List' },
    { value: 'tiles', label: lang === 'he' ? 'אריחים' : 'Tiles' },
  ];

  return (
    <div
      className="mb-6 rounded-[var(--radius-card)] border border-border bg-[hsl(var(--card)/0.97)] p-3 md:p-4"
      data-testid="forms-view-mode-toggle"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <p className="mb-2 text-sm font-semibold text-primary">{lang === 'he' ? 'תצוגה' : 'View mode'}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={viewMode === option.value ? 'default' : 'outline'}
            className={viewMode === option.value ? 'bg-primary hover:bg-primary text-white border-border' : 'border-border text-primary hover:bg-secondary/70'}
            onClick={() => onChange(option.value)}
            data-testid={`forms-view-mode-${option.value}`}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
