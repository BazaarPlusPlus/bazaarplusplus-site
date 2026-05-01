import type { ReactNode } from 'react';

import { getSiteCopy } from '../../content/site-copy';
import type { CardMetric, Locale, MetricWindow, RatingTier } from '../lib/metrics';
import { WINDOW_LABELS, buildLocalizedHref } from '../lib/dashboard';
import { getHeroColor, getHeroShortLabel } from '../lib/heroes';

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
  heroOptions?: string[];
  selectedHero?: string;
  compact?: boolean;
  onWindowSelect?: (window: MetricWindow) => void;
  onTierSelect?: (tier: RatingTier) => void;
  onHeroSelect?: (hero: string) => void;
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
  heroOptions = [],
  selectedHero = 'all',
  compact = false,
  onWindowSelect,
  onTierSelect,
  onHeroSelect,
}: MetricFilterBarProps) {
  const showHeroFilter = heroOptions.length > 0;
  const copy = getSiteCopy(locale).common;
  const scopeCopy = copy.scope;

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
            {copy.metric}: <span className="text-[color:var(--color-text-base)]">{metricLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-4 sm:gap-6">
          <FilterGroup
            compact
            label={scopeCopy.window}
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
            label={scopeCopy.tier}
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
            renderLabel={(tier) => scopeCopy.fullTierLabels[tier]}
            onSelect={onTierSelect}
          />
          {showHeroFilter ? (
            <FilterGroup
              compact
              label={scopeCopy.hero}
              options={heroOptions}
              selected={selectedHero}
              buildHref={(hero) =>
                buildLocalizedHref(routeBase, {
                  w: selectedWindow,
                  t: selectedTier,
                  m: selectedMetric,
                  hero,
                  lang: locale,
                })
              }
              renderLabel={(hero) => renderHeroFilterLabel(hero, true, scopeCopy.allHero)}
              onSelect={onHeroSelect}
            />
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-[24px] border border-[color:var(--color-border)] bg-[color:rgba(26,22,19,0.84)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
            {copy.filters}
          </p>
          <h2 className="mt-2 text-xl text-[color:var(--color-text-base)]">{title}</h2>
        </div>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          {copy.metric}: <span className="text-[color:var(--color-text-base)]">{metricLabel}</span>
        </p>
      </div>

      <div className={`grid gap-3 ${showHeroFilter ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <FilterGroup
          label={scopeCopy.window}
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
          label={scopeCopy.tier}
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
          renderLabel={(tier) => scopeCopy.fullTierLabels[tier]}
          onSelect={onTierSelect}
        />
        {showHeroFilter ? (
          <FilterGroup
            label={scopeCopy.hero}
            options={heroOptions}
            selected={selectedHero}
            buildHref={(hero) =>
              buildLocalizedHref(routeBase, {
                w: selectedWindow,
                t: selectedTier,
                m: selectedMetric,
                hero,
                lang: locale,
              })
            }
            renderLabel={(hero) => renderHeroFilterLabel(hero, false, scopeCopy.allHero)}
            onSelect={onHeroSelect}
          />
        ) : null}
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
  renderLabel: (value: T) => ReactNode;
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

function renderHeroFilterLabel(hero: string, compact: boolean, allHeroLabel: string): ReactNode {
  if (hero === 'all') {
    return allHeroLabel;
  }

  return <HeroFilterLabel hero={hero} compact={compact} />;
}

function HeroFilterLabel({ hero, compact }: { hero: string; compact: boolean }) {
  const shortLabel = getHeroShortLabel(hero);

  return (
    <span
      title={hero}
      className={`inline-flex min-w-0 items-center ${compact ? 'gap-1.5' : 'gap-2'} font-semibold tracking-[0.1em] text-inherit`}
      data-hero-short-label={shortLabel}
    >
      <span
        data-hero-color-dot={hero}
        className={`${compact ? 'h-2 w-2' : 'h-2.5 w-2.5'} shrink-0 rounded-full`}
        style={{ backgroundColor: getHeroColor(hero) }}
        aria-hidden="true"
      />
      <span aria-hidden="true">{shortLabel}</span>
      <span className="sr-only">{hero}</span>
    </span>
  );
}
