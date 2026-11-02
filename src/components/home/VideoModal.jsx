import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import PremiumDialog from '@/components/ui/PremiumDialog';

export default function VideoModal({ videoUrl, onClose }) {
  const { t } = useTranslation();
  return (
    <PremiumDialog label={t('home_practice.media.video')} onClose={onClose} className="fixed inset-0 overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex min-h-full items-center justify-center" onClick={onClose}>
        <section className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-border bg-card text-foreground shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <header className="flex items-center justify-between gap-3 px-5 py-3">
            <h2 className="text-lg font-semibold">{t('home_practice.media.video')}</h2>
            <Button onClick={onClose} size="icon" variant="ghost" aria-label={t('common.close')}><X className="h-5 w-5" /></Button>
          </header>
          <video className="max-h-[calc(100dvh-9rem)] w-full bg-black object-contain" controls autoPlay playsInline src={videoUrl}>
            {t('video_player.browser_no_support')}
          </video>
        </section>
      </div>
    </PremiumDialog>
  );
}
