// @vitest-environment node

import { describe, expect, test } from 'vitest';

import type {
  WebDayRef,
  WebHeroDailyPayload,
  WebHeroDailyRow,
} from '../src/shared/lib/metrics';
import {
  collectTierRows,
  deriveAvailableTiers,
  deriveAvailableWindows,
  deriveHeroMetrics,
  deriveMatchups,
  deriveTrendSeries,
  mergeRows,
  segmentTrendPoints,
  selectDays,
} from '../src/shared/lib/web-daily';

function makeRow(
  overrides: Omit<Partial<WebHeroDailyRow>, 'hero'> & { hero: string }
): WebHeroDailyRow {
  const { hero, ...rest } = overrides;
  return {
    hero: hero as WebHeroDailyRow['hero'],
    rating_tier: 'all',
    runs: { completed: 0, scored: 0, ten_win: 0 },
    outcomes: { perfect: 0, gold: 0, silver: 0, bronze: 0 },
    ten_win_days: { known_count: 0, sum_days: 0 },
    battle_days: {},
    matchups: [],
    ...rest,
  };
}

function makePayload(day: string, rows: WebHeroDailyRow[]): WebHeroDailyPayload {
  return {
    schema_version: '2',
    kind: 'hero_web_daily',
    day,
    generated_at: `${day}T09:00:00Z`,
    rows,
  };
}

function makeDayRefs(days: string[]): WebDayRef[] {
  return days.map((day) => ({ day, path: `analyzer-v4/web/${day}.json`, row_count: 1 }));
}

describe('selectDays', () => {
  const days = makeDayRefs([
    '2026-06-01',
    '2026-06-02',
    '2026-06-03',
    '2026-06-04',
    '2026-06-05',
    '2026-06-06',
    '2026-06-07',
    '2026-06-08',
  ]);

  test('returns the latest N days at or before latest_complete_day, ascending', () => {
    expect(selectDays(days, '1d', '2026-06-07').map((ref) => ref.day)).toEqual(['2026-06-07']);
    expect(selectDays(days, '3d', '2026-06-07').map((ref) => ref.day)).toEqual([
      '2026-06-05',
      '2026-06-06',
      '2026-06-07',
    ]);
    expect(selectDays(days, '7d', '2026-06-07').map((ref) => ref.day)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
      '2026-06-07',
    ]);
  });

  test('returns the available subset when fewer days exist, without zero-fill', () => {
    const sparse = makeDayRefs(['2026-06-05', '2026-06-06']);
    expect(selectDays(sparse, '7d', '2026-06-06').map((ref) => ref.day)).toEqual([
      '2026-06-05',
      '2026-06-06',
    ]);
    expect(selectDays([], '7d', '2026-06-06')).toEqual([]);
  });
});

describe('deriveAvailableWindows / deriveAvailableTiers', () => {
  test('windows are empty with no days, otherwise all three', () => {
    expect(deriveAvailableWindows([])).toEqual([]);
    expect(deriveAvailableWindows(makeDayRefs(['2026-06-06']))).toEqual(['1d', '3d', '7d']);
  });

  test('tiers are the union of loaded rows in canonical order', () => {
    const payloads = [
      makePayload('2026-06-05', [
        makeRow({ hero: 'Vanessa', rating_tier: 'high' }),
        makeRow({ hero: 'Vanessa', rating_tier: 'all' }),
        makeRow({ hero: 'Common', rating_tier: 'low' }),
      ]),
      makePayload('2026-06-06', [makeRow({ hero: 'Mak', rating_tier: 'mid' })]),
    ];

    expect(deriveAvailableTiers(payloads)).toEqual(['all', 'mid', 'high']);
    expect(deriveAvailableTiers([])).toEqual([]);
  });
});

describe('mergeRows', () => {
  const dayOne = makeRow({
    hero: 'Vanessa',
    runs: { completed: 80, scored: 78, ten_win: 30 },
    outcomes: { perfect: 12, gold: 18, silver: 20, bronze: 18 },
    ten_win_days: { known_count: 22, sum_days: 242 },
    battle_days: {
      day_1: { decided: 100, wins: 70, losses: 30 },
      day_4: { decided: 200, wins: 120, losses: 80 },
    },
    matchups: [
      { opponent_hero: 'Mak', decided: 40, wins: 25, losses: 15 },
      { opponent_hero: 'Vanessa', decided: 30, wins: 15, losses: 15 },
      { opponent_hero: 'Common', decided: 999, wins: 999, losses: 0 } as never,
    ],
  });
  const dayTwo = makeRow({
    hero: 'Vanessa',
    runs: { completed: 40, scored: 38, ten_win: 10 },
    outcomes: { perfect: 4, gold: 6, silver: 8, bronze: 10 },
    ten_win_days: { known_count: 8, sum_days: 88 },
    battle_days: {
      day_1: { decided: 60, wins: 40, losses: 20 },
      day_8: { decided: 40, wins: 30, losses: 10 },
    },
    matchups: [
      { opponent_hero: 'Mak', decided: 20, wins: 5, losses: 15 },
      { opponent_hero: 'Jules', decided: 10, wins: 8, losses: 2 },
    ],
  });

  test('merging two days equals the direct combined aggregate', () => {
    const rows = [
      dayOne,
      dayTwo,
      makeRow({ hero: 'Common', runs: { completed: 999, scored: 999, ten_win: 999 } }),
    ];
    const mergedRows = mergeRows(rows);
    const merged = mergedRows.get('Vanessa')!;

    expect(merged.runsCompleted).toBe(120);
    expect(merged.scoredRuns).toBe(116);
    expect(merged.tenWinCount).toBe(40);
    expect(merged.perfect).toBe(16);
    expect(merged.gold).toBe(24);
    expect(merged.silver).toBe(28);
    expect(merged.bronze).toBe(28);
    expect(merged.tenWinDaysKnownCount).toBe(30);
    expect(merged.tenWinDaysSumDays).toBe(330);
    expect(merged.battleDays).toEqual({
      day_1: { decided: 160, wins: 110, losses: 50 },
      day_4: { decided: 200, wins: 120, losses: 80 },
      day_8: { decided: 40, wins: 30, losses: 10 },
    });
    expect(merged.matchups.get('Mak')).toEqual({ decided: 60, wins: 30, losses: 30 });
    expect(merged.matchups.get('Vanessa')).toEqual({ decided: 30, wins: 15, losses: 15 });
    expect(merged.matchups.get('Jules')).toEqual({ decided: 10, wins: 8, losses: 2 });
    // Non-canonical opponent and non-canonical hero are filtered out.
    expect(merged.matchups.has('Common')).toBe(false);
    expect(mergedRows.has('Common')).toBe(false);
  });

  test('does not mutate its inputs when merging battle_days maps', () => {
    mergeRows([dayOne, dayTwo]);
    expect(dayOne.battle_days.day_1).toEqual({ decided: 100, wins: 70, losses: 30 });
  });

  test('preserves all detailed game-day buckets when merging', () => {
    const mergedRows = mergeRows([
      makeRow({
        hero: 'Vanessa',
        battle_days: {
          day_1: { decided: 10, wins: 6, losses: 4 },
          day_13_plus: { decided: 5, wins: 2, losses: 3 },
        },
      }),
      makeRow({
        hero: 'Vanessa',
        battle_days: {
          day_1: { decided: 20, wins: 14, losses: 6 },
          day_12: { decided: 8, wins: 5, losses: 3 },
        },
      }),
    ]);

    expect(mergedRows.get('Vanessa')?.battleDays).toEqual({
      day_1: { decided: 30, wins: 20, losses: 10 },
      day_12: { decided: 8, wins: 5, losses: 3 },
      day_13_plus: { decided: 5, wins: 2, losses: 3 },
    });
  });

  test('drops stale coarse battle-day buckets from runtime payloads', () => {
    const mergedRows = mergeRows([
      makeRow({
        hero: 'Vanessa',
        battle_days: {
          day_1: { decided: 10, wins: 6, losses: 4 },
          day_1_3: { count: 100, wins: 99, losses: 1 },
          day_4_7: { count: 100, wins: 98, losses: 2 },
          day_8_plus: { count: 100, wins: 97, losses: 3 },
        } as unknown as WebHeroDailyRow['battle_days'],
      }),
    ]);

    const battleDays = mergedRows.get('Vanessa')?.battleDays;
    expect(battleDays).toEqual({
      day_1: { decided: 10, wins: 6, losses: 4 },
    });
    expect(battleDays).not.toHaveProperty('day_1_3');
    expect(battleDays).not.toHaveProperty('day_4_7');
    expect(battleDays).not.toHaveProperty('day_8_plus');
  });

  test('the all tier stays a measured row, never low+mid+high summed', () => {
    const payload = makePayload('2026-06-06', [
      makeRow({ hero: 'Vanessa', rating_tier: 'all', runs: { completed: 100, scored: 0, ten_win: 0 } }),
      makeRow({ hero: 'Common', rating_tier: 'all', runs: { completed: 999, scored: 0, ten_win: 0 } }),
      makeRow({ hero: 'Vanessa', rating_tier: 'low', runs: { completed: 20, scored: 0, ten_win: 0 } }),
      makeRow({ hero: 'Vanessa', rating_tier: 'mid', runs: { completed: 30, scored: 0, ten_win: 0 } }),
      makeRow({ hero: 'Vanessa', rating_tier: 'high', runs: { completed: 10, scored: 0, ten_win: 0 } }),
    ]);
    const selected = makeDayRefs(['2026-06-06']);

    const allRows = collectTierRows([payload], selected, 'all');
    expect(allRows).toHaveLength(1);
    expect(mergeRows(allRows).get('Vanessa')!.runsCompleted).toBe(100);

    const midRows = collectTierRows([payload], selected, 'mid');
    expect(mergeRows(midRows).get('Vanessa')!.runsCompleted).toBe(30);
  });
});

describe('deriveHeroMetrics', () => {
  test('derives rates over scored runs and avg-days from sum/known', () => {
    const merged = mergeRows([
      makeRow({
        hero: 'Vanessa',
        // scored = 390 < completed (10 completed runs are unscored / NULL final_wins)
        runs: { completed: 400, scored: 390, ten_win: 150 },
        outcomes: { perfect: 60, gold: 90, silver: 120, bronze: 60 },
        ten_win_days: { known_count: 140, sum_days: 10 * 60 + 11 * 50 + 12 * 30 },
      }),
      makeRow({ hero: 'Mak', runs: { completed: 100, scored: 0, ten_win: 0 } }),
    ]);

    const rows = deriveHeroMetrics(merged);
    const vanessa = rows.find((row) => row.hero === 'Vanessa')!;

    expect(vanessa.scoredRuns).toBe(390);
    expect(vanessa.runShare).toBeCloseTo(400 / 500, 12);
    expect(vanessa.tenWinCount).toBe(150);
    expect(vanessa.tenWinRate).toBeCloseTo(150 / 400, 12);
    // perfect=60, gold=90, silver=120, bronze=60, misfortune=390-330=60 — sums to scored
    expect(vanessa.perfectRate).toBeCloseTo(60 / 390, 12);
    expect(vanessa.goldRate).toBeCloseTo(90 / 390, 12);
    expect(vanessa.silverRate).toBeCloseTo(120 / 390, 12);
    expect(vanessa.bronzeRate).toBeCloseTo(60 / 390, 12);
    expect(vanessa.misfortuneRate).toBeCloseTo(60 / 390, 12);
    const tierSum =
      vanessa.perfectRate! +
      vanessa.goldRate! +
      vanessa.silverRate! +
      vanessa.bronzeRate! +
      vanessa.misfortuneRate!;
    expect(tierSum).toBeCloseTo(1, 12);
    expect(vanessa.avgRunDays10w).toBeCloseTo((10 * 60 + 11 * 50 + 12 * 30) / 140, 12);
    expect(vanessa.isCanonical).toBe(true);
  });

  test('filters non-canonical rows and handles zero denominators without NaN', () => {
    const merged = mergeRows([
      makeRow({
        hero: 'Common',
        runs: { completed: 1, scored: 1, ten_win: 1 },
        outcomes: { perfect: 1, gold: 0, silver: 0, bronze: 0 },
      }),
      makeRow({
        hero: 'Stelle',
        runs: { completed: 1, scored: 1, ten_win: 0 },
        outcomes: { perfect: 0, gold: 0, silver: 1, bronze: 0 },
      }),
      makeRow({ hero: 'Mak' }),
    ]);

    const rows = deriveHeroMetrics(merged);
    const stelle = rows.find((row) => row.hero === 'Stelle')!;
    const mak = rows.find((row) => row.hero === 'Mak')!;

    expect(rows.some((row) => row.hero === 'Common')).toBe(false);
    expect(stelle.isCanonical).toBe(true);
    expect(stelle.tenWinCount).toBe(0);
    expect(stelle.goldRate).toBe(0);
    expect(stelle.silverRate).toBe(1);
    expect(stelle.avgRunDays10w).toBeNull();
    expect(stelle.runShare).toBe(1);

    expect(mak.scoredRuns).toBe(0);
    expect(mak.tenWinRate).toBeNull();
    expect(mak.perfectRate).toBeNull();
    expect(mak.runShare).toBe(0);
  });

  test('runShare is null when the scope has no completed runs', () => {
    const merged = mergeRows([makeRow({ hero: 'Vanessa' }), makeRow({ hero: 'Mak' })]);
    for (const row of deriveHeroMetrics(merged)) {
      expect(row.runShare).toBeNull();
    }
  });
});

describe('deriveTrendSeries', () => {
  const selected = makeDayRefs(['2026-06-04', '2026-06-05', '2026-06-06']);
  const payloads = [
    makePayload('2026-06-04', [
      makeRow({ hero: 'Vanessa', runs: { completed: 100, scored: 100, ten_win: 40 } }),
      makeRow({ hero: 'Mak', runs: { completed: 50, scored: 50, ten_win: 30 } }),
      makeRow({ hero: 'Common', runs: { completed: 10, scored: 10, ten_win: 9 } }),
      makeRow({ hero: 'Jules', runs: { completed: 80, scored: 80, ten_win: 8 } }),
      makeRow({ hero: 'Stelle', runs: { completed: 0, scored: 0, ten_win: 0 } }),
      makeRow({
        hero: 'Vanessa',
        rating_tier: 'high',
        runs: { completed: 10, scored: 10, ten_win: 9 },
      }),
    ]),
    makePayload('2026-06-05', [
      makeRow({ hero: 'Vanessa', runs: { completed: 0, scored: 0, ten_win: 0 } }),
      makeRow({ hero: 'Mak', runs: { completed: 60, scored: 60, ten_win: 33 } }),
    ]),
    makePayload('2026-06-06', [
      makeRow({ hero: 'Vanessa', runs: { completed: 120, scored: 120, ten_win: 60 } }),
      makeRow({ hero: 'Mak', runs: { completed: 70, scored: 70, ten_win: 28 } }),
    ]),
  ];

  test('emits one chartable point per non-null day and counts null points', () => {
    const series = deriveTrendSeries(payloads, selected, 'all');
    const vanessa = series.find((entry) => entry.hero === 'Vanessa')!;
    const mak = series.find((entry) => entry.hero === 'Mak')!;

    // Vanessa: chartable on 06-04 and 06-06; 06-05 had zero completed runs.
    expect(vanessa.points).toEqual([
      { day: '2026-06-04', winRate: 0.4 },
      { day: '2026-06-06', winRate: 0.5 },
    ]);
    expect(vanessa.nullPointCount).toBe(1);
    expect(vanessa.latestWinRate).toBe(0.5);
    expect(vanessa.firstWinRate).toBe(0.4);
    expect(mak.points).toHaveLength(3);
    expect(mak.nullPointCount).toBe(0);
  });

  test('honors the tier filter', () => {
    const series = deriveTrendSeries(payloads, selected, 'high');
    expect(series.map((entry) => entry.hero)).toEqual(['Vanessa']);
    expect(series[0]!.points).toEqual([{ day: '2026-06-04', winRate: 0.9 }]);
  });

  test('excludes non-canonical heroes and heroes with zero chartable points', () => {
    const series = deriveTrendSeries(payloads, selected, 'all');
    expect(series.some((entry) => entry.hero === 'Common')).toBe(false);
    expect(series.some((entry) => entry.hero === 'Stelle')).toBe(false);
  });

  test('sorts by latest chartable rate descending', () => {
    const series = deriveTrendSeries(payloads, selected, 'all');
    expect(series.map((entry) => entry.hero)).toEqual(['Vanessa', 'Mak', 'Jules']);
  });

  test('segments split across missing days; a single point stands alone', () => {
    const dayAxis = selected.map((ref) => ref.day);
    const vanessa = deriveTrendSeries(payloads, selected, 'all').find(
      (entry) => entry.hero === 'Vanessa'
    )!;

    const segments = segmentTrendPoints(vanessa.points, dayAxis);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual([{ day: '2026-06-04', winRate: 0.4 }]);
    expect(segments[1]).toEqual([{ day: '2026-06-06', winRate: 0.5 }]);

    const mak = deriveTrendSeries(payloads, selected, 'all').find(
      (entry) => entry.hero === 'Mak'
    )!;
    expect(segmentTrendPoints(mak.points, dayAxis)).toHaveLength(1);
  });
});

describe('deriveMatchups', () => {
  test('sorts matchups by win rate then decided, and tags low samples', () => {
    const merged = mergeRows([
      makeRow({
        hero: 'Vanessa',
        matchups: [
          { opponent_hero: 'Mak', decided: 40, wins: 30, losses: 10 },
          { opponent_hero: 'Jules', decided: 200, wins: 130, losses: 70 },
          { opponent_hero: 'Dooley', decided: 40, wins: 10, losses: 30 },
          { opponent_hero: 'Karnok', decided: 5, wins: 5, losses: 0 },
          { opponent_hero: 'Vanessa', decided: 100, wins: 50, losses: 50 },
        ],
      }),
    ]).get('Vanessa')!;

    const { rows } = deriveMatchups(merged, 20);

    expect(rows.map((row) => row.opponentHero)).toEqual([
      'Mak',
      'Jules',
      'Vanessa',
      'Dooley',
      'Karnok',
    ]);
    expect(rows.find((row) => row.opponentHero === 'Karnok')!.isLowSample).toBe(true);
    expect(rows.find((row) => row.opponentHero === 'Mak')!.isLowSample).toBe(false);
    expect(rows.find((row) => row.opponentHero === 'Mak')!.winRate).toBeCloseTo(0.75, 12);
    expect(rows.find((row) => row.opponentHero === 'Dooley')!.winRate).toBeCloseTo(0.25, 12);
  });

  test('merged matchups across days feed a single per-opponent row', () => {
    const merged = mergeRows([
      makeRow({
        hero: 'Vanessa',
        matchups: [{ opponent_hero: 'Mak', decided: 15, wins: 10, losses: 5 }],
      }),
      makeRow({
        hero: 'Vanessa',
        matchups: [{ opponent_hero: 'Mak', decided: 25, wins: 20, losses: 5 }],
      }),
    ]).get('Vanessa')!;

    const { rows } = deriveMatchups(merged, 20);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      opponentHero: 'Mak',
      decided: 40,
      wins: 30,
      losses: 10,
      isLowSample: false,
    });
    expect(rows[0]!.winRate).toBeCloseTo(0.75, 12);
  });
});
