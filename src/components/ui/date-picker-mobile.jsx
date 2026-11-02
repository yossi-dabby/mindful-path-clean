import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { de, enUS, es, fr, he, it, ptBR } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { getAppFormattingLocale, getCurrentAppLocale } from '@/components/i18n/appLocale';

const DATE_FNS_LOCALES = { en: enUS, he, es, fr, de, it, pt: ptBR };

export default function DatePickerMobile({ value, onChange, placeholder, minDate }) {
  const { t, i18n } = useTranslation();
  const appLocale = getCurrentAppLocale(i18n);
  const dateFnsLocale = DATE_FNS_LOCALES[appLocale] || enUS;
  const formattingLocale = getAppFormattingLocale(appLocale);
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : undefined);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    setSelectedDate(value ? new Date(value) : undefined);
  }, [value]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onChange(format(selectedDate, 'yyyy-MM-dd'));
    }
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedDate(undefined);
    onChange('');
    setOpen(false);
  };

  // Desktop: use native date input
  if (!isMobile) {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        min={minDate}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
    );
  }

  // Mobile: use bottom sheet with Calendar component
  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-start text-left font-normal"
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? new Intl.DateTimeFormat(formattingLocale, { dateStyle: 'long' }).format(new Date(value)) : <span className="text-muted-foreground">{placeholder || t('date_picker.placeholder')}</span>}
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('date_picker.select_date')}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => minDate && date < new Date(minDate)}
              locale={dateFnsLocale}
              initialFocus
            />
          </div>
          <DrawerFooter className="flex flex-row gap-2">
            <Button variant="outline" onClick={handleClear} className="flex-1">
              {t('date_picker.clear')}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1">
                {t('date_picker.cancel')}
              </Button>
            </DrawerClose>
            <Button onClick={handleConfirm} className="flex-1">
              {t('date_picker.confirm')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}