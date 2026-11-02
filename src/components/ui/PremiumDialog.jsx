import React, { useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// Full-screen practice dialogs live above app chrome, lock background scrolling,
// contain keyboard focus and restore it to the opening control on dismissal.
export default function PremiumDialog({ children, onClose, label, className, style, returnFocusTo, localEscape = false, layer = 10000, ...props }) {
  const { i18n } = useTranslation();
  const returnFocus = useRef(returnFocusTo || document.activeElement);
  const content = useRef(null);
  const isTopDialog = () => {
    const dialogs = document.querySelectorAll('[role="dialog"][data-state="open"]');
    return dialogs[dialogs.length - 1] === content.current;
  };

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          ref={content}
          aria-describedby={undefined}
          {...props}
          aria-label={label}
          aria-modal="true"
          dir={i18n.dir()}
          className={cn('premium-overlay outline-none', className)}
          style={{ ...style, zIndex: layer }}
          onEscapeKeyDown={(event) => {
            props.onEscapeKeyDown?.(event);
            if (localEscape && !isTopDialog()) event.preventDefault();
          }}
          onKeyDown={(event) => {
            props.onKeyDown?.(event);
            // A replacement portal can receive focus before Radix's layer
            // registration settles. Handle its own Escape without dismissing
            // a parent when a nested selection dialog is open.
            if (localEscape && event.key === 'Escape' && !event.defaultPrevented && isTopDialog()) {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current?.isConnected) returnFocus.current.focus?.({ preventScroll: true });
          }}
        >
          <DialogPrimitive.Title asChild><span className="sr-only">{label}</span></DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
