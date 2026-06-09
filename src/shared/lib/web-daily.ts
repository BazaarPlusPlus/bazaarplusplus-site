import { getHeroColor, HEROES } from './heroes';
import {
  isGameDayBucket,
  RATING_TIER_ORDER,
  type BattleCounts,
  type GameDayBucket,
  type MetricWindow,
  type RatingTier,
  type WebDayRef,
  type WebHeroDailyPayload,
  type WebHeroDailyRow,
} from './metrics';

export type MergedHeroRow = {
  hero: string;
  runsCompleted: number;
  scoredRuns: number;
  tenWinCount: number;
  perfect: number;
  gold: number;
  silver: number;
  bronze: number;
  tenWinDaysKnownCount: number;
  tenWinDaysSumDays: number;
  battleDays: Partial<Record<GameDayBucket, BattleCounts>>;
  matchups: Map<string, { decided: number; wins: number; losses: number }>;
};

export type HeroMetricsRow = {
  hero: string;
  isCanonical: boolean;
  runsCompleted: number;
  scoredRuns: number;
  runShare: number | null;
  tenWinCount: number;
  tenWinRate: number | null;
  avgRunDays10w: number | null;
  perfectRate: number | null;
  goldRate: number | null;
  silverRate: number | null;
  bronzeRate: number | null;
  misfortuneRate: number | null;
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
  decided: number;
  wins: number;
  losses: number;
  winRate: number | null;
  isLowSample: boolean;
};

const WINDOW_DAY_COUNT: Record<MetricWindow, number> = { '1d': 1, '3d': 3, '7d': 7 };
const METRIC_WINDOW_OPTIONS: MetricWindow[] = ['1d', '3d', '7d'];

export function isCanonicalHero(hero: string): boolean {
  return (HEROES as readonly string[]).includes(hero);
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

function addBattleDays(
  target: Partial<Record<GameDayBucket, BattleCounts>>,
  source: Partial<Record<GameDayBucket, BattleCounts>>
) {
  for (const [bucket, counts] of Object.entries(source)) {
    if (!isGameDayBucket(bucket)) {
      continue;
    }

    const existing = target[bucket];
    if (existing) {
      existing.decided += counts.decided;
      existing.wins += counts.wins;
      existing.losses += counts.losses;
    } else {
      target[bucket] = { ...counts };
    }
  }
}

// Group by hero (tier already filtered): sum nested counts, battle_days by bucket+field,
// matchups by opponent_hero. Never derive 'all' from low+mid+high.
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
        runsCompleted: 0,
        scoredRuns: 0,
        tenWinCount: 0,
        perfect: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
        tenWinDaysKnownCount: 0,
        tenWinDaysSumDays: 0,
        battleDays: {},
        matchups: new Map(),
      };
      merged.set(row.hero, entry);
    }

    entry.runsCompleted += row.runs.completed;
    entry.scoredRuns += row.runs.scored;
    entry.tenWinCount += row.runs.ten_win;
    entry.perfect += row.outcomes.perfect;
    entry.gold += row.outcomes.gold;
    entry.silver += row.outcomes.silver;
    entry.bronze += row.outcomes.bronze;
    entry.tenWinDaysKnownCount += row.ten_win_days.known_count;
    entry.tenWinDaysSumDays += row.ten_win_days.sum_days;
    addBattleDays(entry.battleDays, row.battle_days);

    for (const matchup of row.matchups) {
      if (!isCanonicalHero(matchup.opponent_hero)) {
        continue;
      }

      const existing = entry.matchups.get(matchup.opponent_hero);
      if (existing) {
        existing.decided += matchup.decided;
        existing.wins += matchup.wins;
        existing.losses += matchup.losses;
      } else {
        entry.matchups.set(matchup.opponent_hero, {
          decided: matchup.decided,
          wins: matchup.wins,
          losses: matchup.losses,
        });
      }
    }
  }

  return merged;
}

export function deriveHeroMetrics(merged: Map<string, MergedHeroRow>): HeroMetricsRow[] {
  const rows = Array.from(merged.values());
  const completedInScope = rows.reduce((sum, row) => sum + row.runsCompleted, 0);

  return rows.map((row) => {
    // The 0-3 "misfortune" band is not a stored bucket; derive it from the remainder of
    // scored runs after the four shipped outcome counts.
    const misfortune = Math.max(
      row.scoredRuns - (row.perfect + row.gold + row.silver + row.bronze),
      0
    );

    return {
      hero: row.hero,
      isCanonical: isCanonicalHero(row.hero),
      runsCompleted: row.runsCompleted,
      scoredRuns: row.scoredRuns,
      runShare: rateOrNull(row.runsCompleted, completedInScope),
      tenWinCount: row.tenWinCount,
      tenWinRate: rateOrNull(row.tenWinCount, row.runsCompleted),
      avgRunDays10w: rateOrNull(row.tenWinDaysSumDays, row.tenWinDaysKnownCount),
      perfectRate: rateOrNull(row.perfect, row.scoredRuns),
      goldRate: rateOrNull(row.gold, row.scoredRuns),
      silverRate: rateOrNull(row.silver, row.scoredRuns),
      bronzeRate: rateOrNull(row.bronze, row.scoredRuns),
      misfortuneRate: rateOrNull(misfortune, row.scoredRuns),
    };
  });
}

// One chartable point per loaded day per hero where runs.completed > 0
// (daily tenWinRate = runs.ten_win / runs.completed). Null-denominator daily rows are
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

      const winRate = rateOrNull(row.runs.ten_win, row.runs.completed);
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

// Sort matchups by rate desc then decided desc then opponent; low-sample rows sink last.
function compareOrderedMatchups(a: MatchupRow, b: MatchupRow): number {
  if (a.isLowSample !== b.isLowSample) {
    return a.isLowSample ? 1 : -1;
  }

  return (
    (b.winRate ?? -Infinity) - (a.winRate ?? -Infinity) ||
    b.decided - a.decided ||
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
      decided: counts.decided,
      wins: counts.wins,
      losses: counts.losses,
      winRate: rateOrNull(counts.wins, counts.decided),
      isLowSample: counts.decided < minSample,
    })
  );

  return { rows: rows.sort(compareOrderedMatchups) };
}
