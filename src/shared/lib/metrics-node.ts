import type {
  CardDictionary,
  CardWinratePayload,
  FinalBuildsPayload,
  HeroOverviewPayload,
  HeroWinrateDailyPayload,
  ItemInclusionPayload,
  ItemUpliftPayload,
  ManifestPayload,
  MetricsSource,
  MetricWindow,
  RatingTier,
} from './metrics';

type FetchLike = typeof fetch;

type MetricsRepositoryOptions = {
  remoteBaseUrl?: string;
  remoteCardDictionaryUrl?: string;
  fetchImpl?: FetchLike;
};

const DEFAULT_REMOTE_BASE_URL =
  process.env.PUBLIC_METRICS_BASE ?? 'https://bpp-metrics.bazaarplusplus.com';
const DEFAULT_REMOTE_CARD_DICTIONARY_URL =
  process.env.PUBLIC_CARD_DICTIONARY_URL ??
  'https://bpp-static.bazaarplusplus.com/card_dict_with_url.json';

function normalizeRemoteBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

export async function createMetricsRepository(options: MetricsRepositoryOptions = {}) {
  const remoteBaseUrl = normalizeRemoteBaseUrl(
    options.remoteBaseUrl ?? DEFAULT_REMOTE_BASE_URL
  );
  const remoteCardDictionaryUrl =
    options.remoteCardDictionaryUrl ?? DEFAULT_REMOTE_CARD_DICTIONARY_URL;
  const fetchImpl = options.fetchImpl ?? fetch;

  async function loadJson<T>(relativePath: string): Promise<T> {
    const response = await fetchImpl(`${remoteBaseUrl}${relativePath}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch metric ${relativePath}: ${response.status}`);
    }

    return (await response.json()) as T;
  }

  async function getSource(): Promise<MetricsSource> {
    return 'remote';
  }

  async function getCardDictionary(): Promise<CardDictionary> {
    const response = await fetchImpl(remoteCardDictionaryUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch card dictionary: ${response.status}`);
    }

    return (await response.json()) as CardDictionary;
  }

  return {
    getSource,
    getCardDictionary,
    getManifest: () => loadJson<ManifestPayload>('manifest.json'),
    getHeroOverview: (window: MetricWindow, tier: RatingTier) =>
      loadJson<HeroOverviewPayload>(`hero_overview/${window}/${tier}.json`),
    getCardWinrate: (window: MetricWindow, tier: RatingTier) =>
      loadJson<CardWinratePayload>(`item_winrate/${window}/${tier}.json`),
    getItemUplift: (window: MetricWindow, tier: RatingTier) =>
      loadJson<ItemUpliftPayload>(`item_uplift/${window}/${tier}.json`),
    getItemInclusion: (window: MetricWindow, tier: RatingTier) =>
      loadJson<ItemInclusionPayload>(`item_inclusion/${window}/${tier}.json`),
    getFinalBuilds: (window: MetricWindow, tier: RatingTier) =>
      loadJson<FinalBuildsPayload>(`final_builds/${window}/${tier}.json`),
    getHeroWinrateDaily: (tier: RatingTier) =>
      loadJson<HeroWinrateDailyPayload>(`hero_winrate_daily/${tier}.json`),
  };
}
