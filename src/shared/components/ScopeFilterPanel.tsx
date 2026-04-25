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
  onWindowPreview?: (window: MetricWindow) => void;
  onTierPreview?: (tier: RatingTier) => void;
};

const SCOPE_TIER_LABELS: Record<RatingTier, string> = {
  all: 'All',
  low: 'Low',
  mid: 'Mid',
  high: 'High',
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
  onWindowPreview,
  onTierPreview,
}: ScopeFilterPanelProps) {
  return (
    <section
      aria-label={ariaLabel}
      className="surface px-6 py-5"
    >
      <div className="grid gap-5 lg:grid-cols-[auto_auto_1fr] lg:items-start lg:gap-x-10">
        <ScopeFilterGroup label="Window">
          <SegmentedControl>
            {windowOptions.map((option) => (
              <SegmentedButton
                key={option}
                active={option === selectedWindow}
                onClick={() => onWindowSelect(option)}
                onPreview={() => onWindowPreview?.(option)}
              >
                {WINDOW_LABELS[option]}
              </SegmentedButton>
            ))}
          </SegmentedControl>
        </ScopeFilterGroup>

        <ScopeFilterGroup label="Tier">
          <SegmentedControl>
            {tierOptions.map((option) => (
              <SegmentedButton
                key={option}
                active={option === selectedTier}
                onClick={() => onTierSelect(option)}
                onPreview={() => onTierPreview?.(option)}
              >
                {SCOPE_TIER_LABELS[option]}
              </SegmentedButton>
            ))}
          </SegmentedControl>
        </ScopeFilterGroup>

        <ScopeFilterGroup label="Hero">
          <div className="flex flex-wrap gap-1.5">
            {heroOptions.map((option) => (
              <HeroFilterButton
                key={option}
                hero={option}
                active={option === selectedHero}
                onClick={() => onHeroSelect(option)}
              />
            ))}
          </div>
        </ScopeFilterGroup>
      </div>
    </section>
  );
}

function ScopeFilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className="min-w-0 space-y-2.5">
      <p className="eyebrow text-[0.7rem] tracking-[0.22em]">{label}</p>
      {children}
    </div>
  );
}

export function SegmentedControl({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-full border border-[color:var(--color-border-soft)] bg-[color:rgba(10,8,5,0.7)] p-[3px] shadow-[inset_0_1px_0_rgba(255,235,200,0.04)]">
      {children}
    </div>
  );
}

export function SegmentedButton({
  active,
  onClick,
  onPreview,
  children,
}: {
  active: boolean;
  onClick: () => void;
  onPreview?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      onFocus={onPreview}
      onMouseEnter={onPreview}
      className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-[0.78rem] font-semibold uppercase tracking-[0.12em] transition ${
        active
          ? 'bg-[color:var(--color-accent)] text-[color:#100c06] shadow-[0_4px_12px_rgba(232,185,74,0.32)]'
          : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-base)]'
      }`}
    >
      {children}
    </button>
  );
}

function HeroFilterButton({
  hero,
  active,
  onClick,
}: {
  hero: string;
  active: boolean;
  onClick: () => void;
}) {
  if (hero === ALL_HEROES) {
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={`inline-flex h-9 items-center rounded-md border px-3.5 font-mono text-[0.74rem] font-semibold uppercase tracking-[0.16em] transition ${
          active
            ? 'border-[color:var(--color-accent)] bg-[color:rgba(232,185,74,0.18)] text-[color:var(--color-text-base)] shadow-[inset_0_0_0_1px_rgba(232,185,74,0.32)]'
            : 'border-[color:var(--color-border-soft)] bg-[color:rgba(15,12,8,0.6)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-accent-deep)] hover:text-[color:var(--color-text-base)]'
        }`}
      >
        All
      </button>
    );
  }

  const color = getHeroColor(hero);
  const shortLabel = getHeroShortLabel(hero);

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={hero}
      className={`group inline-flex h-9 items-center gap-2 rounded-md border pl-2 pr-3.5 font-mono text-[0.74rem] font-semibold uppercase tracking-[0.16em] transition ${
        active
          ? 'border-[color:var(--color-accent)] bg-[color:rgba(232,185,74,0.14)] text-[color:var(--color-text-base)] shadow-[inset_0_0_0_1px_rgba(232,185,74,0.3)]'
          : 'border-[color:var(--color-border-soft)] bg-[color:rgba(15,12,8,0.6)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-accent-deep)] hover:text-[color:var(--color-text-base)]'
      }`}
    >
      <span
        className="h-4 w-1 shrink-0 rounded-sm transition-transform group-hover:scale-y-110"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}55`,
        }}
        aria-hidden="true"
      />
      <span aria-hidden="true">{shortLabel}</span>
      <span className="sr-only">{hero}</span>
    </button>
  );
}
