import React from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const OPTIONS = [
  { code: 'he', label: 'עברית' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
];

export default function AuthLanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = String(i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const currentLabel = OPTIONS.find((option) => option.code === current)?.label || 'English';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 rounded-full border border-border/70 bg-[hsl(var(--card)/0.97)] px-3 text-primary shadow-sm backdrop-blur"
          aria-label={t('auth.language_label')}
        >
          <Languages className="me-2 h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-semibold">{currentLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 rounded-2xl p-2">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.code}
            onSelect={() => i18n.changeLanguage(option.code)}
            className="min-h-10 rounded-xl"
            dir={option.code === 'he' ? 'rtl' : 'ltr'}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
