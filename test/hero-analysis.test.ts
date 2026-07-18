// @vitest-environment node

import { describe, expect, test } from 'vitest';

import {
  analyzeHeroes,
} from '../src/features/heroes/hero-analysis';
import type { HeroMetricsDataset } from '../src/features/heroes/hero-metrics-dataset';
import type {
  HeroMetricsDay,
  HeroMetricsPublishedDay,
  HeroMetricsRow,
} from '../src/features/heroes/hero-metrics-dataset';

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

function makePayload(day: string, rows: HeroMetricsRow[]): HeroMetricsDay {
  return {
    schema_version: '2',
    kind: 'hero_web_daily',
    day,
    generated_at: `${day}T09:00:00Z`,
    rows,
  };
}

function makeDayRefs(days: string[]): HeroMetricsPublishedDay[] {
  return days.map((day) => ({
    day,
    path: `analyzer-v4/web/${day}.json`,
    row_count: 1,
  }));
}

function makeDataset(
  publishedDates: string[],
  days: HeroMetricsDay[],
  failedDates: string[] = [],
  latestCompleteDay = publishedDates.at(-1) ?? '2026-06-07'
): HeroMetricsDataset {
  return {
    generatedAt: '2026-06-08T09:00:00Z',
    latestCompleteDay,
    publishedDays: makeDayRefs(publishedDates),
    days,
    coverage: {
      requestedDates: publishedDates.filter((day) => day <= latestCompleteDay).slice(-7),
      usableDates: days.map((payload) => payload.day),
      failedDates,
    },
  };
}

describe('analyzeHeroes', () => {
  test('selects the latest 1d, 3d, and 7d dates without zero-fill and reports Dataset Coverage', () => {
    const dates = [
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
      '2026-06-07',
      '2026-06-08',
    ];
    const dataset = makeDataset(
      dates,
      [
        makePayload('2026-06-05', [
          makeRow({ hero: 'Vanessa', runs: { completed: 8, scored: 8, ten_win: 2 } }),
        ]),
        makePayload('2026-06-07', [
          makeRow({ hero: 'Vanessa', runs: { completed: 12, scored: 12, ten_win: 6 } }),
        ]),
      ],
      ['2026-06-06'],
      '2026-06-07'
    );

    const oneDay = analyzeHeroes(dataset, { window: '1d', tier: 'all' }, null);
    const threeDay = analyzeHeroes(dataset, { window: '3d', tier: 'all' }, null);
    const sevenDay = analyzeHeroes(dataset, { window: '7d', tier: 'all' }, null);

    expect(oneDay.coverage.requestedDates).toEqual(['2026-06-07']);
    expect(threeDay.coverage).toEqual({
      requestedDates: ['2026-06-05', '2026-06-06', '2026-06-07'],
      usableDates: ['2026-06-05', '2026-06-07'],
      failedDates: ['2026-06-06'],
      nominalDateCount: 3,
    });
    expect(threeDay.ranking[0]).toMatchObject({
      hero: 'Vanessa',
      runsCompleted: 20,
      tenWinCount: 8,
    });
    expect(sevenDay.coverage.requestedDates).toEqual(dates.slice(0, 7));
    expect(threeDay.scope.availableWindows).toEqual(['1d', '3d', '7d']);
  });

  test('returns no available scope options when no dates are usable', () => {
    const analysis = analyzeHeroes(
      makeDataset(['2026-06-07'], [], ['2026-06-07']),
      { window: '7d', tier: 'high' },
      'Vanessa'
    );

    expect(analysis.scope.availableWindows).toEqual([]);
    expect(analysis.scope.availableTiers).toEqual([]);
    expect(analysis.ranking).toEqual([]);
    expect(analysis.focus.hero).toBeNull();
  });

  test('derives canonical tier options and never reconstructs the explicit all tier', () => {
    const dataset = makeDataset(
      ['2026-06-07'],
      [
        makePayload('2026-06-07', [
          makeRow({
            hero: 'Vanessa',
            rating_tier: 'all',
            runs: { completed: 100, scored: 90, ten_win: 40 },
          }),
          makeRow({
            hero: 'Vanessa',
            rating_tier: 'low',
            runs: { completed: 20, scored: 20, ten_win: 10 },
          }),
          makeRow({
            hero: 'Vanessa',
            rating_tier: 'mid',
            runs: { completed: 30, scored: 30, ten_win: 15 },
          }),
          makeRow({
            hero: 'Vanessa',
            rating_tier: 'high',
            runs: { completed: 10, scored: 10, ten_win: 5 },
          }),
          makeRow({ hero: 'Common', rating_tier: 'high' }),
        ]),
      ]
    );

    const analysis = analyzeHeroes(dataset, { window: '1d', tier: 'all' }, 'Vanessa');

    expect(analysis.scope.availableTiers).toEqual(['all', 'low', 'mid', 'high']);
    expect(analysis.ranking[0]?.runsCompleted).toBe(100);
  });

  test('falls back to all only when the requested tier has no rows and usable all rows exist', () => {
    const withAll = makeDataset(
      ['2026-06-07'],
      [makePayload('2026-06-07', [makeRow({ hero: 'Mak', runs: { completed: 5, scored: 5, ten_win: 2 } })])]
    );
    const withoutAll = makeDataset(
      ['2026-06-07'],
      [makePayload('2026-06-07', [makeRow({ hero: 'Mak', rating_tier: 'mid' })])]
    );

    const fallback = analyzeHeroes(withAll, { window: '1d', tier: 'high' }, null);
    const noFallback = analyzeHeroes(withoutAll, { window: '1d', tier: 'high' }, null);

    expect(fallback.scope.effective).toEqual({ window: '1d', tier: 'all' });
    expect(fallback.scope.tierFellBack).toBe(true);
    expect(noFallback.scope.effective).toEqual({ window: '1d', tier: 'high' });
    expect(noFallback.scope.tierFellBack).toBe(false);
  });

  test('merges counts without mutation and returns null for every zero denominator', () => {
    const first = makeRow({
      hero: 'Vanessa',
      runs: { completed: 0, scored: 0, ten_win: 0 },
      battle_days: { day_1: { decided: 10, wins: 6, losses: 4 } },
    });
    const second = makeRow({
      hero: 'Vanessa',
      battle_days: { day_1: { decided: 20, wins: 14, losses: 6 } },
    });
    const analysis = analyzeHeroes(
      makeDataset(
        ['2026-06-06', '2026-06-07'],
        [makePayload('2026-06-06', [first]), makePayload('2026-06-07', [second])]
      ),
      { window: '3d', tier: 'all' },
      'Vanessa'
    );
    const row = analysis.ranking[0]!;

    expect(first.battle_days.day_1).toEqual({ decided: 10, wins: 6, losses: 4 });
    expect(row.runShare).toBeNull();
    expect(row.tenWinRate).toBeNull();
    expect(row.avgRunDays10w).toBeNull();
    expect(row.perfectRate).toBeNull();
    expect(analysis.stages[0]?.rates.day_1).toBeCloseTo(20 / 30, 12);
  });

  test('derives aggregate rates and focused matchups from multi-day additive counters', () => {
    const analysis = analyzeHeroes(
      makeDataset(
        ['2026-06-06', '2026-06-07'],
        [
          makePayload('2026-06-06', [
            makeRow({
              hero: 'Vanessa',
              runs: { completed: 400, scored: 390, ten_win: 150 },
              outcomes: { perfect: 60, gold: 90, silver: 120, bronze: 60 },
              ten_win_days: { known_count: 140, sum_days: 1_510 },
              matchups: [{ opponent_hero: 'Mak', decided: 15, wins: 10, losses: 5 }],
            }),
            makeRow({ hero: 'Mak', runs: { completed: 100, scored: 0, ten_win: 0 } }),
          ]),
          makePayload('2026-06-07', [
            makeRow({
              hero: 'Vanessa',
              matchups: [{ opponent_hero: 'Mak', decided: 25, wins: 20, losses: 5 }],
            }),
          ]),
        ]
      ),
      { window: '3d', tier: 'all' },
      'Vanessa'
    );
    const vanessa = analysis.ranking.find((row) => row.hero === 'Vanessa')!;

    expect(vanessa.runShare).toBeCloseTo(0.8, 12);
    expect(vanessa.tenWinRate).toBeCloseTo(150 / 400, 12);
    expect(vanessa.avgRunDays10w).toBeCloseTo(1_510 / 140, 12);
    expect(vanessa.perfectRate).toBeCloseTo(60 / 390, 12);
    expect(vanessa.goldRate).toBeCloseTo(90 / 390, 12);
    expect(vanessa.silverRate).toBeCloseTo(120 / 390, 12);
    expect(vanessa.bronzeRate).toBeCloseTo(60 / 390, 12);
    expect(vanessa.misfortuneRate).toBeCloseTo(60 / 390, 12);
    expect(analysis.focus.matchups).toEqual([
      {
        opponentHero: 'Mak',
        decided: 40,
        wins: 30,
        losses: 10,
        winRate: 0.75,
        isLowSample: false,
      },
    ]);
  });

  test('filters non-canonical heroes from every conclusion and splits trend gaps', () => {
    const analysis = analyzeHeroes(
      makeDataset(
        ['2026-06-05', '2026-06-06', '2026-06-07'],
        [
          makePayload('2026-06-05', [
            makeRow({
              hero: 'Vanessa',
              runs: { completed: 10, scored: 10, ten_win: 4 },
              matchups: [
                { opponent_hero: 'Mak', decided: 30, wins: 20, losses: 10 },
                { opponent_hero: 'Common' as never, decided: 99, wins: 99, losses: 0 },
              ],
            }),
            makeRow({
              hero: 'Common',
              runs: { completed: 10, scored: 10, ten_win: 9 },
              battle_days: { day_1: { decided: 10, wins: 10, losses: 0 } },
            }),
          ]),
          makePayload('2026-06-06', [makeRow({ hero: 'Vanessa' })]),
          makePayload('2026-06-07', [
            makeRow({ hero: 'Vanessa', runs: { completed: 10, scored: 10, ten_win: 5 } }),
          ]),
        ]
      ),
      { window: '3d', tier: 'all' },
      'Vanessa'
    );

    expect(analysis.ranking.map((row) => row.hero)).toEqual(['Vanessa']);
    expect(analysis.stages.map((row) => row.hero)).toEqual(['Vanessa']);
    expect(analysis.trend.series.map((series) => series.hero)).toEqual(['Vanessa']);
    expect(analysis.trend.series[0]?.segments).toEqual([
      [{ day: '2026-06-05', winRate: 0.4 }],
      [{ day: '2026-06-07', winRate: 0.5 }],
    ]);
    expect(analysis.focus.matchups.map((row) => row.opponentHero)).toEqual(['Mak']);
  });

  test('preserves mirror matchups, minimum-sample classification, and domain ordering', () => {
    const analysis = analyzeHeroes(
      makeDataset(
        ['2026-06-07'],
        [
          makePayload('2026-06-07', [
            makeRow({
              hero: 'Vanessa',
              runs: { completed: 40, scored: 40, ten_win: 20 },
              matchups: [
                { opponent_hero: 'Mak', decided: 40, wins: 30, losses: 10 },
                { opponent_hero: 'Jules', decided: 200, wins: 130, losses: 70 },
                { opponent_hero: 'Vanessa', decided: 100, wins: 50, losses: 50 },
                { opponent_hero: 'Karnok', decided: 5, wins: 5, losses: 0 },
              ],
            }),
          ]),
        ]
      ),
      { window: '1d', tier: 'all' },
      'Vanessa'
    );

    expect(analysis.focus.matchups.map((row) => row.opponentHero)).toEqual([
      'Mak',
      'Jules',
      'Vanessa',
      'Karnok',
    ]);
    expect(analysis.focus.matchups.at(-1)?.isLowSample).toBe(true);
    expect(analysis.focus.matchups.find((row) => row.opponentHero === 'Vanessa')).toMatchObject({
      winRate: 0.5,
      isLowSample: false,
    });
  });

  test('uses default ranking order and falls focus back to the first eligible hero', () => {
    const analysis = analyzeHeroes(
      makeDataset(
        ['2026-06-07'],
        [
          makePayload('2026-06-07', [
            makeRow({ hero: 'Mak', runs: { completed: 20, scored: 20, ten_win: 5 } }),
            makeRow({ hero: 'Jules', runs: { completed: 10, scored: 10, ten_win: 8 } }),
          ]),
        ]
      ),
      { window: '1d', tier: 'all' },
      'Missing'
    );

    expect(analysis.ranking.map((row) => row.hero)).toEqual(['Jules', 'Mak']);
    expect(analysis.focus.hero).toBe('Jules');
    expect(analysis.focus.ranking?.hero).toBe('Jules');
  });
});
