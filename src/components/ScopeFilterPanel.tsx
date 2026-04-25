import type { ReactNode } from 'react';

import { WINDOW_LABELS } from '../lib/dashboard';
import { getHeroColor, getHeroShortLabel } from '../lib/heroes';
import { ALL_HEROES } from '../lib/interactive-filters';
import type { MetricWindow, RatingTier } from '../lib/metrics';

type ScopeFilterPanelProps = {
  ariaLabel: string;
  windowOptions: MetricWindow[];
  tierOptions: RatingTier[];
  selectedWindow: MetricWindow;
  selectedTier: RatingTier;
  heroOptions: string[];
  selectedHero: string;
  onWindowSelect: (window: MetricWindow) => void;
  onTierSelect: (tier: RatingTier) => void;
  onHeroSelect: (hero: string) => void;
};

const SCOPE_TIER_LABELS: Record<RatingTier, string> = {
  all: 'ALL',
  low: 'LOW',
  mid: 'MID',
  high: 'HIGH',
};

export default function ScopeFilterPanel({
  ariaLabel,
  windowOptions,
  tierOptions,
  selectedWindow,
  selectedTier,
  heroOptions,
  selectedHero,
  onWindowSelect,
  onTierSelect,
  onHeroSelect,
}: ScopeFilterPanelProps) {
  return (
    <section
      aria-label={ariaLabel}
      className="rounded-[20px] border border-[color:rgba(58,47,31,0.82)] bg-[color:rgba(19,15,8,0.62)] px-5 py-5 shadow-[inset_0_1px_0_rgba(246,226,184,0.05)] sm:px-6"
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-4">
        <ScopeFilterGroup label="Time window">
          {windowOptions.map((option) => (
            <ScopeFilterButton
              key={option}
              active={option === selectedWindow}
              onClick={() => onWindowSelect(option)}
            >
              {WINDOW_LABELS[option]}
            </ScopeFilterButton>
          ))}
        </ScopeFilterGroup>

        <ScopeFilterGroup label="Tier">
          {tierOptions.map((option) => (
            <ScopeFilterButton
              key={option}
              active={option === selectedTier}
              onClick={() => onTierSelect(option)}
            >
              {SCOPE_TIER_LABELS[option]}
            </ScopeFilterButton>
          ))}
        </ScopeFilterGroup>

        <ScopeFilterGroup label="Hero" className="basis-full">
          {heroOptions.map((option) => (
            <ScopeFilterButton
              key={option}
              active={option === selectedHero}
              onClick={() => onHeroSelect(option)}
            >
              {option === ALL_HEROES ? 'ALL' : <ScopeHeroOptionLabel hero={option} />}
            </ScopeFilterButton>
          ))}
        </ScopeFilterGroup>
      </div>
    </section>
  );
}

function ScopeFilterGroup({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`min-w-0 space-y-2 ${className}`.trim()}>
      <p className="text-sm text-[color:var(--color-text-muted)]">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ScopeFilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition ${
        active
          ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:#130f08] shadow-[0_8px_20px_rgba(212,162,76,0.18)]'
          : 'border-[color:rgba(58,47,31,0.82)] bg-[color:rgba(19,15,8,0.58)] text-[color:var(--color-text-base)] hover:border-[color:var(--color-accent)]'
      }`}
    >
      {children}
    </button>
  );
}

function ScopeHeroOptionLabel({ hero }: { hero: string }) {
  const shortLabel = getHeroShortLabel(hero);

  return (
    <span
      title={hero}
      className="inline-flex items-center gap-2 font-semibold tracking-[0.1em] text-inherit"
      data-hero-short-label={shortLabel}
    >
      <span
        data-hero-color-dot={hero}
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: getHeroColor(hero) }}
        aria-hidden="true"
      />
      <span aria-hidden="true">{shortLabel}</span>
      <span className="sr-only">{hero}</span>
    </span>
  );
}
