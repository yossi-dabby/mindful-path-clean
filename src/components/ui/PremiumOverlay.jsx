import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// Keep overlays outside transformed page/refresh containers.
const PremiumOverlay = React.forwardRef(function PremiumOverlay(
  { children, className, style, ...props }, ref
) {
  return createPortal(
    <div
      ref={ref}
      {...props}
      className={cn('premium-overlay', className)}
      style={{ ...style, zIndex: Math.max(80, Number(style?.zIndex) || 80) }}
    >
      {children}
    </div>,
    document.body
  );
});

export default PremiumOverlay;
