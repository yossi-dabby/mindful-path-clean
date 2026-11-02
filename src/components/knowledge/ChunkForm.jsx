import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import BottomSheetSelect from '@/components/ui/bottom-sheet-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { X, Save, Plus, CheckCircle2, FilePenLine } from 'lucide-react';

const LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
const SOURCE_TYPES = ['clinical_manual', 'research_paper', 'guidelines', 'original', 'adapted', 'other'];
const LICENSE_STATUSES = ['open', 'proprietary', 'adapted', 'original', 'unknown'];

const EMPTY = {
  title: '', topic: '', subtopic: '', population: '', clinical_goal: '',
  content: '', short_summary: '', tags: [], source_name: '', source_type: '',
  license_status: '', safety_notes: '', contraindications: '',
  language: 'en', priority_score: 5, is_active: false,
};

function validate(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Required';
  if (!form.topic.trim()) errors.topic = 'Required';
  if (!form.content.trim()) errors.content = 'Required';
  const score = Number(form.priority_score);
  if (isNaN(score) || score < 0 || score > 10) errors.priority_score = 'Must be 0–10';
  return errors;
}

function normalizeTags(rawTags) {
  return [...new Set(rawTags.map(t => t.toLowerCase().trim()).filter(Boolean))];
}

export default function ChunkForm({ chunk, onSave, onCancel }) {
  const {t}=useTranslation();
  const [saveError,setSaveError]=useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (chunk) {
      setForm({ ...EMPTY, ...chunk, tags: chunk.tags || [] });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setTagInput('');
  }, [chunk]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addTag = () => {
    if (!tagInput.trim()) return;
    const newTags = normalizeTags([...form.tags, ...tagInput.split(',')]);
    set('tags', newTags);
    setTagInput('');
  };

  const removeTag = (tag) => set('tags', form.tags.filter(t => t !== tag));

  const handleSubmit = async () => {
    if(saving) return;
    setSaveError(false);
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...form, tags: normalizeTags(form.tags), priority_score: Number(form.priority_score) };
      if (chunk?.id) {
        await base44.entities.TrustedCBTChunk.update(chunk.id, payload);
        toast({ title: t('stage6.saved') });
      } else {
        await base44.entities.TrustedCBTChunk.create(payload);
        toast({ title: t('stage6.saved') });
      }
      queryClient.invalidateQueries({ queryKey: ['trustedCBTChunks'] });
      onSave();
    } catch (e) {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, opts = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`knowledge-field-${key}`}>{label}{opts.required && <span className="text-destructive ml-1">*</span>}</Label>
      {opts.textarea ? (
        <Textarea id={`knowledge-field-${key}`} disabled={saving} aria-invalid={!!errors[key]} value={form[key]} onChange={e => set(key, e.target.value)} rows={opts.rows || 4} placeholder={opts.placeholder} className={errors[key] ? 'border-destructive' : ''} />
      ) : (
        <Input id={`knowledge-field-${key}`} disabled={saving} aria-invalid={!!errors[key]} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={opts.placeholder} className={errors[key] ? 'border-destructive' : ''} type={opts.type || 'text'} />
      )}
      {errors[key] && <p className="text-xs text-destructive">{t(`stage6.${key === 'priority_score'?'score_range':'required'}`)}</p>}
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {saveError&&<p role="alert" className="text-sm text-destructive">{t('stage6.save_error')}</p>}
      {/* Identity */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('stage6.identity')}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field(t('stage6.title'), 'title', { required: true, placeholder: 'e.g., CBT Thought Record for Anxiety' })}
          {field(t('stage6.topic'), 'topic', { required: true, placeholder: 'e.g., anxiety, depression, sleep' })}
          {field(t('stage6.subtopic'), 'subtopic', { placeholder: 'e.g., catastrophizing, avoidance' })}
          {field(t('stage6.population'), 'population', { placeholder: 'e.g., adults, adolescents, general' })}
          {field(t('stage6.clinical_goal'), 'clinical_goal', { placeholder: 'e.g., reduce avoidance, challenge distortions' })}
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('stage6.content')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {field(t('stage6.full_content'), 'content', { required: true, textarea: true, rows: 8, placeholder: 'Full clinical content of this chunk…' })}
          {field(t('stage6.short_summary'), 'short_summary', { textarea: true, rows: 3, placeholder: 'Brief summary for retrieval injection…' })}
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('stage6.tags')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              disabled={saving}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              aria-label={t('stage6.tags')} placeholder={t('stage6.add_tags')}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button aria-label={t('stage6.add')} disabled={saving} variant="outline" onClick={addTag} type="button" mobileLabelKey="add"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.tags.map(tag => (
              <Button key={tag} type="button" variant="secondary" className="min-h-11 h-auto max-w-full gap-1 [overflow-wrap:anywhere] whitespace-normal" disabled={saving} aria-label={t('stage6.remove_tag',{tag})} onClick={() => removeTag(tag)}>
                {tag} <X className="w-3 h-3 shrink-0" />
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t('stage6.tags_note')}</p>
        </CardContent>
      </Card>

      {/* Source & Metadata */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('stage6.source_metadata')}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field(t('stage6.source_name'), 'source_name', { placeholder: 'e.g., Beck Institute, NICE Guidelines' })}
          <div className="space-y-1">
            <Label htmlFor="knowledge-source-type">{t('stage6.source_type')}</Label>
            <BottomSheetSelect
              disabled={saving}
              id="knowledge-source-type"
              value={form.source_type || ''}
              onValueChange={v => set('source_type', v)}
              options={SOURCE_TYPES.map(value => ({ value, label: value }))}
              placeholder={t('stage6.choose_option')}
              title={t('stage6.source_type')}
              ariaLabel={t('stage6.source_type')}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="knowledge-license-status">{t('stage6.license_status')}</Label>
            <BottomSheetSelect
              disabled={saving}
              id="knowledge-license-status"
              value={form.license_status || ''}
              onValueChange={v => set('license_status', v)}
              options={LICENSE_STATUSES.map(value => ({ value, label: value }))}
              placeholder={t('stage6.choose_option')}
              title={t('stage6.license_status')}
              ariaLabel={t('stage6.license_status')}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="knowledge-language">{t('stage6.language')}</Label>
            <BottomSheetSelect
              disabled={saving}
              id="knowledge-language"
              value={form.language}
              onValueChange={v => set('language', v)}
              options={LANGUAGES.map(value => ({ value, label: value }))}
              title={t('stage6.language')}
              ariaLabel="Language"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="knowledge-priority">{t('stage6.priority_score')}<span className="text-destructive ml-1">*</span></Label>
            <Input id="knowledge-priority" disabled={saving} type="number" min={0} max={10} step={1} value={form.priority_score} onChange={e => set('priority_score', e.target.value)} className={errors.priority_score ? 'border-destructive' : ''} />
            {errors.priority_score && <p className="text-xs text-destructive">{t('stage6.score_range')}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Safety */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('stage6.safety')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {field(t('stage6.safety_notes'), 'safety_notes', { textarea: true, rows: 3, placeholder: 'Any safety considerations for using this content…' })}
          {field(t('stage6.contraindications'), 'contraindications', { textarea: true, rows: 3, placeholder: 'Conditions where this should NOT be used…' })}
        </CardContent>
      </Card>

      {/* Status & Actions */}
      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Switch disabled={saving} checked={form.is_active} onCheckedChange={v => set('is_active', v)} id="is_active" />
            <Label htmlFor="is_active" className="cursor-pointer">
              {form.is_active ? <><CheckCircle2 className="me-1 inline h-4 w-4" aria-hidden="true" /> {t('stage6.published')}</> : <><FilePenLine className="me-1 inline h-4 w-4" aria-hidden="true" /> {t('stage6.draft')}</>}
            </Label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>{t('stage6.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />{t(`stage6.${saving?'loading':chunk?.id?'update':'create'}`)}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}