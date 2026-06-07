import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import HeroOverviewDashboard from '../src/features/heroes/HeroOverviewDashboard';
import { BAZAARDB_ICON_PATH, BAZAARDB_INTEGRATION_DOC_URL, BAZAARDB_META_URL } from '../src/content/site-copy';
import type { HeroOverviewCoverage } from '../src/app/page-data';
import type {
  AnalyzerV4Manifest,
  MetricWindow,
  RatingTier,
  WebHeroDailyPayload,
  WebHeroDailyRow,
} from '../src/shared/lib/metrics';

const DAYS = ['2026-06-04', '2026-06-05', '2026-06-06'];

function makeRow(overrides: Partial<WebHeroDailyRow> & { hero: string }): WebHeroDailyRow {
  return {
    rating_tier: 'all',
    runs_total: 0,
    runs_completed: 0,
    final_wins_counts: {},
    run_days_10w_counts: {},
    battle_decided_count: 0,
    battle_wins: 0,
    battle_losses: 0,
    final_battle_decided_count: 0,
    final_battle_wins: 0,
    final_battle_losses: 0,
    game_day_battle_counts: {},
    victory_bucket_battle_counts: {},
    matchups: [],
    ...overrides,
  };
}

function makeDayRows(dayIndex: number): WebHeroDailyRow[] {
  return [
    makeRow({
      hero: 'Stelle',
      runs_total: 120,
      runs_completed: 100,
      final_wins_counts: { '10': 40 + dayIndex },
      run_days_10w_counts: { '11': 40 + dayIndex },
    }),
    makeRow({
      hero: 'Jules',
      runs_total: 120,
      runs_completed: 100,
      final_wins_counts: { '0': 10, '5': 20, '8': 20, '10': 50 },
      run_days_10w_counts: { '10': 30, '12': 15 },
      battle_decided_count: 200,
      battle_wins: 120,
      battle_losses: 80,
      final_battle_decided_count: 40,
      final_battle_wins: 12,
      final_battle_losses: 28,
      game_day_battle_counts: {
        day_1_3: { count: 100, wins: 60, losses: 40 },
        day_4_7: { count: 80, wins: 40, losses: 40 },
      },
      victory_bucket_battle_counts: {
        wins_0_3: { count: 60, wins: 36, losses: 24 },
        wins_4_6: { count: 50, wins: 30, losses: 20 },
        wins_7_9: { count: 40, wins: 28, losses: 12 },
      },
      matchups: [
        { opponent_hero: 'Stelle', battle_decided_count: 100, wins: 70, losses: 30 },
        { opponent_hero: 'Vanessa', battle_decided_count: 30, wins: 10, losses: 20 },
        { opponent_hero: 'Dooley', battle_decided_count: 5, wins: 4, losses: 1 },
        { opponent_hero: 'Jules', battle_decided_count: 50, wins: 25, losses: 25 },
      ],
    }),
    // Vanessa has no completed runs on the middle day → null trend point.
    makeRow({
      hero: 'Vanessa',
      runs_total: 90,
      runs_completed: dayIndex === 1 ? 0 : 80,
      final_wins_counts: dayIndex === 1 ? {} : { '10': 20 },
    }),
    // Karnok never has a denominator → null rates must sink in the ranking.
    makeRow({ hero: 'Karnok', runs_total: 5 }),
    // Non-canonical hero with the highest Wilson lower bound.
    makeRow({
      hero: 'Common',
      runs_total: 10,
      runs_completed: 10,
      final_wins_counts: { '9': 1, '10': 9 },
    }),
    makeRow({
      hero: 'Mak',
      rating_tier: 'mid',
      runs_total: 60,
      runs_completed: 50,
      final_wins_counts: { '10': 20 },
    }),
    makeRow({
      hero: 'Dooley',
      rating_tier: 'high',
      runs_total: 40,
      runs_completed: 30,
      final_wins_counts: { '10': 12 },
    }),
  ];
}

function makePayload(day: string, dayIndex: number): WebHeroDailyPayload {
  return {
    schema_version: '1',
    kind: 'web_hero_daily',
    day,
    generatedAt: '2026-06-07T09:04:17Z',
    rows: makeDayRows(dayIndex),
  };
}

function makeManifest(bundleFailRate: number): AnalyzerV4Manifest {
  return {
    schema_version: '1',
    namespace: 'analyzer-v4',
    generatedAt: '2026-06-07T09:04:17Z',
    latest_complete_day: DAYS.at(-1)!,
    web: {
      schema_version: '1',
      days: DAYS.map((day) => ({ day, path: `analyzer-v4/web/${day}.json`, rowCount: 7 })),
    },
    dq: {
      days: DAYS.length,
      bundle_download_fail_rate: bundleFailRate,
      decode_fail_rate: 0,
    },
  };
}

function renderDashboard(options?: {
  bundleFailRate?: number;
  excludeDays?: string[];
  url?: string;
}) {
  const bundleFailRate = options?.bundleFailRate ?? 0.01;
  const excludeDays = options?.excludeDays ?? [];
  window.history.replaceState({}, '', options?.url ?? '/?w=3d');

  const loadedDays = DAYS.filter((day) => !excludeDays.includes(day));
  const days = loadedDays.map((day) => makePayload(day, DAYS.indexOf(day)));
  const coverage: HeroOverviewCoverage = {
    requested: DAYS,
    loaded: loadedDays,
    failedDays: excludeDays,
  };

  return render(
    <HeroOverviewDashboard
      locale="en"
      manifest={makeManifest(bundleFailRate)}
      days={days}
      latestCompleteDay={DAYS.at(-1)!}
      availableWindows={['1d', '3d', '7d'] as MetricWindow[]}
      availableTiers={['all', 'mid', 'high'] as RatingTier[]}
      coverage={coverage}
      initialSelectedWindow="1d"
      initialSelectedTier="all"
    />
  );
}

describe('HeroOverviewDashboard', () => {
  test('hydrates scope from the URL and keeps BazaarDB links', () => {
    renderDashboard({ url: '/?w=3d&t=high' });

    const detailDataLink = screen.getByRole('link', { name: 'View detailed stats on BazaarDB' });
    expect(detailDataLink).toHaveAttribute('href', BAZAARDB_META_URL);
    expect(detailDataLink).toHaveAttribute('target', '_blank');
    expect(detailDataLink).toHaveAttribute('rel', 'noreferrer');
    expect(detailDataLink.querySelector('img')).toHaveAttribute('src', BAZAARDB_ICON_PATH);
    const detailHelpLink = screen.getByRole('link', { name: 'Learn how data syncs to BazaarDB' });
    expect(detailHelpLink).toHaveAttribute('href', BAZAARDB_INTEGRATION_DOC_URL);

    expect(screen.getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'High' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    // Only tiers present in loaded rows produce a pill.
    expect(screen.queryByRole('button', { name: 'Low' })).not.toBeInTheDocument();

    // High tier holds only Dooley.
    const table = screen.getByRole('table');
    expect(within(table).getByText('Dooley')).toBeInTheDocument();
    expect(within(table).queryByText('Jules')).not.toBeInTheDocument();
  });

  test('one global tier control drives ranking, trend, and dossier together', () => {
    const { container } = renderDashboard();

    // Single global control: exactly one Mid pill on the whole page.
    expect(screen.getAllByRole('button', { name: 'Mid' })).toHaveLength(1);
    const trendSection = screen.getByTestId('daily-winrate-chart').closest('section')!;
    expect(within(trendSection).queryByRole('button', { name: 'Mid' })).not.toBeInTheDocument();
    expect(within(trendSection).queryByRole('button', { name: 'All' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mid' }));
    expect(screen.getByRole('button', { name: 'Mid' })).toHaveAttribute('aria-pressed', 'true');
    expect(window.location.search).toContain('t=mid');

    // Ranking switches to mid-tier rows.
    const table = screen.getByRole('table');
    expect(within(table).getByText('Mak')).toBeInTheDocument();
    expect(within(table).queryByText('Jules')).not.toBeInTheDocument();

    // Trend honors the same tier.
    expect(container.querySelector('[data-hero="Mak"] polyline')).toHaveAttribute(
      'stroke',
      '#bee65b'
    );
    expect(container.querySelector('[data-hero="Stelle"]')).toBeNull();

    // Dossier follows the focused hero of the new tier.
    expect(
      screen.getByTestId('hero-dossier').querySelector('[data-hero-badge="Mak"]')
    ).not.toBeNull();
  });

  test('ranks by Wilson lower bound with nulls sinking and no NaN output', () => {
    const { container } = renderDashboard();

    const table = screen.getByRole('table');
    expect(table.querySelectorAll('col')).toHaveLength(14);
    expect(table.className).toContain('table-fixed');

    const heroOrder = Array.from(table.querySelectorAll('tbody [data-hero-badge]')).map((badge) =>
      badge.getAttribute('data-hero-badge')
    );
    // Non-canonical Common has the best Wilson lower; zero-denominator Karnok sinks last.
    expect(heroOrder).toEqual(['Common', 'Jules', 'Stelle', 'Vanessa', 'Karnok']);

    // Aggregates across the 3-day window.
    expect(within(table).getByRole('cell', { name: /50\.0%/ })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: /41\.0%/ })).toBeInTheDocument();

    // Zero-denominator rates render as em dash, never NaN.
    expect(container.textContent).not.toContain('NaN');
    const karnokRow = within(table).getByText('Karnok').closest('tr')!;
    expect(karnokRow.textContent).toContain('—');

    // Non-canonical marker shows in the table.
    expect(within(table).getByText('Non-standard')).toBeInTheDocument();

    // Sortable headers stay interactive.
    expect(within(table).getByRole('button', { name: '10W rate' })).toBeInTheDocument();
    fireEvent.click(within(table).getByRole('button', { name: 'Hero' }));
    const ascOrder = Array.from(table.querySelectorAll('tbody [data-hero-badge]')).map((badge) =>
      badge.getAttribute('data-hero-badge')
    );
    expect(ascOrder).toEqual(['Common', 'Jules', 'Karnok', 'Stelle', 'Vanessa']);
  });

  test('window pills re-slice the aggregate and write w= to the URL', () => {
    renderDashboard();

    const table = screen.getByRole('table');
    expect(within(table).getByRole('cell', { name: /41\.0%/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '1D' }));
    expect(window.location.search).not.toContain('w=');
    expect(within(screen.getByRole('table')).getByRole('cell', { name: /42\.0%/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '7D' }));
    expect(window.location.search).toContain('w=7d');
    // Only 3 of 7 nominal days exist → partial coverage note, but 7d stays valid.
    expect(screen.getByTestId('coverage-strip').textContent).toContain('partial coverage');
    expect(screen.getByTestId('coverage-strip').textContent).toContain('3 of 7');
    expect(screen.getByRole('button', { name: '7D' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('trend omits null points, splits lines across gaps, and excludes non-canonical heroes', () => {
    const { container } = renderDashboard();

    // Stelle: 3 consecutive chartable days → one polyline with 3 coordinate pairs.
    const stelleLine = container.querySelector('[data-hero="Stelle"] polyline');
    expect(stelleLine).toHaveAttribute('stroke', '#ffeb18');
    expect(stelleLine!.getAttribute('points')!.trim().split(' ')).toHaveLength(3);

    // Vanessa: chartable on day 1 and 3 only → two dots, no polyline spanning the gap.
    const vanessaCircles = container.querySelectorAll('[data-hero="Vanessa"] circle');
    expect(vanessaCircles).toHaveLength(2);
    for (const polyline of container.querySelectorAll('[data-hero="Vanessa"] polyline')) {
      expect(polyline.getAttribute('points')!.trim().split(' ')).toHaveLength(1);
    }

    // Non-canonical and zero-denominator heroes never reach the chart or legend.
    expect(container.querySelector('[data-hero="Common"]')).toBeNull();
    expect(container.querySelector('[data-hero="Karnok"]')).toBeNull();
    const trendSection = screen.getByTestId('daily-winrate-chart').closest('section')!;
    expect(
      within(trendSection).queryByRole('button', { name: /Common/ })
    ).not.toBeInTheDocument();

    // The focused hero with omitted points surfaces the no-value note when focused.
    const table = screen.getByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: 'Vanessa' }));
    expect(
      screen.getByText('Some days have no calculable trend point.')
    ).toBeInTheDocument();

    // Tooltip testid renders on hover.
    fireEvent.mouseEnter(vanessaCircles[0]!);
    expect(screen.getByTestId('trend-point-tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(vanessaCircles[0]!);
  });

  test('dossier shows battle, stage, bucket panels with present keys only', () => {
    renderDashboard();

    // Default focus skips the non-canonical table leader and lands on Jules.
    const dossier = screen.getByTestId('hero-dossier');
    expect(dossier.querySelector('[data-hero-badge="Jules"]')).not.toBeNull();

    const battle = screen.getByTestId('battle-panel');
    expect(battle.textContent).toContain('60.0%'); // overall 360/600
    expect(battle.textContent).toContain('30.0%'); // final 36/120
    expect(battle.textContent).toContain('−30.0%'); // gap

    const stage = screen.getByTestId('stage-panel');
    expect(within(stage).getByText('Day 1-3')).toBeInTheDocument();
    expect(within(stage).getByText('Day 4-7')).toBeInTheDocument();
    // day_8_plus bucket absent from the data → no fixed-key rendering.
    expect(within(stage).queryByText('Day 8+')).not.toBeInTheDocument();

    // Stage panel can switch to the all-heroes mini table.
    fireEvent.click(within(stage).getByRole('button', { name: 'All heroes' }));
    expect(stage.querySelectorAll('[data-hero-badge]').length).toBeGreaterThan(1);

    const buckets = screen.getByTestId('victory-bucket-panel');
    expect(within(buckets).getAllByText(/70\.0%/).length).toBeGreaterThan(0); // wins_7_9: 84/120
    expect(within(buckets).queryByText('10+ wins')).not.toBeInTheDocument();
  });

  test('matchups split favorable/unfavorable, tag low samples behind a disclosure, and label the mirror', () => {
    renderDashboard();

    const panel = screen.getByTestId('matchup-panel');
    // Confident matchups visible with rates.
    expect(panel.querySelector('[data-hero-badge="Stelle"]')).not.toBeNull();
    expect(within(panel).getByText('70.0%')).toBeInTheDocument();
    expect(within(panel).getByText('33.3%')).toBeInTheDocument();

    // Low-sample matchup collapsed until disclosed; rate stays hidden, count stays visible.
    expect(panel.querySelector('[data-hero-badge="Dooley"]')).toBeNull();
    fireEvent.click(within(panel).getByRole('button', { name: /Show low-sample matchups/ }));
    expect(panel.querySelector('[data-hero-badge="Dooley"]')).not.toBeNull();
    expect(within(panel).getByText('low sample')).toBeInTheDocument();
    expect(within(panel).getByText(/15 battles/)).toBeInTheDocument();

    // Mirror is shown and labeled, outside the favorable/unfavorable highlights.
    const mirror = screen.getByTestId('mirror-matchup');
    expect(within(mirror).getByText('Mirror')).toBeInTheDocument();
    expect(within(mirror).getByText('50.0%')).toBeInTheDocument();
  });

  test('DQ banner appears only past the threshold and is dismissible', () => {
    const { unmount } = renderDashboard({ bundleFailRate: 0.126 });

    const banner = screen.getByTestId('dq-banner');
    expect(banner.textContent).toContain('Bundle download failures are elevated');
    expect(banner.textContent).toContain('12.6%');
    fireEvent.click(within(banner).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByTestId('dq-banner')).not.toBeInTheDocument();
    // Data stays visible behind the warning.
    expect(screen.getByRole('table')).toBeInTheDocument();
    unmount();

    renderDashboard({ bundleFailRate: 0.01 });
    expect(screen.queryByTestId('dq-banner')).not.toBeInTheDocument();
  });

  test('failed days degrade coverage with a caveat instead of hiding the page', () => {
    renderDashboard({ excludeDays: ['2026-06-05'] });

    expect(
      screen.getByText('Some days are unavailable; this view includes loaded days only.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('coverage-strip').textContent).toContain('2 of 3');
    expect(screen.getByTestId('coverage-strip').textContent).toContain('partial coverage');
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  test('methodology sheet opens as a large scrollable dialog with ⓘ header tips', () => {
    renderDashboard();

    // ⓘ tooltip buttons are separate focus targets on metric headers.
    expect(
      screen.getAllByRole('button', { name: 'Ranked by Wilson 95% lower-bound win rate.' }).length
    ).toBeGreaterThan(0);
    expect(screen.getByText('Ranked by Wilson 95% lower bound')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'How we measure this' }));
    const dialog = screen.getByRole('dialog', { name: 'How we measure this' });
    expect(dialog.className).toContain('overflow-y-auto');
    expect(dialog.className).toContain('max-w-3xl');
    expect(within(dialog).getByText('Confidence-adjusted ranking')).toBeInTheDocument();
    expect(within(dialog).getByText('Decided battle')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'How we measure this' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
