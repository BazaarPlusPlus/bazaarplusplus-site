import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import HeroDetailDashboard from '../src/components/HeroDetailDashboard';
import { formatShortDate } from '../src/lib/dashboard';
import { isHeroName } from '../src/lib/heroes';
import type {
  CardWinrateViewRow,
  HeroOverviewPayload,
  HeroWinrateDailyPayload,
  ItemUpliftViewRow,
  ManifestPayload,
  RatingTier,
} from '../src/lib/metrics';

function createOverviewPayload(
  generatedAt: string,
  hero: string,
  runsTotal: number,
  runsCompleted: number,
  runs10w: number,
  winRate: number,
  p75RunDays: number,
  victoryTierCounts: Record<string, number>
): HeroOverviewPayload {
  return {
    metric: 'hero_overview',
    generatedAt,
    rowCount: 1,
    rows: [
      {
        hero,
        runs_total: runsTotal,
        runs_completed: runsCompleted,
        runs_10w: runs10w,
        win_rate: winRate,
        win_rate_wilson_lower: winRate - 0.03,
        avg_run_days_for_10w: 12,
        p75_run_days_for_10w: p75RunDays,
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

describe('HeroDetailDashboard', () => {
  test('hydrates from hero slug and query params while switching card metric', () => {
    window.history.replaceState({}, '', '/heroes/Mak?w=3d&t=mid&m=uplift');

    const generatedAt = '2026-04-18T18:57:46Z';
    const manifest: ManifestPayload = {
      generatedAt,
      current_patch_id: null,
      windows: {
        '1d': {
          start: '2026-04-17T18:57:46Z',
          end: '2026-04-18T18:57:46Z',
          patch_transition: false,
        },
        '3d': {
          start: '2026-04-15T18:57:46Z',
          end: '2026-04-18T18:57:46Z',
          patch_transition: false,
        },
        '7d': {
          start: '2026-04-11T18:57:46Z',
          end: '2026-04-18T18:57:46Z',
          patch_transition: false,
        },
      },
      files: [
        { path: 'hero_overview/1d/all.json', metric: 'hero_overview', window: '1d', rating_tier: 'all', rowCount: 1 },
        { path: 'hero_overview/3d/mid.json', metric: 'hero_overview', window: '3d', rating_tier: 'mid', rowCount: 1 },
        { path: 'hero_overview/7d/mid.json', metric: 'hero_overview', window: '7d', rating_tier: 'mid', rowCount: 1 },
        { path: 'item_winrate/1d/all.json', metric: 'item_winrate', window: '1d', rating_tier: 'all', rowCount: 1 },
        { path: 'item_winrate/3d/mid.json', metric: 'item_winrate', window: '3d', rating_tier: 'mid', rowCount: 1 },
        { path: 'item_winrate/7d/mid.json', metric: 'item_winrate', window: '7d', rating_tier: 'mid', rowCount: 1 },
        { path: 'item_uplift/3d/mid.json', metric: 'item_uplift', window: '3d', rating_tier: 'mid', rowCount: 1 },
        { path: 'hero_winrate_daily/all.json', metric: 'hero_winrate_daily', rating_tier: 'all', rowCount: 7 },
        { path: 'hero_winrate_daily/mid.json', metric: 'hero_winrate_daily', rating_tier: 'mid', rowCount: 7 },
      ],
    };

    const winrateRows: CardWinrateViewRow[] = [
      {
        hero: 'Mak',
        template_id: 'card_1',
        display_name: 'Ignition Core',
        image_url: undefined,
        card_size: 'medium',
        appearances: 180,
        wins: 99,
        win_rate: 0.55,
        win_rate_wilson_lower: 0.48,
      },
    ];

    const upliftRows: ItemUpliftViewRow[] = [
      {
        hero: 'Mak',
        template_id: 'card_2',
        display_name: 'Voltaic Relay',
        image_url: undefined,
        card_size: 'medium',
        runs_with: 120,
        runs_without: 210,
        win_rate_with: 0.61,
        win_rate_without: 0.49,
        uplift: 0.12,
        uplift_ci_95_lower: 0.04,
        uplift_ci_95_upper: 0.18,
      },
    ];

    render(
      <HeroDetailDashboard
        hero="Mak"
        locale="en"
        manifest={manifest}
        source="local"
        initialSelectedWindow="1d"
        initialSelectedTier="all"
        initialSelectedMetric="winrate"
        dailyByTier={{
          all: createDailyPayload(generatedAt, []),
          mid: createDailyPayload(generatedAt, [
            {
              hero: 'Mak',
              day: '2026-04-09T16:00:00Z',
              completed_runs: 260,
              wins_10w: 130,
              win_rate: 0.5,
              win_rate_wilson_lower: 0.43,
            },
            {
              hero: 'Mak',
              day: '2026-04-10T16:00:00Z',
              completed_runs: 280,
              wins_10w: 140,
              win_rate: 0.5,
              win_rate_wilson_lower: 0.44,
            },
            {
              hero: 'Mak',
              day: '2026-04-11T16:00:00Z',
              completed_runs: 300,
              wins_10w: 160,
              win_rate: 0.5333333333,
              win_rate_wilson_lower: 0.47,
            },
            {
              hero: 'Mak',
              day: '2026-04-12T16:00:00Z',
              completed_runs: 320,
              wins_10w: 176,
              win_rate: 0.55,
              win_rate_wilson_lower: 0.49,
            },
          ]),
        }}
        overviewByWindow={{
          '1d': {
            all: createOverviewPayload(generatedAt, 'Mak', 600, 200, 110, 0.55, 14, {
              perfect: 20,
              gold: 50,
              silver: 60,
              bronze: 40,
              none: 30,
            }),
          },
          '3d': {
            mid: createOverviewPayload(generatedAt, 'Mak', 1500, 300, 165, 0.55, 13, {
              perfect: 36,
              gold: 90,
              silver: 80,
              bronze: 45,
              none: 49,
            }),
          },
          '7d': {
            mid: createOverviewPayload(generatedAt, 'Mak', 3400, 700, 360, 0.5142857143, 12, {
              perfect: 70,
              gold: 180,
              silver: 190,
              bronze: 100,
              none: 160,
            }),
          },
        }}
        winrateByWindow={{
          '1d': { all: { rowCount: 0, rows: [] } },
          '3d': { mid: { rowCount: 1, rows: winrateRows } },
          '7d': { mid: { rowCount: 1, rows: winrateRows } },
        }}
        upliftByWindow={{
          '3d': { mid: { rowCount: 1, rows: upliftRows } },
        }}
      />
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Mak' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Mid rank' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: 'Uplift' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('hero-detail-chart')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show trend' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('7D Mak winrate')).toBeInTheDocument();
    expect(screen.getByText(/recent 7d series/)).toBeInTheDocument();
    expect(screen.getByText('Voltaic Relay')).toBeInTheDocument();
    expect(screen.getByText('18.0%')).toBeInTheDocument();
    expect(screen.getByText('30.0%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show trend' }));
    expect(screen.getByRole('button', { name: 'Hide trend' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('hero-detail-chart')).toBeInTheDocument();
    expect(screen.getByText(formatShortDate('2026-04-09T16:00:00Z'))).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Win rate' })[0]!);
    expect(screen.getAllByRole('button', { name: 'Win rate' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Ignition Core')).toBeInTheDocument();
    expect(window.location.search).toBe('?w=3d&t=mid');
  });

  test('hero helper rejects invalid hero names', () => {
    expect(isHeroName('Mak')).toBe(true);
    expect(isHeroName('Unknown Hero')).toBe(false);
  });
});
