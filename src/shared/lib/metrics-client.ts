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

type RuntimeMetricsClientOptions = {
  metricsBaseUrl?: string;
  cardDictionaryUrl?: string;
  fetchImpl?: typeof fetch;
};

const DEFAULT_METRICS_BASE_URL =
  import.meta.env.VITE_METRICS_BASE ?? 'https://bpp-metrics.bazaarplusplus.com';
const DEFAULT_CARD_DICTIONARY_URL =
  import.meta.env.VITE_CARD_DICTIONARY_URL ??
  '/card_dict_with_url.json';

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function resolveSource(): MetricsSource {
  return 'remote';
}

export function createRuntimeMetricsClient(options: RuntimeMetricsClientOptions = {}) {
  const metricsBaseUrl = normalizeBaseUrl(options.metricsBaseUrl ?? DEFAULT_METRICS_BASE_URL);
  const cardDictionaryUrl = options.cardDictionaryUrl ?? DEFAULT_CARD_DICTIONARY_URL;
  const fetchImpl = options.fetchImpl ?? fetch;

  async function loadJson<T>(url: string): Promise<T> {
    const response = await fetchImpl(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    return (await response.json()) as T;
  }

  function loadMetric<T>(relativePath: string): Promise<T> {
    return loadJson<T>(`${metricsBaseUrl}${relativePath}`);
  }

  return {
    getSource: resolveSource,
    getCardDictionary: () => loadJson<CardDictionary>(cardDictionaryUrl),
    getManifest: () => loadMetric<ManifestPayload>('manifest.json'),
    getHeroOverview: (window: MetricWindow, tier: RatingTier) =>
      loadMetric<HeroOverviewPayload>(`hero_overview/${window}/${tier}.json`),
    getCardWinrate: (window: MetricWindow, tier: RatingTier) =>
      loadMetric<CardWinratePayload>(`item_winrate/${window}/${tier}.json`),
    getItemUplift: (window: MetricWindow, tier: RatingTier) =>
      loadMetric<ItemUpliftPayload>(`item_uplift/${window}/${tier}.json`),
    getItemInclusion: (window: MetricWindow, tier: RatingTier) =>
      loadMetric<ItemInclusionPayload>(`item_inclusion/${window}/${tier}.json`),
    getFinalBuilds: (window: MetricWindow, tier: RatingTier) =>
      loadMetric<FinalBuildsPayload>(`final_builds/${window}/${tier}.json`),
    getHeroWinrateDaily: (tier: RatingTier) =>
      loadMetric<HeroWinrateDailyPayload>(`hero_winrate_daily/${tier}.json`),
  };
}

export type RuntimeMetricsClient = ReturnType<typeof createRuntimeMetricsClient>;
