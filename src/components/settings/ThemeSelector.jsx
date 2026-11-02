import React from 'react';
import { useTheme } from 'next-themes';
import { APPEARANCE_PALETTES } from '@/lib/appearancePalettes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function ThemeSelector({ currentTheme, onThemeChange, disabled = false }) {
  const { t } = useTranslation();
  const { theme: mode, setTheme: setMode } = useTheme();
  
  const themes = [
    {
      id: 'default',
      name: t('settings.theme.default.name'),
      description: t('settings.theme.default.description'),
      preview: 'bg-gradient-to-br from-green-50 via-purple-50 to-blue-50',
      colors: null
    },
    {
      id: 'ocean',
      name: t('settings.theme.ocean.name'),
      description: t('settings.theme.ocean.description'),
      preview: 'bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50',
      colors: null
    },
    {
      id: 'sunset',
      name: t('settings.theme.sunset.name'),
      description: t('settings.theme.sunset.description'),
      preview: 'bg-gradient-to-br from-orange-50 via-pink-50 to-rose-50',
      colors: null
    },
    {
      id: 'forest',
      name: t('settings.theme.forest.name'),
      description: t('settings.theme.forest.description'),
      preview: 'bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50',
      colors: null
    },
    {
      id: 'lavender',
      name: t('settings.theme.lavender.name'),
      description: t('settings.theme.lavender.description'),
      preview: 'bg-gradient-to-br from-purple-50 via-violet-50 to-fuchsia-50',
      colors: null
    },
    {
      id: 'minimal',
      name: t('settings.theme.minimal.name'),
      description: t('settings.theme.minimal.description'),
      preview: 'bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-50',
      colors: null
    }
  ];
  
  return (
    <Card className="settings-surface overflow-hidden border border-border/70 bg-[hsl(var(--card)/0.97)] shadow-[0_16px_50px_rgba(15,118,110,0.10)] backdrop-blur-xl">
      <CardHeader className="border-b border-border p-5 sm:p-6">
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          {t('settings.theme.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5"><p className="mb-2 text-sm font-semibold text-foreground">{t('stage6.appearance_mode')}</p><div className="flex flex-wrap gap-2" role="group" aria-label={t('stage6.appearance_mode')}>{['light','dark','system'].map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className="min-h-11 min-w-11 rounded-xl border border-border bg-card px-4 text-sm text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground">{t('stage6.' + value)}</button>)}</div></div>
        <p className="text-sm text-muted-foreground mb-4">
          {t('settings.theme.description')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {themes.map((theme, index) => (
            <motion.button
              key={theme.id}
              disabled={disabled}
              onClick={() => onThemeChange({ ...theme, colors: APPEARANCE_PALETTES[theme.id] })}
              className={cn(
                'relative min-h-[148px] p-4 rounded-2xl border-2 transition-all text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
                currentTheme === theme.id
                  ? 'border-primary bg-secondary shadow-md'
                  : 'border-border bg-card hover:border-primary hover:shadow-sm'
              )}
              whileTap={{ scale: 0.99 }}
              aria-pressed={currentTheme === theme.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <div className={cn('h-20 rounded-lg mb-3', theme.preview)} />
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{theme.name}</h3>
                  <p className="text-xs text-foreground">{theme.description}</p>
                </div>
                {currentTheme === theme.id && (
                  <motion.div 
                    className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}