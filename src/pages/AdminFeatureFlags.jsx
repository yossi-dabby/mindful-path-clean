import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AiRuntimeCapabilitiesPanel from '@/components/admin/AiRuntimeCapabilitiesPanel';

const FLAG_KEYS = [
  'THERAPIST_UPGRADE_ENABLED',
  'THERAPIST_UPGRADE_MEMORY_ENABLED',
  'THERAPIST_UPGRADE_WORKFLOW_ENABLED',
];

// Expected "fully upgraded" target state (what preview/sandbox has enabled)
const TARGET_STATE = {
  THERAPIST_UPGRADE_ENABLED: true,
  THERAPIST_UPGRADE_MEMORY_ENABLED: true,
  THERAPIST_UPGRADE_WORKFLOW_ENABLED: true,
};

const FLAG_DESCRIPTIONS = {
  THERAPIST_UPGRADE_ENABLED: 'Master gate — enables the Stage 2 therapist upgrade path.',
  THERAPIST_UPGRADE_MEMORY_ENABLED: 'Phase 1 — structured memory layer (retrieveTherapistMemory / writeTherapistMemory).',
  THERAPIST_UPGRADE_WORKFLOW_ENABLED: 'Phase 3 — therapist workflow engine (context injection + session phases).',
};

export default function AdminFeatureFlags() {
  const {t}=useTranslation();
  const [flags, setFlags] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { data: user, isLoading: loadingUser, isError: userError, refetch: refetchUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const fetchFlags = useCallback(async () => {
    if(user?.role !== 'admin') return;
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('adminFeatureFlags', { action: 'get' });
      if(!res.data?.flags) throw new Error('Missing flags');
      setFlags(res.data.flags);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [user?.role]);
  useEffect(() => { fetchFlags(); }, [fetchFlags]);
  if(loadingUser) return <p role="status" className="p-6">{t('stage6.loading')}</p>;
  if(userError) return <div role="alert" className="p-6"><p>{t('stage6.load_error')}</p><Button onClick={()=>refetchUser()}>{t('stage6.retry')}</Button></div>;
  if(user?.role !== 'admin') return <div className="p-6 space-y-3"><h1 className="text-2xl font-semibold">{t('stage6.access_denied')}</h1><p>{t('stage6.admin_only')}</p></div>;

  const inSync = flags
    ? FLAG_KEYS.every(k => flags[k] === TARGET_STATE[k])
    : false;

  const diffKeys = flags ? FLAG_KEYS.filter(k => flags[k] !== TARGET_STATE[k]) : [];

  return (
    <div className="max-w-2xl min-w-0 mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('stage6.flags_title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('stage6.flags_intro')}
        </p>
      </div>

      {loading && (
        <div role="status" className="flex items-center gap-2 text-muted-foreground text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> {t('stage6.loading')}
        </div>
      )}

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4" /> {t('stage6.load_error')} <Button onClick={fetchFlags}>{t('stage6.retry')}</Button>
        </div>
      )}

      {flags && (
        <>
          {/* Sync Status Banner */}
          <Card className={inSync ? 'border-green-400/60 bg-green-50 dark:bg-green-950/20' : 'border-amber-400/60 bg-amber-50 dark:bg-amber-950/20'}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              {inSync
                ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                : <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />}
              <div>
                <p className="font-semibold text-sm">
                  {inSync ? t('stage6.flags_synced') : t('stage6.flags_differ',{count:diffKeys.length})}
                </p>
                {!inSync && (
                  <p className="text-xs text-foreground mt-0.5 [overflow-wrap:anywhere]">
                    {diffKeys.join(', ')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Flag Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('stage6.current_target')}</CardTitle>
              <CardDescription className="text-xs">
                "Production" = current server-side env vars. "Target (Sandbox)" = expected fully-upgraded state.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {FLAG_KEYS.map(key => {
                const prod = flags[key];
                const target = TARGET_STATE[key];
                const diff = prod !== target;
                return (
                  <div key={key} className={`rounded-lg border p-3 ${diff ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/10' : 'border-border'}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-foreground [overflow-wrap:anywhere]">{key}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t('stage6.production')}:</span>
                        {prod
                          ? <Badge className="bg-green-100 text-green-800 border-green-300">true</Badge>
                          : <Badge variant="outline" className="text-red-600 border-red-300">false</Badge>}
                        <span className="text-xs text-muted-foreground">{t('stage6.target')}:</span>
                        {target
                          ? <Badge className="bg-green-100 text-green-800 border-green-300">true</Badge>
                          : <Badge variant="outline" className="text-red-600 border-red-300">false</Badge>}
                        {diff
                          ? <XCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          : <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{FLAG_DESCRIPTIONS[key]}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={fetchFlags} disabled={loading} className="gap-2" mobileLabelKey="refresh">
              <RefreshCw className="w-4 h-4" /> {t('stage6.refresh')}
            </Button>
            {!inSync && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                To sync production, set the differing flags to their target values in the Base44 dashboard → Settings → Environment Variables.
              </div>
            )}
          </div>
        </>
      )}

      {/* AI Runtime Capabilities Diagnostic */}
      <AiRuntimeCapabilitiesPanel user={user} />
    </div>
  );
}