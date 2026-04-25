import { useEffect, useMemo, useState } from 'react';

import type {
  FinalBuildViewRow,
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
  formatShortDate,
} from '../lib/dashboard';
import { getAvailableTiers } from '../lib/metrics';
import {
  getWindowOptionsFromManifest,
  readWindowTierSelection,
  syncFilterStateToUrl,
} from '../lib/interactive-filters';
import { sortRows, toggleSort, type SortState } from '../lib/table-sorting';
import FinalBuildCardStrip from './FinalBuildCardStrip';
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

type FinalBuildDashboardProps = {
  locale: Locale;
  manifest: ManifestPayload;
  initialSelectedWindow: MetricWindow;
  initialSelectedTier: RatingTier;
  source: MetricsSource;
  rowsByWindow: Partial<Record<MetricWindow, Partial<Record<RatingTier, ViewPayload<FinalBuildViewRow>>>>>;
};

type BuildSortKey = 'hero' | 'runCount' | 'goldScore' | 'rank';

const FINAL_BUILD_COLUMN_WIDTHS = ['16%', '50%', '12%', '14%', '8%'];

function formatGoldScore(value: number): string {
  return value.toFixed(3);
}

export default function FinalBuildDashboard({
  locale,
  manifest,
  initialSelectedWindow,
  initialSelectedTier,
  source,
  rowsByWindow,
}: FinalBuildDashboardProps) {
  const windowOptions = useMemo(() => getWindowOptionsFromManifest(manifest), [manifest]);
  const initialSelection = useMemo(
    () =>
      readWindowTierSelection(
        windowOptions,
        getAvailableTiers(manifest, initialSelectedWindow, 'final_builds'),
        initialSelectedWindow,
        initialSelectedTier
      ),
    [initialSelectedTier, initialSelectedWindow, manifest, windowOptions]
  );
  const [selectedWindow, setSelectedWindow] = useState<MetricWindow>(initialSelection.window);
  const [selectedTier, setSelectedTier] = useState<RatingTier>(initialSelection.tier);
  const [sortState, setSortState] = useState<SortState<BuildSortKey>>({
    key: 'rank',
    direction: 'asc',
  });
  const tierOptions = useMemo(
    () => getAvailableTiers(manifest, selectedWindow, 'final_builds'),
    [manifest, selectedWindow]
  );

  useEffect(() => {
    if (!tierOptions.includes(selectedTier)) {
      setSelectedTier(tierOptions[0] ?? 'all');
    }
  }, [selectedTier, tierOptions]);

  useEffect(() => {
    syncFilterStateToUrl('/builds', {
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
        runCount: (row) => row.run_count,
        goldScore: (row) => row.gold_score,
        rank: (row) => row.rank,
      }),
    [rows, sortState]
  );
  const bestBuild = useMemo(
    () =>
      sortRows(rows, { key: 'rank', direction: 'asc' }, {
        hero: (row) => row.hero,
        runCount: (row) => row.run_count,
        goldScore: (row) => row.gold_score,
        rank: (row) => row.rank,
      })[0],
    [rows]
  );

  return (
    <StatsPageShell
      activeSection="builds"
      locale={locale}
      eyebrow="BazaarPlusPlus analytics"
      title="Final builds"
      description=""
      source={source}
      generatedAt={manifest.generatedAt}
      summary={
        <>
          <SummaryMetricCard
            label="Top build hero"
            value={bestBuild ? <HeroBadge hero={bestBuild.hero} size="lg" /> : 'N/A'}
          />
          <SummaryMetricCard
            label="Tracked builds"
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
          title="Final builds"
          metricLabel="final_builds"
          routeBase="/builds"
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
          ariaLabel="Final builds"
          columnCount={5}
          columnWidths={FINAL_BUILD_COLUMN_WIDTHS}
          rows={sortedRows}
          rowHeight={88}
          viewportHeight={880}
          getRowKey={(row) => `${row.hero}:${row.sig}`}
          columns={
            <tr>
              <SortableHeader
                label="Hero"
                className="px-5 py-4"
                activeDirection={sortState.key === 'hero' ? sortState.direction : undefined}
                onToggle={() => setSortState((current) => toggleSort(current, 'hero', 'asc'))}
              />
              <th className="px-5 py-4">Build</th>
              <SortableHeader
                label="Runs"
                className="px-5 py-4"
                activeDirection={sortState.key === 'runCount' ? sortState.direction : undefined}
                onToggle={() => setSortState((current) => toggleSort(current, 'runCount', 'desc'))}
              />
              <SortableHeader
                label="Gold score"
                className="px-5 py-4"
                activeDirection={sortState.key === 'goldScore' ? sortState.direction : undefined}
                onToggle={() => setSortState((current) => toggleSort(current, 'goldScore', 'desc'))}
              />
              <SortableHeader
                label="Rank"
                className="px-5 py-4"
                activeDirection={sortState.key === 'rank' ? sortState.direction : undefined}
                onToggle={() => setSortState((current) => toggleSort(current, 'rank', 'asc'))}
              />
            </tr>
          }
          renderRow={(row) => (
            <tr
              key={`${row.hero}:${row.sig}`}
              className="metric-row border-t border-[color:rgba(58,47,31,0.7)] text-sm text-[color:var(--color-text-base)]"
            >
              <td className="px-5 py-4">
                <HeroBadge hero={row.hero} />
              </td>
              <td className="px-5 py-4">
                <FinalBuildCardStrip cards={row.build_cards} title={row.card_names.join(', ')} />
              </td>
              <td className="px-5 py-4 tnum">{formatInteger(row.run_count)}</td>
              <td className="px-5 py-4 tnum text-[color:var(--color-accent-bright)]">
                {formatGoldScore(row.gold_score)}
              </td>
              <td className="px-5 py-4 tnum text-[color:var(--color-text-muted)]">
                {row.rank}
              </td>
            </tr>
          )}
        />
      </section>
    </StatsPageShell>
  );
}
