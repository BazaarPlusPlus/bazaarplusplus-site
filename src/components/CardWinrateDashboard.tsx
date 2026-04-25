import { useEffect, useMemo, useState } from 'react';

import type {
  CardMetric,
  CardWinrateViewRow,
  ItemInclusionViewRow,
  ItemUpliftViewRow,
  Locale,
  ManifestPayload,
  MetricsSource,
  MetricWindow,
  RatingTier,
} from '../lib/metrics';
import {
  getAvailableTiers,
  getAvailableWindowsForMetric,
} from '../lib/metrics';
import {
  formatInteger,
  formatPercent,
} from '../lib/dashboard';
import { getHeroColor } from '../lib/heroes';
import {
  ALL_HEROES,
  getActiveHeroFilter,
  getHeroFilterOptions,
  getWindowOptionsFromManifest,
  readHeroSelection,
  readCardSelection,
  syncFilterStateToUrl,
} from '../lib/interactive-filters';
import { sortRows, toggleSort, type SortPrimitive, type SortState } from '../lib/table-sorting';
import CardThumb from './CardThumb';
import HeroBadge from './HeroBadge';
import ScopeFilterPanel from './ScopeFilterPanel';
import SortableHeader from './SortableHeader';
import StatsPageShell from './StatsPageShell';
import VirtualizedMetricTable from './VirtualizedMetricTable';

type ViewPayload<T> = {
  rowCount: number;
  rows: T[];
};

type CardWorkspaceRow =
  | CardWinrateViewRow
  | ItemUpliftViewRow
  | ItemInclusionViewRow;

type CardWinrateDashboardProps = {
  locale: Locale;
  manifest: ManifestPayload;
  initialSelectedMetric: CardMetric;
  initialSelectedWindow: MetricWindow;
  initialSelectedTier: RatingTier;
  source: MetricsSource;
  winrateByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<CardWinrateViewRow>>>>>;
  upliftByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<ItemUpliftViewRow>>>>>;
  inclusionByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<ItemInclusionViewRow>>>>>;
};

const CARD_METRIC_TABS: Array<{
  key: CardMetric;
  label: string;
  ariaLabel?: string;
}> = [
  { key: 'winrate', label: 'Win rate' },
  { key: 'uplift', label: 'Uplift' },
  { key: 'inclusion', label: 'Inclusion', ariaLabel: 'Card inclusion' },
];

const CARD_WINRATE_COLUMN_WIDTHS = ['10%', '13%', '25%', '13%', '13%', '12%', '14%'];
const CARD_UPLIFT_COLUMN_WIDTHS = ['9%', '12%', '22%', '11%', '11%', '11%', '12%', '12%'];
const CARD_INCLUSION_COLUMN_WIDTHS = ['10%', '13%', '29%', '14%', '14%', '20%'];

type CardSortKey =
  | 'hero'
  | 'name'
  | 'winRate'
  | 'appearances'
  | 'wins'
  | 'wilsonLower'
  | 'uplift'
  | 'ciLower'
  | 'ciUpper'
  | 'runsWith'
  | 'runsWithout'
  | 'inclusionRate'
  | 'runsTotal10w';

function getDefaultCardSort(metric: CardMetric): SortState<CardSortKey> {
  if (metric === 'uplift') {
    return { key: 'uplift', direction: 'desc' };
  }

  if (metric === 'inclusion') {
    return { key: 'inclusionRate', direction: 'desc' };
  }

  return { key: 'appearances', direction: 'desc' };
}

function getCardTableColumnWidths(metric: CardMetric): string[] {
  if (metric === 'uplift') {
    return CARD_UPLIFT_COLUMN_WIDTHS;
  }

  if (metric === 'inclusion') {
    return CARD_INCLUSION_COLUMN_WIDTHS;
  }

  return CARD_WINRATE_COLUMN_WIDTHS;
}

function getMetricDataLabel(metric: CardMetric): string {
  if (metric === 'uplift') {
    return 'item_uplift';
  }

  if (metric === 'inclusion') {
    return 'item_inclusion';
  }

  return 'item_winrate';
}

function getMetricWindows(
  manifest: ManifestPayload,
  metric: CardMetric
): MetricWindow[] {
  const metricName = getMetricDataLabel(metric);
  return getAvailableWindowsForMetric(manifest, metricName);
}

function getMetricTiers(
  manifest: ManifestPayload,
  window: MetricWindow,
  metric: CardMetric
): RatingTier[] {
  return getAvailableTiers(manifest, window, getMetricDataLabel(metric));
}

function getMetricTitle(metric: CardMetric): string {
  return CARD_METRIC_TABS.find((tab) => tab.key === metric)?.label ?? 'Win rate';
}

function getTopRowDetail(
  row: CardWorkspaceRow | undefined,
  metric: CardMetric
): string {
  if (!row) {
    return 'No data';
  }

  if (metric === 'uplift') {
    const upliftRow = row as ItemUpliftViewRow;
    return `${upliftRow.hero} · ${formatPercent(upliftRow.uplift)} uplift`;
  }

  if (metric === 'inclusion') {
    const inclusionRow = row as ItemInclusionViewRow;
    return `${inclusionRow.hero} · ${formatPercent(inclusionRow.inclusion_rate)} inclusion`;
  }

  const winrateRow = row as CardWinrateViewRow;
  return `${winrateRow.hero} · ${formatInteger(winrateRow.appearances)} appearances`;
}

export default function CardWinrateDashboard({
  locale,
  manifest,
  initialSelectedMetric,
  initialSelectedWindow,
  initialSelectedTier,
  source,
  winrateByWindow,
  upliftByWindow,
  inclusionByWindow,
}: CardWinrateDashboardProps) {
  const manifestWindows = useMemo(() => getWindowOptionsFromManifest(manifest), [manifest]);
  const initialSelection = useMemo(
    () =>
      readCardSelection(
        manifestWindows,
        getMetricTiers(
          manifest,
          initialSelectedWindow,
          initialSelectedMetric
        ),
        initialSelectedWindow,
        initialSelectedTier,
        initialSelectedMetric
      ),
    [
      initialSelectedMetric,
      initialSelectedTier,
      initialSelectedWindow,
      manifest,
      manifestWindows,
    ]
  );

  const [selectedMetric, setSelectedMetric] = useState<CardMetric>(initialSelection.metric);
  const [selectedWindow, setSelectedWindow] = useState<MetricWindow>(initialSelection.window);
  const [selectedTier, setSelectedTier] = useState<RatingTier>(initialSelection.tier);
  const [selectedHero, setSelectedHero] = useState(readHeroSelection);
  const [sortState, setSortState] = useState<SortState<CardSortKey>>(
    getDefaultCardSort(initialSelection.metric)
  );

  const availableWindows = useMemo(
    () => getMetricWindows(manifest, selectedMetric),
    [manifest, selectedMetric]
  );
  const tierOptions = useMemo(
    () => getMetricTiers(manifest, selectedWindow, selectedMetric),
    [manifest, selectedMetric, selectedWindow]
  );

  useEffect(() => {
    if (!availableWindows.includes(selectedWindow)) {
      setSelectedWindow(availableWindows[0] ?? '1d');
    }
  }, [availableWindows, selectedWindow]);

  useEffect(() => {
    if (!tierOptions.includes(selectedTier)) {
      setSelectedTier(tierOptions[0] ?? 'all');
    }
  }, [selectedTier, tierOptions]);

  useEffect(() => {
    setSortState(getDefaultCardSort(selectedMetric));
  }, [selectedMetric]);

  const payload = useMemo(() => {
    if (selectedMetric === 'uplift') {
      return (
        upliftByWindow[selectedWindow]?.[selectedTier] ??
        upliftByWindow[selectedWindow]?.[tierOptions[0] ?? 'all']
      );
    }

    if (selectedMetric === 'inclusion') {
      return (
        inclusionByWindow[selectedWindow]?.[selectedTier] ??
        inclusionByWindow[selectedWindow]?.[tierOptions[0] ?? 'all']
      );
    }

    return (
      winrateByWindow[selectedWindow]?.[selectedTier] ??
      winrateByWindow[selectedWindow]?.[tierOptions[0] ?? 'all']
    );
  }, [
    inclusionByWindow,
    selectedMetric,
    selectedTier,
    selectedWindow,
    tierOptions,
    upliftByWindow,
    winrateByWindow,
  ]);

  const rows = (payload?.rows ?? []) as CardWorkspaceRow[];
  const heroOptions = useMemo(() => getHeroFilterOptions(rows), [rows]);
  const activeHero = getActiveHeroFilter(heroOptions, selectedHero);
  const filteredRows = useMemo(
    () => (activeHero === ALL_HEROES ? rows : rows.filter((row) => row.hero === activeHero)),
    [activeHero, rows]
  );

  useEffect(() => {
    if (!heroOptions.includes(selectedHero)) {
      setSelectedHero(ALL_HEROES);
    }
  }, [heroOptions, selectedHero]);

  useEffect(() => {
    syncFilterStateToUrl('/cards', {
      w: selectedWindow,
      t: selectedTier,
      m: selectedMetric,
      hero: activeHero,
      lang: locale,
    });
  }, [activeHero, locale, selectedMetric, selectedTier, selectedWindow]);

  const sortAccessors = useMemo(
    () => ({
      hero: (row) => row.hero,
      name: (row) => row.display_name,
      winRate: (row) =>
        'win_rate' in row ? row.win_rate : null,
      appearances: (row) =>
        'appearances' in row ? row.appearances : 'runs_with' in row ? row.runs_with : null,
      wins: (row) => ('wins' in row ? row.wins : null),
      wilsonLower: (row) =>
        'win_rate_wilson_lower' in row ? row.win_rate_wilson_lower : null,
      uplift: (row) => ('uplift' in row ? row.uplift : null),
      ciLower: (row) => ('uplift_ci_95_lower' in row ? row.uplift_ci_95_lower : null),
      ciUpper: (row) => ('uplift_ci_95_upper' in row ? row.uplift_ci_95_upper : null),
      runsWith: (row) =>
        'runs_with' in row ? row.runs_with : 'runs_with_card' in row ? row.runs_with_card : null,
      runsWithout: (row) => ('runs_without' in row ? row.runs_without : null),
      inclusionRate: (row) => ('inclusion_rate' in row ? row.inclusion_rate : null),
      runsTotal10w: (row) => ('runs_total_10w' in row ? row.runs_total_10w : null),
    } satisfies Record<CardSortKey, (row: CardWorkspaceRow) => SortPrimitive>),
    []
  );
  const sortedRows = useMemo(
    () => sortRows(filteredRows, sortState, sortAccessors),
    [filteredRows, sortAccessors, sortState]
  );
  const title = 'Card analysis';
  const metricTitle = getMetricTitle(selectedMetric);
  const columnCount =
    selectedMetric === 'uplift'
      ? 8
      : selectedMetric === 'inclusion'
        ? 6
        : 7;
  const columnWidths = getCardTableColumnWidths(selectedMetric);

  const totalRows = sortedRows.length;

  return (
    <StatsPageShell
      activeSection="cards"
      locale={locale}
      eyebrow={`Bazaar Almanac · ${metricTitle} ledger`}
      title={title}
      source={source}
      generatedAt={manifest.generatedAt}
      summary={null}
      filters={
        <section className="grid gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {CARD_METRIC_TABS.map((option) => {
                const active = option.key === selectedMetric;
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-label={option.ariaLabel}
                    aria-pressed={active}
                    onClick={() => setSelectedMetric(option.key)}
                    className={`group relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      active
                        ? 'border-[color:var(--color-accent)] bg-[color:rgba(232,185,74,0.12)] text-[color:var(--color-accent-bright)]'
                        : 'border-transparent text-[color:var(--color-text-muted)] hover:border-[color:var(--color-border-soft)] hover:text-[color:var(--color-text-base)]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`font-display-italic text-[0.7rem] tracking-[0.18em] ${
                        active ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-text-faint)]'
                      }`}
                    >
                      {String(CARD_METRIC_TABS.indexOf(option) + 1).padStart(2, '0')}
                    </span>
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="font-display-italic text-[0.78rem] tracking-[0.12em] text-[color:var(--color-text-muted)]">
              <span className="tnum text-[color:var(--color-accent-bright)]">{formatInteger(totalRows)}</span> cards in view
            </p>
          </div>

          <ScopeFilterPanel
            ariaLabel="Card scope filters"
            windowOptions={availableWindows}
            tierOptions={tierOptions}
            selectedWindow={selectedWindow}
            selectedTier={selectedTier}
            heroOptions={heroOptions}
            selectedHero={activeHero}
            onWindowSelect={setSelectedWindow}
            onTierSelect={setSelectedTier}
            onHeroSelect={setSelectedHero}
          />
        </section>
      }
    >
      <section className="surface overflow-hidden">
        <VirtualizedMetricTable
          ariaLabel={metricTitle}
          columnCount={columnCount}
          columnWidths={columnWidths}
          rows={sortedRows}
          rowHeight={88}
          viewportHeight={880}
          getRowKey={(row) => `${row.hero}:${row.template_id}`}
          columns={
            <tr>
              <th className="px-5 py-4">Card</th>
              <SortableHeader
                label="Hero"
                className="px-5 py-4"
                activeDirection={sortState.key === 'hero' ? sortState.direction : undefined}
                onToggle={() => setSortState((current) => toggleSort(current, 'hero', 'asc'))}
              />
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
              ) : selectedMetric === 'inclusion' ? (
                <>
                  <SortableHeader label="Inclusion" className="px-5 py-4" activeDirection={sortState.key === 'inclusionRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'inclusionRate', 'desc'))} />
                  <SortableHeader label="Runs with" className="px-5 py-4" activeDirection={sortState.key === 'runsWith' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runsWith', 'desc'))} />
                  <SortableHeader label="Hero 10W total" className="px-5 py-4" activeDirection={sortState.key === 'runsTotal10w' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runsTotal10w', 'desc'))} />
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
              key={`${row.hero}:${row.template_id}`}
              className="metric-row hero-rail border-t border-[color:var(--color-border-soft)] text-sm text-[color:var(--color-text-base)]"
              style={{ '--hero-color': getHeroColor(row.hero) } as React.CSSProperties}
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
                <HeroBadge hero={row.hero} size="sm" />
              </td>
              <td className="px-5 py-4 font-medium text-[color:var(--color-text-base)]">{row.display_name}</td>
              {selectedMetric === 'uplift' ? (
                <>
                  <td
                    className={`px-5 py-4 tnum text-[0.95rem] font-semibold ${
                      (row as ItemUpliftViewRow).uplift >= 0
                        ? 'text-[color:var(--color-pos)]'
                        : 'text-[color:var(--color-neg)]'
                    }`}
                  >
                    {(row as ItemUpliftViewRow).uplift >= 0 ? '+' : ''}
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
              ) : selectedMetric === 'inclusion' ? (
                <>
                  <td className="px-5 py-4 tnum text-[color:var(--color-accent-bright)]">
                    {formatPercent((row as ItemInclusionViewRow).inclusion_rate)}
                  </td>
                  <td className="px-5 py-4 tnum">
                    {formatInteger((row as ItemInclusionViewRow).runs_with_card)}
                  </td>
                  <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                    {formatInteger((row as ItemInclusionViewRow).runs_total_10w)}
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
      </section>
    </StatsPageShell>
  );
}
