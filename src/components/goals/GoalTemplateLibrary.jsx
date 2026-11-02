import PremiumDialog from '@/components/ui/PremiumDialog';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Target, Sparkles, TrendingUp, Heart, Brain, Users, Briefcase } from 'lucide-react';
import { getCurrentAppLocale } from '../i18n/appLocale.js';
import {
  formatGoalTemplateUi,
  getGoalTemplateUiCopy,
  localizeGoalTemplate
} from './goalTemplateLocalization.js';

const categoryIcons = {
  behavioral: Briefcase,
  emotional: Heart,
  social: Users,
  cognitive: Brain,
  lifestyle: TrendingUp
};

const categoryColors = {
  behavioral: 'bg-blue-100 text-blue-800',
  emotional: 'bg-pink-100 text-pink-800',
  social: 'bg-purple-100 text-purple-800',
  cognitive: 'bg-indigo-100 text-indigo-800',
  lifestyle: 'bg-green-100 text-green-800'
};

export default function GoalTemplateLibrary({ onSelectTemplate, onClose }) {
  const { i18n } = useTranslation();
  const locale = getCurrentAppLocale(i18n);
  const copy = getGoalTemplateUiCopy(locale);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['goalTemplates'],
    queryFn: async () => {
      const result = await base44.entities.GoalTemplate.list('-created_date');
      return Array.isArray(result)
        ? result.map((template) => ({
            ...template,
            ...template.data,
            id: template.id
          }))
        : [];
    }
  });

  const localizedTemplates = useMemo(
    () => templates
      .map((template) => localizeGoalTemplate(template, locale))
      .filter((template) => !template.localization_missing),
    [templates, locale]
  );

  const categories = [
    { value: 'all', label: copy.all, icon: Target },
    { value: 'lifestyle', label: copy.lifestyle, icon: TrendingUp },
    { value: 'cognitive', label: copy.cognitive, icon: Brain },
    { value: 'emotional', label: copy.emotional, icon: Heart },
    { value: 'social', label: copy.social, icon: Users },
    { value: 'behavioral', label: copy.behavioral, icon: Briefcase }
  ];

  const filteredTemplates = selectedCategory === 'all'
    ? localizedTemplates
    : localizedTemplates.filter((template) => template.category === selectedCategory);

  const popularTemplates = localizedTemplates.filter((template) => template.is_popular);

  return (
    <PremiumDialog onClose={onClose} label={copy.title || copy.all} className="goal-dialog fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto border-0 bg-card"
        style={{ borderRadius: '32px' }}
        data-testid="goal-template-library"
      >
        <CardHeader
          className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm"
          style={{ borderRadius: '32px 32px 0 0' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle
                id="goal-template-library-title"
                className="text-2xl font-semibold text-card-foreground"
              >
                {copy.title}
              </CardTitle>
              <p className="text-sm mt-1 text-muted-foreground">
                {copy.subtitle}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0"
              aria-label={copy.close}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div
            className="flex gap-2 mb-6 overflow-x-auto pb-2"
            style={{ scrollbarWidth: 'none' }}
            aria-label={copy.all}
          >
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.value}
                  aria-pressed={selectedCategory === category.value}
                  variant={selectedCategory === category.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.value)}
                  className="flex-shrink-0 whitespace-nowrap"
                  style={selectedCategory === category.value ? {
                    backgroundColor: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))'
                  } : {}}
                >
                  <Icon className="w-4 h-4 me-2" />
                  {category.label}
                </Button>
              );
            })}
          </div>

          {selectedCategory === 'all' && popularTemplates.length > 0 && (
            <section className="mb-8" aria-labelledby="popular-goal-templates">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 id="popular-goal-templates" className="text-lg font-semibold text-card-foreground">
                  {copy.popular}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    copy={copy}
                    onSelect={() => onSelectTemplate(template)}
                  />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby={selectedCategory === 'all' ? 'all-goal-templates' : undefined}>
            {selectedCategory === 'all' && (
              <h3 id="all-goal-templates" className="text-lg font-semibold mb-4 text-card-foreground">
                {copy.all}
              </h3>
            )}

            {isLoading ? (
              <div className="text-center py-12" role="status">
                <p className="text-muted-foreground">{copy.loading}</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12" role="status">
                <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
                <p className="text-muted-foreground">{copy.empty}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    copy={copy}
                    onSelect={() => onSelectTemplate(template)}
                  />
                ))}
              </div>
            )}
          </section>
        </CardContent>
      </Card>
    </PremiumDialog>
  );
}

function TemplateCard({ template, copy, onSelect }) {
  const Icon = categoryIcons[template.category] || Target;
  const difficultyKey = String(template.difficulty || '').toLowerCase();
  const difficulty = copy[difficultyKey] || '';

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-3xl text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label={formatGoalTemplateUi(copy, 'select', { title: template.title })}
    >
      <Card
        className="h-full hover:shadow-lg transition-all border-0 bg-card"
        style={{ borderRadius: '24px' }}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-card-foreground mb-1 line-clamp-2">
                {template.title}
              </h4>
              <Badge className={categoryColors[template.category]} variant="outline">
                {copy[template.category] || ''}
              </Badge>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {template.description}
          </p>

          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{formatGoalTemplateUi(copy, 'weeks', { count: template.duration_weeks })}</span>
            {difficulty && (
              <Badge variant="outline" className="text-xs">
                {difficulty}
              </Badge>
            )}
          </div>

          {template.is_popular && (
            <div className="mt-3 flex items-center gap-1 text-xs text-primary">
              <Sparkles className="w-3 h-3" />
              <span>{copy.popularChoice}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  );
}
