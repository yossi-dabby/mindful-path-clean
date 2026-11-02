import PremiumDialog from '@/components/ui/PremiumDialog';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Sparkles, Heart, Brain, FileText, Edit, Trash2 } from 'lucide-react';
import { localizeJournalTemplate } from './journalTemplateCatalog';

const templateIcons = { cbt_standard: Brain, gratitude: Heart, anxiety_log: Sparkles, mood_journal: Heart, custom: FileText };
const defaultTemplates = [
  { entry_type: 'cbt_standard', key: 'cbt' },
  { entry_type: 'gratitude', key: 'gratitude' },
  { entry_type: 'anxiety_log', key: 'anxiety' },
  { entry_type: 'mood_journal', key: 'mood' }
];

function localizeBuiltInTemplate(template, t) {
  const key = template.key || template.default_key;
  if (!key) return template;
  return {
    ...template,
    key,
    default_key: key,
    name: t(`journal_ui.templates.default.${key}.name`),
    description: t(`journal_ui.templates.default.${key}.description`)
  };
}

export default function TemplateManager({ templates = [], onClose, onSelectTemplate, isLoading = false, loadError = false, onRetry }) {
  const { t, i18n } = useTranslation();
  const currentLanguage = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'].includes(i18n.resolvedLanguage?.split('-')[0])
    ? i18n.resolvedLanguage.split('-')[0]
    : 'en';
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const queryClient = useQueryClient();

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.JournalTemplate.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['journalTemplates'] });
      const snapshots = queryClient.getQueriesData({ queryKey: ['journalTemplates'] });
      queryClient.setQueriesData({ queryKey: ['journalTemplates'] }, (old = []) =>
        Array.isArray(old) ? old.filter((template) => template.id !== id) : old
      );
      return { snapshots };
    },
    onError: (_error, _variables, context) => context?.snapshots?.forEach(([key, value]) => queryClient.setQueryData(key, value)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['journalTemplates'] })
  });

  return (
    <PremiumDialog localEscape onClose={onClose} label={t('journal_ui.templates.title')} className="journal-dialog fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="journal-template-title" aria-describedby="journal-template-description">
      <Card className="my-0 flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden rounded-b-none rounded-t-[28px] border-border/70 bg-[hsl(var(--card)/0.97)] shadow-2xl sm:my-8 sm:max-h-[calc(100dvh-4rem)] sm:rounded-[28px]">
        <CardHeader className="shrink-0 border-b border-border bg-secondary/70 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle id="journal-template-title" className="text-xl font-bold text-primary sm:text-2xl">{t('journal_ui.templates.title')}</CardTitle>
              <p id="journal-template-description" className="mt-1 text-sm text-muted-foreground">{t('journal_ui.templates.description')}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="min-h-11 min-w-11 rounded-full" aria-label={t('journal_ui.common.close_aria')}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
          {isLoading && <p role="status" className="mb-4 text-sm text-foreground">{t('journal_ui.common.loading')}</p>}
          {loadError && <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
            <p role="alert" className="text-sm text-foreground">{t('journal_ui.common.load_error')}</p>
            <Button variant="outline" className="mt-3 min-h-11" onClick={onRetry}>{t('journal_ui.common.retry')}</Button>
          </div>}
          {deleteTemplateMutation.isError && <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground">{t('journal_ui.templates.delete_error')}</p>}
          {!showCreateForm && !editingTemplate ? (
            <div className="space-y-6">
              <Button onClick={() => setShowCreateForm(true)} className="min-h-12 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary">
                <Plus className="h-4 w-4" />{t('journal_ui.templates.create')}
              </Button>

              <section>
                <h3 className="mb-3 text-sm font-bold text-foreground">{t('journal_ui.templates.defaults')}</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {defaultTemplates.map((template) => {
                    const localizedTemplate = localizeBuiltInTemplate({ ...template, is_default: true }, t);
                    return (
                      <TemplateCard key={template.key}
                        template={localizedTemplate}
                        displayName={localizedTemplate.name}
                        displayDescription={localizedTemplate.description}
                        onSelect={onSelectTemplate}
                        onEdit={() => setEditingTemplate({ ...localizedTemplate, source_default: true })}
                        editLabel={t('journal_ui.templates.customize_aria', { item: localizedTemplate.name })}
                        t={t} />
                    );
                  })}
                </div>
              </section>

              {templates.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-bold text-foreground">{t('journal_ui.templates.custom')}</h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {templates.map((template) => {
                      const displayTemplate = localizeJournalTemplate(template, t);
                      return (
                        <TemplateCard key={template.id} template={displayTemplate} displayName={displayTemplate.name} displayDescription={displayTemplate.description}
                          onSelect={onSelectTemplate}
                          onEdit={() => setEditingTemplate(displayTemplate.catalog_key || template.is_default
                            ? { ...displayTemplate, source_default: true }
                            : template)}
                          editLabel={displayTemplate.catalog_key
                            ? t('journal_ui.templates.customize_aria', { item: displayTemplate.name })
                            : undefined}
                          onDelete={() => deleteTemplateMutation.mutate(template.id)} t={t} />
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <TemplateForm template={editingTemplate} language={currentLanguage} t={t}
              onClose={() => { setShowCreateForm(false); setEditingTemplate(null); }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['journalTemplates'] });
                setShowCreateForm(false);
                setEditingTemplate(null);
              }} />
          )}
        </CardContent>
      </Card>
    </PremiumDialog>
  );
}

function TemplateCard({ template, displayName, displayDescription, onSelect, onEdit, onDelete, editLabel, t }) {
  const Icon = templateIcons[template.entry_type] || FileText;
  return (
    <Card className="group border-border bg-[hsl(var(--card)/0.97)] shadow-sm transition hover:border-border hover:shadow-md">
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/70">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex gap-1">
            {onEdit && <Button variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-full" onClick={onEdit}
              aria-label={editLabel || t('journal_ui.common.edit_aria', { item: displayName })} mobileLabelKey="edit"><Edit className="h-4 w-4" /></Button>}
            {onDelete && <Button variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-full text-red-600" onClick={() => {
              if (window.confirm(t('journal_ui.templates.delete_confirm'))) onDelete();
            }} aria-label={t('journal_ui.common.delete_aria', { item: t('journal_ui.templates.item') })} mobileLabelKey="delete"><Trash2 className="h-4 w-4" /></Button>}
          </div>
        </div>
        <h3 className="font-bold text-foreground">{displayName}</h3>
        <p className="mt-1 min-h-10 text-sm leading-relaxed text-muted-foreground">{displayDescription}</p>
        <Button onClick={() => onSelect(template)} className="mt-4 min-h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary">
          {t('journal_ui.templates.use')}
        </Button>
      </CardContent>
    </Card>
  );
}

function TemplateForm({ template, language, onClose, onSuccess, t }) {
  const queryClient = useQueryClient();
  const isCustomizingDefault = Boolean(template?.source_default || template?.is_default);
  const isExisting = Boolean(template?.id) && !isCustomizingDefault;
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    entry_type: template?.entry_type || 'custom',
    fields: Array.isArray(template?.fields) ? template.fields : [],
    language: isCustomizingDefault ? language : template?.language || language,
    is_default: false
  });
  const saveMutation = useMutation({
    mutationFn: (data) => isExisting
      ? base44.entities.JournalTemplate.update(template.id, data)
      : base44.entities.JournalTemplate.create(data),
    onSuccess,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['journalTemplates'] })
  });
  const formTitle = isCustomizingDefault
    ? t('journal_ui.templates.customize_title')
    : isExisting
      ? t('journal_ui.templates.edit_title')
      : t('journal_ui.templates.create_title');
  return (
    <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(formData); }}>
      <h3 className="text-lg font-bold text-foreground">{formTitle}</h3>
      <div>
        <label htmlFor="journal-template-name" className="mb-2 block text-sm font-semibold text-primary">{t('journal_ui.templates.name')}</label>
        <Input id="journal-template-name" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })}
          placeholder={t('journal_ui.templates.name_placeholder')} className="h-12 rounded-xl" autoFocus />
      </div>
      <div>
        <label htmlFor="journal-template-description-field" className="mb-2 block text-sm font-semibold text-primary">{t('journal_ui.templates.form_description')}</label>
        <Textarea id="journal-template-description-field" value={formData.description}
          onChange={(event) => setFormData({ ...formData, description: event.target.value })}
          placeholder={t('journal_ui.templates.description_placeholder')} className="min-h-28 rounded-xl" />
      </div>
      {saveMutation.isError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground">{t('journal_ui.templates.save_error')}</p>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button type="button" onClick={onClose} variant="outline" className="min-h-12 flex-1 rounded-xl">{t('journal_ui.common.cancel')}</Button>
        <Button type="submit" disabled={!formData.name.trim() || saveMutation.isPending}
          className="min-h-12 flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary">
          {saveMutation.isPending
            ? t('journal_ui.common.saving')
            : isCustomizingDefault
              ? t('journal_ui.templates.save_customized')
              : isExisting
                ? t('journal_ui.common.update')
                : t('journal_ui.common.create')}
        </Button>
      </div>
    </form>
  );
}
