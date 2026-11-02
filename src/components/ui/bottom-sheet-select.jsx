/**
 * BottomSheetSelect — mobile-first select replacement using Vaul Drawer.
 * On desktop it falls back to a standard popover-style list.
 * Safe to use everywhere a native <select> or Radix Select was used.
 */
import { useTranslation } from 'react-i18next';
import React, { useRef, useState } from 'react';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * @param {object}   props
 * @param {string}   props.value            - Current selected value
 * @param {function} props.onValueChange    - Called with the new value string
 * @param {Array}    props.options           - [{value, label}]
 * @param {string}   [props.placeholder]    - Trigger placeholder text
 * @param {string}   [props.title]          - Sheet header title
 * @param {string}   [props.className]      - Extra classes on the trigger button
 * @param {string}   [props.id]             - Trigger id for an associated label
 * @param {string}   [props.ariaLabel]      - Accessible trigger label
 * @param {boolean}  [props.disabled]
 * @param {boolean}  [props.autoFocus]       - Focus options when used inside another dialog
 */
export default function BottomSheetSelect({
  value,
  onValueChange,
  options = [],
  placeholder,
  title,
  className,
  id,
  ariaLabel,
  disabled = false,
  autoFocus = true,
  ...triggerProps
}) {
  const {t,i18n}=useTranslation();
  title = title || t('stage6.choose_option');
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  const handleSelect = (optValue) => {
    onValueChange(optValue);
    setOpen(false);
  };

  return (
    <>
      <Button
        {...triggerProps}
        ref={triggerRef}
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel || title}
        className={cn(
          'min-h-12 w-full justify-between rounded-xl text-start font-normal',
          !selected && 'text-muted-foreground',
          className
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder || title}</span>
        <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0 ml-2" />
      </Button>

      <Drawer open={open} onOpenChange={setOpen} autoFocus={autoFocus}>
        <DrawerContent dir={i18n.dir()} data-testid="bottom-sheet-select-options" onCloseAutoFocus={(event) => {
          // This controlled drawer has no DrawerTrigger. Restore focus inside
          // the parent dialog after either selection or Escape dismissal.
          if (autoFocus && triggerRef.current?.isConnected) {
            event.preventDefault();
            triggerRef.current.focus({ preventScroll: true });
          }
        }} onKeyDown={(event) => {
          if (autoFocus && event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}>
          <DrawerHeader className="border-b border-border/70 pb-3">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription className="sr-only">{t('stage6.select_option')}</DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[60vh] overflow-y-auto p-2" role="listbox" aria-label={ariaLabel || title} onKeyDown={event => {
            if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
            const options=Array.from(event.currentTarget.querySelectorAll('[role="option"]'));
            const index=options.indexOf(document.activeElement);
            const next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;
            event.preventDefault(); options[next]?.focus();
          }}>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'flex min-h-12 w-full items-center justify-between rounded-xl px-4 py-3 text-start text-sm transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-secondary/60 text-foreground'
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          {/* Safe area padding */}
          <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
        </DrawerContent>
      </Drawer>
    </>
  );
}
