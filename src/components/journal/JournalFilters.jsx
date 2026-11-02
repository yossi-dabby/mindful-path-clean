import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ENTRY_TYPE_VALUES = ['all', 'cbt_standard', 'gratitude', 'anxiety_log', 'mood_journal', 'custom', 'session_summary'];

export default function JournalFilters({ allTags = [], selectedTags, onTagsChange, selectedType, onTypeChange }) {
  const { t } = useTranslation();
  const toggleTag = (tag) => onTagsChange(
    selectedTags.includes(tag) ? selectedTags.filter((item) => item !== tag) : [...selectedTags, tag]
  );
  const hasActiveFilters = selectedTags.length > 0 || selectedType !== 'all';

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-sm font-semibold text-primary">{t('journal.filters.type_label')}</p>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap" role="group" aria-label={t('journal.filters.type_label')}>
          {ENTRY_TYPE_VALUES.map((value) => {
            const isSelected = selectedType === value;
            return (
              <button key={value} type="button" onClick={() => onTypeChange(value)} aria-pressed={isSelected}
                className={`min-h-11 max-w-full shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isSelected ? 'border-border bg-primary text-primary-foreground shadow-sm' : 'border-border bg-[hsl(var(--card)/0.97)] text-primary hover:bg-secondary/70'
                }`}>
                {t(value === 'session_summary' ? 'journal_ui.filters.session_summary' : `journal.filters.entry_types.${value}`)}
              </button>
            );
          })}
        </div>
      </div>

      {allTags.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-primary">{t('journal.filters.tags_label')}</p>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap" role="group" aria-label={t('journal.filters.tags_label')}>
            {allTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button key={tag} type="button" onClick={() => toggleTag(tag)} aria-pressed={isSelected}
                  className={`min-h-11 max-w-full shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    isSelected ? 'border-border bg-primary text-primary-foreground shadow-sm' : 'border-border bg-[hsl(var(--card)/0.97)] text-primary hover:bg-secondary/70'
                  }`}>
                  <span dir="auto" className="min-w-0 [overflow-wrap:anywhere]">{tag}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={() => { onTagsChange([]); onTypeChange('all'); }}
          className="min-h-11 rounded-xl text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />{t('journal.clear_filters')}
        </Button>
      )}
    </div>
  );
}
