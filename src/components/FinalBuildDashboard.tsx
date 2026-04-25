import { useEffect, useMemo, useState } from 'react';

import type {
  FinalBuildViewRow,
  Locale,
  ManifestPayload,
  MetricsSource,
  MetricWindow,
  RatingTier,
} from '../lib/metrics';
import { formatInteger } from '../lib/dashboard';
import { getHeroColor } from '../lib/heroes';
import { getAvailableTiers } from '../lib/metrics';
import {
  ALL_HEROES,
  getActiveHeroFilter,
  getHeroFilterOptions,
  getWindowOptionsFromManifest,
  readHeroSelection,
  readWindowTierSelection,
  syncFilterStateToUrl,
} from '../lib/interactive-filters';
import { sortRows, toggleSort, type SortState } from '../lib/table-sorting';
import FinalBuildCardStrip from './FinalBuildCardStrip';
import HeroBadge from './HeroBadge';
import ScopeFilterPanel from './ScopeFilterPanel';
import SortableHeader from './SortableHeader';
import StatsPageShell from './StatsPageShell';
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

const FINAL_BUILD_COLUMN_WIDTHS = ['13%', '48%', '8%', '10%', '6%', '15%'];

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
  const [selectedHero, setSelectedHero] = useState(readHeroSelection);
  const tierOptions = useMemo(
    () => getAvailableTiers(manifest, selectedWindow, 'final_builds'),
    [manifest, selectedWindow]
  );

  useEffect(() => {
    if (!tierOptions.includes(selectedTier)) {
      setSelectedTier(tierOptions[0] ?? 'all');
    }
  }, [selectedTier, tierOptions]);

  const payload =
    rowsByWindow[selectedWindow]?.[selectedTier] ??
    rowsByWindow[selectedWindow]?.[tierOptions[0] ?? 'all'];
  const rows = payload?.rows ?? [];
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
    syncFilterStateToUrl('/builds', {
      w: selectedWindow,
      t: selectedTier,
      hero: activeHero,
      lang: locale,
    });
  }, [activeHero, locale, selectedTier, selectedWindow]);

  const sortedRows = useMemo(
    () =>
      sortRows(filteredRows, sortState, {
        hero: (row) => row.hero,
        runCount: (row) => row.run_count,
        goldScore: (row) => row.gold_score,
        rank: (row) => row.rank,
      }),
    [filteredRows, sortState]
  );

  return (
    <StatsPageShell
      activeSection="builds"
      locale={locale}
      eyebrow="Bazaar Almanac · Winning blueprints"
      title="Final builds"
      source={source}
      generatedAt={manifest.generatedAt}
      filters={
        <ScopeFilterPanel
          ariaLabel="Build scope filters"
          windowOptions={windowOptions}
          tierOptions={tierOptions}
          selectedWindow={selectedWindow}
          selectedTier={selectedTier}
          heroOptions={heroOptions}
          selectedHero={activeHero}
          onWindowSelect={setSelectedWindow}
          onTierSelect={setSelectedTier}
          onHeroSelect={setSelectedHero}
        />
      }
    >
      <section className="surface overflow-hidden">
        <VirtualizedMetricTable
          ariaLabel="Final builds"
          columnCount={6}
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
              <th className="px-5 py-4">Contributor</th>
            </tr>
          }
          renderRow={(row) => (
            <tr
              key={`${row.hero}:${row.sig}`}
              className="metric-row hero-rail border-t border-[color:var(--color-border-soft)] text-sm text-[color:var(--color-text-base)]"
              style={{ '--hero-color': getHeroColor(row.hero) } as React.CSSProperties}
            >
              <td className="px-5 py-4">
                <HeroBadge hero={row.hero} size="sm" />
              </td>
              <td className="px-5 py-4">
                <FinalBuildCardStrip cards={row.build_cards} title={row.card_names.join(', ')} />
              </td>
              <td className="px-5 py-4 tnum">{formatInteger(row.run_count)}</td>
              <td className="px-5 py-4 tnum font-semibold text-[color:var(--color-accent-bright)]">
                {formatGoldScore(row.gold_score)}
              </td>
              <td className="px-5 py-4 font-display-italic tnum text-[color:var(--color-text-muted)]">
                #{row.rank}
              </td>
              <td className="px-5 py-4">
                {row.representative_user_display_name ? (
                  <div
                    className="min-w-0 space-y-1"
                    title={row.representative_user_account_id ?? undefined}
                  >
                    <div className="truncate font-medium text-[color:var(--color-text-base)]">
                      {row.representative_user_display_name}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-[color:var(--color-text-muted)]">
                    No contributor
                  </span>
                )}
              </td>
            </tr>
          )}
        />
      </section>
    </StatsPageShell>
  );
}
