import React from 'react';

export function GrowingShieldMark({ size = 40, className = '', decorative = true }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[28%] bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-[var(--shadow-md)] ring-1 ring-white/70 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={decorative ? 'true' : undefined}
    >
      <svg viewBox="0 0 64 64" width="72%" height="72%" fill="none" role={decorative ? undefined : 'img'}>
        <path d="M32 7 52 15v15c0 14-8.8 22.3-20 27-11.2-4.7-20-13-20-27V15L32 7Z" stroke="currentColor" strokeWidth="4.6" strokeLinejoin="round" />
        <path d="M21 34c5.8-9.6 15.1-9.6 20.6 0-4.6 8.1-14.9 10.5-20.6 0Z" fill="#F2C46E" />
        <path d="M32 27v17" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function AppWordmark({ name, compact = false, className = '' }) {
  return (
    <span className={`relative inline-flex min-w-0 flex-col pb-1.5 ${className}`}>
      <span className={`${compact ? 'text-[0.9375rem]' : 'text-[1.1875rem]'} [overflow-wrap:anywhere] font-semibold tracking-[-0.025em] text-primary`}>
        {name}
      </span>
      <svg
        className="pointer-events-none absolute bottom-0 start-[6%] h-1.5 w-[88%] overflow-visible"
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M2 2.5C28 7 68 7 98 2.5" fill="none" stroke="#DDAE61" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
