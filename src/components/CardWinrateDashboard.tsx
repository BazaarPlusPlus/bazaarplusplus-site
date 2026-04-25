import { useEffect, useMemo, useState } from 'react';

import type {
  CardMetric,
  CardPhaseMetric,
  CardWinrateViewRow,
  EnchantUpliftViewRow,
  ItemInclusionViewRow,
  ItemUpliftViewRow,
  Locale,
  ManifestPayload,
  MetricsSource,
  MetricWindow,
  PhaseInclusionViewRow,
  PhaseValueViewRow,
  RatingTier,
} from '../lib/metrics';
import {
  getAvailableTiers,
  getAvailableWindowsForMetric,
  getCommonAvailableTiers,
  getCommonAvailableWindows,
} from '../lib/metrics';
import {
  TIER_LABELS,
  WINDOW_LABELS,
  formatInteger,
  formatPercent,
  formatShortDate,
} from '../lib/dashboard';
import {
  getWindowOptionsFromManifest,
  readCardSelection,
  syncFilterStateToUrl,
} from '../lib/interactive-filters';
import { sortRows, toggleSort, type SortPrimitive, type SortState } from '../lib/table-sorting';
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

type CardWorkspaceRow =
  | CardWinrateViewRow
  | ItemUpliftViewRow
  | ItemInclusionViewRow
  | PhaseValueViewRow
  | PhaseInclusionViewRow
  | EnchantUpliftViewRow;

type CardWinrateDashboardProps = {
  locale: Locale;
  manifest: ManifestPayload;
  initialSelectedMetric: CardMetric;
  initialSelectedPhaseMetric: CardPhaseMetric;
  initialSelectedWindow: MetricWindow;
  initialSelectedTier: RatingTier;
  source: MetricsSource;
  winrateByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<CardWinrateViewRow>>>>>;
  upliftByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<ItemUpliftViewRow>>>>>;
  inclusionByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<ItemInclusionViewRow>>>>>;
  phaseValueByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<PhaseValueViewRow>>>>>;
  phaseInclusionByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<PhaseInclusionViewRow>>>>>;
  enchantByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<EnchantUpliftViewRow>>>>>;
};

const CARD_METRIC_TABS: Array<{
  key: CardMetric;
  label: string;
  ariaLabel?: string;
}> = [
  { key: 'winrate', label: 'Win rate' },
  { key: 'uplift', label: 'Uplift' },
  { key: 'inclusion', label: 'Inclusion', ariaLabel: 'Card inclusion' },
  { key: 'phase', label: 'Phase' },
  { key: 'enchants', label: 'Enchants' },
];

const PHASE_TABS: Array<{ key: CardPhaseMetric; label: string }> = [
  { key: 'value', label: 'Value' },
  { key: 'inclusion', label: 'Inclusion' },
];

const CARD_WINRATE_COLUMN_WIDTHS = ['10%', '13%', '25%', '13%', '13%', '12%', '14%'];
const CARD_UPLIFT_COLUMN_WIDTHS = ['9%', '12%', '22%', '11%', '11%', '11%', '12%', '12%'];
const CARD_INCLUSION_COLUMN_WIDTHS = ['10%', '13%', '25%', '13%', '13%', '16%', '10%'];
const CARD_PHASE_VALUE_COLUMN_WIDTHS = ['9%', '12%', '21%', '10%', '12%', '12%', '10%', '14%'];
const CARD_PHASE_INCLUSION_COLUMN_WIDTHS = ['10%', '13%', '22%', '11%', '13%', '15%', '16%'];
const CARD_ENCHANT_COLUMN_WIDTHS = ['8%', '12%', '20%', '11%', '11%', '10%', '8%', '11%', '9%'];

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
  | 'runsTotal10w'
  | 'phase'
  | 'phaseBattles'
  | 'phaseAppearances'
  | 'enchant'
  | 'upliftVsBase';

function getDefaultCardSort(
  metric: CardMetric,
  phaseMetric: CardPhaseMetric
): SortState<CardSortKey> {
  if (metric === 'uplift') {
    return { key: 'uplift', direction: 'desc' };
  }

  if (metric === 'inclusion') {
    return { key: 'inclusionRate', direction: 'desc' };
  }

  if (metric === 'phase') {
    return phaseMetric === 'inclusion'
      ? { key: 'inclusionRate', direction: 'desc' }
      : { key: 'winRate', direction: 'desc' };
  }

  if (metric === 'enchants') {
    return { key: 'upliftVsBase', direction: 'desc' };
  }

  return { key: 'appearances', direction: 'desc' };
}

function getCardTableColumnWidths(
  metric: CardMetric,
  phaseMetric: CardPhaseMetric
): string[] {
  if (metric === 'uplift') {
    return CARD_UPLIFT_COLUMN_WIDTHS;
  }

  if (metric === 'inclusion') {
    return CARD_INCLUSION_COLUMN_WIDTHS;
  }

  if (metric === 'phase') {
    return phaseMetric === 'inclusion'
      ? CARD_PHASE_INCLUSION_COLUMN_WIDTHS
      : CARD_PHASE_VALUE_COLUMN_WIDTHS;
  }

  if (metric === 'enchants') {
    return CARD_ENCHANT_COLUMN_WIDTHS;
  }

  return CARD_WINRATE_COLUMN_WIDTHS;
}

function getMetricDataLabel(metric: CardMetric, phaseMetric: CardPhaseMetric): string {
  if (metric === 'uplift') {
    return 'item_uplift';
  }

  if (metric === 'inclusion') {
    return 'item_inclusion';
  }

  if (metric === 'phase') {
    return phaseMetric === 'inclusion' ? 'item_phase_inclusion' : 'item_phase_value';
  }

  if (metric === 'enchants') {
    return 'enchant_uplift';
  }

  return 'item_winrate';
}

function getMetricWindows(
  manifest: ManifestPayload,
  metric: CardMetric
): MetricWindow[] {
  if (metric === 'phase') {
    return getCommonAvailableWindows(manifest, ['item_phase_value', 'item_phase_inclusion']);
  }

  const metricName = getMetricDataLabel(metric, 'value');
  return getAvailableWindowsForMetric(manifest, metricName);
}

function getMetricTiers(
  manifest: ManifestPayload,
  window: MetricWindow,
  metric: CardMetric,
  phaseMetric: CardPhaseMetric
): RatingTier[] {
  if (metric === 'phase') {
    return getCommonAvailableTiers(manifest, window, ['item_phase_value', 'item_phase_inclusion']);
  }

  return getAvailableTiers(manifest, window, getMetricDataLabel(metric, phaseMetric));
}

function getMetricDescription(metric: CardMetric, phaseMetric: CardPhaseMetric): string {
  if (metric === 'uplift') {
    return 'Compare card-inclusive runs against same-hero runs without that card.';
  }

  if (metric === 'inclusion') {
    return 'See which cards actually show up inside ten-win runs for each hero.';
  }

  if (metric === 'phase') {
    return phaseMetric === 'inclusion'
      ? 'Track when a card appears across early, mid, and late battle phases.'
      : 'Compare card performance by the phase where the card shows up.';
  }

  if (metric === 'enchants') {
    return 'Inspect enchanted card variants and compare them against the unenchanted baseline.';
  }

  return 'Rank cards by observed win rate and usage across the selected slice.';
}

function getMetricTitle(metric: CardMetric, phaseMetric: CardPhaseMetric): string {
  if (metric === 'phase') {
    return phaseMetric === 'inclusion' ? 'Phase inclusion' : 'Phase value';
  }

  return CARD_METRIC_TABS.find((tab) => tab.key === metric)?.label ?? 'Win rate';
}

function getTopRowLabel(metric: CardMetric, phaseMetric: CardPhaseMetric): string {
  if (metric === 'uplift') {
    return 'Top uplift card';
  }

  if (metric === 'inclusion') {
    return 'Highest inclusion card';
  }

  if (metric === 'phase') {
    return phaseMetric === 'inclusion' ? 'Top phase inclusion' : 'Top phase value';
  }

  if (metric === 'enchants') {
    return 'Top enchant';
  }

  return 'Most seen card';
}

function getTopRowDetail(
  row: CardWorkspaceRow | undefined,
  metric: CardMetric,
  phaseMetric: CardPhaseMetric
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

  if (metric === 'phase') {
    if (phaseMetric === 'inclusion') {
      const phaseRow = row as PhaseInclusionViewRow;
      return `${phaseRow.hero} · ${phaseRow.phase} · ${formatPercent(phaseRow.inclusion_rate)}`;
    }

    const phaseRow = row as PhaseValueViewRow;
    return `${phaseRow.hero} · ${phaseRow.phase} · ${formatPercent(phaseRow.win_rate)}`;
  }

  if (metric === 'enchants') {
    const enchantRow = row as EnchantUpliftViewRow;
    return `${enchantRow.hero} · ${enchantRow.enchant}`;
  }

  const winrateRow = row as CardWinrateViewRow;
  return `${winrateRow.hero} · ${formatInteger(winrateRow.appearances)} appearances`;
}

function formatPhaseLabel(phase: string): string {
  return phase.slice(0, 1).toUpperCase() + phase.slice(1);
}

export default function CardWinrateDashboard({
  locale,
  manifest,
  initialSelectedMetric,
  initialSelectedPhaseMetric,
  initialSelectedWindow,
  initialSelectedTier,
  source,
  winrateByWindow,
  upliftByWindow,
  inclusionByWindow,
  phaseValueByWindow,
  phaseInclusionByWindow,
  enchantByWindow,
}: CardWinrateDashboardProps) {
  const manifestWindows = useMemo(() => getWindowOptionsFromManifest(manifest), [manifest]);
  const initialSelection = useMemo(
    () =>
      readCardSelection(
        manifestWindows,
        getMetricTiers(
          manifest,
          initialSelectedWindow,
          initialSelectedMetric,
          initialSelectedPhaseMetric
        ),
        initialSelectedWindow,
        initialSelectedTier,
        initialSelectedMetric,
        initialSelectedPhaseMetric
      ),
    [
      initialSelectedMetric,
      initialSelectedPhaseMetric,
      initialSelectedTier,
      initialSelectedWindow,
      manifest,
      manifestWindows,
    ]
  );

  const [selectedMetric, setSelectedMetric] = useState<CardMetric>(initialSelection.metric);
  const [selectedPhaseMetric, setSelectedPhaseMetric] = useState<CardPhaseMetric>(
    initialSelection.phaseMetric
  );
  const [selectedWindow, setSelectedWindow] = useState<MetricWindow>(initialSelection.window);
  const [selectedTier, setSelectedTier] = useState<RatingTier>(initialSelection.tier);
  const [sortState, setSortState] = useState<SortState<CardSortKey>>(
    getDefaultCardSort(initialSelection.metric, initialSelection.phaseMetric)
  );

  const availableWindows = useMemo(
    () => getMetricWindows(manifest, selectedMetric),
    [manifest, selectedMetric]
  );
  const tierOptions = useMemo(
    () => getMetricTiers(manifest, selectedWindow, selectedMetric, selectedPhaseMetric),
    [manifest, selectedMetric, selectedPhaseMetric, selectedWindow]
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
    setSortState(getDefaultCardSort(selectedMetric, selectedPhaseMetric));
  }, [selectedMetric, selectedPhaseMetric]);

  useEffect(() => {
    syncFilterStateToUrl('/cards', {
      w: selectedWindow,
      t: selectedTier,
      m: selectedMetric,
      pm: selectedMetric === 'phase' ? selectedPhaseMetric : undefined,
      lang: locale,
    });
  }, [locale, selectedMetric, selectedPhaseMetric, selectedTier, selectedWindow]);

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

    if (selectedMetric === 'phase') {
      if (selectedPhaseMetric === 'inclusion') {
        return (
          phaseInclusionByWindow[selectedWindow]?.[selectedTier] ??
          phaseInclusionByWindow[selectedWindow]?.[tierOptions[0] ?? 'all']
        );
      }

      return (
        phaseValueByWindow[selectedWindow]?.[selectedTier] ??
        phaseValueByWindow[selectedWindow]?.[tierOptions[0] ?? 'all']
      );
    }

    if (selectedMetric === 'enchants') {
      return (
        enchantByWindow[selectedWindow]?.[selectedTier] ??
        enchantByWindow[selectedWindow]?.[tierOptions[0] ?? 'all']
      );
    }

    return (
      winrateByWindow[selectedWindow]?.[selectedTier] ??
      winrateByWindow[selectedWindow]?.[tierOptions[0] ?? 'all']
    );
  }, [
    enchantByWindow,
    inclusionByWindow,
    phaseInclusionByWindow,
    phaseValueByWindow,
    selectedMetric,
    selectedPhaseMetric,
    selectedTier,
    selectedWindow,
    tierOptions,
    upliftByWindow,
    winrateByWindow,
  ]);

  const rows = (payload?.rows ?? []) as CardWorkspaceRow[];
  const rowCount = payload?.rowCount ?? rows.length;
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
      phase: (row) => ('phase' in row ? row.phase : null),
      phaseBattles: (row) =>
        'hero_battles_in_phase' in row ? row.hero_battles_in_phase : null,
      phaseAppearances: (row) => ('appearances' in row ? row.appearances : null),
      enchant: (row) => ('enchant' in row ? row.enchant : null),
      upliftVsBase: (row) =>
        'uplift_vs_unenchanted' in row ? row.uplift_vs_unenchanted : null,
    } satisfies Record<CardSortKey, (row: CardWorkspaceRow) => SortPrimitive>),
    []
  );
  const sortedRows = useMemo(() => sortRows(rows, sortState, sortAccessors), [rows, sortAccessors, sortState]);
  const topRow = useMemo(
    () => sortRows(rows, getDefaultCardSort(selectedMetric, selectedPhaseMetric), sortAccessors)[0],
    [rows, selectedMetric, selectedPhaseMetric, sortAccessors]
  );
  const title = 'Card analysis';
  const description = `Single workspace for card win rate, uplift, inclusion, phase, and enchant slices. ${getMetricDescription(
    selectedMetric,
    selectedPhaseMetric
  )}`;
  const metricTitle = getMetricTitle(selectedMetric, selectedPhaseMetric);
  const metricLabel = getMetricDataLabel(selectedMetric, selectedPhaseMetric);
  const columnCount =
    selectedMetric === 'uplift'
      ? 8
      : selectedMetric === 'inclusion'
        ? 7
        : selectedMetric === 'phase'
          ? selectedPhaseMetric === 'inclusion'
            ? 7
            : 8
          : selectedMetric === 'enchants'
            ? 9
            : 7;
  const columnWidths = getCardTableColumnWidths(selectedMetric, selectedPhaseMetric);

  return (
    <StatsPageShell
      activeSection="cards"
      locale={locale}
      eyebrow="BazaarPlusPlus analytics"
      title={title}
      description={description}
      source={source}
      generatedAt={manifest.generatedAt}
      summary={
        <>
          <SummaryMetricCard
            label={getTopRowLabel(selectedMetric, selectedPhaseMetric)}
            value={topRow ? topRow.display_name : 'N/A'}
            breakValue
          />
          <SummaryMetricCard
            label="Tracked rows"
            value={formatInteger(rowCount)}
          />
          <SummaryMetricCard
            label="Coverage window"
            value={WINDOW_LABELS[selectedWindow]}
          />
        </>
      }
      filters={
        <section className="grid gap-4 rounded-[24px] border border-[color:var(--color-border)] bg-[color:rgba(26,22,19,0.84)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
                Workspace
              </p>
              <h2 className="mt-2 text-xl text-[color:var(--color-text-base)]">Card analysis</h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {CARD_METRIC_TABS.map((option) => {
              const active = option.key === selectedMetric;
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-label={option.ariaLabel}
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

          {selectedMetric === 'phase' ? (
            <div className="flex flex-wrap gap-2">
              {PHASE_TABS.map((option) => {
                const active = option.key === selectedPhaseMetric;
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedPhaseMetric(option.key)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? 'border-[color:rgba(246,226,184,0.88)] bg-[color:rgba(212,162,76,0.18)] text-[color:var(--color-text-base)]'
                        : 'border-[color:rgba(58,47,31,0.74)] bg-[color:rgba(19,15,8,0.55)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-text-base)]'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          <MetricFilterBar
            compact
            locale={locale}
            title="Scope"
            metricLabel={metricLabel}
            routeBase="/cards"
            windowOptions={availableWindows}
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
      <section className="overflow-hidden rounded-[24px] border border-[color:var(--color-border)] bg-[color:rgba(26,22,19,0.92)]">
        <VirtualizedMetricTable
          ariaLabel={metricTitle}
          columnCount={columnCount}
          columnWidths={columnWidths}
          rows={sortedRows}
          rowHeight={88}
          viewportHeight={880}
          getRowKey={(row) => {
            if ('enchant' in row) {
              return `${row.hero}:${row.template_id}:${row.enchant}`;
            }

            if ('phase' in row) {
              return `${row.hero}:${row.template_id}:${row.phase}`;
            }

            return `${row.hero}:${row.template_id}`;
          }}
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
                  <th className="px-5 py-4">Share type</th>
                </>
              ) : selectedMetric === 'phase' ? (
                <>
                  <SortableHeader label="Phase" className="px-5 py-4" activeDirection={sortState.key === 'phase' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'phase', 'asc'))} />
                  {selectedPhaseMetric === 'inclusion' ? (
                    <>
                      <SortableHeader label="Inclusion" className="px-5 py-4" activeDirection={sortState.key === 'inclusionRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'inclusionRate', 'desc'))} />
                      <SortableHeader label="Battles with" className="px-5 py-4" activeDirection={sortState.key === 'runsWith' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'runsWith', 'desc'))} />
                      <SortableHeader label="Hero phase battles" className="px-5 py-4" activeDirection={sortState.key === 'phaseBattles' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'phaseBattles', 'desc'))} />
                    </>
                  ) : (
                    <>
                      <SortableHeader label="Win rate" className="px-5 py-4" activeDirection={sortState.key === 'winRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'winRate', 'desc'))} />
                      <SortableHeader label="Appearances" className="px-5 py-4" activeDirection={sortState.key === 'phaseAppearances' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'phaseAppearances', 'desc'))} />
                      <SortableHeader label="Wins" className="px-5 py-4" activeDirection={sortState.key === 'wins' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'wins', 'desc'))} />
                      <SortableHeader label="Wilson lower" className="px-5 py-4" activeDirection={sortState.key === 'wilsonLower' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'wilsonLower', 'desc'))} />
                    </>
                  )}
                </>
              ) : selectedMetric === 'enchants' ? (
                <>
                  <SortableHeader label="Enchant" className="px-5 py-4" activeDirection={sortState.key === 'enchant' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'enchant', 'asc'))} />
                  <SortableHeader label="Win rate" className="px-5 py-4" activeDirection={sortState.key === 'winRate' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'winRate', 'desc'))} />
                  <SortableHeader label="Appearances" className="px-5 py-4" activeDirection={sortState.key === 'appearances' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'appearances', 'desc'))} />
                  <SortableHeader label="Wins" className="px-5 py-4" activeDirection={sortState.key === 'wins' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'wins', 'desc'))} />
                  <SortableHeader label="Wilson lower" className="px-5 py-4" activeDirection={sortState.key === 'wilsonLower' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'wilsonLower', 'desc'))} />
                  <SortableHeader label="Uplift vs base" className="px-5 py-4" activeDirection={sortState.key === 'upliftVsBase' ? sortState.direction : undefined} onToggle={() => setSortState((current) => toggleSort(current, 'upliftVsBase', 'desc'))} />
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
              key={
                'enchant' in row
                  ? `${row.hero}:${row.template_id}:${row.enchant}`
                  : 'phase' in row
                    ? `${row.hero}:${row.template_id}:${row.phase}`
                    : `${row.hero}:${row.template_id}`
              }
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
                <HeroBadge hero={row.hero} />
              </td>
              <td className="px-5 py-4">{row.display_name}</td>
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
                  <td className="px-5 py-4 text-[color:var(--color-text-muted)]">10W runs</td>
                </>
              ) : selectedMetric === 'phase' ? (
                <>
                  <td className="px-5 py-4">{formatPhaseLabel((row as PhaseValueViewRow | PhaseInclusionViewRow).phase)}</td>
                  {selectedPhaseMetric === 'inclusion' ? (
                    <>
                      <td className="px-5 py-4 tnum text-[color:var(--color-accent-bright)]">
                        {formatPercent((row as PhaseInclusionViewRow).inclusion_rate)}
                      </td>
                      <td className="px-5 py-4 tnum">
                        {formatInteger((row as PhaseInclusionViewRow).battles_with_card)}
                      </td>
                      <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                        {formatInteger((row as PhaseInclusionViewRow).hero_battles_in_phase)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-4 tnum text-[color:var(--color-accent-bright)]">
                        {formatPercent((row as PhaseValueViewRow).win_rate)}
                      </td>
                      <td className="px-5 py-4 tnum">
                        {formatInteger((row as PhaseValueViewRow).appearances)}
                      </td>
                      <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                        {formatInteger((row as PhaseValueViewRow).wins)}
                      </td>
                      <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                        {formatPercent((row as PhaseValueViewRow).win_rate_wilson_lower)}
                      </td>
                    </>
                  )}
                </>
              ) : selectedMetric === 'enchants' ? (
                <>
                  <td className="px-5 py-4">{(row as EnchantUpliftViewRow).enchant}</td>
                  <td className="px-5 py-4 tnum text-[color:var(--color-accent-bright)]">
                    {formatPercent((row as EnchantUpliftViewRow).win_rate)}
                  </td>
                  <td className="px-5 py-4 tnum">
                    {formatInteger((row as EnchantUpliftViewRow).appearances)}
                  </td>
                  <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                    {formatInteger((row as EnchantUpliftViewRow).wins)}
                  </td>
                  <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                    {formatPercent((row as EnchantUpliftViewRow).win_rate_wilson_lower)}
                  </td>
                  <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                    {(row as EnchantUpliftViewRow).uplift_vs_unenchanted == null
                      ? 'N/A'
                      : formatPercent((row as EnchantUpliftViewRow).uplift_vs_unenchanted ?? 0)}
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
