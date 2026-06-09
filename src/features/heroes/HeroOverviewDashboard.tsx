import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';

import { BAZAARDB_ICON_PATH, BAZAARDB_INTEGRATION_DOC_URL, BAZAARDB_META_URL, getSiteCopy } from '../../content/site-copy';
import {
  DEFAULT_LOCALE,
  GAME_DAY_BUCKETS,
  type AnalyzerV4Manifest,
  type GameDayBucket,
  type Locale,
  type MetricWindow,
  type RatingTier,
  type WebHeroDailyPayload,
} from '../../shared/lib/metrics';
import {
  MATCHUP_MIN_SAMPLE,
  WEB_DAILY_NOMINAL,
  WINDOW_LABELS,
  formatInteger,
  formatNullablePercent,
  formatPercent,
  formatShortDate,
} from '../../shared/lib/dashboard';
import { getHeroColor, getHeroShortLabel } from '../../shared/lib/heroes';
import {
  collectTierRows,
  deriveHeroMetrics,
  deriveMatchups,
  deriveTrendSeries,
  mergeRows,
  segmentTrendPoints,
  selectDays,
  type HeroMetricsRow,
  type HeroTrendSeries,
  type MatchupRow,
  type MergedHeroRow,
} from '../../shared/lib/web-daily';
import { sortRows, toggleSort, type SortState } from '../../shared/lib/table-sorting';
import DialogShell from '../../shared/components/DialogShell';
import HeroBadge from '../../shared/components/HeroBadge';
import InfoTip from '../../shared/components/InfoTip';
import { SegmentedButton, SegmentedControl } from '../../shared/components/ScopeFilterPanel';
import SortableHeader from '../../shared/components/SortableHeader';
import StatsPageShell from '../../shared/components/StatsPageShell';

import type { HeroOverviewCoverage } from '../../app/page-data';

type HeroOverviewDashboardProps = {
  locale: Locale;
  manifest: AnalyzerV4Manifest;
  days: WebHeroDailyPayload[];
  latestCompleteDay: string;
  availableWindows: MetricWindow[];
  availableTiers: RatingTier[];
  coverage: HeroOverviewCoverage;
  initialSelectedWindow: MetricWindow;
  initialSelectedTier: RatingTier;
};

type RankingSortKey =
  | 'hero'
  | 'tenWinRate'
  | 'runsCompleted'
  | 'runShare'
  | 'tenWinCount'
  | 'avgRunDays10w'
  | 'perfectRate'
  | 'goldRate'
  | 'silverRate'
  | 'bronzeRate';

type StageSortKey = 'hero' | GameDayBucket;

type ChartPoint = {
  day: string;
  winRate: number;
  x: number;
  y: number;
};

type HoveredTrendPoint = ChartPoint & {
  hero: string;
  color: string;
};

const CHART_WIDTH = 960;
const CHART_HEIGHT = 360;
const CHART_PADDING = { top: 28, right: 28, bottom: 48, left: 56 };
const POINT_TOOLTIP_WIDTH = 168;
const POINT_TOOLTIP_HEIGHT = 56;
const POINT_TOOLTIP_OFFSET = 18;
const GRIDLINE_COUNT = 4;
const RANKING_COLUMN_WIDTHS = [
  '18%',
  '11%',
  '10%',
  '10%',
  '9%',
  '10%',
  '8%',
  '8%',
  '8%',
  '8%',
];

const VICTORY_TIER_KEYS = ['perfect', 'gold', 'silver', 'bronze', 'misfortune'] as const;

type VictoryTierKey = (typeof VICTORY_TIER_KEYS)[number];

const VICTORY_TIER_COLORS: Record<VictoryTierKey, string> = {
  perfect: '#ffd47a',
  gold: '#c08e2e',
  silver: '#a8b0bb',
  bronze: '#b07a45',
  misfortune: '#d05a4a',
};

function isMetricWindow(value: string | null): value is MetricWindow {
  return value === '1d' || value === '3d' || value === '7d';
}

function isRatingTier(value: string | null): value is RatingTier {
  return value === 'all' || value === 'low' || value === 'mid' || value === 'high';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getValidWindow(
  candidate: string | null,
  availableWindows: MetricWindow[],
  fallback: MetricWindow
): MetricWindow {
  return candidate && isMetricWindow(candidate) && availableWindows.includes(candidate)
    ? candidate
    : fallback;
}

function getValidTier(
  candidate: string | null,
  availableTiers: RatingTier[],
  fallback: RatingTier
): RatingTier {
  return candidate && isRatingTier(candidate) && availableTiers.includes(candidate)
    ? candidate
    : fallback;
}

function readInitialSelection(
  availableWindows: MetricWindow[],
  availableTiers: RatingTier[],
  fallbackWindow: MetricWindow,
  fallbackTier: RatingTier
) {
  if (typeof window === 'undefined') {
    return { window: fallbackWindow, tier: fallbackTier };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    window: getValidWindow(params.get('w'), availableWindows, fallbackWindow),
    tier: getValidTier(params.get('t'), availableTiers, fallbackTier),
  };
}

function getChartX(dayIndex: number, dayCount: number) {
  const chartInnerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  if (dayCount <= 1) {
    return CHART_PADDING.left + chartInnerWidth / 2;
  }

  return CHART_PADDING.left + (chartInnerWidth * dayIndex) / (dayCount - 1);
}

function getChartY(value: number, min: number, max: number) {
  const chartInnerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  if (max - min <= 0.0001) {
    return CHART_PADDING.top + chartInnerHeight / 2;
  }

  const normalized = (value - min) / (max - min);
  return CHART_PADDING.top + chartInnerHeight * (1 - normalized);
}

function getNearestChartPoint(
  event: ReactMouseEvent<SVGPolylineElement>,
  points: ChartPoint[]
): ChartPoint | undefined {
  if (points.length === 0) {
    return undefined;
  }

  const svg = event.currentTarget.ownerSVGElement;
  const rect = svg?.getBoundingClientRect();
  if (rect == null || rect.width <= 0) {
    return points.at(-1);
  }

  const mouseX = ((event.clientX - rect.left) / rect.width) * CHART_WIDTH;
  return points.reduce((nearest, point) =>
    Math.abs(point.x - mouseX) < Math.abs(nearest.x - mouseX) ? point : nearest
  );
}

function bucketRate(counts: { wins: number; decided: number } | undefined): number | null {
  if (!counts || counts.decided <= 0) {
    return null;
  }

  return counts.wins / counts.decided;
}

function formatDays(value: number | null): string {
  return value == null ? '—' : value.toFixed(1);
}

export default function HeroOverviewDashboard({
  locale,
  manifest,
  days,
  latestCompleteDay,
  availableWindows,
  availableTiers,
  coverage,
  initialSelectedWindow,
  initialSelectedTier,
}: HeroOverviewDashboardProps) {
  const copy = getSiteCopy(locale);
  const heroCopy = copy.stats.heroes;
  const scopeCopy = copy.common.scope;
  const coverageCopy = heroCopy.coverage;
  const methodologyCopy = heroCopy.methodology;
  const noValueLabel = copy.common.noValueLabel;

  const initialSelection = useMemo(
    () =>
      readInitialSelection(
        availableWindows,
        availableTiers,
        initialSelectedWindow,
        initialSelectedTier
      ),
    [availableTiers, availableWindows, initialSelectedTier, initialSelectedWindow]
  );
  const [selectedWindow, setSelectedWindow] = useState<MetricWindow>(initialSelection.window);
  const [selectedTier, setSelectedTier] = useState<RatingTier>(initialSelection.tier);
  const [focusedHero, setFocusedHero] = useState<string | null>(null);
  const [sortState, setSortState] = useState<SortState<RankingSortKey>>({
    key: 'tenWinRate',
    direction: 'desc',
  });
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<HoveredTrendPoint | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [selectedMatchupHero, setSelectedMatchupHero] = useState<string | null>(null);

  // --- window / tier scope ---------------------------------------------------
  const windowDayRefs = useMemo(
    () => selectDays(manifest.web.days, selectedWindow, latestCompleteDay),
    [latestCompleteDay, manifest.web.days, selectedWindow]
  );
  const loadedDaySet = useMemo(
    () => new Set(days.map((payload) => payload.day)),
    [days]
  );
  const loadedWindowDays = useMemo(
    () => windowDayRefs.filter((ref) => loadedDaySet.has(ref.day)),
    [loadedDaySet, windowDayRefs]
  );
  const failedWindowDays = useMemo(
    () => windowDayRefs.filter((ref) => coverage.failedDays.includes(ref.day)),
    [coverage.failedDays, windowDayRefs]
  );

  const tierRows = useMemo(
    () => collectTierRows(days, windowDayRefs, selectedTier),
    [days, selectedTier, windowDayRefs]
  );
  const allTierRows = useMemo(
    () => collectTierRows(days, windowDayRefs, 'all'),
    [days, windowDayRefs]
  );

  // A tier emptied by a window change falls back to the explicit all row (§9).
  useEffect(() => {
    if (selectedTier !== 'all' && tierRows.length === 0 && allTierRows.length > 0) {
      setSelectedTier('all');
    }
  }, [allTierRows.length, selectedTier, tierRows.length]);

  const merged = useMemo(() => mergeRows(tierRows), [tierRows]);
  const heroMetrics = useMemo(() => {
    // Base order: completed runs desc then hero asc, so the stable sort below
    // resolves ties in the documented order.
    return deriveHeroMetrics(merged).sort(
      (a, b) => b.runsCompleted - a.runsCompleted || a.hero.localeCompare(b.hero)
    );
  }, [merged]);
  const sortedRows = useMemo(
    () =>
      sortRows(heroMetrics, sortState, {
        hero: (row) => row.hero,
        tenWinRate: (row) => row.tenWinRate,
        runsCompleted: (row) => row.runsCompleted,
        runShare: (row) => row.runShare,
        tenWinCount: (row) => row.tenWinCount,
        avgRunDays10w: (row) => row.avgRunDays10w,
        perfectRate: (row) => row.perfectRate,
        goldRate: (row) => row.goldRate,
        silverRate: (row) => row.silverRate,
        bronzeRate: (row) => row.bronzeRate,
      }),
    [heroMetrics, sortState]
  );

  // --- trend (fixed 7d span; honors tier, ignores window) --------------------
  const trendSpanRefs = useMemo(
    () => selectDays(manifest.web.days, '7d', latestCompleteDay),
    [latestCompleteDay, manifest.web.days]
  );
  const trendDayAxis = useMemo(() => trendSpanRefs.map((ref) => ref.day), [trendSpanRefs]);
  const trendSeries = useMemo(
    () => deriveTrendSeries(days, trendSpanRefs, selectedTier),
    [days, selectedTier, trendSpanRefs]
  );

  // --- shared focused hero ----------------------------------------------------
  useEffect(() => {
    const candidates = sortedRows.filter((row) => row.isCanonical);
    const fallback = candidates[0]?.hero ?? null;
    if (focusedHero == null || !sortedRows.some((row) => row.hero === focusedHero)) {
      setFocusedHero(fallback);
    }
  }, [focusedHero, sortedRows]);

  const focusedTrendSeries: HeroTrendSeries | undefined = focusedHero
    ? trendSeries.find((series) => series.hero === focusedHero)
    : undefined;
  const focusedMetrics: HeroMetricsRow | undefined = focusedHero
    ? heroMetrics.find((row) => row.hero === focusedHero)
    : undefined;
  const focusedMerged: MergedHeroRow | undefined = focusedHero
    ? merged.get(focusedHero)
    : undefined;
  const matchupHeroOptions = useMemo(() => sortedRows.map((row) => row.hero), [sortedRows]);

  useEffect(() => {
    if (matchupHeroOptions.length === 0) {
      if (selectedMatchupHero != null) {
        setSelectedMatchupHero(null);
      }
      return;
    }

    if (selectedMatchupHero == null || !matchupHeroOptions.includes(selectedMatchupHero)) {
      setSelectedMatchupHero(
        focusedHero != null && matchupHeroOptions.includes(focusedHero)
          ? focusedHero
          : matchupHeroOptions[0]!
      );
    }
  }, [focusedHero, matchupHeroOptions, selectedMatchupHero]);

  // --- URL writes -------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (selectedWindow !== '1d') {
      params.set('w', selectedWindow);
    } else {
      params.delete('w');
    }

    if (selectedTier !== 'all') {
      params.set('t', selectedTier);
    } else {
      params.delete('t');
    }

    if (locale !== DEFAULT_LOCALE) {
      params.set('lang', locale);
    } else {
      params.delete('lang');
    }

    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, '', nextUrl);
  }, [locale, selectedTier, selectedWindow]);

  // --- chart geometry ---------------------------------------------------------
  const trendWinRates = trendSeries.flatMap((series) =>
    series.points.map((point) => point.winRate)
  );
  const minWinRate = trendWinRates.length > 0 ? Math.min(...trendWinRates) : 0;
  const maxWinRate = trendWinRates.length > 0 ? Math.max(...trendWinRates) : 1;
  const spread = Math.max(maxWinRate - minWinRate, 0.04);
  const paddedMin = clamp(Math.floor(((minWinRate - spread * 0.2) * 100) / 5) * 5 / 100, 0, 0.95);
  const paddedMax = clamp(Math.ceil(((maxWinRate + spread * 0.2) * 100) / 5) * 5 / 100, 0.05, 1);
  const yMin = Math.min(paddedMin, maxWinRate);
  const yMax = Math.max(paddedMax, minWinRate + 0.01);
  const tickStep = (yMax - yMin) / GRIDLINE_COUNT;
  const trendYAxisTicks = Array.from(
    { length: GRIDLINE_COUNT + 1 },
    (_, index) => yMin + tickStep * index
  );
  const trendTooltipX =
    hoveredTrendPoint == null
      ? 0
      : clamp(
          hoveredTrendPoint.x - POINT_TOOLTIP_WIDTH / 2,
          CHART_PADDING.left,
          CHART_WIDTH - CHART_PADDING.right - POINT_TOOLTIP_WIDTH
        );
  const trendTooltipY =
    hoveredTrendPoint == null
      ? 0
      : clamp(
          hoveredTrendPoint.y - POINT_TOOLTIP_HEIGHT - POINT_TOOLTIP_OFFSET,
          CHART_PADDING.top,
          CHART_HEIGHT - CHART_PADDING.bottom - POINT_TOOLTIP_HEIGHT
        );

  const toChartPoint = (point: { day: string; winRate: number }): ChartPoint => ({
    day: point.day,
    winRate: point.winRate,
    x: getChartX(trendDayAxis.indexOf(point.day), trendDayAxis.length),
    y: getChartY(point.winRate, yMin, yMax),
  });

  // --- coverage ---------------------------------------------------------------
  const nominalDays = WEB_DAILY_NOMINAL[selectedWindow];
  const partialCoverage = loadedWindowDays.length < nominalDays;

  const maxTenWinRate = sortedRows.reduce(
    (max, row) => (row.tenWinRate != null && row.tenWinRate > max ? row.tenWinRate : max),
    0
  );

  const selectedMatchupMerged = selectedMatchupHero ? merged.get(selectedMatchupHero) : undefined;
  const matchups = useMemo(
    () => (selectedMatchupMerged ? deriveMatchups(selectedMatchupMerged, MATCHUP_MIN_SAMPLE) : null),
    [selectedMatchupMerged]
  );

  const hasAnyData = days.length > 0;
  const noDaysPublished = coverage.requested.length === 0;
  const rankingHasRows = sortedRows.length > 0;

  const dossierContextLabel = `${WINDOW_LABELS[selectedWindow]}${coverageCopy.windowSuffix} · ${
    scopeCopy.tierLabels[selectedTier]
  }`;

  function renderRateCell(value: number | null, extraClass = '') {
    return (
      <span className={`relative tnum ${extraClass}`} aria-label={value == null ? noValueLabel : undefined}>
        {formatNullablePercent(value)}
      </span>
    );
  }

  // The ⓘ button takes the tip itself as its accessible name so it never
  // collides with the adjacent sort button's name.
  const headerInfo = (tip: string) => <InfoTip label={tip} tip={tip} />;

  // --- empty / degraded full-page states ---------------------------------------
  const emptyState = !hasAnyData ? (
    <section className="surface flex flex-col items-center gap-3 px-6 py-16 text-center">
      <h2 className="font-display text-2xl font-semibold text-[color:var(--color-text-base)]">
        {noDaysPublished ? heroCopy.comingSoon.title : heroCopy.unavailable.title}
      </h2>
      <p className="max-w-md text-sm leading-6 text-[color:var(--color-text-muted)]">
        {noDaysPublished ? heroCopy.comingSoon.body : heroCopy.unavailable.body}
      </p>
    </section>
  ) : null;

  return (
    <StatsPageShell
      activeSection="heroes"
      locale={locale}
      eyebrow={heroCopy.eyebrow}
      title={heroCopy.title}
      generatedAt={manifest.generated_at}
      actions={
        <>
          <a
            href={BAZAARDB_META_URL}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[color:var(--color-border-bright)] px-4 py-2 text-sm font-medium text-[color:var(--color-accent-bright)] transition hover:border-[color:var(--color-accent)] hover:bg-[rgba(232,185,74,0.08)] hover:text-[color:var(--color-text-base)]"
          >
            <span
              aria-hidden="true"
              className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-[rgba(255,245,220,0.06)]"
            >
              <img
                src={BAZAARDB_ICON_PATH}
                alt=""
                className="h-full w-full object-contain"
                decoding="async"
              />
            </span>
            <span>{heroCopy.detailLinkLabel}</span>
            <span aria-hidden="true" className="transition group-hover:translate-x-0.5">↗</span>
          </a>
          <a
            href={BAZAARDB_INTEGRATION_DOC_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={heroCopy.detailLinkHelpLabel}
            className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-border-soft)] text-sm font-semibold text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent-bright)]"
          >
            <span aria-hidden="true">?</span>
            <span
              role="tooltip"
              className="pointer-events-none invisible absolute bottom-full right-0 z-10 mb-2 whitespace-nowrap rounded-md border border-[color:var(--color-border-bright)] bg-[color:rgba(15,12,8,0.96)] px-3 py-1.5 text-xs font-medium leading-5 text-[color:var(--color-accent-bright)] opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.45)] group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100"
            >
              {heroCopy.detailLinkHelpTooltip}
            </span>
          </a>
        </>
      }
      filters={
        availableWindows.length > 0 ? (
          <section aria-label={copy.common.filters} className="surface px-6 py-5">
            <div className="flex flex-wrap items-start gap-x-10 gap-y-5">
              <div role="group" aria-label={scopeCopy.window} className="min-w-0 space-y-2.5">
                <p className="eyebrow text-[0.7rem] tracking-[0.22em]">{scopeCopy.window}</p>
                <SegmentedControl>
                  {availableWindows.map((option) => (
                    <SegmentedButton
                      key={option}
                      active={option === selectedWindow}
                      onClick={() => setSelectedWindow(option)}
                    >
                      {WINDOW_LABELS[option]}
                    </SegmentedButton>
                  ))}
                </SegmentedControl>
              </div>
              <div role="group" aria-label={scopeCopy.tier} className="min-w-0 space-y-2.5">
                <p className="eyebrow text-[0.7rem] tracking-[0.22em]">{scopeCopy.tier}</p>
                <SegmentedControl>
                  {availableTiers.map((option) => (
                    <SegmentedButton
                      key={option}
                      active={option === selectedTier}
                      onClick={() => setSelectedTier(option)}
                    >
                      {scopeCopy.tierLabels[option]}
                    </SegmentedButton>
                  ))}
                </SegmentedControl>
              </div>
              <div className="min-w-0 flex-1 self-end">
                <CoverageStrip
                  loadedCount={loadedWindowDays.length}
                  nominalCount={nominalDays}
                  windowLabel={WINDOW_LABELS[selectedWindow]}
                  partial={partialCoverage}
                  coverageCopy={coverageCopy}
                />
              </div>
            </div>
          </section>
        ) : null
      }
    >
      {emptyState ?? (
        <section className="grid gap-6">
          {/* === TREND ===================================================== */}
          <section className="surface relative overflow-hidden p-5 sm:p-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background: focusedTrendSeries
                  ? `radial-gradient(ellipse at 78% 12%, ${focusedTrendSeries.color}18, transparent 55%)`
                  : undefined,
              }}
            />

            <div className="relative grid min-w-0 gap-4 lg:grid-cols-[260px_1fr] lg:gap-x-6">
              <div className="flex flex-col gap-4 lg:h-full">
                <div>
                  <p className="eyebrow eyebrow-rule">{WINDOW_LABELS['7d']} {heroCopy.trend.winrateTrend}</p>
                  <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[color:var(--color-text-base)]">
                    {heroCopy.trend.titleLead} <span className="text-[color:var(--color-accent-bright)]">{heroCopy.trend.titleAccent}</span>
                  </h2>
                </div>

                {focusedTrendSeries ? (
                  <div className="rounded-xl border border-[color:var(--color-border-soft)] bg-[color:rgba(10,8,5,0.6)] p-4 lg:flex-1">
                    <div className="flex items-center justify-between">
                      <span className="eyebrow text-[0.66rem] tracking-[0.22em]">{heroCopy.trend.inFocus}</span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-3">
                      <span
                        className="h-8 w-1 rounded-sm"
                        style={{
                          backgroundColor: focusedTrendSeries.color,
                          boxShadow: `0 0 12px ${focusedTrendSeries.color}66`,
                        }}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="font-display text-2xl font-semibold text-[color:var(--color-text-base)]">
                          {focusedTrendSeries.hero}
                        </div>
                        <div className="font-display-italic text-[0.78rem] tracking-[0.18em] text-[color:var(--color-text-muted)]">
                          {getHeroShortLabel(focusedTrendSeries.hero)} · {WINDOW_LABELS['7d']}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <div className="eyebrow text-[0.62rem] tracking-[0.2em]">{heroCopy.trend.latest}</div>
                        <div className="mt-1 tnum text-2xl font-semibold text-[color:var(--color-accent-bright)]">
                          {formatNullablePercent(focusedTrendSeries.latestWinRate)}
                        </div>
                      </div>
                      <div>
                        <div className="eyebrow text-[0.62rem] tracking-[0.2em]">{heroCopy.trend.startedAt}</div>
                        <div className="mt-1 tnum text-2xl font-semibold text-[color:var(--color-text-muted)]">
                          {formatNullablePercent(focusedTrendSeries.firstWinRate)}
                        </div>
                      </div>
                    </div>
                    {focusedTrendSeries.nullPointCount > 0 ? (
                      <p className="mt-3 text-[0.72rem] leading-5 text-[color:var(--color-text-faint)]">
                        {coverageCopy.noTrendValue}
                      </p>
                    ) : null}
                  </div>
                ) : focusedHero != null ? (
                  <div className="rounded-xl border border-[color:var(--color-border-soft)] bg-[color:rgba(10,8,5,0.6)] p-4 text-[0.78rem] leading-5 text-[color:var(--color-text-muted)] lg:flex-1">
                    {coverageCopy.noTrendValue}
                  </div>
                ) : null}
              </div>

              <div
                data-testid="daily-winrate-chart"
                className="h-full min-h-[260px] min-w-0 overflow-hidden rounded-2xl border border-[color:var(--color-border-soft)] bg-[linear-gradient(180deg,rgba(232,185,74,0.04),rgba(8,6,4,0.95))] p-2 sm:p-3 lg:min-h-[300px]"
              >
                {trendSeries.length > 0 ? (
                <svg
                  viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  className="block h-full w-full"
                  role="img"
                  aria-label={heroCopy.trend.chartAriaLabel}
                >
                  <defs>
                    {focusedTrendSeries ? (
                      <linearGradient id="focused-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={focusedTrendSeries.color} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={focusedTrendSeries.color} stopOpacity="0" />
                      </linearGradient>
                    ) : null}
                  </defs>

                  {trendYAxisTicks.map((tick) => {
                    const y = getChartY(tick, yMin, yMax);
                    return (
                      <g key={`tick-${tick.toFixed(4)}`}>
                        <line
                          x1={CHART_PADDING.left}
                          y1={y}
                          x2={CHART_WIDTH - CHART_PADDING.right}
                          y2={y}
                          stroke="rgba(148, 131, 95, 0.14)"
                          strokeWidth="1"
                          strokeDasharray="2 4"
                        />
                        <text
                          x={CHART_PADDING.left - 12}
                          y={y + 4}
                          fill="rgba(148, 131, 95, 0.78)"
                          fontSize="11"
                          fontFamily="JetBrains Mono, monospace"
                          textAnchor="end"
                        >
                          {formatPercent(tick)}
                        </text>
                      </g>
                    );
                  })}

                  {trendDayAxis.map((day, index) => {
                    const x = getChartX(index, trendDayAxis.length);
                    const isLast = index === trendDayAxis.length - 1;
                    return (
                      <g key={day}>
                        <line
                          x1={x}
                          y1={CHART_PADDING.top}
                          x2={x}
                          y2={CHART_HEIGHT - CHART_PADDING.bottom}
                          stroke="rgba(148, 131, 95, 0.06)"
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={CHART_HEIGHT - 14}
                          fill={isLast ? 'rgba(255,212,122,0.95)' : 'rgba(148, 131, 95, 0.78)'}
                          fontSize="11"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight={isLast ? '600' : '400'}
                          textAnchor="middle"
                        >
                          {formatShortDate(day, locale)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Focused area fill — drawn per segment beneath all lines */}
                  {focusedTrendSeries
                    ? segmentTrendPoints(focusedTrendSeries.points, trendDayAxis).map(
                        (segment, segmentIndex) => {
                          const points = segment.map(toChartPoint);
                          if (points.length === 0) return null;
                          const pathD = `M ${points[0].x} ${CHART_HEIGHT - CHART_PADDING.bottom} L ${points
                            .map((p) => `${p.x} ${p.y}`)
                            .join(' L ')} L ${points.at(-1)!.x} ${CHART_HEIGHT - CHART_PADDING.bottom} Z`;
                          return (
                            <path
                              key={`area-${segmentIndex}`}
                              d={pathD}
                              fill="url(#focused-area)"
                            />
                          );
                        }
                      )
                    : null}

                  {trendSeries.map((heroSeries) => {
                    const isFocused = heroSeries.hero === focusedTrendSeries?.hero;
                    const allPoints: ChartPoint[] = heroSeries.points.map(toChartPoint);
                    const segments = segmentTrendPoints(heroSeries.points, trendDayAxis).map(
                      (segment) => segment.map(toChartPoint)
                    );
                    const showTrendPoint = (point: ChartPoint | undefined) => {
                      if (point == null) return;
                      setFocusedHero(heroSeries.hero);
                      setHoveredTrendPoint({
                        ...point,
                        hero: heroSeries.hero,
                        color: heroSeries.color,
                      });
                    };
                    const clearTrendPoint = () => setHoveredTrendPoint(null);

                    return (
                      <g
                        key={heroSeries.hero}
                        data-testid="daily-winrate-line"
                        data-hero={heroSeries.hero}
                        data-selected={isFocused ? 'true' : 'false'}
                        className="transition-opacity duration-200"
                      >
                        {segments.map((segmentPoints, segmentIndex) => (
                          <polyline
                            key={`line-${segmentIndex}`}
                            fill="none"
                            stroke={heroSeries.color}
                            strokeOpacity={isFocused ? '1' : '0.18'}
                            strokeWidth={isFocused ? '3' : '2'}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            points={segmentPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                            style={isFocused ? { filter: `drop-shadow(0 0 6px ${heroSeries.color}88)` } : undefined}
                          />
                        ))}
                        {segments.map((segmentPoints, segmentIndex) => (
                          <polyline
                            key={`hover-${segmentIndex}`}
                            fill="none"
                            stroke="transparent"
                            strokeWidth="22"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            points={segmentPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                            aria-hidden="true"
                            onMouseEnter={(event) => showTrendPoint(getNearestChartPoint(event, allPoints))}
                            onMouseMove={(event) => showTrendPoint(getNearestChartPoint(event, allPoints))}
                            onMouseLeave={clearTrendPoint}
                            onClick={() => setFocusedHero(heroSeries.hero)}
                          />
                        ))}
                        {allPoints.map((point, index) => (
                          <circle
                            key={`${heroSeries.hero}-${index}`}
                            cx={point.x}
                            cy={point.y}
                            r={isFocused ? '4.5' : '3'}
                            fill={heroSeries.color}
                            fillOpacity={isFocused ? '1' : '0.4'}
                            stroke="rgba(12,10,7,0.95)"
                            strokeWidth="2"
                            onMouseEnter={() => showTrendPoint(point)}
                            onMouseLeave={clearTrendPoint}
                            onFocus={() => showTrendPoint(point)}
                            onBlur={clearTrendPoint}
                            tabIndex={0}
                            aria-label={`${heroSeries.hero} ${formatShortDate(point.day, locale)} ${formatPercent(point.winRate)}`}
                          />
                        ))}
                      </g>
                    );
                  })}

                  {hoveredTrendPoint ? (
                    <g data-testid="trend-point-tooltip" pointerEvents="none">
                      <line
                        x1={hoveredTrendPoint.x}
                        y1={hoveredTrendPoint.y}
                        x2={hoveredTrendPoint.x}
                        y2={CHART_HEIGHT - CHART_PADDING.bottom}
                        stroke={hoveredTrendPoint.color}
                        strokeOpacity="0.4"
                        strokeWidth="1"
                        strokeDasharray="2 3"
                      />
                      <circle
                        cx={hoveredTrendPoint.x}
                        cy={hoveredTrendPoint.y}
                        r="8"
                        fill="none"
                        stroke={hoveredTrendPoint.color}
                        strokeWidth="2"
                        strokeOpacity="0.6"
                      />
                      <rect
                        x={trendTooltipX}
                        y={trendTooltipY}
                        width={POINT_TOOLTIP_WIDTH}
                        height={POINT_TOOLTIP_HEIGHT}
                        rx="10"
                        fill="rgba(15,12,8,0.97)"
                        stroke={hoveredTrendPoint.color}
                        strokeOpacity="0.55"
                        strokeWidth="1"
                      />
                      <rect
                        x={trendTooltipX + 10}
                        y={trendTooltipY + 12}
                        width="3"
                        height="32"
                        fill={hoveredTrendPoint.color}
                        rx="1.5"
                      />
                      <text
                        x={trendTooltipX + 22}
                        y={trendTooltipY + 22}
                        fill="rgba(241,230,205,0.96)"
                        fontSize="12"
                        fontWeight="600"
                        fontFamily="IBM Plex Sans, sans-serif"
                      >
                        {hoveredTrendPoint.hero}
                      </text>
                      <text
                        x={trendTooltipX + 22}
                        y={trendTooltipY + 38}
                        fill="rgba(148,131,95,0.95)"
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                        letterSpacing="0.06em"
                      >
                        {formatShortDate(hoveredTrendPoint.day, locale)}
                      </text>
                      <text
                        x={trendTooltipX + POINT_TOOLTIP_WIDTH - 14}
                        y={trendTooltipY + 35}
                        fill="rgba(255,212,122,1)"
                        fontSize="18"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                        textAnchor="end"
                      >
                        {formatPercent(hoveredTrendPoint.winRate)}
                      </text>
                    </g>
                  ) : null}
                </svg>
                ) : (
                  <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-[color:var(--color-text-muted)]">
                    {heroCopy.snapshot.noData}
                  </div>
                )}
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
                {trendSeries.map((heroSeries) => {
                  const isFocused = heroSeries.hero === focusedTrendSeries?.hero;
                  return (
                    <button
                      key={heroSeries.hero}
                      type="button"
                      data-selected={isFocused ? 'true' : 'false'}
                      onMouseEnter={() => setFocusedHero(heroSeries.hero)}
                      onFocus={() => setFocusedHero(heroSeries.hero)}
                      onClick={() => setFocusedHero(heroSeries.hero)}
                      className={`group inline-flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                        isFocused
                          ? 'border-[color:var(--color-accent)] bg-[color:rgba(232,185,74,0.1)]'
                          : 'border-[color:var(--color-border-soft)] bg-[color:rgba(15,12,8,0.6)] hover:border-[color:var(--color-accent-deep)]'
                      }`}
                      aria-label={`${heroSeries.hero} ${formatNullablePercent(heroSeries.latestWinRate)}`}
                      title={heroSeries.hero}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-4 w-1 shrink-0 rounded-sm"
                          style={{
                            backgroundColor: heroSeries.color,
                            boxShadow: isFocused ? `0 0 10px ${heroSeries.color}aa` : `0 0 6px ${heroSeries.color}55`,
                          }}
                          aria-hidden="true"
                        />
                        <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-base)]">
                          {getHeroShortLabel(heroSeries.hero)}
                        </span>
                      </span>
                      <span
                        className={`tnum text-[0.74rem] font-semibold ${
                          isFocused ? 'text-[color:var(--color-accent-bright)]' : 'text-[color:var(--color-text-muted)]'
                        }`}
                      >
                        {formatNullablePercent(heroSeries.latestWinRate)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* === HERO RANKING =============================================== */}
          <section className="surface overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--color-border-soft)] px-6 py-5">
              <div>
                <p className="eyebrow eyebrow-rule">
                  {heroCopy.snapshot.label} · {loadedWindowDays.length > 0
                    ? `${coverageCopy.daysLoadedPrefix}${loadedWindowDays.length}${coverageCopy.daysLoadedSeparator}${nominalDays}`
                    : heroCopy.snapshot.noData}
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[color:var(--color-text-base)]">
                  {heroCopy.snapshot.titleLead} <span className="text-[color:var(--color-accent-bright)]">{heroCopy.snapshot.titleAccent}</span>
                </h2>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-[0.74rem] text-[color:var(--color-text-muted)]">
                  <span>{methodologyCopy.rankedByCaption}</span>
                  <span className="tnum rounded-full border border-[color:var(--color-border-soft)] px-2 py-0.5 text-[0.66rem] text-[color:var(--color-text-faint)]">
                    {methodologyCopy.formula.tenWinRate}
                  </span>
                  <button
                    type="button"
                    aria-label={methodologyCopy.triggerAriaLabel}
                    onClick={() => setMethodologyOpen(true)}
                    className="rounded-full border border-[color:var(--color-border-bright)] px-3 py-0.5 text-[0.7rem] font-medium text-[color:var(--color-accent-bright)] transition hover:border-[color:var(--color-accent)] hover:bg-[rgba(232,185,74,0.08)]"
                  >
                    {methodologyCopy.triggerLabel}
                  </button>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5" data-testid="tier-legend">
                {VICTORY_TIER_KEYS.map((tier) => (
                  <span
                    key={tier}
                    title={methodologyCopy.tierLegend[tier].gloss}
                    className="inline-flex items-center gap-1.5 text-[0.7rem] text-[color:var(--color-text-muted)]"
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: VICTORY_TIER_COLORS[tier] }}
                    />
                    {methodologyCopy.tierLegend[tier].label}
                  </span>
                ))}
              </div>
            </div>

            {failedWindowDays.length > 0 && rankingHasRows ? (
              <p className="border-b border-[color:var(--color-border-soft)] px-6 py-2.5 text-[0.74rem] text-[color:var(--color-text-muted)]">
                {coverageCopy.someDaysUnavailable}{' '}
                <span className="tnum text-[color:var(--color-text-faint)]">
                  {loadedWindowDays.length > 0
                    ? `${formatShortDate(loadedWindowDays[0]!.day, locale)} – ${formatShortDate(
                        loadedWindowDays.at(-1)!.day,
                        locale
                      )}`
                    : ''}
                </span>
              </p>
            ) : null}

            {rankingHasRows ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] table-fixed border-collapse">
                  <colgroup>
                    {RANKING_COLUMN_WIDTHS.map((width, index) => (
                      <col key={`${index}:${width}`} style={{ width }} />
                    ))}
                  </colgroup>
                  <thead className="font-display-italic text-left text-[0.72rem] uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
                    <tr>
                      <SortableHeader label={heroCopy.tableHeaders.hero} className="px-5 py-3.5" activeDirection={sortState.key === 'hero' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'hero', 'asc'))} info={headerInfo(methodologyCopy.tips.hero)} />
                      <SortableHeader label={heroCopy.tableHeaders.winRate} className="px-5 py-3.5" activeDirection={sortState.key === 'tenWinRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'tenWinRate', 'desc'))} info={headerInfo(methodologyCopy.formula.tenWinRate)} />
                      <SortableHeader label={heroCopy.tableHeaders.runs} className="px-3 py-3.5" activeDirection={sortState.key === 'runsCompleted' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runsCompleted', 'desc'))} info={headerInfo(methodologyCopy.tips.runs)} />
                      <SortableHeader label={heroCopy.tableHeaders.runShare} className="px-3 py-3.5" activeDirection={sortState.key === 'runShare' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runShare', 'desc'))} info={headerInfo(methodologyCopy.tips.share)} />
                      <SortableHeader label={heroCopy.tableHeaders.wins10w} className="px-3 py-3.5" activeDirection={sortState.key === 'tenWinCount' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'tenWinCount', 'desc'))} info={headerInfo(methodologyCopy.tips.wins10w)} />
                      <SortableHeader label={heroCopy.tableHeaders.avgDays} className="px-3 py-3.5" activeDirection={sortState.key === 'avgRunDays10w' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'avgRunDays10w', 'asc'))} info={headerInfo(methodologyCopy.formula.runDays)} />
                      <SortableHeader label={heroCopy.tableHeaders.perfect} className="px-3 py-3.5" activeDirection={sortState.key === 'perfectRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'perfectRate', 'desc'))} info={headerInfo(methodologyCopy.tips.perfect)} />
                      <SortableHeader label={heroCopy.tableHeaders.gold} className="px-3 py-3.5" activeDirection={sortState.key === 'goldRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'goldRate', 'desc'))} info={headerInfo(methodologyCopy.tips.gold)} />
                      <SortableHeader label={heroCopy.tableHeaders.silver} className="px-3 py-3.5" activeDirection={sortState.key === 'silverRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'silverRate', 'desc'))} info={headerInfo(methodologyCopy.tips.silver)} />
                      <SortableHeader label={heroCopy.tableHeaders.bronze} className="px-3 py-3.5" activeDirection={sortState.key === 'bronzeRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'bronzeRate', 'desc'))} info={headerInfo(methodologyCopy.tips.bronze)} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row, index) => {
                      const heroColor = getHeroColor(row.hero);
                      const isSelected = row.hero === focusedHero;
                      const rateRatio =
                        row.tenWinRate != null && maxTenWinRate > 0
                          ? row.tenWinRate / maxTenWinRate
                          : 0;
                      return (
                        <tr
                          key={row.hero}
                          className="metric-row hero-rail border-t border-[color:var(--color-border-soft)] text-sm text-[color:var(--color-text-base)]"
                          style={{ '--hero-color': heroColor } as React.CSSProperties}
                        >
                          <td className="relative px-5 py-4">
                            <button
                              type="button"
                              data-selected={isSelected ? 'true' : 'false'}
                              onClick={() => setFocusedHero(row.hero)}
                              className="inline-flex items-center gap-3 bg-transparent p-0 text-left transition"
                            >
                              <span
                                className="font-display-italic tnum text-[0.78rem] text-[color:var(--color-text-faint)]"
                                aria-hidden="true"
                              >
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <HeroBadge hero={row.hero} selected={isSelected} size="sm" />
                            </button>
                          </td>
                          <td
                            className="databar relative px-5 py-4 tnum text-[color:var(--color-accent-bright)]"
                            style={{ '--bar-width': `${rateRatio * 100}%` } as React.CSSProperties}
                          >
                            {renderRateCell(row.tenWinRate)}
                          </td>
                          <td className="px-3 py-4 tnum text-[color:var(--color-text-muted)]">
                            {formatInteger(row.runsCompleted, locale)}
                          </td>
                          <td className="px-3 py-4 tnum text-[color:var(--color-text-muted)]">
                            {renderRateCell(row.runShare)}
                          </td>
                          <td className="px-3 py-4 tnum text-[color:var(--color-text-base)]">
                            {formatInteger(row.tenWinCount, locale)}
                          </td>
                          <td
                            className="px-3 py-4 tnum text-[color:var(--color-text-muted)]"
                            aria-label={row.avgRunDays10w == null ? noValueLabel : undefined}
                          >
                            {formatDays(row.avgRunDays10w)}
                          </td>
                          <td className="px-3 py-4 tnum">{renderRateCell(row.perfectRate)}</td>
                          <td className="px-3 py-4 tnum">{renderRateCell(row.goldRate)}</td>
                          <td className="px-3 py-4 tnum">{renderRateCell(row.silverRate)}</td>
                          <td className="px-3 py-4 tnum">{renderRateCell(row.bronzeRate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <h3 className="font-display text-xl font-semibold text-[color:var(--color-text-base)]">
                  {loadedWindowDays.length === 0 ? heroCopy.unavailable.title : heroCopy.tierEmpty.title}
                </h3>
                <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
                  {loadedWindowDays.length === 0 ? heroCopy.unavailable.body : heroCopy.tierEmpty.body}
                </p>
              </div>
            )}
          </section>

          {/* === PER-HERO DOSSIER ========================================== */}
          {rankingHasRows && focusedHero != null && focusedMetrics != null ? (
            <section data-testid="hero-dossier" className="grid gap-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="eyebrow eyebrow-rule">{heroCopy.dossier.label}</p>
                <span className="tnum text-[0.72rem] uppercase tracking-[0.16em] text-[color:var(--color-text-faint)]">
                  {dossierContextLabel}
                </span>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <StagePanel
                  focusedHero={focusedHero}
                  merged={merged}
                  rows={sortedRows}
                  locale={locale}
                  heroLabel={heroCopy.tableHeaders.hero}
                  stageCopy={heroCopy.stage}
                  noDataLabel={heroCopy.snapshot.noData}
                  noValueLabel={noValueLabel}
                />
                <MatchupPanel
                  heroOptions={matchupHeroOptions}
                  selectedHero={selectedMatchupHero}
                  onHeroChange={setSelectedMatchupHero}
                  matchups={matchups}
                  matchupCopy={heroCopy.matchups}
                  locale={locale}
                  noValueLabel={noValueLabel}
                />
              </div>
            </section>
          ) : null}
        </section>
      )}

      <DialogShell
        open={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
        labelledBy="methodology-sheet-title"
        closeLabel={methodologyCopy.closeLabel}
        size="lg"
      >
        <p className="eyebrow eyebrow-rule">{methodologyCopy.sheetEyebrow}</p>
        <h2
          id="methodology-sheet-title"
          className="mt-2 font-display text-3xl font-semibold tracking-tight text-[color:var(--color-text-base)]"
        >
          {methodologyCopy.sheetTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[color:var(--color-text-muted)]">
          {methodologyCopy.intro}
        </p>
        <div className="mt-6 grid gap-5">
          {(
            ['ranking', 'battles', 'outcomes', 'tiers', 'tierVsAll', 'window', 'quality'] as const
          ).map((sectionKey) => (
            <section key={sectionKey}>
              <h3 className="font-display text-lg font-semibold text-[color:var(--color-accent-bright)]">
                {methodologyCopy.sections[sectionKey].title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-[color:var(--color-text-muted)]">
                {methodologyCopy.sections[sectionKey].body}
              </p>
            </section>
          ))}
        </div>
        <div className="mt-6 border-t border-[color:var(--color-border-soft)] pt-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            {methodologyCopy.glossary.map((entry) => (
              <div key={entry.term}>
                <dt className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-base)]">
                  {entry.term}
                </dt>
                <dd className="mt-0.5 text-[0.8rem] leading-5 text-[color:var(--color-text-muted)]">
                  {entry.definition}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </DialogShell>
    </StatsPageShell>
  );
}

// === coverage strip ============================================================

type CoverageStripProps = {
  loadedCount: number;
  nominalCount: number;
  windowLabel: string;
  partial: boolean;
  coverageCopy: ReturnType<typeof getSiteCopy>['stats']['heroes']['coverage'];
};

function CoverageStrip({
  loadedCount,
  nominalCount,
  windowLabel,
  partial,
  coverageCopy,
}: CoverageStripProps) {
  return (
    <p
      data-testid="coverage-strip"
      className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--color-text-faint)]"
    >
      <span className="tnum">
        {windowLabel}
        {coverageCopy.windowSuffix} · {coverageCopy.daysLoadedPrefix}
        {loadedCount}
        {coverageCopy.daysLoadedSeparator}
        {nominalCount}
      </span>
      {partial ? (
        <span className="text-[color:var(--color-accent-bright)]">{coverageCopy.partialNote}</span>
      ) : null}
    </p>
  );
}

// === dossier panels ============================================================

type StageCopy = ReturnType<typeof getSiteCopy>['stats']['heroes']['stage'];

function StagePanel({
  focusedHero,
  merged,
  rows,
  locale,
  heroLabel,
  stageCopy,
  noDataLabel,
  noValueLabel,
}: {
  focusedHero: string | null;
  merged: Map<string, MergedHeroRow>;
  rows: HeroMetricsRow[];
  locale: Locale;
  heroLabel: string;
  stageCopy: StageCopy;
  noDataLabel: string;
  noValueLabel: string;
}) {
  const [stageSortState, setStageSortState] = useState<SortState<StageSortKey> | null>(null);

  const visibleStageKeys = GAME_DAY_BUCKETS;

  const hasAnyStageData = rows.some((row) => {
    const counts = merged.get(row.hero)?.battleDays;
    return visibleStageKeys.some((key) => {
      const bucket = counts?.[key];
      return bucket != null && bucket.decided > 0;
    });
  });
  const sortedStageRows = useMemo(() => {
    const activeStageSortState =
      stageSortState != null &&
      (stageSortState.key === 'hero' || visibleStageKeys.includes(stageSortState.key))
        ? stageSortState
        : null;

    if (activeStageSortState == null) {
      return rows;
    }

    const sortAccessors = {
      hero: (row) => row.hero,
    } as Record<StageSortKey, (row: HeroMetricsRow) => string | number | null | undefined> &
      Record<string, ((row: HeroMetricsRow) => string | number | null | undefined) | undefined>;

    for (const key of visibleStageKeys) {
      sortAccessors[key] = (row) => bucketRate(merged.get(row.hero)?.battleDays[key]);
    }

    return sortRows(rows, activeStageSortState, sortAccessors);
  }, [merged, rows, stageSortState, visibleStageKeys]);
  const stageTableMinWidth = 120 + visibleStageKeys.length * 112;
  const handleStageSort = (key: StageSortKey, initialDirection: 'asc' | 'desc') => {
    setStageSortState((current) =>
      current == null ? { key, direction: initialDirection } : toggleSort(current, key, initialDirection)
    );
  };

  return (
    <section data-testid="stage-panel" className="surface p-5">
      <h3 className="font-display text-lg font-semibold text-[color:var(--color-text-base)]">
        {stageCopy.title}
      </h3>

      {hasAnyStageData ? (
        <div className="mt-4 overflow-x-auto">
          <table
            className="w-full min-w-[360px] table-fixed border-collapse text-[0.78rem]"
            style={{ minWidth: stageTableMinWidth }}
          >
            <thead className="font-display-italic text-left text-[0.66rem] uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">
              <tr>
                <SortableHeader
                  label={heroLabel}
                  className="py-2 pr-2"
                  activeDirection={stageSortState?.key === 'hero' ? stageSortState.direction : undefined}
                  onToggle={() => handleStageSort('hero', 'asc')}
                />
                {visibleStageKeys.map((key) => (
                  <SortableHeader
                    key={key}
                    label={stageCopy[key]}
                    className="px-2 py-2"
                    activeDirection={stageSortState?.key === key ? stageSortState.direction : undefined}
                    onToggle={() => handleStageSort(key, 'desc')}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStageRows.map((row) => {
                const counts = merged.get(row.hero)?.battleDays;
                return (
                  <tr
                    key={row.hero}
                    className="metric-row border-t border-[color:var(--color-border-soft)]"
                    data-selected={row.hero === focusedHero ? 'true' : 'false'}
                  >
                    <td className="py-2 pr-2">
                      <HeroBadge hero={row.hero} selected={row.hero === focusedHero} size="sm" />
                    </td>
                    {visibleStageKeys.map((key) => {
                      const rate = bucketRate(counts?.[key]);
                      return (
                        <td
                          key={key}
                          className="databar relative px-2 py-2 tnum text-[color:var(--color-text-base)]"
                          style={{ '--bar-width': `${(rate ?? 0) * 100}%` } as React.CSSProperties}
                          aria-label={rate == null ? noValueLabel : undefined}
                        >
                          <span className="relative">{formatNullablePercent(rate)}</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">{noDataLabel}</p>
      )}
    </section>
  );
}

type MatchupsCopy = ReturnType<typeof getSiteCopy>['stats']['heroes']['matchups'];

function MatchupPanel({
  heroOptions,
  selectedHero,
  onHeroChange,
  matchups,
  matchupCopy,
  locale,
  noValueLabel,
}: {
  heroOptions: string[];
  selectedHero: string | null;
  onHeroChange: (hero: string) => void;
  matchups: { rows: MatchupRow[] } | null;
  matchupCopy: MatchupsCopy;
  locale: Locale;
  noValueLabel: string;
}) {
  const rows = matchups?.rows ?? [];

  return (
    <section data-testid="matchup-panel" className="surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-[color:var(--color-text-base)]">
          {matchupCopy.title}
        </h3>
        {heroOptions.length > 0 ? (
          <div
            role="group"
            aria-label={matchupCopy.heroSelectorLabel}
            data-testid="matchup-hero-selector"
            className="flex max-w-full flex-wrap justify-end gap-1.5"
          >
            {heroOptions.map((hero) => {
              const selected = hero === selectedHero;
              return (
                <button
                  key={hero}
                  type="button"
                  aria-pressed={selected}
                  data-selected={selected ? 'true' : 'false'}
                  onClick={() => onHeroChange(hero)}
                  className={`inline-flex items-center rounded-lg border px-1.5 py-1 transition ${
                    selected
                      ? 'border-[color:var(--color-accent)] bg-[color:rgba(232,185,74,0.1)]'
                      : 'border-[color:var(--color-border-soft)] bg-[color:rgba(15,12,8,0.6)] hover:border-[color:var(--color-accent-deep)]'
                  }`}
                >
                  <HeroBadge hero={hero} selected={selected} size="sm" />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">{matchupCopy.empty}</p>
      ) : (
        <ul data-testid="matchup-list" className="mt-4 grid gap-2">
          {rows.map((row) => (
            <li key={row.opponentHero} className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5">
              <HeroBadge hero={row.opponentHero} size="sm" />
              <span
                className="databar databar-pos relative block h-6 rounded-sm"
                style={{
                  '--bar-width': `${(row.isLowSample ? 0 : row.winRate ?? 0) * 100}%`,
                } as React.CSSProperties}
              >
                <span
                  className="absolute inset-y-0 left-2 flex items-center gap-2 tnum text-[0.78rem] text-[color:var(--color-text-base)]"
                  aria-label={row.isLowSample || row.winRate == null ? noValueLabel : undefined}
                >
                  {row.isLowSample ? '—' : formatNullablePercent(row.winRate)}
                  {row.isLowSample ? (
                    <span className="rounded-sm border border-[color:var(--color-border-soft)] px-1 py-0.5 text-[0.58rem] uppercase tracking-[0.1em] text-[color:var(--color-text-faint)]">
                      {matchupCopy.lowSampleTag}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="tnum text-[0.7rem] text-[color:var(--color-text-faint)]">
                {formatInteger(row.decided, locale)} {matchupCopy.sample}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
