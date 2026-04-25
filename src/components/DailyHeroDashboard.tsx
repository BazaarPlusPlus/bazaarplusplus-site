import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';

import type {
  HeroOverviewPayload,
  HeroWinrateDailyPayload,
  Locale,
  MetricsSource,
  MetricWindow,
  RatingTier,
} from '../lib/metrics';
import {
  TIER_LABELS,
  WINDOW_LABELS,
  formatInteger,
  formatPercent,
  formatShortDate,
} from '../lib/dashboard';
import { buildHeroHref, getHeroColor, getHeroShortLabel } from '../lib/heroes';
import { sortRows, toggleSort, type SortState } from '../lib/table-sorting';
import HeroBadge from './HeroBadge';
import SortableHeader from './SortableHeader';
import StatsPageShell from './StatsPageShell';

type DailyHeroDashboardProps = {
  locale: Locale;
  source: MetricsSource;
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
const CHART_PADDING = { top: 24, right: 24, bottom: 44, left: 56 };
const POINT_TOOLTIP_WIDTH = 70;
const POINT_TOOLTIP_HEIGHT = 28;
const POINT_TOOLTIP_OFFSET = 14;
const GRIDLINE_COUNT = 4;
const WINDOW_DAY_COUNT: Record<MetricWindow, number> = {
  '1d': 1,
  '3d': 3,
  '7d': 7,
};
const TREND_WINDOW: MetricWindow = '7d';
const TREND_TIER_OPTIONS: TrendTier[] = ['all', 'mid', 'high'];
const TREND_TIER_LABELS: Record<TrendTier, string> = {
  all: 'All',
  mid: 'Mid',
  high: 'High',
};
const TIER_ORDER: RatingTier[] = ['all', 'low', 'mid', 'high'];
const SNAPSHOT_COLUMN_WIDTHS = ['18%', '12%', '12%', '11%', '11%', '12%', '12%', '12%'];

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

export default function DailyHeroDashboard({
  locale,
  source,
  availableWindows,
  availableTiers,
  initialSelectedWindow,
  initialSelectedTier,
  dailyByTier,
  overviewByWindow,
}: DailyHeroDashboardProps) {
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

  const snapshotDailyPayload = dailyByTier[selectedTier] ?? dailyByTier[availableTiers[0]];
  const snapshotOverviewPayload =
    overviewByWindow[selectedWindow]?.[selectedTier] ??
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

    if (selectedTier !== 'all') {
      params.set('t', selectedTier);
    } else {
      params.delete('t');
    }

    if (locale !== 'en') {
      params.set('lang', locale);
    }

    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, '', nextUrl);
  }, [locale, selectedTier, selectedWindow]);

  const generatedAt = currentGeneratedAt || new Date().toISOString();
  const sortedDetailRows = useMemo(
    () =>
      sortRows(detailRows, sortState, {
        hero: (row) => row.hero,
        winRate: (row) => row.winRate,
        runsTotal: (row) => row.runsTotal,
        wins10w: (row) => row.wins10w,
        perfectRate: (row) => row.perfectRate,
        goldRate: (row) => row.goldRate,
        silverRate: (row) => row.silverRate,
        bronzeRate: (row) => row.bronzeRate,
      }),
    [detailRows, sortState]
  );
  return (
    <StatsPageShell
      activeSection="heroes"
      locale={locale}
      eyebrow="BazaarPlusPlus analytics"
      title="Hero overview"
      description=""
      source={source}
      generatedAt={generatedAt}
      summary={null}
      filters={null}
    >
      <section className="grid gap-6">
        <section className="grid gap-5 rounded-[24px] border border-[color:var(--color-border)] bg-[color:rgba(26,22,19,0.92)] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
                Trend view
              </p>
              <h2 className="mt-2 text-xl text-[color:var(--color-text-base)]">
                {WINDOW_LABELS[TREND_WINDOW]} hero winrate lines
              </h2>
            </div>
            {trendTierOptions.length > 0 ? (
              <div aria-label="Trend tier" className="flex flex-wrap gap-2">
                {trendTierOptions.map((tierOption) => {
                  const active = tierOption === activeTrendTier;
                  return (
                    <button
                      key={tierOption}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedTrendTier(tierOption)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        active
                          ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:#130f08]'
                          : 'border-[color:var(--color-border)] bg-transparent text-[color:var(--color-text-muted)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-text-base)]'
                      }`}
                    >
                      {TREND_TIER_LABELS[tierOption]}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div
            data-testid="trend-layout"
            className="grid min-w-0 gap-3"
          >
            <div className="grid min-w-0 gap-3">
              <div
                data-testid="daily-winrate-chart"
                className="aspect-[8/3] min-h-[280px] overflow-hidden rounded-[20px] border border-[color:rgba(58,47,31,0.7)] bg-[linear-gradient(180deg,rgba(212,162,76,0.05),rgba(13,11,8,0.94))] p-3 sm:p-4 lg:min-h-[360px]"
              >
                <svg
                  viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  className="block h-full w-full"
                  role="img"
                  aria-label="Hero winrate chart"
                >
              {trendYAxisTicks.map((tick) => {
                const y = getChartY(tick, yMin, yMax);
                return (
                  <g key={`tick-${tick.toFixed(4)}`}>
                    <line
                      x1={CHART_PADDING.left}
                      y1={y}
                      x2={CHART_WIDTH - CHART_PADDING.right}
                      y2={y}
                      stroke="rgba(125, 105, 70, 0.24)"
                      strokeWidth="1"
                    />
                    <text
                      x={CHART_PADDING.left - 12}
                      y={y + 4}
                      fill="rgba(233,224,207,0.72)"
                      fontSize="12"
                      textAnchor="end"
                    >
                      {formatPercent(tick)}
                    </text>
                  </g>
                );
              })}

              {trendVisibleDays.map((day, index) => {
                const x = getChartX(index, trendVisibleDays.length);
                return (
                  <g key={day}>
                    <line
                      x1={x}
                      y1={CHART_PADDING.top}
                      x2={x}
                      y2={CHART_HEIGHT - CHART_PADDING.bottom}
                      stroke="rgba(125, 105, 70, 0.12)"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={CHART_HEIGHT - 14}
                      fill="rgba(233,224,207,0.72)"
                      fontSize="12"
                      textAnchor="middle"
                    >
                      {formatShortDate(day)}
                    </text>
                  </g>
                );
              })}

              {trendSeries.map((heroSeries) => {
                const points: ChartPoint[] = heroSeries.points.map((point) => ({
                  day: point.day,
                  winRate: point.winRate,
                  x: getChartX(trendVisibleDays.indexOf(point.day), trendVisibleDays.length),
                  y: getChartY(point.winRate, yMin, yMax),
                }));
                const showTrendPoint = (point: ChartPoint | undefined) => {
                  if (point == null) {
                    return;
                  }

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
                    data-selected={heroSeries.hero === focusedTrendHero?.hero ? 'true' : 'false'}
                    className="transition-opacity duration-150"
                  >
                    <polyline
                      fill="none"
                      stroke={heroSeries.color}
                      strokeOpacity={heroSeries.hero === focusedTrendHero?.hero ? '1' : '0.26'}
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                    />
                    <polyline
                      fill="none"
                      stroke="transparent"
                      strokeWidth="18"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                      style={{ pointerEvents: 'stroke' }}
                      aria-hidden="true"
                      onMouseEnter={(event) => showTrendPoint(getNearestChartPoint(event, points))}
                      onMouseMove={(event) => showTrendPoint(getNearestChartPoint(event, points))}
                      onMouseLeave={clearTrendPoint}
                    />
                    {points.map((point, index) => (
                      <circle
                        key={`${heroSeries.hero}-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill={heroSeries.color}
                        fillOpacity={heroSeries.hero === focusedTrendHero?.hero ? '1' : '0.35'}
                        stroke="rgba(19,15,8,0.9)"
                        strokeWidth="2"
                        onMouseEnter={() => showTrendPoint(point)}
                        onMouseLeave={clearTrendPoint}
                        onFocus={() => showTrendPoint(point)}
                        onBlur={clearTrendPoint}
                        tabIndex={0}
                        aria-label={`${heroSeries.hero} ${formatShortDate(point.day)} ${formatPercent(point.winRate)}`}
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
                    strokeOpacity="0.32"
                    strokeWidth="1"
                  />
                  <circle
                    cx={hoveredTrendPoint.x}
                    cy={hoveredTrendPoint.y}
                    r="7"
                    fill="none"
                    stroke={hoveredTrendPoint.color}
                    strokeWidth="2"
                  />
                  <rect
                    x={trendTooltipX}
                    y={trendTooltipY}
                    width={POINT_TOOLTIP_WIDTH}
                    height={POINT_TOOLTIP_HEIGHT}
                    rx="8"
                    fill="rgba(19,15,8,0.96)"
                    stroke="rgba(212,162,76,0.48)"
                  />
                  <text
                    x={trendTooltipX + POINT_TOOLTIP_WIDTH / 2}
                    y={trendTooltipY + 19}
                    fill="rgba(255,248,228,0.96)"
                    fontSize="13"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {formatPercent(hoveredTrendPoint.winRate)}
                  </text>
                </g>
              ) : null}
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {trendSeries.map((heroSeries) => (
                  <a
                    key={heroSeries.hero}
                    href={buildHeroHref(heroSeries.hero, {
                      w: TREND_WINDOW,
                      t: activeTrendTier,
                      lang: locale,
                    })}
                    data-selected={heroSeries.hero === focusedTrendHero?.hero ? 'true' : 'false'}
                    onMouseEnter={() => setSelectedTrendHero(heroSeries.hero)}
                    onFocus={() => setSelectedTrendHero(heroSeries.hero)}
                    onClick={() => setSelectedTrendHero(heroSeries.hero)}
                    className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-full border px-2.5 py-1.5 text-sm transition ${
                      heroSeries.hero === focusedTrendHero?.hero
                        ? 'border-[color:var(--color-accent)] bg-[color:rgba(212,162,76,0.2)] text-[color:var(--color-text-base)] shadow-[0_0_0_1px_rgba(212,162,76,0.18)]'
                        : 'border-[color:rgba(58,47,31,0.78)] bg-[color:rgba(19,15,8,0.7)] text-[color:var(--color-text-base)] hover:border-[color:var(--color-accent)]'
                    }`}
                    aria-label={`${heroSeries.hero} ${formatPercent(heroSeries.latestWinRate)}`}
                    title={heroSeries.hero}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: heroSeries.color }}
                      aria-hidden="true"
                    />
                    <span className="font-medium tracking-[0.08em]">
                      {getHeroShortLabel(heroSeries.hero)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-[color:var(--color-border)] bg-[color:rgba(26,22,19,0.92)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:rgba(58,47,31,0.7)] px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
                Latest hero snapshot
              </p>
              <h2 className="mt-2 text-lg text-[color:var(--color-text-base)]">
                {latestDay ? formatShortDate(latestDay) : 'No data'}
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div aria-label="Snapshot window" className="flex flex-wrap gap-2">
                {availableWindows.map((windowOption) => {
                  const active = windowOption === selectedWindow;
                  return (
                    <button
                      key={windowOption}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedWindow(windowOption)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        active
                          ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:#130f08]'
                          : 'border-[color:var(--color-border)] bg-transparent text-[color:var(--color-text-muted)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-text-base)]'
                      }`}
                    >
                      {WINDOW_LABELS[windowOption]}
                    </button>
                  );
                })}
              </div>
              <div aria-label="Snapshot tier" className="flex flex-wrap gap-2">
                {[...availableTiers]
                  .sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b))
                  .map((tierOption) => {
                    const active = tierOption === selectedTier;
                    return (
                      <button
                        key={tierOption}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelectedTier(tierOption)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          active
                            ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:#130f08]'
                            : 'border-[color:var(--color-border)] bg-transparent text-[color:var(--color-text-muted)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-text-base)]'
                        }`}
                      >
                        {TIER_LABELS[tierOption]}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          <table className="min-w-full table-fixed border-collapse">
            <colgroup>
              {SNAPSHOT_COLUMN_WIDTHS.map((width, index) => (
                <col key={`${index}:${width}`} style={{ width }} />
              ))}
            </colgroup>
            <thead className="bg-[color:rgba(212,162,76,0.12)] text-left text-xs uppercase tracking-[0.22em] text-[color:var(--color-text-muted)]">
              <tr>
                <SortableHeader label="Hero" className="px-5 py-4" activeDirection={sortState.key === 'hero' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'hero', 'asc'))} />
                <SortableHeader label="10W rate" className="px-5 py-4" activeDirection={sortState.key === 'winRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'winRate', 'desc'))} />
                <SortableHeader label="Runs" className="px-5 py-4" activeDirection={sortState.key === 'runsTotal' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runsTotal', 'desc'))} />
                <SortableHeader label="10 wins" className="px-5 py-4" activeDirection={sortState.key === 'wins10w' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'wins10w', 'desc'))} />
                <SortableHeader label="Perfect" className="px-5 py-4" activeDirection={sortState.key === 'perfectRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'perfectRate', 'desc'))} />
                <SortableHeader label="Gold" className="px-5 py-4" activeDirection={sortState.key === 'goldRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'goldRate', 'desc'))} />
                <SortableHeader label="Silver" className="px-5 py-4" activeDirection={sortState.key === 'silverRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'silverRate', 'desc'))} />
                <SortableHeader label="Bronze" className="px-5 py-4" activeDirection={sortState.key === 'bronzeRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'bronzeRate', 'desc'))} />
              </tr>
            </thead>
            <tbody>
              {sortedDetailRows.map((row) => (
                <tr
                  key={`${row.day}:${row.hero}`}
                  className="border-t border-[color:rgba(58,47,31,0.7)] text-sm text-[color:var(--color-text-base)]"
                >
                  <td className="px-5 py-4">
                    <a
                      href={buildHeroHref(row.hero, {
                        w: selectedWindow,
                        t: selectedTier,
                        lang: locale,
                      })}
                      data-selected={row.hero === selectedSnapshotHero ? 'true' : 'false'}
                      onMouseEnter={() => setSelectedSnapshotHero(row.hero)}
                      onFocus={() => setSelectedSnapshotHero(row.hero)}
                      onClick={() => setSelectedSnapshotHero(row.hero)}
                      className={`transition ${
                        row.hero === selectedSnapshotHero
                          ? 'text-[color:var(--color-accent-bright)]'
                          : 'hover:text-[color:var(--color-accent-bright)]'
                      }`}
                    >
                      <HeroBadge
                        hero={row.hero}
                        selected={row.hero === selectedSnapshotHero}
                        size="sm"
                      />
                    </a>
                  </td>
                  <td className="px-5 py-4 tnum text-[color:var(--color-accent-bright)]">
                    {formatPercent(row.winRate)}
                  </td>
                  <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                    {row.runsTotal == null ? 'N/A' : formatInteger(row.runsTotal)}
                  </td>
                  <td className="px-5 py-4 tnum">{formatInteger(row.wins10w)}</td>
                  <td className="px-5 py-4 tnum">
                    {row.perfectRate === null ? 'N/A' : formatPercent(row.perfectRate)}
                  </td>
                  <td className="px-5 py-4 tnum">
                    {row.goldRate === null ? 'N/A' : formatPercent(row.goldRate)}
                  </td>
                  <td className="px-5 py-4 tnum">
                    {row.silverRate === null ? 'N/A' : formatPercent(row.silverRate)}
                  </td>
                  <td className="px-5 py-4 tnum">
                    {row.bronzeRate === null ? 'N/A' : formatPercent(row.bronzeRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </StatsPageShell>
  );
}
