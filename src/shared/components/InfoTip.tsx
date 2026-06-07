import type { ReactNode } from 'react';

type InfoTipProps = {
  label: string;
  tip: ReactNode;
  className?: string;
};

// Small ⓘ affordance with a hover/focus tooltip — extracted from the BazaarDB "?" idiom.
// Rendered as its own focus target; never nest it inside another button.
export default function InfoTip({ label, tip, className = '' }: InfoTipProps) {
  return (
    <span className={`group/info relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-border-soft)] text-[0.58rem] font-semibold normal-case leading-none text-[color:var(--color-text-faint)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent-bright)] focus-visible:border-[color:var(--color-accent)] focus-visible:text-[color:var(--color-accent-bright)]"
      >
        <span aria-hidden="true">?</span>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[16rem] -translate-x-1/2 whitespace-normal rounded-md border border-[color:var(--color-border-bright)] bg-[color:rgba(15,12,8,0.96)] px-3 py-1.5 text-left text-xs font-medium normal-case leading-5 tracking-normal text-[color:var(--color-accent-bright)] opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition group-hover/info:visible group-hover/info:opacity-100 group-focus-within/info:visible group-focus-within/info:opacity-100"
      >
        {tip}
      </span>
    </span>
  );
}
