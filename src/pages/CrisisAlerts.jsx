import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BottomSheetSelect from '@/components/ui/bottom-sheet-select';
import { AlertTriangle, Filter, MessageCircle, Brain, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const surfaceIcons = {
  chat: MessageCircle,
  companion: Brain,
  coach: Target
};

const reasonColors = {
  self_harm: 'bg-red-100 text-red-800 border-red-300',
  suicide: 'bg-red-100 text-red-800 border-red-300',
  overdose: 'bg-orange-100 text-orange-800 border-orange-300',
  immediate_danger: 'bg-red-100 text-red-800 border-red-300',
  general_crisis: 'bg-yellow-100 text-yellow-800 border-yellow-300'
};

export default function CrisisAlerts() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const reasonLabels = {
    self_harm: t('crisis_alerts.reasons.self_harm'),
    suicide: t('crisis_alerts.reasons.suicide'),
    overdose: t('crisis_alerts.reasons.overdose'),
    immediate_danger: t('crisis_alerts.reasons.immediate_danger'),
    general_crisis: t('crisis_alerts.reasons.general_crisis')
  };

  const surfaceOptions = [
    { value: 'all', label: t('crisis_alerts.all_surfaces') },
    { value: 'chat', label: t('crisis_alerts.therapist_chat') },
    { value: 'companion', label: t('crisis_alerts.ai_companion') },
    { value: 'coach', label: t('crisis_alerts.coach_chat') },
  ];

  const reasonOptions = [
    { value: 'all', label: t('crisis_alerts.all_reasons') },
    { value: 'self_harm', label: t('crisis_alerts.reasons.self_harm') },
    { value: 'suicide', label: t('crisis_alerts.reasons.suicide') },
    { value: 'overdose', label: t('crisis_alerts.reasons.overdose') },
    { value: 'immediate_danger', label: t('crisis_alerts.reasons.immediate_danger') },
    { value: 'general_crisis', label: t('crisis_alerts.reasons.general_crisis') },
  ];

  const [surfaceFilter, setSurfaceFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const {data:user,isLoading:checkingUser,isError:userError,refetch:refetchUser}=useQuery({
    queryKey:['currentUser'],queryFn:()=>base44.auth.me()
  });
  const isAdmin=user?.role==='admin';

  const { data: alerts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['crisisAlerts', surfaceFilter, reasonFilter],
    queryFn: async () => {
      let query = {};
      if (surfaceFilter !== 'all') query.surface = surfaceFilter;
      if (reasonFilter !== 'all') query.reason_code = reasonFilter;
      
      const results = await base44.entities.CrisisAlert.filter(query, '-created_date', 100);
      return results;
    },
    enabled: isAdmin
  });

  if(userError) return <div role="alert" className="p-6"><p>{t('stage6.load_error')}</p><Button onClick={()=>refetchUser()}>{t('stage6.retry')}</Button></div>;
  if (checkingUser) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <p role="status" className="text-muted-foreground">{t('crisis_alerts.loading_check')}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('crisis_alerts.admin_required_title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('crisis_alerts.admin_required_description')}
            </p>
            <Button onClick={() => navigate('/')}>
              {t('crisis_alerts.return_home')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-4 md:p-6 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div className="botanical-title-row"><h1 className="text-3xl font-bold text-foreground">{t('crisis_alerts.title')}</h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
          </div>
          <p className="text-muted-foreground">
            {t('crisis_alerts.subtitle')}
          </p>
        </div>

        {/* Filters */}
        <Card data-testid="crisis-alerts-filters" className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{t('crisis_alerts.filters_label')}</span>
              </div>
              
              <BottomSheetSelect
                data-testid="surface-filter"
                value={surfaceFilter}
                onValueChange={setSurfaceFilter}
                options={surfaceOptions}
                title={t('crisis_alerts.all_surfaces')}
                className="w-40"
              />

              <BottomSheetSelect
                data-testid="reason-filter"
                value={reasonFilter}
                onValueChange={setReasonFilter}
                options={reasonOptions}
                title={t('crisis_alerts.all_reasons')}
                className="w-40"
              />

              <div className="ms-auto text-sm text-muted-foreground">
                {t('crisis_alerts.alert_count', { count: alerts.length, unit: alerts.length === 1 ? t('crisis_alerts.alert_singular') : t('crisis_alerts.alert_plural') })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <div data-testid="crisis-alerts-list" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">{t('crisis_alerts.loading_alerts')}</p>
              </CardContent>
            </Card>
          ) : isError ? <Card><CardContent role="alert" className="p-6 space-y-3"><p>{t('stage6.load_error')}</p><Button onClick={()=>refetch()}>{t('stage6.retry')}</Button></CardContent></Card> : alerts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-muted-foreground">{t('crisis_alerts.no_alerts')}</p>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => {
              const SurfaceIcon = surfaceIcons[alert.surface] || AlertTriangle;
              const date=new Date(alert.created_date);
              const dateText=Number.isNaN(date.getTime())?t('stage6.unknown_date'):new Intl.DateTimeFormat(i18n.resolvedLanguage||'en',{dateStyle:'medium',timeStyle:'short'}).format(date);
              return (
                <Card key={alert.id} data-testid={`alert-item-${alert.id}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <SurfaceIcon className="w-5 h-5 text-red-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="outline" className="capitalize">
                            {surfaceOptions.find(option=>option.value===alert.surface)?.label || alert.surface}
                          </Badge>
                          <Badge className={reasonColors[alert.reason_code]}>
                            {reasonLabels[alert.reason_code]}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                          <p>
                            <span className="font-medium">{t('crisis_alerts.time_label')}</span>{' '}
                            {dateText}
                          </p>
                          <p>
                            <span className="font-medium">{t('crisis_alerts.user_label')}</span>{' '}
                            {alert.user_email}
                          </p>
                          {alert.conversation_id && alert.conversation_id !== 'none' && (
                            <p className="[overflow-wrap:anywhere]">
                              <span className="font-medium">{t('crisis_alerts.conversation_label')}</span>{' '}
                              <code className="text-xs bg-secondary px-1 py-0.5 rounded">
                                {alert.conversation_id}
                              </code>
                            </p>
                          )}
                          {alert.session_id && (
                            <p className="[overflow-wrap:anywhere]">
                              <span className="font-medium">{t('crisis_alerts.session_label')}</span>{' '}
                              <code className="text-xs bg-secondary px-1 py-0.5 rounded">
                                {alert.session_id}
                              </code>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}