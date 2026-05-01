import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getSiteCopy } from '../../content/site-copy';
import type {
  CardDictionary,
  CardMetric,
  CardMetricPayload,
  CardMetricViewRow,
  CardWinrateViewRow,
  ItemInclusionViewRow,
  ItemUpliftViewRow,
  Locale,
  ManifestPayload,
  MetricsSource,
  MetricWindow,
  RatingTier,
} from '../../shared/lib/metrics';
import {
  buildCardMetricViewRows,
  getAvailableTiers,
  getAvailableWindowsForMetric,
  getCardMetricPayloadMetric,
} from '../../shared/lib/metrics';
import type { MetricsRequestOptions, RuntimeMetricsClient } from '../../shared/lib/metrics-client';
import {
  formatInteger,
  formatPercent,
  WINDOW_LABELS,
} from '../../shared/lib/dashboard';
import { getHeroColor } from '../../shared/lib/heroes';
import {
  ALL_HEROES,
  getActiveHeroFilter,
  getHeroFilterOptions,
  getWindowOptionsFromManifest,
  readHeroSelection,
  readCardSelection,
  syncFilterStateToUrl,
} from '../../shared/lib/interactive-filters';
import { sortRows, toggleSort, type SortPrimitive, type SortState } from '../../shared/lib/table-sorting';
import CardThumb from '../../shared/components/CardThumb';
import HeroBadge from '../../shared/components/HeroBadge';
import ScopeFilterPanel from '../../shared/components/ScopeFilterPanel';
import SortableHeader from '../../shared/components/SortableHeader';
import StatsPageShell from '../../shared/components/StatsPageShell';
import VirtualizedMetricTable from '../../shared/components/VirtualizedMetricTable';

type ViewPayload<T> = {
  rowCount: number;
  rows: T[];
};

type CardWorkspaceRow = CardMetricViewRow;

type CardAnalysisDashboardProps = {
  locale: Locale;
  manifest: ManifestPayload;
  initialSelectedMetric: CardMetric;
  initialSelectedWindow: MetricWindow;
  initialSelectedTier: RatingTier;
  source: MetricsSource;
  client?: RuntimeMetricsClient;
  cardDictionary?: CardDictionary;
  winrateByWindow?: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<CardWinrateViewRow>>>>>;
  upliftByWindow?: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<ItemUpliftViewRow>>>>>;
  inclusionByWindow?: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<ItemInclusionViewRow>>>>>;
};

const CARD_METRIC_TABS: Array<{
  key: CardMetric;
}> = [
  { key: 'winrate' },
  { key: 'uplift' },
  { key: 'inclusion' },
];

const CARD_WINRATE_COLUMN_WIDTHS = ['11%', '14%', '31%', '14%', '15%', '15%'];
const CARD_UPLIFT_COLUMN_WIDTHS = ['9%', '12%', '22%', '11%', '11%', '11%', '12%', '12%'];
const CARD_INCLUSION_COLUMN_WIDTHS = ['10%', '13%', '29%', '14%', '14%', '20%'];

type CardSortKey =
  | 'hero'
  | 'name'
  | 'winRate'
  | 'appearances'
  | 'wins'
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

function loadSelectedCardPayload(
  client: RuntimeMetricsClient,
  metric: CardMetric,
  window: MetricWindow,
  tier: RatingTier,
  requestOptions?: MetricsRequestOptions
): Promise<CardMetricPayload> {
  if (metric === 'uplift') {
    return client.getItemUplift(window, tier, requestOptions);
  }

  if (metric === 'inclusion') {
    return client.getItemInclusion(window, tier, requestOptions);
  }

  return client.getCardWinrate(window, tier, requestOptions);
}

function getCardPayloadQueryKey(
  metric: CardMetric,
  window: MetricWindow,
  tier: RatingTier
) {
  return ['card-metric-payload', metric, window, tier] as const;
}

function buildSelectedCardRows(
  metric: CardMetric,
  payload: CardMetricPayload,
  cardDictionary: CardDictionary,
  locale: Locale
): CardWorkspaceRow[] {
  return buildCardMetricViewRows(metric, payload, cardDictionary, locale);
}

function getMetricWindows(
  manifest: ManifestPayload,
  metric: CardMetric
): MetricWindow[] {
  const metricName = getCardMetricPayloadMetric(metric);
  return getAvailableWindowsForMetric(manifest, metricName);
}

function getMetricTiers(
  manifest: ManifestPayload,
  window: MetricWindow,
  metric: CardMetric
): RatingTier[] {
  return getAvailableTiers(manifest, window, getCardMetricPayloadMetric(metric));
}

function getMetricTitle(metric: CardMetric, copy: ReturnType<typeof getSiteCopy>['stats']['cards']): string {
  return copy.metricTabs[metric].label;
}

export default function CardAnalysisDashboard({
  locale,
  manifest,
  initialSelectedMetric,
  initialSelectedWindow,
  initialSelectedTier,
  source,
  client,
  cardDictionary,
  winrateByWindow = {},
  upliftByWindow = {},
  inclusionByWindow = {},
}: CardAnalysisDashboardProps) {
  const copy = getSiteCopy(locale);
  const cardCopy = copy.stats.cards;
  const scopeCopy = copy.common.scope;
  const queryClient = useQueryClient();
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
  const canLoadSelectedPayload =
    availableWindows.includes(selectedWindow) && tierOptions.includes(selectedTier);
  const prefetchCardPayload = useCallback(
    (metric: CardMetric, window: MetricWindow, tier: RatingTier) => {
      if (!client || !cardDictionary) {
        return;
      }

      const windows = getMetricWindows(manifest, metric);
      const tiers = getMetricTiers(manifest, window, metric);
      if (!windows.includes(window) || !tiers.includes(tier)) {
        return;
      }

      void queryClient.prefetchQuery({
        queryKey: getCardPayloadQueryKey(metric, window, tier),
        queryFn: ({ signal }) => loadSelectedCardPayload(client, metric, window, tier, { signal }),
      });
    },
    [cardDictionary, client, manifest, queryClient]
  );
  const remotePayloadQuery = useQuery({
    queryKey: getCardPayloadQueryKey(selectedMetric, selectedWindow, selectedTier),
    queryFn: ({ signal }) => {
      if (!client) {
        throw new Error('Missing metrics client');
      }

      return loadSelectedCardPayload(client, selectedMetric, selectedWindow, selectedTier, { signal });
    },
    enabled: Boolean(client && cardDictionary && canLoadSelectedPayload),
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === selectedMetric ? previousData : undefined,
  });

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

  useEffect(() => {
    if (!remotePayloadQuery.data || !client || !cardDictionary || !canLoadSelectedPayload) {
      return;
    }

    availableWindows.forEach((window) => {
      if (window !== selectedWindow) {
        prefetchCardPayload(selectedMetric, window, selectedTier);
      }
    });

    tierOptions.forEach((tier) => {
      if (tier !== selectedTier) {
        prefetchCardPayload(selectedMetric, selectedWindow, tier);
      }
    });
  }, [
    availableWindows,
    canLoadSelectedPayload,
    cardDictionary,
    client,
    prefetchCardPayload,
    remotePayloadQuery.data,
    selectedMetric,
    selectedTier,
    selectedWindow,
    tierOptions,
  ]);

  const preloadedPayload = useMemo(() => {
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

  const remoteRows = useMemo(() => {
    if (!remotePayloadQuery.data || !cardDictionary) {
      return [];
    }

    return buildSelectedCardRows(selectedMetric, remotePayloadQuery.data, cardDictionary, locale);
  }, [cardDictionary, locale, remotePayloadQuery.data, selectedMetric]);
  const usesRemotePayloads = Boolean(client && cardDictionary);
  const isRowsLoading = usesRemotePayloads && remotePayloadQuery.isPending;
  const isRowsRefreshing =
    usesRemotePayloads && remotePayloadQuery.isFetching && !remotePayloadQuery.isPending;
  const rows = usesRemotePayloads
    ? remoteRows
    : ((preloadedPayload?.rows ?? []) as CardWorkspaceRow[]);
  const heroOptions = useMemo(() => getHeroFilterOptions(rows), [rows]);
  const activeHero = getActiveHeroFilter(heroOptions, selectedHero);
  const filteredRows = useMemo(
    () => (activeHero === ALL_HEROES ? rows : rows.filter((row) => row.hero === activeHero)),
    [activeHero, rows]
  );

  useEffect(() => {
    if (!isRowsLoading && !heroOptions.includes(selectedHero)) {
      setSelectedHero(ALL_HEROES);
    }
  }, [heroOptions, isRowsLoading, selectedHero]);

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
      name: (row) => row.displayName,
      winRate: (row) =>
        'win_rate' in row ? row.win_rate : null,
      appearances: (row) =>
        'appearances' in row ? row.appearances : 'runs_with' in row ? row.runs_with : null,
      wins: (row) => ('wins' in row ? row.wins : null),
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
  const title = cardCopy.title;
  const metricTitle = getMetricTitle(selectedMetric, cardCopy);
  const columnCount =
    selectedMetric === 'uplift'
      ? 8
      : selectedMetric === 'inclusion'
        ? 6
        : 6;
  const columnWidths = getCardTableColumnWidths(selectedMetric);

  const totalRows = sortedRows.length;
  const refreshLabel = `${cardCopy.updating} ${WINDOW_LABELS[selectedWindow]} ${scopeCopy.fullTierLabels[selectedTier]} ${cardCopy.data}`;

  return (
    <StatsPageShell
      activeSection="cards"
      locale={locale}
      eyebrow={`${cardCopy.eyebrowLead}${metricTitle}${cardCopy.eyebrowLedgerSuffix}`}
      title={title}
      source={source}
      generatedAt={manifest.generatedAt}
      filters={
        <section className="grid gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {CARD_METRIC_TABS.map((option) => {
                const optionCopy = cardCopy.metricTabs[option.key];
                const active = option.key === selectedMetric;
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-label={optionCopy.ariaLabel}
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
                    {optionCopy.label}
                  </button>
                );
              })}
            </div>
            <p className="font-display-italic text-[0.78rem] tracking-[0.12em] text-[color:var(--color-text-muted)]">
              <span className="tnum text-[color:var(--color-accent-bright)]">{formatInteger(totalRows, locale)}</span> {cardCopy.cardsInView}
            </p>
          </div>

          <ScopeFilterPanel
            ariaLabel={cardCopy.scopeAriaLabel}
            locale={locale}
            windowOptions={availableWindows}
            tierOptions={tierOptions}
            selectedWindow={selectedWindow}
            selectedTier={selectedTier}
            heroOptions={heroOptions}
            selectedHero={activeHero}
            onWindowSelect={setSelectedWindow}
            onTierSelect={setSelectedTier}
            onHeroSelect={setSelectedHero}
            onWindowPreview={(window) => prefetchCardPayload(selectedMetric, window, selectedTier)}
            onTierPreview={(tier) => prefetchCardPayload(selectedMetric, selectedWindow, tier)}
          />
        </section>
      }
    >
      <section className="surface relative overflow-hidden" aria-busy={isRowsLoading || isRowsRefreshing}>
        {isRowsLoading ? (
          <div role="status" className="px-6 py-8 text-sm text-[color:var(--color-text-muted)]">
            {cardCopy.loading}
          </div>
        ) : remotePayloadQuery.isError ? (
          <div role="alert" className="px-6 py-8 text-sm text-[color:var(--color-neg)]">
            {cardCopy.unavailable}
          </div>
        ) : (
          <div className={remotePayloadQuery.isPlaceholderData ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
            {isRowsRefreshing ? (
              <div
                role="status"
                aria-label={refreshLabel}
                aria-live="polite"
                className="absolute right-4 top-4 z-20 rounded-full border border-[color:var(--color-accent-deep)] bg-[color:rgba(18,14,9,0.94)] px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-accent-bright)] shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
              >
                {refreshLabel}
              </div>
            ) : null}
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
                  <th className="px-5 py-4">{cardCopy.tableHeaders.card}</th>
                  <SortableHeader
                    label={cardCopy.tableHeaders.hero}
                    className="px-5 py-4"
                    activeDirection={sortState.key === 'hero' ? sortState.direction : undefined}
                    onToggle={() => setSortState((current) => toggleSort(current, 'hero', 'asc'))}
                  />
                  <SortableHeader
                    label={cardCopy.tableHeaders.name}
                    className="px-5 py-4"
                    activeDirection={sortState.key === 'name' ? sortState.direction : undefined}
                    onToggle={() => setSortState((current) => toggleSort(current, 'name', 'asc'))}
                  />
                  {selectedMetric === 'uplift' ? (
                    <>
                      <SortableHeader label={cardCopy.tableHeaders.uplift} className="px-5 py-4" activeDirection={sortState.key === 'uplift' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'uplift', 'desc'))} />
                      <SortableHeader label={cardCopy.tableHeaders.ciLower} className="px-5 py-4" activeDirection={sortState.key === 'ciLower' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'ciLower', 'desc'))} />
                      <SortableHeader label={cardCopy.tableHeaders.ciUpper} className="px-5 py-4" activeDirection={sortState.key === 'ciUpper' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'ciUpper', 'desc'))} />
                      <SortableHeader label={cardCopy.tableHeaders.runsWith} className="px-5 py-4" activeDirection={sortState.key === 'runsWith' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runsWith', 'desc'))} />
                      <SortableHeader label={cardCopy.tableHeaders.runsWithout} className="px-5 py-4" activeDirection={sortState.key === 'runsWithout' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runsWithout', 'desc'))} />
                    </>
                  ) : selectedMetric === 'inclusion' ? (
                    <>
                      <SortableHeader label={cardCopy.tableHeaders.inclusion} className="px-5 py-4" activeDirection={sortState.key === 'inclusionRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'inclusionRate', 'desc'))} />
                      <SortableHeader label={cardCopy.tableHeaders.runsWith} className="px-5 py-4" activeDirection={sortState.key === 'runsWith' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runsWith', 'desc'))} />
                      <SortableHeader label={cardCopy.tableHeaders.hero10wTotal} className="px-5 py-4" activeDirection={sortState.key === 'runsTotal10w' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runsTotal10w', 'desc'))} />
                    </>
                  ) : (
                    <>
                      <SortableHeader label={cardCopy.tableHeaders.winRate} className="px-5 py-4" activeDirection={sortState.key === 'winRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'winRate', 'desc'))} />
                      <SortableHeader label={cardCopy.tableHeaders.appearances} className="px-5 py-4" activeDirection={sortState.key === 'appearances' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'appearances', 'desc'))} />
                      <SortableHeader label={cardCopy.tableHeaders.wins} className="px-5 py-4" activeDirection={sortState.key === 'wins' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'wins', 'desc'))} />
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
                    name={row.displayName}
                    imageUrl={row.imageUrl}
                    cardSize={row.cardSize}
                  />
                </td>
                <td className="px-5 py-4">
                  <HeroBadge hero={row.hero} size="sm" />
                </td>
                <td className="px-5 py-4 font-medium text-[color:var(--color-text-base)]">{row.displayName}</td>
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
                      {formatInteger((row as ItemUpliftViewRow).runs_with, locale)}
                    </td>
                    <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                      {formatInteger((row as ItemUpliftViewRow).runs_without, locale)}
                    </td>
                  </>
                ) : selectedMetric === 'inclusion' ? (
                  <>
                    <td className="px-5 py-4 tnum text-[color:var(--color-accent-bright)]">
                      {formatPercent((row as ItemInclusionViewRow).inclusion_rate)}
                    </td>
                    <td className="px-5 py-4 tnum">
                      {formatInteger((row as ItemInclusionViewRow).runs_with_card, locale)}
                    </td>
                    <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                      {formatInteger((row as ItemInclusionViewRow).runs_total_10w, locale)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-5 py-4 tnum text-[color:var(--color-accent-bright)]">
                      {formatPercent((row as CardWinrateViewRow).win_rate)}
                    </td>
                    <td className="px-5 py-4 tnum">
                      {formatInteger((row as CardWinrateViewRow).appearances, locale)}
                    </td>
                    <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                      {formatInteger((row as CardWinrateViewRow).wins, locale)}
                    </td>
                  </>
                )}
              </tr>
            )}
            />
          </div>
        )}
      </section>
    </StatsPageShell>
  );
}
