import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import HeroOverviewDashboard from '../src/features/heroes/HeroOverviewDashboard';
import type { HeroMetricsDataset } from '../src/features/heroes/hero-metrics-dataset';
import { BAZAARDB_ICON_PATH, BAZAARDB_INTEGRATION_DOC_URL, BAZAARDB_META_URL } from '../src/content/site-copy';
import { createMemorySpaLocationAdapter, createSpaLocation } from '../src/app/router';
import type {
  HeroMetricsDay,
  HeroMetricsRow,
} from '../src/features/heroes/hero-metrics-dataset';

const DAYS = ['2026-06-04', '2026-06-05', '2026-06-06'];

function makeRow(
  overrides: Omit<Partial<HeroMetricsRow>, 'hero'> & { hero: string }
): HeroMetricsRow {
  const { hero, ...rest } = overrides;
  return {
    hero,
    rating_tier: 'all',
    runs: { completed: 0, scored: 0, ten_win: 0 },
    outcomes: { perfect: 0, gold: 0, silver: 0, bronze: 0 },
    ten_win_days: { known_count: 0, sum_days: 0 },
    battle_days: {},
    matchups: [],
    ...rest,
  };
}

function makeDayRows(dayIndex: number): HeroMetricsRow[] {
  return [
    makeRow({
      hero: 'Stelle',
      // scored equals ten_win so every scored run is gold (10W rate 41% must stay distinct
      // from outcome rates).
      runs: { completed: 100, scored: 40 + dayIndex, ten_win: 40 + dayIndex },
      outcomes: { perfect: 0, gold: 40 + dayIndex, silver: 0, bronze: 0 },
      ten_win_days: { known_count: 40 + dayIndex, sum_days: 11 * (40 + dayIndex) },
      battle_days: {
        day_1: { decided: 10, wins: 2, losses: 8 },
        day_5: { decided: 10, wins: 9, losses: 1 },
        day_10: { decided: 10, wins: 6, losses: 4 },
      },
      matchups: [
        { opponent_hero: 'Mak', decided: 20, wins: 15, losses: 5 },
        { opponent_hero: 'Jules', decided: 10, wins: 4, losses: 6 },
      ],
    }),
    makeRow({
      hero: 'Jules',
      runs: { completed: 100, scored: 100, ten_win: 50 },
      outcomes: { perfect: 30, gold: 20, silver: 20, bronze: 20 },
      ten_win_days: { known_count: 45, sum_days: 10 * 30 + 12 * 15 },
      battle_days: {
        day_1: { decided: 100, wins: 60, losses: 40 },
        day_5: { decided: 80, wins: 40, losses: 40 },
      },
      matchups: [
        { opponent_hero: 'Stelle', decided: 100, wins: 70, losses: 30 },
        { opponent_hero: 'Vanessa', decided: 30, wins: 10, losses: 20 },
        { opponent_hero: 'Dooley', decided: 5, wins: 4, losses: 1 },
        { opponent_hero: 'Jules', decided: 50, wins: 25, losses: 25 },
      ],
    }),
    // Vanessa has no completed runs on the middle day → null trend point.
    makeRow({
      hero: 'Vanessa',
      runs:
        dayIndex === 1
          ? { completed: 0, scored: 0, ten_win: 0 }
          : { completed: 80, scored: 80, ten_win: 20 },
      outcomes: dayIndex === 1 ? { perfect: 0, gold: 0, silver: 0, bronze: 0 } : { perfect: 20, gold: 0, silver: 0, bronze: 0 },
      battle_days: {
        day_1: { decided: 10, wins: 8, losses: 2 },
        day_5: { decided: 10, wins: 4, losses: 6 },
        day_10: { decided: 10, wins: 7, losses: 3 },
      },
    }),
    // Karnok never has a denominator → null rates must sink in the ranking.
    makeRow({ hero: 'Karnok' }),
    // Payload noise: only the seven canonical heroes should be shown.
    makeRow({
      hero: 'Common',
      runs: { completed: 10, scored: 10, ten_win: 9 },
      outcomes: { perfect: 0, gold: 9, silver: 1, bronze: 0 },
    }),
    makeRow({
      hero: 'Mak',
      rating_tier: 'mid',
      runs: { completed: 50, scored: 50, ten_win: 20 },
      outcomes: { perfect: 0, gold: 20, silver: 0, bronze: 0 },
    }),
    makeRow({
      hero: 'Dooley',
      rating_tier: 'high',
      runs: { completed: 30, scored: 30, ten_win: 12 },
      outcomes: { perfect: 0, gold: 12, silver: 0, bronze: 0 },
    }),
  ];
}

function makePayload(day: string, dayIndex: number): HeroMetricsDay {
  return {
    schema_version: '2',
    kind: 'hero_web_daily',
    day,
    generated_at: '2026-06-07T09:04:17Z',
    rows: makeDayRows(dayIndex),
  };
}

function renderDashboard(options?: {
  excludeDays?: string[];
  payloads?: HeroMetricsDay[];
  url?: string;
}) {
  const excludeDays = options?.excludeDays ?? [];
  const url = options?.url ?? '/heroes?lang=en&w=3d';

  const loadedDays = options?.payloads
    ? options.payloads.map((payload) => payload.day)
    : DAYS.filter((day) => !excludeDays.includes(day));
  const days = options?.payloads ?? loadedDays.map((day) => makePayload(day, DAYS.indexOf(day)));
  const dataset: HeroMetricsDataset = {
    generatedAt: '2026-06-07T09:04:17Z',
    latestCompleteDay: DAYS.at(-1)!,
    publishedDays: DAYS.map((day) => ({
      day,
      path: `analyzer-v4/web/${day}.json`,
      row_count: 7,
    })),
    days,
    coverage: {
      requestedDates: DAYS,
      usableDates: loadedDays,
      failedDates: excludeDays,
    },
  };
  const memory = createMemorySpaLocationAdapter(url);
  const location = createSpaLocation(memory.adapter).current();
  const onScopeChange = vi.fn();

  return {
    ...render(
    <HeroOverviewDashboard
      locale={location.locale}
      location={location}
      dataset={dataset}
      requestedScope={location.scope}
      onScopeChange={onScopeChange}
    />
    ),
    onScopeChange,
  };
}

function getRankingTable() {
  const table = screen
    .getAllByRole('table')
    .find((candidate) => candidate.querySelectorAll('col').length === 10);

  expect(table).toBeDefined();
  return table!;
}

describe('HeroOverviewDashboard', () => {
  test('reports the hydrated scope so the location interface can normalize its query defaults', async () => {
    const { onScopeChange } = renderDashboard({
      url: '/heroes?lang=zh&w=invalid&t=all',
    });

    await waitFor(() =>
      expect(onScopeChange).toHaveBeenCalledWith({ window: '1d', tier: 'all' })
    );
  });

  test('hydrates scope from the URL and keeps BazaarDB links', () => {
    renderDashboard({ url: '/heroes?lang=en&w=3d&t=high' });

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
    const table = getRankingTable();
    expect(within(table).getByText('Dooley')).toBeInTheDocument();
    expect(within(table).queryByText('Jules')).not.toBeInTheDocument();
  });

  test('one global tier control drives ranking, trend, and dossier together', () => {
    const { container, onScopeChange } = renderDashboard();

    // Single global control: exactly one Mid pill on the whole page.
    expect(screen.getAllByRole('button', { name: 'Mid' })).toHaveLength(1);
    const trendSection = screen.getByTestId('daily-winrate-chart').closest('section')!;
    expect(within(trendSection).queryByRole('button', { name: 'Mid' })).not.toBeInTheDocument();
    expect(within(trendSection).queryByRole('button', { name: 'All' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mid' }));
    expect(screen.getByRole('button', { name: 'Mid' })).toHaveAttribute('aria-pressed', 'true');
    expect(onScopeChange).toHaveBeenCalledWith({ window: '3d', tier: 'mid' });

    // Ranking switches to mid-tier rows.
    const table = getRankingTable();
    expect(within(table).getByText('Mak')).toBeInTheDocument();
    expect(within(table).queryByText('Jules')).not.toBeInTheDocument();

    // Trend honors the same tier.
    expect(container.querySelector('[data-hero="Mak"] polyline')).toHaveAttribute(
      'stroke',
      '#bee65b'
    );
    expect(container.querySelector('[data-hero="Stelle"]')).toBeNull();

    // The focus panel follows the focused hero of the new tier.
    expect(screen.getByTestId('selected-matchup-hero')).toHaveAccessibleName('Selected hero: Mak');
    expect(screen.getByTestId('selected-matchup-hero')).toHaveTextContent('Mak');
  });

  test('renders ranking order, null values, and sortable interactions from Hero Analysis', () => {
    const { container } = renderDashboard();

    const table = getRankingTable();
    const trendSection = screen.getByTestId('daily-winrate-chart').closest('section')!;
    const rankingSection = table.closest('section')!;
    expect(
      trendSection.compareDocumentPosition(rankingSection) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(table.querySelectorAll('col')).toHaveLength(10);
    expect(table.className).toContain('table-fixed');
    expect(within(table).queryByRole('button', { name: 'Wilson LB' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'P75 days' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Battle WR' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Final WR' })).not.toBeInTheDocument();

    const heroOrder = Array.from(table.querySelectorAll('tbody [data-hero-badge]')).map((badge) =>
      badge.getAttribute('data-hero-badge')
    );
    // Payload noise is filtered; zero-denominator Karnok sinks last.
    expect(heroOrder).toEqual(['Jules', 'Stelle', 'Vanessa', 'Karnok']);
    expect(within(table).queryByText('Common')).not.toBeInTheDocument();

    // Zero-denominator rates render as em dash, never NaN.
    expect(container.textContent).not.toContain('NaN');
    const karnokRow = within(table).getByText('Karnok').closest('tr')!;
    expect(karnokRow.textContent).toContain('—');

    // Non-canonical rows are data noise, not a visible table state.
    expect(within(table).queryByText('Non-standard')).not.toBeInTheDocument();

    // Sortable headers stay interactive.
    expect(within(table).getByRole('button', { name: '10W rate' })).toBeInTheDocument();
    fireEvent.click(within(table).getByRole('button', { name: 'Hero' }));
    const ascOrder = Array.from(table.querySelectorAll('tbody [data-hero-badge]')).map((badge) =>
      badge.getAttribute('data-hero-badge')
    );
    expect(ascOrder).toEqual(['Jules', 'Karnok', 'Stelle', 'Vanessa']);
  });

  test('window pills update the requested scope and write w= to the URL', () => {
    const { onScopeChange } = renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: '1D' }));
    expect(onScopeChange).toHaveBeenCalledWith({ window: '1d', tier: 'all' });
    expect(screen.getByRole('button', { name: '1D' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '7D' }));
    expect(onScopeChange).toHaveBeenCalledWith({ window: '7d', tier: 'all' });
    // Only 3 of 7 nominal days exist → partial coverage note, but 7d stays valid.
    expect(screen.getByTestId('coverage-strip').textContent).toContain('partial coverage');
    expect(screen.getByTestId('coverage-strip').textContent).toContain('3 of 7');
    expect(screen.getByTestId('coverage-strip').textContent).not.toContain('7D window');
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
    const table = getRankingTable();
    fireEvent.click(within(table).getByRole('button', { name: 'Vanessa' }));
    expect(
      screen.getByText('Some days have no calculable trend point.')
    ).toBeInTheDocument();

    // Tooltip testid renders on hover.
    fireEvent.mouseEnter(vanessaCircles[0]!);
    expect(screen.getByTestId('trend-point-tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(vanessaCircles[0]!);
  });

  test('focus panel groups trend and matchups while dossier keeps stage buckets', () => {
    renderDashboard();

    const focusPanel = screen.getByTestId('hero-focus-panel');
    expect(within(focusPanel).getByTestId('daily-winrate-chart')).toBeInTheDocument();
    const matchupPanel = within(focusPanel).getByTestId('matchup-panel');
    expect(matchupPanel).toBeInTheDocument();
    const selectedMatchupHero = within(matchupPanel).getByTestId('selected-matchup-hero');
    expect(selectedMatchupHero).toHaveAccessibleName('Selected hero: Jules');
    expect(selectedMatchupHero).toHaveTextContent('Jules');
    expect(selectedMatchupHero).toHaveTextContent('JUL · 7D');
    expect(within(matchupPanel).queryByText('In focus')).not.toBeInTheDocument();
    expect(within(focusPanel).queryByText('Latest')).not.toBeInTheDocument();
    expect(within(focusPanel).queryByText('Started at')).not.toBeInTheDocument();

    // The section header stays contextual without repeating the focused hero badge.
    const dossier = screen.getByTestId('hero-dossier');
    const dossierHeader = dossier.querySelector(':scope > div')!;
    expect(dossierHeader.querySelector('[data-hero-badge]')).toBeNull();
    expect(within(dossierHeader as HTMLElement).getByText('3D window · All')).toBeInTheDocument();
    expect(screen.queryByTestId('battle-panel')).not.toBeInTheDocument();
    expect(within(dossier).queryByTestId('matchup-panel')).not.toBeInTheDocument();

    const stage = screen.getByTestId('stage-panel');
    // v2 ships only detailed per-game-day buckets; coarse day_1_3/4_7/8_plus are gone.
    expect(within(stage).queryByText('Day 1-3')).not.toBeInTheDocument();
    expect(within(stage).getByText('Day 1')).toBeInTheDocument();
    expect(within(stage).getByText('Day 5')).toBeInTheDocument();
    expect(within(stage).getByText('Day 10')).toBeInTheDocument();
    expect(within(stage).queryByRole('button', { name: 'Focused hero' })).not.toBeInTheDocument();
    expect(within(stage).queryByRole('button', { name: 'All heroes' })).not.toBeInTheDocument();
    expect(stage.querySelectorAll('[data-hero-badge]').length).toBeGreaterThan(1);
    const stageHeroOrder = () =>
      Array.from(stage.querySelectorAll('tbody [data-hero-badge]')).map((badge) =>
        badge.getAttribute('data-hero-badge')
      );

    fireEvent.click(within(stage).getByRole('button', { name: 'Day 10' }));
    expect(stageHeroOrder()).toEqual(['Vanessa', 'Stelle', 'Jules', 'Karnok']);
    expect(within(stage).getByRole('columnheader', { name: 'Day 10' })).toHaveAttribute(
      'aria-sort',
      'descending'
    );

    fireEvent.click(within(stage).getByRole('button', { name: 'Day 10' }));
    expect(stageHeroOrder()).toEqual(['Stelle', 'Vanessa', 'Jules', 'Karnok']);
    expect(within(stage).getByRole('columnheader', { name: 'Day 10' })).toHaveAttribute(
      'aria-sort',
      'ascending'
    );

    expect(screen.queryByTestId('victory-bucket-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('outcome-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('final-wins-histogram')).not.toBeInTheDocument();
  });

  test('matchups follow the focused hero as one ordered list and tag low samples', () => {
    renderDashboard();

    const list = screen.getByTestId('matchup-list');
    const heroOrder = Array.from(list.querySelectorAll('[data-hero-badge]')).map((badge) =>
      badge.getAttribute('data-hero-badge')
    );
    // Default focus is the top-ranked hero (Jules).
    expect(heroOrder).toEqual(['Stelle', 'Jules', 'Vanessa', 'Dooley']);
    expect(within(list).queryByText('Favorable')).not.toBeInTheDocument();
    expect(within(list).queryByText('Unfavorable')).not.toBeInTheDocument();
    expect(within(list).queryByText('Mirror')).not.toBeInTheDocument();

    expect(within(list).getByText('70.0%')).toBeInTheDocument();
    expect(within(list).getByText('50.0%')).toBeInTheDocument();
    expect(within(list).getByText('33.3%')).toBeInTheDocument();

    expect(list.querySelector('[data-hero-badge="Dooley"]')).not.toBeNull();
    expect(within(list).getByText('low sample')).toBeInTheDocument();
    expect(within(list).getByText(/15 battles/)).toBeInTheDocument();

    // Focusing another hero from the ranking re-derives the matchups.
    const table = getRankingTable();
    fireEvent.click(within(table).getByRole('button', { name: 'Stelle' }));
    const updatedList = screen.getByTestId('matchup-list');
    const updatedOrder = Array.from(updatedList.querySelectorAll('[data-hero-badge]')).map(
      (badge) => badge.getAttribute('data-hero-badge')
    );
    expect(updatedOrder).toEqual(['Mak', 'Jules']);
    expect(within(updatedList).getByText('75.0%')).toBeInTheDocument();
    expect(within(updatedList).getByText('40.0%')).toBeInTheDocument();
  });

  test('DQ failure-rate metadata is not shown in the dashboard chrome', () => {
    renderDashboard();

    expect(screen.queryByTestId('dq-banner')).not.toBeInTheDocument();
    expect(screen.queryByText(/Bundle download failures/)).not.toBeInTheDocument();
    expect(screen.getByTestId('coverage-strip').textContent).not.toContain('12.6%');
    // Data stays visible with the warning metadata hidden.
    expect(getRankingTable()).toBeInTheDocument();
  });

  test('failed days degrade coverage with a caveat instead of hiding the page', () => {
    renderDashboard({ excludeDays: ['2026-06-05'] });

    expect(
      screen.getByText('Some days are unavailable; this view includes loaded days only.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('coverage-strip').textContent).toContain('2 of 3');
    expect(screen.getByTestId('coverage-strip').textContent).toContain('partial coverage');
    expect(getRankingTable()).toBeInTheDocument();
  });

  test('ranking keeps sortable headers without tip buttons or methodology trigger', () => {
    renderDashboard();

    expect(screen.queryByRole('button', { name: 'Ranked by 10-win rate.' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'wins ÷ decided battles' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10W rate' })).toBeInTheDocument();
    expect(screen.queryByTestId('tier-legend')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'How we measure this' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
