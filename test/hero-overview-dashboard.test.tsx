import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import HeroOverviewDashboard from '../src/features/heroes/HeroOverviewDashboard';
import { BAZAARDB_ICON_PATH, BAZAARDB_INTEGRATION_DOC_URL, BAZAARDB_META_URL } from '../src/content/site-copy';
import { formatShortDate } from '../src/shared/lib/dashboard';
import type {
  HeroOverviewPayload,
  HeroWinrateDailyPayload,
  RatingTier,
} from '../src/shared/lib/metrics';

function createOverviewPayload(
  generatedAt: string,
  hero: string,
  runsCompleted: number,
  victoryTierCounts: Record<string, number>,
  winRate = 0.4
): HeroOverviewPayload {
  return {
    metric: 'hero_overview',
    generatedAt,
    rowCount: 1,
    rows: [
      {
        hero,
        runs_total: 1000,
        runs_completed: runsCompleted,
        runs_10w: 400,
        win_rate: winRate,
        win_rate_wilson_lower: winRate - 0.04,
        avg_run_days_for_10w: 12,
        p75_run_days_for_10w: 14,
        victory_tier_counts: victoryTierCounts,
        top_archetypes: [],
        top_final_builds: [],
      },
    ],
  };
}

function createDailyPayload(
  generatedAt: string,
  rows: HeroWinrateDailyPayload['rows']
): HeroWinrateDailyPayload {
  return {
    metric: 'hero_winrate_daily',
    generatedAt,
    rowCount: rows.length,
    rows,
  };
}

describe('HeroOverviewDashboard', () => {
  test('hydrates from URL params and switches window or tier while showing victory tier rates', () => {
    window.history.replaceState({}, '', '/?w=3d&t=high');

    const generatedAt = '2026-04-18T18:57:46Z';
    const dailyByTier: Record<RatingTier, HeroWinrateDailyPayload> = {
      all: createDailyPayload(generatedAt, [
        {
          hero: 'Stelle',
          day: '2026-04-10T16:00:00Z',
          completed_runs: 400,
          wins_10w: 150,
          win_rate: 0.375,
          win_rate_wilson_lower: 0.33,
        },
        {
          hero: 'Stelle',
          day: '2026-04-11T16:00:00Z',
          completed_runs: 430,
          wins_10w: 170,
          win_rate: 0.3953488372,
          win_rate_wilson_lower: 0.35,
        },
        {
          hero: 'Stelle',
          day: '2026-04-12T16:00:00Z',
          completed_runs: 450,
          wins_10w: 189,
          win_rate: 0.42,
          win_rate_wilson_lower: 0.38,
        },
        {
          hero: 'Jules',
          day: '2026-04-10T16:00:00Z',
          completed_runs: 500,
          wins_10w: 200,
          win_rate: 0.4,
          win_rate_wilson_lower: 0.36,
        },
        {
          hero: 'Jules',
          day: '2026-04-11T16:00:00Z',
          completed_runs: 520,
          wins_10w: 218,
          win_rate: 0.4192307692,
          win_rate_wilson_lower: 0.38,
        },
        {
          hero: 'Jules',
          day: '2026-04-12T16:00:00Z',
          completed_runs: 540,
          wins_10w: 230,
          win_rate: 0.4259259259,
          win_rate_wilson_lower: 0.39,
        },
        {
          hero: 'Vanessa',
          day: '2026-04-10T16:00:00Z',
          completed_runs: 410,
          wins_10w: 172,
          win_rate: 0.419,
          win_rate_wilson_lower: 0.38,
        },
        {
          hero: 'Vanessa',
          day: '2026-04-12T16:00:00Z',
          completed_runs: 420,
          wins_10w: 174,
          win_rate: 0.414,
          win_rate_wilson_lower: 0.37,
        },
      ]),
      mid: createDailyPayload(generatedAt, [
        {
          hero: 'Mak',
          day: '2026-04-10T16:00:00Z',
          completed_runs: 300,
          wins_10w: 150,
          win_rate: 0.5,
          win_rate_wilson_lower: 0.44,
        },
        {
          hero: 'Mak',
          day: '2026-04-11T16:00:00Z',
          completed_runs: 320,
          wins_10w: 170,
          win_rate: 0.53125,
          win_rate_wilson_lower: 0.47,
        },
        {
          hero: 'Mak',
          day: '2026-04-12T16:00:00Z',
          completed_runs: 340,
          wins_10w: 185,
          win_rate: 0.5441176471,
          win_rate_wilson_lower: 0.49,
        },
      ]),
      high: createDailyPayload(generatedAt, [
        {
          hero: 'Dooley',
          day: '2026-04-09T16:00:00Z',
          completed_runs: 20,
          wins_10w: 10,
          win_rate: 0.5,
          win_rate_wilson_lower: 0.3,
        },
        {
          hero: 'Dooley',
          day: '2026-04-10T16:00:00Z',
          completed_runs: 30,
          wins_10w: 15,
          win_rate: 0.5,
          win_rate_wilson_lower: 0.33,
        },
        {
          hero: 'Dooley',
          day: '2026-04-11T16:00:00Z',
          completed_runs: 40,
          wins_10w: 23,
          win_rate: 0.575,
          win_rate_wilson_lower: 0.42,
        },
        {
          hero: 'Dooley',
          day: '2026-04-12T16:00:00Z',
          completed_runs: 50,
          wins_10w: 30,
          win_rate: 0.6,
          win_rate_wilson_lower: 0.46,
        },
      ]),
      low: createDailyPayload(generatedAt, []),
    };

    const overviewByWindow = {
      '1d': {
        all: createOverviewPayload(generatedAt, 'Stelle', 100, {
          perfect: 10,
          gold: 40,
          silver: 20,
          bronze: 15,
          none: 15,
        }, 0.31),
        mid: createOverviewPayload(generatedAt, 'Mak', 50, {
          perfect: 8,
          gold: 16,
          silver: 12,
          bronze: 6,
          none: 8,
        }, 0.43),
        high: createOverviewPayload(generatedAt, 'Dooley', 10, {
          perfect: 2,
          gold: 4,
          silver: 1,
          bronze: 1,
          none: 2,
        }, 0.55),
      },
      '3d': {
        all: createOverviewPayload(generatedAt, 'Stelle', 200, {
          perfect: 20,
          gold: 70,
          silver: 45,
          bronze: 35,
          none: 30,
        }, 0.36),
        mid: createOverviewPayload(generatedAt, 'Mak', 100, {
          perfect: 12,
          gold: 35,
          silver: 28,
          bronze: 15,
          none: 10,
        }, 0.47),
        high: createOverviewPayload(generatedAt, 'Dooley', 50, {
          perfect: 5,
          gold: 10,
          silver: 18,
          bronze: 20,
          none: 15,
        }, 0.64),
      },
      '7d': {
        all: createOverviewPayload(generatedAt, 'Stelle', 400, {
          perfect: 48,
          gold: 130,
          silver: 90,
          bronze: 60,
          none: 72,
        }, 0.58),
        mid: createOverviewPayload(generatedAt, 'Mak', 200, {
          perfect: 40,
          gold: 60,
          silver: 55,
          bronze: 20,
          none: 25,
        }, 0.72),
        high: createOverviewPayload(generatedAt, 'Dooley', 100, {
          perfect: 18,
          gold: 22,
          silver: 24,
          bronze: 12,
          none: 24,
        }, 0.61),
      },
    } satisfies Record<'1d' | '3d' | '7d', Partial<Record<RatingTier, HeroOverviewPayload>>>;

    const { container } = render(
      <HeroOverviewDashboard
        locale="en"
        availableWindows={['1d', '3d', '7d']}
        availableTiers={['all', 'low', 'mid', 'high']}
        initialSelectedWindow="1d"
        initialSelectedTier="all"
        dailyByTier={dailyByTier}
        overviewByWindow={overviewByWindow}
      />
    );

    expect(screen.getByTestId('daily-winrate-chart')).toBeInTheDocument();
    const detailDataLink = screen.getByRole('link', { name: 'View detailed stats on BazaarDB' });
    expect(detailDataLink).toHaveAttribute('href', BAZAARDB_META_URL);
    expect(detailDataLink).toHaveAttribute('target', '_blank');
    expect(detailDataLink).toHaveAttribute('rel', 'noreferrer');
    expect(detailDataLink.querySelector('img')).toHaveAttribute('src', BAZAARDB_ICON_PATH);
    const detailHelpLink = screen.getByRole('link', { name: 'Learn how data syncs to BazaarDB' });
    expect(detailHelpLink).toHaveAttribute('href', BAZAARDB_INTEGRATION_DOC_URL);
    expect(detailHelpLink).toHaveAttribute('target', '_blank');
    expect(detailHelpLink).toHaveAttribute('rel', 'noreferrer');
    expect(within(detailHelpLink).getByRole('tooltip')).toHaveTextContent('Learn how data syncs to BazaarDB');
    expect(screen.getByText(formatShortDate('2026-04-10T16:00:00Z'))).toBeInTheDocument();
    expect(screen.queryByText('Hero filters')).not.toBeInTheDocument();
    expect(screen.queryByText('Focused hero')).not.toBeInTheDocument();
    expect(screen.queryByText('Sampled heroes')).not.toBeInTheDocument();
    expect(screen.queryByText('Latest day')).not.toBeInTheDocument();

    const trendSection = screen.getByText('7D winrate trend').closest('section');
    const trendChartSection = screen.getByTestId('daily-winrate-chart').closest('section');
    const snapshotSection = screen.getByText(/^Snapshot · /).closest('section');
    expect(trendSection).not.toBeNull();
    expect(trendChartSection).not.toBeNull();
    expect(snapshotSection).not.toBeNull();
    expect(within(trendSection!).queryByTestId('trend-movement-rail')).not.toBeInTheDocument();
    expect(within(trendSection!).queryByText('Risers')).not.toBeInTheDocument();
    expect(within(trendSection!).queryByText('Fallers')).not.toBeInTheDocument();
    expect(within(trendSection!).queryByText('Hero movement')).not.toBeInTheDocument();
    expect(within(trendSection!).queryByText('Current snapshot')).not.toBeInTheDocument();
    expect(within(trendSection!).queryByRole('button', { name: '1D' })).not.toBeInTheDocument();
    expect(within(trendSection!).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(trendSection!).getByRole('button', { name: 'Mid' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(trendSection!).getByRole('button', { name: 'High' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(trendSection!).queryByRole('button', { name: 'Low' })).not.toBeInTheDocument();
    expect(within(snapshotSection!).getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(snapshotSection!).getByRole('button', { name: 'High' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(snapshotSection!).queryByRole('button', { name: 'High rank' })).not.toBeInTheDocument();
    expect(within(snapshotSection!).queryByRole('button', { name: 'Low' })).not.toBeInTheDocument();
    const snapshotTable = within(snapshotSection!).getByRole('table');
    expect(snapshotTable.className).toContain('table-fixed');
    expect(snapshotTable.querySelectorAll('col')).toHaveLength(9);
    expect(within(snapshotSection!).getByRole('button', { name: 'Win rate' }).className).toContain('whitespace-nowrap');
    expect(within(snapshotSection!).getByRole('button', { name: '10W wins' })).toBeInTheDocument();
    expect(within(snapshotSection!).queryByRole('button', { name: '10 wins' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Day' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'P75 days' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Silver' })).toBeInTheDocument();
    expect(container.querySelector('[data-hero="Stelle"] polyline')).toHaveAttribute('stroke', '#ffeb18');
    expect(container.querySelector('[data-hero="Dooley"] polyline')).toBeNull();
    const stelleTrendButton = within(trendChartSection!).getByRole('button', { name: 'Stelle 42.0%' });
    expect(stelleTrendButton).not.toHaveAttribute('href');
    expect(stelleTrendButton).toHaveTextContent('42.0%');
    fireEvent.mouseLeave(stelleTrendButton);
    const stelleTrendPoints = container.querySelectorAll('[data-hero="Stelle"] circle');
    expect(stelleTrendPoints).toHaveLength(3);
    fireEvent.mouseEnter(stelleTrendPoints[2]!);
    expect(within(trendChartSection!).getAllByText('42.0%').length).toBeGreaterThan(0);
    fireEvent.mouseLeave(stelleTrendPoints[2]!);
    expect(screen.getByRole('cell', { name: 'Dooley' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '64.0%' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '10.0%' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '20.0%' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '36.0%' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '40.0%' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dooley' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dooley' })).not.toHaveAttribute('href');
    expect(container.querySelector('[data-hero="Dooley"] polyline')).toBeNull();

    fireEvent.click(within(snapshotSection!).getByRole('button', { name: 'Mid' }));
    expect(within(snapshotSection!).getByRole('button', { name: 'Mid' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('cell', { name: 'Mak' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '47.0%' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '12.0%' })).toBeInTheDocument();
    expect(window.location.search).toContain('t=mid');
    expect(screen.queryByRole('link', { name: 'Mak' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mak' })).not.toHaveAttribute('href');
    expect(container.querySelector('[data-hero="Mak"] polyline')).toBeNull();
    expect(container.querySelector('[data-hero="Stelle"] polyline')).toHaveAttribute('stroke', '#ffeb18');

    fireEvent.click(within(trendSection!).getByRole('button', { name: 'Mid' }));
    expect(within(trendSection!).getByRole('button', { name: 'Mid' })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('[data-hero="Mak"] polyline')).toHaveAttribute('stroke', '#bee65b');
    expect(container.querySelector('[data-hero="Stelle"] polyline')).toBeNull();

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Mak' }));
    expect(screen.getAllByText('Mak')[0]).toBeInTheDocument();
    expect(container.querySelector('[data-hero="Mak"] polyline')).toHaveAttribute('stroke', '#bee65b');
    expect(container.querySelector('[data-hero="Stelle"] polyline')).toBeNull();

    fireEvent.click(within(snapshotSection!).getByRole('button', { name: '7D' }));
    expect(within(snapshotSection!).getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('cell', { name: '72.0%' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '20.0%' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '30.0%' })).toBeInTheDocument();
    expect(window.location.search).toContain('w=7d');

    fireEvent.click(within(snapshotSection!).getByRole('button', { name: 'All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hero' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hero' }));
    const dataRows = screen
      .getAllByRole('row')
      .filter((row) => row.textContent?.includes('Jules') || row.textContent?.includes('Stelle'));
    expect(dataRows[0]?.textContent).toContain('Stelle');
  });

});
