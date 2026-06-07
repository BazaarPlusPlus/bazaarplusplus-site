import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';

import { BAZAARDB_ICON_PATH, BAZAARDB_INTEGRATION_DOC_URL, BAZAARDB_META_URL, getSiteCopy } from '../../content/site-copy';
import {
  DEFAULT_LOCALE,
  type AnalyzerV4Manifest,
  type GameDayBucket,
  type Locale,
  type MetricWindow,
  type RatingTier,
  type VictoryBucket,
  type WebHeroDailyPayload,
} from '../../shared/lib/metrics';
import {
  DQ_BUNDLE_FAIL_WARN,
  DQ_DECODE_FAIL_WARN,
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
  | 'tenWinRateWilsonLower'
  | 'runsCompleted'
  | 'runShare'
  | 'tenWinCount'
  | 'avgRunDays10w'
  | 'p75RunDays10w'
  | 'perfectRate'
  | 'goldRate'
  | 'silverRate'
  | 'bronzeRate'
  | 'battleWinRate'
  | 'finalBattleWinRate';

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

type StageView = 'focused' | 'all';

const CHART_WIDTH = 960;
const CHART_HEIGHT = 360;
const CHART_PADDING = { top: 28, right: 28, bottom: 48, left: 56 };
const POINT_TOOLTIP_WIDTH = 168;
const POINT_TOOLTIP_HEIGHT = 56;
const POINT_TOOLTIP_OFFSET = 18;
const GRIDLINE_COUNT = 4;
const RANKING_COLUMN_WIDTHS = [
  '14%',
  '9%',
  '8%',
  '7%',
  '7%',
  '6%',
  '6%',
  '6%',
  '6%',
  '6%',
  '6%',
  '6%',
  '7%',
  '6%',
];

const STAGE_KEYS: GameDayBucket[] = ['day_1_3', 'day_4_7', 'day_8_plus'];
const VICTORY_BUCKET_KEYS: VictoryBucket[] = ['wins_0_3', 'wins_4_6', 'wins_7_9', 'wins_10_plus'];
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

function bucketRate(counts: { wins: number; count: number } | undefined): number | null {
  if (!counts || counts.count <= 0) {
    return null;
  }

  return counts.wins / counts.count;
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
    key: 'tenWinRateWilsonLower',
    direction: 'desc',
  });
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<HoveredTrendPoint | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [dqDismissed, setDqDismissed] = useState(false);
  const [stageView, setStageView] = useState<StageView>('focused');
  const [showLowSampleFavorable, setShowLowSampleFavorable] = useState(false);
  const [showLowSampleUnfavorable, setShowLowSampleUnfavorable] = useState(false);

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
        tenWinRateWilsonLower: (row) => row.tenWinRateWilsonLower,
        runsCompleted: (row) => row.runsCompleted,
        runShare: (row) => row.runShare,
        tenWinCount: (row) => row.tenWinCount,
        avgRunDays10w: (row) => row.avgRunDays10w,
        p75RunDays10w: (row) => row.p75RunDays10w,
        perfectRate: (row) => row.perfectRate,
        goldRate: (row) => row.goldRate,
        silverRate: (row) => row.silverRate,
        bronzeRate: (row) => row.bronzeRate,
        battleWinRate: (row) => row.battleWinRate,
        finalBattleWinRate: (row) => row.finalBattleWinRate,
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

  // --- coverage / quality ------------------------------------------------------
  const nominalDays = WEB_DAILY_NOMINAL[selectedWindow];
  const partialCoverage = loadedWindowDays.length < nominalDays;
  const bundleFailRate = manifest.dq?.bundle_download_fail_rate ?? null;
  const decodeFailRate = manifest.dq?.decode_fail_rate ?? null;
  const bundleDegraded = bundleFailRate != null && bundleFailRate > DQ_BUNDLE_FAIL_WARN;
  const decodeDegraded = decodeFailRate != null && decodeFailRate > DQ_DECODE_FAIL_WARN;
  const qualityDegraded = bundleDegraded || decodeDegraded;

  const focusedDelta =
    focusedTrendSeries?.latestWinRate != null && focusedTrendSeries.firstWinRate != null
      ? focusedTrendSeries.latestWinRate - focusedTrendSeries.firstWinRate
      : null;
  const maxTenWinRate = sortedRows.reduce(
    (max, row) => (row.tenWinRate != null && row.tenWinRate > max ? row.tenWinRate : max),
    0
  );

  const matchups = useMemo(
    () => (focusedMerged ? deriveMatchups(focusedMerged, MATCHUP_MIN_SAMPLE) : null),
    [focusedMerged]
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
      generatedAt={manifest.generatedAt}
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
                  locale={locale}
                  loadedCount={loadedWindowDays.length}
                  nominalCount={nominalDays}
                  windowLabel={WINDOW_LABELS[selectedWindow]}
                  partial={partialCoverage}
                  qualityDegraded={qualityDegraded}
                  bundleFailRate={bundleFailRate}
                  coverageCopy={coverageCopy}
                />
              </div>
            </div>
          </section>
        ) : null
      }
    >
      {qualityDegraded && !dqDismissed && hasAnyData ? (
        <section
          data-testid="dq-banner"
          className="surface-flat flex flex-wrap items-center justify-between gap-3 border-[color:rgba(208,90,74,0.4)] px-5 py-3"
        >
          <p className="text-sm leading-6 text-[color:var(--color-text-muted)]">
            <span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full bg-[color:var(--color-neg)]" />
            {bundleDegraded ? heroCopy.dataQuality.bundleFailBanner : heroCopy.dataQuality.decodeFailBanner}
            {bundleDegraded && bundleFailRate != null ? (
              <span className="tnum ml-2 text-[color:var(--color-text-faint)]">
                {coverageCopy.failRatePrefix}
                {formatPercent(bundleFailRate)}
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => setDqDismissed(true)}
            className="shrink-0 rounded-full border border-[color:var(--color-border-soft)] px-3 py-1 text-xs font-medium text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent-bright)]"
          >
            {heroCopy.dataQuality.dismiss}
          </button>
        </section>
      ) : null}

      {emptyState ?? (
        <section className="grid gap-6">
          {/* === HERO RANKING (primary) ==================================== */}
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
                    {methodologyCopy.formula.wilson}
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
                <table className="w-full min-w-[1140px] table-fixed border-collapse">
                  <colgroup>
                    {RANKING_COLUMN_WIDTHS.map((width, index) => (
                      <col key={`${index}:${width}`} style={{ width }} />
                    ))}
                  </colgroup>
                  <thead className="font-display-italic text-left text-[0.72rem] uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
                    <tr>
                      <SortableHeader label={heroCopy.tableHeaders.hero} className="px-5 py-3.5" activeDirection={sortState.key === 'hero' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'hero', 'asc'))} info={headerInfo(methodologyCopy.tips.hero)} />
                      <SortableHeader label={heroCopy.tableHeaders.winRate} className="px-5 py-3.5" activeDirection={sortState.key === 'tenWinRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'tenWinRate', 'desc'))} info={headerInfo(methodologyCopy.formula.tenWinRate)} />
                      <SortableHeader label={heroCopy.tableHeaders.wilsonLower} className="px-3 py-3.5" activeDirection={sortState.key === 'tenWinRateWilsonLower' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'tenWinRateWilsonLower', 'desc'))} info={headerInfo(methodologyCopy.formula.wilson)} />
                      <SortableHeader label={heroCopy.tableHeaders.runs} className="px-3 py-3.5" activeDirection={sortState.key === 'runsCompleted' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runsCompleted', 'desc'))} info={headerInfo(methodologyCopy.tips.runs)} />
                      <SortableHeader label={heroCopy.tableHeaders.runShare} className="px-3 py-3.5" activeDirection={sortState.key === 'runShare' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runShare', 'desc'))} info={headerInfo(methodologyCopy.tips.share)} />
                      <SortableHeader label={heroCopy.tableHeaders.wins10w} className="px-3 py-3.5" activeDirection={sortState.key === 'tenWinCount' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'tenWinCount', 'desc'))} info={headerInfo(methodologyCopy.tips.wins10w)} />
                      <SortableHeader label={heroCopy.tableHeaders.avgDays} className="px-3 py-3.5" activeDirection={sortState.key === 'avgRunDays10w' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'avgRunDays10w', 'asc'))} info={headerInfo(methodologyCopy.formula.runDays)} />
                      <SortableHeader label={heroCopy.tableHeaders.p75Days} className="px-3 py-3.5" activeDirection={sortState.key === 'p75RunDays10w' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'p75RunDays10w', 'asc'))} info={headerInfo(methodologyCopy.formula.runDays)} />
                      <SortableHeader label={heroCopy.tableHeaders.perfect} className="px-3 py-3.5" activeDirection={sortState.key === 'perfectRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'perfectRate', 'desc'))} info={headerInfo(methodologyCopy.tips.perfect)} />
                      <SortableHeader label={heroCopy.tableHeaders.gold} className="px-3 py-3.5" activeDirection={sortState.key === 'goldRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'goldRate', 'desc'))} info={headerInfo(methodologyCopy.tips.gold)} />
                      <SortableHeader label={heroCopy.tableHeaders.silver} className="px-3 py-3.5" activeDirection={sortState.key === 'silverRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'silverRate', 'desc'))} info={headerInfo(methodologyCopy.tips.silver)} />
                      <SortableHeader label={heroCopy.tableHeaders.bronze} className="px-3 py-3.5" activeDirection={sortState.key === 'bronzeRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'bronzeRate', 'desc'))} info={headerInfo(methodologyCopy.tips.bronze)} />
                      <SortableHeader label={heroCopy.tableHeaders.overallBattle} className="px-3 py-3.5" activeDirection={sortState.key === 'battleWinRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'battleWinRate', 'desc'))} info={headerInfo(methodologyCopy.tips.winRate)} />
                      <SortableHeader label={heroCopy.tableHeaders.finalBattle} className="px-3 py-3.5" activeDirection={sortState.key === 'finalBattleWinRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'finalBattleWinRate', 'desc'))} info={headerInfo(methodologyCopy.formula.winRate)} />
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
                              {!row.isCanonical ? (
                                <span
                                  title={heroCopy.heroClass.nonCanonicalTooltip}
                                  className="rounded-sm border border-[color:var(--color-border-soft)] px-1.5 py-0.5 text-[0.6rem] uppercase tracking-[0.12em] text-[color:var(--color-text-faint)]"
                                >
                                  {heroCopy.heroClass.nonCanonicalTag}
                                </span>
                              ) : null}
                            </button>
                          </td>
                          <td
                            className="databar relative px-5 py-4 tnum text-[color:var(--color-accent-bright)]"
                            style={{ '--bar-width': `${rateRatio * 100}%` } as React.CSSProperties}
                          >
                            {renderRateCell(row.tenWinRate)}
                          </td>
                          <td className="px-3 py-4 tnum text-[color:var(--color-text-muted)]">
                            {renderRateCell(row.tenWinRateWilsonLower)}
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
                          <td
                            className="px-3 py-4 tnum text-[color:var(--color-text-muted)]"
                            aria-label={row.p75RunDays10w == null ? noValueLabel : undefined}
                          >
                            {row.p75RunDays10w == null ? '—' : formatInteger(row.p75RunDays10w, locale)}
                          </td>
                          <td className="px-3 py-4 tnum">{renderRateCell(row.perfectRate)}</td>
                          <td className="px-3 py-4 tnum">{renderRateCell(row.goldRate)}</td>
                          <td className="px-3 py-4 tnum">{renderRateCell(row.silverRate)}</td>
                          <td className="px-3 py-4 tnum">{renderRateCell(row.bronzeRate)}</td>
                          <td className="px-3 py-4 tnum">{renderRateCell(row.battleWinRate)}</td>
                          <td className="px-3 py-4 tnum">{renderRateCell(row.finalBattleWinRate)}</td>
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
                      {focusedDelta != null ? (
                        <span
                          className={`tnum text-[0.7rem] font-semibold ${
                            focusedDelta >= 0
                              ? 'text-[color:var(--color-pos)]'
                              : 'text-[color:var(--color-neg)]'
                          }`}
                        >
                          {focusedDelta >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(focusedDelta))}
                        </span>
                      ) : null}
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
                    {focusedMetrics?.isCanonical === false
                      ? heroCopy.heroClass.chartExcludedFootnote
                      : coverageCopy.noTrendValue}
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

              <p className="text-[0.72rem] leading-5 text-[color:var(--color-text-faint)]">
                {heroCopy.heroClass.chartExcludedFootnote}
              </p>

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

          {/* === PER-HERO DOSSIER ========================================== */}
          {rankingHasRows && focusedHero != null && focusedMetrics != null ? (
            <section data-testid="hero-dossier" className="grid gap-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <p className="eyebrow eyebrow-rule">{heroCopy.dossier.label}</p>
                  <HeroBadge hero={focusedHero} selected size="md" />
                  {!focusedMetrics.isCanonical ? (
                    <span
                      title={heroCopy.heroClass.nonCanonicalTooltip}
                      className="rounded-sm border border-[color:var(--color-border-soft)] px-1.5 py-0.5 text-[0.6rem] uppercase tracking-[0.12em] text-[color:var(--color-text-faint)]"
                    >
                      {heroCopy.heroClass.nonCanonicalTag}
                    </span>
                  ) : null}
                </div>
                <span className="tnum text-[0.72rem] uppercase tracking-[0.16em] text-[color:var(--color-text-faint)]">
                  {dossierContextLabel}
                </span>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <BattlePanel
                  metrics={focusedMetrics}
                  merged={focusedMerged}
                  locale={locale}
                  battleCopy={heroCopy.battle}
                  noDataLabel={heroCopy.snapshot.noData}
                  noValueLabel={noValueLabel}
                />
                <StagePanel
                  stageView={stageView}
                  onStageViewChange={setStageView}
                  focusedHero={focusedHero}
                  merged={merged}
                  rows={sortedRows}
                  locale={locale}
                  stageCopy={heroCopy.stage}
                  noDataLabel={heroCopy.snapshot.noData}
                  noValueLabel={noValueLabel}
                />
                <VictoryBucketPanel
                  merged={focusedMerged}
                  heroColor={getHeroColor(focusedHero)}
                  locale={locale}
                  bucketCopy={heroCopy.victoryProgress}
                  noDataLabel={heroCopy.snapshot.noData}
                />
                <MatchupPanel
                  matchups={matchups}
                  matchupCopy={heroCopy.matchups}
                  locale={locale}
                  noValueLabel={noValueLabel}
                  showLowSampleFavorable={showLowSampleFavorable}
                  showLowSampleUnfavorable={showLowSampleUnfavorable}
                  onToggleFavorable={() => setShowLowSampleFavorable((value) => !value)}
                  onToggleUnfavorable={() => setShowLowSampleUnfavorable((value) => !value)}
                />
              </div>

              <OutcomePanel
                rows={sortedRows}
                focusedHero={focusedHero}
                focusedMerged={focusedMerged}
                locale={locale}
                outcomeCopy={heroCopy.outcome}
                tierLegend={methodologyCopy.tierLegend}
                noDataLabel={heroCopy.snapshot.noData}
              />
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
  locale: Locale;
  loadedCount: number;
  nominalCount: number;
  windowLabel: string;
  partial: boolean;
  qualityDegraded: boolean;
  bundleFailRate: number | null;
  coverageCopy: ReturnType<typeof getSiteCopy>['stats']['heroes']['coverage'];
};

function CoverageStrip({
  loadedCount,
  nominalCount,
  windowLabel,
  partial,
  qualityDegraded,
  bundleFailRate,
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
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${
            qualityDegraded ? 'bg-[color:var(--color-neg)]' : 'bg-[color:var(--color-pos)]'
          }`}
        />
        {qualityDegraded ? coverageCopy.qualityDegraded : coverageCopy.qualityOk}
      </span>
      {qualityDegraded && bundleFailRate != null ? (
        <span className="tnum">
          {coverageCopy.failRatePrefix}
          {formatPercent(bundleFailRate)}
        </span>
      ) : null}
    </p>
  );
}

// === dossier panels ============================================================

type BattleCopy = ReturnType<typeof getSiteCopy>['stats']['heroes']['battle'];

function BattlePanel({
  metrics,
  merged,
  locale,
  battleCopy,
  noDataLabel,
  noValueLabel,
}: {
  metrics: HeroMetricsRow;
  merged: MergedHeroRow | undefined;
  locale: Locale;
  battleCopy: BattleCopy;
  noDataLabel: string;
  noValueLabel: string;
}) {
  const overall = metrics.battleWinRate;
  const final = metrics.finalBattleWinRate;
  const overallLower = metrics.battleWinRateWilsonLower;
  const finalLower = metrics.finalBattleWinRateWilsonLower;
  const gap = overall != null && final != null ? final - overall : null;

  const width = 600;
  const left = 16;
  const right = 16;
  const toX = (rate: number) => left + rate * (width - left - right);

  return (
    <section data-testid="battle-panel" className="surface p-5">
      <h3 className="font-display text-lg font-semibold text-[color:var(--color-text-base)]">
        {battleCopy.title}
      </h3>
      {overall == null && final == null ? (
        <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">{noDataLabel}</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="eyebrow text-[0.62rem] tracking-[0.2em]">{battleCopy.overallWinRate}</p>
              <p
                className="mt-1 tnum text-2xl font-semibold text-[color:var(--color-accent-bright)]"
                aria-label={overall == null ? noValueLabel : undefined}
              >
                {formatNullablePercent(overall)}
              </p>
              <p className="tnum text-[0.7rem] text-[color:var(--color-text-faint)]">
                {battleCopy.wilsonLower} {formatNullablePercent(overallLower)} ·{' '}
                {formatInteger(merged?.battleDecidedCount ?? 0, locale)}
              </p>
            </div>
            <div>
              <p className="eyebrow text-[0.62rem] tracking-[0.2em]">{battleCopy.finalBattleWinRate}</p>
              <p
                className="mt-1 tnum text-2xl font-semibold text-[color:var(--color-text-base)]"
                aria-label={final == null ? noValueLabel : undefined}
              >
                {formatNullablePercent(final)}
              </p>
              <p className="tnum text-[0.7rem] text-[color:var(--color-text-faint)]">
                {battleCopy.wilsonLower} {formatNullablePercent(finalLower)} ·{' '}
                {formatInteger(merged?.finalBattleDecidedCount ?? 0, locale)}
              </p>
            </div>
          </div>

          {overall != null && final != null ? (
            <svg
              viewBox={`0 0 ${width} 84`}
              className="mt-4 block w-full"
              role="img"
              aria-label={`${battleCopy.overallWinRate} ${formatPercent(overall)} · ${battleCopy.finalBattleWinRate} ${formatPercent(final)}`}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                <g key={tick}>
                  <line
                    x1={toX(tick)}
                    y1={14}
                    x2={toX(tick)}
                    y2={54}
                    stroke="rgba(148, 131, 95, 0.14)"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                  />
                  <text
                    x={toX(tick)}
                    y={74}
                    fill="rgba(148, 131, 95, 0.78)"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                    textAnchor="middle"
                  >
                    {formatPercent(tick)}
                  </text>
                </g>
              ))}
              {/* gap segment */}
              <line
                x1={toX(overall)}
                y1={34}
                x2={toX(final)}
                y2={34}
                stroke={gap != null && gap >= 0 ? 'var(--color-pos)' : 'var(--color-neg)'}
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.7"
              />
              {/* wilson whiskers */}
              {overallLower != null ? (
                <line
                  x1={toX(overallLower)}
                  y1={24}
                  x2={toX(overall)}
                  y2={24}
                  stroke="rgba(232,185,74,0.5)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : null}
              {finalLower != null ? (
                <line
                  x1={toX(finalLower)}
                  y1={44}
                  x2={toX(final)}
                  y2={44}
                  stroke="rgba(168,176,187,0.5)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : null}
              <circle cx={toX(overall)} cy={34} r="7" fill="var(--color-accent)" stroke="rgba(12,10,7,0.95)" strokeWidth="2">
                <title>{`${battleCopy.overallWinRate} ${formatPercent(overall)}`}</title>
              </circle>
              <circle cx={toX(final)} cy={34} r="7" fill="#a8b0bb" stroke="rgba(12,10,7,0.95)" strokeWidth="2">
                <title>{`${battleCopy.finalBattleWinRate} ${formatPercent(final)}`}</title>
              </circle>
            </svg>
          ) : null}

          <p className="mt-2 tnum text-[0.74rem] text-[color:var(--color-text-muted)]">
            {battleCopy.gap}{' '}
            <span
              className={
                gap == null
                  ? ''
                  : gap >= 0
                    ? 'text-[color:var(--color-pos)]'
                    : 'text-[color:var(--color-neg)]'
              }
              aria-label={gap == null ? noValueLabel : undefined}
            >
              {gap == null ? '—' : `${gap >= 0 ? '+' : '−'}${formatPercent(Math.abs(gap))}`}
            </span>
          </p>
        </>
      )}
    </section>
  );
}

type StageCopy = ReturnType<typeof getSiteCopy>['stats']['heroes']['stage'];

function StagePanel({
  stageView,
  onStageViewChange,
  focusedHero,
  merged,
  rows,
  locale,
  stageCopy,
  noDataLabel,
  noValueLabel,
}: {
  stageView: StageView;
  onStageViewChange: (view: StageView) => void;
  focusedHero: string;
  merged: Map<string, MergedHeroRow>;
  rows: HeroMetricsRow[];
  locale: Locale;
  stageCopy: StageCopy;
  noDataLabel: string;
  noValueLabel: string;
}) {
  const focusedRow = merged.get(focusedHero);
  const focusedStages = STAGE_KEYS.map((key) => ({
    key,
    counts: focusedRow?.gameDayBattleCounts[key],
  })).filter((entry) => entry.counts != null);

  return (
    <section data-testid="stage-panel" className="surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-[color:var(--color-text-base)]">
          {stageCopy.title}
        </h3>
        <SegmentedControl>
          <SegmentedButton active={stageView === 'focused'} onClick={() => onStageViewChange('focused')}>
            {stageCopy.viewFocused}
          </SegmentedButton>
          <SegmentedButton active={stageView === 'all'} onClick={() => onStageViewChange('all')}>
            {stageCopy.viewAll}
          </SegmentedButton>
        </SegmentedControl>
      </div>

      {stageView === 'focused' ? (
        focusedStages.length > 0 ? (
          <ul className="mt-4 grid gap-2.5">
            {focusedStages.map(({ key, counts }) => {
              const rate = bucketRate(counts);
              return (
                <li key={key} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3">
                  <span className="text-[0.78rem] text-[color:var(--color-text-muted)]">
                    {stageCopy[key]}
                  </span>
                  <span
                    className="databar relative block h-6 rounded-sm"
                    style={{ '--bar-width': `${(rate ?? 0) * 100}%` } as React.CSSProperties}
                  >
                    <span
                      className="absolute inset-y-0 left-2 flex items-center tnum text-[0.78rem] text-[color:var(--color-accent-bright)]"
                      aria-label={rate == null ? noValueLabel : undefined}
                    >
                      {formatNullablePercent(rate)}
                    </span>
                  </span>
                  <span className="tnum text-[0.7rem] text-[color:var(--color-text-faint)]">
                    {formatInteger(counts!.count, locale)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">{noDataLabel}</p>
        )
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[360px] table-fixed border-collapse text-[0.78rem]">
            <thead className="font-display-italic text-left text-[0.66rem] uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">
              <tr>
                <th scope="col" className="py-2 pr-2" />
                {STAGE_KEYS.map((key) => (
                  <th key={key} scope="col" className="px-2 py-2">
                    {stageCopy[key]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const counts = merged.get(row.hero)?.gameDayBattleCounts;
                return (
                  <tr
                    key={row.hero}
                    className="metric-row border-t border-[color:var(--color-border-soft)]"
                    data-selected={row.hero === focusedHero ? 'true' : 'false'}
                  >
                    <td className="py-2 pr-2">
                      <HeroBadge hero={row.hero} selected={row.hero === focusedHero} size="sm" />
                    </td>
                    {STAGE_KEYS.map((key) => {
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
      )}
    </section>
  );
}

type VictoryProgressCopy = ReturnType<typeof getSiteCopy>['stats']['heroes']['victoryProgress'];

function VictoryBucketPanel({
  merged,
  heroColor,
  locale,
  bucketCopy,
  noDataLabel,
}: {
  merged: MergedHeroRow | undefined;
  heroColor: string;
  locale: Locale;
  bucketCopy: VictoryProgressCopy;
  noDataLabel: string;
}) {
  const buckets = VICTORY_BUCKET_KEYS.map((key, index) => ({
    key,
    index,
    counts: merged?.victoryBucketBattleCounts[key],
  })).filter((entry) => entry.counts != null && entry.counts.count > 0);

  const width = 600;
  const height = 180;
  const padding = { top: 22, right: 28, bottom: 34, left: 48 };
  const rates = buckets
    .map((bucket) => bucketRate(bucket.counts))
    .filter((rate): rate is number => rate != null);
  const minRate = rates.length > 0 ? Math.min(...rates, 0.4) : 0;
  const maxRate = rates.length > 0 ? Math.max(...rates, 0.6) : 1;
  const toX = (index: number) =>
    padding.left +
    ((width - padding.left - padding.right) * index) / Math.max(VICTORY_BUCKET_KEYS.length - 2, 1);
  const toY = (rate: number) =>
    padding.top +
    (height - padding.top - padding.bottom) * (1 - (rate - minRate) / Math.max(maxRate - minRate, 0.0001));

  const points = buckets
    .map((bucket) => {
      const rate = bucketRate(bucket.counts);
      return rate == null ? null : { ...bucket, rate, x: toX(bucket.index), y: toY(rate) };
    })
    .filter((point): point is NonNullable<typeof point> => point != null);

  return (
    <section data-testid="victory-bucket-panel" className="surface p-5">
      <h3 className="font-display text-lg font-semibold text-[color:var(--color-text-base)]">
        {bucketCopy.title}
      </h3>
      {points.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">{noDataLabel}</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 block w-full" role="img" aria-label={bucketCopy.title}>
          {[minRate, (minRate + maxRate) / 2, maxRate].map((tick) => (
            <g key={tick.toFixed(4)}>
              <line
                x1={padding.left}
                y1={toY(tick)}
                x2={width - padding.right}
                y2={toY(tick)}
                stroke="rgba(148, 131, 95, 0.14)"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
              <text
                x={padding.left - 10}
                y={toY(tick) + 4}
                fill="rgba(148, 131, 95, 0.78)"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="end"
              >
                {formatPercent(tick)}
              </text>
            </g>
          ))}
          {points.length > 1 ? (
            <polyline
              fill="none"
              stroke={heroColor}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={points.map((point) => `${point.x},${point.y}`).join(' ')}
            />
          ) : null}
          {points.map((point) => (
            <g key={point.key}>
              <circle cx={point.x} cy={point.y} r="5.5" fill={heroColor} stroke="rgba(12,10,7,0.95)" strokeWidth="2">
                <title>{`${bucketCopy[point.key]} ${formatPercent(point.rate)} · ${formatInteger(point.counts!.count, locale)}`}</title>
              </circle>
              <text
                x={point.x}
                y={point.y - 12}
                fill="rgba(241,230,205,0.96)"
                fontSize="11"
                fontWeight="600"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {formatPercent(point.rate)}
              </text>
              <text
                x={point.x}
                y={height - 10}
                fill="rgba(148, 131, 95, 0.78)"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {bucketCopy[point.key]}
              </text>
            </g>
          ))}
        </svg>
      )}
    </section>
  );
}

type MatchupsCopy = ReturnType<typeof getSiteCopy>['stats']['heroes']['matchups'];

function MatchupPanel({
  matchups,
  matchupCopy,
  locale,
  noValueLabel,
  showLowSampleFavorable,
  showLowSampleUnfavorable,
  onToggleFavorable,
  onToggleUnfavorable,
}: {
  matchups: { favorable: MatchupRow[]; unfavorable: MatchupRow[]; mirror: MatchupRow | null } | null;
  matchupCopy: MatchupsCopy;
  locale: Locale;
  noValueLabel: string;
  showLowSampleFavorable: boolean;
  showLowSampleUnfavorable: boolean;
  onToggleFavorable: () => void;
  onToggleUnfavorable: () => void;
}) {
  const favorable = matchups?.favorable ?? [];
  const unfavorable = matchups?.unfavorable ?? [];
  const mirror = matchups?.mirror ?? null;
  const isEmpty = favorable.length === 0 && unfavorable.length === 0 && mirror == null;

  function renderList(
    rows: MatchupRow[],
    positive: boolean,
    showLowSample: boolean,
    onToggle: () => void
  ) {
    const confident = rows.filter((row) => !row.isLowSample);
    const lowSample = rows.filter((row) => row.isLowSample);
    const visible = showLowSample ? [...confident, ...lowSample] : confident;

    return (
      <>
        <ul className="mt-3 grid gap-2">
          {visible.map((row) => (
            <li key={row.opponentHero} className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5">
              <HeroBadge hero={row.opponentHero} size="sm" />
              <span
                className={`${positive ? 'databar databar-pos' : 'databar databar-neg'} relative block h-6 rounded-sm`}
                style={{
                  '--bar-width': `${(row.isLowSample ? 0 : (positive ? row.winRate ?? 0 : 1 - (row.winRate ?? 1))) * 100}%`,
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
                {formatInteger(row.battleDecidedCount, locale)} {matchupCopy.sample}
              </span>
            </li>
          ))}
        </ul>
        {lowSample.length > 0 ? (
          <button
            type="button"
            aria-expanded={showLowSample}
            onClick={onToggle}
            className="mt-3 text-[0.72rem] font-medium text-[color:var(--color-text-muted)] underline decoration-dotted underline-offset-4 transition hover:text-[color:var(--color-accent-bright)]"
          >
            {matchupCopy.lowSampleDisclosure} ({lowSample.length})
          </button>
        ) : null}
      </>
    );
  }

  return (
    <section data-testid="matchup-panel" className="surface p-5">
      <h3 className="font-display text-lg font-semibold text-[color:var(--color-text-base)]">
        {matchupCopy.title}
      </h3>
      {isEmpty ? (
        <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">{matchupCopy.empty}</p>
      ) : (
        <>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="eyebrow text-[0.62rem] tracking-[0.2em] text-[color:var(--color-pos)]">
                {matchupCopy.favorable}
              </p>
              {renderList(favorable, true, showLowSampleFavorable, onToggleFavorable)}
            </div>
            <div>
              <p className="eyebrow text-[0.62rem] tracking-[0.2em] text-[color:var(--color-neg)]">
                {matchupCopy.unfavorable}
              </p>
              {renderList(unfavorable, false, showLowSampleUnfavorable, onToggleUnfavorable)}
            </div>
          </div>
          {mirror ? (
            <div
              data-testid="mirror-matchup"
              className="mt-5 flex flex-wrap items-center gap-3 border-t border-[color:var(--color-border-soft)] pt-4"
            >
              <span className="rounded-sm border border-[color:var(--color-border-soft)] px-1.5 py-0.5 text-[0.62rem] uppercase tracking-[0.14em] text-[color:var(--color-text-muted)]">
                {matchupCopy.mirror}
              </span>
              <HeroBadge hero={mirror.opponentHero} size="sm" />
              <span
                className="tnum text-[0.78rem] text-[color:var(--color-text-base)]"
                aria-label={mirror.isLowSample || mirror.winRate == null ? noValueLabel : undefined}
              >
                {mirror.isLowSample ? '—' : formatNullablePercent(mirror.winRate)}
              </span>
              <span className="tnum text-[0.7rem] text-[color:var(--color-text-faint)]">
                {formatInteger(mirror.battleDecidedCount, locale)} {matchupCopy.sample}
              </span>
            </div>
          ) : null}
          <p className="mt-4 text-[0.7rem] leading-5 text-[color:var(--color-text-faint)]">
            {matchupCopy.minSampleNote}
          </p>
        </>
      )}
    </section>
  );
}

type OutcomeCopy = ReturnType<typeof getSiteCopy>['stats']['heroes']['outcome'];
type TierLegendCopy = ReturnType<
  typeof getSiteCopy
>['stats']['heroes']['methodology']['tierLegend'];

function OutcomePanel({
  rows,
  focusedHero,
  focusedMerged,
  locale,
  outcomeCopy,
  tierLegend,
  noDataLabel,
}: {
  rows: HeroMetricsRow[];
  focusedHero: string;
  focusedMerged: MergedHeroRow | undefined;
  locale: Locale;
  outcomeCopy: OutcomeCopy;
  tierLegend: TierLegendCopy;
  noDataLabel: string;
}) {
  const histogramEntries = Object.entries(focusedMerged?.finalWinsCounts ?? {})
    .map(([key, count]) => [Number(key), count] as const)
    .filter(([wins, count]) => Number.isFinite(wins) && count > 0)
    .sort(([a], [b]) => a - b);
  const histogramMax = histogramEntries.reduce((max, [, count]) => Math.max(max, count), 0);

  return (
    <section data-testid="outcome-panel" className="surface p-5">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-display text-lg font-semibold text-[color:var(--color-text-base)]">
            {outcomeCopy.title}
          </h3>
          <ul className="mt-4 grid gap-2">
            {rows.map((row) => {
              const tiers: Array<{ key: VictoryTierKey; rate: number | null }> = [
                { key: 'perfect', rate: row.perfectRate },
                { key: 'gold', rate: row.goldRate },
                { key: 'silver', rate: row.silverRate },
                { key: 'bronze', rate: row.bronzeRate },
                { key: 'misfortune', rate: row.misfortuneRate },
              ];
              const hasRates = tiers.some((tier) => tier.rate != null && tier.rate > 0);
              return (
                <li key={row.hero} className="grid grid-cols-[auto_1fr] items-center gap-2.5">
                  <HeroBadge hero={row.hero} selected={row.hero === focusedHero} size="sm" />
                  {hasRates ? (
                    <span
                      className={`flex h-5 overflow-hidden rounded-sm ${
                        row.hero === focusedHero ? 'ring-1 ring-[color:var(--color-accent)]' : ''
                      }`}
                    >
                      {tiers.map((tier) =>
                        tier.rate != null && tier.rate > 0 ? (
                          <span
                            key={tier.key}
                            title={`${tierLegend[tier.key].label} ${formatPercent(tier.rate)}`}
                            style={{
                              width: `${tier.rate * 100}%`,
                              backgroundColor: VICTORY_TIER_COLORS[tier.key],
                            }}
                          />
                        ) : null
                      )}
                    </span>
                  ) : (
                    <span className="text-[0.74rem] text-[color:var(--color-text-faint)]">—</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.7rem] text-[color:var(--color-text-muted)]">
            {VICTORY_TIER_KEYS.map((tier) => (
              <span key={tier} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: VICTORY_TIER_COLORS[tier] }}
                />
                {outcomeCopy[tier]}
              </span>
            ))}
          </p>
        </div>

        <div data-testid="final-wins-histogram">
          <h3 className="font-display text-lg font-semibold text-[color:var(--color-text-base)]">
            {outcomeCopy.histogramTitle}
          </h3>
          {histogramEntries.length === 0 ? (
            <p className="mt-4 text-sm text-[color:var(--color-text-muted)]">{noDataLabel}</p>
          ) : (
            <div className="mt-4 flex h-36 items-end gap-1.5">
              {histogramEntries.map(([wins, count]) => (
                <div key={wins} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="tnum text-[0.62rem] text-[color:var(--color-text-faint)]">
                    {formatInteger(count, locale)}
                  </span>
                  <span
                    title={`${wins}: ${formatInteger(count, locale)}`}
                    className="w-full rounded-t-sm bg-[color:var(--color-accent)]"
                    style={{
                      height: `${histogramMax > 0 ? Math.max((count / histogramMax) * 100, 4) : 0}%`,
                      opacity: wins === 10 ? 1 : 0.45,
                    }}
                  />
                  <span className="tnum text-[0.66rem] text-[color:var(--color-text-muted)]">{wins}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
