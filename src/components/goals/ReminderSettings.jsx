import { useTranslation } from 'react-i18next';
import PremiumDialog from '@/components/ui/PremiumDialog';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BottomSheetSelect from '@/components/ui/bottom-sheet-select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, Trash2, Plus, Mail, AppWindow, Check } from 'lucide-react';

const REMINDER_TYPE_OPTIONS = [
  { value: 'goal_deadline', label: 'Goal Deadline' },
  { value: 'milestone_deadline', label: 'Milestone Deadline' },
  { value: 'weekly_checkin', label: 'Weekly Check-in' },
  { value: 'custom', label: 'Custom' },
];

const NOTIFICATION_METHOD_OPTIONS = [
  { value: 'both', label: 'Email + In-App' },
  { value: 'email', label: 'Email Only' },
  { value: 'in_app', label: 'In-App Only' },
];

const FREQUENCY_OPTIONS = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function ReminderSettings({ goal, onClose }) {
  const { t, i18n } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    reminder_type: 'goal_deadline',
    days_before: 3,
    notification_method: 'both',
    frequency: 'once',
    active: true
  });

  const reminderTypes = REMINDER_TYPE_OPTIONS.map(option => ({ ...option, label: t(`path_ui.${option.value === 'goal_deadline' ? 'deadline' : option.value}`) }));
  const methods = NOTIFICATION_METHOD_OPTIONS.map(option => ({ ...option, label: t(`path_ui.${option.value}`) }));
  const frequencies = FREQUENCY_OPTIONS.map(option => ({ ...option, label: t(`path_ui.${option.value}`) }));
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['goalReminders', goal.id],
    queryFn: () => base44.entities.GoalReminder.filter({ goal_id: goal.id })
  });

  const createReminder = useMutation({
    mutationFn: (data) => base44.entities.GoalReminder.create({
      ...data,
      goal_id: goal.id
    }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['goalReminders', goal.id] });
      const previousReminders = queryClient.getQueryData(['goalReminders', goal.id]);
      queryClient.setQueryData(['goalReminders', goal.id], (old = []) => [{
        ...data,
        goal_id: goal.id,
        id: `temp-${Date.now()}`
      }, ...old]);
      return { previousReminders };
    },
    onSuccess: () => {
      setShowAddForm(false);
      setNewReminder({
        reminder_type: 'goal_deadline',
        days_before: 3,
        notification_method: 'both',
        frequency: 'once',
        active: true
      });
    },
    onError: (_error, _variables, context) => {
      if (context?.previousReminders) {
        queryClient.setQueryData(['goalReminders', goal.id], context.previousReminders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goalReminders', goal.id] });
    }
  });

  const toggleReminder = useMutation({
    mutationFn: ({ id, active }) => base44.entities.GoalReminder.update(id, { active }),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: ['goalReminders', goal.id] });
      const previousReminders = queryClient.getQueryData(['goalReminders', goal.id]);
      queryClient.setQueryData(['goalReminders', goal.id], (old = []) =>
        old.map((reminder) => reminder.id === id ? { ...reminder, active } : reminder)
      );
      return { previousReminders };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousReminders) {
        queryClient.setQueryData(['goalReminders', goal.id], context.previousReminders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goalReminders', goal.id] });
    }
  });

  const deleteReminder = useMutation({
    mutationFn: (id) => base44.entities.GoalReminder.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['goalReminders', goal.id] });
      const previousReminders = queryClient.getQueryData(['goalReminders', goal.id]);
      queryClient.setQueryData(['goalReminders', goal.id], (old = []) => old.filter((reminder) => reminder.id !== id));
      return { previousReminders };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousReminders) {
        queryClient.setQueryData(['goalReminders', goal.id], context.previousReminders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goalReminders', goal.id] });
    }
  });

  const handleAddReminder = () => {
    const reminderData = { ...newReminder };
    
    if (newReminder.reminder_type === 'weekly_checkin') {
      reminderData.frequency = 'weekly';
      delete reminderData.days_before;
    }
    
    createReminder.mutate(reminderData);
  };

  const getReminderTypeLabel = (type) => {
    return reminderTypes.find(option => option.value === type)?.label || type;
  };

  const getMethodIcon = (method) => {
    if (method === 'email') return <Mail className="w-3 h-3" />;
    if (method === 'in_app') return <AppWindow className="w-3 h-3" />;
    return <><Mail className="w-3 h-3" /><AppWindow className="w-3 h-3" /></>;
  };

  return (
    <PremiumDialog onClose={onClose} label={t('goals.card.reminders')} className="goal-dialog fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {t('path_ui.reminders')}
            </CardTitle>
            <Button variant="ghost" aria-label={t('goals.form.close_aria')} onClick={onClose}>✕</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('path_ui.reminder_intro', { title: goal.title })}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('path_ui.loading_reminders')}</p>
          ) : (
            <>
              {reminders.length > 0 && (
                <div className="space-y-2">
                  {reminders.map((reminder) => (
                    <div 
                      key={reminder.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {getReminderTypeLabel(reminder.reminder_type)}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            {getMethodIcon(reminder.notification_method)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {reminder.reminder_type === 'goal_deadline' && 
                            t('path_ui.before_goal', { count: reminder.days_before })}
                          {reminder.reminder_type === 'milestone_deadline' && 
                            t('path_ui.before_milestone', { count: reminder.days_before })}
                          {reminder.reminder_type === 'weekly_checkin' && 
                            t('path_ui.weekly')}
                          {reminder.reminder_type === 'custom' && 
                            reminder.custom_message?.substring(0, 50)}
                        </p>
                        {reminder.last_sent && (
                          <p className="text-xs text-gray-400 mt-1">
                            {t('path_ui.last_sent')}: {new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(reminder.last_sent))}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={reminder.active}
                          onCheckedChange={(active) => 
                            toggleReminder.mutate({ id: reminder.id, active })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(t('path_ui.delete_confirm'))) {
                              deleteReminder.mutate(reminder.id);
                            }
                          }}
                          aria-label={t('path_ui.delete_reminder')}
                         mobileLabelKey="delete">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showAddForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(true)}
                  className="w-full"
                 mobileLabelKey="add">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('path_ui.add')}
                </Button>
              ) : (
                <div className="border rounded-lg p-4 space-y-4 bg-secondary/50">
                  <div className="space-y-2">
                    <Label>{t('path_ui.type')}</Label>
                    <BottomSheetSelect
                      value={newReminder.reminder_type}
                      onValueChange={(value) => 
                        setNewReminder({ ...newReminder, reminder_type: value })
                      }
                      options={reminderTypes}
                      title={t('path_ui.type')}
                    />
                  </div>

                  {(newReminder.reminder_type === 'goal_deadline' || 
                    newReminder.reminder_type === 'milestone_deadline') && (
                    <div className="space-y-2">
                      <Label>{t('path_ui.days_before')}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newReminder.days_before}
                        onChange={(e) => 
                          setNewReminder({ ...newReminder, days_before: parseInt(e.target.value) })
                        }
                      />
                    </div>
                  )}

                  {newReminder.reminder_type === 'milestone_deadline' && (
                    <div className="space-y-2">
                      <Label>{t('path_ui.select_milestone')}</Label>
                      <BottomSheetSelect
                        value={newReminder.milestone_index?.toString()}
                        onValueChange={(value) => 
                          setNewReminder({ ...newReminder, milestone_index: parseInt(value) })
                        }
                        options={(goal.milestones || []).map((m, idx) => ({
                          value: idx.toString(),
                          label: m.title || t('goals.card.step_default', { number: idx + 1 }),
                        }))}
                        placeholder={t('path_ui.select_milestone')}
                        title={t('path_ui.select_milestone')}
                      />
                    </div>
                  )}

                  {newReminder.reminder_type === 'custom' && (
                    <div className="space-y-2">
                      <Label>{t('path_ui.message')}</Label>
                      <Input
                        placeholder={t('path_ui.message_placeholder')}
                        value={newReminder.custom_message || ''}
                        onChange={(e) => 
                          setNewReminder({ ...newReminder, custom_message: e.target.value })
                        }
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{t('path_ui.send_via')}</Label>
                    <BottomSheetSelect
                      value={newReminder.notification_method}
                      onValueChange={(value) => 
                        setNewReminder({ ...newReminder, notification_method: value })
                      }
                      options={methods}
                      title={t('path_ui.send_via')}
                    />
                  </div>

                  {newReminder.reminder_type !== 'weekly_checkin' && (
                    <div className="space-y-2">
                      <Label>{t('path_ui.frequency')}</Label>
                      <BottomSheetSelect
                        value={newReminder.frequency}
                        onValueChange={(value) => 
                          setNewReminder({ ...newReminder, frequency: value })
                        }
                        options={frequencies}
                        title={t('path_ui.frequency')}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddReminder}
                      disabled={createReminder.isPending}
                      className="min-w-0 flex-1"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {t('path_ui.create')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                    >
                      {t('goals.form.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </PremiumDialog>
  );
}