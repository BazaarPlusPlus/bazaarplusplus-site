import { wilsonLower95 } from './dashboard';
import { getHeroColor, HEROES } from './heroes';
import {
  RATING_TIER_ORDER,
  type BattleBucketCounts,
  type GameDayBucket,
  type MetricWindow,
  type RatingTier,
  type VictoryBucket,
  type WebDayRef,
  type WebHeroDailyPayload,
  type WebHeroDailyRow,
} from './metrics';

export { wilsonLower95 };

export type MergedHeroRow = {
  hero: string;
  runsTotal: number;
  runsCompleted: number;
  finalWinsCounts: Record<string, number>;
  runDays10wCounts: Record<string, number>;
  battleDecidedCount: number;
  battleWins: number;
  battleLosses: number;
  finalBattleDecidedCount: number;
  finalBattleWins: number;
  finalBattleLosses: number;
  gameDayBattleCounts: Partial<Record<GameDayBucket, BattleBucketCounts>>;
  victoryBucketBattleCounts: Partial<Record<VictoryBucket, BattleBucketCounts>>;
  matchups: Map<string, { battleDecidedCount: number; wins: number; losses: number }>;
};

export type HeroMetricsRow = {
  hero: string;
  isCanonical: boolean;
  runsTotal: number;
  runsCompleted: number;
  scoredRuns: number;
  runShare: number | null;
  tenWinCount: number;
  tenWinRate: number | null;
  tenWinRateWilsonLower: number | null;
  avgRunDays10w: number | null;
  p75RunDays10w: number | null;
  perfectRate: number | null;
  goldRate: number | null;
  silverRate: number | null;
  bronzeRate: number | null;
  misfortuneRate: number | null;
  battleWinRate: number | null;
  battleWinRateWilsonLower: number | null;
  finalBattleWinRate: number | null;
  finalBattleWinRateWilsonLower: number | null;
};

export type HeroTrendPoint = { day: string; winRate: number };

export type HeroTrendSeries = {
  hero: string;
  color: string;
  isCanonical: boolean;
  points: HeroTrendPoint[];
  latestWinRate: number | null;
  firstWinRate: number | null;
  nullPointCount: number;
};

export type MatchupRow = {
  opponentHero: string;
  battleDecidedCount: number;
  wins: number;
  losses: number;
  winRate: number | null;
  winWilsonLower: number | null;
  lossWilsonLower: number | null;
  isLowSample: boolean;
};

const WINDOW_DAY_COUNT: Record<MetricWindow, number> = { '1d': 1, '3d': 3, '7d': 7 };
const METRIC_WINDOW_OPTIONS: MetricWindow[] = ['1d', '3d', '7d'];

export function isCanonicalHero(hero: string): boolean {
  return (HEROES as readonly string[]).includes(hero);
}

// p (e.g. 0.75) from a keyed histogram via ceil(total*p) rank walk; null on empty.
export function percentileFromHistogram(
  counts: Record<string, number>,
  p: number
): number | null {
  const entries = Object.entries(counts)
    .map(([key, count]) => [Number(key), count] as const)
    .filter(([value, count]) => Number.isFinite(value) && count > 0)
    .sort(([a], [b]) => a - b);

  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (total <= 0) {
    return null;
  }

  const rank = Math.ceil(total * p);
  let seen = 0;
  for (const [value, count] of entries) {
    seen += count;
    if (seen >= rank) {
      return value;
    }
  }

  return entries.at(-1)?.[0] ?? null;
}

function weightedAverageFromHistogram(counts: Record<string, number>): number | null {
  let total = 0;
  let weighted = 0;
  for (const [key, count] of Object.entries(counts)) {
    const value = Number(key);
    if (!Number.isFinite(value) || count <= 0) {
      continue;
    }

    total += count;
    weighted += value * count;
  }

  return total > 0 ? weighted / total : null;
}

function rateOrNull(successes: number, attempts: number): number | null {
  return attempts > 0 ? successes / attempts : null;
}

// Latest N (1/3/7) manifest days at/before latestCompleteDay, ascending; available subset
// when fewer; no zero-fill.
export function selectDays(
  days: WebDayRef[],
  window: MetricWindow,
  latestCompleteDay: string
): WebDayRef[] {
  return [...days]
    .filter((ref) => ref.day <= latestCompleteDay)
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-WINDOW_DAY_COUNT[window]);
}

export function deriveAvailableWindows(days: WebDayRef[]): MetricWindow[] {
  return days.length > 0 ? [...METRIC_WINDOW_OPTIONS] : [];
}

export function deriveAvailableTiers(days: WebHeroDailyPayload[]): RatingTier[] {
  const tiers = new Set<RatingTier>();
  for (const payload of days) {
    for (const row of payload.rows) {
      if (!isCanonicalHero(row.hero)) {
        continue;
      }
      tiers.add(row.rating_tier);
    }
  }

  return RATING_TIER_ORDER.filter((tier) => tiers.has(tier));
}

// Rows for one tier across the selected days, keeping the payload day association.
export function collectTierRows(
  payloads: WebHeroDailyPayload[],
  selectedDays: WebDayRef[],
  tier: RatingTier
): WebHeroDailyRow[] {
  const wantedDays = new Set(selectedDays.map((ref) => ref.day));
  return payloads
    .filter((payload) => wantedDays.has(payload.day))
    .flatMap((payload) =>
      payload.rows.filter((row) => row.rating_tier === tier && isCanonicalHero(row.hero))
    );
}

function addHistogram(target: Record<string, number>, source: Record<string, number>) {
  for (const [key, count] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + count;
  }
}

function addBucketCounts<Bucket extends string>(
  target: Partial<Record<Bucket, BattleBucketCounts>>,
  source: Partial<Record<Bucket, BattleBucketCounts>>
) {
  for (const [bucket, counts] of Object.entries(source) as Array<[Bucket, BattleBucketCounts]>) {
    const existing = target[bucket];
    if (existing) {
      existing.count += counts.count;
      existing.wins += counts.wins;
      existing.losses += counts.losses;
    } else {
      target[bucket] = { ...counts };
    }
  }
}

// Group by hero (tier already filtered): sum ints, histograms by key, bucket maps by
// bucket+field, matchups by opponent_hero. Never derive 'all' from low+mid+high.
export function mergeRows(rows: WebHeroDailyRow[]): Map<string, MergedHeroRow> {
  const merged = new Map<string, MergedHeroRow>();

  for (const row of rows) {
    if (!isCanonicalHero(row.hero)) {
      continue;
    }

    let entry = merged.get(row.hero);
    if (!entry) {
      entry = {
        hero: row.hero,
        runsTotal: 0,
        runsCompleted: 0,
        finalWinsCounts: {},
        runDays10wCounts: {},
        battleDecidedCount: 0,
        battleWins: 0,
        battleLosses: 0,
        finalBattleDecidedCount: 0,
        finalBattleWins: 0,
        finalBattleLosses: 0,
        gameDayBattleCounts: {},
        victoryBucketBattleCounts: {},
        matchups: new Map(),
      };
      merged.set(row.hero, entry);
    }

    entry.runsTotal += row.runs_total;
    entry.runsCompleted += row.runs_completed;
    addHistogram(entry.finalWinsCounts, row.final_wins_counts);
    addHistogram(entry.runDays10wCounts, row.run_days_10w_counts);
    entry.battleDecidedCount += row.battle_decided_count;
    entry.battleWins += row.battle_wins;
    entry.battleLosses += row.battle_losses;
    entry.finalBattleDecidedCount += row.final_battle_decided_count;
    entry.finalBattleWins += row.final_battle_wins;
    entry.finalBattleLosses += row.final_battle_losses;
    addBucketCounts(entry.gameDayBattleCounts, row.game_day_battle_counts);
    addBucketCounts(entry.victoryBucketBattleCounts, row.victory_bucket_battle_counts);

    for (const matchup of row.matchups) {
      if (!isCanonicalHero(matchup.opponent_hero)) {
        continue;
      }

      const existing = entry.matchups.get(matchup.opponent_hero);
      if (existing) {
        existing.battleDecidedCount += matchup.battle_decided_count;
        existing.wins += matchup.wins;
        existing.losses += matchup.losses;
      } else {
        entry.matchups.set(matchup.opponent_hero, {
          battleDecidedCount: matchup.battle_decided_count,
          wins: matchup.wins,
          losses: matchup.losses,
        });
      }
    }
  }

  return merged;
}

function sumFinalWins(counts: Record<string, number>, fromWins: number, toWins: number): number {
  let total = 0;
  for (const [key, count] of Object.entries(counts)) {
    const wins = Number(key);
    if (Number.isFinite(wins) && wins >= fromWins && wins <= toWins) {
      total += count;
    }
  }

  return total;
}

export function deriveHeroMetrics(merged: Map<string, MergedHeroRow>): HeroMetricsRow[] {
  const rows = Array.from(merged.values());
  const completedInScope = rows.reduce((sum, row) => sum + row.runsCompleted, 0);

  return rows.map((row) => {
    // scoredRuns is the victory-tier denominator: completed runs with a known final_wins.
    // Completed runs with NULL final_wins inflate runsCompleted above this sum.
    const scoredRuns = Object.values(row.finalWinsCounts).reduce((sum, count) => sum + count, 0);
    const tenWinCount = row.finalWinsCounts['10'] ?? 0;
    // A 10-win run with NULL run_days lands in gold automatically (in final_wins['10'],
    // not in run_days_10w['10']); do not special-case.
    const perfect = row.runDays10wCounts['10'] ?? 0;
    const gold = tenWinCount - perfect;
    const silver = sumFinalWins(row.finalWinsCounts, 7, 9);
    const bronze = sumFinalWins(row.finalWinsCounts, 4, 6);
    const misfortune = sumFinalWins(row.finalWinsCounts, 0, 3);

    return {
      hero: row.hero,
      isCanonical: isCanonicalHero(row.hero),
      runsTotal: row.runsTotal,
      runsCompleted: row.runsCompleted,
      scoredRuns,
      runShare: rateOrNull(row.runsCompleted, completedInScope),
      tenWinCount,
      tenWinRate: rateOrNull(tenWinCount, row.runsCompleted),
      tenWinRateWilsonLower:
        row.runsCompleted > 0 ? wilsonLower95(tenWinCount, row.runsCompleted) : null,
      avgRunDays10w: weightedAverageFromHistogram(row.runDays10wCounts),
      p75RunDays10w: percentileFromHistogram(row.runDays10wCounts, 0.75),
      perfectRate: rateOrNull(perfect, scoredRuns),
      goldRate: rateOrNull(gold, scoredRuns),
      silverRate: rateOrNull(silver, scoredRuns),
      bronzeRate: rateOrNull(bronze, scoredRuns),
      misfortuneRate: rateOrNull(misfortune, scoredRuns),
      battleWinRate: rateOrNull(row.battleWins, row.battleDecidedCount),
      battleWinRateWilsonLower:
        row.battleDecidedCount > 0 ? wilsonLower95(row.battleWins, row.battleDecidedCount) : null,
      finalBattleWinRate: rateOrNull(row.finalBattleWins, row.finalBattleDecidedCount),
      finalBattleWinRateWilsonLower:
        row.finalBattleDecidedCount > 0
          ? wilsonLower95(row.finalBattleWins, row.finalBattleDecidedCount)
          : null,
    };
  });
}

// One chartable point per loaded day per hero where runs_completed > 0
// (daily tenWinRate = final_wins['10'] / runs_completed). Null-denominator daily rows are
// counted in nullPointCount for "no value" notes, never converted into chart points.
// Non-canonical heroes are excluded (all unknowns collapse to one grey, indistinguishable).
export function deriveTrendSeries(
  payloads: WebHeroDailyPayload[],
  selectedDays: WebDayRef[],
  tier: RatingTier
): HeroTrendSeries[] {
  const payloadByDay = new Map(payloads.map((payload) => [payload.day, payload]));
  const orderedDays = [...selectedDays].sort((a, b) => a.day.localeCompare(b.day));
  const pointsByHero = new Map<string, HeroTrendPoint[]>();
  const nullCountByHero = new Map<string, number>();

  for (const dayRef of orderedDays) {
    const payload = payloadByDay.get(dayRef.day);
    if (!payload) {
      continue;
    }

    for (const row of payload.rows) {
      if (row.rating_tier !== tier || !isCanonicalHero(row.hero)) {
        continue;
      }

      const winRate = rateOrNull(row.final_wins_counts['10'] ?? 0, row.runs_completed);
      if (winRate == null) {
        nullCountByHero.set(row.hero, (nullCountByHero.get(row.hero) ?? 0) + 1);
        continue;
      }

      const points = pointsByHero.get(row.hero) ?? [];
      points.push({ day: payload.day, winRate });
      pointsByHero.set(row.hero, points);
    }
  }

  // A hero with zero chartable points is omitted from the chart and legend entirely.
  return Array.from(pointsByHero.entries())
    .map(([hero, points]) => ({
      hero,
      color: getHeroColor(hero),
      isCanonical: true,
      points,
      latestWinRate: points.at(-1)?.winRate ?? null,
      firstWinRate: points[0]?.winRate ?? null,
      nullPointCount: nullCountByHero.get(hero) ?? 0,
    }))
    .sort(
      (a, b) =>
        (b.latestWinRate ?? 0) - (a.latestWinRate ?? 0) || a.hero.localeCompare(b.hero)
    );
}

// Split a series into polyline segments across missing days so lines are never drawn
// through gaps; a single chartable point renders as a dot.
export function segmentTrendPoints(
  points: HeroTrendPoint[],
  dayAxis: string[]
): HeroTrendPoint[][] {
  const indexByDay = new Map(dayAxis.map((day, index) => [day, index]));
  const segments: HeroTrendPoint[][] = [];
  let current: HeroTrendPoint[] = [];
  let previousIndex: number | null = null;

  for (const point of points) {
    const index = indexByDay.get(point.day);
    if (index == null) {
      continue;
    }

    if (previousIndex != null && index !== previousIndex + 1 && current.length > 0) {
      segments.push(current);
      current = [];
    }

    current.push(point);
    previousIndex = index;
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}

function compareOrderedMatchups(a: MatchupRow, b: MatchupRow): number {
  if (a.isLowSample !== b.isLowSample) {
    return a.isLowSample ? 1 : -1;
  }

  return (
    (b.winRate ?? -Infinity) - (a.winRate ?? -Infinity) ||
    b.battleDecidedCount - a.battleDecidedCount ||
    a.opponentHero.localeCompare(b.opponentHero)
  );
}

export function deriveMatchups(
  merged: MergedHeroRow,
  minSample: number
): { rows: MatchupRow[] } {
  const rows: MatchupRow[] = Array.from(merged.matchups.entries()).map(
    ([opponentHero, counts]) => ({
      opponentHero,
      battleDecidedCount: counts.battleDecidedCount,
      wins: counts.wins,
      losses: counts.losses,
      winRate: rateOrNull(counts.wins, counts.battleDecidedCount),
      winWilsonLower:
        counts.battleDecidedCount > 0
          ? wilsonLower95(counts.wins, counts.battleDecidedCount)
          : null,
      lossWilsonLower:
        counts.battleDecidedCount > 0
          ? wilsonLower95(counts.losses, counts.battleDecidedCount)
          : null,
      isLowSample: counts.battleDecidedCount < minSample,
    })
  );

  return { rows: rows.sort(compareOrderedMatchups) };
}
