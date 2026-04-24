import { useEffect, useMemo, useState } from 'react';

import type {
  ArchetypeViewRow,
  Locale,
  ManifestPayload,
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
import { getCommonAvailableTiers } from '../lib/metrics';
import {
  getWindowOptionsFromManifest,
  readWindowTierSelection,
  syncFilterStateToUrl,
} from '../lib/interactive-filters';
import { sortRows, toggleSort, type SortState } from '../lib/table-sorting';
import CardThumbGroup from './CardThumbGroup';
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

type ArchetypeDashboardProps = {
  locale: Locale;
  manifest: ManifestPayload;
  initialSelectedWindow: MetricWindow;
  initialSelectedTier: RatingTier;
  source: MetricsSource;
  rowsByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<ArchetypeViewRow>>>>>;
};

type ArchetypeSortKey = 'hero' | 'winRate' | 'runs' | 'wins10w' | 'p75Days';

export default function ArchetypeDashboard({
  locale,
  manifest,
  initialSelectedWindow,
  initialSelectedTier,
  source,
  rowsByWindow,
}: ArchetypeDashboardProps) {
  const windowOptions = useMemo(() => getWindowOptionsFromManifest(manifest), [manifest]);
  const initialSelection = useMemo(
    () =>
      readWindowTierSelection(
        windowOptions,
        getCommonAvailableTiers(manifest, initialSelectedWindow, [
          'archetype_winrate',
          'archetypes',
        ]),
        initialSelectedWindow,
        initialSelectedTier
      ),
    [initialSelectedTier, initialSelectedWindow, manifest, windowOptions]
  );
  const [selectedWindow, setSelectedWindow] = useState<MetricWindow>(initialSelection.window);
  const [selectedTier, setSelectedTier] = useState<RatingTier>(initialSelection.tier);
  const [sortState, setSortState] = useState<SortState<ArchetypeSortKey>>({
    key: 'winRate',
    direction: 'desc',
  });
  const tierOptions = useMemo(
    () => getCommonAvailableTiers(manifest, selectedWindow, ['archetype_winrate', 'archetypes']),
    [manifest, selectedWindow]
  );

  useEffect(() => {
    if (!tierOptions.includes(selectedTier)) {
      setSelectedTier(tierOptions[0] ?? 'all');
    }
  }, [selectedTier, tierOptions]);

  useEffect(() => {
    syncFilterStateToUrl('/archetypes', {
      w: selectedWindow,
      t: selectedTier,
      lang: locale,
    });
  }, [locale, selectedTier, selectedWindow]);

  const payload =
    rowsByWindow[selectedWindow]?.[selectedTier] ??
    rowsByWindow[selectedWindow]?.[tierOptions[0] ?? 'all'];
  const rowCount = payload?.rowCount ?? 0;
  const rows = payload?.rows ?? [];
  const sortedRows = useMemo(
    () =>
      sortRows(rows, sortState, {
        hero: (row) => row.hero,
        winRate: (row) => row.win_rate,
        runs: (row) => row.runs,
        wins10w: (row) => row.wins_10w,
        p75Days: (row) => row.p75_run_days,
      }),
    [rows, sortState]
  );
  const topArchetype = useMemo(
    () =>
      sortRows(rows, { key: 'winRate', direction: 'desc' }, {
        hero: (row) => row.hero,
        winRate: (row) => row.win_rate,
        runs: (row) => row.runs,
        wins10w: (row) => row.wins_10w,
        p75Days: (row) => row.p75_run_days,
      })[0],
    [rows]
  );

  return (
    <StatsPageShell
      activeSection="archetypes"
      locale={locale}
      eyebrow="BazaarPlusPlus analytics"
      title="Archetype winrate"
      description=""
      source={source}
      generatedAt={manifest.generatedAt}
      summary={
        <>
          <SummaryMetricCard
            label="Top archetype hero"
            value={topArchetype ? <HeroBadge hero={topArchetype.hero} size="lg" /> : 'N/A'}
          />
          <SummaryMetricCard
            label="Tracked archetypes"
            value={formatInteger(rowCount)}
          />
          <SummaryMetricCard
            label="Coverage window"
            value={WINDOW_LABELS[selectedWindow]}
          />
        </>
      }
      filters={
        <MetricFilterBar
          locale={locale}
          title="Archetype winrate"
          metricLabel="archetype_winrate"
          routeBase="/archetypes"
          windowOptions={windowOptions}
          tierOptions={tierOptions}
          selectedWindow={selectedWindow}
          selectedTier={selectedTier}
          onWindowSelect={setSelectedWindow}
          onTierSelect={setSelectedTier}
        />
      }
    >
      <section className="overflow-hidden rounded-[24px] border border-[color:var(--color-border)] bg-[color:rgba(26,22,19,0.92)]">
        <VirtualizedMetricTable
          ariaLabel="Archetype winrate"
          columnCount={6}
          rows={sortedRows}
          rowHeight={156}
          viewportHeight={936}
          getRowKey={(row) => `${row.hero}:${row.archetype_id}`}
          columns={
            <tr>
              <SortableHeader
                label="Hero"
                className="px-5 py-4"
                activeDirection={sortState.key === 'hero' ? sortState.direction : undefined}
                onToggle={() => setSortState((current) => toggleSort(current, 'hero', 'asc'))}
              />
              <th className="px-5 py-4">Defining cards</th>
              <SortableHeader
                label="10W rate"
                className="px-5 py-4"
                activeDirection={sortState.key === 'winRate' ? sortState.direction : undefined}
                onToggle={() => setSortState((current) => toggleSort(current, 'winRate', 'desc'))}
              />
              <SortableHeader
                label="Runs"
                className="px-5 py-4"
                activeDirection={sortState.key === 'runs' ? sortState.direction : undefined}
                onToggle={() => setSortState((current) => toggleSort(current, 'runs', 'desc'))}
              />
              <SortableHeader
                label="10W"
                className="px-5 py-4"
                activeDirection={sortState.key === 'wins10w' ? sortState.direction : undefined}
                onToggle={() => setSortState((current) => toggleSort(current, 'wins10w', 'desc'))}
              />
              <SortableHeader
                label="P75 days"
                className="px-5 py-4"
                activeDirection={sortState.key === 'p75Days' ? sortState.direction : undefined}
                onToggle={() => setSortState((current) => toggleSort(current, 'p75Days', 'desc'))}
              />
            </tr>
          }
          renderRow={(row) => (
            <tr
              key={`${row.hero}:${row.archetype_id}`}
              className="metric-row border-t border-[color:rgba(58,47,31,0.7)] text-sm text-[color:var(--color-text-base)]"
            >
              <td className="px-5 py-4">
                <HeroBadge hero={row.hero} />
              </td>
              <td className="px-5 py-4 align-middle">
                <CardThumbGroup
                  cards={row.thumb_cards}
                  title={row.defining_card_names.join(', ')}
                />
              </td>
              <td className="px-5 py-4 tnum text-[color:var(--color-accent-bright)]">
                {formatPercent(row.win_rate)}
              </td>
              <td className="px-5 py-4 tnum">{formatInteger(row.runs)}</td>
              <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                {formatInteger(row.wins_10w)}
              </td>
              <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                {row.p75_run_days == null ? 'N/A' : row.p75_run_days}
              </td>
            </tr>
          )}
        />
      </section>
    </StatsPageShell>
  );
}
