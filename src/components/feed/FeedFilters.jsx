import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

const CONTENT_TYPES = [
  { id: 'all', label: 'All Content' },
  { id: 'exercises', label: 'Exercises' },
  { id: 'resources', label: 'Articles' },
  { id: 'community', label: 'Community' },
  { id: 'quotes', label: 'Inspiration' }
];

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Most Relevant' },
  { id: 'recent', label: 'Most Recent' },
  { id: 'popular', label: 'Most Popular' }
];

export default function FeedFilters({ 
  contentType, 
  setContentType, 
  sortBy, 
  setSortBy,
  hasActiveFilters,
  onClearFilters 
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-card rounded-[26px] p-4 shadow-sm mb-4 border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">{t('tools_stage5.filter_sort')}</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            {t('tools_stage5.clear')}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {/* Content Type Filter */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">{t('tools_stage5.content_type')}</p>
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map((type) => (
              <button
                key={type.id}
                aria-pressed={contentType === type.id}
                onClick={() => setContentType(type.id)}
                className={`
                  min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${contentType === type.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }
                `}
              >
                {t('tools_stage5.' + type.id)}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">{t('tools_stage5.sort_by')}</p>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                aria-pressed={sortBy === option.id}
                onClick={() => setSortBy(option.id)}
                className={`
                  min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${sortBy === option.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }
                `}
              >
                {t('tools_stage5.' + option.id)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}