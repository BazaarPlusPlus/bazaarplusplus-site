export type MetricWindow = '1d' | '3d' | '7d';
export type RatingTier = 'all' | 'low' | 'mid' | 'high';
export type MetricsSource = 'remote';
export type Locale = 'en' | 'zh';

export const DEFAULT_LOCALE: Locale = 'zh';

type ManifestWindowInfo = {
  start: string;
  end: string;
  patch_transition: boolean;
};

type ManifestFile = {
  path: string;
  metric: string;
  window?: string;
  rating_tier?: string;
  rowCount: number;
  patch_transition?: boolean;
};

export type ManifestPayload = {
  generatedAt: string;
  current_patch_id: string | null;
  windows: Partial<Record<MetricWindow, ManifestWindowInfo>>;
  files: ManifestFile[];
};

type HeroOverviewRow = {
  hero: string;
  runs_total: number;
  runs_completed: number;
  runs_10w: number;
  win_rate: number;
  win_rate_wilson_lower: number;
  avg_run_days_for_10w: number | null;
  p75_run_days_for_10w: number | null;
  victory_tier_counts: Record<string, number>;
  top_archetypes: Array<{
    archetype_id: string;
    defining_cards: string[];
    share: number;
    win_rate: number;
  }>;
  top_final_builds: Array<{
    sig: string;
    run_count: number;
    p75_run_days: number | null;
  }>;
};

export type HeroOverviewPayload = {
  metric: 'hero_overview';
  generatedAt: string;
  rowCount: number;
  rows: HeroOverviewRow[];
};

type HeroWinrateDailyRow = {
  hero: string;
  day: string;
  completed_runs: number;
  wins_10w: number;
  win_rate: number;
  win_rate_wilson_lower: number;
};

export type HeroWinrateDailyPayload = {
  metric: 'hero_winrate_daily';
  generatedAt: string;
  rowCount: number;
  rows: HeroWinrateDailyRow[];
};

const METRIC_WINDOW_ORDER: MetricWindow[] = ['1d', '3d', '7d'];
const RATING_TIER_ORDER: RatingTier[] = ['all', 'low', 'mid', 'high'];

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

function sortRatingTiers(tiers: Iterable<RatingTier>): RatingTier[] {
  return Array.from(tiers).sort(
    (a, b) => RATING_TIER_ORDER.indexOf(a) - RATING_TIER_ORDER.indexOf(b)
  );
}

export function getAvailableTiers(
  manifest: ManifestPayload,
  window: MetricWindow,
  metric = 'hero_overview'
): RatingTier[] {
  const tiers = new Set<RatingTier>();

  for (const file of manifest.files) {
    if (file.metric !== metric || file.window !== window) {
      continue;
    }

    const tier = file.rating_tier ?? null;
    if (isRatingTier(tier)) {
      tiers.add(tier);
    }
  }

  return sortRatingTiers(tiers);
}

export function getAvailableTiersForWindowlessMetric(
  manifest: ManifestPayload,
  metric: string
): RatingTier[] {
  const tiers = new Set<RatingTier>();

  for (const file of manifest.files) {
    if (file.metric !== metric) {
      continue;
    }

    const tier = file.rating_tier ?? null;
    if (isRatingTier(tier)) {
      tiers.add(tier);
    }
  }

  return sortRatingTiers(tiers);
}

export function getAvailableWindows(manifest: ManifestPayload): MetricWindow[] {
  const windows = Object.keys(manifest.windows).filter((window): window is MetricWindow =>
    isMetricWindow(window)
  );

  return windows.length > 0 ? windows : [...METRIC_WINDOW_ORDER];
}
