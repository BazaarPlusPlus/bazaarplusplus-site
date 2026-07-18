import { getHeroColor, HEROES } from '../../shared/lib/heroes';
import {
  GAME_DAY_BUCKETS,
  RATING_TIER_ORDER,
  type RatingTier,
  type GameDayBucket,
  type DatasetCoverage,
  type HeroBattleCounts as BattleCounts,
  type HeroMetricsDataset,
  type HeroMetricsDay,
  type HeroMetricsPublishedDay,
  type HeroMetricsRow,
} from './hero-metrics-dataset';

export type MetricWindow = '1d' | '3d' | '7d';

export type AnalysisScope = {
  window: MetricWindow;
  tier: RatingTier;
};

export type HeroRanking = {
  hero: string;
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

export type HeroTrendPoint = {
  day: string;
  winRate: number;
};

export type HeroTrend = {
  hero: string;
  color: string;
  points: HeroTrendPoint[];
  segments: HeroTrendPoint[][];
  latestWinRate: number | null;
  firstWinRate: number | null;
  nullPointCount: number;
};

export type HeroStage = {
  hero: string;
  rates: Partial<Record<GameDayBucket, number | null>>;
};

export type HeroMatchup = {
  opponentHero: string;
  decided: number;
  wins: number;
  losses: number;
  winRate: number | null;
  isLowSample: boolean;
};

export type HeroAnalysis = {
  generatedAt: string;
  scope: {
    requested: AnalysisScope;
    effective: AnalysisScope;
    availableWindows: MetricWindow[];
    availableTiers: RatingTier[];
    tierFellBack: boolean;
  };
  coverage: DatasetCoverage & { nominalDateCount: number };
  ranking: HeroRanking[];
  trend: {
    dayAxis: string[];
    series: HeroTrend[];
  };
  stages: HeroStage[];
  focus: {
    hero: string | null;
    ranking: HeroRanking | null;
    trend: HeroTrend | null;
    matchups: HeroMatchup[];
  };
};

type MergedHeroRow = {
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
  matchups: Map<string, BattleCounts>;
};

const WINDOW_DAY_COUNT: Record<MetricWindow, number> = {
  '1d': 1,
  '3d': 3,
  '7d': 7,
};
const METRIC_WINDOW_OPTIONS: MetricWindow[] = ['1d', '3d', '7d'];
const MATCHUP_MIN_SAMPLE = 20;

function isCanonicalHero(hero: string): boolean {
  return (HEROES as readonly string[]).includes(hero);
}

function rateOrNull(successes: number, attempts: number): number | null {
  return attempts > 0 ? successes / attempts : null;
}

function selectDays(
  days: HeroMetricsPublishedDay[],
  window: MetricWindow,
  latestCompleteDay: string
): HeroMetricsPublishedDay[] {
  return [...days]
    .filter((ref) => ref.day <= latestCompleteDay)
    .sort((left, right) => left.day.localeCompare(right.day))
    .slice(-WINDOW_DAY_COUNT[window]);
}

function getAvailableTiers(days: HeroMetricsDay[]): RatingTier[] {
  const tiers = new Set<RatingTier>();
  for (const payload of days) {
    for (const row of payload.rows) {
      if (isCanonicalHero(row.hero)) {
        tiers.add(row.rating_tier);
      }
    }
  }

  return RATING_TIER_ORDER.filter((tier) => tiers.has(tier));
}

function collectRows(
  payloads: HeroMetricsDay[],
  selectedDays: HeroMetricsPublishedDay[],
  tier: RatingTier
): HeroMetricsRow[] {
  const wantedDates = new Set(selectedDays.map((ref) => ref.day));
  return payloads
    .filter((payload) => wantedDates.has(payload.day))
    .flatMap((payload) =>
      payload.rows.filter((row) => row.rating_tier === tier && isCanonicalHero(row.hero))
    );
}

function addBattleDays(
  target: Partial<Record<GameDayBucket, BattleCounts>>,
  source: Partial<Record<GameDayBucket, BattleCounts>>
) {
  for (const bucket of GAME_DAY_BUCKETS) {
    const counts = source[bucket];
    if (!counts) {
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

function mergeRows(rows: HeroMetricsRow[]): Map<string, MergedHeroRow> {
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

function compareNullableDescending(left: number | null, right: number | null): number {
  if (left == null || right == null) {
    if (left == null && right == null) {
      return 0;
    }
    return left == null ? 1 : -1;
  }
  return right - left;
}

function deriveRanking(merged: Map<string, MergedHeroRow>): HeroRanking[] {
  const rows = Array.from(merged.values());
  const completedInScope = rows.reduce((sum, row) => sum + row.runsCompleted, 0);

  return rows
    .map((row) => {
      const misfortune = Math.max(
        row.scoredRuns - (row.perfect + row.gold + row.silver + row.bronze),
        0
      );
      return {
        hero: row.hero,
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
    })
    .sort(
      (left, right) =>
        compareNullableDescending(left.tenWinRate, right.tenWinRate) ||
        right.runsCompleted - left.runsCompleted ||
        left.hero.localeCompare(right.hero)
    );
}

function segmentTrendPoints(points: HeroTrendPoint[], dayAxis: string[]): HeroTrendPoint[][] {
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

function deriveTrend(
  payloads: HeroMetricsDay[],
  selectedDays: HeroMetricsPublishedDay[],
  tier: RatingTier
): HeroTrend[] {
  const payloadByDay = new Map(payloads.map((payload) => [payload.day, payload]));
  const orderedDays = [...selectedDays].sort((left, right) => left.day.localeCompare(right.day));
  const dayAxis = orderedDays.map((ref) => ref.day);
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

  return Array.from(pointsByHero.entries())
    .map(([hero, points]) => ({
      hero,
      color: getHeroColor(hero),
      points,
      segments: segmentTrendPoints(points, dayAxis),
      latestWinRate: points.at(-1)?.winRate ?? null,
      firstWinRate: points[0]?.winRate ?? null,
      nullPointCount: nullCountByHero.get(hero) ?? 0,
    }))
    .sort(
      (left, right) =>
        compareNullableDescending(left.latestWinRate, right.latestWinRate) ||
        left.hero.localeCompare(right.hero)
    );
}

function deriveStages(
  ranking: HeroRanking[],
  merged: Map<string, MergedHeroRow>
): HeroStage[] {
  return ranking.map((row) => {
    const rates: Partial<Record<GameDayBucket, number | null>> = {};
    for (const bucket of GAME_DAY_BUCKETS) {
      const counts = merged.get(row.hero)?.battleDays[bucket];
      if (counts) {
        rates[bucket] = rateOrNull(counts.wins, counts.decided);
      }
    }
    return { hero: row.hero, rates };
  });
}

function compareMatchups(left: HeroMatchup, right: HeroMatchup): number {
  if (left.isLowSample !== right.isLowSample) {
    return left.isLowSample ? 1 : -1;
  }
  return (
    compareNullableDescending(left.winRate, right.winRate) ||
    right.decided - left.decided ||
    left.opponentHero.localeCompare(right.opponentHero)
  );
}

function deriveMatchups(merged: MergedHeroRow | undefined): HeroMatchup[] {
  if (!merged) {
    return [];
  }
  return Array.from(merged.matchups.entries())
    .map(([opponentHero, counts]) => ({
      opponentHero,
      decided: counts.decided,
      wins: counts.wins,
      losses: counts.losses,
      winRate: rateOrNull(counts.wins, counts.decided),
      isLowSample: counts.decided < MATCHUP_MIN_SAMPLE,
    }))
    .sort(compareMatchups);
}

export function analyzeHeroes(
  dataset: HeroMetricsDataset,
  requestedScope: AnalysisScope,
  requestedFocus: string | null
): HeroAnalysis {
  const selectedDays = selectDays(
    dataset.publishedDays,
    requestedScope.window,
    dataset.latestCompleteDay
  );
  const selectedDateSet = new Set(selectedDays.map((ref) => ref.day));
  const usableDates = dataset.coverage.usableDates.filter((day) => selectedDateSet.has(day));
  const failedDates = dataset.coverage.failedDates.filter((day) => selectedDateSet.has(day));
  const requestedRows = collectRows(dataset.days, selectedDays, requestedScope.tier);
  const allRows = collectRows(dataset.days, selectedDays, 'all');
  const tierFellBack =
    requestedScope.tier !== 'all' && requestedRows.length === 0 && allRows.length > 0;
  const effectiveScope: AnalysisScope = {
    window: requestedScope.window,
    tier: tierFellBack ? 'all' : requestedScope.tier,
  };
  const merged = mergeRows(tierFellBack ? allRows : requestedRows);
  const ranking = deriveRanking(merged);
  const stages = deriveStages(ranking, merged);
  const trendDays = selectDays(dataset.publishedDays, '7d', dataset.latestCompleteDay);
  const trendSeries = deriveTrend(dataset.days, trendDays, effectiveScope.tier);
  const focusHero = ranking.some((row) => row.hero === requestedFocus)
    ? requestedFocus
    : ranking[0]?.hero ?? null;

  return {
    generatedAt: dataset.generatedAt,
    scope: {
      requested: requestedScope,
      effective: effectiveScope,
      availableWindows: dataset.coverage.usableDates.length > 0 ? [...METRIC_WINDOW_OPTIONS] : [],
      availableTiers: getAvailableTiers(dataset.days),
      tierFellBack,
    },
    coverage: {
      requestedDates: selectedDays.map((ref) => ref.day),
      usableDates,
      failedDates,
      nominalDateCount: WINDOW_DAY_COUNT[requestedScope.window],
    },
    ranking,
    trend: {
      dayAxis: trendDays.map((ref) => ref.day),
      series: trendSeries,
    },
    stages,
    focus: {
      hero: focusHero,
      ranking: ranking.find((row) => row.hero === focusHero) ?? null,
      trend: trendSeries.find((series) => series.hero === focusHero) ?? null,
      matchups: deriveMatchups(focusHero ? merged.get(focusHero) : undefined),
    },
  };
}
