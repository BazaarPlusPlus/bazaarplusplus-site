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
  row_count: number;
};

export type AnalyzerV4Manifest = {
  schema_version: '2';
  namespace: 'analyzer-v4';
  generated_at: string;
  latest_complete_day: string;
  web: {
    schema_version: '2';
    days: WebDayRef[];
  };
  mod?: {
    tenwin_builds: {
      schema_version: '2';
      kind: 'mod_tenwin_builds';
      path: string;
      hero_count: number;
      included_build_count: number;
    };
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
  analyze_duration_seconds?: number;
};

export type BattleCounts = { decided: number; wins: number; losses: number };

// v2 ships only the detailed per-game-day buckets; coarse day_1_3/day_4_7/day_8_plus are gone.
export const GAME_DAY_BUCKETS = [
  'day_1',
  'day_2',
  'day_3',
  'day_4',
  'day_5',
  'day_6',
  'day_7',
  'day_8',
  'day_9',
  'day_10',
  'day_11',
  'day_12',
  'day_13_plus',
] as const;

export type GameDayBucket = (typeof GAME_DAY_BUCKETS)[number];

const GAME_DAY_BUCKET_SET = new Set<string>(GAME_DAY_BUCKETS);

export function isGameDayBucket(value: string): value is GameDayBucket {
  return GAME_DAY_BUCKET_SET.has(value);
}

export type CanonicalHero =
  | 'Stelle'
  | 'Mak'
  | 'Jules'
  | 'Dooley'
  | 'Karnok'
  | 'Pygmalien'
  | 'Vanessa';

export type WebHeroMatchupRow = {
  opponent_hero: CanonicalHero;
  decided: number;
  wins: number;
  losses: number;
};

export type WebHeroDailyRow = {
  hero: CanonicalHero;
  rating_tier: RatingTier;
  runs: { completed: number; scored: number; ten_win: number };
  outcomes: { perfect: number; gold: number; silver: number; bronze: number };
  ten_win_days: { known_count: number; sum_days: number };
  battle_days: Partial<Record<GameDayBucket, BattleCounts>>;
  matchups: WebHeroMatchupRow[];
};

export type WebHeroDailyPayload = {
  schema_version: '2';
  kind: 'hero_web_daily';
  day: string;
  generated_at: string;
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
    manifest.schema_version === '2' &&
    manifest.web != null &&
    typeof manifest.web === 'object' &&
    manifest.web.schema_version === '2' &&
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
    payload.schema_version === '2' &&
    payload.kind === 'hero_web_daily' &&
    payload.day === expectedDay &&
    Array.isArray(payload.rows)
  );
}
