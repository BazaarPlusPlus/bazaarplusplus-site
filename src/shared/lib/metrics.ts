export type MetricWindow = '1d' | '3d' | '7d';
export type RatingTier = 'all' | 'low' | 'mid' | 'high';
export type MetricsSource = 'remote';
export type Locale = 'en' | 'zh';
export type CardMetric = 'winrate' | 'uplift' | 'inclusion';

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

type CardWinrateRow = {
  hero: string;
  template_id: string;
  appearances: number;
  wins: number;
  win_rate: number;
  win_rate_wilson_lower: number;
};

export type CardWinratePayload = {
  metric: 'item_winrate';
  generatedAt: string;
  rowCount: number;
  rows: CardWinrateRow[];
};

export type CardWinrateViewRow = CardWinrateRow & {
  displayName: string;
  imageUrl?: string;
  cardSize: 'small' | 'medium' | 'large';
};

type ItemUpliftRow = {
  hero: string;
  template_id: string;
  runs_with: number;
  runs_without: number;
  win_rate_with: number;
  win_rate_without: number;
  uplift: number;
  uplift_ci_95_lower: number;
  uplift_ci_95_upper: number;
};

export type ItemUpliftPayload = {
  metric: 'item_uplift';
  generatedAt: string;
  rowCount: number;
  rows: ItemUpliftRow[];
};

export type ItemUpliftViewRow = ItemUpliftRow & {
  displayName: string;
  imageUrl?: string;
  cardSize: 'small' | 'medium' | 'large';
};

type ItemInclusionRow = {
  hero: string;
  template_id: string;
  runs_total_10w: number;
  runs_with_card: number;
  inclusion_rate: number;
};

export type ItemInclusionPayload = {
  metric: 'item_inclusion';
  generatedAt: string;
  rowCount: number;
  rows: ItemInclusionRow[];
};

export type ItemInclusionViewRow = ItemInclusionRow & {
  displayName: string;
  imageUrl?: string;
  cardSize: 'small' | 'medium' | 'large';
};

export type CardMetricPayload =
  | CardWinratePayload
  | ItemUpliftPayload
  | ItemInclusionPayload;

export type CardMetricViewRow =
  | CardWinrateViewRow
  | ItemUpliftViewRow
  | ItemInclusionViewRow;

export type CardMetricPayloadMetric = CardMetricPayload['metric'];

type FinalBuildRow = {
  hero: string;
  sig: string;
  run_count: number;
  p75_run_days: number | null;
  gold_score: number;
  rank: number;
  representative_battle_id?: string | null;
  item_count?: number | null;
  slot_count?: number | null;
  is_complete_build?: boolean | null;
  representative_user_account_id?: string | null;
  representative_user_display_name?: string | null;
  representative_user_run_count?: number | null;
  items?: FinalBuildItem[];
};

type FinalBuildItem = {
  slot_index: number | null;
  socket: number | null;
  size: number | null;
  template_id: string;
  tier: string | null;
  name: string | null;
};

export type FinalBuildsPayload = {
  metric: 'final_builds';
  generatedAt: string;
  rowCount: number;
  rows: FinalBuildRow[];
};

export type FinalBuildViewRow = FinalBuildRow & {
  buildCards: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    cardSize?: 'small' | 'medium' | 'large';
    socket?: number;
    slotSize?: number;
    tier?: string | null;
  }>;
  cardNames: string[];
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

type CardDictionaryEntry = {
  name?: Partial<Record<Locale | 'en-US' | 'zh-CN', string>>;
  image_url?: string;
  desc?: Partial<Record<Locale, string>>;
  type?: string;
  size?: string;
  heroes?: string[];
  tags?: string[];
};

export type CardDictionary = Record<string, CardDictionaryEntry>;

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

function isCardMetric(value: string | null): value is CardMetric {
  return (
    value === 'winrate' ||
    value === 'uplift' ||
    value === 'inclusion'
  );
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

export function parseCardMetric(value: string | null): CardMetric {
  return isCardMetric(value) ? value : 'winrate';
}

export function getCardMetricPayloadMetric(metric: CardMetric): CardMetricPayloadMetric {
  if (metric === 'uplift') {
    return 'item_uplift';
  }

  if (metric === 'inclusion') {
    return 'item_inclusion';
  }

  return 'item_winrate';
}

function sortMetricWindows(windows: Iterable<MetricWindow>): MetricWindow[] {
  return Array.from(windows).sort(
    (a, b) => METRIC_WINDOW_ORDER.indexOf(a) - METRIC_WINDOW_ORDER.indexOf(b)
  );
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

export function getAvailableWindowsForMetric(
  manifest: ManifestPayload,
  metric: string
): MetricWindow[] {
  const windows = new Set<MetricWindow>();

  for (const file of manifest.files) {
    if (file.metric !== metric) {
      continue;
    }

    const window = file.window ?? null;
    if (isMetricWindow(window)) {
      windows.add(window);
    }
  }

  return sortMetricWindows(windows);
}

export function getCommonAvailableTiers(
  manifest: ManifestPayload,
  window: MetricWindow,
  metrics: string[]
): RatingTier[] {
  if (metrics.length === 0) {
    return [];
  }

  const [firstMetric, ...restMetrics] = metrics as [string, ...string[]];
  const initial = new Set(getAvailableTiers(manifest, window, firstMetric));

  for (const metric of restMetrics) {
    const next = new Set(getAvailableTiers(manifest, window, metric));
    for (const tier of initial) {
      if (!next.has(tier)) {
        initial.delete(tier);
      }
    }
  }

  return sortRatingTiers(initial);
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

export function getCardDisplayName(
  cardDictionary: CardDictionary,
  templateId: string,
  locale: Locale = 'en'
): string {
  const entry = cardDictionary[templateId];
  if (locale === 'zh') {
    return entry?.name?.zh ??
      entry?.name?.['zh-CN'] ??
      entry?.name?.en ??
      entry?.name?.['en-US'] ??
      templateId;
  }

  return entry?.name?.en ??
    entry?.name?.['en-US'] ??
    entry?.name?.zh ??
    entry?.name?.['zh-CN'] ??
    templateId;
}

function getCardSize(value?: string): 'small' | 'medium' | 'large' {
  const normalized = value?.toLowerCase();

  if (normalized === 'small') {
    return 'small';
  }

  if (normalized === 'large') {
    return 'large';
  }

  return 'medium';
}

function getCardViewMetadata(
  cardDictionary: CardDictionary,
  templateId: string,
  locale: Locale
): Pick<CardMetricViewRow, 'displayName' | 'imageUrl' | 'cardSize'> {
  const entry = cardDictionary[templateId];

  return {
    displayName: getCardDisplayName(cardDictionary, templateId, locale),
    imageUrl: entry?.image_url,
    cardSize: getCardSize(entry?.size),
  };
}

export function buildCardWinrateViewRows(
  cardWinrate: CardWinratePayload,
  cardDictionary: CardDictionary,
  locale: Locale
): CardWinrateViewRow[] {
  return cardWinrate.rows.map((row) => ({
    ...row,
    ...getCardViewMetadata(cardDictionary, row.template_id, locale),
  }));
}

export function buildItemUpliftViewRows(
  itemUplift: ItemUpliftPayload,
  cardDictionary: CardDictionary,
  locale: Locale
): ItemUpliftViewRow[] {
  return itemUplift.rows.map((row) => ({
    ...row,
    ...getCardViewMetadata(cardDictionary, row.template_id, locale),
  }));
}

export function buildItemInclusionViewRows(
  itemInclusion: ItemInclusionPayload,
  cardDictionary: CardDictionary,
  locale: Locale
): ItemInclusionViewRow[] {
  return itemInclusion.rows.map((row) => ({
    ...row,
    ...getCardViewMetadata(cardDictionary, row.template_id, locale),
  }));
}

export function buildCardMetricViewRows(
  metric: CardMetric,
  payload: CardMetricPayload,
  cardDictionary: CardDictionary,
  locale: Locale
): CardMetricViewRow[] {
  if (metric === 'uplift') {
    return buildItemUpliftViewRows(payload as ItemUpliftPayload, cardDictionary, locale);
  }

  if (metric === 'inclusion') {
    return buildItemInclusionViewRows(payload as ItemInclusionPayload, cardDictionary, locale);
  }

  return buildCardWinrateViewRows(payload as CardWinratePayload, cardDictionary, locale);
}

export function buildFinalBuildViewRows(
  finalBuilds: FinalBuildsPayload,
  cardDictionary: CardDictionary,
  locale: Locale
): FinalBuildViewRow[] {
  return finalBuilds.rows.map((row) => {
    const rawItems = (row.items ?? [])
      .filter((item) => item.template_id)
      .slice()
      .sort((a, b) => {
        const aSocket = a.socket ?? a.slot_index ?? Number.MAX_SAFE_INTEGER;
        const bSocket = b.socket ?? b.slot_index ?? Number.MAX_SAFE_INTEGER;
        if (aSocket !== bSocket) {
          return aSocket - bSocket;
        }

        const aSlotIndex = a.slot_index ?? Number.MAX_SAFE_INTEGER;
        const bSlotIndex = b.slot_index ?? Number.MAX_SAFE_INTEGER;
        if (aSlotIndex !== bSlotIndex) {
          return aSlotIndex - bSlotIndex;
        }

        return a.template_id.localeCompare(b.template_id);
      });
    const cardIds = rawItems.length > 0
      ? rawItems.map((item) => item.template_id)
      : row.sig.split('|').filter(Boolean);
    const buildCards = rawItems.length > 0
      ? rawItems.map((item) => {
          const id = item.template_id;
          const displayName = getCardDisplayName(cardDictionary, id, locale);

          return {
            id,
            name: displayName === id && item.name ? item.name : displayName,
            imageUrl: cardDictionary[id]?.image_url,
            cardSize: getCardSize(cardDictionary[id]?.size),
            socket: item.socket ?? undefined,
            slotSize: item.size ?? undefined,
            tier: item.tier,
          };
        })
      : cardIds.map((id) => ({
          id,
          name: getCardDisplayName(cardDictionary, id, locale),
          imageUrl: cardDictionary[id]?.image_url,
          cardSize: getCardSize(cardDictionary[id]?.size),
        }));

    return {
      ...row,
      buildCards,
      cardNames: buildCards.map((card) => card.name),
    };
  });
}
