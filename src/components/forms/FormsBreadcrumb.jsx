import React from 'react';

export default function FormsBreadcrumb({ items = [], isRtl = false }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Forms breadcrumb" className="mb-4 rounded-[var(--radius-card)] border border-border bg-secondary/70 px-3 py-2" data-testid="forms-breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-primary">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
              {index > 0 && <span aria-hidden="true">{isRtl ? '←' : '→'}</span>}
              {item.onClick && !isLast ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="hover:text-primary underline-offset-2 hover:underline"
                >
                  {item.label}
                </button>
              ) : (
                <span className={isLast ? 'text-primary font-semibold' : ''}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
