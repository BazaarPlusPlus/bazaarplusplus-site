import {
  buildCardWinrateViewRows,
  buildFinalBuildViewRows,
  buildItemInclusionViewRows,
  buildItemUpliftViewRows,
  getAvailableTiers,
  getAvailableTiersForWindowlessMetric,
  getAvailableWindows,
  getCommonAvailableTiers,
  type CardWinrateViewRow,
  type FinalBuildViewRow,
  type HeroOverviewPayload,
  type HeroWinrateDailyPayload,
  type ItemInclusionViewRow,
  type ItemUpliftViewRow,
  type Locale,
  type ManifestPayload,
  type MetricsSource,
  type MetricWindow,
  type RatingTier,
} from '../shared/lib/metrics';
import type { RuntimeMetricsClient } from '../shared/lib/metrics-client';

type ViewPayload<T> = {
  rowCount: number;
  rows: T[];
};

export type PageLoadProgress = {
  completed: number;
  total: number;
  label: string;
};

type PageLoadOptions = {
  onProgress?: (progress: PageLoadProgress) => void;
};

type ProgressTracker = {
  track<T>(promise: Promise<T>, label: string): Promise<T>;
};

type WindowTierMap<T> = Partial<Record<MetricWindow, Partial<Record<RatingTier, T>>>>;
type ViewWindowTierMap<T> = WindowTierMap<ViewPayload<T>>;

type PageDataBase = {
  manifest: ManifestPayload;
  source: MetricsSource;
};

export type HeroOverviewPageData = PageDataBase & {
  availableWindows: MetricWindow[];
  availableTiers: RatingTier[];
  dailyByTier: Partial<Record<RatingTier, HeroWinrateDailyPayload>>;
  overviewByWindow: WindowTierMap<HeroOverviewPayload>;
};

export type CardsPageData = PageDataBase & {
  winrateByWindow: ViewWindowTierMap<CardWinrateViewRow>;
  upliftByWindow: ViewWindowTierMap<ItemUpliftViewRow>;
  inclusionByWindow: ViewWindowTierMap<ItemInclusionViewRow>;
};

export type BuildsPageData = PageDataBase & {
  rowsByWindow: ViewWindowTierMap<FinalBuildViewRow>;
};

function createProgressTracker(
  onProgress: PageLoadOptions['onProgress'],
  total: number,
  completed: number,
  label: string
): ProgressTracker {
  let completedCount = completed;
  onProgress?.({ completed: completedCount, total, label });

  return {
    async track<T>(promise: Promise<T>, nextLabel: string): Promise<T> {
      const value = await promise;
      completedCount += 1;
      onProgress?.({ completed: completedCount, total, label: nextLabel });
      return value;
    },
  };
}

function reportManifestStart(onProgress: PageLoadOptions['onProgress']) {
  onProgress?.({ completed: 0, total: 1, label: 'Loading manifest' });
}

function countWindowTierPayloads(manifest: ManifestPayload, metric: string): number {
  return getAvailableWindows(manifest).reduce(
    (count, window) => count + getAvailableTiers(manifest, window, metric).length,
    0
  );
}

function countCommonWindowTierPayloads(manifest: ManifestPayload, metrics: string[]): number {
  return getAvailableWindows(manifest).reduce(
    (count, window) => count + getCommonAvailableTiers(manifest, window, metrics).length,
    0
  );
}

async function loadWindowTierMap<T>(
  manifest: ManifestPayload,
  metric: string,
  loadPayload: (window: MetricWindow, tier: RatingTier) => Promise<T>,
  progress?: ProgressTracker
): Promise<WindowTierMap<T>> {
  const availableWindows = getAvailableWindows(manifest);
  const entries = await Promise.all(
    availableWindows.map(async (window) => [
      window,
      Object.fromEntries(
        await Promise.all(
          getAvailableTiers(manifest, window, metric).map(async (tier) => [
            tier,
            await (progress
              ? progress.track(loadPayload(window, tier), `Loaded ${metric}/${window}/${tier}`)
              : loadPayload(window, tier)),
          ] as const)
        )
      ),
    ] as const)
  );

  return Object.fromEntries(entries);
}

async function loadCommonWindowTierViewMap<T>(
  manifest: ManifestPayload,
  metrics: string[],
  loadRows: (window: MetricWindow, tier: RatingTier) => Promise<ViewPayload<T>>,
  progress?: ProgressTracker
): Promise<ViewWindowTierMap<T>> {
  const availableWindows = getAvailableWindows(manifest);
  const entries = await Promise.all(
    availableWindows.map(async (window) => [
      window,
      Object.fromEntries(
        await Promise.all(
          getCommonAvailableTiers(manifest, window, metrics).map(async (tier) => [
            tier,
            await (progress
              ? progress.track(loadRows(window, tier), `Loaded ${metrics.join('+')}/${window}/${tier}`)
              : loadRows(window, tier)),
          ] as const)
        )
      ),
    ] as const)
  );

  return Object.fromEntries(entries);
}

async function loadMetricViewMap<TPayload extends { rowCount: number }, TRow>(
  manifest: ManifestPayload,
  metric: string,
  loadPayload: (window: MetricWindow, tier: RatingTier) => Promise<TPayload>,
  mapRows: (payload: TPayload) => TRow[],
  progress?: ProgressTracker
): Promise<ViewWindowTierMap<TRow>> {
  return loadCommonWindowTierViewMap(manifest, [metric], async (window, tier) => {
    const payload = await loadPayload(window, tier);
    return {
      rowCount: payload.rowCount,
      rows: mapRows(payload),
    };
  }, progress);
}

export async function loadHeroOverviewPageData(
  client: RuntimeMetricsClient,
  options: PageLoadOptions = {}
): Promise<HeroOverviewPageData> {
  reportManifestStart(options.onProgress);
  const manifest = await client.getManifest();
  const availableWindows = getAvailableWindows(manifest);
  const availableTiers = getAvailableTiersForWindowlessMetric(manifest, 'hero_winrate_daily');
  const progress = createProgressTracker(
    options.onProgress,
    1 + availableTiers.length + countWindowTierPayloads(manifest, 'hero_overview'),
    1,
    'Loaded manifest'
  );

  const [dailyEntries, overviewByWindow] = await Promise.all([
    Promise.all(
      availableTiers.map(async (tier) => [
        tier,
        await progress.track(client.getHeroWinrateDaily(tier), `Loaded hero_winrate_daily/${tier}`),
      ] as const)
    ),
    loadWindowTierMap(manifest, 'hero_overview', client.getHeroOverview, progress),
  ]);

  return {
    manifest,
    source: client.getSource(),
    availableWindows,
    availableTiers,
    dailyByTier: Object.fromEntries(dailyEntries),
    overviewByWindow,
  };
}

export async function loadCardsPageData(
  client: RuntimeMetricsClient,
  locale: Locale,
  options: PageLoadOptions = {}
): Promise<CardsPageData> {
  reportManifestStart(options.onProgress);
  const manifest = await client.getManifest();
  const progress = createProgressTracker(
    options.onProgress,
    2 +
      countCommonWindowTierPayloads(manifest, ['item_winrate']) +
      countCommonWindowTierPayloads(manifest, ['item_uplift']) +
      countCommonWindowTierPayloads(manifest, ['item_inclusion']),
    1,
    'Loaded manifest'
  );

  const cardDictionary = await progress.track(client.getCardDictionary(), 'Loaded card dictionary');
  const [
    winrateByWindow,
    upliftByWindow,
    inclusionByWindow,
  ] = await Promise.all([
    loadMetricViewMap(
      manifest,
      'item_winrate',
      client.getCardWinrate,
      (payload) => buildCardWinrateViewRows(payload, cardDictionary, locale),
      progress
    ),
    loadMetricViewMap(
      manifest,
      'item_uplift',
      client.getItemUplift,
      (payload) => buildItemUpliftViewRows(payload, cardDictionary, locale),
      progress
    ),
    loadMetricViewMap(
      manifest,
      'item_inclusion',
      client.getItemInclusion,
      (payload) => buildItemInclusionViewRows(payload, cardDictionary, locale),
      progress
    ),
  ]);

  return {
    manifest,
    source: client.getSource(),
    winrateByWindow,
    upliftByWindow,
    inclusionByWindow,
  };
}

export async function loadBuildsPageData(
  client: RuntimeMetricsClient,
  locale: Locale,
  options: PageLoadOptions = {}
): Promise<BuildsPageData> {
  reportManifestStart(options.onProgress);
  const manifest = await client.getManifest();
  const progress = createProgressTracker(
    options.onProgress,
    2 + countCommonWindowTierPayloads(manifest, ['final_builds']),
    1,
    'Loaded manifest'
  );
  const cardDictionary = await progress.track(client.getCardDictionary(), 'Loaded card dictionary');
  const rowsByWindow = await loadMetricViewMap(
    manifest,
    'final_builds',
    client.getFinalBuilds,
    (payload) => buildFinalBuildViewRows(payload, cardDictionary, locale),
    progress
  );

  return {
    manifest,
    source: client.getSource(),
    rowsByWindow,
  };
}
