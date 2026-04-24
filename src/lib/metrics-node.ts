import type {
  CardDictionary,
  CardWinratePayload,
  EnchantUpliftPayload,
  FinalBuildsPayload,
  HeroOverviewPayload,
  HeroWinrateDailyPayload,
  ItemInclusionPayload,
  ItemUpliftPayload,
  ManifestPayload,
  MetricsSource,
  MetricWindow,
  PhaseInclusionPayload,
  PhaseValuePayload,
  RatingTier,
} from './metrics';

type FetchLike = typeof fetch;

type MetricsRepositoryOptions = {
  localMetricsDir?: string;
  localCardDictionaryPath?: string;
  remoteBaseUrl?: string;
  fetchImpl?: FetchLike;
};

export type MetricsRepository = Awaited<ReturnType<typeof createMetricsRepository>>;

const DEFAULT_REMOTE_BASE_URL =
  process.env.PUBLIC_METRICS_BASE ?? 'https://bpp-metrics.bazaarplusplus.com';
const DEFAULT_REMOTE_CARD_DICTIONARY_URL =
  process.env.PUBLIC_CARD_DICTIONARY_URL ??
  'https://bpp-static.bazaarplusplus.com/card_dict_with_url.json';

function normalizeRemoteBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

export async function createMetricsRepository(options: MetricsRepositoryOptions = {}) {
  const [{ access, readFile }, { constants }, { resolve }] = await Promise.all([
    import('node:fs/promises'),
    import('node:fs'),
    import('node:path'),
  ]);
  const localMetricsDir =
    options.localMetricsDir ?? resolve(process.cwd(), '../analyzers/data/metrics');
  const localCardDictionaryPath =
    options.localCardDictionaryPath ?? resolve(process.cwd(), '../analyzers/data/card_dict_with_url.json');
  const remoteBaseUrl = normalizeRemoteBaseUrl(
    options.remoteBaseUrl ?? DEFAULT_REMOTE_BASE_URL
  );
  const fetchImpl = options.fetchImpl ?? fetch;

  async function pathExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  async function loadFromLocal<T>(relativePath: string): Promise<T> {
    const localPath = resolve(localMetricsDir, relativePath);
    const content = await readFile(localPath, 'utf-8');
    return JSON.parse(content) as T;
  }

  async function loadFromRemote<T>(relativePath: string): Promise<T> {
    const response = await fetchImpl(`${remoteBaseUrl}${relativePath}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch metric ${relativePath}: ${response.status}`);
    }

    return (await response.json()) as T;
  }

  async function loadJson<T>(relativePath: string): Promise<T> {
    if (await pathExists(localMetricsDir)) {
      try {
        return await loadFromLocal<T>(relativePath);
      } catch (error) {
        const code = error instanceof Error && 'code' in error ? error.code : undefined;

        if (code !== 'ENOENT') {
          throw error;
        }
      }
    }

    return loadFromRemote<T>(relativePath);
  }

  async function getSource(): Promise<MetricsSource> {
    return (await pathExists(localMetricsDir)) ? 'local' : 'remote';
  }

  async function getCardDictionary(): Promise<CardDictionary> {
    if (await pathExists(localCardDictionaryPath)) {
      const content = await readFile(localCardDictionaryPath, 'utf-8');
      return JSON.parse(content) as CardDictionary;
    }

    const response = await fetchImpl(DEFAULT_REMOTE_CARD_DICTIONARY_URL);
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
    getPhaseValue: (window: MetricWindow, tier: RatingTier) =>
      loadJson<PhaseValuePayload>(`item_phase_value/${window}/${tier}.json`),
    getPhaseInclusion: (window: MetricWindow, tier: RatingTier) =>
      loadJson<PhaseInclusionPayload>(`item_phase_inclusion/${window}/${tier}.json`),
    getEnchantUplift: (window: MetricWindow, tier: RatingTier) =>
      loadJson<EnchantUpliftPayload>(`enchant_uplift/${window}/${tier}.json`),
    getFinalBuilds: (window: MetricWindow, tier: RatingTier) =>
      loadJson<FinalBuildsPayload>(`final_builds/${window}/${tier}.json`),
    getHeroWinrateDaily: (tier: RatingTier) =>
      loadJson<HeroWinrateDailyPayload>(`hero_winrate_daily/${tier}.json`),
  };
}
