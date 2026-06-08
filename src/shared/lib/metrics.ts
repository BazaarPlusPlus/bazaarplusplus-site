export type MetricWindow = '1d' | '3d' | '7d';
export type RatingTier = 'all' | 'low' | 'mid' | 'high';
export type MetricsSource = 'remote';
export type Locale = 'en' | 'zh';

export const DEFAULT_LOCALE: Locale = 'zh';

export const METRIC_WINDOW_ORDER: MetricWindow[] = ['1d', '3d', '7d'];
export const RATING_TIER_ORDER: RatingTier[] = ['all', 'low', 'mid', 'high'];

export type WebDayRef = {
  day: string;
  path: string;
  rowCount: number;
};

export type AnalyzerV4Manifest = {
  schema_version: '1';
  namespace: 'analyzer-v4';
  generatedAt: string;
  latest_complete_day: string;
  web: {
    schema_version: '1';
    days: WebDayRef[];
  };
  dq?: {
    days?: number;
    downloaded?: number;
    download_failed?: number;
    decode_failed?: number;
    battle_count_mismatch?: number;
    decode_fail_rate?: number;
    bundle_download_fail_rate?: number;
  };
  sli_path?: string;
};

export type BattleBucketCounts = { count: number; wins: number; losses: number };

export type CoarseGameDayBucket = 'day_1_3' | 'day_4_7' | 'day_8_plus';
export type DetailedGameDayBucket =
  | 'day_1'
  | 'day_2'
  | 'day_3'
  | 'day_4'
  | 'day_5'
  | 'day_6'
  | 'day_7'
  | 'day_8'
  | 'day_9'
  | 'day_10'
  | 'day_11'
  | 'day_12'
  | 'day_13_plus';
export type GameDayBucket = CoarseGameDayBucket | DetailedGameDayBucket;
export type VictoryBucket = 'wins_0_3' | 'wins_4_6' | 'wins_7_9' | 'wins_10_plus';

export type WebHeroMatchupRow = {
  opponent_hero: string;
  battle_decided_count: number;
  wins: number;
  losses: number;
};

export type WebHeroDailyRow = {
  hero: string;
  rating_tier: RatingTier;
  runs_total: number;
  runs_completed: number;
  final_wins_counts: Record<string, number>;
  run_days_10w_counts: Record<string, number>;
  battle_decided_count: number;
  battle_wins: number;
  battle_losses: number;
  final_battle_decided_count: number;
  final_battle_wins: number;
  final_battle_losses: number;
  game_day_battle_counts: Partial<Record<GameDayBucket, BattleBucketCounts>>;
  victory_bucket_battle_counts: Partial<Record<VictoryBucket, BattleBucketCounts>>;
  matchups: WebHeroMatchupRow[];
};

export type WebHeroDailyPayload = {
  schema_version: '1';
  kind: 'web_hero_daily';
  day: string;
  generatedAt: string;
  rows: WebHeroDailyRow[];
};

function isMetricWindow(value: string | null): value is MetricWindow {
  return value === '1d' || value === '3d' || value === '7d';
}

function isRatingTier(value: string | null): value is RatingTier {
  return value === 'all' || value === 'low' || value === 'mid' || value === 'high';
}

function isLocale(value: string | null): value is Locale {
  return value === 'en' || value === 'zh';
}

export function parseMetricWindow(value: string | null): MetricWindow {
  return isMetricWindow(value) ? value : '1d';
}

export function parseRatingTier(value: string | null): RatingTier {
  return isRatingTier(value) ? value : 'all';
}

export function parseLocale(value: string | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function isAnalyzerV4Manifest(value: unknown): value is AnalyzerV4Manifest {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  const manifest = value as Partial<AnalyzerV4Manifest>;
  return (
    manifest.namespace === 'analyzer-v4' &&
    manifest.web != null &&
    typeof manifest.web === 'object' &&
    manifest.web.schema_version === '1' &&
    Array.isArray(manifest.web.days)
  );
}

export function validateWebDailyPayload(
  value: unknown,
  expectedDay: string
): value is WebHeroDailyPayload {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<WebHeroDailyPayload>;
  return (
    payload.schema_version === '1' &&
    payload.kind === 'web_hero_daily' &&
    payload.day === expectedDay &&
    Array.isArray(payload.rows)
  );
}
