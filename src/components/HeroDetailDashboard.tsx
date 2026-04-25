import { useEffect, useMemo, useState } from 'react';

import type {
  CardMetric,
  CardWinrateViewRow,
  HeroOverviewPayload,
  HeroWinrateDailyPayload,
  ItemUpliftViewRow,
  Locale,
  ManifestPayload,
  MetricsSource,
  MetricWindow,
  RatingTier,
} from '../lib/metrics';
import {
  TIER_LABELS,
  WINDOW_LABELS,
  buildLocalizedHref,
  formatInteger,
  formatPercent,
  formatShortDate,
} from '../lib/dashboard';
import {
  getAvailableTiersForWindowlessMetric,
  getCommonAvailableTiers,
} from '../lib/metrics';
import { buildHeroHref, getHeroColor, type HeroName } from '../lib/heroes';
import {
  getWindowOptionsFromManifest,
  readCardSelection,
  syncFilterStateToUrl,
} from '../lib/interactive-filters';
import { sortRows, toggleSort, type SortState } from '../lib/table-sorting';
import CardThumb from './CardThumb';
import HeroBadge from './HeroBadge';
import MetricFilterBar from './MetricFilterBar';
import SortableHeader from './SortableHeader';
import StatsPageShell from './StatsPageShell';
import SummaryMetricCard from './SummaryMetricCard';
import VirtualizedMetricTable from './VirtualizedMetricTable';

type ViewPayload<T> = {
  rowCount: number;
  rows: T[];
};

type HeroDetailDashboardProps = {
  hero: HeroName;
  locale: Locale;
  manifest: ManifestPayload;
  source: MetricsSource;
  initialSelectedWindow: MetricWindow;
  initialSelectedTier: RatingTier;
  initialSelectedMetric: CardMetric;
  dailyByTier: Partial<Record<RatingTier, HeroWinrateDailyPayload>>;
  overviewByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, HeroOverviewPayload>>>>;
  winrateByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<CardWinrateViewRow>>>>>;
  upliftByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<ItemUpliftViewRow>>>>>;
};

type HeroTrendPoint = {
  day: string;
  winRate: number;
};

type HeroDetailRow = {
  hero: string;
  day: string;
  runsTotal: number | null;
  wins10w: number;
  winRate: number;
  perfectRate: number | null;
  goldRate: number | null;
};

type HeroCardSortKey =
  | 'name'
  | 'winRate'
  | 'appearances'
  | 'wins'
  | 'wilsonLower'
  | 'uplift'
  | 'ciLower'
  | 'ciUpper'
  | 'runsWith'
  | 'runsWithout';

const CHART_WIDTH = 960;
const CHART_HEIGHT = 320;
const CHART_PADDING = { top: 24, right: 24, bottom: 44, left: 56 };
const GRIDLINE_COUNT = 4;
const WINDOW_DAY_COUNT: Record<MetricWindow, number> = {
  '1d': 1,
  '3d': 3,
  '7d': 7,
};
const TREND_WINDOW: MetricWindow = '7d';
const HERO_CARD_WINRATE_COLUMN_WIDTHS = ['12%', '32%', '14%', '14%', '12%', '16%'];
const HERO_CARD_UPLIFT_COLUMN_WIDTHS = ['12%', '28%', '12%', '12%', '12%', '12%', '12%'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildTierRate(counts: Record<string, number> | undefined, key: string, denominator: number) {
  if (!counts || denominator <= 0) {
    return null;
  }

  return (counts[key] ?? 0) / denominator;
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

function getTierOptions(
  manifest: ManifestPayload,
  window: MetricWindow,
  metric: CardMetric
): RatingTier[] {
  const dailyTiers = new Set(
    getAvailableTiersForWindowlessMetric(manifest, 'hero_winrate_daily')
  );
  const metricName = metric === 'uplift' ? 'item_uplift' : 'item_winrate';

  return getCommonAvailableTiers(manifest, window, ['hero_overview', metricName]).filter((tier) =>
    dailyTiers.has(tier)
  );
}

function getHeroCardColumnWidths(metric: CardMetric): string[] {
  return metric === 'uplift' ? HERO_CARD_UPLIFT_COLUMN_WIDTHS : HERO_CARD_WINRATE_COLUMN_WIDTHS;
}

function buildHeroState(
  hero: HeroName,
  dailyPayload: HeroWinrateDailyPayload | undefined,
  overviewPayload: HeroOverviewPayload | undefined,
  selectedWindow: MetricWindow
) {
  const rows = (dailyPayload?.rows ?? [])
    .filter((row) => row.hero === hero)
    .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());
  const allDays = Array.from(new Set(rows.map((row) => row.day)));
  const visibleDays = allDays.slice(-WINDOW_DAY_COUNT[selectedWindow]);
  const filteredRows = rows.filter((row) => visibleDays.includes(row.day));
  const latestRow = filteredRows.at(-1);
  const overview = overviewPayload?.rows.find((row) => row.hero === hero);
  const points: HeroTrendPoint[] = filteredRows.map((row) => ({
    day: row.day,
    winRate: row.win_rate,
  }));

  const minWinRate = points.length > 0 ? Math.min(...points.map((point) => point.winRate)) : 0;
  const maxWinRate = points.length > 0 ? Math.max(...points.map((point) => point.winRate)) : 1;
  const spread = Math.max(maxWinRate - minWinRate, 0.04);
  const paddedMin = clamp(Math.floor(((minWinRate - spread * 0.2) * 100) / 5) * 5 / 100, 0, 0.95);
  const paddedMax = clamp(Math.ceil(((maxWinRate + spread * 0.2) * 100) / 5) * 5 / 100, 0.05, 1);
  const yMin = Math.min(paddedMin, maxWinRate);
  const yMax = Math.max(paddedMax, minWinRate + 0.01);
  const tickStep = (yMax - yMin) / GRIDLINE_COUNT;
  const yAxisTicks = Array.from({ length: GRIDLINE_COUNT + 1 }, (_, index) => yMin + tickStep * index);

  const detailRow: HeroDetailRow | null =
    latestRow == null
      ? null
      : {
          hero,
          day: latestRow.day,
          runsTotal: overview?.runs_total ?? null,
          wins10w: latestRow.wins_10w,
          winRate: latestRow.win_rate,
          perfectRate: buildTierRate(
            overview?.victory_tier_counts,
            'perfect',
            overview?.runs_completed ?? 0
          ),
          goldRate: buildTierRate(
            overview?.victory_tier_counts,
            'gold',
            overview?.runs_completed ?? 0
          ),
        };

  return { points, detailRow, visibleDays, yAxisTicks, overview };
}

function getDefaultHeroCardSort(metric: CardMetric): SortState<HeroCardSortKey> {
  return metric === 'uplift'
    ? { key: 'uplift', direction: 'desc' }
    : { key: 'appearances', direction: 'desc' };
}

export default function HeroDetailDashboard({
  hero,
  locale,
  manifest,
  source,
  initialSelectedWindow,
  initialSelectedTier,
  initialSelectedMetric,
  dailyByTier,
  overviewByWindow,
  winrateByWindow,
  upliftByWindow,
}: HeroDetailDashboardProps) {
  const windowOptions = useMemo(() => getWindowOptionsFromManifest(manifest), [manifest]);
  const initialSelection = useMemo(
    () =>
      readCardSelection(
        windowOptions,
        getTierOptions(manifest, initialSelectedWindow, initialSelectedMetric),
        initialSelectedWindow,
        initialSelectedTier,
        initialSelectedMetric
      ),
    [
      initialSelectedMetric,
      initialSelectedTier,
      initialSelectedWindow,
      manifest,
      windowOptions,
    ]
  );

  const [selectedMetric, setSelectedMetric] = useState<CardMetric>(initialSelection.metric);
  const [selectedWindow, setSelectedWindow] = useState<MetricWindow>(initialSelection.window);
  const [selectedTier, setSelectedTier] = useState<RatingTier>(initialSelection.tier);
  const [isTrendExpanded, setIsTrendExpanded] = useState(false);
  const [sortState, setSortState] = useState<SortState<HeroCardSortKey>>(
    getDefaultHeroCardSort(initialSelection.metric)
  );
  const routeBase = `/heroes/${hero}`;
  const tierOptions = useMemo(
    () => getTierOptions(manifest, selectedWindow, selectedMetric),
    [manifest, selectedMetric, selectedWindow]
  );

  useEffect(() => {
    if (!tierOptions.includes(selectedTier)) {
      setSelectedTier(tierOptions[0] ?? 'all');
    }
  }, [selectedTier, tierOptions]);

  useEffect(() => {
    setSortState(getDefaultHeroCardSort(selectedMetric));
  }, [selectedMetric]);

  useEffect(() => {
    syncFilterStateToUrl(routeBase, {
      w: selectedWindow,
      t: selectedTier,
      m: selectedMetric,
      lang: locale,
    });
  }, [locale, routeBase, selectedMetric, selectedTier, selectedWindow]);

  const dailyPayload = dailyByTier[selectedTier] ?? dailyByTier[tierOptions[0] ?? 'all'];
  const overviewPayload =
    overviewByWindow[selectedWindow]?.[selectedTier] ??
    overviewByWindow[selectedWindow]?.[tierOptions[0] ?? 'all'];
  const cardsPayload =
    selectedMetric === 'uplift'
      ? upliftByWindow[selectedWindow]?.[selectedTier] ??
        upliftByWindow[selectedWindow]?.[tierOptions[0] ?? 'all']
      : winrateByWindow[selectedWindow]?.[selectedTier] ??
        winrateByWindow[selectedWindow]?.[tierOptions[0] ?? 'all'];

  const { points, detailRow, visibleDays, yAxisTicks, overview } = useMemo(
    () => buildHeroState(hero, dailyPayload, overviewPayload, TREND_WINDOW),
    [dailyPayload, hero, overviewPayload]
  );

  const cardRows = useMemo(() => {
    const rows = (cardsPayload?.rows ?? []).filter((row) => row.hero === hero);
    return sortRows(rows, sortState, {
      name: (row) => row.display_name,
      winRate: (row) => ('win_rate' in row ? row.win_rate : null),
      appearances: (row) => ('appearances' in row ? row.appearances : null),
      wins: (row) => ('wins' in row ? row.wins : null),
      wilsonLower: (row) => ('win_rate_wilson_lower' in row ? row.win_rate_wilson_lower : null),
      uplift: (row) => ('uplift' in row ? row.uplift : null),
      ciLower: (row) => ('uplift_ci_95_lower' in row ? row.uplift_ci_95_lower : null),
      ciUpper: (row) => ('uplift_ci_95_upper' in row ? row.uplift_ci_95_upper : null),
      runsWith: (row) => ('runs_with' in row ? row.runs_with : null),
      runsWithout: (row) => ('runs_without' in row ? row.runs_without : null),
    });
  }, [cardsPayload?.rows, hero, sortState]);

  const rowCount = cardRows.length;
  const topCard = useMemo(() => {
    const rows = (cardsPayload?.rows ?? []).filter((row) => row.hero === hero);
    return sortRows(rows, getDefaultHeroCardSort(selectedMetric), {
      name: (row) => row.display_name,
      winRate: (row) => ('win_rate' in row ? row.win_rate : null),
      appearances: (row) => ('appearances' in row ? row.appearances : null),
      wins: (row) => ('wins' in row ? row.wins : null),
      wilsonLower: (row) => ('win_rate_wilson_lower' in row ? row.win_rate_wilson_lower : null),
      uplift: (row) => ('uplift' in row ? row.uplift : null),
      ciLower: (row) => ('uplift_ci_95_lower' in row ? row.uplift_ci_95_lower : null),
      ciUpper: (row) => ('uplift_ci_95_upper' in row ? row.uplift_ci_95_upper : null),
      runsWith: (row) => ('runs_with' in row ? row.runs_with : null),
      runsWithout: (row) => ('runs_without' in row ? row.runs_without : null),
    })[0];
  }, [cardsPayload?.rows, hero, selectedMetric]);
  const yMin = yAxisTicks[0] ?? 0;
  const yMax = yAxisTicks.at(-1) ?? 1;
  const heroColor = getHeroColor(hero);
  const generatedAt =
    dailyPayload?.generatedAt ?? overviewPayload?.generatedAt ?? manifest.generatedAt;

  return (
    <StatsPageShell
      activeSection="heroes"
      locale={locale}
      eyebrow="BazaarPlusPlus analytics"
      title={hero}
      description=""
      source={source}
      generatedAt={generatedAt}
      summary={
        <>
          <SummaryMetricCard
            label="10W rate"
            value={detailRow ? formatPercent(detailRow.winRate) : 'N/A'}
          />
          <SummaryMetricCard
            label="Runs"
            value={detailRow?.runsTotal == null ? 'N/A' : formatInteger(detailRow.runsTotal)}
          />
          <SummaryMetricCard
            label="Perfect"
            value={detailRow?.perfectRate == null ? 'N/A' : formatPercent(detailRow.perfectRate)}
          />
          <SummaryMetricCard
            label="Gold"
            value={detailRow?.goldRate == null ? 'N/A' : formatPercent(detailRow.goldRate)}
          />
        </>
      }
      filters={
        <section className="grid gap-4 rounded-[24px] border border-[color:var(--color-border)] bg-[color:rgba(26,22,19,0.84)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <a
                href={buildLocalizedHref('/', {
                  w: selectedWindow,
                  t: selectedTier,
                  lang: locale,
                })}
                className="text-sm text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-text-base)]"
              >
                Back to Heroes
              </a>
              <div className="flex items-center gap-3">
                <HeroBadge hero={hero} selected />
                <p className="text-sm text-[color:var(--color-text-base)]">
                  Hero card analysis
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'winrate', label: 'Win rate' },
                { key: 'uplift', label: 'Uplift' },
              ] as const).map((option) => {
                const active = option.key === selectedMetric;
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedMetric(option.key)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      active
                        ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:#130f08]'
                        : 'border-[color:var(--color-border)] bg-transparent text-[color:var(--color-text-muted)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-text-base)]'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <MetricFilterBar
            compact
            locale={locale}
            title="Scope"
            metricLabel={selectedMetric === 'uplift' ? 'item_uplift' : 'item_winrate'}
            routeBase={routeBase}
            windowOptions={windowOptions}
            tierOptions={tierOptions}
            selectedWindow={selectedWindow}
            selectedTier={selectedTier}
            selectedMetric={selectedMetric}
            onWindowSelect={setSelectedWindow}
            onTierSelect={setSelectedTier}
          />
        </section>
      }
    >
      <section className="grid gap-6">
        <section className="overflow-hidden rounded-[24px] border border-[color:var(--color-border)] bg-[color:rgba(26,22,19,0.92)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:rgba(58,47,31,0.7)] px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
                Top cards
              </p>
              <h2 className="mt-2 text-lg text-[color:var(--color-text-base)]">
                {selectedMetric === 'uplift' ? 'Hero uplift cards' : 'Hero winrate cards'}
              </h2>
            </div>
            <p className="text-sm text-[color:var(--color-text-muted)]">
              {topCard ? `${rowCount} hero-scoped rows` : 'No card rows for this filter'}
            </p>
          </div>

          {rowCount === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[color:var(--color-text-muted)]">
              No card data for {hero} under the current filter combination.
            </div>
          ) : (
            <VirtualizedMetricTable
              ariaLabel={`${hero} card analysis`}
              columnCount={selectedMetric === 'uplift' ? 7 : 6}
              columnWidths={getHeroCardColumnWidths(selectedMetric)}
              rows={cardRows}
              rowHeight={88}
              viewportHeight={704}
              getRowKey={(row) => row.template_id}
              columns={
                <tr>
                  <th className="px-5 py-4">Card</th>
                  <SortableHeader
                    label="Name"
                    className="px-5 py-4"
                    activeDirection={sortState.key === 'name' ? sortState.direction : undefined}
                    onToggle={() => setSortState((current) => toggleSort(current, 'name', 'asc'))}
                  />
                  {selectedMetric === 'uplift' ? (
                    <>
                      <SortableHeader label="Uplift" className="px-5 py-4" activeDirection={sortState.key === 'uplift' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'uplift', 'desc'))} />
                      <SortableHeader label="CI lower" className="px-5 py-4" activeDirection={sortState.key === 'ciLower' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'ciLower', 'desc'))} />
                      <SortableHeader label="CI upper" className="px-5 py-4" activeDirection={sortState.key === 'ciUpper' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'ciUpper', 'desc'))} />
                      <SortableHeader label="Runs with" className="px-5 py-4" activeDirection={sortState.key === 'runsWith' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runsWith', 'desc'))} />
                      <SortableHeader label="Runs without" className="px-5 py-4" activeDirection={sortState.key === 'runsWithout' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runsWithout', 'desc'))} />
                    </>
                  ) : (
                    <>
                      <SortableHeader label="Win rate" className="px-5 py-4" activeDirection={sortState.key === 'winRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'winRate', 'desc'))} />
                      <SortableHeader label="Appearances" className="px-5 py-4" activeDirection={sortState.key === 'appearances' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'appearances', 'desc'))} />
                      <SortableHeader label="Wins" className="px-5 py-4" activeDirection={sortState.key === 'wins' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'wins', 'desc'))} />
                      <SortableHeader label="Wilson lower" className="px-5 py-4" activeDirection={sortState.key === 'wilsonLower' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'wilsonLower', 'desc'))} />
                    </>
                  )}
                </tr>
              }
              renderRow={(row) => (
                <tr
                  key={row.template_id}
                  className="metric-row border-t border-[color:rgba(58,47,31,0.7)] text-sm text-[color:var(--color-text-base)]"
                >
                  <td className="px-5 py-4">
                    <CardThumb
                      templateId={row.template_id}
                      name={row.display_name}
                      imageUrl={row.image_url}
                      cardSize={row.card_size}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div>{row.display_name}</div>
                  </td>
                  {selectedMetric === 'uplift' ? (
                    <>
                      <td className="px-5 py-4 tnum text-[color:var(--color-accent-bright)]">
                        {formatPercent((row as ItemUpliftViewRow).uplift)}
                      </td>
                      <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                        {formatPercent((row as ItemUpliftViewRow).uplift_ci_95_lower)}
                      </td>
                      <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                        {formatPercent((row as ItemUpliftViewRow).uplift_ci_95_upper)}
                      </td>
                      <td className="px-5 py-4 tnum">
                        {formatInteger((row as ItemUpliftViewRow).runs_with)}
                      </td>
                      <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                        {formatInteger((row as ItemUpliftViewRow).runs_without)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-4 tnum text-[color:var(--color-accent-bright)]">
                        {formatPercent((row as CardWinrateViewRow).win_rate)}
                      </td>
                      <td className="px-5 py-4 tnum">
                        {formatInteger((row as CardWinrateViewRow).appearances)}
                      </td>
                      <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                        {formatInteger((row as CardWinrateViewRow).wins)}
                      </td>
                      <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                        {formatPercent((row as CardWinrateViewRow).win_rate_wilson_lower)}
                      </td>
                    </>
                  )}
                </tr>
              )}
            />
          )}
        </section>

        <section className="grid gap-5 rounded-[24px] border border-[color:var(--color-border)] bg-[color:rgba(26,22,19,0.92)] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
                Trend view
              </p>
              <h2 className="mt-2 text-xl text-[color:var(--color-text-base)]">
                {WINDOW_LABELS[TREND_WINDOW]} {hero} winrate
              </h2>
            </div>
            <button
              type="button"
              aria-expanded={isTrendExpanded}
              onClick={() => setIsTrendExpanded((current) => !current)}
              className="rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm text-[color:var(--color-text-base)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent-bright)]"
            >
              {isTrendExpanded ? 'Hide trend' : 'Show trend'}
            </button>
          </div>

          {!isTrendExpanded ? (
            <div className="rounded-[20px] border border-[color:rgba(58,47,31,0.7)] bg-[color:rgba(19,15,8,0.7)] px-5 py-6 text-sm text-[color:var(--color-text-muted)]">
              Trend view is collapsed by default so the hero-scoped card table stays above the
              fold. Expand it when you want the recent {WINDOW_LABELS[TREND_WINDOW].toLowerCase()} series.
            </div>
          ) : (
            <>
              {points.length === 0 ? (
                <div className="rounded-[20px] border border-[color:rgba(58,47,31,0.7)] bg-[color:rgba(19,15,8,0.7)] px-5 py-12 text-center text-sm text-[color:var(--color-text-muted)]">
                  No daily trend data for {hero} under the current filter combination.
                </div>
              ) : (
                <div
                  data-testid="hero-detail-chart"
                  className="rounded-[20px] border border-[color:rgba(58,47,31,0.7)] bg-[linear-gradient(180deg,rgba(212,162,76,0.05),rgba(13,11,8,0.94))] p-3 sm:p-4"
                >
                  <svg
                    viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                    className="h-auto w-full"
                    role="img"
                    aria-label={`${hero} winrate chart`}
                  >
                    {yAxisTicks.map((tick) => {
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

                    {visibleDays.map((day, index) => {
                      const x = getChartX(index, visibleDays.length);
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

                    <g data-testid="hero-detail-line" data-hero={hero}>
                      <polyline
                        fill="none"
                        stroke={heroColor}
                        strokeWidth="3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={points
                          .map((point) => {
                            const x = getChartX(visibleDays.indexOf(point.day), visibleDays.length);
                            const y = getChartY(point.winRate, yMin, yMax);
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />
                      {points.map((point, index) => {
                        const x = getChartX(visibleDays.indexOf(point.day), visibleDays.length);
                        const y = getChartY(point.winRate, yMin, yMax);
                        return (
                          <circle
                            key={`${point.day}-${index}`}
                            cx={x}
                            cy={y}
                            r="4"
                            fill={heroColor}
                            stroke="rgba(19,15,8,0.9)"
                            strokeWidth="2"
                          />
                        );
                      })}
                    </g>
                  </svg>
                </div>
              )}
            </>
          )}
        </section>
      </section>
    </StatsPageShell>
  );
}
