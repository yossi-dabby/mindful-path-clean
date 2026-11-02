import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteAccount } from '@/lib/platform';
import { Trash2, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DeleteAccountFlow({ userRole }) {
  const { t, i18n } = useTranslation();
  const [confirmationText, setConfirmationText] = useState('');
  const [open, setOpen] = useState(false);
  const isAdmin = userRole === 'admin';

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await deleteAccount();
    },
    // onSuccess is a no-op: deleteAccount() calls performLogout() which
    // triggers a full page reload before this callback would run.
  });

  const handleOpenChange = (val) => {
    if (deleteAccountMutation.isPending) return;
    deleteAccountMutation.reset();
    setOpen(val);
    if (!val) setConfirmationText('');
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          data-testid="delete-account-button"
          data-account-deletion="trigger"
          aria-label={t('settings.account.delete_account')}
          className="w-full rounded-xl border-red-300 text-red-600 active:bg-red-100"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {t('settings.account.delete_account')}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent dir={i18n.dir()} className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-700 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            {t('settings.account.delete_confirm_title')}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isAdmin ? (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    {t('settings.account.delete_admin_blocked')}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.account.delete_confirm_description')}
                  </p>
                  <div>
                    <label htmlFor="delete-account-confirmation" className="mb-1.5 block text-sm font-medium text-foreground">
                      {t('settings.account.delete_confirm_label')}
                    </label>
                    <Input
                      id="delete-account-confirmation"
                      disabled={deleteAccountMutation.isPending}
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder={t('settings.account.delete_confirm_placeholder')}
                      className="rounded-xl bg-[hsl(var(--card)/0.97)]"
                      autoCapitalize="characters"
                      autoComplete="off"
                      data-testid="delete-account-input"
                    />
                  </div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {deleteAccountMutation.isError && <p role="alert" className="text-sm text-destructive">{t('stage6.delete_error')}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteAccountMutation.isPending} data-testid="delete-account-cancel-button" className="rounded-xl">{t('common.cancel')}</AlertDialogCancel>
          {!isAdmin && (
            <AlertDialogAction
              data-testid="delete-account-confirm-button"
              onClick={(e) => {
                e.preventDefault();
                deleteAccountMutation.mutate();
              }}
              disabled={confirmationText.trim() !== 'DELETE' || deleteAccountMutation.isPending}
              className="rounded-xl bg-red-600 text-white active:bg-red-700"
            >
              {deleteAccountMutation.isPending
                ? t('settings.account.delete_deleting')
                : t('settings.account.delete_confirm_button')}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}