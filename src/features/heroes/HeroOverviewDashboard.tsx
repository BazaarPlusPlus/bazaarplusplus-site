import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';

import { BAZAARDB_ICON_PATH, BAZAARDB_INTEGRATION_DOC_URL, BAZAARDB_META_URL, getSiteCopy } from '../../content/site-copy';
import {
  DEFAULT_LOCALE,
  type HeroOverviewPayload,
  type HeroWinrateDailyPayload,
  type Locale,
  type MetricWindow,
  type RatingTier,
} from '../../shared/lib/metrics';
import {
  WINDOW_LABELS,
  formatInteger,
  formatPercent,
  formatShortDate,
} from '../../shared/lib/dashboard';
import { getHeroColor, getHeroShortLabel } from '../../shared/lib/heroes';
import { sortRows, toggleSort, type SortState } from '../../shared/lib/table-sorting';
import HeroBadge from '../../shared/components/HeroBadge';
import { SegmentedButton, SegmentedControl } from '../../shared/components/ScopeFilterPanel';
import SortableHeader from '../../shared/components/SortableHeader';
import StatsPageShell from '../../shared/components/StatsPageShell';

type HeroOverviewDashboardProps = {
  locale: Locale;
  availableWindows: MetricWindow[];
  availableTiers: RatingTier[];
  initialSelectedWindow: MetricWindow;
  initialSelectedTier: RatingTier;
  dailyByTier: Partial<Record<RatingTier, HeroWinrateDailyPayload>>;
  overviewByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, HeroOverviewPayload>>>>;
};

type HeroSeries = {
  hero: string;
  color: string;
  points: Array<{ day: string; winRate: number }>;
  latestWinRate: number;
};

type DailyDetailRow = {
  hero: string;
  day: string;
  runsTotal: number | null;
  completedRuns: number;
  wins10w: number;
  winRate: number;
  winRateWilsonLower: number;
  perfectRate: number | null;
  goldRate: number | null;
  silverRate: number | null;
  bronzeRate: number | null;
};

type DailySortKey =
  | 'hero'
  | 'winRate'
  | 'runsTotal'
  | 'runsShare'
  | 'wins10w'
  | 'perfectRate'
  | 'goldRate'
  | 'silverRate'
  | 'bronzeRate';

type TrendTier = Extract<RatingTier, 'all' | 'mid' | 'high'>;

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
const WINDOW_DAY_COUNT: Record<MetricWindow, number> = {
  '1d': 1,
  '3d': 3,
  '7d': 7,
};
const TREND_WINDOW: MetricWindow = '7d';
const TREND_TIER_OPTIONS: TrendTier[] = ['all', 'mid', 'high'];
const SNAPSHOT_COLUMN_WIDTHS = ['18%', '12%', '11%', '10%', '11%', '10%', '10%', '9%', '9%'];

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

function buildTierRate(counts: Record<string, number> | undefined, key: string, denominator: number) {
  if (!counts || denominator <= 0) {
    return null;
  }

  return (counts[key] ?? 0) / denominator;
}

function buildChartState(
  dailyPayload: HeroWinrateDailyPayload | undefined,
  overviewPayload: HeroOverviewPayload | undefined,
  selectedWindow: MetricWindow
) {
  const rows = dailyPayload?.rows ?? [];
  const sortedRows = [...rows].sort(
    (a, b) => new Date(a.day).getTime() - new Date(b.day).getTime() || a.hero.localeCompare(b.hero)
  );
  const allDays = Array.from(new Set(sortedRows.map((row) => row.day)));
  const visibleDays = allDays.slice(-WINDOW_DAY_COUNT[selectedWindow]);
  const filteredRows = sortedRows.filter((row) => visibleDays.includes(row.day));
  const latestDay = visibleDays.at(-1);
  const latestRows = latestDay
    ? filteredRows
        .filter((row) => row.day === latestDay)
        .sort((a, b) => b.win_rate - a.win_rate || a.hero.localeCompare(b.hero))
    : [];

  const overviewRows = [...(overviewPayload?.rows ?? [])].sort(
    (a, b) => b.win_rate - a.win_rate || a.hero.localeCompare(b.hero)
  );

  const detailRows: DailyDetailRow[] =
    overviewPayload != null
      ? overviewRows.map((overview) => ({
          hero: overview.hero,
          day: latestDay ?? overviewPayload.generatedAt,
          runsTotal: overview.runs_total,
          completedRuns: overview.runs_completed,
          wins10w: overview.runs_10w,
          winRate: overview.win_rate,
          winRateWilsonLower: overview.win_rate_wilson_lower,
          perfectRate: buildTierRate(
            overview.victory_tier_counts,
            'perfect',
            overview.runs_completed
          ),
          goldRate: buildTierRate(overview.victory_tier_counts, 'gold', overview.runs_completed),
          silverRate: buildTierRate(
            overview.victory_tier_counts,
            'silver',
            overview.runs_completed
          ),
          bronzeRate: buildTierRate(
            overview.victory_tier_counts,
            'bronze',
            overview.runs_completed
          ),
        }))
      : latestRows.map((row) => ({
          hero: row.hero,
          day: row.day,
          runsTotal: null,
          completedRuns: row.completed_runs,
          wins10w: row.wins_10w,
          winRate: row.win_rate,
          winRateWilsonLower: row.win_rate_wilson_lower,
          perfectRate: null,
          goldRate: null,
          silverRate: null,
          bronzeRate: null,
        }));

  const grouped = new Map<string, HeroSeries['points']>();
  for (const row of filteredRows) {
    const points = grouped.get(row.hero) ?? [];
    points.push({ day: row.day, winRate: row.win_rate });
    grouped.set(row.hero, points);
  }

  const winRates = filteredRows.map((row) => row.win_rate);
  const minWinRate = winRates.length > 0 ? Math.min(...winRates) : 0;
  const maxWinRate = winRates.length > 0 ? Math.max(...winRates) : 1;
  const spread = Math.max(maxWinRate - minWinRate, 0.04);
  const paddedMin = clamp(Math.floor(((minWinRate - spread * 0.2) * 100) / 5) * 5 / 100, 0, 0.95);
  const paddedMax = clamp(Math.ceil(((maxWinRate + spread * 0.2) * 100) / 5) * 5 / 100, 0.05, 1);
  const yMin = Math.min(paddedMin, maxWinRate);
  const yMax = Math.max(paddedMax, minWinRate + 0.01);
  const tickStep = (yMax - yMin) / GRIDLINE_COUNT;
  const yAxisTicks = Array.from({ length: GRIDLINE_COUNT + 1 }, (_, index) => yMin + tickStep * index);

  const series = Array.from(grouped.entries())
    .map(([hero, points]) => ({
      hero,
      color: getHeroColor(hero),
      points,
      latestWinRate: points.at(-1)?.winRate ?? 0,
    }))
    .sort((a, b) => b.latestWinRate - a.latestWinRate || a.hero.localeCompare(b.hero));

  return { visibleDays, detailRows, latestDay, yAxisTicks, series };
}

function computeTrendDelta(series: HeroSeries): { delta: number; first: number } {
  const first = series.points[0]?.winRate ?? series.latestWinRate;
  return { delta: series.latestWinRate - first, first };
}

export default function HeroOverviewDashboard({
  locale,
  availableWindows,
  availableTiers,
  initialSelectedWindow,
  initialSelectedTier,
  dailyByTier,
  overviewByWindow,
}: HeroOverviewDashboardProps) {
  const copy = getSiteCopy(locale);
  const heroCopy = copy.stats.heroes;
  const scopeCopy = copy.common.scope;
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
  const [selectedTrendTier, setSelectedTrendTier] = useState<TrendTier>('all');
  const [sortState, setSortState] = useState<SortState<DailySortKey>>({
    key: 'winRate',
    direction: 'desc',
  });

  const snapshotTierOptions = useMemo(
    () => TREND_TIER_OPTIONS.filter((tierOption) => availableTiers.includes(tierOption)),
    [availableTiers]
  );
  const fallbackSnapshotTier = snapshotTierOptions[0] ?? 'all';
  const activeSnapshotTier = snapshotTierOptions.includes(selectedTier as TrendTier)
    ? (selectedTier as TrendTier)
    : fallbackSnapshotTier;
  const trendTierOptions = useMemo(
    () =>
      TREND_TIER_OPTIONS.filter(
        (tierOption) => availableTiers.includes(tierOption) && dailyByTier[tierOption] != null
      ),
    [availableTiers, dailyByTier]
  );
  const fallbackTrendTier = trendTierOptions[0] ?? 'all';
  const activeTrendTier = trendTierOptions.includes(selectedTrendTier)
    ? selectedTrendTier
    : fallbackTrendTier;

  const snapshotDailyPayload =
    dailyByTier[activeSnapshotTier] ??
    dailyByTier[fallbackSnapshotTier] ??
    dailyByTier[availableTiers[0]];
  const snapshotOverviewPayload =
    overviewByWindow[selectedWindow]?.[activeSnapshotTier] ??
    overviewByWindow[selectedWindow]?.[fallbackSnapshotTier] ??
    overviewByWindow[selectedWindow]?.[availableTiers[0]];
  const trendDailyPayload =
    dailyByTier[activeTrendTier] ??
    dailyByTier[fallbackTrendTier] ??
    dailyByTier.all ??
    dailyByTier[availableTiers[0]];
  const trendOverviewPayload =
    overviewByWindow[TREND_WINDOW]?.[activeTrendTier] ??
    overviewByWindow[TREND_WINDOW]?.[fallbackTrendTier] ??
    overviewByWindow[TREND_WINDOW]?.all ??
    overviewByWindow[TREND_WINDOW]?.[availableTiers[0]];
  const currentGeneratedAt =
    snapshotDailyPayload?.generatedAt ??
    snapshotOverviewPayload?.generatedAt ??
    trendDailyPayload?.generatedAt ??
    trendOverviewPayload?.generatedAt ??
    '';

  const {
    visibleDays: trendVisibleDays,
    yAxisTicks: trendYAxisTicks,
    series: trendSeries,
  } = useMemo(
    () => buildChartState(trendDailyPayload, trendOverviewPayload, TREND_WINDOW),
    [trendDailyPayload, trendOverviewPayload]
  );
  const { detailRows, latestDay } = useMemo(
    () => buildChartState(snapshotDailyPayload, snapshotOverviewPayload, selectedWindow),
    [selectedWindow, snapshotDailyPayload, snapshotOverviewPayload]
  );
  const bestTrendHero = trendSeries[0];
  const [selectedTrendHero, setSelectedTrendHero] = useState<string | null>(
    bestTrendHero?.hero ?? null
  );
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<HoveredTrendPoint | null>(null);
  const [selectedSnapshotHero, setSelectedSnapshotHero] = useState<string | null>(
    detailRows[0]?.hero ?? null
  );
  const yMin = trendYAxisTicks[0] ?? 0;
  const yMax = trendYAxisTicks.at(-1) ?? 1;
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

  useEffect(() => {
    if (
      snapshotTierOptions.length > 0 &&
      !snapshotTierOptions.includes(selectedTier as TrendTier)
    ) {
      setSelectedTier(fallbackSnapshotTier);
    }
  }, [fallbackSnapshotTier, selectedTier, snapshotTierOptions]);

  useEffect(() => {
    if (trendTierOptions.length > 0 && !trendTierOptions.includes(selectedTrendTier)) {
      setSelectedTrendTier(trendTierOptions[0] ?? 'all');
    }
  }, [selectedTrendTier, trendTierOptions]);

  useEffect(() => {
    if (bestTrendHero == null) {
      setSelectedTrendHero(null);
      return;
    }

    if (
      selectedTrendHero == null ||
      !trendSeries.some((heroSeries) => heroSeries.hero === selectedTrendHero)
    ) {
      setSelectedTrendHero(bestTrendHero.hero);
    }
  }, [bestTrendHero, selectedTrendHero, trendSeries]);

  useEffect(() => {
    const firstSnapshotHero = detailRows[0]?.hero ?? null;
    if (
      selectedSnapshotHero == null ||
      !detailRows.some((row) => row.hero === selectedSnapshotHero)
    ) {
      setSelectedSnapshotHero(firstSnapshotHero);
    }
  }, [detailRows, selectedSnapshotHero]);

  const focusedTrendHero =
    (selectedTrendHero
      ? trendSeries.find((heroSeries) => heroSeries.hero === selectedTrendHero)
      : undefined) ?? bestTrendHero;

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

    if (activeSnapshotTier !== 'all') {
      params.set('t', activeSnapshotTier);
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
  }, [activeSnapshotTier, locale, selectedWindow]);

  const generatedAt = currentGeneratedAt || new Date().toISOString();
  const sortedDetailRows = useMemo(
    () =>
      sortRows(detailRows, sortState, {
        hero: (row) => row.hero,
        winRate: (row) => row.winRate,
        runsTotal: (row) => row.runsTotal,
        runsShare: (row) => row.runsTotal,
        wins10w: (row) => row.wins10w,
        perfectRate: (row) => row.perfectRate,
        goldRate: (row) => row.goldRate,
        silverRate: (row) => row.silverRate,
        bronzeRate: (row) => row.bronzeRate,
      }),
    [detailRows, sortState]
  );
  const maxWinRateInTable = sortedDetailRows.reduce(
    (max, row) => (row.winRate > max ? row.winRate : max),
    0
  );
  const totalRunsInTable = sortedDetailRows.reduce(
    (sum, row) => sum + (row.runsTotal ?? 0),
    0
  );
  const focusedDelta = focusedTrendHero ? computeTrendDelta(focusedTrendHero) : null;
  return (
    <StatsPageShell
      activeSection="heroes"
      locale={locale}
      eyebrow={heroCopy.eyebrow}
      title={heroCopy.title}
      generatedAt={generatedAt}
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
      filters={null}
    >
      <section className="grid gap-6">
        {/* === TREND SECTION ============================================ */}
        <section className="surface relative overflow-hidden p-5 sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: focusedTrendHero
                ? `radial-gradient(ellipse at 78% 12%, ${focusedTrendHero.color}18, transparent 55%)`
                : undefined,
            }}
          />

          <div className="relative grid min-w-0 gap-4 lg:grid-cols-[260px_1fr] lg:gap-x-6">
            {/* Row 1, col 1: Header + focus card */}
            <div className="flex flex-col gap-4 lg:h-full">
              <div>
                <p className="eyebrow eyebrow-rule">{WINDOW_LABELS[TREND_WINDOW]} {heroCopy.trend.winrateTrend}</p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[color:var(--color-text-base)]">
                  {heroCopy.trend.titleLead} <span className="text-[color:var(--color-accent-bright)]">{heroCopy.trend.titleAccent}</span>
                </h2>
              </div>

              {focusedTrendHero ? (
                <div className="rounded-xl border border-[color:var(--color-border-soft)] bg-[color:rgba(10,8,5,0.6)] p-4 lg:flex-1">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow text-[0.66rem] tracking-[0.22em]">{heroCopy.trend.inFocus}</span>
                    {focusedDelta ? (
                      <span
                        className={`tnum text-[0.7rem] font-semibold ${
                          focusedDelta.delta >= 0
                            ? 'text-[color:var(--color-pos)]'
                            : 'text-[color:var(--color-neg)]'
                        }`}
                      >
                        {focusedDelta.delta >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(focusedDelta.delta))}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span
                      className="h-8 w-1 rounded-sm"
                      style={{
                        backgroundColor: focusedTrendHero.color,
                        boxShadow: `0 0 12px ${focusedTrendHero.color}66`,
                      }}
                      aria-hidden="true"
                    />
                    <div>
                      <div className="font-display text-2xl font-semibold text-[color:var(--color-text-base)]">
                        {focusedTrendHero.hero}
                      </div>
                      <div className="font-display-italic text-[0.78rem] tracking-[0.18em] text-[color:var(--color-text-muted)]">
                        {getHeroShortLabel(focusedTrendHero.hero)} · {WINDOW_LABELS[TREND_WINDOW]}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <div className="eyebrow text-[0.62rem] tracking-[0.2em]">{heroCopy.trend.latest}</div>
                      <div className="mt-1 tnum text-2xl font-semibold text-[color:var(--color-accent-bright)]">
                        {formatPercent(focusedTrendHero.latestWinRate)}
                      </div>
                    </div>
                    {focusedDelta ? (
                      <div>
                        <div className="eyebrow text-[0.62rem] tracking-[0.2em]">{heroCopy.trend.startedAt}</div>
                        <div className="mt-1 tnum text-2xl font-semibold text-[color:var(--color-text-muted)]">
                          {formatPercent(focusedDelta.first)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Row 1, col 2: Chart */}
            <div
                data-testid="daily-winrate-chart"
                className="h-full min-h-[260px] min-w-0 overflow-hidden rounded-2xl border border-[color:var(--color-border-soft)] bg-[linear-gradient(180deg,rgba(232,185,74,0.04),rgba(8,6,4,0.95))] p-2 sm:p-3 lg:min-h-[300px]"
              >
                <svg
                  viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  className="block h-full w-full"
                  role="img"
                  aria-label={heroCopy.trend.chartAriaLabel}
                >
                  <defs>
                    {focusedTrendHero ? (
                      <linearGradient id="focused-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={focusedTrendHero.color} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={focusedTrendHero.color} stopOpacity="0" />
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

                  {trendVisibleDays.map((day, index) => {
                    const x = getChartX(index, trendVisibleDays.length);
                    const isLast = index === trendVisibleDays.length - 1;
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

                  {/* Focused area fill — drawn beneath all lines */}
                  {focusedTrendHero ? (
                    (() => {
                      const points = focusedTrendHero.points.map((point) => ({
                        x: getChartX(trendVisibleDays.indexOf(point.day), trendVisibleDays.length),
                        y: getChartY(point.winRate, yMin, yMax),
                      }));
                      if (points.length === 0) return null;
                      const pathD = `M ${points[0].x} ${CHART_HEIGHT - CHART_PADDING.bottom} L ${points
                        .map((p) => `${p.x} ${p.y}`)
                        .join(' L ')} L ${points.at(-1)!.x} ${CHART_HEIGHT - CHART_PADDING.bottom} Z`;
                      return <path d={pathD} fill="url(#focused-area)" />;
                    })()
                  ) : null}

                  {trendSeries.map((heroSeries) => {
                    const isFocused = heroSeries.hero === focusedTrendHero?.hero;
                    const points: ChartPoint[] = heroSeries.points.map((point) => ({
                      day: point.day,
                      winRate: point.winRate,
                      x: getChartX(trendVisibleDays.indexOf(point.day), trendVisibleDays.length),
                      y: getChartY(point.winRate, yMin, yMax),
                    }));
                    const showTrendPoint = (point: ChartPoint | undefined) => {
                      if (point == null) return;
                      setSelectedTrendHero(heroSeries.hero);
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
                        <polyline
                          fill="none"
                          stroke={heroSeries.color}
                          strokeOpacity={isFocused ? '1' : '0.18'}
                          strokeWidth={isFocused ? '3' : '2'}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                          style={isFocused ? { filter: `drop-shadow(0 0 6px ${heroSeries.color}88)` } : undefined}
                        />
                        <polyline
                          fill="none"
                          stroke="transparent"
                          strokeWidth="22"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                          aria-hidden="true"
                          onMouseEnter={(event) => showTrendPoint(getNearestChartPoint(event, points))}
                          onMouseMove={(event) => showTrendPoint(getNearestChartPoint(event, points))}
                          onMouseLeave={clearTrendPoint}
                          onClick={() => setSelectedTrendHero(heroSeries.hero)}
                        />
                        {points.map((point, index) => (
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
              </div>

            {/* Row 2, col 1: Tier filter */}
            <div className="flex items-center gap-3">
              {trendTierOptions.length > 0 ? (
                <>
                  <p className="eyebrow whitespace-nowrap text-[0.66rem] tracking-[0.22em]">{scopeCopy.tier}</p>
                  <SegmentedControl>
                    {trendTierOptions.map((tierOption) => (
                      <SegmentedButton
                        key={tierOption}
                        active={tierOption === activeTrendTier}
                        onClick={() => setSelectedTrendTier(tierOption)}
                      >
                        {scopeCopy.tierLabels[tierOption]}
                      </SegmentedButton>
                    ))}
                  </SegmentedControl>
                </>
              ) : null}
            </div>

            {/* Row 2, col 2: Hero legend */}
            <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
                {trendSeries.map((heroSeries) => {
                  const isFocused = heroSeries.hero === focusedTrendHero?.hero;
                  return (
                    <button
                      key={heroSeries.hero}
                      type="button"
                      data-selected={isFocused ? 'true' : 'false'}
                      onMouseEnter={() => setSelectedTrendHero(heroSeries.hero)}
                      onFocus={() => setSelectedTrendHero(heroSeries.hero)}
                      onClick={() => setSelectedTrendHero(heroSeries.hero)}
                      className={`group inline-flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                        isFocused
                          ? 'border-[color:var(--color-accent)] bg-[color:rgba(232,185,74,0.1)]'
                          : 'border-[color:var(--color-border-soft)] bg-[color:rgba(15,12,8,0.6)] hover:border-[color:var(--color-accent-deep)]'
                      }`}
                      aria-label={`${heroSeries.hero} ${formatPercent(heroSeries.latestWinRate)}`}
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
                        {formatPercent(heroSeries.latestWinRate)}
                      </span>
                    </button>
                  );
                })}
              </div>
          </div>
        </section>

        {/* === SNAPSHOT TABLE ============================================ */}
        <section className="surface overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--color-border-soft)] px-6 py-5">
              <div>
                <p className="eyebrow eyebrow-rule">{heroCopy.snapshot.label} · {latestDay ? formatShortDate(latestDay, locale) : heroCopy.snapshot.noData}</p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[color:var(--color-text-base)]">
                  {heroCopy.snapshot.titleLead} <span className="text-[color:var(--color-accent-bright)]">{heroCopy.snapshot.titleAccent}</span>
                </h2>
              </div>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                <div>
                  <p className="eyebrow text-[0.66rem] tracking-[0.22em]">{scopeCopy.window}</p>
                  <div className="mt-1.5">
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
                </div>
                <div>
                  <p className="eyebrow text-[0.66rem] tracking-[0.22em]">{scopeCopy.tier}</p>
                  <div className="mt-1.5">
                    <SegmentedControl>
                      {snapshotTierOptions.map((option) => (
                        <SegmentedButton
                          key={option}
                          active={option === activeSnapshotTier}
                          onClick={() => setSelectedTier(option)}
                        >
                          {scopeCopy.tierLabels[option]}
                        </SegmentedButton>
                      ))}
                    </SegmentedControl>
                  </div>
                </div>
              </div>
            </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] table-fixed border-collapse">
              <colgroup>
                {SNAPSHOT_COLUMN_WIDTHS.map((width, index) => (
                  <col key={`${index}:${width}`} style={{ width }} />
                ))}
              </colgroup>
              <thead className="font-display-italic text-left text-[0.72rem] uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
                <tr>
                  <SortableHeader label={heroCopy.tableHeaders.hero} className="px-5 py-3.5" activeDirection={sortState.key === 'hero' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'hero', 'asc'))} />
                  <SortableHeader label={heroCopy.tableHeaders.winRate} className="px-5 py-3.5" activeDirection={sortState.key === 'winRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'winRate', 'desc'))} />
                  <SortableHeader label={heroCopy.tableHeaders.runs} className="px-5 py-3.5" activeDirection={sortState.key === 'runsTotal' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runsTotal', 'desc'))} />
                  <SortableHeader label={heroCopy.tableHeaders.share} className="px-5 py-3.5" activeDirection={sortState.key === 'runsShare' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runsShare', 'desc'))} />
                  <SortableHeader label={heroCopy.tableHeaders.wins10w} className="px-5 py-3.5" activeDirection={sortState.key === 'wins10w' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'wins10w', 'desc'))} />
                  <SortableHeader label={heroCopy.tableHeaders.perfect} className="px-5 py-3.5" activeDirection={sortState.key === 'perfectRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'perfectRate', 'desc'))} />
                  <SortableHeader label={heroCopy.tableHeaders.gold} className="px-5 py-3.5" activeDirection={sortState.key === 'goldRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'goldRate', 'desc'))} />
                  <SortableHeader label={heroCopy.tableHeaders.silver} className="px-5 py-3.5" activeDirection={sortState.key === 'silverRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'silverRate', 'desc'))} />
                  <SortableHeader label={heroCopy.tableHeaders.bronze} className="px-5 py-3.5" activeDirection={sortState.key === 'bronzeRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'bronzeRate', 'desc'))} />
                </tr>
              </thead>
              <tbody>
                {sortedDetailRows.map((row, index) => {
                  const heroColor = getHeroColor(row.hero);
                  const isSelected = row.hero === selectedSnapshotHero;
                  const winRateRatio = maxWinRateInTable > 0 ? row.winRate / maxWinRateInTable : 0;
                  return (
                    <tr
                      key={`${row.day}:${row.hero}`}
                      className="metric-row hero-rail border-t border-[color:var(--color-border-soft)] text-sm text-[color:var(--color-text-base)]"
                      style={{ '--hero-color': heroColor } as React.CSSProperties}
                    >
                      <td className="relative px-5 py-4">
                        <button
                          type="button"
                          data-selected={isSelected ? 'true' : 'false'}
                          onMouseEnter={() => setSelectedSnapshotHero(row.hero)}
                          onFocus={() => setSelectedSnapshotHero(row.hero)}
                          onClick={() => setSelectedSnapshotHero(row.hero)}
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
                      <td className="databar relative px-5 py-4 tnum text-[color:var(--color-accent-bright)]" style={{ '--bar-width': `${winRateRatio * 100}%` } as React.CSSProperties}>
                        <span className="relative">{formatPercent(row.winRate)}</span>
                      </td>
                      <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                        {row.runsTotal == null ? '—' : formatInteger(row.runsTotal, locale)}
                      </td>
                      <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                        {row.runsTotal == null || totalRunsInTable === 0
                          ? '—'
                          : formatPercent(row.runsTotal / totalRunsInTable)}
                      </td>
                      <td className="px-5 py-4 tnum text-[color:var(--color-text-base)]">{formatInteger(row.wins10w, locale)}</td>
                      <td className="px-5 py-4 tnum">
                        {row.perfectRate === null ? '—' : formatPercent(row.perfectRate)}
                      </td>
                      <td className="px-5 py-4 tnum">
                        {row.goldRate === null ? '—' : formatPercent(row.goldRate)}
                      </td>
                      <td className="px-5 py-4 tnum">
                        {row.silverRate === null ? '—' : formatPercent(row.silverRate)}
                      </td>
                      <td className="px-5 py-4 tnum">
                        {row.bronzeRate === null ? '—' : formatPercent(row.bronzeRate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </StatsPageShell>
  );
}
