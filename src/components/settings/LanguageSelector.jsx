import React, { useState } from 'react';
import { saveUserPreferences } from '@/lib/userPreferences';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Languages, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { changeAppLocale, getCurrentAppLocale } from '../i18n/appLocale';

const languages = [
  { code: 'en', flag: '🇬🇧', native: 'English' },
  { code: 'he', flag: '🇮🇱', native: 'עברית', rtl: true },
  { code: 'es', flag: '🇪🇸', native: 'Español' },
  { code: 'fr', flag: '🇫🇷', native: 'Français' },
  { code: 'de', flag: '🇩🇪', native: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', native: 'Italiano' },
  { code: 'pt', flag: '🇧🇷', native: 'Português' }
];

export default function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const currentLang = getCurrentAppLocale(i18n);

  const handleLanguageChange = async (langCode) => {
    if (saving) return;
    setSaving(true); setSaveError(false);
    try {
      await changeAppLocale(i18n, langCode);
      const user = await base44.auth.me();
      await saveUserPreferences({ language: langCode }, user.id);
    } catch { setSaveError(true); }
    finally { setSaving(false); }
  };

  return (
    <Card className="settings-surface overflow-hidden border border-border/70 bg-[hsl(var(--card)/0.97)] shadow-[0_16px_50px_rgba(15,118,110,0.10)] backdrop-blur-xl">
      <CardHeader className="border-b border-border p-5 sm:p-6">
        <CardTitle className="flex items-center gap-2">
          <Languages className="w-5 h-5 text-muted-foreground" />
          {t('settings.language.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        <p className="text-sm text-muted-foreground mb-4">
          {t('settings.language.description')}
        </p>
        
        {/* Language Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {languages.map((lang, index) => {
            const isSelected = currentLang === lang.code;
            
            return (
              <motion.button
                key={lang.code}
                disabled={saving}
                onClick={() => handleLanguageChange(lang.code)}
                className={cn(
                  'relative min-h-[78px] p-4 rounded-2xl border-2 transition-all text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
                  isSelected
                    ? 'border-primary bg-secondary shadow-md'
                    : 'border-border bg-card hover:border-primary hover:shadow-sm'
                )}
                whileTap={{ scale: 0.99 }}
                aria-pressed={isSelected}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-2xl flex-shrink-0">{lang.flag}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className={cn(
                        "font-semibold text-foreground truncate",
                        lang.rtl && "text-right"
                      )}>
                        {lang.native}
                      </h3>
                      <p className="text-xs text-foreground truncate">
                        {t(`settings.language.${lang.code}`)}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <motion.div 
                      className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ms-1"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
        
        {saveError && <div role="alert" className="mt-4 space-y-2 rounded-xl border border-destructive/40 bg-card p-3 text-sm text-foreground"><p>{t('stage6.language_local')}</p><Button variant="outline" onClick={() => handleLanguageChange(currentLang)}>{t('stage6.retry')}</Button></div>}
        {/* Current Language Display */}
        <div className="mt-4 p-3 rounded-2xl bg-secondary/70 border border-border">
          <p className="text-xs text-primary">
            <strong>{t('settings.language.current')}:</strong>{' '}
            {languages.find(l => l.code === currentLang)?.native || 'English'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}