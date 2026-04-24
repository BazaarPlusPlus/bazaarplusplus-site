import type { CardMetric, Locale, MetricWindow, RatingTier } from '../lib/metrics';
import { TIER_LABELS, WINDOW_LABELS, buildLocalizedHref } from '../lib/dashboard';

type MetricFilterBarProps = {
  locale: Locale;
  title?: string;
  metricLabel: string;
  routeBase: string;
  windowOptions: MetricWindow[];
  tierOptions: RatingTier[];
  selectedWindow: MetricWindow;
  selectedTier: RatingTier;
  selectedMetric?: CardMetric;
  compact?: boolean;
  onWindowSelect?: (window: MetricWindow) => void;
  onTierSelect?: (tier: RatingTier) => void;
};

export default function MetricFilterBar({
  locale,
  title,
  metricLabel,
  routeBase,
  windowOptions,
  tierOptions,
  selectedWindow,
  selectedTier,
  selectedMetric,
  compact = false,
  onWindowSelect,
  onTierSelect,
}: MetricFilterBarProps) {
  if (compact) {
    return (
      <section className="grid gap-3 rounded-[20px] border border-[color:rgba(58,47,31,0.74)] bg-[color:rgba(19,15,8,0.6)] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title ? (
            <p className="text-sm text-[color:var(--color-text-base)]">{title}</p>
          ) : (
            <span />
          )}
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
            Metric: <span className="text-[color:var(--color-text-base)]">{metricLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-4 sm:gap-6">
          <FilterGroup
            compact
            label="Window"
            options={windowOptions}
            selected={selectedWindow}
            buildHref={(window) =>
              buildLocalizedHref(routeBase, {
                w: window,
                t: selectedTier,
                m: selectedMetric,
                lang: locale,
              })
            }
            renderLabel={(window) => WINDOW_LABELS[window]}
            onSelect={onWindowSelect}
          />
          <FilterGroup
            compact
            label="Tier"
            options={tierOptions}
            selected={selectedTier}
            buildHref={(tier) =>
              buildLocalizedHref(routeBase, {
                w: selectedWindow,
                t: tier,
                m: selectedMetric,
                lang: locale,
              })
            }
            renderLabel={(tier) => TIER_LABELS[tier]}
            onSelect={onTierSelect}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-[24px] border border-[color:var(--color-border)] bg-[color:rgba(26,22,19,0.84)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
            Filters
          </p>
          <h2 className="mt-2 text-xl text-[color:var(--color-text-base)]">{title}</h2>
        </div>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Metric: <span className="text-[color:var(--color-text-base)]">{metricLabel}</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FilterGroup
          label="Window"
          options={windowOptions}
          selected={selectedWindow}
          buildHref={(window) =>
            buildLocalizedHref(routeBase, {
              w: window,
              t: selectedTier,
              m: selectedMetric,
              lang: locale,
            })
          }
          renderLabel={(window) => WINDOW_LABELS[window]}
          onSelect={onWindowSelect}
        />
        <FilterGroup
          label="Tier"
          options={tierOptions}
          selected={selectedTier}
          buildHref={(tier) =>
            buildLocalizedHref(routeBase, {
              w: selectedWindow,
              t: tier,
              m: selectedMetric,
              lang: locale,
            })
          }
          renderLabel={(tier) => TIER_LABELS[tier]}
          onSelect={onTierSelect}
        />
      </div>
    </section>
  );
}

function FilterGroup<T extends string>({
  compact = false,
  label,
  options,
  selected,
  buildHref,
  renderLabel,
  onSelect,
}: {
  compact?: boolean;
  label: string;
  options: T[];
  selected: T;
  buildHref: (value: T) => string;
  renderLabel: (value: T) => string;
  onSelect?: (value: T) => void;
}) {
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option === selected;
          const className = `rounded-full border ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} transition ${
            active
              ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:#130f08]'
              : 'border-[color:var(--color-border)] bg-transparent text-[color:var(--color-text-muted)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-text-base)]'
          }`;

          if (onSelect) {
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(option)}
                className={className}
              >
                {renderLabel(option)}
              </button>
            );
          }

          return (
            <a key={option} href={buildHref(option)} className={className}>
              {renderLabel(option)}
            </a>
          );
        })}
      </div>
    </div>
  );
}
