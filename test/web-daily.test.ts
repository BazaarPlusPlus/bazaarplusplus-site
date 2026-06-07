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
  percentileFromHistogram,
  segmentTrendPoints,
  selectDays,
  wilsonLower95,
} from '../src/shared/lib/web-daily';

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

function makePayload(day: string, rows: WebHeroDailyRow[]): WebHeroDailyPayload {
  return {
    schema_version: '1',
    kind: 'web_hero_daily',
    day,
    generatedAt: `${day}T09:00:00Z`,
    rows,
  };
}

function makeDayRefs(days: string[]): WebDayRef[] {
  return days.map((day) => ({ day, path: `analyzer-v4/web/${day}.json`, rowCount: 1 }));
}

describe('wilsonLower95', () => {
  test('returns null when attempts <= 0', () => {
    expect(wilsonLower95(0, 0)).toBeNull();
    expect(wilsonLower95(3, -1)).toBeNull();
  });

  test('returns zero for zero successes', () => {
    expect(wilsonLower95(0, 10)).toBe(0);
  });

  test('matches the analyzer z=1.96 formula for small and large samples', () => {
    expect(wilsonLower95(5, 10)).toBeCloseTo(0.2365895936154873, 12);
    expect(wilsonLower95(500, 1000)).toBeCloseTo(0.4690690341793595, 12);
  });

  test('pulls small samples further below the point rate than large ones', () => {
    const small = wilsonLower95(5, 10)!;
    const large = wilsonLower95(500, 1000)!;
    expect(small).toBeLessThan(large);
    expect(large).toBeLessThan(0.5);
  });
});

describe('percentileFromHistogram', () => {
  test('returns null on an empty histogram', () => {
    expect(percentileFromHistogram({}, 0.75)).toBeNull();
    expect(percentileFromHistogram({ '10': 0 }, 0.75)).toBeNull();
  });

  test('walks the rank for p75 over numeric keys', () => {
    // total 8, rank ceil(8*0.75)=6 → cumulative 2(10) + 3(11) = 5 < 6 → lands on 12
    expect(percentileFromHistogram({ '10': 2, '11': 3, '12': 2, '14': 1 }, 0.75)).toBe(12);
    expect(percentileFromHistogram({ '10': 4 }, 0.75)).toBe(10);
  });

  test('ignores non-numeric keys', () => {
    expect(percentileFromHistogram({ bogus: 5, '11': 1 }, 0.75)).toBe(11);
  });
});

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
    runs_total: 100,
    runs_completed: 80,
    final_wins_counts: { '0': 10, '7': 20, '10': 30 },
    run_days_10w_counts: { '10': 12, '11': 10 },
    battle_decided_count: 500,
    battle_wins: 300,
    battle_losses: 200,
    final_battle_decided_count: 60,
    final_battle_wins: 20,
    final_battle_losses: 40,
    game_day_battle_counts: {
      day_1_3: { count: 100, wins: 70, losses: 30 },
      day_4_7: { count: 200, wins: 120, losses: 80 },
    },
    victory_bucket_battle_counts: {
      wins_0_3: { count: 150, wins: 80, losses: 70 },
    },
    matchups: [
      { opponent_hero: 'Mak', battle_decided_count: 40, wins: 25, losses: 15 },
      { opponent_hero: 'Vanessa', battle_decided_count: 30, wins: 15, losses: 15 },
    ],
  });
  const dayTwo = makeRow({
    hero: 'Vanessa',
    runs_total: 50,
    runs_completed: 40,
    final_wins_counts: { '0': 5, '4': 5, '10': 10 },
    run_days_10w_counts: { '10': 4, '12': 4 },
    battle_decided_count: 250,
    battle_wins: 150,
    battle_losses: 100,
    final_battle_decided_count: 30,
    final_battle_wins: 12,
    final_battle_losses: 18,
    game_day_battle_counts: {
      day_1_3: { count: 60, wins: 40, losses: 20 },
      day_8_plus: { count: 40, wins: 30, losses: 10 },
    },
    victory_bucket_battle_counts: {
      wins_0_3: { count: 70, wins: 35, losses: 35 },
      wins_7_9: { count: 30, wins: 20, losses: 10 },
    },
    matchups: [
      { opponent_hero: 'Mak', battle_decided_count: 20, wins: 5, losses: 15 },
      { opponent_hero: 'Jules', battle_decided_count: 10, wins: 8, losses: 2 },
    ],
  });

  test('merging two days equals the direct combined aggregate', () => {
    const merged = mergeRows([dayOne, dayTwo]).get('Vanessa')!;

    expect(merged.runsTotal).toBe(150);
    expect(merged.runsCompleted).toBe(120);
    expect(merged.finalWinsCounts).toEqual({ '0': 15, '4': 5, '7': 20, '10': 40 });
    expect(merged.runDays10wCounts).toEqual({ '10': 16, '11': 10, '12': 4 });
    expect(merged.battleDecidedCount).toBe(750);
    expect(merged.battleWins).toBe(450);
    expect(merged.battleLosses).toBe(300);
    expect(merged.battleWins + merged.battleLosses).toBe(merged.battleDecidedCount);
    expect(merged.finalBattleDecidedCount).toBe(90);
    expect(merged.gameDayBattleCounts).toEqual({
      day_1_3: { count: 160, wins: 110, losses: 50 },
      day_4_7: { count: 200, wins: 120, losses: 80 },
      day_8_plus: { count: 40, wins: 30, losses: 10 },
    });
    expect(merged.victoryBucketBattleCounts).toEqual({
      wins_0_3: { count: 220, wins: 115, losses: 105 },
      wins_7_9: { count: 30, wins: 20, losses: 10 },
    });
    expect(merged.matchups.get('Mak')).toEqual({ battleDecidedCount: 60, wins: 30, losses: 30 });
    expect(merged.matchups.get('Vanessa')).toEqual({
      battleDecidedCount: 30,
      wins: 15,
      losses: 15,
    });
    expect(merged.matchups.get('Jules')).toEqual({ battleDecidedCount: 10, wins: 8, losses: 2 });
  });

  test('does not mutate its inputs when merging bucket maps', () => {
    mergeRows([dayOne, dayTwo]);
    expect(dayOne.game_day_battle_counts.day_1_3).toEqual({ count: 100, wins: 70, losses: 30 });
  });

  test('the all tier stays a measured row, never low+mid+high summed', () => {
    const payload = makePayload('2026-06-06', [
      makeRow({ hero: 'Vanessa', rating_tier: 'all', runs_completed: 100 }),
      makeRow({ hero: 'Vanessa', rating_tier: 'low', runs_completed: 20 }),
      makeRow({ hero: 'Vanessa', rating_tier: 'mid', runs_completed: 30 }),
      makeRow({ hero: 'Vanessa', rating_tier: 'high', runs_completed: 10 }),
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
  test('derives rates and reconstructs victory tiers over scoredRuns', () => {
    const merged = mergeRows([
      makeRow({
        hero: 'Vanessa',
        runs_total: 500,
        runs_completed: 400,
        // scoredRuns = 390 < runs_completed (10 completed runs have NULL final_wins)
        final_wins_counts: { '0': 40, '2': 20, '4': 30, '6': 30, '7': 50, '9': 70, '10': 150 },
        run_days_10w_counts: { '10': 60, '11': 50, '12': 30 },
        battle_decided_count: 1000,
        battle_wins: 600,
        battle_losses: 400,
        final_battle_decided_count: 400,
        final_battle_wins: 150,
        final_battle_losses: 250,
      }),
      makeRow({ hero: 'Mak', runs_total: 100, runs_completed: 100 }),
    ]);

    const rows = deriveHeroMetrics(merged);
    const vanessa = rows.find((row) => row.hero === 'Vanessa')!;

    expect(vanessa.scoredRuns).toBe(390);
    expect(vanessa.runShare).toBeCloseTo(400 / 500, 12);
    expect(vanessa.tenWinCount).toBe(150);
    expect(vanessa.tenWinRate).toBeCloseTo(150 / 400, 12);
    expect(vanessa.tenWinRateWilsonLower).toBeCloseTo(0.3289562625433452, 12);
    // perfect=60, gold=150-60=90, silver=120, bronze=60, misfortune=60 — sums to scoredRuns
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
    expect(vanessa.p75RunDays10w).toBe(11);
    expect(vanessa.battleWinRate).toBeCloseTo(0.6, 12);
    expect(vanessa.battleWinRateWilsonLower).not.toBeNull();
    expect(vanessa.finalBattleWinRate).toBeCloseTo(150 / 400, 12);
    expect(vanessa.isCanonical).toBe(true);
  });

  test('gold falls back to zero ten-win runs without NaN and zero denominators go null', () => {
    const merged = mergeRows([
      makeRow({ hero: 'Common', runs_total: 1, runs_completed: 1, final_wins_counts: { '9': 1 } }),
      makeRow({ hero: 'Stelle' }),
    ]);

    const rows = deriveHeroMetrics(merged);
    const common = rows.find((row) => row.hero === 'Common')!;
    const stelle = rows.find((row) => row.hero === 'Stelle')!;

    expect(common.isCanonical).toBe(false);
    expect(common.tenWinCount).toBe(0);
    expect(common.goldRate).toBe(0);
    expect(common.silverRate).toBe(1);
    expect(common.avgRunDays10w).toBeNull();
    expect(common.p75RunDays10w).toBeNull();
    expect(common.battleWinRate).toBeNull();
    expect(common.battleWinRateWilsonLower).toBeNull();
    expect(common.finalBattleWinRate).toBeNull();

    expect(stelle.scoredRuns).toBe(0);
    expect(stelle.tenWinRate).toBeNull();
    expect(stelle.tenWinRateWilsonLower).toBeNull();
    expect(stelle.perfectRate).toBeNull();
    expect(stelle.runShare).toBe(0);
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
      makeRow({ hero: 'Vanessa', runs_completed: 100, final_wins_counts: { '10': 40 } }),
      makeRow({ hero: 'Mak', runs_completed: 50, final_wins_counts: { '10': 30 } }),
      makeRow({ hero: 'Common', runs_completed: 10, final_wins_counts: { '10': 9 } }),
      makeRow({ hero: 'Jules', runs_completed: 80, final_wins_counts: { '10': 8 } }),
      makeRow({ hero: 'Stelle', runs_completed: 0 }),
      makeRow({
        hero: 'Vanessa',
        rating_tier: 'high',
        runs_completed: 10,
        final_wins_counts: { '10': 9 },
      }),
    ]),
    makePayload('2026-06-05', [
      makeRow({ hero: 'Vanessa', runs_completed: 0 }),
      makeRow({ hero: 'Mak', runs_completed: 60, final_wins_counts: { '10': 33 } }),
    ]),
    makePayload('2026-06-06', [
      makeRow({ hero: 'Vanessa', runs_completed: 120, final_wins_counts: { '10': 60 } }),
      makeRow({ hero: 'Mak', runs_completed: 70, final_wins_counts: { '10': 28 } }),
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
  test('splits mirror, sorts favorable/unfavorable by wilson, tags low samples', () => {
    const merged = mergeRows([
      makeRow({
        hero: 'Vanessa',
        matchups: [
          { opponent_hero: 'Mak', battle_decided_count: 40, wins: 30, losses: 10 },
          { opponent_hero: 'Jules', battle_decided_count: 200, wins: 130, losses: 70 },
          { opponent_hero: 'Dooley', battle_decided_count: 40, wins: 10, losses: 30 },
          { opponent_hero: 'Karnok', battle_decided_count: 5, wins: 5, losses: 0 },
          { opponent_hero: 'Vanessa', battle_decided_count: 100, wins: 50, losses: 50 },
        ],
      }),
    ]).get('Vanessa')!;

    const { favorable, unfavorable, mirror } = deriveMatchups(merged, 20);

    expect(mirror).toMatchObject({ opponentHero: 'Vanessa', battleDecidedCount: 100 });
    expect(favorable.map((row) => row.opponentHero)).toEqual(['Mak', 'Jules', 'Karnok']);
    expect(unfavorable.map((row) => row.opponentHero)).toEqual(['Dooley']);
    expect(favorable.find((row) => row.opponentHero === 'Karnok')!.isLowSample).toBe(true);
    expect(favorable.find((row) => row.opponentHero === 'Mak')!.isLowSample).toBe(false);
    expect(favorable[0]!.winWilsonLower).toBeCloseTo(0.5980574093302989, 12);
    expect(unfavorable[0]!.lossWilsonLower).toBeCloseTo(0.5980574093302989, 12);
    expect(unfavorable[0]!.winWilsonLower).toBeCloseTo(0.14186967895549518, 12);
  });

  test('merged matchups across days feed a single per-opponent row', () => {
    const merged = mergeRows([
      makeRow({
        hero: 'Vanessa',
        matchups: [{ opponent_hero: 'Mak', battle_decided_count: 15, wins: 10, losses: 5 }],
      }),
      makeRow({
        hero: 'Vanessa',
        matchups: [{ opponent_hero: 'Mak', battle_decided_count: 25, wins: 20, losses: 5 }],
      }),
    ]).get('Vanessa')!;

    const { favorable } = deriveMatchups(merged, 20);
    expect(favorable).toHaveLength(1);
    expect(favorable[0]).toMatchObject({
      opponentHero: 'Mak',
      battleDecidedCount: 40,
      wins: 30,
      losses: 10,
      isLowSample: false,
    });
    expect(favorable[0]!.winRate).toBeCloseTo(0.75, 12);
  });
});
