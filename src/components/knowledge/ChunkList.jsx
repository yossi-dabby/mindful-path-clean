import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import BottomSheetSelect from '@/components/ui/bottom-sheet-select';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

const LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];

export default function ChunkList({ onEdit, onNew }) {
  const {t,i18n}=useTranslation();
  const [deleting,setDeleting]=useState(false);
  const [deleteError,setDeleteError]=useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [filters, setFilters] = useState({
    topic: '', subtopic: '', language: 'all', is_active: 'all', priority_min: '', priority_max: ''
  });
  const [search, setSearch] = useState('');

  const { data: chunks = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['trustedCBTChunks'],
    queryFn: () => base44.entities.TrustedCBTChunk.list('-priority_score', 200),
  });

  const handleDelete = async () => {
    if(deleting || !pendingDelete) return;
    setDeleting(true);setDeleteError(false);
    try {
      await base44.entities.TrustedCBTChunk.delete(pendingDelete.id);
      queryClient.invalidateQueries({ queryKey: ['trustedCBTChunks'] });
      toast({ title: t('stage6.saved') });
      setPendingDelete(null);
    } catch (e) {
      setDeleteError(true);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = chunks.filter(c => {
    if (filters.topic && !c.topic?.toLowerCase().includes(filters.topic.toLowerCase())) return false;
    if (filters.subtopic && !c.subtopic?.toLowerCase().includes(filters.subtopic.toLowerCase())) return false;
    if (filters.language !== 'all' && c.language !== filters.language) return false;
    if (filters.is_active !== 'all' && String(c.is_active) !== filters.is_active) return false;
    if (filters.priority_min !== '' && (c.priority_score ?? 0) < Number(filters.priority_min)) return false;
    if (filters.priority_max !== '' && (c.priority_score ?? 0) > Number(filters.priority_max)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.title?.toLowerCase().includes(q) || c.topic?.toLowerCase().includes(q) || c.tags?.join(' ').includes(q));
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-0 basis-52">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input aria-label={t('stage6.search_chunks')} placeholder={t('stage6.search_chunks')} className="ps-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Input aria-label={t('stage6.topic')} placeholder={t('stage6.topic')} className="w-32" value={filters.topic} onChange={e => setFilters(f => ({ ...f, topic: e.target.value }))} />
        <Input aria-label={t('stage6.subtopic')} placeholder={t('stage6.subtopic')} className="w-32" value={filters.subtopic} onChange={e => setFilters(f => ({ ...f, subtopic: e.target.value }))} />
        <BottomSheetSelect
          id="knowledge-filter-language"
          value={filters.language}
          onValueChange={v => setFilters(f => ({ ...f, language: v }))}
          options={[{ value: 'all', label: t('stage6.all_languages') }, ...LANGUAGES.map(value => ({ value, label: value }))]}
          title={t('stage6.filter_language')}
          ariaLabel={t('stage6.filter_language')}
          className="w-32"
        />
        <BottomSheetSelect
          id="knowledge-filter-status"
          value={filters.is_active}
          onValueChange={v => setFilters(f => ({ ...f, is_active: v }))}
          options={[
            { value: 'all', label: t('stage6.all_status') },
            { value: 'true', label: t('stage6.published') },
            { value: 'false', label: t('stage6.draft') }
          ]}
          title={t('stage6.filter_status')}
          ariaLabel={t('stage6.filter_status')}
          className="w-36"
        />
        <Input aria-label={t('stage6.min_score')} placeholder={t('stage6.min_score')} type="number" className="w-24" value={filters.priority_min} onChange={e => setFilters(f => ({ ...f, priority_min: e.target.value }))} />
        <Input aria-label={t('stage6.max_score')} placeholder={t('stage6.max_score')} type="number" className="w-24" value={filters.priority_max} onChange={e => setFilters(f => ({ ...f, priority_max: e.target.value }))} />
        <Button onClick={onNew} className="ms-auto gap-2" mobileLabelKey="add"><Plus className="w-4 h-4" /> {t('stage6.new_chunk')}</Button>
      </div>

      <p className="text-xs text-muted-foreground">{t('stage6.chunk_count',{count:filtered.length,total:chunks.length})}</p>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t('stage6.loading')}</p>
      ) : isError ? <div role="alert"><p>{t('stage6.load_error')}</p><Button onClick={()=>refetch()}>{t('stage6.retry')}</Button></div> : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t('stage6.chunks_empty')}</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(chunk => (
            <Card key={chunk.id} className="border border-border/60">
              <CardContent className="p-4 flex flex-wrap gap-3 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 items-center mb-1">
                    <span className="font-medium [overflow-wrap:anywhere]">{chunk.title}</span>
                    <Badge variant={chunk.is_active ? 'default' : 'secondary'} className="text-xs">
                      {t(`stage6.${chunk.is_active?'published':'draft'}`)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{chunk.language || 'en'}</Badge>
                    <span className="text-xs text-muted-foreground">score: {chunk.priority_score ?? 5}</span>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                    {chunk.topic && <span className="bg-secondary px-1.5 py-0.5 rounded">{chunk.topic}</span>}
                    {chunk.subtopic && <span className="bg-secondary px-1.5 py-0.5 rounded">{chunk.subtopic}</span>}
                    {(chunk.tags || []).slice(0, 5).map(t => (
                      <span key={t} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                    {(chunk.tags || []).length > 5 && <span>+{chunk.tags.length - 5} more</span>}
                  </div>
                  {chunk.short_summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{chunk.short_summary}</p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" aria-label={t('stage6.edit')} onClick={() => onEdit(chunk)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label={t('stage6.delete')} onClick={() => {setDeleteError(false);setPendingDelete(chunk);}} mobileLabelKey="delete"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={open => !open && !deleting && setPendingDelete(null)}>
        <AlertDialogContent dir={i18n.dir()} className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('stage6.delete_chunk')}</AlertDialogTitle>
            <AlertDialogDescription>{t('stage6.chunk_delete_body',{title:pendingDelete?.title})}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError&&<p role="alert" className="text-sm text-destructive">{t('stage6.delete_error')}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('stage6.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" disabled={deleting} onClick={event=>{event.preventDefault();handleDelete();}}>{t('stage6.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}